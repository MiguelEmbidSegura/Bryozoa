import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { MAP_PAGE_SIZE } from "@/lib/constants";
import type { ExplorerFilters } from "@/lib/validators";

type FacetRow = { value: string; count: number };

function buildWhere(filters: ExplorerFilters): Prisma.SpecimenRecordWhereInput {
  const and: Prisma.SpecimenRecordWhereInput[] = [{ archivedAt: null }];

  if (filters.search) {
    and.push({
      searchText: {
        contains: filters.search,
        mode: "insensitive",
      },
    });
  }

  if (filters.taxClass) and.push({ taxonomy: { is: { taxClass: filters.taxClass } } });
  if (filters.taxOrder) and.push({ taxonomy: { is: { taxOrder: filters.taxOrder } } });
  if (filters.family) and.push({ taxonomy: { is: { family: filters.family } } });
  if (filters.taxon) and.push({ taxonomy: { is: { taxon: filters.taxon } } });
  if (filters.typeStatus) and.push({ typeStatus: filters.typeStatus });
  if (filters.siteName) and.push({ location: { is: { siteName: filters.siteName } } });
  if (filters.country) and.push({ location: { is: { country: filters.country } } });
  if (filters.region) and.push({ location: { is: { region: filters.region } } });
  if (filters.waterBody) and.push({ location: { is: { waterBody: filters.waterBody } } });
  if (filters.oceanSea) and.push({ location: { is: { oceanSea: filters.oceanSea } } });
  if (filters.collector) and.push({ collectorPerson: { is: { name: filters.collector } } });
  if (filters.identifiedBy) {
    and.push({ identifierPerson: { is: { name: filters.identifiedBy } } });
  }
  if (filters.yearFrom) and.push({ parsedYear: { gte: filters.yearFrom } });
  if (filters.yearTo) and.push({ parsedYear: { lte: filters.yearTo } });
  if (filters.hasImages) and.push({ images: { some: {} } });
  if (filters.hasCoordinates) {
    and.push({ location: { is: { hasValidCoordinates: true } } });
  }

  if (
    filters.minLat !== undefined &&
    filters.maxLat !== undefined &&
    filters.minLng !== undefined &&
    filters.maxLng !== undefined
  ) {
    and.push({
      location: {
        is: {
          hasValidCoordinates: true,
          latitude: { gte: filters.minLat, lte: filters.maxLat },
          longitude: { gte: filters.minLng, lte: filters.maxLng },
        },
      },
    });
  }

  return { AND: and };
}

