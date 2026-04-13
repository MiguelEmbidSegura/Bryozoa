import { UserRole } from "@/generated/prisma/enums";
import {
  buildCatalogSnapshot,
  getCatalogSnapshot,
  invalidateCatalogSnapshotCache,
  writeCatalogSnapshot,
} from "@/lib/catalog/snapshot";
import {
  createCatalogId,
  createCatalogSourceHash,
  isGitHubCatalogSyncEnabled,
  readCatalogSourceState,
  saveCatalogSourceState,
  stripCatalogRowMetadata,
  withCatalogRowMetadata,
} from "@/lib/catalog/source";
import type { CatalogSourceDocument, CatalogSourceRow } from "@/lib/catalog/types";
import { prepareImportRow } from "@/lib/import/normalizers";
import type { RecordFormValues, UserFormValues } from "@/lib/validators";
import { env } from "@/lib/env";

function recordFormToSourceRow(values: RecordFormValues) {
  return {
    OID_: values.oid ?? "",
    Register: values.register ?? "",
    Stratigrap: values.stratigraphy ?? "",
    Class: values.taxClass ?? "",
    Order_: values.taxOrder ?? "",
    Family: values.family ?? "",
    Taxon: values.taxon ?? "",
    Taxon_author: values.taxonAuthor ?? "",
    "Verbatim ID": values.verbatimIdentification ?? "",
    Type: values.typeStatus ?? "",
    Cited_Figu: values.citedFigure ?? "",
    Site: values.siteName ?? "",
    "Min_Depth (m)": values.minDepthMRaw ?? "",
    "Max_Depth (m)": values.maxDepthMRaw ?? "",
    "Province/County/District": values.provinceOrDistrict ?? "",
    "Community/Region": values.region ?? "",
    Country: values.country ?? "",
    Continent_Plate: values.continentOrPlate ?? "",
    "Water body": values.waterBody ?? "",
    Ocean_Sea: values.oceanSea ?? "",
    Latitude: values.latitudeRaw ?? "",
    Longitud: values.longitudeRaw ?? "",
    "Radius (km)": values.radiusKmRaw ?? "",
    Collection_date: values.collectionDateRaw ?? "",
    "Date Qualifier": values.dateQualifier ?? "",
    "Collector/Recorder": values.collectorRecorderRaw ?? "",
    "Donor / Collection": values.donorCollection ?? "",
    Indentifie: values.identifiedByRaw ?? "",
    Number_of_: values.specimenCountRaw ?? "",
    Notes: values.notes ?? "",
    Reference1: values.references[0]?.citation ?? "",
    Reference2: values.references[1]?.citation ?? "",
    Reference3: values.references[2]?.citation ?? "",
    Reference4: values.references[3]?.citation ?? "",
    Image1: values.images[0]?.originalValue ?? "",
    Image2: values.images[1]?.originalValue ?? "",
    Image3: values.images[2]?.originalValue ?? "",
    Image4: values.images[3]?.originalValue ?? "",
    Image5: values.images[4]?.originalValue ?? "",
    Image6: values.images[5]?.originalValue ?? "",
    Image7: values.images[6]?.originalValue ?? "",
    Image8: values.images[7]?.originalValue ?? "",
    Image9: values.images[8]?.originalValue ?? "",
    Image10: values.images[9]?.originalValue ?? "",
    Image11: values.images[10]?.originalValue ?? "",
    Image12: values.images[11]?.originalValue ?? "",
    Image13: values.images[12]?.originalValue ?? "",
    Image14: values.images[13]?.originalValue ?? "",
    Image15: values.images[14]?.originalValue ?? "",
    Image16: values.images[15]?.originalValue ?? "",
    Image17: values.images[16]?.originalValue ?? "",
    Image_auth: values.imageAuthor ?? "",
  };
}

function mergeHeaders(document: CatalogSourceDocument, row: Record<string, string>) {
  const headerSet = new Set(document.headers ?? []);

  for (const key of Object.keys(row)) {
    headerSet.add(key);
  }

  return Array.from(headerSet);
}

function finalizeDocument(document: CatalogSourceDocument) {
  return {
    ...document,
    format: "bryozoo-import-json-v2",
    headers: document.headers ?? [],
    totalRows: document.rows.length,
    sourceHash: createCatalogSourceHash(document),
  } satisfies CatalogSourceDocument;
}

function findRowIndexById(rows: CatalogSourceRow[], id: string) {
  return rows.findIndex((row) => row.__catalogId === id);
}

function buildCommitPrefix() {
  return isGitHubCatalogSyncEnabled() ? "catalog(github)" : "catalog(local)";
}

