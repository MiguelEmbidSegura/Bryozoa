import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isGitHubCatalogSyncEnabled } from "@/lib/catalog/source";
import { env } from "@/lib/env";

export default async function AdminImportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const importsDisabled =
    typeof resolvedSearchParams.error === "string" &&
    resolvedSearchParams.error === "imports-disabled";
  const sourceLocation = isGitHubCatalogSyncEnabled()
    ? `${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}@${env.GITHUB_REPO_BRANCH}:${env.CATALOG_SOURCE_PATH}`
    : env.CATALOG_SOURCE_PATH;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          Imports
        </p>
        <h2 className="font-serif text-4xl font-semibold text-[var(--foreground)]">
          Dataset imports are disabled in shared-catalog mode
        </h2>
      </section>

      <Card>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Everyone uses the same published catalogue, so admin edits happen record by record
            instead of importing new databases.
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Source file: <code>{sourceLocation}</code>
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/records">
              <Button>Open records</Button>
            </Link>
            <Link href="/admin/records/new">
              <Button variant="secondary">Create record</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {importsDisabled ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-6 py-5 text-sm text-amber-900">
          Import routes are disabled in this mode. Update records from the admin editor or commit a
          refreshed source file to GitHub.
        </div>
      ) : null}
    </div>
  );
}
