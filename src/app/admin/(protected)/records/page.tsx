import Link from "next/link";
import { FilterPanel } from "@/components/explorer/filter-panel";
import { RecordTable } from "@/components/explorer/record-table";
import { DatabaseSetupState } from "@/components/shared/database-setup-state";
import { Button } from "@/components/ui/button";
import { isDatabaseConnectionError } from "@/lib/db-errors";
import { parseExplorerFilters } from "@/lib/validators";
import { getExplorerData, getExplorerFacets } from "@/lib/records";

async function loadAdminRecordsPageData(filters: ReturnType<typeof parseExplorerFilters>) {
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

export default async function AdminRecordsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const filters = parseExplorerFilters(resolvedSearchParams);
  const result = await loadAdminRecordsPageData(filters);

  if (result.databaseUnavailable) {
    return <DatabaseSetupState title="Records admin is waiting for the database" />;
  }

  const { facets, explorer } = result;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
            Records
          </p>
          <h2 className="font-serif text-4xl font-semibold text-[var(--foreground)]">
            Search, edit and curate specimen records
          </h2>
        </div>
        <Link href="/admin/records/new">
          <Button>Create record</Button>
        </Link>
      </section>

      <FilterPanel action="/admin/records" filters={filters} facets={facets} />
      <RecordTable items={explorer.items} />
    </div>
  );
}
