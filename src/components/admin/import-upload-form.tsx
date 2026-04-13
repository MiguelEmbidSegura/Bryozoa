import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ImportUploadFormProps = {
  redirectTo?: string;
  showDryRun?: boolean;
  submitLabel?: string;
  errorMessage?: string;
};

export function ImportUploadForm({
  redirectTo = "/admin/imports",
  showDryRun = true,
  submitLabel = "Import into catalogue",
  errorMessage,
}: ImportUploadFormProps) {
  const isVercel = process.env.VERCEL === "1";

  return (
    <div className="space-y-6">
      {errorMessage ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {showDryRun ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Imports on this page write to the catalogue by default. Use <strong>Preview only</strong>{" "}
          when you want to inspect counts and issues without changing the database.
        </p>
      ) : null}

      <form
        action="/admin/imports/upload"
        method="post"
        encType="multipart/form-data"
        className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end"
      >
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div className="space-y-2">
          <Label htmlFor="file">Dataset file</Label>
          <Input id="file" name="file" type="file" accept=".json,.xlsx,.xls" />
          <p className="text-xs text-[var(--muted-foreground)]">
            Accepted formats: `.json`, `.xlsx`, `.xls`. JSON can be a BryoZoo export with
            `headers` and `rows`, or a plain array of row objects keyed by the original Bryozoa
            column names.
          </p>
          {isVercel ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              Large uploads can still fail on Vercel with `413 payload too large`. For production,
              prefer the bundled local JSON file or the CLI import.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" name="dryRun" value="off">
            {submitLabel}
          </Button>
          {showDryRun ? (
            <Button type="submit" name="dryRun" value="on" variant="secondary">
              Preview only
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
