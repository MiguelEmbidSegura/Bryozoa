import {
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
  APP_SUBTITLE,
  APP_TITLE,
  DEFAULT_FILTERS,
  applyFilters,
  formatBadgeCount,
  loadCatalogFromFile,
  loadCatalogFromUrl,
  makeExportPayload,
  type CatalogDataset,
  type FilterState,
} from './lib/catalog'

const SAMPLE_DATA_URL = 'data/ejemplo.json'

export default function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [catalog, setCatalog] = useState<CatalogDataset | null>(null)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [selectedRecordId, setSelectedRecordId] = useState('')
  const [page, setPage] = useState(1)
  const [loadingLabel, setLoadingLabel] = useState('Cargando muestra inicial...')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const deferredFilters = useDeferredValue(filters)

  useEffect(() => {
    void loadSampleData()
  }, [])

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

  let visibleWithCoordinates = 0
  let visibleWithImages = 0
  let visibleWithReferences = 0

  for (const record of filteredRecords) {
    if (record.hasCoordinates) visibleWithCoordinates += 1
    if (record.hasImages) visibleWithImages += 1
    if (record.hasReferences) visibleWithReferences += 1
  }

  async function loadSampleData() {
    setErrorMessage('')
    setLoadingLabel('Cargando muestra web...')
    setIsLoading(true)

    try {
      const dataset = await loadCatalogFromUrl(SAMPLE_DATA_URL)
      startTransition(() => {
        setCatalog(dataset)
        setFilters(DEFAULT_FILTERS)
        setSelectedRecordId('')
        setPage(1)
      })
    } catch (error) {
      setErrorMessage(extractErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setErrorMessage('')
    setLoadingLabel(`Procesando ${file.name}...`)
    setIsLoading(true)

    try {
      const dataset = await loadCatalogFromFile(file)
      startTransition(() => {
        setCatalog(dataset)
        setFilters(DEFAULT_FILTERS)
        setSelectedRecordId('')
        setPage(1)
      })
    } catch (error) {
      setErrorMessage(extractErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  function exportFilteredJson() {
    if (!filteredRecords.length) {
      return
    }

    const blob = new Blob([JSON.stringify(makeExportPayload(filteredRecords), null, 2)], {
      type: 'application/json;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'bryozoa_filtrado.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function handleFiltersChange(nextFilters: FilterState) {
    setPage(1)
    startTransition(() => {
      setFilters(nextFilters)
    })
  }

  return (
    <div className="app-shell">
      <input
        accept=".json,.xlsx,.xls"
        className="hidden-file-input"
        onChange={handleFileChange}
        ref={fileInputRef}
        type="file"
      />

      <header className="hero">
        <div className="hero-copy reveal-up">
          <p className="hero-kicker">Web moderna lista para hosting estatico</p>
          <h1>{APP_TITLE}</h1>
          <p className="hero-subtitle">{APP_SUBTITLE}</p>
          <p className="hero-text">
            La experiencia arranca en el mapa, no en la tabla. Carga tu fichero,
            filtra en vivo y abre la ficha destacada con un solo clic sobre cada
            punto o tarjeta.
          </p>
        </div>

        <div className="hero-panel glass-panel reveal-up reveal-delay-1">
          <div className="stat-grid">
            <article>
              <span>Total</span>
              <strong>{formatBadgeCount(catalog?.records.length ?? 0)}</strong>
            </article>
            <article>
              <span>Visibles</span>
              <strong>{formatBadgeCount(filteredRecords.length)}</strong>
            </article>
            <article>
              <span>Con mapa</span>
              <strong>{formatBadgeCount(visibleWithCoordinates)}</strong>
            </article>
            <article>
              <span>Con fotos</span>
              <strong>{formatBadgeCount(visibleWithImages)}</strong>
            </article>
          </div>

          <div className="hero-panel-footer">
            <span className="source-pill">
              Origen: {catalog?.sourceLabel ?? 'Sin datos'}
            </span>
            <span className="source-pill">
              Referencias visibles: {formatBadgeCount(visibleWithReferences)}
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
            onSelectRecord={setSelectedRecordId}
            records={filteredRecords}
            selectedRecordId={activeSelectedRecordId}
          />

          <div className="map-overlay map-overlay-left">
            <FiltersPanel
              dataset={catalog}
              disabled={!filteredRecords.length}
              filters={filters}
              onChange={handleFiltersChange}
              onExportJson={exportFilteredJson}
              onLoadSample={loadSampleData}
              onOpenFile={() => fileInputRef.current?.click()}
              onReset={() => handleFiltersChange(DEFAULT_FILTERS)}
            />
          </div>

          <div className="map-overlay map-overlay-right">
            <div className="legend-card glass-panel">
              <p className="panel-eyebrow">Leyenda</p>
              <div className="legend-row">
                <span className="legend-marker legend-marker-photo" />
                <span>Registros con fotos</span>
              </div>
              <div className="legend-row">
                <span className="legend-marker legend-marker-plain" />
                <span>Registros sin fotos</span>
              </div>
              <div className="legend-row">
                <span className="legend-marker legend-marker-cluster" />
                <span>Agrupaciones al alejar</span>
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
              <h2>Sin puntos visibles</h2>
              <p>Prueba a limpiar filtros o cargar otro fichero.</p>
            </div>
          ) : null}
        </div>
      </section>

      <RecordSpotlight record={selectedRecord} />

      <ResultsList
        onPageChange={setPage}
        onSelectRecord={setSelectedRecordId}
        page={page}
        records={filteredRecords}
        selectedRecordId={activeSelectedRecordId}
      />
    </div>
  )
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Se produjo un error inesperado al procesar los datos.'
}
