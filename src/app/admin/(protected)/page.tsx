import Link from "next/link";
import { DatabaseSetupState } from "@/components/shared/database-setup-state";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminDashboardData, getImportHistory } from "@/lib/admin-data";
import { isDatabaseConnectionError } from "@/lib/db-errors";
import { formatNumber } from "@/lib/utils";

async function loadAdminDashboardPageData() {
  try {
    const stats = await getAdminDashboardData();
    const imports = await getImportHistory();

    return { stats, imports, databaseUnavailable: false as const };
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return { databaseUnavailable: true as const };
    }

    throw error;
  }
}

export default async function AdminDashboardPage() {
  const result = await loadAdminDashboardPageData();

  if (result.databaseUnavailable) {
    return <DatabaseSetupState title="Admin is waiting for the database" />;
  }

  const { stats, imports } = result;
  const latestImport = imports[0];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          Dashboard
        </p>
        <h2 className="font-serif text-4xl font-semibold text-[var(--foreground)]">
          Manage records, imports and admin workflows
        </h2>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Active records"
          value={formatNumber(stats.recordCount)}
          hint={latestImport?.dryRun ? "Latest import was preview only" : undefined}
        />
        <StatCard label="Archived" value={formatNumber(stats.archivedCount)} />
        <StatCard label="Imports" value={formatNumber(stats.importCount)} />
        <StatCard label="Users" value={formatNumber(stats.userCount)} />
        <StatCard label="Import errors" value={formatNumber(stats.recentIssues)} />
      </section>

      {latestImport?.dryRun ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-6 py-5 text-sm text-amber-900">
          The most recent import was a <strong>preview only</strong> run. It processed{" "}
          {latestImport.processedRows} rows but did not update the database, so active records
          still shows {formatNumber(stats.recordCount)}.
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardContent className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold text-[var(--foreground)]">
              Quick actions
            </h3>
            <div className="grid gap-3">
              <Link href="/admin/records/new">
                <Button className="w-full">Create record</Button>
              </Link>
              <Link href="/admin/imports">
                <Button variant="secondary" className="w-full">
                  Import dataset
                </Button>
              </Link>
              <Link href="/admin/users">
                <Button variant="secondary" className="w-full">
                  Manage users
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-serif text-2xl font-semibold text-[var(--foreground)]">
                Recent imports
              </h3>
              <Link href="/admin/imports">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            </div>
            <div className="space-y-3">
              {imports.slice(0, 5).map((batch) => (
                <div key={batch.id} className="rounded-2xl bg-[var(--muted)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--foreground)]">{batch.sourceFile}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
                        <Badge className={batch.dryRun ? "bg-amber-100 text-amber-900" : undefined}>
                          {batch.dryRun ? "Preview only" : "Committed"}
                        </Badge>
                        <span>{batch.processedRows} processed</span>
                      </div>
                    </div>
                    <span className="text-sm text-[var(--muted-foreground)]">{batch.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
