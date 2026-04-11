import { DatabaseSetupState } from "@/components/shared/database-setup-state";
import { Card, CardContent } from "@/components/ui/card";
import { isDatabaseConnectionError } from "@/lib/db-errors";
import { getAuditHistory } from "@/lib/admin-data";

async function loadAdminAuditPageData() {
  try {
    const logs = await getAuditHistory();
    return { logs, databaseUnavailable: false as const };
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return { databaseUnavailable: true as const };
    }

    throw error;
  }
}

export default async function AdminAuditPage() {
  const result = await loadAdminAuditPageData();

  if (result.databaseUnavailable) {
    return <DatabaseSetupState title="Audit log is waiting for the database" />;
  }

  const { logs } = result;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          Audit log
        </p>
        <h2 className="font-serif text-4xl font-semibold text-[var(--foreground)]">
          Review curator and import activity
        </h2>
      </section>

      <Card>
        <CardContent className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-2xl bg-[var(--muted)] p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    {log.action} • {log.entityType}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {log.user?.email ?? "System"} • {log.specimenRecord?.register ?? log.batch?.sourceFile ?? log.entityId}
                  </p>
                </div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  {log.createdAt.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
