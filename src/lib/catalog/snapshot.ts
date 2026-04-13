import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  createCatalogId,
  createCatalogSourceHash,
  getCatalogRowMetadata,
  readCatalogSourceState,
  stripCatalogRowMetadata,
} from "@/lib/catalog/source";
import type { CatalogRecord, CatalogSnapshot } from "@/lib/catalog/types";
import { prepareImportRow } from "@/lib/import/normalizers";

const CATALOG_CACHE_PATH = resolve(process.cwd(), "data", "runtime", "catalog-cache.json");

const globalForCatalog = globalThis as typeof globalThis & {
  catalogSnapshot?: Promise<CatalogSnapshot>;
};

function buildSnapshotRecord(
  rawRow: Parameters<typeof getCatalogRowMetadata>[0],
  rowNumber: number,
): CatalogRecord {
  const prepared = prepareImportRow(stripCatalogRowMetadata(rawRow), rowNumber);
  const metadata = getCatalogRowMetadata(rawRow);
  const id = metadata.id ?? createCatalogId(prepared.importKey);
  const now = metadata.updatedAt ?? metadata.createdAt ?? new Date(0).toISOString();

  return {
    id,
    importKey: prepared.importKey,
    importKeySource: prepared.importKeySource,
    archivedAt: metadata.archived ? metadata.updatedAt ?? metadata.createdAt ?? now : null,
    createdAt: metadata.createdAt ?? now,
    updatedAt: metadata.updatedAt ?? metadata.createdAt ?? now,
    ...prepared.record,
    taxonomy: prepared.taxonomy,
    location: prepared.location,
    collectorPerson: prepared.collectorName ? { name: prepared.collectorName } : null,
    identifierPerson: prepared.identifierName ? { name: prepared.identifierName } : null,
    images: prepared.images.map((image) => ({
      id: `${id}:image:${image.position}`,
      ...image,
    })),
    references: prepared.references.map((reference) => ({
      id: `${id}:reference:${reference.position}`,
      ...reference,
    })),
    _count: {
      images: prepared.images.length,
      references: prepared.references.length,
    },
    importBatch: null,
  };
}

export async function buildCatalogSnapshot() {
  const source = await readCatalogSourceState();
  const records = source.document.rows.map((row, index) => buildSnapshotRecord(row, index + 2));

  return {
    generatedAt: new Date().toISOString(),
    sourceHash: createCatalogSourceHash(source.document),
    sheetName: source.document.sheetName ?? "ALL",
    headers: source.document.headers ?? [],
    records,
  } satisfies CatalogSnapshot;
}

async function readLocalCatalogCache() {
  try {
    const raw = await readFile(CATALOG_CACHE_PATH, "utf8");
    return JSON.parse(raw) as CatalogSnapshot;
  } catch {
    return null;
  }
}

export async function writeCatalogSnapshot(snapshot: CatalogSnapshot) {
  try {
    await mkdir(resolve(process.cwd(), "data", "runtime"), { recursive: true });
    await writeFile(CATALOG_CACHE_PATH, `${JSON.stringify(snapshot)}\n`, "utf8");
  } catch {
    // Ignore runtime filesystem write failures on serverless.
  }
}

export async function getCatalogSnapshot() {
  if (!globalForCatalog.catalogSnapshot) {
    globalForCatalog.catalogSnapshot = (async () => {
      const cached = await readLocalCatalogCache();

      if (cached?.records?.length) {
        return cached;
      }

      const snapshot = await buildCatalogSnapshot();
      await writeCatalogSnapshot(snapshot);
      return snapshot;
    })();
  }

  return globalForCatalog.catalogSnapshot;
}

export function invalidateCatalogSnapshotCache() {
  globalForCatalog.catalogSnapshot = undefined;
}