function buildOrderBy(sort: ExplorerFilters["sort"]): Prisma.SpecimenRecordOrderByWithRelationInput[] {
  switch (sort) {
    case "taxon":
      return [{ taxonomy: { taxon: "asc" } }, { register: "asc" }];
    case "country":
      return [{ location: { country: "asc" } }, { register: "asc" }];
    case "date":
      return [{ parsedYear: "desc" }, { parsedMonth: "desc" }, { parsedDay: "desc" }];
    case "type":
      return [{ typeStatus: "asc" }, { register: "asc" }];
    case "register":
    default:
      return [{ register: "asc" }, { taxonomy: { taxon: "asc" } }];
  }
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

async function getFacetValues(query: Prisma.Sql) {
  return prisma.$queryRaw<FacetRow[]>(query);
}

export async function getHomeData() {
  const totalRecords = await prisma.specimenRecord.count({ where: { archivedAt: null } });
  const withImages = await prisma.specimenRecord.count({
    where: { archivedAt: null, images: { some: {} } },
  });
  const withCoordinates = await prisma.specimenRecord.count({
    where: { archivedAt: null, location: { is: { hasValidCoordinates: true } } },
  });
  const countries = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    SELECT CAST(COUNT(DISTINCT l."country") AS INTEGER) AS count
    FROM "specimen_records" r
    LEFT JOIN "locations" l ON l.id = r."locationId"
    WHERE r."archivedAt" IS NULL AND l."country" IS NOT NULL
  `);
  const taxa = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
    SELECT CAST(COUNT(DISTINCT t."taxon") AS INTEGER) AS count
    FROM "specimen_records" r
    LEFT JOIN "taxonomies" t ON t.id = r."taxonomyId"
    WHERE r."archivedAt" IS NULL AND t."taxon" IS NOT NULL
  `);
  const classes = await getFacetValues(Prisma.sql`
    SELECT t."taxClass" AS value, CAST(COUNT(*) AS INTEGER) AS count
    FROM "specimen_records" r
    JOIN "taxonomies" t ON t.id = r."taxonomyId"
    WHERE r."archivedAt" IS NULL AND t."taxClass" IS NOT NULL
    GROUP BY t."taxClass"
    ORDER BY count DESC, value ASC
    LIMIT 8
  `);
  const orders = await getFacetValues(Prisma.sql`
    SELECT t."taxOrder" AS value, CAST(COUNT(*) AS INTEGER) AS count
    FROM "specimen_records" r
    JOIN "taxonomies" t ON t.id = r."taxonomyId"
    WHERE r."archivedAt" IS NULL AND t."taxOrder" IS NOT NULL
    GROUP BY t."taxOrder"
    ORDER BY count DESC, value ASC
    LIMIT 8
  `);
  const families = await getFacetValues(Prisma.sql`
    SELECT t."family" AS value, CAST(COUNT(*) AS INTEGER) AS count
    FROM "specimen_records" r
    JOIN "taxonomies" t ON t.id = r."taxonomyId"
    WHERE r."archivedAt" IS NULL AND t."family" IS NOT NULL
    GROUP BY t."family"
    ORDER BY count DESC, value ASC
    LIMIT 8
  `);

  const topCountries = await getFacetValues(Prisma.sql`
    SELECT l."country" AS value, CAST(COUNT(*) AS INTEGER) AS count
    FROM "specimen_records" r
    JOIN "locations" l ON l.id = r."locationId"
    WHERE r."archivedAt" IS NULL AND l."country" IS NOT NULL
    GROUP BY l."country"
    ORDER BY count DESC, value ASC
    LIMIT 8
  `);

  return {
    stats: {
      totalRecords,
      withImages,
      withCoordinates,
      countryCount: countries[0]?.count ?? 0,
      taxonCount: taxa[0]?.count ?? 0,
    },
    facets: {
      classes,
      orders,
      families,
      countries: topCountries,
    },
  };
}

export async function getExplorerFacets() {
  const classes = await getFacetValues(Prisma.sql`
    SELECT t."taxClass" AS value, CAST(COUNT(*) AS INTEGER) AS count
    FROM "specimen_records" r JOIN "taxonomies" t ON t.id = r."taxonomyId"
    WHERE r."archivedAt" IS NULL AND t."taxClass" IS NOT NULL
    GROUP BY t."taxClass" ORDER BY count DESC, value ASC LIMIT 50
  `);
  const orders = await getFacetValues(Prisma.sql`
    SELECT t."taxOrder" AS value, CAST(COUNT(*) AS INTEGER) AS count
    FROM "specimen_records" r JOIN "taxonomies" t ON t.id = r."taxonomyId"
    WHERE r."archivedAt" IS NULL AND t."taxOrder" IS NOT NULL
    GROUP BY t."taxOrder" ORDER BY count DESC, value ASC LIMIT 50
  `);
  const families = await getFacetValues(Prisma.sql`
    SELECT t."family" AS value, CAST(COUNT(*) AS INTEGER) AS count
    FROM "specimen_records" r JOIN "taxonomies" t ON t.id = r."taxonomyId"
    WHERE r."archivedAt" IS NULL AND t."family" IS NOT NULL
    GROUP BY t."family" ORDER BY count DESC, value ASC LIMIT 50
  `);
  const types = await getFacetValues(Prisma.sql`
    SELECT r."typeStatus" AS value, CAST(COUNT(*) AS INTEGER) AS count
    FROM "specimen_records" r
    WHERE r."archivedAt" IS NULL AND r."typeStatus" IS NOT NULL
    GROUP BY r."typeStatus" ORDER BY count DESC, value ASC LIMIT 50
  `);
  const countries = await getFacetValues(Prisma.sql`
    SELECT l."country" AS value, CAST(COUNT(*) AS INTEGER) AS count
    FROM "specimen_records" r JOIN "locations" l ON l.id = r."locationId"
    WHERE r."archivedAt" IS NULL AND l."country" IS NOT NULL
    GROUP BY l."country" ORDER BY count DESC, value ASC LIMIT 50
  `);
  const regions = await getFacetValues(Prisma.sql`
    SELECT l."region" AS value, CAST(COUNT(*) AS INTEGER) AS count
    FROM "specimen_records" r JOIN "locations" l ON l.id = r."locationId"
    WHERE r."archivedAt" IS NULL AND l."region" IS NOT NULL
    GROUP BY l."region" ORDER BY count DESC, value ASC LIMIT 50
  `);
  const waterBodies = await getFacetValues(Prisma.sql`
    SELECT l."waterBody" AS value, CAST(COUNT(*) AS INTEGER) AS count
    FROM "specimen_records" r JOIN "locations" l ON l.id = r."locationId"
    WHERE r."archivedAt" IS NULL AND l."waterBody" IS NOT NULL
    GROUP BY l."waterBody" ORDER BY count DESC, value ASC LIMIT 50
  `);
  const seas = await getFacetValues(Prisma.sql`
    SELECT l."oceanSea" AS value, CAST(COUNT(*) AS INTEGER) AS count
    FROM "specimen_records" r JOIN "locations" l ON l.id = r."locationId"
    WHERE r."archivedAt" IS NULL AND l."oceanSea" IS NOT NULL
    GROUP BY l."oceanSea" ORDER BY count DESC, value ASC LIMIT 50
  `);
  const collectors = await getFacetValues(Prisma.sql`
    SELECT p."name" AS value, CAST(COUNT(*) AS INTEGER) AS count
    FROM "specimen_records" r JOIN "persons" p ON p.id = r."collectorPersonId"
    WHERE r."archivedAt" IS NULL AND p."name" IS NOT NULL
    GROUP BY p."name" ORDER BY count DESC, value ASC LIMIT 50
  `);

  return { classes, orders, families, types, countries, regions, waterBodies, seas, collectors };
}

