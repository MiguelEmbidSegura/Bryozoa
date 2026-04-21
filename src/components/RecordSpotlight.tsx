import { useState } from 'react'

import {
  DETAIL_GROUPS,
  copyRecordToClipboard,
  formatBadgeCount,
  hasRenderableImage,
  hasTaxonTitle,
  isItalicField,
  type CatalogItem,
} from '../lib/catalog'
import {
  getDetailGroupLabel,
  getFieldLabel,
  getUiText,
  type SupportedLocale,
} from '../lib/i18n'

type RecordSpotlightProps = {
  locale: SupportedLocale
  onSelectRecord: (recordId: string) => void
  record: CatalogItem | null
  sameLocationRecords: CatalogItem[]
}

export function RecordSpotlight({
  locale,
  onSelectRecord,
  record,
  sameLocationRecords,
}: RecordSpotlightProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const ui = getUiText(locale)

  if (!record) {
    return (
      <section className="spotlight-card glass-panel placeholder-spotlight">
        <h2>{ui.selectRecordFromMap}</h2>
      </section>
    )
  }

  const canRenderImage = hasRenderableImage(record)
  const shouldItalicizeTitle = hasTaxonTitle(record)
  const hasLocationList = record.hasCoordinates && sameLocationRecords.length > 1
  const locationHeading =
    record.record.Site !== 'N/A'
      ? record.record.Site
      : `${getFieldLabel(locale, 'Latitude')} ${record.record.Latitude} · ${getFieldLabel(locale, 'Longitude')} ${record.record.Longitude}`

  return (
    <section className="spotlight-card glass-panel">
      <div className="spotlight-media">
        {canRenderImage ? (
          <img
            alt={record.title}
            className="spotlight-image"
            src={record.previewImageUrl ?? undefined}
          />
        ) : (
          <div className="spotlight-image placeholder-image">
            <span>{record.hasImages ? ui.photosDetected : ui.noPhotos}</span>
            {record.hasImages ? (
              <small>{ui.accessibleImageNotice}</small>
            ) : (
              <small>{ui.noImagesAvailable}</small>
            )}
          </div>
        )}
      </div>

      <div className="spotlight-content">
        <div className="spotlight-header">
          <div>
            <h2 className={shouldItalicizeTitle ? 'record-title-italic' : undefined}>
              {record.title}
            </h2>
            <p className="spotlight-subtitle">{record.subtitle}</p>
          </div>

          <div className="badge-row">
            <span className="pill">{record.record.Family}</span>
            <span className={`pill ${record.hasImages ? 'pill-photo' : 'pill-muted'}`}>
              {record.hasImages ? ui.photosDetected : ui.noPhotos}
            </span>
            <span className={`pill ${record.hasCoordinates ? 'pill-map' : 'pill-muted'}`}>
              {record.hasCoordinates ? ui.georeferenced : ui.noCoordinates}
            </span>
          </div>
        </div>

        <div className="spotlight-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              copyRecordToClipboard(record, (field) => getFieldLabel(locale, field))
                .then(() => setCopyState('copied'))
                .catch(() => setCopyState('error'))
              window.setTimeout(() => setCopyState('idle'), 1800)
            }}
          >
            {copyState === 'copied' ? ui.copied : copyState === 'error' ? ui.copyFailed : ui.copyRecord}
          </button>
        </div>

        {hasLocationList ? (
          <section className="spotlight-location-card">
            <div className="spotlight-location-header">
              <div>
                <h3>{locationHeading}</h3>
                <p className="spotlight-location-subtitle">
                  {getFieldLabel(locale, 'Latitude')}: {record.record.Latitude} · {getFieldLabel(locale, 'Longitude')}: {record.record.Longitude}
                </p>
              </div>
              <span className="metric-chip">
                {formatBadgeCount(sameLocationRecords.length)}
              </span>
            </div>

            <div className="spotlight-location-list">
              {sameLocationRecords.map((locationRecord) => (
                <button
                  key={locationRecord.id}
                  className={`spotlight-location-item ${locationRecord.id === record.id ? 'is-selected' : ''}`}
                  type="button"
                  onClick={() => onSelectRecord(locationRecord.id)}
                >
                  <div className="spotlight-location-item-top">
                    <span className="result-kicker">{locationRecord.record.Register}</span>
                    <span className={`record-dot ${locationRecord.hasImages ? 'has-photo' : 'no-photo'}`} />
                  </div>
                  <h4 className={hasTaxonTitle(locationRecord) ? 'result-title-italic' : undefined}>
                    {locationRecord.title}
                  </h4>
                  <p className="spotlight-location-item-subtitle">
                    {locationRecord.record.Family}
                  </p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <div className="spotlight-groups">
          {DETAIL_GROUPS.map((group) => (
            <article key={group.key} className="detail-group-card">
              <h3>{getDetailGroupLabel(locale, group.key)}</h3>
              <dl>
                {group.fields
                  .filter((field) => record.record[field] && record.record[field] !== 'N/A')
                  .map((field) => (
                    <div key={field} className="detail-row">
                      <dt className={isItalicField(field) ? 'detail-label-italic' : undefined}>
                        {getFieldLabel(locale, field)}
                      </dt>
                      <dd className={isItalicField(field) ? 'detail-value-italic' : undefined}>
                        {record.record[field]}
                      </dd>
                    </div>
                  ))}
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
