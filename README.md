# BryoZoo

Modern Bryozoa catalogue and curation app built with Next.js, TypeScript, Tailwind, Prisma and PostgreSQL.

## What is included

- Public catalogue:
  - Home page with KPIs and entry points by class, order, family and country
  - Explorer with server-side search, filters, sorting, pagination and table/card views
  - Record detail pages with taxonomy, locality, chronology, related records, media and exports
  - Interactive map with clustering, visible-area filtering and radius search inputs
  - Taxonomy hierarchy view with record counts
- Admin:
  - Secure credential login with signed HTTP-only cookie sessions
  - Record create/edit/archive/delete
  - Image and reference editing
  - Excel upload import with dry-run support
  - Import batch history and import issues
  - Audit log and basic admin user management
- Data/import:
  - Real Excel parser based on `xlsx`
  - Header normalization and resilient parsing for truncated/inconsistent columns
  - Separate relations for images and references
  - Deduplication by `Register`, then `OID_`, then stable generated key
  - `0/0` coordinates treated as invalid for map use
  - Partial date parsing into raw year/month/day + precision + qualifier
  - Import log JSON files written to `data/import-logs/`

## Stack

- `Next.js 16` with App Router
- `React 19`
- `Tailwind CSS 4`
- `Prisma 7` + PostgreSQL
- `React Hook Form` + `Zod`
- `Leaflet` + clustering
- `yet-another-react-lightbox`
- Signed cookie auth with `jose`

## Data model

Prisma models:

- `SpecimenRecord`
- `Taxonomy`
- `Location`
- `Person`
- `ImageAsset`
- `BibliographicReference`
- `ImportBatch`
- `ImportIssue`
- `AuditLog`
- `User`

Important normalization decisions:

- raw imported row is preserved in `SpecimenRecord.rawData`
- normalized text converts empty / `Unknown` / `n/a` style values to `null`
- coordinates are stored both as raw strings and parsed numeric values
- `Collection_date` is stored as `collectionDateRaw`, `parsedYear`, `parsedMonth`, `parsedDay`, `datePrecision`, `dateQualifier`

## Environment

Copy `.env.example` to `.env` and adjust as needed.

Required variables:

- `DATABASE_URL`
- `APP_URL`
- `AUTH_SECRET`
- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_PASSWORD`

## Local setup

1. Install dependencies

```bash
npm install
```

2. Configure the environment

```bash
cp .env.example .env
```

3. Start PostgreSQL

Option A: local PostgreSQL already installed

Option B: Docker Compose

```bash
docker compose up -d db
```

Option C: embedded local PostgreSQL, useful when Docker or a full PostgreSQL install is not available

```bash
npm run db:start
```

This starts a real local PostgreSQL server inside `data/postgres/` and writes the
matching `DATABASE_URL` into `.env`.

4. Generate Prisma client

```bash
npm run prisma:generate
```

5. Apply migrations

```bash
npm run prisma:migrate
```

In this project `npm run prisma:migrate` uses `prisma db push` for the fastest local bootstrap.
If you want to evolve SQL migrations during development, use:

```bash
npm run prisma:migrate:dev
```

6. Seed the first admin user

```bash
npm run db:seed
```

7. Start the app

```bash
npm run dev
```

Open:

- public app: `http://localhost:3000`
- admin login: `http://localhost:3000/admin/login`

## Import commands

Dry run:

```bash
npm run import:bryozoa -- --file "c:/Users/PRT/Downloads/ALL_Bryozoa_Synthesys-Miguel_fusionado.xlsx" --dry-run
```

Commit import:

```bash
npm run import:bryozoa -- --file "c:/Users/PRT/Downloads/ALL_Bryozoa_Synthesys-Miguel_fusionado.xlsx" --commit
```

Limit rows for testing:

```bash
npm run import:bryozoa -- --file "c:/Users/PRT/Downloads/ALL_Bryozoa_Synthesys-Miguel_fusionado.xlsx" --dry-run --limit 250
```

The same import service is also available from `/admin/imports` via file upload.

## Useful scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run prisma:generate
npm run db:start
npm run db:start:prisma-dev
npm run db:stop
npm run prisma:migrate
npm run prisma:push
npm run db:seed
npm run import:bryozoa -- --file "<path-to-xlsx>" --dry-run
```

## Docker Compose

Start app + PostgreSQL:

```bash
docker compose up --build
```

The compose setup is development-oriented and runs:

- Postgres 16
- Next.js app on port `3000`
- automatic `prisma generate`, migration and seed on startup

## Search and performance notes

- search is server-side and works on a denormalized `searchText` field
- migration includes GIN indexes for:
  - PostgreSQL full-text vector over `searchText`
  - trigram search over `searchText`
- additional indexes exist for taxonomy, country/region, dates, coordinates and dedupe keys

## Tests and verification

TypeScript compilation should pass with:

```bash
npx tsc --noEmit
```

You can run lint and tests with:

```bash
npm run lint
npm run test
```

## Notes from this build

- The supplied workbook was inspected directly:
  - main sheet: `ALL`
  - approx. `41,042` rows including header
  - real headers in the first `52` columns
- observed in the source data:
  - partial dates such as `00/00/1991`
  - `0/0` coordinates
  - image URLs and filename-only image values
  - mixed/typoed date qualifiers
- local verification now uses the embedded PostgreSQL bootstrap behind `npm run db:start`
- if you prefer Prisma Dev instead of the embedded server, `npm run db:start:prisma-dev` remains available as a fallback