async function refreshLocalSnapshotIfPossible() {
  if (isGitHubCatalogSyncEnabled()) {
    return;
  }

  invalidateCatalogSnapshotCache();
  const snapshot = await buildCatalogSnapshot();
  await writeCatalogSnapshot(snapshot);
  invalidateCatalogSnapshotCache();
}

export async function saveSpecimenRecord(values: RecordFormValues, _actorUserId: string) {
  void _actorUserId;
  const state = await readCatalogSourceState({ preferRemote: isGitHubCatalogSyncEnabled() });
  const sourceRow = recordFormToSourceRow(values);
  const prepared = prepareImportRow(sourceRow, 0);
  const now = new Date().toISOString();
  const existingIndex = values.id ? findRowIndexById(state.document.rows, values.id) : -1;
  const catalogId = values.id ?? createCatalogId(prepared.importKey);

  const conflictingIndex = state.document.rows.findIndex((row, index) => {
    if (index === existingIndex) return false;
    return prepareImportRow(stripCatalogRowMetadata(row), index + 2).importKey === prepared.importKey;
  });

  if (conflictingIndex >= 0) {
    throw new Error("Another record already uses the same deduplication key.");
  }

  const existingRow = existingIndex >= 0 ? state.document.rows[existingIndex] : null;
  const nextRow = withCatalogRowMetadata(sourceRow, {
    id: catalogId,
    archived: values.archived,
    createdAt: existingRow?.__createdAt ?? now,
    updatedAt: now,
  });

  const nextRows = [...state.document.rows];

  if (existingIndex >= 0) {
    nextRows[existingIndex] = nextRow;
  } else {
    nextRows.push(nextRow);
  }

  const nextDocument = finalizeDocument({
    ...state.document,
    headers: mergeHeaders(state.document, sourceRow),
    rows: nextRows,
  });

  await saveCatalogSourceState(
    state,
    nextDocument,
    `${buildCommitPrefix()}: ${existingIndex >= 0 ? "update" : "create"} ${catalogId}`,
  );
  await refreshLocalSnapshotIfPossible();

  return {
    id: catalogId,
    deploymentPending: isGitHubCatalogSyncEnabled(),
  };
}

export async function setRecordArchived(recordId: string, archived: boolean, _actorUserId: string) {
  void _actorUserId;
  const state = await readCatalogSourceState({ preferRemote: isGitHubCatalogSyncEnabled() });
  const index = findRowIndexById(state.document.rows, recordId);

  if (index < 0) {
    throw new Error("Record not found.");
  }

  const current = state.document.rows[index];
  const nextRows = [...state.document.rows];
  nextRows[index] = {
    ...current,
    __archived: archived ? "true" : "false",
    __updatedAt: new Date().toISOString(),
  };

  const nextDocument = finalizeDocument({
    ...state.document,
    rows: nextRows,
  });

  await saveCatalogSourceState(
    state,
    nextDocument,
    `${buildCommitPrefix()}: ${archived ? "archive" : "restore"} ${recordId}`,
  );
  await refreshLocalSnapshotIfPossible();
}

export async function deleteRecord(recordId: string, _actorUserId: string) {
  void _actorUserId;
  const state = await readCatalogSourceState({ preferRemote: isGitHubCatalogSyncEnabled() });
  const nextRows = state.document.rows.filter((row) => row.__catalogId !== recordId);

  if (nextRows.length === state.document.rows.length) {
    throw new Error("Record not found.");
  }

  const nextDocument = finalizeDocument({
    ...state.document,
    rows: nextRows,
  });

  await saveCatalogSourceState(state, nextDocument, `${buildCommitPrefix()}: delete ${recordId}`);
  await refreshLocalSnapshotIfPossible();
}

export async function getAdminDashboardData() {
  const snapshot = await getCatalogSnapshot();
  const activeRecords = snapshot.records.filter((record) => !record.archivedAt);
  const archivedRecords = snapshot.records.filter((record) => Boolean(record.archivedAt));

  return {
    recordCount: activeRecords.length,
    archivedCount: archivedRecords.length,
    importCount: 0,
    userCount: 1,
    recentIssues: 0,
  };
}

export async function getImportHistory() {
  return [];
}

export async function getAuditHistory() {
  return [];
}

export async function getAdminUsers() {
  return [
    {
      id: "env-admin",
      name: "BryoZoo Admin",
      email: env.ADMIN_SEED_EMAIL,
      role: UserRole.ADMIN,
      isActive: true,
    },
  ];
}

export async function saveAdminUser(_values: UserFormValues, _actorUserId: string) {
  void _values;
  void _actorUserId;
  throw new Error("User management is disabled in GitHub catalog mode.");
}
