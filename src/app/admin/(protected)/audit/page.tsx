import { Card, CardContent } from "@/components/ui/card";
import { isGitHubCatalogSyncEnabled } from "@/lib/catalog/source";
import { env } from "@/lib/env";

export default async function AdminAuditPage() {
  const repositoryTarget = isGitHubCatalogSyncEnabled()
    ? `${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}@${env.GITHUB_REPO_BRANCH}`
    : "Local development workspace";

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          Audit log
        </p>
        <h2 className="font-serif text-4xl font-semibold text-[var(--foreground)]">
          Publication history lives with the catalogue source
        </h2>
      </section>

      <Card>
        <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
          <p>
            This mode does not store a separate database audit log. The shared catalogue is tracked
            through its source history.
          </p>
          <p>
            Current target: <code>{repositoryTarget}</code>
          </p>
          <p>
            When GitHub sync is enabled, each record edit can be reviewed in the repository commit
            history and then published by Vercel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
