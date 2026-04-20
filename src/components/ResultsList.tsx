import {
  RESULTS_PER_PAGE,
  formatBadgeCount,
  type CatalogItem,
} from '../lib/catalog'

type ResultsListProps = {
  records: CatalogItem[]
  selectedRecordId: string
  page: number
  onPageChange: (page: number) => void
  onSelectRecord: (recordId: string) => void
}

export function ResultsList({
  records,
  selectedRecordId,
  page,
  onPageChange,
  onSelectRecord,
}: ResultsListProps) {
  const totalPages = Math.max(1, Math.ceil(records.length / RESULTS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * RESULTS_PER_PAGE
  const pageItems = records.slice(pageStart, pageStart + RESULTS_PER_PAGE)

  return (
    <section className="results-shell">
      <div className="results-header">
        <div>
          <p className="panel-eyebrow">Listado secundario</p>
          <h2>Registros visibles</h2>
          <p>
            El mapa manda; el listado queda debajo para navegar, comparar y abrir
            la misma ficha con un clic.
          </p>
        </div>
        <div className="results-meta">
          <span className="metric-chip">{formatBadgeCount(records.length)} visibles</span>
          <span className="metric-chip">{formatBadgeCount(totalPages)} paginas</span>
        </div>
      </div>

      <div className="results-grid">
        {pageItems.map((record) => (
          <button
            key={record.id}
            className={`result-card ${record.id === selectedRecordId ? 'is-selected' : ''}`}
            type="button"
            onClick={() => onSelectRecord(record.id)}
          >
            <div className="result-card-top">
              <span className="result-kicker">{record.record.Register}</span>
              <span className={`record-dot ${record.hasImages ? 'has-photo' : 'no-photo'}`} />
            </div>
            <h3>{record.title}</h3>
            <p className="result-subtitle">{record.record.Family}</p>
            <dl className="result-facts">
              <div>
                <dt>Pais</dt>
                <dd>{record.record.Country}</dd>
              </div>
              <div>
                <dt>Site</dt>
                <dd>{record.record.Site}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{record.record.Collection_date}</dd>
              </div>
            </dl>
            <div className="badge-row">
              <span className={`pill ${record.hasImages ? 'pill-photo' : 'pill-muted'}`}>
                {record.hasImages ? 'Fotos' : 'Sin fotos'}
              </span>
              <span className={`pill ${record.hasCoordinates ? 'pill-map' : 'pill-muted'}`}>
                {record.hasCoordinates ? 'Mapa' : 'Sin mapa'}
              </span>
              <span className={`pill ${record.hasReferences ? '' : 'pill-muted'}`}>
                {record.hasReferences ? 'Referencias' : 'Sin refs'}
              </span>
            </div>
          </button>
        ))}
      </div>

      {totalPages > 1 ? (
        <div className="pagination">
          <button
            className="ghost-button"
            type="button"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
          >
            Anterior
          </button>
          <span>
            Pagina {safePage} de {totalPages}
          </span>
          <button
            className="ghost-button"
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </section>
  )
}
