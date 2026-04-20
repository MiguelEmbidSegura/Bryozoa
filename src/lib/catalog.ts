export const APP_TITLE = 'Catalogo de Briozoos'
export const APP_SUBTITLE = 'Atlas web de la coleccion Consuelo Sendino'
export const RESULTS_PER_PAGE = 18

export const KNOWN_FIELDS = [
  'OID_',
  'Register',
  'Stratigrap',
  'Class',
  'Order',
  'Family',
  'Taxon',
  'Taxon_author',
  'Verbatim ID',
  'Type',
  'Cited_figu',
  'Site',
  'Min_Depth (m)',
  'Max_Depth (m)',
  'Province/County/District',
  'Community/Region',
  'Country',
  'Continent_Plate',
  'Water body',
  'Ocean_Sea',
  'Latitude',
  'Longitude',
  'Radius (km)',
  'Collection_date',
  'Date Qualifyer',
  'Collector/Recorder',
  'Donor/Colection',
  'Identifie',
  'Number_of_',
  'Notes',
  'Reference1',
  'Reference2',
  'Reference3',
  'Reference4',
  ...Array.from({ length: 17 }, (_, index) => `Image${index + 1}`),
  'Image_auth',
] as const

export const IMAGE_FIELDS = Array.from({ length: 17 }, (_, index) => `Image${index + 1}`)
export const REFERENCE_FIELDS = Array.from(
  { length: 4 },
  (_, index) => `Reference${index + 1}`,
)

export const DETAIL_GROUPS = [
  {
    title: 'Taxonomia',
    fields: [
      'Stratigrap',
      'Class',
      'Order',
      'Family',
      'Taxon',
      'Taxon_author',
      'Verbatim ID',
      'Type',
    ],
  },
  {
    title: 'Origen y localizacion',
    fields: [
      'Site',
      'Province/County/District',
      'Community/Region',
      'Country',
      'Continent_Plate',
      'Water body',
      'Ocean_Sea',
      'Latitude',
      'Longitude',
      'Radius (km)',
      'Min_Depth (m)',
      'Max_Depth (m)',
    ],
  },
  {
    title: 'Recoleccion y determinacion',
    fields: [
      'Collection_date',
      'Date Qualifyer',
      'Collector/Recorder',
      'Donor/Colection',
      'Identifie',
      'Number_of_',
    ],
  },
  {
    title: 'Referencias y notas',
    fields: [
      'Notes',
      'Reference1',
      'Reference2',
      'Reference3',
      'Reference4',
      'Cited_figu',
    ],
  },
] as const

const DISPLAY_MISSING = 'N/A'
const MISSING_TOKENS = new Set(['', 'n/a', 'na', 'none', 'null', 'nan', '-', '--'])
const COLUMN_NAME_ALIASES: Record<string, string> = {
  Order_: 'Order',
  Cited_Figu: 'Cited_figu',
  Longitud: 'Longitude',
  'Date Qualifier': 'Date Qualifyer',
  'Donor / Collection': 'Donor/Colection',
  Indentifie: 'Identifie',
}

export type CatalogRecord = Record<string, string>

export type PresenceFilter = 'all' | 'with' | 'without'

export type FilterState = {
  search: string
  country: string
  family: string
  type: string
  taxonClass: string
  order: string
  photos: PresenceFilter
  coordinates: PresenceFilter
  references: PresenceFilter
  ignoreAccents: boolean
}

export type CatalogItem = {
  id: string
  record: CatalogRecord
  title: string
  subtitle: string
  latitude: number | null
  longitude: number | null
  radiusKm: number | null
  hasImages: boolean
  hasReferences: boolean
  hasCoordinates: boolean
  imageSources: string[]
  previewImageUrl: string | null
  searchBlobRelaxed: string
  searchBlobStrict: string
  countryKey: string
  familyKey: string
  typeKey: string
  classKey: string
  orderKey: string
}

export type CatalogDataset = {
  sourceLabel: string
  records: CatalogItem[]
  warnings: string[]
  comboValues: {
    countries: string[]
    families: string[]
    types: string[]
    classNames: string[]
    orders: string[]
  }
}

export const DEFAULT_FILTERS: FilterState = {
  search: '',
  country: '',
  family: '',
  type: '',
  taxonClass: '',
  order: '',
  photos: 'all',
  coordinates: 'all',
  references: 'all',
  ignoreAccents: true,
}

export async function loadCatalogFromFile(file: File): Promise<CatalogDataset> {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (extension === 'json') {
    const payload = JSON.parse(await file.text()) as unknown
    return buildDataset(file.name, normalizeJsonPayload(payload))
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const buffer = await file.arrayBuffer()
    return buildDataset(file.name, await parseSpreadsheet(buffer))
  }

  throw new Error('Formato no soportado. Usa JSON, XLSX o XLS.')
}

