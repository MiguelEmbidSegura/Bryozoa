import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { ExplorerFilters } from "@/lib/validators";

type FacetRow = { value: string; count: number };

type FilterPanelProps = {
  action: string;
  filters: ExplorerFilters;
  facets: {
    classes: FacetRow[];
    orders: FacetRow[];
    families: FacetRow[];
    types: FacetRow[];
    countries: FacetRow[];
    regions: FacetRow[];
    waterBodies: FacetRow[];
    seas: FacetRow[];
    collectors: FacetRow[];
  };
};

function SelectField({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: FacetRow[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={value ?? ""}
        className="flex h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={`${name}-${option.value}`} value={option.value}>
            {option.value} ({option.count})
          </option>
        ))}
      </select>
    </div>
  );
}

export function FilterPanel({ action, filters, facets }: FilterPanelProps) {
  return (
    <Card>
      <CardContent>
        <form action={action} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2 xl:col-span-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              name="search"
              defaultValue={filters.search ?? ""}
              placeholder="Taxon, register, country, collector, notes..."
            />
          </div>

          <SelectField
            name="taxClass"
            label="Class"
            value={filters.taxClass}
            options={facets.classes}
          />
          <SelectField
            name="taxOrder"
            label="Order"
            value={filters.taxOrder}
            options={facets.orders}
          />
          <SelectField
            name="family"
            label="Family"
            value={filters.family}
            options={facets.families}
          />
          <SelectField
            name="typeStatus"
            label="Type"
            value={filters.typeStatus}
            options={facets.types}
          />
          <SelectField
            name="country"
            label="Country"
            value={filters.country}
            options={facets.countries}
          />
          <SelectField
            name="region"
            label="Region"
            value={filters.region}
            options={facets.regions}
          />
          <SelectField
            name="waterBody"
            label="Water body"
            value={filters.waterBody}
            options={facets.waterBodies}
          />
          <SelectField
            name="oceanSea"
            label="Ocean/Sea"
            value={filters.oceanSea}
            options={facets.seas}
          />
          <SelectField
            name="collector"
            label="Collector"
            value={filters.collector}
            options={facets.collectors}
          />

          <div className="space-y-2">
            <Label htmlFor="identifiedBy">Identified by</Label>
            <Input id="identifiedBy" name="identifiedBy" defaultValue={filters.identifiedBy ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteName">Site</Label>
            <Input id="siteName" name="siteName" defaultValue={filters.siteName ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxon">Taxon</Label>
            <Input id="taxon" name="taxon" defaultValue={filters.taxon ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sort">Sort by</Label>
            <select
              id="sort"
              name="sort"
              defaultValue={filters.sort}
              className="flex h-11 w-full rounded-2xl border border-[var(--border)] bg-[var(--panel)] px-4 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="register">Register</option>
              <option value="taxon">Taxon</option>
              <option value="country">Country</option>
              <option value="date">Date</option>
              <option value="type">Type</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearFrom">Year from</Label>
            <Input id="yearFrom" name="yearFrom" type="number" defaultValue={filters.yearFrom ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearTo">Year to</Label>
            <Input id="yearTo" name="yearTo" type="number" defaultValue={filters.yearTo ?? ""} />
          </div>

          <div className="flex flex-wrap items-center gap-4 xl:col-span-4">
            <label className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Checkbox name="hasImages" defaultChecked={filters.hasImages ?? false} />
              Only records with images
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Checkbox name="hasCoordinates" defaultChecked={filters.hasCoordinates ?? false} />
              Only valid coordinates
            </label>
            <input type="hidden" name="view" value={filters.view} />
            <input type="hidden" name="pageSize" value={String(filters.pageSize)} />
          </div>

          <div className="flex flex-wrap gap-3 xl:col-span-4">
            <Button type="submit">Apply filters</Button>
            <a
              href={action}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] px-4 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Reset
            </a>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
