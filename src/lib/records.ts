import { MAP_PAGE_SIZE } from "@/lib/constants";
import { getCatalogSnapshot } from "@/lib/catalog/snapshot";
import type { CatalogRecord } from "@/lib/catalog/types";
import type { ExplorerFilters } from "@/lib/validators";

function hasTextMatch(haystack: string | null | undefined, needle: string | undefined) {
  if (!needle) return true;
  return (haystack ?? "").toLowerCase().includes(needle.toLowerCase());
}

function isTruthy(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0);
}

function toFacetRows(values: Array<string | null | undefined>, limit: number) {
  const counts = new Map<string, number>();

  for (const value of values) {
    if (!isTruthy(value)) continue;
    counts.set(value!, (counts.get(value!) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
    .slice(0, limit);
}

function sortRecords(records: CatalogRecord[], sort: ExplorerFilters["sort"]) {
  return [...records].sort((left, right) => {
    switch (sort) {
      case "taxon":
        return (left.taxonomy?.taxon ?? "").localeCompare(right.taxonomy?.taxon ?? "") ||
          (left.register ?? "").localeCompare(right.register ?? "");
      case "country":
        return (left.location?.country ?? "").localeCompare(right.location?.country ?? "") ||
          (left.register ?? "").localeCompare(right.register ?? "");
      case "date":
        return (
          (right.parsedYear ?? -Infinity) - (left.parsedYear ?? -Infinity) ||
          (right.parsedMonth ?? -Infinity) - (left.parsedMonth ?? -Infinity) ||
          (right.parsedDay ?? -Infinity) - (left.parsedDay ?? -Infinity)
        );
      case "type":
        return (left.typeStatus ?? "").localeCompare(right.typeStatus ?? "") ||
          (left.register ?? "").localeCompare(right.register ?? "");
      case "register":
      default:
        return (left.register ?? "").localeCompare(right.register ?? "") ||
          (left.taxonomy?.taxon ?? "").localeCompare(right.taxonomy?.taxon ?? "");
    }
  });
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLng / 2) ** 2;

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getAllRecords() {
  const snapshot = await getCatalogSnapshot();
  return snapshot.records;
}

async function getActiveRecords() {
  const records = await getAllRecords();
  return records.filter((record) => !record.archivedAt);
}

function matchesFilters(record: CatalogRecord, filters: ExplorerFilters) {
  if (filters.search && !hasTextMatch(record.searchText, filters.search)) return false;
  if (filters.taxClass && record.taxonomy?.taxClass !== filters.taxClass) return false;
  if (filters.taxOrder && record.taxonomy?.taxOrder !== filters.taxOrder) return false;
  if (filters.family && record.taxonomy?.family !== filters.family) return false;
  if (filters.taxon && record.taxonomy?.taxon !== filters.taxon) return false;
  if (filters.typeStatus && record.typeStatus !== filters.typeStatus) return false;
  if (filters.siteName && record.location?.siteName !== filters.siteName) return false;
  if (filters.country && record.location?.country !== filters.country) return false;
  if (filters.region && record.location?.region !== filters.region) return false;
  if (filters.waterBody && record.location?.waterBody !== filters.waterBody) return false;
  if (filters.oceanSea && record.location?.oceanSea !== filters.oceanSea) return false;
  if (filters.collector && record.collectorPerson?.name !== filters.collector) return false;
  if (filters.identifiedBy && record.identifierPerson?.name !== filters.identifiedBy) return false;
  if (filters.yearFrom && (record.parsedYear === null || record.parsedYear < filters.yearFrom)) {
    return false;
  }
  if (filters.yearTo && (record.parsedYear === null || record.parsedYear > filters.yearTo)) {
    return false;
  }
  if (filters.hasImages && record.images.length === 0) return false;
  if (filters.hasCoordinates && !record.location?.hasValidCoordinates) return false;

  if (
    filters.minLat !== undefined &&
    filters.maxLat !== undefined &&
    filters.minLng !== undefined &&
    filters.maxLng !== undefined
  ) {
    const latitude = record.location?.latitude;
    const longitude = record.location?.longitude;

    if (
      latitude === null ||
      latitude === undefined ||
      longitude === null ||
      longitude === undefined ||
      latitude < filters.minLat ||
      latitude > filters.maxLat ||
      longitude < filters.minLng ||
      longitude > filters.maxLng
    ) {
      return false;
    }
  }

  return true;
}

export async function getHomeData() {
  const records = await getActiveRecords();

  return {
    stats: {
      totalRecords: records.length,
      withImages: records.filter((record) => record.images.length > 0).length,
      withCoordinates: records.filter((record) => record.location?.hasValidCoordinates).length,
      countryCount: new Set(records.map((record) => record.location?.country).filter(isTruthy)).size,
      taxonCount: new Set(records.map((record) => record.taxonomy?.taxon).filter(isTruthy)).size,
    },
    facets: {
      classes: toFacetRows(records.map((record) => record.taxonomy?.taxClass), 8),
      orders: toFacetRows(records.map((record) => record.taxonomy?.taxOrder), 8),
      families: toFacetRows(records.map((record) => record.taxonomy?.family), 8),
      countries: toFacetRows(records.map((record) => record.location?.country), 8),
    },
  };
}

export async function getHomeHighlights() {
  const records = await getActiveRecords();
  return records
    .filter((record) => record.images.length > 0)
    .sort((left, right) => (right.parsedYear ?? -Infinity) - (left.parsedYear ?? -Infinity))
    .slice(0, 3);
}

export async function getHomeMapPreview() {
  const records = await getActiveRecords();
  return records
    .filter((record) => record.location?.hasValidCoordinates)
    .sort(
      (left, right) =>
        (right.parsedYear ?? -Infinity) - (left.parsedYear ?? -Infinity) ||
        (left.register ?? "").localeCompare(right.register ?? ""),
    )
    .slice(0, 180)
    .map((record) => ({
      id: record.id,
      latitude: record.location!.latitude!,
      longitude: record.location!.longitude!,
      title: record.taxonomy?.taxon ?? record.register ?? "Unknown",
      subtitle: [record.location?.country, record.location?.siteName].filter(Boolean).join(" - "),
    }));
}

export async function getExplorerFacets() {
  const records = await getActiveRecords();

  return {
    classes: toFacetRows(records.map((record) => record.taxonomy?.taxClass), 50),
    orders: toFacetRows(records.map((record) => record.taxonomy?.taxOrder), 50),
    families: toFacetRows(records.map((record) => record.taxonomy?.family), 50),
    types: toFacetRows(records.map((record) => record.typeStatus), 50),
    countries: toFacetRows(records.map((record) => record.location?.country), 50),
    regions: toFacetRows(records.map((record) => record.location?.region), 50),
    waterBodies: toFacetRows(records.map((record) => record.location?.waterBody), 50),
    seas: toFacetRows(records.map((record) => record.location?.oceanSea), 50),
    collectors: toFacetRows(records.map((record) => record.collectorPerson?.name), 50),
  };
}

export async function getExplorerData(filters: ExplorerFilters) {
  const records = await getActiveRecords();
  const filtered = sortRecords(records.filter((record) => matchesFilters(record, filters)), filters.sort);
  const skip = (filters.page - 1) * filters.pageSize;
  const items = filtered.slice(skip, skip + filters.pageSize);

  return {
    items,
    total: filtered.length,
    page: filters.page,
    pageSize: filters.pageSize,
    pageCount: Math.max(1, Math.ceil(filtered.length / filters.pageSize)),
  };
}

export async function getMapData(filters: ExplorerFilters) {
  const records = await getActiveRecords();
  const filtered = sortRecords(
    records.filter(
      (record) => matchesFilters(record, { ...filters, hasCoordinates: true, pageSize: MAP_PAGE_SIZE }),
    ),
    filters.sort,
  ).slice(0, MAP_PAGE_SIZE);

  if (
    filters.radiusLat === undefined ||
    filters.radiusLng === undefined ||
    filters.radiusKm === undefined
  ) {
    return filtered;
  }

  return filtered.filter((record) => {
    const latitude = record.location?.latitude;
    const longitude = record.location?.longitude;

    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      return false;
    }

    return haversineKm(filters.radiusLat!, filters.radiusLng!, latitude, longitude) <= filters.radiusKm!;
  });
}

export async function getRecordDetail(id: string) {
  const records = await getActiveRecords();
  const record = records.find((entry) => entry.id === id) ?? null;

  if (!record) {
    return null;
  }

  const relatedByTaxon = record.taxonomy?.taxon
    ? records
        .filter((entry) => entry.id !== record.id && entry.taxonomy?.taxon === record.taxonomy?.taxon)
        .slice(0, 6)
    : [];
  const relatedByFamily = record.taxonomy?.family
    ? records
        .filter((entry) => entry.id !== record.id && entry.taxonomy?.family === record.taxonomy?.family)
        .slice(0, 6)
    : [];
  const relatedByCountry = record.location?.country
    ? records
        .filter((entry) => entry.id !== record.id && entry.location?.country === record.location?.country)
        .slice(0, 6)
    : [];
  const relatedByCollector = record.collectorPerson?.name
    ? records
        .filter(
          (entry) => entry.id !== record.id && entry.collectorPerson?.name === record.collectorPerson?.name,
        )
        .slice(0, 6)
    : [];

  return { record, relatedByTaxon, relatedByFamily, relatedByCountry, relatedByCollector };
}

export async function getCatalogRecordById(id: string) {
  const records = await getActiveRecords();
  return records.find((entry) => entry.id === id) ?? null;
}

export async function getRecordSitemapEntries() {
  const records = await getActiveRecords();
  return records
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 5000)
    .map((record) => ({
      id: record.id,
      updatedAt: new Date(record.updatedAt),
    }));
}

export async function getTaxonomyTree() {
  const records = await getActiveRecords();
  const tree = new Map<
    string,
    {
      name: string;
      count: number;
      orders: Map<
        string,
        {
          name: string;
          count: number;
          families: Map<string, { name: string; count: number; taxa: Array<{ name: string; count: number }> }>;
        }
      >;
    }
  >();

  for (const record of records) {
    const className = record.taxonomy?.taxClass ?? "Unknown";
    const orderName = record.taxonomy?.taxOrder ?? "Unknown";
    const familyName = record.taxonomy?.family ?? "Unknown";
    const taxonName = record.taxonomy?.taxon ?? "Unknown";

    if (!tree.has(className)) {
      tree.set(className, { name: className, count: 0, orders: new Map() });
    }

    const classNode = tree.get(className)!;
    classNode.count += 1;

    if (!classNode.orders.has(orderName)) {
      classNode.orders.set(orderName, { name: orderName, count: 0, families: new Map() });
    }

    const orderNode = classNode.orders.get(orderName)!;
    orderNode.count += 1;

    if (!orderNode.families.has(familyName)) {
      orderNode.families.set(familyName, { name: familyName, count: 0, taxa: [] });
    }

    const familyNode = orderNode.families.get(familyName)!;
    familyNode.count += 1;
    const existingTaxon = familyNode.taxa.find((entry) => entry.name === taxonName);

    if (existingTaxon) {
      existingTaxon.count += 1;
    } else {
      familyNode.taxa.push({ name: taxonName, count: 1 });
    }
  }

  return Array.from(tree.values()).map((classNode) => ({
    ...classNode,
    orders: Array.from(classNode.orders.values()).map((orderNode) => ({
      ...orderNode,
      families: Array.from(orderNode.families.values()),
    })),
  }));
}