export async function loadCatalogFromUrl(url: string): Promise<CatalogDataset> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`No se pudo descargar la muestra (${response.status}).`)
  }

  if (url.toLowerCase().endsWith('.json')) {
    return buildDataset(
      url.split('/').pop() ?? 'muestra.json',
      normalizeJsonPayload(await response.json()),
    )
  }

  const buffer = await response.arrayBuffer()
  return buildDataset(
    url.split('/').pop() ?? 'muestra.xlsx',
    await parseSpreadsheet(buffer),
  )
}

export function applyFilters(
  records: CatalogItem[],
  filters: FilterState,
): CatalogItem[] {
  const relaxed = filters.ignoreAccents
  const searchTokens = tokenize(filters.search, relaxed)
  const countryKey = filters.country ? normalizeText(filters.country, relaxed) : ''
  const familyKey = filters.family ? normalizeText(filters.family, relaxed) : ''
  const typeKey = filters.type ? normalizeText(filters.type, relaxed) : ''
  const classKey = filters.taxonClass ? normalizeText(filters.taxonClass, relaxed) : ''
  const orderKey = filters.order ? normalizeText(filters.order, relaxed) : ''

  return records.filter((record) => {
    if (!matchesPresence(record.hasImages, filters.photos)) {
      return false
    }
    if (!matchesPresence(record.hasCoordinates, filters.coordinates)) {
      return false
    }
    if (!matchesPresence(record.hasReferences, filters.references)) {
      return false
    }
    if (countryKey && record.countryKey !== countryKey) {
      return false
    }
    if (familyKey && record.familyKey !== familyKey) {
      return false
    }
    if (typeKey && record.typeKey !== typeKey) {
      return false
    }
    if (classKey && record.classKey !== classKey) {
      return false
    }
    if (orderKey && record.orderKey !== orderKey) {
      return false
    }

    const searchBlob = relaxed ? record.searchBlobRelaxed : record.searchBlobStrict
    return searchTokens.every((token) => searchBlob.includes(token))
  })
}

export function makeExportPayload(records: CatalogItem[]): CatalogRecord[] {
  return records.map((item) => item.record)
}

export function hasRenderableImage(record: CatalogItem): boolean {
  return Boolean(record.previewImageUrl)
}

export function copyRecordToClipboard(record: CatalogItem): Promise<void> {
  const lines = Object.entries(record.record).map(([key, value]) => `${key}: ${value}`)
  return navigator.clipboard.writeText(lines.join('\n'))
}

export function formatBadgeCount(value: number): string {
  return new Intl.NumberFormat('es-ES').format(value)
}

function buildDataset(sourceLabel: string, rawPayload: unknown): CatalogDataset {
  const normalizedPayload = normalizePayload(rawPayload)
  const rawRecords = normalizedPayload.records
  if (!rawRecords.length) {
    throw new Error('El archivo no contiene registros.')
  }

  const warnings = [...normalizedPayload.warnings]
  const extraColumns: string[] = []

  for (const rawRecord of rawRecords) {
    for (const key of Object.keys(rawRecord)) {
      if (!KNOWN_FIELDS.includes(key as (typeof KNOWN_FIELDS)[number]) && !extraColumns.includes(key)) {
        extraColumns.push(key)
      }
    }
  }

  const orderedColumns = [...KNOWN_FIELDS, ...extraColumns]
  const orderedRecords = rawRecords.map((rawRecord, index) => {
    const record: CatalogRecord = {}

    for (const field of KNOWN_FIELDS) {
      if (!(field in rawRecord)) {
        const message = `Falta la columna opcional '${field}'. Se rellena como N/A.`
        if (!warnings.includes(message)) {
          warnings.push(message)
        }
      }
    }

    for (const field of orderedColumns) {
      record[field] = cleanDisplayValue(rawRecord[field])
    }

    if (isMissing(record.OID_)) {
      record.OID_ = String(index + 1)
    }

    return record
  })

  const records = orderedRecords.map((record) => enrichRecord(record))

  return {
    sourceLabel,
    records,
    warnings: dedupeWarnings(warnings),
    comboValues: {
      countries: buildComboValues(orderedRecords, 'Country'),
      families: buildComboValues(orderedRecords, 'Family'),
      types: buildComboValues(orderedRecords, 'Type'),
      classNames: buildComboValues(orderedRecords, 'Class'),
      orders: buildComboValues(orderedRecords, 'Order'),
    },
  }
}

