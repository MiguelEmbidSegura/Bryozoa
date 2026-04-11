import Link from "next/link";
import { Grid2X2, List, Map } from "lucide-react";
import { FilterPanel } from "@/components/explorer/filter-panel";
import { RecordTable } from "@/components/explorer/record-table";
import { RecordSummaryCard } from "@/components/records/record-summary-card";
import { DatabaseSetupState } from "@/components/shared/database-setup-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { isDatabaseConnectionError } from "@/lib/db-errors";
import { parseExplorerFilters } from "@/lib/validators";
import { getExplorerData, getExplorerFacets } from "@/lib/records";

export const dynamic = "force-dynamic";

function buildHref(
  current: Record<string, string | string[] | undefined>,
  updates: Record<string, string | number | boolean | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    if (Array.isArray(value)) {
      if (value[0]) params.set(key, value[0]);
    } else if (value) {
      params.set(key, value);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === "" || value === false) params.delete(key);
    else params.set(key, String(value));
  }

  return `/explorer?${params.toString()}`;
}

async function loadExplorerPageData(filters: ReturnType<typeof parseExplorerFilters>) {
  try {
    const facets = await getExplorerFacets();
    const explorer = await getExplorerData(filters);

    return { facets, explorer, databaseUnavailable: false as const };
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return { databaseUnavailable: true as const };
    }

    throw error;
  }
}

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const filters = parseExplorerFilters(resolvedSearchParams);
  const result = await loadExplorerPageData(filters);

  if (result.databaseUnavailable) {
    return <DatabaseSetupState />;
  }

  const { facets, explorer } = result;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          Explorer
        </p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-[var(--foreground)]">
              Search and filter Bryozoa records
            </h1>
            <p className="mt-2 text-[var(--muted-foreground)]">
              Server-side search, taxonomic filters, coordinate-aware views and shareable URLs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href={buildHref(resolvedSearchParams, { view: "table", page: 1 })}>
              <Button variant={filters.view === "table" ? "default" : "secondary"} size="sm">
                <List className="mr-2 h-4 w-4" />
                Table
              </Button>
            </Link>
            <Link href={buildHref(resolvedSearchParams, { view: "cards", page: 1 })}>
              <Button variant={filters.view === "cards" ? "default" : "secondary"} size="sm">
                <Grid2X2 className="mr-2 h-4 w-4" />
                Cards
              </Button>
            </Link>
            <Link href={buildHref(resolvedSearchParams, {})?.replace("/explorer?", "/map?")}>
              <Button variant="ghost" size="sm">
                <Map className="mr-2 h-4 w-4" />
                Open map
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <FilterPanel action="/explorer" filters={filters} facets={facets} />

      <section className="flex items-center justify-between gap-4">
        <p className="text-sm text-[var(--muted-foreground)]">
          Showing {explorer.items.length} of {explorer.total} result(s)
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Page {explorer.page} of {explorer.pageCount}
        </p>
      </section>

      {explorer.items.length === 0 ? (
        <EmptyState
          title="No records matched these filters"
          description="Try widening the year range, removing one filter or searching by country, family or register."
        />
      ) : filters.view === "table" ? (
        <RecordTable items={explorer.items} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {explorer.items.map((item) => (
            <RecordSummaryCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <section className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={buildHref(resolvedSearchParams, { page: Math.max(1, filters.page - 1) })}
          aria-disabled={filters.page === 1}
        >
          <Button variant="secondary" disabled={filters.page === 1}>
            Previous
          </Button>
        </Link>
        <Link
          href={buildHref(resolvedSearchParams, {
            page: Math.min(explorer.pageCount, filters.page + 1),
          })}
          aria-disabled={filters.page >= explorer.pageCount}
        >
          <Button variant="secondary" disabled={filters.page >= explorer.pageCount}>
            Next
          </Button>
        </Link>
      </section>
    </div>
  );
}
