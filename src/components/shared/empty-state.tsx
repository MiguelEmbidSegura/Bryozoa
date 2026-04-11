import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <h3 className="font-serif text-2xl font-semibold text-[var(--foreground)]">{title}</h3>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">{description}</p>
      </CardContent>
    </Card>
  );
}
