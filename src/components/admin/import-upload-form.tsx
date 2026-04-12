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
          <Label htmlFor="file">Excel workbook</Label>
          <Input id="file" name="file" type="file" accept=".xlsx,.xls" />
          {isVercel ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              Large files can fail on Vercel with a `413 payload too large`. If your workbook is
              bigger than 4.5 MB, use the URL import below.
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

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Vercel-safe fallback
        </p>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Paste a public workbook URL or a Google Sheets share link. The server downloads the file
          itself and converts Google Sheets links automatically, which avoids Vercel&apos;s request
          payload limit.
        </p>
      </div>

      <form
        action="/admin/imports/url"
        method="post"
        className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end"
      >
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <div className="space-y-2">
          <Label htmlFor="sourceUrl">Workbook URL</Label>
          <Input
            id="sourceUrl"
            name="sourceUrl"
            type="url"
            placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" name="dryRun" value="off" variant="secondary">
            Import URL into catalogue
          </Button>
          {showDryRun ? (
            <Button type="submit" name="dryRun" value="on" variant="ghost">
              Preview URL only
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
