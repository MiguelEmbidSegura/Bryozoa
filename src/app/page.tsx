import Link from "next/link";
import { ArrowRight, Globe, Map, Search, Trees } from "lucide-react";
import { CatalogBootstrapState } from "@/components/shared/catalog-bootstrap-state";
import { MappedRecordsPreview } from "@/components/home/mapped-records-preview";
import { RecordSummaryCard } from "@/components/records/record-summary-card";
import { DatabaseSetupState } from "@/components/shared/database-setup-state";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getCatalogBootstrapStatus } from "@/lib/catalog-bootstrap";
import { isDatabaseConnectionError } from "@/lib/db-errors";
import { getHomeData } from "@/lib/records";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function loadHomePageData() {
  try {
    const bootstrap = await getCatalogBootstrapStatus();

    if (bootstrap.state !== "ready") {
      return {
        bootstrap,
        databaseUnavailable: false as const,
      };
    }

    const home = await getHomeData();
    const highlights = await prisma.specimenRecord.findMany({
      where: { archivedAt: null, images: { some: {} } },
      take: 3,
      orderBy: [{ parsedYear: "desc" }],
      select: {
        id: true,
        register: true,
        parsedYear: true,
        typeStatus: true,
        taxonomy: { select: { taxon: true, family: true, taxClass: true, taxOrder: true } },
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
        images: {
          take: 1,
          orderBy: { position: "asc" },
          select: { originalValue: true, url: true, fileName: true, isUrl: true },
        },
        _count: { select: { images: true, references: true } },
      },
    });
    const mappedPreviewRows = await prisma.specimenRecord.findMany({
      where: { archivedAt: null, location: { is: { hasValidCoordinates: true } } },
      take: 180,
      orderBy: [{ parsedYear: "desc" }, { register: "asc" }],
      select: {
        id: true,
        register: true,
        taxonomy: { select: { taxon: true } },
        location: {
          select: {
            latitude: true,
            longitude: true,
            country: true,
            siteName: true,
          },
        },
      },
    });

    const mapPreviewMarkers = mappedPreviewRows
      .filter(
        (item) =>
          item.location?.latitude !== null &&
          item.location?.latitude !== undefined &&
          item.location?.longitude !== null &&
          item.location?.longitude !== undefined,
      )
      .map((item) => ({
        id: item.id,
        latitude: item.location!.latitude!,
        longitude: item.location!.longitude!,
        title: item.taxonomy?.taxon ?? item.register ?? "Unknown",
        subtitle: [item.location?.country, item.location?.siteName].filter(Boolean).join(" - "),
      }));

    return { home, highlights, mapPreviewMarkers, databaseUnavailable: false as const };
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return { databaseUnavailable: true as const };
    }

    throw error;
  }
}

