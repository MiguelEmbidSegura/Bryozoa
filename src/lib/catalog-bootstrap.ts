import { buildCatalogSnapshot, getCatalogSnapshot, invalidateCatalogSnapshotCache, writeCatalogSnapshot } from "@/lib/catalog/snapshot";
import { env } from "@/lib/env";

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

export async function getCatalogBootstrapStatus(): Promise<CatalogBootstrapStatus> {
  try {
    const snapshot = await getCatalogSnapshot();
    const recordCount = snapshot.records.filter((record) => !record.archivedAt).length;

    return {
      state: recordCount > 0 ? "ready" : "idle",
      batchId: null,
      sourceUrl: env.CATALOG_SOURCE_PATH,
      recordCount,
      targetRecordFloor: recordCount,
      percent: recordCount > 0 ? 100 : 0,
      etaSeconds: recordCount > 0 ? 0 : null,
      processedRows: recordCount,
      totalRows: recordCount,
      statusLabel: recordCount > 0 ? "READY" : "WAITING",
      message:
        recordCount > 0
          ? "Catalogue data is bundled with this deployment."
          : "The bundled catalogue source is empty.",
      startedAt: null,
      updatedAt: snapshot.generatedAt,
      fileName: env.CATALOG_SOURCE_PATH,
    };
  } catch (error) {
    return {
      state: "failed",
      batchId: null,
      sourceUrl: env.CATALOG_SOURCE_PATH,
      recordCount: 0,
      targetRecordFloor: 0,
      percent: 0,
      etaSeconds: null,
      processedRows: 0,
      totalRows: 0,
      statusLabel: "FAILED",
      message: "The bundled catalogue source could not be read.",
      startedAt: null,
      updatedAt: null,
      fileName: env.CATALOG_SOURCE_PATH,
      failureMessage: error instanceof Error ? error.message : "Unknown error.",
    };
  }
}

export async function ensureCatalogBootstrapBatch() {
  return {
    shouldStart: false,
    batchId: null,
  };
}

export async function runCatalogBootstrapImport(_batchId: string) {
  void _batchId;
  invalidateCatalogSnapshotCache();
  const snapshot = await buildCatalogSnapshot();
  await writeCatalogSnapshot(snapshot);
  invalidateCatalogSnapshotCache();
  return snapshot;
}
