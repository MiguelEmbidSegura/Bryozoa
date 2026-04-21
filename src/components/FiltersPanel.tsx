import type { CatalogDataset, FilterState, PresenceFilter } from '../lib/catalog'
import { getUiText, type SupportedLocale } from '../lib/i18n'

type FiltersPanelProps = {
  dataset: CatalogDataset | null
  filters: FilterState
  onChange: (nextFilters: FilterState) => void
  onReset: () => void
  onOpenFile: () => void
  onExportExcel: () => void
  disabled: boolean
  locale: SupportedLocale
}

export function FiltersPanel({
  dataset,
  filters,
  onChange,
  onReset,
  onOpenFile,
  onExportExcel,
  disabled,
  locale,
}: FiltersPanelProps) {
  const comboValues = dataset?.comboValues
  const ui = getUiText(locale)
  const exportLabel = getExportLabel(locale)
  const presenceOptions: Array<{ label: string; value: PresenceFilter }> = [
    { label: ui.all, value: 'all' },
    { label: ui.with, value: 'with' },
    { label: ui.without, value: 'without' },
  ]

  return (
    <aside className="filters-panel glass-panel">
      <div className="filters-actions">
        <button className="action-button" type="button" onClick={onOpenFile}>
          {ui.loadFile}
        </button>
      </div>

      <label className="field-group">
        <span>{ui.globalSearch}</span>
        <input
          className="field-input"
          type="search"
          placeholder={ui.globalSearchPlaceholder}
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
      </label>

      <div className="field-grid">
        <SelectField
          emptyLabel={ui.all}
          label={ui.country}
          value={filters.country}
          options={comboValues?.countries ?? []}
          onChange={(value) => onChange({ ...filters, country: value })}
        />
        <SelectField
          emptyLabel={ui.all}
          label={ui.family}
          value={filters.family}
          options={comboValues?.families ?? []}
          onChange={(value) => onChange({ ...filters, family: value })}
        />
        <SelectField
          emptyLabel={ui.all}
          label={ui.type}
          value={filters.type}
          options={comboValues?.types ?? []}
          onChange={(value) => onChange({ ...filters, type: value })}
        />
        <SelectField
          emptyLabel={ui.all}
          label={ui.taxonClass}
          value={filters.taxonClass}
          options={comboValues?.classNames ?? []}
          onChange={(value) => onChange({ ...filters, taxonClass: value })}
        />
        <SelectField
          emptyLabel={ui.all}
          label={ui.order}
          value={filters.order}
          options={comboValues?.orders ?? []}
          onChange={(value) => onChange({ ...filters, order: value })}
        />
      </div>

      <div className="toggle-grid">
        <PresenceField
          label={ui.photos}
          options={presenceOptions}
          value={filters.photos}
          onChange={(value) => onChange({ ...filters, photos: value })}
        />
        <PresenceField
          label={ui.coordinates}
          options={presenceOptions}
          value={filters.coordinates}
          onChange={(value) => onChange({ ...filters, coordinates: value })}
        />
        <PresenceField
          label={ui.references}
          options={presenceOptions}
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
        <span>{ui.ignoreAccents}</span>
      </label>

      <div className="filters-footer">
        <button className="ghost-button" type="button" onClick={onReset} disabled={disabled}>
          {ui.clearFilters}
        </button>
        <button className="export-button" type="button" onClick={onExportExcel} disabled={disabled}>
          {exportLabel}
        </button>
      </div>
    </aside>
  )
}

function getExportLabel(locale: SupportedLocale): string {
  const labels: Record<SupportedLocale, string> = {
    en: 'Export filtered Excel',
    es: 'Exportar Excel filtrado',
    fr: 'Exporter Excel filtré',
    it: 'Esporta Excel filtrato',
    pt: 'Exportar Excel filtrado',
    'de-AT': 'Gefiltertes Excel exportieren',
    cs: 'Exportovat filtrovaný Excel',
    ru: 'Экспортировать отфильтрованный Excel',
    zh: '导出筛选后的 Excel',
    ja: '絞り込み Excel を出力',
    ko: '필터링된 Excel 내보내기',
    ar: 'تصدير Excel المُرشَّح',
  }

  return labels[locale]
}

function SelectField({
  emptyLabel,
  label,
  value,
  options,
  onChange,
}: {
  emptyLabel: string
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="field-group">
      <span>{label}</span>
      <select className="field-select" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{emptyLabel}</option>
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
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ label: string; value: PresenceFilter }>
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
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
