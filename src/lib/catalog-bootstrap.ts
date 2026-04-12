import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ImportStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  AUTO_BOOTSTRAP_SOURCE_TYPE,
  AUTO_BOOTSTRAP_STALE_MS,
  DEFAULT_BOOTSTRAP_RECORD_FLOOR,
  DEFAULT_BOOTSTRAP_WORKBOOK_URL,
  LOCAL_WORKBOOK_PATH,
} from "@/lib/constants";
import { downloadRemoteWorkbook } from "@/lib/import/remote";
import { importBryozoaWorkbook } from "@/lib/import/service";

type JsonRecord = Record<string, unknown>;

type BootstrapBatchRecord = {
  id: string;
  sourceFile: string;
  status: ImportStatus;
  dryRun: boolean;
  totalRows: number;
  processedRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  warningCount: number;
  startedAt: Date;
  finishedAt: Date | null;
  updatedAt: Date;
  summary: unknown;
};

export type CatalogBootstrapStatus = {
  state: "idle" | "running" | "failed" | "ready";
  batchId: string | null;
  sourceUrl: string;
  recordCount: number;
  targetRecordFloor: number;
  percent: number;
  etaSeconds: number | null;
  processedRows: number;
  totalRows: number;
  statusLabel: string;
  message: string;
  startedAt: string | null;
  updatedAt: string | null;
  fileName: string | null;
  failureMessage?: string;
};

function asJsonRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  return {};
}

function getBootstrapMessage(
  batch: BootstrapBatchRecord | null,
  phase: string,
  recordCount: number,
  targetRecordFloor: number,
) {
  if (!batch) {
    return "Preparing the default Bryozoa catalogue import.";
  }

  if (batch.status === ImportStatus.FAILED) {
    return (
      (typeof asJsonRecord(batch.summary).fatalError === "string"
        ? (asJsonRecord(batch.summary).fatalError as string)
        : undefined) ?? "The automatic catalogue import failed."
    );
  }

  if (phase === "downloading") {
    return "Downloading the default Bryozoa workbook from Google Sheets.";
  }

  if (phase === "reading") {
    return "Reading workbook headers and preparing the import.";
  }

  if (batch.totalRows > 0 && batch.processedRows > 0) {
    return `Importing records into the catalogue. ${recordCount.toLocaleString()} active rows are already available.`;
  }

  return `Preparing the catalogue import. The site will unlock once at least ${targetRecordFloor.toLocaleString()} records are ready.`;
}

function getEtaSeconds(batch: BootstrapBatchRecord) {
  if (batch.totalRows <= 0 || batch.processedRows <= 0) {
    return null;
  }

  const elapsedMs = Date.now() - batch.startedAt.getTime();

  if (elapsedMs <= 0) {
    return null;
  }

  const rowsRemaining = Math.max(0, batch.totalRows - batch.processedRows);
  const msPerRow = elapsedMs / batch.processedRows;
  return Math.max(0, Math.round((rowsRemaining * msPerRow) / 1000));
}

function isBatchStale(batch: BootstrapBatchRecord) {
  return Date.now() - batch.updatedAt.getTime() > AUTO_BOOTSTRAP_STALE_MS;
}

async function getLatestBootstrapBatch() {
  return prisma.importBatch.findFirst({
    where: { sourceType: AUTO_BOOTSTRAP_SOURCE_TYPE },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      sourceFile: true,
      status: true,
      dryRun: true,
      totalRows: true,
      processedRows: true,
      createdCount: true,
      updatedCount: true,
      skippedCount: true,
      errorCount: true,
      warningCount: true,
      startedAt: true,
      finishedAt: true,
      updatedAt: true,
      summary: true,
    },
  });
}

