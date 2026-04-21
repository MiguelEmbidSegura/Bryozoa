import { useState } from 'react'

import {
  DETAIL_GROUPS,
  copyRecordToClipboard,
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
  record: CatalogItem | null
}

export function RecordSpotlight({ locale, record }: RecordSpotlightProps) {
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