function normalizePayload(rawPayload: unknown): { records: CatalogRecord[]; warnings: string[] } {
  if (
    rawPayload &&
    typeof rawPayload === 'object' &&
    'records' in rawPayload &&
    Array.isArray((rawPayload as { records?: unknown }).records)
  ) {
    const payload = rawPayload as { records: unknown; warnings?: unknown }
    return {
      records: normalizeInputRecords(payload.records),
      warnings: Array.isArray(payload.warnings)
        ? payload.warnings.filter((warning): warning is string => typeof warning === 'string')
        : [],
    }
  }

  return {
    records: normalizeInputRecords(rawPayload),
    warnings: [],
  }
}

function normalizeInputRecords(rawPayload: unknown): CatalogRecord[] {
  if (!Array.isArray(rawPayload)) {
    throw new Error('El fichero debe contener una lista de registros.')
  }

  return rawPayload
    .filter((value): value is Record<string, unknown> => Boolean(value) && typeof value === 'object')
    .map((rawRecord) => normalizeRecordObject(rawRecord))
}

function normalizeJsonPayload(payload: unknown): CatalogRecord[] {
  return normalizeInputRecords(payload)
}

async function parseSpreadsheet(
  buffer: ArrayBuffer,
): Promise<{ records: CatalogRecord[]; warnings: string[] }> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'array', dense: false })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const reference = firstSheet['!ref']

  if (!reference) {
    return { records: [], warnings: [] }
  }

  const decoded = XLSX.utils.decode_range(reference)
  let lastHeaderColumn = 0

  for (let column = 0; column <= decoded.e.c; column += 1) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: column })
    const cellValue = firstSheet[cellRef]?.v
    if (!isMissing(cellValue)) {
      lastHeaderColumn = column + 1
    }
  }

  if (!lastHeaderColumn) {
    return { records: [], warnings: [] }
  }

  const trimmedRange = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: decoded.e.r, c: lastHeaderColumn - 1 },
  })

  const rows = XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    range: trimmedRange,
    raw: false,
    defval: null,
    blankrows: false,
  }) as unknown[][]

  if (!rows.length) {
    return { records: [], warnings: [] }
  }

  const headerRow = trimTrailingEmptyCells(rows[0] ?? [])
  const [headers, headerWarnings] = normalizeHeaders(headerRow)

  const records: CatalogRecord[] = []

  for (const rawRow of rows.slice(1)) {
    const values = Array.isArray(rawRow) ? rawRow.slice(0, headers.length) : []
    while (values.length < headers.length) {
      values.push(null)
    }

    const record: CatalogRecord = {}
    headers.forEach((header, index) => {
      record[header] = cleanDisplayValue(values[index])
    })

    if (Object.values(record).some((value) => !isMissing(value))) {
      records.push(record)
    }
  }

  return {
    records: normalizeInputRecords(records),
    warnings: headerWarnings,
  }
}

function normalizeRecordObject(rawRecord: Record<string, unknown>): CatalogRecord {
  const normalized: CatalogRecord = {}
  const extraKeys: string[] = []

  for (const [rawKey, rawValue] of Object.entries(rawRecord)) {
    const key = canonicalizeColumnName(rawKey)
    if (!key) {
      continue
    }
    if (!KNOWN_FIELDS.includes(key as (typeof KNOWN_FIELDS)[number]) && !extraKeys.includes(key)) {
      extraKeys.push(key)
    }
    normalized[key] = cleanDisplayValue(rawValue)
  }

  for (const field of KNOWN_FIELDS) {
    if (!(field in normalized)) {
      normalized[field] = DISPLAY_MISSING
    }
  }

  if (isMissing(normalized.OID_)) {
    normalized.OID_ = DISPLAY_MISSING
  }

  return normalized
}

function normalizeHeaders(rawHeaders: unknown[]): [string[], string[]] {
  const cleanedHeaders = rawHeaders.map((value, index) => {
    const cleaned = canonicalizeColumnName(value)
    return cleaned || `Column_${index + 1}`
  })

  return makeUniqueColumnNames(cleanedHeaders)
}

function trimTrailingEmptyCells(rawValues: unknown[]): unknown[] {
  let lastUsedPosition = -1

  for (let index = 0; index < rawValues.length; index += 1) {
    if (!isMissing(rawValues[index])) {
      lastUsedPosition = index
    }
  }

  return lastUsedPosition >= 0 ? rawValues.slice(0, lastUsedPosition + 1) : []
}

