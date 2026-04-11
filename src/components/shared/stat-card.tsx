import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-3">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          {label}
        </p>
        <p className="font-serif text-4xl font-semibold tracking-tight text-[var(--foreground)]">
          {value}
        </p>
        {hint ? <p className="text-sm text-[var(--muted-foreground)]">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
