import { UserForm } from "@/components/admin/user-form";
import { DatabaseSetupState } from "@/components/shared/database-setup-state";
import { Card, CardContent } from "@/components/ui/card";
import { isDatabaseConnectionError } from "@/lib/db-errors";
import { getAdminUsers } from "@/lib/admin-data";

async function loadAdminUsersPageData() {
  try {
    const users = await getAdminUsers();
    return { users, databaseUnavailable: false as const };
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return { databaseUnavailable: true as const };
    }

    throw error;
  }
}

export default async function AdminUsersPage() {
  const result = await loadAdminUsersPageData();

  if (result.databaseUnavailable) {
    return <DatabaseSetupState title="Users admin is waiting for the database" />;
  }

  const { users } = result;

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
          Users
        </p>
        <h2 className="font-serif text-4xl font-semibold text-[var(--foreground)]">
          Basic admin user management
        </h2>
      </section>

      <Card>
        <CardContent className="space-y-5">
          <h3 className="font-serif text-2xl font-semibold text-[var(--foreground)]">Create user</h3>
          <UserForm />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-[var(--foreground)]">{user.name}</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {user.email} • {user.role} • {user.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <UserForm
                defaultValues={{
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  isActive: user.isActive,
                }}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