export async function getCatalogBootstrapStatus(): Promise<CatalogBootstrapStatus> {
  const [recordCount, latestBatch] = await Promise.all([
    prisma.specimenRecord.count({ where: { archivedAt: null } }),
    getLatestBootstrapBatch(),
  ]);

  if (latestBatch) {
    const summary = asJsonRecord(latestBatch.summary);
    const phase =
      typeof summary.phase === "string"
        ? summary.phase
        : latestBatch.totalRows > 0
          ? "importing"
          : "downloading";
    const stale = isBatchStale(latestBatch);

    if (
      (latestBatch.status === ImportStatus.RUNNING || latestBatch.status === ImportStatus.PENDING) &&
      !stale
    ) {
      return {
        state: "running",
        batchId: latestBatch.id,
        sourceUrl: DEFAULT_BOOTSTRAP_WORKBOOK_URL,
        recordCount,
        targetRecordFloor: DEFAULT_BOOTSTRAP_RECORD_FLOOR,
        percent:
          latestBatch.totalRows > 0
            ? Math.min(99, Math.round((latestBatch.processedRows / latestBatch.totalRows) * 100))
            : 0,
        etaSeconds: getEtaSeconds(latestBatch),
        processedRows: latestBatch.processedRows,
        totalRows: latestBatch.totalRows,
        statusLabel: latestBatch.status,
        message: getBootstrapMessage(
          latestBatch,
          phase,
          recordCount,
          DEFAULT_BOOTSTRAP_RECORD_FLOOR,
        ),
        startedAt: latestBatch.startedAt.toISOString(),
        updatedAt: latestBatch.updatedAt.toISOString(),
        fileName: latestBatch.sourceFile,
      };
    }
  }

  if (recordCount >= DEFAULT_BOOTSTRAP_RECORD_FLOOR) {
    return {
      state: "ready",
      batchId: latestBatch?.id ?? null,
      sourceUrl: DEFAULT_BOOTSTRAP_WORKBOOK_URL,
      recordCount,
      targetRecordFloor: DEFAULT_BOOTSTRAP_RECORD_FLOOR,
      percent: 100,
      etaSeconds: 0,
      processedRows: latestBatch?.processedRows ?? 0,
      totalRows: latestBatch?.totalRows ?? 0,
      statusLabel: "READY",
      message: "Catalogue data is ready.",
      startedAt: latestBatch?.startedAt.toISOString() ?? null,
      updatedAt: latestBatch?.updatedAt.toISOString() ?? null,
      fileName: latestBatch?.sourceFile ?? null,
    };
  }

  if (!latestBatch) {
    return {
      state: "idle",
      batchId: null,
      sourceUrl: DEFAULT_BOOTSTRAP_WORKBOOK_URL,
      recordCount,
      targetRecordFloor: DEFAULT_BOOTSTRAP_RECORD_FLOOR,
      percent: 0,
      etaSeconds: null,
      processedRows: 0,
      totalRows: 0,
      statusLabel: "WAITING",
      message: "Preparing the default Bryozoa catalogue import.",
      startedAt: null,
      updatedAt: null,
      fileName: null,
    };
  }

  const summary = asJsonRecord(latestBatch.summary);
  const stale = isBatchStale(latestBatch);

  const failureMessage = stale
    ? "The automatic import stalled and can be restarted."
    : typeof summary.fatalError === "string"
      ? summary.fatalError
      : latestBatch.status === ImportStatus.DRY_RUN
        ? "The latest run was only a preview and did not update the catalogue."
        : "The catalogue still needs the full automatic import.";

  return {
    state: "failed",
    batchId: latestBatch.id,
    sourceUrl: DEFAULT_BOOTSTRAP_WORKBOOK_URL,
    recordCount,
    targetRecordFloor: DEFAULT_BOOTSTRAP_RECORD_FLOOR,
    percent:
      latestBatch.totalRows > 0
        ? Math.round((latestBatch.processedRows / latestBatch.totalRows) * 100)
        : 0,
    etaSeconds: null,
    processedRows: latestBatch.processedRows,
    totalRows: latestBatch.totalRows,
    statusLabel: stale ? "STALE" : latestBatch.status,
    message: failureMessage,
    startedAt: latestBatch.startedAt.toISOString(),
    updatedAt: latestBatch.updatedAt.toISOString(),
    fileName: latestBatch.sourceFile,
    failureMessage,
  };
}

async function markBatchFailed(batch: BootstrapBatchRecord, fatalError: string) {
  const summary = asJsonRecord(batch.summary);

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: ImportStatus.FAILED,
      finishedAt: new Date(),
      summary: {
        ...summary,
        phase: "failed",
        fatalError,
        sourceUrl: DEFAULT_BOOTSTRAP_WORKBOOK_URL,
        autoBootstrap: true,
      },
    },
  });
}

