import { useEffect, useEffectEvent, useRef } from 'react'
import maplibregl, {
  type GeoJSONSource,
  type LngLatBoundsLike,
  type Map,
  type Popup,
  type StyleSpecification,
} from 'maplibre-gl'
import type { Feature, FeatureCollection, Point } from 'geojson'

import {
  DETAIL_GROUPS,
  hasTaxonTitle,
  isItalicField,
  type CatalogItem,
} from '../lib/catalog'
import {
  getDetailGroupLabel,
  getFieldLabel,
  getLanguageMeta,
  getUiText,
  type SupportedLocale,
} from '../lib/i18n'

type CatalogMapProps = {
  datasetKey: string
  locale: SupportedLocale
  records: CatalogItem[]
  selectedRecordId: string
  onSelectRecord: (recordId: string) => void
}

type MapFeatureProperties = {
  id: string
  register: string
  taxon: string
  hasImages: boolean
}

const EMPTY_COLLECTION: FeatureCollection<Point, MapFeatureProperties> = {
  type: 'FeatureCollection',
  features: [],
}

const HOVER_DETAIL_GROUPS = DETAIL_GROUPS.slice(0, 2)

export function CatalogMap({
  datasetKey,
  locale,
  records,
  selectedRecordId,
  onSelectRecord,
}: CatalogMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<Map | null>(null)
  const hoverPopupRef = useRef<Popup | null>(null)
  const hasFittedOnceRef = useRef(false)
  const datasetKeyRef = useRef(datasetKey)
  const localeRef = useRef(locale)
  const recordIndexRef = useRef(buildRecordIndex(records))
  const recordsRef = useRef<CatalogItem[]>(records)
  const selectedRecordIdRef = useRef(selectedRecordId)

  const handleSelectRecord = useEffectEvent((recordId: string) => {
    onSelectRecord(recordId)
  })

  useEffect(() => {
    recordsRef.current = records
    recordIndexRef.current = buildRecordIndex(records)
  }, [records])

  useEffect(() => {
    selectedRecordIdRef.current = selectedRecordId
  }, [selectedRecordId])

  useEffect(() => {
    localeRef.current = locale
    hoverPopupRef.current?.remove()
  }, [locale])

  useEffect(() => {
    const map = mapRef.current
    if (datasetKeyRef.current === datasetKey) {
      return
    }

    datasetKeyRef.current = datasetKey
    hasFittedOnceRef.current = false
    hoverPopupRef.current?.remove()

    if (!map) {
      return
    }

    syncDataToMap(map, recordsRef.current, hasFittedOnceRef)
    syncSelectionToMap(map, recordsRef.current, selectedRecordIdRef.current)
  }, [datasetKey])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: createMapStyle(),
      center: [-2.5, 32],
      zoom: 2.15,
      minZoom: 1.4,
    })

    mapRef.current = map
    hoverPopupRef.current = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'map-record-hover-popup',
      maxWidth: '380px',
      offset: 18,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      registerMarkerIcons(map)

      map.addSource('records', {
        type: 'geojson',
        data: EMPTY_COLLECTION,
        cluster: true,
        clusterRadius: 54,
        clusterMaxZoom: 10,
      })

      map.addLayer({
        id: 'record-clusters',
        type: 'circle',
        source: 'records',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#183153',
            20,
            '#14746f',
            60,
            '#f97316',
          ],
          'circle-radius': ['step', ['get', 'point_count'], 18, 20, 24, 60, 30],
          'circle-stroke-color': '#f8f4ec',
          'circle-stroke-width': 2,
        },
      })

      map.addLayer({
        id: 'record-cluster-count',
        type: 'symbol',
        source: 'records',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Open Sans Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#f8f4ec',
        },
      })

      map.addLayer({
        id: 'record-selected',
        type: 'circle',
        source: 'records',
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'circle-radius': 18,
          'circle-color': 'rgba(20, 116, 111, 0.18)',
          'circle-stroke-color': '#14b8a6',
          'circle-stroke-width': 2,
        },
      })

      map.addLayer({
        id: 'record-no-photo',
        type: 'symbol',
        source: 'records',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'hasImages'], false]],
        layout: {
          'icon-image': 'record-no-photo',
          'icon-size': 1,
          'icon-anchor': 'center',
          'icon-allow-overlap': true,
        },
      })

      map.addLayer({
        id: 'record-with-photo',
        type: 'symbol',
        source: 'records',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'hasImages'], true]],
        layout: {
          'icon-image': 'record-with-photo',
          'icon-size': 1,
          'icon-anchor': 'center',
          'icon-allow-overlap': true,
        },
      })

      syncDataToMap(map, recordsRef.current, hasFittedOnceRef)
      syncSelectionToMap(map, recordsRef.current, selectedRecordIdRef.current)

      const hideHoverPopup = () => {
        hoverPopupRef.current?.remove()
      }

      map.on('click', 'record-clusters', (event) => {
        hideHoverPopup()

        const feature = event.features?.[0]
        if (!feature) {
          return
        }

        const clusterId = feature.properties?.cluster_id
        const source = map.getSource('records') as GeoJSONSource | undefined
        if (!source || clusterId === undefined) {
          return
        }

        void source.getClusterExpansionZoom(clusterId).then((zoom) => {
          const coordinates = (feature.geometry as Point).coordinates as [number, number]
          map.easeTo({
            center: coordinates,
            zoom,
            duration: 700,
          })
        })
      })

      const handleUnclusteredClick = (event: maplibregl.MapLayerMouseEvent) => {
        hideHoverPopup()

        const feature = event.features?.[0]
        const recordId = feature?.properties?.id
        if (typeof recordId === 'string') {
          handleSelectRecord(recordId)
        }
      }

      const handleRecordHover = (event: maplibregl.MapLayerMouseEvent) => {
        const feature = event.features?.[0]
        const recordId = feature?.properties?.id
        if (typeof recordId !== 'string') {
          hideHoverPopup()
          return
        }

        const record = recordIndexRef.current.get(recordId)
        const popup = hoverPopupRef.current
        if (!record || !popup) {
          hideHoverPopup()
          return
        }

        popup
          .setLngLat(event.lngLat)
          .setDOMContent(createHoverPopupContent(record, localeRef.current))
          .addTo(map)
      }

      map.on('click', 'record-no-photo', handleUnclusteredClick)
      map.on('click', 'record-with-photo', handleUnclusteredClick)
      map.on('mousemove', 'record-no-photo', handleRecordHover)
      map.on('mousemove', 'record-with-photo', handleRecordHover)

      map.on('mouseenter', 'record-clusters', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'record-clusters', () => {
        map.getCanvas().style.cursor = ''
      })

      for (const layerId of ['record-no-photo', 'record-with-photo']) {
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = ''
          hideHoverPopup()
        })
      }
    })

    return () => {
      hoverPopupRef.current?.remove()
      hoverPopupRef.current = null
      map.remove()
      mapRef.current = null
      hasFittedOnceRef.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    syncDataToMap(map, records, hasFittedOnceRef)
  }, [records])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    syncSelectionToMap(map, records, selectedRecordId)
  }, [records, selectedRecordId])

  return <div className="catalog-map" ref={containerRef} />
}

