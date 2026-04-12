import { ImportUploadForm } from "@/components/admin/import-upload-form";
import { DatabaseSetupState } from "@/components/shared/database-setup-state";
import { Card, CardContent } from "@/components/ui/card";
import { isDatabaseConnectionError } from "@/lib/db-errors";
import { getImportHistory } from "@/lib/admin-data";

export const maxDuration = 300;

function getImportErrorMessage(
  error?: string,
  message?: string | string[],
) {
  switch (error) {
    case "missing-file":
      return "Choose an Excel workbook before running the import.";
    case "import-failed":
      return typeof message === "string" && message.trim().length > 0
        ? message
        : "The workbook could not be imported. Check the server logs for more detail.";
    default:
      return undefined;
  }
}

async function loadAdminImportsPageData() {
  try {
    const batches = await getImportHistory();
    return { batches, databaseUnavailable: false as const };
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return { databaseUnavailable: true as const };
    }

    throw error;
  }
}

export default async function AdminImportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const result = await loadAdminImportsPageData();
  const highlightedBatchId =
    typeof resolvedSearchParams.batch === "string" ? resolvedSearchParams.batch : undefined;
  const errorMessage = getImportErrorMessage(
    typeof resolvedSearchParams.error === "string" ? resolvedSearchParams.error : undefined,
    resolvedSearchParams.message,
  );

  if (result.databaseUnavailable) {
    return <DatabaseSetupState title="Imports admin is waiting for the database" />;
  }

  const { batches } = result;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          Imports
        </p>
        <h2 className="font-serif text-4xl font-semibold text-[var(--foreground)]">
          Preview and commit Excel imports
        </h2>
      </section>

      <Card>
        <CardContent className="space-y-4">
          <ImportUploadForm errorMessage={errorMessage} />
          <p className="text-sm text-[var(--muted-foreground)]">
            Dry runs store issues and counts without touching specimen records, which makes them
            useful as a preview workflow for non-technical curators.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {batches.map((batch) => (
          <Card
            key={batch.id}
            className={highlightedBatchId === batch.id ? "ring-2 ring-[var(--accent)]" : undefined}
          >
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">{batch.sourceFile}</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {batch.dryRun ? "Dry run" : "Committed"} • {batch.status} • {batch.processedRows} rows
                  </p>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Created {batch.createdCount} • Updated {batch.updatedCount} • Errors {batch.errorCount}
                </p>
              </div>

              {batch.issues.length > 0 ? (
                <div className="space-y-2">
                  {batch.issues.map((issue) => (
                    <div key={issue.id} className="rounded-2xl bg-[var(--muted)] p-4 text-sm">
                      <p className="font-medium text-[var(--foreground)]">
                        {issue.severity} • {issue.code}
                      </p>
                      <p className="text-[var(--muted-foreground)]">{issue.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">No issues stored for this batch.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
