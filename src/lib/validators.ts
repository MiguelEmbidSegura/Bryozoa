import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const booleanFromQuery = z.preprocess((value) => {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  return ["1", "true", "on", "yes"].includes(value.toLowerCase());
}, z.boolean().optional());

const numberFromQuery = z.preprocess((value) => {
  if (typeof value === "number") return value;
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}, z.number().optional());

export const explorerFiltersSchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().optional()),
  taxClass: z.preprocess(emptyToUndefined, z.string().optional()),
  taxOrder: z.preprocess(emptyToUndefined, z.string().optional()),
  family: z.preprocess(emptyToUndefined, z.string().optional()),
  taxon: z.preprocess(emptyToUndefined, z.string().optional()),
  typeStatus: z.preprocess(emptyToUndefined, z.string().optional()),
  siteName: z.preprocess(emptyToUndefined, z.string().optional()),
  country: z.preprocess(emptyToUndefined, z.string().optional()),
  region: z.preprocess(emptyToUndefined, z.string().optional()),
  waterBody: z.preprocess(emptyToUndefined, z.string().optional()),
  oceanSea: z.preprocess(emptyToUndefined, z.string().optional()),
  collector: z.preprocess(emptyToUndefined, z.string().optional()),
  identifiedBy: z.preprocess(emptyToUndefined, z.string().optional()),
  yearFrom: numberFromQuery,
  yearTo: numberFromQuery,
  hasImages: booleanFromQuery,
  hasCoordinates: booleanFromQuery,
  page: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length > 0 ? Number(value) : 1),
    z.number().int().min(1).default(1),
  ),
  pageSize: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length > 0 ? Number(value) : 24),
    z.number().int().min(1).max(100).default(24),
  ),
  view: z.enum(["table", "cards"]).default("table"),
  sort: z
    .enum(["register", "taxon", "country", "date", "type"])
    .default("register"),
  minLat: numberFromQuery,
  maxLat: numberFromQuery,
  minLng: numberFromQuery,
  maxLng: numberFromQuery,
  radiusLat: numberFromQuery,
  radiusLng: numberFromQuery,
  radiusKm: numberFromQuery,
});

export type ExplorerFilters = z.infer<typeof explorerFiltersSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const referenceFormSchema = z.object({
  position: z.number().int().min(1),
  citation: z.string().min(1),
});

export const imageFormSchema = z.object({
  position: z.number().int().min(1),
  originalValue: z.string().min(1),
});

export const recordFormSchema = z.object({
  id: z.string().optional(),
  oid: z.string().optional(),
  register: z.string().optional(),
  stratigraphy: z.string().optional(),
  taxClass: z.string().optional(),
  taxOrder: z.string().optional(),
  family: z.string().optional(),
  taxon: z.string().optional(),
  taxonAuthor: z.string().optional(),
  verbatimIdentification: z.string().optional(),
  typeStatus: z.string().optional(),
  citedFigure: z.string().optional(),
  siteName: z.string().optional(),
  minDepthMRaw: z.string().optional(),
  maxDepthMRaw: z.string().optional(),
  provinceOrDistrict: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  continentOrPlate: z.string().optional(),
  waterBody: z.string().optional(),
  oceanSea: z.string().optional(),
  latitudeRaw: z.string().optional(),
  longitudeRaw: z.string().optional(),
  radiusKmRaw: z.string().optional(),
  collectionDateRaw: z.string().optional(),
  dateQualifier: z.string().optional(),
  collectorRecorderRaw: z.string().optional(),
  donorCollection: z.string().optional(),
  identifiedByRaw: z.string().optional(),
  specimenCountRaw: z.string().optional(),
  notes: z.string().optional(),
  imageAuthor: z.string().optional(),
  images: z.array(imageFormSchema).default([]),
  references: z.array(referenceFormSchema).default([]),
  archived: z.boolean().default(false),
});

export type RecordFormInput = z.input<typeof recordFormSchema>;
export type RecordFormValues = z.output<typeof recordFormSchema>;

export const userFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  isActive: z.boolean().default(true),
  role: z.enum(["ADMIN", "EDITOR"]).default("EDITOR"),
});

export type UserFormInput = z.input<typeof userFormSchema>;
export type UserFormValues = z.output<typeof userFormSchema>;

export function parseExplorerFilters(
  input: Record<string, string | string[] | undefined> | URLSearchParams,
) {
  const object =
    input instanceof URLSearchParams
      ? Object.fromEntries(input.entries())
      : Object.fromEntries(
          Object.entries(input).map(([key, value]) => [
            key,
            Array.isArray(value) ? value[0] : value,
          ]),
        );

  return explorerFiltersSchema.parse(object);
}
