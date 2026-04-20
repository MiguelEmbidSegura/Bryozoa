import { useState } from 'react'

import {
  DETAIL_GROUPS,
  copyRecordToClipboard,
  hasRenderableImage,
  type CatalogItem,
} from '../lib/catalog'

type RecordSpotlightProps = {
  record: CatalogItem | null
}

export function RecordSpotlight({ record }: RecordSpotlightProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  if (!record) {
    return (
      <section className="spotlight-card glass-panel placeholder-spotlight">
        <p className="panel-eyebrow">Visible a un clic</p>
        <h2>Selecciona un registro desde el mapa o el listado</h2>
        <p>
          La ficha destacada aparece aqui sin cambiar de pantalla: taxonomia,
          ubicacion, referencias y, si estan disponibles para navegador, tambien
          sus imagenes.
        </p>
      </section>
    )
  }

  const canRenderImage = hasRenderableImage(record)

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
            <span>{record.hasImages ? 'Fotos detectadas' : 'Sin fotos'}</span>
            {record.hasImages ? (
              <small>
                Hay referencias de imagen, pero solo se muestran URLs accesibles
                desde el navegador.
              </small>
            ) : (
              <small>Este registro no tiene imagenes asociadas.</small>
            )}
          </div>
        )}
      </div>

      <div className="spotlight-content">
        <div className="spotlight-header">
          <div>
            <p className="panel-eyebrow">Visible a un clic</p>
            <h2>{record.title}</h2>
            <p className="spotlight-subtitle">{record.subtitle}</p>
          </div>

          <div className="badge-row">
            <span className="pill">{record.record.Family}</span>
            <span className={`pill ${record.hasImages ? 'pill-photo' : 'pill-muted'}`}>
              {record.hasImages ? 'Con fotos' : 'Sin fotos'}
            </span>
            <span className={`pill ${record.hasCoordinates ? 'pill-map' : 'pill-muted'}`}>
              {record.hasCoordinates ? 'Georreferenciado' : 'Sin coordenadas'}
            </span>
          </div>
        </div>

        <div className="spotlight-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              copyRecordToClipboard(record)
                .then(() => setCopyState('copied'))
                .catch(() => setCopyState('error'))
              window.setTimeout(() => setCopyState('idle'), 1800)
            }}
          >
            {copyState === 'copied'
              ? 'Copiado'
              : copyState === 'error'
                ? 'No se pudo copiar'
                : 'Copiar ficha'}
          </button>
        </div>

        <div className="spotlight-groups">
          {DETAIL_GROUPS.map((group) => (
            <article key={group.title} className="detail-group-card">
              <h3>{group.title}</h3>
              <dl>
                {group.fields
                  .filter((field) => record.record[field] && record.record[field] !== 'N/A')
                  .map((field) => (
                    <div key={field} className="detail-row">
                      <dt>{field}</dt>
                      <dd>{record.record[field]}</dd>
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
