import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  AuditAction,
  ImportSeverity,
  ImportStatus,
} from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { IMPORT_LOG_DIR } from "@/lib/constants";
import { REQUIRED_HEADERS } from "@/lib/import/columns";
import {
  normalizeKeyPart,
  normalizeUnknown,
  prepareImportRow,
  type ImportIssueDraft,
} from "@/lib/import/normalizers";
import { readImportSource, type ImportInput } from "@/lib/import/source";

type ImportOptions = ImportInput & {
  dryRun?: boolean;
  limit?: number;
  initiatedByUserId?: string | null;
  sourceType?: string;
  sourceUrl?: string | null;
  existingBatchId?: string;
  progressEveryRows?: number;
};

export type ImportSummary = {
  batchId: string;
  sourceFile: string;
  dryRun: boolean;
  totalRows: number;
  processedRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  warningCount: number;
  sheetName: string;
  issuesPreview: ImportIssueDraft[];
};

function asSummaryObject(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function buildProgressSummary(
  baseSummary: Record<string, unknown>,
  extra: Record<string, unknown> = {},
) {
  return {
    ...baseSummary,
    ...extra,
    progressUpdatedAt: new Date().toISOString(),
  };
}

async function loadCache() {
  const taxonomies = await prisma.taxonomy.findMany({ select: { id: true, normalizedKey: true } });
  const locations = await prisma.location.findMany({ select: { id: true, normalizedKey: true } });
  const persons = await prisma.person.findMany({ select: { id: true, normalizedName: true } });
  const records = await prisma.specimenRecord.findMany({ select: { id: true, importKey: true } });

  return {
    taxonomy: new Map(taxonomies.map((entry) => [entry.normalizedKey, entry.id])),
    location: new Map(locations.map((entry) => [entry.normalizedKey, entry.id])),
    person: new Map(persons.map((entry) => [entry.normalizedName, entry.id])),
    records: new Map(records.map((entry) => [entry.importKey, entry.id])),
  };
}

async function flushIssues(batchId: string, issues: ImportIssueDraft[]) {
  if (issues.length === 0) return;

  await prisma.importIssue.createMany({
    data: issues.map((issue) => ({
      batchId,
      severity: issue.severity,
      code: issue.code,
      message: issue.message,
      field: issue.field,
      rawValue: issue.rawValue,
      rowNumber: issue.rowNumber,
      importKey: issue.importKey,
    })),
  });

  issues.length = 0;
}

async function persistImportLog(batchId: string, summary: ImportSummary) {
  try {
    await mkdir(IMPORT_LOG_DIR, { recursive: true });
    await writeFile(
      join(IMPORT_LOG_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}-${batchId}.json`),
      JSON.stringify(summary, null, 2),
      "utf8",
    );
  } catch (error) {
    console.warn(
      `[import] Could not write local import log for batch ${batchId}: ${
        error instanceof Error ? error.message : "unknown filesystem error"
      }`,
    );
  }
}

async function ensureTaxonomy(
  cache: Map<string, string>,
  taxonomy: NonNullable<ReturnType<typeof prepareImportRow>["taxonomy"]>,
) {
  const cachedId = cache.get(taxonomy.normalizedKey);
  if (cachedId) return cachedId;

  const created = await prisma.taxonomy.upsert({
    where: { normalizedKey: taxonomy.normalizedKey },
    update: taxonomy,
    create: taxonomy,
    select: { id: true },
  });

  cache.set(taxonomy.normalizedKey, created.id);
  return created.id;
}

async function ensureLocation(
  cache: Map<string, string>,
  location: NonNullable<ReturnType<typeof prepareImportRow>["location"]>,
) {
  const cachedId = cache.get(location.normalizedKey);
  if (cachedId) return cachedId;

  const created = await prisma.location.upsert({
    where: { normalizedKey: location.normalizedKey },
    update: location,
    create: location,
    select: { id: true },
  });

  cache.set(location.normalizedKey, created.id);
  return created.id;
}

async function ensurePerson(cache: Map<string, string>, rawName: string | null) {
  const normalizedName = normalizeKeyPart(normalizeUnknown(rawName));

  if (!normalizedName) return null;

  const cachedId = cache.get(normalizedName);
  if (cachedId) return cachedId;

  const created = await prisma.person.upsert({
    where: { normalizedName },
    update: { name: rawName! },
    create: { name: rawName!, normalizedName },
    select: { id: true },
  });

  cache.set(normalizedName, created.id);
  return created.id;
}

export async function importBryozoaWorkbook(options: ImportOptions): Promise<ImportSummary> {
  const dryRun = options.dryRun ?? true;
  const source = await readImportSource(options);
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !source.headers.includes(header));
  const batchSummaryBase = {
    ...asSummaryObject(undefined),
    headers: source.headers,
    missingHeaders,
    sourceUrl: options.sourceUrl ?? null,
    sourceType: options.sourceType ?? source.sourceFormat,
    phase: "importing",
    autoBootstrap: options.sourceType === "auto-bootstrap",
  };
  const batchId = options.existingBatchId
    ? options.existingBatchId
    : (
        await prisma.importBatch.create({
          data: {
            sourceFile: source.fileName,
            sourceHash: source.sourceHash,
            sourceType: options.sourceType ?? source.sourceFormat,
            sheetName: source.sheetName,
            dryRun,
            status: ImportStatus.RUNNING,
            totalRows: source.totalRows,
            summary: buildProgressSummary(batchSummaryBase),
          },
          select: { id: true },
        })
      ).id;

  if (options.existingBatchId) {
    const existingBatch = await prisma.importBatch.findUnique({
      where: { id: options.existingBatchId },
      select: { summary: true },
    });

    await prisma.importBatch.update({
      where: { id: options.existingBatchId },
      data: {
        sourceFile: source.fileName,
        sourceHash: source.sourceHash,
        sourceType: options.sourceType ?? source.sourceFormat,
        sheetName: source.sheetName,
        dryRun,
        status: ImportStatus.RUNNING,
        totalRows: source.totalRows,
        processedRows: 0,
        createdCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: missingHeaders.length,
        warningCount: 0,
        summary: buildProgressSummary({
          ...asSummaryObject(existingBatch?.summary),
          ...batchSummaryBase,
        }),
      },
    });
  }

  const caches = await loadCache();
  const issuesBuffer: ImportIssueDraft[] = [];
  let processedRows = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = missingHeaders.length;
  let warningCount = 0;
  const progressEveryRows = Math.max(1, options.progressEveryRows ?? 250);

  async function flushProgress() {
    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: ImportStatus.RUNNING,
        processedRows,
        createdCount,
        updatedCount,
        skippedCount,
        errorCount,
        warningCount,
        summary: buildProgressSummary(batchSummaryBase, {
          phase: "importing",
          sourceFile: source.fileName,
          sheetName: source.sheetName,
        }),
      },
    });
  }

  for (const header of missingHeaders) {
    issuesBuffer.push({
      severity: ImportSeverity.ERROR,
      code: "MISSING_HEADER",
      message: `Required header "${header}" was not found in the source file.`,
      field: header,
    });
  }

  try {
    let index = 0;
    for (const row of source.iterateRows()) {
      const rowNumber = index + 2;
      index += 1;

      if (options.limit && processedRows >= options.limit) {
        break;
      }

      processedRows += 1;

      try {
        const prepared = prepareImportRow(row, rowNumber);
        issuesBuffer.push(...prepared.issues);
        warningCount += prepared.issues.filter((issue) => issue.severity !== ImportSeverity.ERROR).length;
        errorCount += prepared.issues.filter((issue) => issue.severity === ImportSeverity.ERROR).length;

        const existingId = caches.records.get(prepared.importKey);

        if (dryRun) {
          if (existingId) updatedCount += 1;
          else createdCount += 1;
        } else {
          const taxonomyId = prepared.taxonomy
            ? await ensureTaxonomy(caches.taxonomy, prepared.taxonomy)
            : null;
          const locationId = prepared.location
            ? await ensureLocation(caches.location, prepared.location)
            : null;
          const collectorPersonId = await ensurePerson(caches.person, prepared.collectorName);
          const identifierPersonId = await ensurePerson(caches.person, prepared.identifierName);

          const savedRecord = await prisma.specimenRecord.upsert({
            where: { importKey: prepared.importKey },
            update: {
              importKeySource: prepared.importKeySource,
              sourceRowNumber: rowNumber,
              importBatchId: batchId,
              taxonomyId,
              locationId,
              collectorPersonId,
              identifierPersonId,
              lastImportedAt: new Date(),
              ...prepared.record,
            },
            create: {
              importKey: prepared.importKey,
              importKeySource: prepared.importKeySource,
              sourceRowNumber: rowNumber,
              importBatchId: batchId,
              taxonomyId,
              locationId,
              collectorPersonId,
              identifierPersonId,
              lastImportedAt: new Date(),
              ...prepared.record,
            },
            select: { id: true },
          });

          await prisma.imageAsset.deleteMany({
            where: { specimenRecordId: savedRecord.id },
          });
          await prisma.bibliographicReference.deleteMany({
            where: { specimenRecordId: savedRecord.id },
          });

          if (prepared.images.length > 0) {
            await prisma.imageAsset.createMany({
              data: prepared.images.map((image) => ({
                specimenRecordId: savedRecord.id,
                position: image.position,
                originalValue: image.originalValue,
                url: image.url,
                fileName: image.fileName,
                isUrl: image.isUrl,
                author: image.author,
              })),
            });
          }

          if (prepared.references.length > 0) {
            await prisma.bibliographicReference.createMany({
              data: prepared.references.map((reference) => ({
                specimenRecordId: savedRecord.id,
                position: reference.position,
                citation: reference.citation,
                normalizedCitation: reference.normalizedCitation,
              })),
            });
          }

          if (existingId) updatedCount += 1;
          else createdCount += 1;

          caches.records.set(prepared.importKey, savedRecord.id);
        }
      } catch (error) {
        skippedCount += 1;
        errorCount += 1;

        issuesBuffer.push({
          severity: ImportSeverity.ERROR,
          code: "ROW_IMPORT_FAILED",
          message: error instanceof Error ? error.message : "Unexpected import error.",
          rowNumber,
        });
      }

      if (issuesBuffer.length >= 250) {
        await flushIssues(batchId, issuesBuffer);
      }

      if (processedRows % progressEveryRows === 0) {
        await flushProgress();
      }
    }

    await flushIssues(batchId, issuesBuffer);
    await flushProgress();

    const issuesPreview = await prisma.importIssue.findMany({
      where: { batchId },
      orderBy: [{ severity: "desc" }, { rowNumber: "asc" }],
      take: 25,
      select: {
        severity: true,
        code: true,
        message: true,
        field: true,
        rawValue: true,
        rowNumber: true,
        importKey: true,
      },
    });

    const summary = {
      batchId,
      sourceFile: source.fileName,
      dryRun,
      totalRows: source.totalRows,
      processedRows,
      createdCount,
      updatedCount,
      skippedCount,
      errorCount,
      warningCount,
      sheetName: source.sheetName,
      issuesPreview,
    } satisfies ImportSummary;

    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        finishedAt: new Date(),
        status: dryRun ? ImportStatus.DRY_RUN : ImportStatus.COMPLETED,
        processedRows,
        createdCount,
        updatedCount,
        skippedCount,
        errorCount,
        warningCount,
        summary: buildProgressSummary(batchSummaryBase, {
          ...summary,
          phase: dryRun ? "preview-complete" : "completed",
        }),
      },
    });

    await writeAuditLog({
      userId: options.initiatedByUserId ?? null,
      batchId,
      action: AuditAction.IMPORT,
      entityType: "ImportBatch",
      entityId: batchId,
      metadata: summary,
    });

    await persistImportLog(batchId, summary);

    return summary;
  } catch (error) {
    await flushIssues(batchId, issuesBuffer);

    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        finishedAt: new Date(),
        status: ImportStatus.FAILED,
        processedRows,
        createdCount,
        updatedCount,
        skippedCount,
        errorCount: errorCount + 1,
        warningCount,
        summary: buildProgressSummary(batchSummaryBase, {
          phase: "failed",
          fatalError: error instanceof Error ? error.message : "Unexpected import failure.",
        }),
      },
    });

    throw error;
  }
}
