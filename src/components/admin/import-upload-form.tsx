import { importWorkbookAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ImportUploadFormProps = {
  defaultDryRun?: boolean;
  redirectTo?: string;
  showDryRun?: boolean;
  submitLabel?: string;
};

export function ImportUploadForm({
  defaultDryRun = true,
  redirectTo = "/admin/imports",
  showDryRun = true,
  submitLabel = "Run import",
}: ImportUploadFormProps) {
  return (
    <form action={importWorkbookAction} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
      <input type="hidden" name="redirectTo" value={redirectTo} />
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
