import { LoginForm } from "@/components/admin/login-form";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminLoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full">
        <CardContent className="space-y-6 p-8">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
              Admin login
            </p>
            <h1 className="font-serif text-4xl font-semibold text-[var(--foreground)]">
              Secure curator access
            </h1>
            <p className="text-[var(--muted-foreground)]">
              Sign in to create, edit, archive and delete Bryozoa records.
            </p>
          </div>
          <LoginForm redirectTo="/admin/records" />
        </CardContent>
      </Card>
    </div>
  );
}
