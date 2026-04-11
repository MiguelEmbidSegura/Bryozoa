CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'EDITOR');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'UPSERT', 'IMPORT', 'DELETE', 'ARCHIVE', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'DRY_RUN');

-- CreateEnum
CREATE TYPE "ImportSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "DatePrecision" AS ENUM ('UNKNOWN', 'YEAR', 'MONTH', 'DAY', 'RANGE', 'TEXTUAL');

-- CreateEnum
CREATE TYPE "ImportKeySource" AS ENUM ('REGISTER', 'OID', 'GENERATED', 'MANUAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EDITOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "taxonomies" (
    "id" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "taxClass" TEXT,
    "taxOrder" TEXT,
    "family" TEXT,
    "taxon" TEXT,
    "taxonAuthor" TEXT,
    "verbatimIdentification" TEXT,
    "searchLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxonomies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "siteName" TEXT,
    "provinceOrDistrict" TEXT,
    "region" TEXT,
    "country" TEXT,
    "continentOrPlate" TEXT,
    "waterBody" TEXT,
    "oceanSea" TEXT,
    "latitudeRaw" TEXT,
    "longitudeRaw" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radiusKmRaw" TEXT,
    "radiusKm" DOUBLE PRECISION,
    "hasValidCoordinates" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "sourceHash" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'excel',
    "sheetName" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "dryRun" BOOLEAN NOT NULL DEFAULT true,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "archivedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_issues" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "severity" "ImportSeverity" NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "field" TEXT,
    "rawValue" TEXT,
    "rowNumber" INTEGER,
    "importKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specimen_records" (
    "id" TEXT NOT NULL,
    "importKey" TEXT NOT NULL,
    "importKeySource" "ImportKeySource" NOT NULL,
    "sourceRowNumber" INTEGER,
    "importBatchId" TEXT,
    "oid" TEXT,
    "register" TEXT,
    "stratigraphy" TEXT,
    "taxonomyId" TEXT,
    "locationId" TEXT,
    "collectorPersonId" TEXT,
    "identifierPersonId" TEXT,
    "typeStatus" TEXT,
    "typeStatusNormalized" TEXT,
    "citedFigure" TEXT,
    "hasCitedFigure" BOOLEAN,
    "donorCollection" TEXT,
    "collectorRecorderRaw" TEXT,
    "identifiedByRaw" TEXT,
    "specimenCountRaw" TEXT,
    "specimenCount" INTEGER,
    "minDepthMRaw" TEXT,
    "maxDepthMRaw" TEXT,
    "minDepthM" DOUBLE PRECISION,
    "maxDepthM" DOUBLE PRECISION,
    "notes" TEXT,
    "imageAuthor" TEXT,
    "collectionDateRaw" TEXT,
    "parsedYear" INTEGER,
    "parsedMonth" INTEGER,
    "parsedDay" INTEGER,
    "datePrecision" "DatePrecision" NOT NULL DEFAULT 'UNKNOWN',
    "dateQualifier" TEXT,
    "searchText" TEXT,
    "rawData" JSONB,
    "archivedAt" TIMESTAMP(3),
    "lastImportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specimen_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_assets" (
    "id" TEXT NOT NULL,
    "specimenRecordId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "originalValue" TEXT NOT NULL,
    "url" TEXT,
    "fileName" TEXT,
    "isUrl" BOOLEAN NOT NULL DEFAULT false,
    "author" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bibliographic_references" (
    "id" TEXT NOT NULL,
    "specimenRecordId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "citation" TEXT NOT NULL,
    "normalizedCitation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bibliographic_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "specimenRecordId" TEXT,
    "batchId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "diff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "taxonomies_normalizedKey_key" ON "taxonomies"("normalizedKey");

-- CreateIndex
CREATE INDEX "taxonomies_taxClass_idx" ON "taxonomies"("taxClass");

-- CreateIndex
CREATE INDEX "taxonomies_taxOrder_idx" ON "taxonomies"("taxOrder");

-- CreateIndex
CREATE INDEX "taxonomies_family_idx" ON "taxonomies"("family");

-- CreateIndex
CREATE INDEX "taxonomies_taxon_idx" ON "taxonomies"("taxon");

-- CreateIndex
CREATE UNIQUE INDEX "locations_normalizedKey_key" ON "locations"("normalizedKey");

-- CreateIndex
CREATE INDEX "locations_country_idx" ON "locations"("country");

-- CreateIndex
CREATE INDEX "locations_region_idx" ON "locations"("region");

-- CreateIndex
CREATE INDEX "locations_siteName_idx" ON "locations"("siteName");

-- CreateIndex
CREATE INDEX "locations_waterBody_idx" ON "locations"("waterBody");

-- CreateIndex
CREATE INDEX "locations_oceanSea_idx" ON "locations"("oceanSea");

-- CreateIndex
CREATE INDEX "locations_hasValidCoordinates_idx" ON "locations"("hasValidCoordinates");

-- CreateIndex
CREATE INDEX "locations_latitude_longitude_idx" ON "locations"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "persons_normalizedName_key" ON "persons"("normalizedName");

-- CreateIndex
CREATE INDEX "import_batches_startedAt_idx" ON "import_batches"("startedAt");

-- CreateIndex
CREATE INDEX "import_issues_batchId_severity_idx" ON "import_issues"("batchId", "severity");

-- CreateIndex
CREATE INDEX "import_issues_rowNumber_idx" ON "import_issues"("rowNumber");

-- CreateIndex
CREATE UNIQUE INDEX "specimen_records_importKey_key" ON "specimen_records"("importKey");

-- CreateIndex
CREATE INDEX "specimen_records_register_idx" ON "specimen_records"("register");

-- CreateIndex
CREATE INDEX "specimen_records_oid_idx" ON "specimen_records"("oid");

-- CreateIndex
CREATE INDEX "specimen_records_parsedYear_idx" ON "specimen_records"("parsedYear");

-- CreateIndex
CREATE INDEX "specimen_records_archivedAt_idx" ON "specimen_records"("archivedAt");

-- CreateIndex
CREATE INDEX "specimen_records_typeStatusNormalized_idx" ON "specimen_records"("typeStatusNormalized");

-- CreateIndex
CREATE INDEX "specimen_records_taxonomyId_idx" ON "specimen_records"("taxonomyId");

-- CreateIndex
CREATE INDEX "specimen_records_locationId_idx" ON "specimen_records"("locationId");

-- CreateIndex
CREATE INDEX "specimen_records_collectorPersonId_idx" ON "specimen_records"("collectorPersonId");

-- CreateIndex
CREATE INDEX "specimen_records_identifierPersonId_idx" ON "specimen_records"("identifierPersonId");

-- CreateIndex
CREATE INDEX "specimen_records_search_tsv_idx"
ON "specimen_records"
USING GIN (to_tsvector('simple', COALESCE("searchText", '')));

-- CreateIndex
CREATE INDEX "specimen_records_search_trgm_idx"
ON "specimen_records"
USING GIN ("searchText" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "image_assets_specimenRecordId_idx" ON "image_assets"("specimenRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "image_assets_specimenRecordId_position_key" ON "image_assets"("specimenRecordId", "position");

-- CreateIndex
CREATE INDEX "bibliographic_references_specimenRecordId_idx" ON "bibliographic_references"("specimenRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "bibliographic_references_specimenRecordId_position_key" ON "bibliographic_references"("specimenRecordId", "position");

-- CreateIndex
CREATE INDEX "audit_logs_specimenRecordId_createdAt_idx" ON "audit_logs"("specimenRecordId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_batchId_createdAt_idx" ON "audit_logs"("batchId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "import_issues" ADD CONSTRAINT "import_issues_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specimen_records" ADD CONSTRAINT "specimen_records_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specimen_records" ADD CONSTRAINT "specimen_records_taxonomyId_fkey" FOREIGN KEY ("taxonomyId") REFERENCES "taxonomies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specimen_records" ADD CONSTRAINT "specimen_records_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specimen_records" ADD CONSTRAINT "specimen_records_collectorPersonId_fkey" FOREIGN KEY ("collectorPersonId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specimen_records" ADD CONSTRAINT "specimen_records_identifierPersonId_fkey" FOREIGN KEY ("identifierPersonId") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_assets" ADD CONSTRAINT "image_assets_specimenRecordId_fkey" FOREIGN KEY ("specimenRecordId") REFERENCES "specimen_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bibliographic_references" ADD CONSTRAINT "bibliographic_references_specimenRecordId_fkey" FOREIGN KEY ("specimenRecordId") REFERENCES "specimen_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_specimenRecordId_fkey" FOREIGN KEY ("specimenRecordId") REFERENCES "specimen_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "import_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
