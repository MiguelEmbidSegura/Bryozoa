import { importWorkbookAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ImportUploadForm() {
  return (
    <form action={importWorkbookAction} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
      <div className="space-y-2">
        <Label htmlFor="file">Excel workbook</Label>
        <Input id="file" name="file" type="file" accept=".xlsx,.xls" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Checkbox name="dryRun" defaultChecked />
          Dry run / preview
        </label>
        <Button type="submit">Run import</Button>
      </div>
    </form>
  );
}