function getImportErrorMessage(
  error?: string,
  message?: string | string[],
) {
  switch (error) {
    case "missing-file":
      return "Choose an Excel workbook before starting the import.";
    case "import-failed":
      return typeof message === "string" && message.trim().length > 0
        ? message
        : "The workbook could not be imported. Open the admin imports page to inspect the failure.";
    default:
      return undefined;
  }
}

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const result = await loadHomePageData();

  if (result.databaseUnavailable) {
    return <DatabaseSetupState />;
  }

  if ("bootstrap" in result && result.bootstrap) {
    const importErrorMessage = getImportErrorMessage(
      typeof resolvedSearchParams?.error === "string" ? resolvedSearchParams.error : undefined,
      resolvedSearchParams?.message,
    );

    return (
      <>
        {importErrorMessage ? (
          <div className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {importErrorMessage}
            </p>
          </div>
        ) : null}
        <CatalogBootstrapState initialStatus={result.bootstrap} />
      </>
    );
  }

  const { home, highlights, mapPreviewMarkers } = result;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden">
          <CardContent className="space-y-8 p-8 md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--muted)] px-4 py-2 text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
              Scientific catalogue
            </div>
            <div className="space-y-4">
              <h1 className="max-w-4xl font-serif text-5xl font-semibold tracking-tight text-[var(--foreground)] md:text-6xl">
                Explore a production-ready Bryozoa catalogue built for taxonomy, locality and curation.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--muted-foreground)]">
                Search thousands of bryozoan records, follow taxonomic structure, review mapped
                localities and curate specimens from a single admin workflow.
              </p>
            </div>
            <form action="/explorer" className="flex flex-col gap-3 sm:flex-row">
              <input
                name="search"
                className="h-12 flex-1 rounded-full border border-[var(--border)] bg-[var(--panel)] px-5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="Search taxon, register, collector, country..."
              />
              <Button type="submit" size="lg" className="sm:px-6">
                Search catalogue
              </Button>
            </form>
            <div className="flex flex-wrap gap-3">
              <Link href="/explorer">
                <Button variant="secondary">
                  <Search className="mr-2 h-4 w-4" />
                  Open explorer
                </Button>
              </Link>
              <Link href="/map">
                <Button variant="ghost">
                  <Map className="mr-2 h-4 w-4" />
                  Map view
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="flex h-full flex-col justify-between gap-6 bg-[linear-gradient(160deg,rgba(15,109,104,0.18),transparent_55%)]">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                Fast entry points
              </p>
              <div className="space-y-3">
                <Link
                  href="/taxonomy"
                  className="flex items-center justify-between rounded-3xl border border-[var(--border)] bg-[var(--panel)] px-5 py-4 transition hover:bg-[var(--muted)]"
                >
                  <div className="flex items-center gap-3">
                    <Trees className="h-5 w-5 text-[var(--accent)]" />
                    <span>Navigate taxonomy</span>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/map"
                  className="flex items-center justify-between rounded-3xl border border-[var(--border)] bg-[var(--panel)] px-5 py-4 transition hover:bg-[var(--muted)]"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-[var(--accent)]" />
                    <span>Inspect mapped records</span>
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <MappedRecordsPreview markers={mapPreviewMarkers} />
            <div className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-5">
              <p className="text-sm text-[var(--muted-foreground)]">
                The imported workbook contains real-world edge cases: truncated headers, partial
                dates, 0/0 coordinates, URL and filename images, and mixed bibliographic formats.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Records" value={formatNumber(home.stats.totalRecords)} />
        <StatCard label="With images" value={formatNumber(home.stats.withImages)} />
        <StatCard label="Mapped" value={formatNumber(home.stats.withCoordinates)} />
        <StatCard label="Countries" value={formatNumber(home.stats.countryCount)} />
        <StatCard label="Taxa" value={formatNumber(home.stats.taxonCount)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {([
          { title: "By class", items: home.facets.classes, param: "taxClass" },
          { title: "By order", items: home.facets.orders, param: "taxOrder" },
          { title: "By family", items: home.facets.families, param: "family" },
          { title: "By country", items: home.facets.countries, param: "country" },
        ] as const).map((group) => (
          <Card key={group.title}>
            <CardContent className="space-y-4">
              <h2 className="font-serif text-2xl font-semibold text-[var(--foreground)]">
                {group.title}
              </h2>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <Link
                    key={`${group.title}-${item.value}`}
                    href={`/explorer?${group.param}=${encodeURIComponent(item.value)}`}
                    className="flex items-center justify-between rounded-2xl bg-[var(--muted)] px-4 py-3 text-sm transition hover:bg-[var(--panel)]"
                  >
                    <span>{item.value}</span>
                    <span className="text-[var(--muted-foreground)]">{item.count}</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
              Highlighted records
            </p>
            <h2 className="font-serif text-3xl font-semibold text-[var(--foreground)]">
              Visual specimens with media attached
            </h2>
          </div>
          <Link href="/explorer">
            <Button variant="secondary">Browse all</Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {highlights.map((item) => (
            <RecordSummaryCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