function makeUniqueColumnNames(columns: string[]): [string[], string[]] {
  const uniqueColumns: string[] = []
  const duplicateCounts = new Map<string, number>()
  const seenCounts = new Map<string, number>()

  for (let index = 0; index < columns.length; index += 1) {
    const baseName = canonicalizeColumnName(columns[index]) || `Column_${index + 1}`
    const nextCount = (seenCounts.get(baseName) ?? 0) + 1
    seenCounts.set(baseName, nextCount)

    if (nextCount === 1) {
      uniqueColumns.push(baseName)
      continue
    }

    duplicateCounts.set(baseName, nextCount)
    uniqueColumns.push(`${baseName}__${nextCount}`)
  }

  const warnings = Array.from(duplicateCounts.entries()).map(
    ([column, count]) =>
      `Se detectaron ${count} columnas con el encabezado '${column}'. Las adicionales se renombraron automaticamente con sufijos '__N'.`,
  )

  return [uniqueColumns, warnings]
}

function enrichRecord(record: CatalogRecord): CatalogItem {
  const imageSources = IMAGE_FIELDS.map((field) => cleanDisplayValue(record[field])).filter(
    (value) => !isMissing(value),
  )
  const previewImageUrl = resolvePreviewImageUrl(imageSources)
  const hasImages = imageSources.length > 0
  const hasReferences = REFERENCE_FIELDS.some((field) => !isMissing(record[field]))
  const latitude = toFloat(record.Latitude)
  const longitude = toFloat(record.Longitude)
  const radiusKm = toFloat(record['Radius (km)'])
  const hasCoordinates = latitude !== null && longitude !== null

  return {
    id: record.OID_,
    record,
    title: !isMissing(record.Taxon) ? record.Taxon : cleanDisplayValue(record.Register),
    subtitle: `${cleanDisplayValue(record.Register)} | OID ${cleanDisplayValue(record.OID_)}`,
    latitude,
    longitude,
    radiusKm,
    hasImages,
    hasReferences,
    hasCoordinates,
    imageSources,
    previewImageUrl,
    searchBlobRelaxed: buildSearchBlob(record, true),
    searchBlobStrict: buildSearchBlob(record, false),
    countryKey: normalizeText(record.Country, true),
    familyKey: normalizeText(record.Family, true),
    typeKey: normalizeText(record.Type, true),
    classKey: normalizeText(record.Class, true),
    orderKey: normalizeText(record.Order, true),
  }
}

function buildSearchBlob(record: CatalogRecord, ignoreAccents: boolean): string {
  return Object.values(record)
    .filter((value) => !isMissing(value))
    .map((value) => normalizeText(value, ignoreAccents))
    .join(' ')
}

function buildComboValues(records: CatalogRecord[], field: string): string[] {
  const values = new Set<string>()

  for (const record of records) {
    const value = cleanDisplayValue(record[field])
    if (!isMissing(value)) {
      values.add(value)
    }
  }

  return Array.from(values).sort((left, right) =>
    normalizeText(left, true).localeCompare(normalizeText(right, true), 'es'),
  )
}

function matchesPresence(value: boolean, filter: PresenceFilter): boolean {
  if (filter === 'all') {
    return true
  }
  if (filter === 'with') {
    return value
  }
  return !value
}

function tokenize(value: string, ignoreAccents: boolean): string[] {
  return normalizeText(value, ignoreAccents)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

function canonicalizeColumnName(value: unknown): string {
  const cleaned = cleanColumnName(value)
  return COLUMN_NAME_ALIASES[cleaned] ?? cleaned
}

function cleanColumnName(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
}

function cleanDisplayValue(value: unknown): string {
  if (isMissing(value)) {
    return DISPLAY_MISSING
  }

  return String(value)
    .trim()
    .replace(/\s+/g, ' ')
}

function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true
  }

  if (typeof value === 'number' && Number.isNaN(value)) {
    return true
  }

  return MISSING_TOKENS.has(String(value).trim().toLowerCase())
}

function normalizeText(value: unknown, ignoreAccents: boolean): string {
  if (isMissing(value)) {
    return ''
  }

  const cleaned = cleanDisplayValue(value)
  const normalized = ignoreAccents
    ? cleaned.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    : cleaned

  return normalized.toLowerCase()
}

function toFloat(value: unknown): number | null {
  if (isMissing(value)) {
    return null
  }

  const parsed = Number.parseFloat(String(value).trim().replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function resolvePreviewImageUrl(imageSources: string[]): string | null {
  for (const imageSource of imageSources) {
    const trimmed = imageSource.trim()
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed
    }
    if (/^[a-zA-Z]:[\\/]/.test(trimmed) || trimmed.startsWith('\\\\')) {
      continue
    }
    return encodeURI(trimmed.replace(/\\/g, '/'))
  }

  return null
}

function dedupeWarnings(warnings: string[]): string[] {
  return Array.from(new Set(warnings))
}
