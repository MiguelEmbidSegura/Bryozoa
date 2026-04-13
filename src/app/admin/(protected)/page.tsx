import Link from "next/link";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAdminDashboardData } from "@/lib/admin-data";
import { isGitHubCatalogSyncEnabled } from "@/lib/catalog/source";
import { env } from "@/lib/env";
import { formatNumber } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardData();
  const sourceMode = isGitHubCatalogSyncEnabled() ? "GitHub -> Vercel" : "Local JSON file";
  const sourceLocation = isGitHubCatalogSyncEnabled()
    ? `${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}@${env.GITHUB_REPO_BRANCH}:${env.CATALOG_SOURCE_PATH}`
    : env.CATALOG_SOURCE_PATH;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          Dashboard
        </p>
        <h2 className="font-serif text-4xl font-semibold text-[var(--foreground)]">
          Edit the shared Bryozoa catalogue
        </h2>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active records" value={formatNumber(stats.recordCount)} />
        <StatCard label="Archived" value={formatNumber(stats.archivedCount)} />
        <StatCard
          label="Source rows"
          value={formatNumber(stats.recordCount + stats.archivedCount)}
          hint="Published from the bundled catalogue file."
        />
        <StatCard label="Publish mode" value={sourceMode} />
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
              <Link href="/admin/records">
                <Button variant="secondary" className="w-full">
                  Browse records
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <h3 className="font-serif text-2xl font-semibold text-[var(--foreground)]">
              Publishing model
            </h3>
            <div className="space-y-3 text-sm text-[var(--muted-foreground)]">
              <p>
                The public site reads from a single shared catalogue file that ships with the
                deployment.
              </p>
              <p>
                Source: <code>{sourceLocation}</code>
              </p>
              <p>
                Record edits update that source and become public for everyone after the next
                deployment.
              </p>
              {isGitHubCatalogSyncEnabled() ? (
                <p>
                  With GitHub sync enabled, each save creates a repo commit and Vercel can publish
                  it automatically.
                </p>
              ) : (
                <p>
                  In local mode, saves update the bundled JSON and refresh the runtime snapshot
                  immediately.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
