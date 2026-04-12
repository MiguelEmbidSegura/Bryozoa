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
  return (
    <form
      action="/admin/imports/upload"
      method="post"
      encType="multipart/form-data"
      className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end"
    >
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {errorMessage ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 md:col-span-2">
          {errorMessage}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="file">Excel workbook</Label>
        <Input id="file" name="file" type="file" accept=".xlsx,.xls" />
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
  );
}