function buildFeatureCollection(
  records: CatalogItem[],
): FeatureCollection<Point, MapFeatureProperties> {
  const features: Array<Feature<Point, MapFeatureProperties>> = []

  for (const record of records) {
    if (!record.hasCoordinates) {
      continue
    }

    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [record.longitude as number, record.latitude as number],
      },
      properties: {
        id: record.id,
        register: record.record.Register,
        taxon: record.record.Taxon,
        hasImages: record.hasImages,
      },
    })
  }

  return {
    type: 'FeatureCollection',
    features,
  }
}

function syncDataToMap(
  map: Map,
  records: CatalogItem[],
  hasFittedOnceRef: { current: boolean },
) {
  if (!map.isStyleLoaded()) {
    return
  }

  const source = map.getSource('records') as GeoJSONSource | undefined
  if (!source) {
    return
  }

  source.setData(buildFeatureCollection(records))

  const coordinates = records
    .filter((record) => record.hasCoordinates)
    .map((record) => [record.longitude as number, record.latitude as number] as [number, number])

  if (!coordinates.length) {
    return
  }

  if (!hasFittedOnceRef.current) {
    fitMapToCoordinates(map, coordinates)
    hasFittedOnceRef.current = true
    return
  }

  if (records.length <= 1500) {
    fitMapToCoordinates(map, coordinates)
  }
}

function buildRecordIndex(records: CatalogItem[]): globalThis.Map<string, CatalogItem> {
  const entries: Array<[string, CatalogItem]> = records.map((record) => [record.id, record])
  return new globalThis.Map(entries)
}

function syncSelectionToMap(map: Map, records: CatalogItem[], selectedRecordId: string) {
  if (!map.isStyleLoaded()) {
    return
  }

  map.setFilter('record-selected', ['==', ['get', 'id'], selectedRecordId])

  if (!selectedRecordId) {
    return
  }

  const selectedRecord = records.find((record) => record.id === selectedRecordId)
  if (!selectedRecord?.hasCoordinates) {
    return
  }

  map.easeTo({
    center: [selectedRecord.longitude as number, selectedRecord.latitude as number],
    zoom: Math.max(map.getZoom(), 4.5),
    duration: 650,
  })
}