export async function getExplorerData(filters: ExplorerFilters) {
  const where = buildWhere(filters);
  const skip = (filters.page - 1) * filters.pageSize;

  const total = await prisma.specimenRecord.count({ where });
  const items = await prisma.specimenRecord.findMany({
    where,
    skip,
    take: filters.pageSize,
    orderBy: buildOrderBy(filters.sort),
    select: {
      id: true,
      register: true,
      oid: true,
      typeStatus: true,
      parsedYear: true,
      notes: true,
      taxonomy: {
        select: {
          taxClass: true,
          taxOrder: true,
          family: true,
          taxon: true,
          taxonAuthor: true,
        },
      },
      location: {
        select: {
          siteName: true,
          country: true,
          region: true,
          waterBody: true,
          oceanSea: true,
          hasValidCoordinates: true,
        },
      },
      collectorPerson: { select: { name: true } },
      identifierPerson: { select: { name: true } },
      images: {
        take: 1,
        orderBy: { position: "asc" },
        select: { originalValue: true, url: true, fileName: true, isUrl: true },
      },
      _count: {
        select: {
          images: true,
          references: true,
        },
      },
    },
  });

  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    pageCount: Math.max(1, Math.ceil(total / filters.pageSize)),
  };
}

export async function getMapData(filters: ExplorerFilters) {
  const where = buildWhere({ ...filters, hasCoordinates: true, pageSize: MAP_PAGE_SIZE });
  const rows = await prisma.specimenRecord.findMany({
    where,
    take: MAP_PAGE_SIZE,
    orderBy: buildOrderBy(filters.sort),
    select: {
      id: true,
      register: true,
      typeStatus: true,
      taxonomy: { select: { taxon: true, family: true } },
      location: {
        select: {
          siteName: true,
          country: true,
          region: true,
          latitude: true,
          longitude: true,
          hasValidCoordinates: true,
        },
      },
      images: {
        take: 1,
        orderBy: { position: "asc" },
        select: { originalValue: true, url: true, fileName: true, isUrl: true },
      },
    },
  });

  if (
    filters.radiusLat === undefined ||
    filters.radiusLng === undefined ||
    filters.radiusKm === undefined
  ) {
    return rows;
  }

  return rows.filter((row) => {
    const latitude = row.location?.latitude;
    const longitude = row.location?.longitude;

    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      return false;
    }

    return haversineKm(filters.radiusLat!, filters.radiusLng!, latitude, longitude) <= filters.radiusKm!;
  });
}

