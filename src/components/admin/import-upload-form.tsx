import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ImportUploadFormProps = {
  defaultDryRun?: boolean;
  redirectTo?: string;
  showDryRun?: boolean;
  submitLabel?: string;
  errorMessage?: string;
};

export function ImportUploadForm({
  defaultDryRun = true,
  redirectTo = "/admin/imports",
  showDryRun = true,
  submitLabel = "Run import",
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
          {showDryRun ? (
            <label className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Checkbox name="dryRun" defaultChecked={defaultDryRun} />
              Dry run / preview
            </label>
          ) : null}
          <Button type="submit">{submitLabel}</Button>
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
          {showDryRun ? (
            <label className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Checkbox name="dryRun" defaultChecked={defaultDryRun} />
              Dry run / preview
            </label>
          ) : null}
          <Button type="submit" variant="secondary">
            Import from URL
          </Button>
        </div>
      </form>
    </div>
  );
}
