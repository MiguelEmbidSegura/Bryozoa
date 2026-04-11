import { createHash } from "node:crypto";
import { DatePrecision, ImportKeySource, ImportSeverity } from "@/generated/prisma/enums";
import { IMAGE_HEADERS, REFERENCE_HEADERS } from "@/lib/import/columns";

const UNKNOWN_VALUES = new Set([
  "",
  "unknown",
  "n/a",
  "na",
  "none",
  "null",
  "?",
  "not available",
]);

export type SourceRow = Record<string, string>;

export type ImportIssueDraft = {
  severity: ImportSeverity;
  code: string;
  message: string;
  field?: string | null;
  rawValue?: string | null;
  rowNumber?: number | null;
  importKey?: string | null;
};

export type PreparedImportRow = {
  importKey: string;
  importKeySource: ImportKeySource;
  record: {
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
    rawData: SourceRow;
  };
  taxonomy: {
    normalizedKey: string;
    taxClass: string | null;
    taxOrder: string | null;
    family: string | null;
    taxon: string | null;
    taxonAuthor: string | null;
    verbatimIdentification: string | null;
    searchLabel: string | null;
  } | null;
  location: {
    normalizedKey: string;
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
  collectorName: string | null;
  identifierName: string | null;
  images: Array<{
    position: number;
    originalValue: string;
    url: string | null;
    fileName: string | null;
    isUrl: boolean;
    author: string | null;
  }>;
  references: Array<{
    position: number;
    citation: string;
    normalizedCitation: string;
  }>;
  issues: ImportIssueDraft[];
};

function hashString(value: string) {
  return createHash("sha1").update(value).digest("hex");
}

function trimmed(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeUnknown(value: unknown) {
  const raw = trimmed(value);

  if (!raw) return null;
  if (UNKNOWN_VALUES.has(raw.toLowerCase())) return null;
  return raw;
}

export function normalizeKeyPart(value: string | null | undefined) {
  if (!value) return "";

  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w]+/g, " ")
    .trim()
    .toLowerCase();
}