export async function getRecordDetail(id: string) {
  const record = await prisma.specimenRecord.findUnique({
    where: { id },
    include: {
      taxonomy: true,
      location: true,
      collectorPerson: true,
      identifierPerson: true,
      images: { orderBy: { position: "asc" } },
      references: { orderBy: { position: "asc" } },
      importBatch: true,
    },
  });

  if (!record || record.archivedAt) {
    return null;
  }

  const relatedByTaxon = record.taxonomy?.taxon
    ? await prisma.specimenRecord.findMany({
        where: {
          id: { not: record.id },
          archivedAt: null,
          taxonomy: { is: { taxon: record.taxonomy.taxon } },
        },
        take: 6,
        orderBy: [{ register: "asc" }],
        select: {
          id: true,
          register: true,
          taxonomy: { select: { taxon: true } },
          location: { select: { country: true } },
        },
      })
    : [];
  const relatedByFamily = record.taxonomy?.family
    ? await prisma.specimenRecord.findMany({
        where: {
          id: { not: record.id },
          archivedAt: null,
          taxonomy: { is: { family: record.taxonomy.family } },
        },
        take: 6,
        orderBy: [{ register: "asc" }],
        select: {
          id: true,
          register: true,
          taxonomy: { select: { taxon: true, family: true } },
          location: { select: { country: true } },
        },
      })
    : [];
  const relatedByCountry = record.location?.country
    ? await prisma.specimenRecord.findMany({
        where: {
          id: { not: record.id },
          archivedAt: null,
          location: { is: { country: record.location.country } },
        },
        take: 6,
        orderBy: [{ register: "asc" }],
        select: {
          id: true,
          register: true,
          taxonomy: { select: { taxon: true } },
          location: { select: { country: true } },
        },
      })
    : [];
  const relatedByCollector = record.collectorPerson?.name
    ? await prisma.specimenRecord.findMany({
        where: {
          id: { not: record.id },
          archivedAt: null,
          collectorPerson: { is: { name: record.collectorPerson.name } },
        },
        take: 6,
        orderBy: [{ register: "asc" }],
        select: {
          id: true,
          register: true,
          taxonomy: { select: { taxon: true } },
          collectorPerson: { select: { name: true } },
        },
      })
    : [];

  return { record, relatedByTaxon, relatedByFamily, relatedByCountry, relatedByCollector };
}

export async function getTaxonomyTree() {
  const rows = await prisma.$queryRaw<
    Array<{
      taxClass: string | null;
      taxOrder: string | null;
      family: string | null;
      taxon: string | null;
      count: number;
    }>
  >(Prisma.sql`
    SELECT
      t."taxClass" AS "taxClass",
      t."taxOrder" AS "taxOrder",
      t."family" AS "family",
      t."taxon" AS "taxon",
      CAST(COUNT(*) AS INTEGER) AS count
    FROM "specimen_records" r
    JOIN "taxonomies" t ON t.id = r."taxonomyId"
    WHERE r."archivedAt" IS NULL
    GROUP BY t."taxClass", t."taxOrder", t."family", t."taxon"
    ORDER BY t."taxClass" ASC, t."taxOrder" ASC, t."family" ASC, t."taxon" ASC
  `);

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
          families: Map<
            string,
            {
              name: string;
              count: number;
              taxa: Array<{ name: string; count: number }>;
            }
          >;
        }
      >;
    }
  >();

  for (const row of rows) {
    const className = row.taxClass ?? "Unknown";
    const orderName = row.taxOrder ?? "Unknown";
    const familyName = row.family ?? "Unknown";
    const taxonName = row.taxon ?? "Unknown";

    if (!tree.has(className)) {
      tree.set(className, { name: className, count: 0, orders: new Map() });
    }

    const classNode = tree.get(className)!;
    classNode.count += row.count;

    if (!classNode.orders.has(orderName)) {
      classNode.orders.set(orderName, { name: orderName, count: 0, families: new Map() });
    }

    const orderNode = classNode.orders.get(orderName)!;
    orderNode.count += row.count;

    if (!orderNode.families.has(familyName)) {
      orderNode.families.set(familyName, { name: familyName, count: 0, taxa: [] });
    }

    const familyNode = orderNode.families.get(familyName)!;
    familyNode.count += row.count;
    familyNode.taxa.push({ name: taxonName, count: row.count });
  }

  return Array.from(tree.values()).map((classNode) => ({
    ...classNode,
    orders: Array.from(classNode.orders.values()).map((orderNode) => ({
      ...orderNode,
      families: Array.from(orderNode.families.values()),
    })),
  }));
}
