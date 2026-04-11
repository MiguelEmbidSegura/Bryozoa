import { FileSpreadsheet, ShieldCheck, Upload } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";
import { ImportUploadForm } from "@/components/admin/import-upload-form";
import { Card, CardContent } from "@/components/ui/card";

type SetupBatchPreview = {
  sourceFile: string;
  status: string;
  processedRows: number;
  errorCount: number;
  warningCount: number;
  dryRun: boolean;
};

export function InitialCatalogSetup({
  isAuthenticated,
  latestBatch,
}: {
  isAuthenticated: boolean;
  latestBatch?: SetupBatchPreview | null;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardContent className="space-y-8 p-8 md:p-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--muted)] px-4 py-2 text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
              Initial setup
            </div>

            <div className="space-y-4">
              <h1 className="max-w-4xl font-serif text-4xl font-semibold tracking-tight text-[var(--foreground)] md:text-5xl">
                Start the catalogue by uploading the Bryozoa Excel workbook.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[var(--muted-foreground)] md:text-lg">
                The public site stays empty until the first spreadsheet import finishes. Once the
                workbook is committed, the catalogue, taxonomy view and map become available for
                everyone.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--muted)] p-5">
                <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
                <p className="mt-3 font-medium text-[var(--foreground)]">1. Sign in</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Use the admin account before running the first import.
                </p>
              </div>

              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--muted)] p-5">
                <FileSpreadsheet className="h-5 w-5 text-[var(--accent)]" />
                <p className="mt-3 font-medium text-[var(--foreground)]">2. Choose the Excel</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Upload the `.xlsx` workbook that contains the Bryozoa records.
                </p>
              </div>

              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--muted)] p-5">
                <Upload className="h-5 w-5 text-[var(--accent)]" />
                <p className="mt-3 font-medium text-[var(--foreground)]">3. Import</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  The first import can take several minutes before the public catalogue appears.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6 p-8">
            {!isAuthenticated ? (
              <>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                    Admin login
                  </p>
                  <h2 className="font-serif text-3xl font-semibold text-[var(--foreground)]">
                    Sign in to unlock the Excel import
                  </h2>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    After signing in, this same page will switch to the upload form automatically.
                  </p>
                </div>
                <LoginForm redirectTo="/" />
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                    Upload workbook
                  </p>
                  <h2 className="font-serif text-3xl font-semibold text-[var(--foreground)]">
                    Import the first Excel now
                  </h2>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    This setup import commits directly to the database so the catalogue opens as
                    soon as it finishes.
                  </p>
                </div>
                <ImportUploadForm
                  defaultDryRun={false}
                  redirectTo="/"
                  showDryRun={false}
                  submitLabel="Import Excel and open catalogue"
                />
              </>
            )}
          </CardContent>
        </Card>
      </section>

      {latestBatch ? (
        <Card>
          <CardContent className="space-y-3">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
              Latest import attempt
            </p>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium text-[var(--foreground)]">{latestBatch.sourceFile}</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {latestBatch.dryRun ? "Dry run" : "Committed"} • {latestBatch.status}
                </p>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                Rows {latestBatch.processedRows} • Errors {latestBatch.errorCount} • Warnings{" "}
                {latestBatch.warningCount}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
