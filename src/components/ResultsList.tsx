import {
  RESULTS_PER_PAGE,
  formatBadgeCount,
  hasTaxonTitle,
  type CatalogItem,
} from '../lib/catalog'
import { getFieldLabel, getUiText, type SupportedLocale } from '../lib/i18n'

type ResultsListProps = {
  locale: SupportedLocale
  records: CatalogItem[]
  selectedRecordId: string
  page: number
  onPageChange: (page: number) => void
  onSelectRecord: (recordId: string) => void
}

export function ResultsList({
  locale,
  records,
  selectedRecordId,
  page,
  onPageChange,
  onSelectRecord,
}: ResultsListProps) {
  const ui = getUiText(locale)
  const totalPages = Math.max(1, Math.ceil(records.length / RESULTS_PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * RESULTS_PER_PAGE
  const pageItems = records.slice(pageStart, pageStart + RESULTS_PER_PAGE)

  return (
    <section className="results-shell">
      <div className="results-header">
        <div>
          <p className="panel-eyebrow">{ui.secondaryList}</p>
          <h2>{ui.visibleRecords}</h2>
        </div>
        <div className="results-meta">
          <span className="metric-chip">
            {formatBadgeCount(records.length)} {ui.visibleCount}
          </span>
          <span className="metric-chip">
            {formatBadgeCount(totalPages)} {ui.pages}
          </span>
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
            <h3 className={hasTaxonTitle(record) ? 'result-title-italic' : undefined}>
              {record.title}
            </h3>
            <p className="result-subtitle">{record.record.Family}</p>
            <dl className="result-facts">
              <div>
                <dt>{getFieldLabel(locale, 'Country')}</dt>
                <dd>{record.record.Country}</dd>
              </div>
              <div>
                <dt>{getFieldLabel(locale, 'Site')}</dt>
                <dd>{record.record.Site}</dd>
              </div>
              <div>
                <dt>{getFieldLabel(locale, 'Collection_date')}</dt>
                <dd>{record.record.Collection_date}</dd>
              </div>
            </dl>
            <div className="badge-row">
              <span className={`pill ${record.hasImages ? 'pill-photo' : 'pill-muted'}`}>
                {record.hasImages ? ui.photos : ui.noPhotos}
              </span>
              <span className={`pill ${record.hasCoordinates ? 'pill-map' : 'pill-muted'}`}>
                {record.hasCoordinates ? ui.map : ui.noMap}
              </span>
              <span className={`pill ${record.hasReferences ? '' : 'pill-muted'}`}>
                {record.hasReferences ? ui.refsShort : ui.noRefs}
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
            {ui.previous}
          </button>
          <span>
            {ui.page} {safePage} {ui.of} {totalPages}
          </span>
          <button
            className="ghost-button"
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
          >
            {ui.next}
          </button>
        </div>
      ) : null}
    </section>
  )
}
