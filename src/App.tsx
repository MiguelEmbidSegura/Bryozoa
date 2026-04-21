import {
  useCallback,
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'

import { CatalogMap } from './components/CatalogMap'
import { FiltersPanel } from './components/FiltersPanel'
import { RecordSpotlight } from './components/RecordSpotlight'
import { ResultsList } from './components/ResultsList'
import {
  DEFAULT_FILTERS,
  applyFilters,
  formatBadgeCount,
  loadCatalogFromFile,
  loadCatalogFromUrl,
  makeExportPayload,
  type CatalogDataset,
  type FilterState,
} from './lib/catalog'
import {
  SUPPORTED_LANGUAGES,
  createCatalogMessages,
  formatProcessingLabel,
  getLanguageMeta,
  getUiText,
  type SupportedLocale,
} from './lib/i18n'

const SAMPLE_DATA_URL = 'data/ejemplo.json'

type DataSource =
  | { kind: 'url'; url: string }
  | { kind: 'file'; file: File }

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const activeSourceRef = useRef<DataSource | null>(null)
  const requestIdRef = useRef(0)

  const [catalog, setCatalog] = useState<CatalogDataset | null>(null)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [selectedRecordId, setSelectedRecordId] = useState('')
  const [page, setPage] = useState(1)
  const [locale, setLocale] = useState<SupportedLocale>('en')
  const [loadingLabel, setLoadingLabel] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const deferredFilters = useDeferredValue(filters)
  const ui = getUiText(locale)
  const languageMeta = getLanguageMeta(locale)

  useEffect(() => {
    document.documentElement.lang = languageMeta.htmlLang
    document.documentElement.dir = languageMeta.dir
    document.title = ui.appTitle
  }, [languageMeta, ui.appTitle])

  const filteredRecords = useMemo(() => {
    if (!catalog) {
      return []
    }

    return applyFilters(catalog.records, deferredFilters)
  }, [catalog, deferredFilters])

  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedRecordId) ??
    filteredRecords.find((record) => record.hasCoordinates) ??
    filteredRecords[0] ??
    null
  const activeSelectedRecordId = selectedRecord?.id ?? ''
  const sameLocationRecords = useMemo(() => {
    if (!selectedRecord?.hasCoordinates) {
      return selectedRecord ? [selectedRecord] : []
    }

    const locationKey = buildLocationKey(selectedRecord.latitude, selectedRecord.longitude)
    const matches = filteredRecords.filter(
      (record) =>
        record.hasCoordinates &&
        buildLocationKey(record.latitude, record.longitude) === locationKey,
    )

    if (!matches.length) {
      return [selectedRecord]
    }

    return [selectedRecord, ...matches.filter((record) => record.id !== selectedRecord.id)]
  }, [filteredRecords, selectedRecord])

  let visibleWithCoordinates = 0
  let visibleWithImages = 0
  let visibleWithReferences = 0

  for (const record of filteredRecords) {
    if (record.hasCoordinates) visibleWithCoordinates += 1
    if (record.hasImages) visibleWithImages += 1
    if (record.hasReferences) visibleWithReferences += 1
  }

  const loadFromSource = useCallback(async (
    source: DataSource,
    options: { resetView: boolean },
  ) => {
    activeSourceRef.current = source
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setErrorMessage('')
    setLoadingLabel(
      source.kind === 'url'
        ? ui.loadingSample
        : formatProcessingLabel(locale, source.file.name),
    )
    setIsLoading(true)

    try {
      const messages = createCatalogMessages(locale)
      const dataset =
        source.kind === 'url'
          ? await loadCatalogFromUrl(source.url, messages)
          : await loadCatalogFromFile(source.file, messages)

      if (requestId !== requestIdRef.current) {
        return
      }

      startTransition(() => {
        setCatalog(dataset)
        if (options.resetView) {
          setFilters(DEFAULT_FILTERS)
          setSelectedRecordId('')
          setPage(1)
        }
      })
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setErrorMessage(extractErrorMessage(error, ui.unexpectedError))
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [locale, ui.loadingSample, ui.unexpectedError])

  useEffect(() => {
    if (!activeSourceRef.current) {
      return
    }

    void loadFromSource(activeSourceRef.current, { resetView: false })
  }, [loadFromSource])

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    void loadFromSource({ kind: 'file', file }, { resetView: true })
  }

  async function exportFilteredExcel() {
    if (!filteredRecords.length) {
      return
    }

    try {
      const XLSX = await import('xlsx')
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(makeExportPayload(filteredRecords))
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Records')

      const buffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      })

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const fileName = buildExportFileName(catalog?.sourceLabel)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, ui.unexpectedError))
    }
  }

  function handleFiltersChange(nextFilters: FilterState) {
    setPage(1)
    startTransition(() => {
      setFilters(nextFilters)
    })
  }

  return (
    <div className="app-shell" dir={languageMeta.dir}>
      <input
        accept=".json,.xlsx,.xls"
        className="hidden-file-input"
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />

      <header className="hero">
        <div className="hero-copy reveal-up">
          <h1>{ui.appTitle}</h1>
          <p className="hero-byline">by CONSUELO SENDINO</p>
          <a className="hero-email" href="mailto:consuelo.sendino@gmail.com">
            consuelo.sendino@gmail.com
          </a>
        </div>

        <div className="hero-panel glass-panel reveal-up reveal-delay-1">
          <label className="field-group language-picker">
            <span>{ui.language}</span>
            <select
              className="field-select"
              value={locale}
              onChange={(event) => setLocale(event.target.value as SupportedLocale)}
            >
              {SUPPORTED_LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.nativeLabel}
                </option>
              ))}
            </select>
          </label>

          <div className="stat-grid">
            <article>
              <span>{ui.total}</span>
              <strong>{formatBadgeCount(catalog?.records.length ?? 0)}</strong>
            </article>
            <article>
              <span>{ui.visible}</span>
              <strong>{formatBadgeCount(filteredRecords.length)}</strong>
            </article>
            <article>
              <span>{ui.withMap}</span>
              <strong>{formatBadgeCount(visibleWithCoordinates)}</strong>
            </article>
            <article>
              <span>{ui.withPhotos}</span>
              <strong>{formatBadgeCount(visibleWithImages)}</strong>
            </article>
          </div>

          <div className="hero-panel-footer">
            <span className="source-pill">
              {ui.source}: {catalog?.sourceLabel ?? ui.noData}
            </span>
            <span className="source-pill">
              {ui.visibleReferences}: {formatBadgeCount(visibleWithReferences)}
            </span>
          </div>
        </div>
      </header>

      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      {catalog?.warnings.length ? (
        <section className="warning-strip">
          {catalog.warnings.slice(0, 6).map((warning) => (
            <span key={warning} className="warning-pill">
              {warning}
            </span>
          ))}
        </section>
      ) : null}

      <section className="map-stage reveal-up reveal-delay-2">
        <div className="map-frame">
          <CatalogMap
            datasetKey={catalog?.sourceLabel ?? ''}
            locale={locale}
            onSelectRecord={setSelectedRecordId}
            records={filteredRecords}
            selectedRecordId={activeSelectedRecordId}
          />

          <div className="map-overlay map-overlay-left">
            <FiltersPanel
              dataset={catalog}
              disabled={!filteredRecords.length}
              filters={filters}
              locale={locale}
              onChange={handleFiltersChange}
              onExportExcel={exportFilteredExcel}
              onLoadSample={() =>
                void loadFromSource({ kind: 'url', url: SAMPLE_DATA_URL }, { resetView: true })
              }
              onOpenFile={() => fileInputRef.current?.click()}
              onReset={() => handleFiltersChange(DEFAULT_FILTERS)}
            />
          </div>

          <div className="map-overlay map-overlay-right">
            <div className="legend-card glass-panel">
              <p className="panel-eyebrow">{ui.legend}</p>
              <div className="legend-row">
                <span className="legend-marker legend-marker-photo" />
                <span>{ui.recordsWithPhotos}</span>
              </div>
              <div className="legend-row">
                <span className="legend-marker legend-marker-plain" />
                <span>{ui.recordsWithoutPhotos}</span>
              </div>
              <div className="legend-row">
                <span className="legend-marker legend-marker-cluster" />
                <span>{ui.zoomOutClusters}</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="map-loading">
              <div className="loader-ring" />
              <span>{loadingLabel}</span>
            </div>
          ) : null}

          {!isLoading && !filteredRecords.length ? (
            <div className="map-empty">
              <h2>{ui.noVisiblePoints}</h2>
              <p>{ui.noVisiblePointsHelp}</p>
            </div>
          ) : null}
        </div>
      </section>

      <RecordSpotlight
        locale={locale}
        onSelectRecord={setSelectedRecordId}
        record={selectedRecord}
        sameLocationRecords={sameLocationRecords}
      />

      <ResultsList
        locale={locale}
        onPageChange={setPage}
        onSelectRecord={setSelectedRecordId}
        page={page}
        records={filteredRecords}
        selectedRecordId={activeSelectedRecordId}
      />
    </div>
  )
}

function extractErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error) {
    return error.message
  }

  return fallbackMessage
}

function buildLocationKey(latitude: number | null, longitude: number | null): string {
  return `${latitude ?? 'na'}|${longitude ?? 'na'}`
}

function buildExportFileName(sourceLabel?: string): string {
  const baseName = (sourceLabel ?? 'bryozoa_catalog')
    .replace(/\.[^.]+$/, '')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')

  return `${baseName || 'bryozoa_catalog'}_filtered.xlsx`
}
