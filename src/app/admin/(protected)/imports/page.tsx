import { ImportUploadForm } from "@/components/admin/import-upload-form";
import { DatabaseSetupState } from "@/components/shared/database-setup-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getImportHistory } from "@/lib/admin-data";
import { isDatabaseConnectionError } from "@/lib/db-errors";

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
  const latestBatch = batches[0];

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
            Imports on this page commit by default. Use preview only when you want to inspect row
            counts and issues without changing specimen records.
          </p>
        </CardContent>
      </Card>

      {latestBatch?.dryRun ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-6 py-5 text-sm text-amber-900">
          The latest batch was <strong>preview only</strong>. It processed {latestBatch.processedRows}{" "}
          rows but did not change the catalogue, so the active record count stays the same until
          you run a committed import.
        </div>
      ) : null}

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
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <Badge className={batch.dryRun ? "bg-amber-100 text-amber-900" : undefined}>
                      {batch.dryRun ? "Preview only" : "Committed"}
                    </Badge>
                    <span>{batch.status}</span>
                    <span>{batch.processedRows} rows</span>
                  </div>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Created {batch.createdCount} | Updated {batch.updatedCount} | Errors {batch.errorCount}
                </p>
              </div>

              {batch.issues.length > 0 ? (
                <div className="space-y-2">
                  {batch.issues.map((issue) => (
                    <div key={issue.id} className="rounded-2xl bg-[var(--muted)] p-4 text-sm">
                      <p className="font-medium text-[var(--foreground)]">
                        {issue.severity} | {issue.code}
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