export function parseFlexibleFloat(value: unknown) {
  const raw = normalizeUnknown(value);
  if (!raw) return null;

  const parsed = Number(raw.replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseFlexibleInt(value: unknown) {
  const raw = normalizeUnknown(value);
  if (!raw) return null;

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseYesNo(value: unknown) {
  const raw = normalizeUnknown(value);

  if (!raw) return null;
  if (/^(yes|y|true)$/i.test(raw)) return true;
  if (/^(no|n|false)$/i.test(raw)) return false;

  return null;
}

export function buildImportKey(row: SourceRow) {
  const register = normalizeUnknown(row.Register);
  if (register) {
    return {
      importKey: `register:${normalizeKeyPart(register)}`,
      importKeySource: ImportKeySource.REGISTER,
    };
  }

  const oid = normalizeUnknown(row.OID_);
  if (oid) {
    return {
      importKey: `oid:${normalizeKeyPart(oid)}`,
      importKeySource: ImportKeySource.OID,
    };
  }

  const signature = [
    row.Class,
    row.Order_,
    row.Family,
    row.Taxon,
    row.Taxon_author,
    row.Site,
    row.Country,
    row.Collection_date,
    row["Collector/Recorder"],
    row.Indentifie,
    row.Notes,
  ]
    .map((value) => normalizeKeyPart(normalizeUnknown(value)))
    .join("|");

  return {
    importKey: `generated:${hashString(signature || JSON.stringify(row)).slice(0, 24)}`,
    importKeySource: ImportKeySource.GENERATED,
  };
}

export function parseCollectionDate(rawValue: unknown, qualifierValue: unknown) {
  const rawDate = normalizeUnknown(rawValue);
  const dateQualifier = normalizeUnknown(qualifierValue);

  if (!rawDate) {
    return {
      collectionDateRaw: null,
      parsedYear: null,
      parsedMonth: null,
      parsedDay: null,
      datePrecision: DatePrecision.UNKNOWN,
      dateQualifier,
      issues: [] as ImportIssueDraft[],
    };
  }

  const issues: ImportIssueDraft[] = [];
  const slashMatch = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (slashMatch) {
    const [, dayRaw, monthRaw, yearRaw] = slashMatch;
    const parsedYear = Number(yearRaw);
    const parsedMonth = monthRaw === "00" ? null : Number(monthRaw);
    const parsedDay = dayRaw === "00" ? null : Number(dayRaw);

    let datePrecision: DatePrecision = DatePrecision.YEAR;
    if (parsedMonth) datePrecision = DatePrecision.MONTH;
    if (parsedMonth && parsedDay) datePrecision = DatePrecision.DAY;

    if (dayRaw === "00" || monthRaw === "00") {
      issues.push({
        severity: ImportSeverity.INFO,
        code: "PARTIAL_DATE",
        message: `Partial collection date parsed from "${rawDate}".`,
        field: "Collection_date",
        rawValue: rawDate,
      });
    }

    return {
      collectionDateRaw: rawDate,
      parsedYear,
      parsedMonth,
      parsedDay,
      datePrecision,
      dateQualifier,
      issues,
    };
  }

  const yearMatch = rawDate.match(/(?:^|[^\d])(\d{4})(?:[^\d]|$)/);

  if (yearMatch) {
    return {
      collectionDateRaw: rawDate,
      parsedYear: Number(yearMatch[1]),
      parsedMonth: null,
      parsedDay: null,
      datePrecision: DatePrecision.TEXTUAL,
      dateQualifier,
      issues: [
        {
          severity: ImportSeverity.INFO,
          code: "TEXTUAL_DATE",
          message: `Textual collection date kept raw: "${rawDate}".`,
          field: "Collection_date",
          rawValue: rawDate,
        },
      ],
    };
  }

  return {
    collectionDateRaw: rawDate,
    parsedYear: null,
    parsedMonth: null,
    parsedDay: null,
    datePrecision: DatePrecision.TEXTUAL,
    dateQualifier,
    issues: [
      {
        severity: ImportSeverity.WARNING,
        code: "UNPARSED_DATE",
        message: `Could not parse collection date "${rawDate}".`,
        field: "Collection_date",
        rawValue: rawDate,
      },
    ],
  };
}

export function parseCoordinates(row: SourceRow) {
  const latitudeRaw = normalizeUnknown(row.Latitude);
  const longitudeRaw = normalizeUnknown(row.Longitud);
  const radiusKmRaw = normalizeUnknown(row["Radius (km)"]);
  const latitude = parseFlexibleFloat(row.Latitude);
  const longitude = parseFlexibleFloat(row.Longitud);
  const radiusKm = parseFlexibleFloat(row["Radius (km)"]);
  let hasValidCoordinates = false;
  const issues: ImportIssueDraft[] = [];

  if (latitude !== null && longitude !== null) {
    const isWithinBounds =
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180 &&
      !(latitude === 0 && longitude === 0);

    hasValidCoordinates = isWithinBounds;

    if (!isWithinBounds) {
      issues.push({
        severity: latitude === 0 && longitude === 0 ? ImportSeverity.INFO : ImportSeverity.WARNING,
        code: latitude === 0 && longitude === 0 ? "ZERO_COORDINATES" : "INVALID_COORDINATES",
        message:
          latitude === 0 && longitude === 0
            ? "Latitude/longitude 0,0 treated as invalid for map usage."
            : "Latitude/longitude fell outside valid geographic bounds.",
        field: "Latitude/Longitud",
        rawValue: `${latitudeRaw ?? ""}, ${longitudeRaw ?? ""}`.trim(),
      });
    }
  } else if (latitudeRaw || longitudeRaw) {
    issues.push({
      severity: ImportSeverity.WARNING,
      code: "UNPARSED_COORDINATES",
      message: "Could not parse coordinates into numeric values.",
      field: "Latitude/Longitud",
      rawValue: `${latitudeRaw ?? ""}, ${longitudeRaw ?? ""}`.trim(),
    });
  }

  return {
    latitudeRaw,
    longitudeRaw,
    radiusKmRaw,
    latitude: hasValidCoordinates ? latitude : null,
    longitude: hasValidCoordinates ? longitude : null,
    radiusKm,
    hasValidCoordinates,
    issues,
  };
}

export function extractImages(row: SourceRow, imageAuthor: string | null) {
  return IMAGE_HEADERS.map((header, index) => {
    const originalValue = normalizeUnknown(row[header]);
    if (!originalValue) return null;

    const isUrl = /^https?:\/\//i.test(originalValue);

    return {
      position: index + 1,
      originalValue,
      url: isUrl ? originalValue : null,
      fileName: isUrl ? null : originalValue,
      isUrl,
      author: imageAuthor,
    };
  }).filter((value): value is NonNullable<typeof value> => Boolean(value));
}

export function extractReferences(row: SourceRow) {
  return REFERENCE_HEADERS.map((header, index) => {
    const citation = normalizeUnknown(row[header]);
    if (!citation) return null;

    return {
      position: index + 1,
      citation,
      normalizedCitation: normalizeKeyPart(citation),
    };
  }).filter((value): value is NonNullable<typeof value> => Boolean(value));
}

function buildSearchText(input: {
  register: string | null;
  oid: string | null;
  taxonomy: PreparedImportRow["taxonomy"];
  location: PreparedImportRow["location"];
  collectorName: string | null;
  identifierName: string | null;
  donorCollection: string | null;
  typeStatus: string | null;
  notes: string | null;
  references: Array<{ citation: string }>;
}) {
  return [
    input.register,
    input.oid,
    input.taxonomy?.taxClass,
    input.taxonomy?.taxOrder,
    input.taxonomy?.family,
    input.taxonomy?.taxon,
    input.taxonomy?.taxonAuthor,
    input.taxonomy?.verbatimIdentification,
    input.location?.siteName,
    input.location?.provinceOrDistrict,
    input.location?.region,
    input.location?.country,
    input.location?.continentOrPlate,
    input.location?.waterBody,
    input.location?.oceanSea,
    input.collectorName,
    input.identifierName,
    input.donorCollection,
    input.typeStatus,
    input.notes,
    ...input.references.map((reference) => reference.citation),
  ]
    .filter(Boolean)
    .join(" ");
}

export function prepareImportRow(row: SourceRow, rowNumber: number): PreparedImportRow {
  const issues: ImportIssueDraft[] = [];
  const { importKey, importKeySource } = buildImportKey(row);

  if (importKeySource === ImportKeySource.GENERATED) {
    issues.push({
      severity: ImportSeverity.INFO,
      code: "GENERATED_IMPORT_KEY",
      message: "Register and OID were missing, so a stable generated import key was used.",
      rowNumber,
      importKey,
    });
  }

  const taxonomyCore = {
    taxClass: normalizeUnknown(row.Class),
    taxOrder: normalizeUnknown(row.Order_),
    family: normalizeUnknown(row.Family),
    taxon: normalizeUnknown(row.Taxon),
    taxonAuthor: normalizeUnknown(row.Taxon_author),
    verbatimIdentification: normalizeUnknown(row["Verbatim ID"]),
  };

  const taxonomy = Object.values(taxonomyCore).some(Boolean)
    ? {
        normalizedKey: hashString(
          [
            taxonomyCore.taxClass,
            taxonomyCore.taxOrder,
            taxonomyCore.family,
            taxonomyCore.taxon,
            taxonomyCore.taxonAuthor,
            taxonomyCore.verbatimIdentification,
          ]
            .map((value) => normalizeKeyPart(value))
            .join("|"),
        ),
        ...taxonomyCore,
        searchLabel: [
          taxonomyCore.taxClass,
          taxonomyCore.taxOrder,
          taxonomyCore.family,
          taxonomyCore.taxon,
        ]
          .filter(Boolean)
          .join(" / "),
      }
    : null;

  const dateBits = parseCollectionDate(row.Collection_date, row["Date Qualifier"]);
  const coordinateBits = parseCoordinates(row);
  const collectorName = normalizeUnknown(row["Collector/Recorder"]);
  const identifierName = normalizeUnknown(row.Indentifie);
  const imageAuthor = normalizeUnknown(row.Image_auth);
  const references = extractReferences(row);
  const images = extractImages(row, imageAuthor);

  issues.push(...dateBits.issues, ...coordinateBits.issues);

  const locationCore = {
    siteName: normalizeUnknown(row.Site),
    provinceOrDistrict: normalizeUnknown(row["Province/County/District"]),
    region: normalizeUnknown(row["Community/Region"]),
    country: normalizeUnknown(row.Country),
    continentOrPlate: normalizeUnknown(row.Continent_Plate),
    waterBody: normalizeUnknown(row["Water body"]),
    oceanSea: normalizeUnknown(row.Ocean_Sea),
    latitudeRaw: coordinateBits.latitudeRaw,
    longitudeRaw: coordinateBits.longitudeRaw,
    latitude: coordinateBits.latitude,
    longitude: coordinateBits.longitude,
    radiusKmRaw: coordinateBits.radiusKmRaw,
    radiusKm: coordinateBits.radiusKm,
    hasValidCoordinates: coordinateBits.hasValidCoordinates,
  };

  const location = Object.values(locationCore).some((value) => value !== null && value !== false)
    ? {
        normalizedKey: hashString(
          [
            locationCore.siteName,
            locationCore.provinceOrDistrict,
            locationCore.region,
            locationCore.country,
            locationCore.continentOrPlate,
            locationCore.waterBody,
            locationCore.oceanSea,
            locationCore.latitudeRaw,
            locationCore.longitudeRaw,
            locationCore.radiusKmRaw,
          ]
            .map((value) => normalizeKeyPart(typeof value === "string" ? value : String(value ?? "")))
            .join("|"),
        ),
        ...locationCore,
      }
    : null;

  const record = {
    oid: normalizeUnknown(row.OID_),
    register: normalizeUnknown(row.Register),
    stratigraphy: normalizeUnknown(row.Stratigrap),
    typeStatus: normalizeUnknown(row.Type),
    typeStatusNormalized: normalizeKeyPart(normalizeUnknown(row.Type)),
    citedFigure: normalizeUnknown(row.Cited_Figu),
    hasCitedFigure: parseYesNo(row.Cited_Figu),
    donorCollection: normalizeUnknown(row["Donor / Collection"]),
    collectorRecorderRaw: collectorName,
    identifiedByRaw: identifierName,
    specimenCountRaw: normalizeUnknown(row.Number_of_),
    specimenCount: parseFlexibleInt(row.Number_of_),
    minDepthMRaw: normalizeUnknown(row["Min_Depth (m)"]),
    maxDepthMRaw: normalizeUnknown(row["Max_Depth (m)"]),
    minDepthM: parseFlexibleFloat(row["Min_Depth (m)"]),
    maxDepthM: parseFlexibleFloat(row["Max_Depth (m)"]),
    notes: normalizeUnknown(row.Notes),
    imageAuthor,
    collectionDateRaw: dateBits.collectionDateRaw,
    parsedYear: dateBits.parsedYear,
    parsedMonth: dateBits.parsedMonth,
    parsedDay: dateBits.parsedDay,
    datePrecision: dateBits.datePrecision,
    dateQualifier: dateBits.dateQualifier,
    searchText: buildSearchText({
      register: normalizeUnknown(row.Register),
      oid: normalizeUnknown(row.OID_),
      taxonomy,
      location,
      collectorName,
      identifierName,
      donorCollection: normalizeUnknown(row["Donor / Collection"]),
      typeStatus: normalizeUnknown(row.Type),
      notes: normalizeUnknown(row.Notes),
      references,
    }),
    rawData: row,
  };

  return {
    importKey,
    importKeySource,
    record,
    taxonomy,
    location,
    collectorName,
    identifierName,
    images,
    references,
    issues: issues.map((issue) => ({ ...issue, rowNumber, importKey })),
  };
}
