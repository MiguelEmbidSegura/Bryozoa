import Link from "next/link";
import { DatabaseSetupState } from "@/components/shared/database-setup-state";
import { Card, CardContent } from "@/components/ui/card";
import { isDatabaseConnectionError } from "@/lib/db-errors";
import { getTaxonomyTree } from "@/lib/records";

export const dynamic = "force-dynamic";

async function loadTaxonomyPageData() {
  try {
    const tree = await getTaxonomyTree();

    return { tree, databaseUnavailable: false as const };
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return { databaseUnavailable: true as const };
    }

    throw error;
  }
}

export default async function TaxonomyPage() {
  const result = await loadTaxonomyPageData();

  if (result.databaseUnavailable) {
    return <DatabaseSetupState />;
  }

  const { tree } = result;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          Taxonomy
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-[var(--foreground)]">
          Browse the Bryozoa hierarchy
        </h1>
        <p className="max-w-3xl text-[var(--muted-foreground)]">
          Navigate from class to taxon, inspect record counts at each level and jump straight to
          the explorer with filters applied.
        </p>
      </section>

      <div className="space-y-6">
        {tree.map((classNode) => (
          <Card key={classNode.name}>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                    Class
                  </p>
                  <h2 className="font-serif text-3xl font-semibold text-[var(--foreground)]">
                    {classNode.name}
                  </h2>
                </div>
                <Link
                  href={`/explorer?taxClass=${encodeURIComponent(classNode.name)}`}
                  className="rounded-full bg-[var(--muted)] px-4 py-2 text-sm font-medium text-[var(--foreground)]"
                >
                  {classNode.count} records
                </Link>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {classNode.orders.map((orderNode) => (
                  <div key={`${classNode.name}-${orderNode.name}`} className="rounded-[24px] border border-[var(--border)] p-5">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                          Order
                        </p>
                        <h3 className="font-semibold text-[var(--foreground)]">{orderNode.name}</h3>
                      </div>
                      <Link
                        href={`/explorer?taxClass=${encodeURIComponent(classNode.name)}&taxOrder=${encodeURIComponent(orderNode.name)}`}
                        className="text-sm text-[var(--muted-foreground)]"
                      >
                        {orderNode.count}
                      </Link>
                    </div>

                    <div className="space-y-4">
                      {orderNode.families.map((familyNode) => (
                        <div key={`${orderNode.name}-${familyNode.name}`} className="rounded-2xl bg-[var(--muted)] p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <Link
                              href={`/explorer?taxClass=${encodeURIComponent(classNode.name)}&taxOrder=${encodeURIComponent(orderNode.name)}&family=${encodeURIComponent(familyNode.name)}`}
                              className="font-medium text-[var(--foreground)]"
                            >
                              {familyNode.name}
                            </Link>
                            <span className="text-sm text-[var(--muted-foreground)]">
                              {familyNode.count}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {familyNode.taxa.map((taxon) => (
                              <Link
                                key={`${familyNode.name}-${taxon.name}`}
                                href={`/explorer?taxon=${encodeURIComponent(taxon.name)}`}
                                className="rounded-full bg-[var(--panel)] px-3 py-1 text-xs text-[var(--muted-foreground)]"
                              >
                                {taxon.name} ({taxon.count})
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