function fitMapToCoordinates(map: Map, coordinates: [number, number][]) {
  if (coordinates.length === 1) {
    map.easeTo({
      center: coordinates[0],
      zoom: 5,
      duration: 700,
    })
    return
  }

  let west = coordinates[0][0]
  let east = coordinates[0][0]
  let south = coordinates[0][1]
  let north = coordinates[0][1]

  for (const [longitude, latitude] of coordinates) {
    if (longitude < west) west = longitude
    if (longitude > east) east = longitude
    if (latitude < south) south = latitude
    if (latitude > north) north = latitude
  }

  map.fitBounds(
    [
      [west, south],
      [east, north],
    ] as LngLatBoundsLike,
    {
      padding: 60,
      duration: 850,
      maxZoom: 6,
    },
  )
}

function registerMarkerIcons(map: Map) {
  addCanvasIcon(map, 'record-with-photo', {
    fill: '#ff7a59',
    stroke: '#0f172a',
    centerFill: '#f8f4ec',
    centerStroke: '#14b8a6',
  })
  addCanvasIcon(map, 'record-no-photo', {
    fill: '#183153',
    stroke: '#f8f4ec',
    centerFill: '#f8f4ec',
    centerStroke: '#183153',
  })
}

function addCanvasIcon(
  map: Map,
  name: string,
  options: {
    fill: string
    stroke: string
    centerFill: string
    centerStroke: string
  },
) {
  if (map.hasImage(name)) {
    return
  }

  map.addImage(name, createMarkerImage(options), { pixelRatio: 2 })
}

function createMapStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '&copy; OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'osm-raster',
        type: 'raster',
        source: 'osm',
      },
    ],
  }
}

function createHoverPopupContent(
  record: CatalogItem,
  locale: SupportedLocale,
): HTMLDivElement {
  const ui = getUiText(locale)
  const languageMeta = getLanguageMeta(locale)
  const root = document.createElement('div')
  root.className = 'map-hover-card'
  root.dir = languageMeta.dir
  root.lang = languageMeta.htmlLang

  const header = document.createElement('header')
  header.className = 'map-hover-card-header'

  const title = document.createElement('strong')
  title.className = hasTaxonTitle(record)
    ? 'map-hover-card-title map-hover-card-title-italic'
    : 'map-hover-card-title'
  title.textContent = record.title
  header.append(title)

  const subtitle = document.createElement('span')
  subtitle.className = 'map-hover-card-subtitle'
  subtitle.textContent = record.subtitle
  header.append(subtitle)

  root.append(header)

  for (const group of HOVER_DETAIL_GROUPS) {
    const rows = group.fields
      .map((field) => ({
        field,
        label: getFieldLabel(locale, field),
        value: record.record[field],
      }))
      .filter((entry) => isVisibleHoverValue(entry.value))

    const section = document.createElement('section')
    section.className = 'map-hover-card-section'

    const sectionTitle = document.createElement('h3')
    sectionTitle.textContent = getDetailGroupLabel(locale, group.key)
    section.append(sectionTitle)

    if (!rows.length) {
      const empty = document.createElement('p')
      empty.className = 'map-hover-card-empty'
      empty.textContent = ui.hoverNoData
      section.append(empty)
      root.append(section)
      continue
    }

    const definitionList = document.createElement('dl')
    definitionList.className = 'map-hover-card-grid'

    for (const row of rows) {
      const rowWrapper = document.createElement('div')
      rowWrapper.className = 'map-hover-card-row'

      const label = document.createElement('dt')
      label.textContent = row.label
      rowWrapper.append(label)

      const value = document.createElement('dd')
      if (isItalicField(row.field)) {
        value.className = 'map-hover-card-value-italic'
      }
      value.textContent = row.value
      rowWrapper.append(value)

      definitionList.append(rowWrapper)
    }

    section.append(definitionList)
    root.append(section)
  }

  return root
}
function isVisibleHoverValue(value: string | undefined): value is string {
  return Boolean(value) && value !== 'N/A'
}

function createMarkerImage(options: {
  fill: string
  stroke: string
  centerFill: string
  centerStroke: string
}): ImageData {
  const logicalSize = 28
  const pixelRatio = 2
  const canvas = document.createElement('canvas')
  canvas.width = logicalSize * pixelRatio
  canvas.height = logicalSize * pixelRatio

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('No se pudo crear el icono del mapa.')
  }

  context.scale(pixelRatio, pixelRatio)

  const center = logicalSize / 2

  context.beginPath()
  context.arc(center, center, 7.25, 0, Math.PI * 2)
  context.fillStyle = options.fill
  context.fill()
  context.lineWidth = 2
  context.strokeStyle = options.stroke
  context.stroke()

  context.beginPath()
  context.arc(center, center, 2.8, 0, Math.PI * 2)
  context.fillStyle = options.centerFill
  context.fill()
  context.lineWidth = 1.6
  context.strokeStyle = options.centerStroke
  context.stroke()

  return context.getImageData(0, 0, canvas.width, canvas.height)
}
