import Link from "next/link";
import { DatabaseSetupState } from "@/components/shared/database-setup-state";
import { getAdminDashboardData, getImportHistory } from "@/lib/admin-data";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
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
        <StatCard label="Active records" value={formatNumber(stats.recordCount)} />
        <StatCard label="Archived" value={formatNumber(stats.archivedCount)} />
        <StatCard label="Imports" value={formatNumber(stats.importCount)} />
        <StatCard label="Users" value={formatNumber(stats.userCount)} />
        <StatCard label="Import errors" value={formatNumber(stats.recentIssues)} />
      </section>

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
                  Preview Excel import
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
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {batch.dryRun ? "Dry run" : "Committed"} • {batch.processedRows} processed
                      </p>
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