export async function ensureCatalogBootstrapBatch() {
  const latestBatch = await getLatestBootstrapBatch();
  const recordCount = await prisma.specimenRecord.count({ where: { archivedAt: null } });

  if (recordCount >= DEFAULT_BOOTSTRAP_RECORD_FLOOR) {
    return { batchId: null, shouldStart: false };
  }

  if (
    latestBatch &&
    (latestBatch.status === ImportStatus.RUNNING || latestBatch.status === ImportStatus.PENDING)
  ) {
    if (!isBatchStale(latestBatch)) {
      return { batchId: latestBatch.id, shouldStart: false };
    }

    await markBatchFailed(latestBatch, "The automatic import stalled before completion.");
  }

  const batch = await prisma.importBatch.create({
    data: {
      sourceFile: "Default Bryozoa catalogue workbook",
      sourceType: AUTO_BOOTSTRAP_SOURCE_TYPE,
      dryRun: false,
      status: ImportStatus.PENDING,
      summary: {
        autoBootstrap: true,
        sourceUrl: DEFAULT_BOOTSTRAP_WORKBOOK_URL,
        phase: "queued",
        targetRecordFloor: DEFAULT_BOOTSTRAP_RECORD_FLOOR,
      },
    },
    select: { id: true },
  });

  return { batchId: batch.id, shouldStart: true };
}

function getLocalWorkbookCandidates() {
  const candidates = [
    resolve(process.cwd(), "ALL_Bryozoa.xlsx"),
    resolve(process.cwd(), "data", "ALL_Bryozoa.xlsx"),
  ];

  if (LOCAL_WORKBOOK_PATH.trim()) {
    candidates.unshift(resolve(LOCAL_WORKBOOK_PATH.trim()));
  }

  return candidates;
}

async function loadLocalWorkbook() {
  const candidates = getLocalWorkbookCandidates();

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const buffer = await readFile(candidate);
      if (buffer.length > 0) {
        const fileName = candidate.split(/[\\/]/).at(-1) ?? "local-workbook.xlsx";
        console.log(`[catalog-bootstrap] Using local workbook: ${candidate}`);
        return { buffer, fileName, filePath: candidate };
      }
    }
  }
  return null;
}

export async function runCatalogBootstrapImport(batchId: string) {
  await prisma.importBatch.update({
    where: { id: batchId },
    data: {
      sourceType: AUTO_BOOTSTRAP_SOURCE_TYPE,
      dryRun: false,
      status: ImportStatus.RUNNING,
      summary: {
        autoBootstrap: true,
        sourceUrl: DEFAULT_BOOTSTRAP_WORKBOOK_URL,
        phase: "downloading",
        targetRecordFloor: DEFAULT_BOOTSTRAP_RECORD_FLOOR,
      },
    },
  });

  try {
    // Try local workbook first, then fall back to remote download.
    const localWorkbook = await loadLocalWorkbook();

    const workbookSource = localWorkbook
      ? {
          buffer: localWorkbook.buffer,
          fileName: localWorkbook.fileName,
          sourceUrl: `file://${localWorkbook.filePath}`,
        }
      : await downloadRemoteWorkbook(DEFAULT_BOOTSTRAP_WORKBOOK_URL);

    await importBryozoaWorkbook({
      buffer: workbookSource.buffer,
      fileName: workbookSource.fileName,
      dryRun: false,
      initiatedByUserId: null,
      sourceType: AUTO_BOOTSTRAP_SOURCE_TYPE,
      sourceUrl: "sourceUrl" in workbookSource ? workbookSource.sourceUrl : DEFAULT_BOOTSTRAP_WORKBOOK_URL,
      existingBatchId: batchId,
      progressEveryRows: 250,
    });
  } catch (error) {
    console.error("[catalog-bootstrap] Import failed:", error instanceof Error ? error.message : error);

    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        sourceFile: true,
        status: true,
        dryRun: true,
        totalRows: true,
        processedRows: true,
        createdCount: true,
        updatedCount: true,
        skippedCount: true,
        errorCount: true,
        warningCount: true,
        startedAt: true,
        finishedAt: true,
        updatedAt: true,
        summary: true,
      },
    });

    if (batch && batch.status !== ImportStatus.FAILED) {
      await markBatchFailed(
        batch,
        error instanceof Error ? error.message : "Automatic bootstrap import failed.",
      );
    }

    throw error;
  }
}
