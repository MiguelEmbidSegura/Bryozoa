import Link from "next/link";
import { Database, Home, LayoutDashboard, LogOut } from "lucide-react";
import { logoutAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/records", label: "Records", icon: Database },
];

export function AdminShell({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <aside className="hidden w-72 shrink-0 rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-5 lg:block">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Admin</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-[var(--foreground)]">
            Curatorial workspace
          </h2>
        </div>

        <nav className="space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <Home className="h-4 w-4" />
            Public site
          </Link>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <header className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Signed in
              </p>
              <h1 className="font-serif text-3xl font-semibold text-[var(--foreground)]">
                {userName}
              </h1>
            </div>

            <form action={logoutAction}>
              <Button type="submit" variant="secondary">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </form>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
