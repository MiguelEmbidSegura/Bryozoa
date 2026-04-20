import type { CatalogDataset, FilterState, PresenceFilter } from '../lib/catalog'

type FiltersPanelProps = {
  dataset: CatalogDataset | null
  filters: FilterState
  onChange: (nextFilters: FilterState) => void
  onReset: () => void
  onOpenFile: () => void
  onLoadSample: () => void
  onExportJson: () => void
  disabled: boolean
}

const PRESENCE_OPTIONS: Array<{ label: string; value: PresenceFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Con', value: 'with' },
  { label: 'Sin', value: 'without' },
]

export function FiltersPanel({
  dataset,
  filters,
  onChange,
  onReset,
  onOpenFile,
  onLoadSample,
  onExportJson,
  disabled,
}: FiltersPanelProps) {
  const comboValues = dataset?.comboValues

  return (
    <aside className="filters-panel glass-panel">
      <div className="filters-header">
        <p className="panel-eyebrow">Mapa primero</p>
        <h2>Busqueda y capas</h2>
        <p>
          El mapa es el centro de la interfaz. Haz clic en un punto o en una tarjeta
          del listado para ver la ficha completa.
        </p>
      </div>

      <div className="filters-actions">
        <button className="action-button" type="button" onClick={onOpenFile}>
          Cargar archivo
        </button>
        <button className="ghost-button" type="button" onClick={onLoadSample}>
          Abrir muestra
        </button>
      </div>

      <label className="field-group">
        <span>Busqueda global</span>
        <input
          className="field-input"
          type="search"
          placeholder="Taxon, registro, pais, notas..."
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
      </label>

      <div className="field-grid">
        <SelectField
          label="Pais"
          value={filters.country}
          options={comboValues?.countries ?? []}
          onChange={(value) => onChange({ ...filters, country: value })}
        />
        <SelectField
          label="Familia"
          value={filters.family}
          options={comboValues?.families ?? []}
          onChange={(value) => onChange({ ...filters, family: value })}
        />
        <SelectField
          label="Tipo"
          value={filters.type}
          options={comboValues?.types ?? []}
          onChange={(value) => onChange({ ...filters, type: value })}
        />
        <SelectField
          label="Clase"
          value={filters.taxonClass}
          options={comboValues?.classNames ?? []}
          onChange={(value) => onChange({ ...filters, taxonClass: value })}
        />
        <SelectField
          label="Orden"
          value={filters.order}
          options={comboValues?.orders ?? []}
          onChange={(value) => onChange({ ...filters, order: value })}
        />
      </div>

      <div className="toggle-grid">
        <PresenceField
          label="Fotos"
          value={filters.photos}
          onChange={(value) => onChange({ ...filters, photos: value })}
        />
        <PresenceField
          label="Coordenadas"
          value={filters.coordinates}
          onChange={(value) => onChange({ ...filters, coordinates: value })}
        />
        <PresenceField
          label="Referencias"
          value={filters.references}
          onChange={(value) => onChange({ ...filters, references: value })}
        />
      </div>

      <label className="check-row">
        <input
          type="checkbox"
          checked={filters.ignoreAccents}
          onChange={(event) =>
            onChange({ ...filters, ignoreAccents: event.target.checked })
          }
        />
        <span>Ignorar tildes al buscar</span>
      </label>

      <div className="filters-footer">
        <button className="ghost-button" type="button" onClick={onReset} disabled={disabled}>
          Limpiar filtros
        </button>
        <button className="export-button" type="button" onClick={onExportJson} disabled={disabled}>
          Exportar JSON filtrado
        </button>
      </div>
    </aside>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="field-group">
      <span>{label}</span>
      <select className="field-select" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function PresenceField({
  label,
  value,
  onChange,
}: {
  label: string
  value: PresenceFilter
  onChange: (value: PresenceFilter) => void
}) {
  return (
    <label className="field-group">
      <span>{label}</span>
      <select
        className="field-select"
        value={value}
        onChange={(event) => onChange(event.target.value as PresenceFilter)}
      >
        {PRESENCE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
