import { FilterPanel } from "@/components/explorer/filter-panel";
import { RecordMap } from "@/components/map/record-map-wrapper";
import { RecordSummaryCard } from "@/components/records/record-summary-card";
import { DatabaseSetupState } from "@/components/shared/database-setup-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { isDatabaseConnectionError } from "@/lib/db-errors";
import { getExplorerFacets, getMapData } from "@/lib/records";
import { parseExplorerFilters } from "@/lib/validators";

export const dynamic = "force-dynamic";

async function loadMapPageData(filters: ReturnType<typeof parseExplorerFilters>) {
  try {
    const facets = await getExplorerFacets();
    const markers = await getMapData(filters);

    return { facets, markers, databaseUnavailable: false as const };
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return { databaseUnavailable: true as const };
    }

    throw error;
  }
}

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const filters = parseExplorerFilters(resolvedSearchParams);
  const result = await loadMapPageData(filters);

  if (result.databaseUnavailable) {
    return <DatabaseSetupState />;
  }

  const { facets, markers } = result;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          Map view
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-[var(--foreground)]">
          Interactive locality map with clustered Bryozoa records
        </h1>
        <p className="max-w-3xl text-[var(--muted-foreground)]">
          Move the map to update the visible-area query parameters, or add a radius search below.
        </p>
      </section>

      <FilterPanel action="/map" filters={filters} facets={facets} />

      <Card>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="radiusLat">
              Radius latitude
            </label>
            <input
              id="radiusLat"
              form="radius-form"
              name="radiusLat"
              defaultValue={filters.radiusLat ?? ""}
              className="flex h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="radiusLng">
              Radius longitude
            </label>
            <input
              id="radiusLng"
              form="radius-form"
              name="radiusLng"
              defaultValue={filters.radiusLng ?? ""}
              className="flex h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]" htmlFor="radiusKm">
              Radius km
            </label>
            <input
              id="radiusKm"
              form="radius-form"
              name="radiusKm"
              defaultValue={filters.radiusKm ?? ""}
              className="flex h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 text-sm"
            />
          </div>
          <form id="radius-form" action="/map" className="flex items-end gap-3">
            {Object.entries(resolvedSearchParams).map(([key, value]) =>
              ["radiusLat", "radiusLng", "radiusKm"].includes(key) ? null : (
                <input
                  key={key}
                  type="hidden"
                  name={key}
                  value={Array.isArray(value) ? value[0] : (value ?? "")}
                />
              ),
            )}
            <button className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-foreground)]">
              Apply radius
            </button>
          </form>
        </CardContent>
      </Card>

      {markers.length === 0 ? (
        <EmptyState
          title="No mapped records"
          description="Try relaxing the filters, clearing the visible bounds or disabling radius search."
        />
      ) : (
        <RecordMap
          markers={markers
            .filter(
              (marker) =>
                marker.location?.latitude !== null &&
                marker.location?.latitude !== undefined &&
                marker.location?.longitude !== null &&
                marker.location?.longitude !== undefined,
            )
            .map((marker) => ({
              id: marker.id,
              latitude: marker.location!.latitude!,
              longitude: marker.location!.longitude!,
              title: marker.taxonomy?.taxon ?? marker.register ?? "Unknown",
              subtitle: [marker.location?.country, marker.location?.siteName].filter(Boolean).join(" | "),
            }))}
          syncBounds
        />
      )}

      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-[var(--foreground)]">
            Marker preview
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            A text fallback remains useful when no coordinates exist in the source dataset.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {markers.slice(0, 6).map((item) => (
            <RecordSummaryCard key={item.id} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
