import { Card, CardContent } from "@/components/ui/card";
import { getAdminUsers } from "@/lib/admin-data";

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          Users
        </p>
        <h2 className="font-serif text-4xl font-semibold text-[var(--foreground)]">
          Admin access is environment-based
        </h2>
      </section>

      <Card>
        <CardContent className="space-y-5">
          <p className="text-sm text-[var(--muted-foreground)]">
            This deployment uses the single admin account configured with environment variables.
            User creation and role management are disabled in shared-catalog mode.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-[var(--foreground)]">{user.name}</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {user.email} | {user.role} | {user.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
