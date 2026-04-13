import Link from "next/link";
import { Database, Terminal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDatabaseConnectionSummary } from "@/lib/db-errors";

export function DatabaseSetupState({
  title = "Database setup is still pending",
  description = "The app is running, but PostgreSQL is not reachable yet.",
}: {
  title?: string;
  description?: string;
}) {
  const db = getDatabaseConnectionSummary();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="space-y-6 p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--muted)]">
              <Database className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Setup required
              </p>
              <h1 className="font-serif text-4xl font-semibold text-[var(--foreground)]">
                {title}
              </h1>
              <p className="max-w-2xl text-[var(--muted-foreground)]">{description}</p>
            </div>
          </div>

          <div className="rounded-[24px] bg-[var(--muted)] p-5 text-sm">
            <p className="font-medium text-[var(--foreground)]">Current target</p>
            <p className="mt-1 text-[var(--muted-foreground)]">
              Host: <code>{db.host}</code> / Port: <code>{db.port}</code> / Database:{" "}
              <code>{db.database}</code>
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[24px] border border-[var(--border)] p-5">
              <p className="mb-3 font-medium text-[var(--foreground)]">Fastest path here</p>
              <div className="space-y-2 text-sm text-[var(--muted-foreground)]">
                <p>
                  <code>npm run db:start</code>
                </p>
                <p>
                  <code>npm run prisma:migrate</code>
                </p>
                <p>
                  <code>npm run db:seed</code>
                </p>
                <p>
                  <code>
                    npm run import:bryozoa -- --file{" "}
                    &quot;c:/BRIOZOO/data/ALL_Bryozoa.json&quot; --commit
                  </code>
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--border)] p-5">
              <p className="mb-3 font-medium text-[var(--foreground)]">
                If you already have PostgreSQL
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Point <code>DATABASE_URL</code> in <code>.env</code> to your running server and
                rerun the migration.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/">
              <Button variant="secondary">
                <Terminal className="mr-2 h-4 w-4" />
                Retry home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
