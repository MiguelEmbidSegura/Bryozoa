import type { DatePrecision, ImportKeySource } from "@/generated/prisma/enums";
import type { SourceRow } from "@/lib/import/normalizers";

export type CatalogSourceRow = SourceRow & {
  __catalogId?: string;
  __archived?: string;
  __createdAt?: string;
  __updatedAt?: string;
};

export type CatalogSourceDocument = {
  format?: string;
  sourceFormat?: string;
  originalFileName?: string;
  sheetName?: string;
  sourceHash?: string;
  totalRows?: number;
  headers?: string[];
  rows: CatalogSourceRow[];
};

export type CatalogSourceState = {
  document: CatalogSourceDocument;
  mode: "local" | "github";
  sha: string | null;
};

export type CatalogImage = {
  id: string;
  position: number;
  originalValue: string;
  url: string | null;
  fileName: string | null;
  isUrl: boolean;
  author: string | null;
};

export type CatalogReference = {
  id: string;
  position: number;
  citation: string;
  normalizedCitation: string;
};

export type CatalogRecord = {
  id: string;
  importKey: string;
  importKeySource: ImportKeySource;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  oid: string | null;
  register: string | null;
  stratigraphy: string | null;
  typeStatus: string | null;
  typeStatusNormalized: string | null;
  citedFigure: string | null;
  hasCitedFigure: boolean | null;
  donorCollection: string | null;
  collectorRecorderRaw: string | null;
  identifiedByRaw: string | null;
  specimenCountRaw: string | null;
  specimenCount: number | null;
  minDepthMRaw: string | null;
  maxDepthMRaw: string | null;
  minDepthM: number | null;
  maxDepthM: number | null;
  notes: string | null;
  imageAuthor: string | null;
  collectionDateRaw: string | null;
  parsedYear: number | null;
  parsedMonth: number | null;
  parsedDay: number | null;
  datePrecision: DatePrecision;
  dateQualifier: string | null;
  searchText: string;
  taxonomy: {
    taxClass: string | null;
    taxOrder: string | null;
    family: string | null;
    taxon: string | null;
    taxonAuthor: string | null;
    verbatimIdentification: string | null;
    searchLabel: string | null;
  } | null;
  location: {
    siteName: string | null;
    provinceOrDistrict: string | null;
    region: string | null;
    country: string | null;
    continentOrPlate: string | null;
    waterBody: string | null;
    oceanSea: string | null;
    latitudeRaw: string | null;
    longitudeRaw: string | null;
    latitude: number | null;
    longitude: number | null;
    radiusKmRaw: string | null;
    radiusKm: number | null;
    hasValidCoordinates: boolean;
  } | null;
  collectorPerson: { name: string | null } | null;
  identifierPerson: { name: string | null } | null;
  images: CatalogImage[];
  references: CatalogReference[];
  _count: {
    images: number;
    references: number;
  };
  importBatch: null;
};

export type CatalogSnapshot = {
  generatedAt: string;
  sourceHash: string;
  sheetName: string;
  headers: string[];
  records: CatalogRecord[];
};
