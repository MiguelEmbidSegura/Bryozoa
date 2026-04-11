import Link from "next/link";
import { Search, Map, Trees, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/explorer", label: "Explorer", icon: Search },
  { href: "/map", label: "Map", icon: Map },
  { href: "/taxonomy", label: "Taxonomy", icon: Trees },
  { href: "/admin", label: "Admin", icon: Shield },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)]/70 bg-[color:color-mix(in_srgb,var(--background)_86%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)] text-sm font-semibold text-[var(--accent-foreground)] shadow-lg shadow-[color:var(--shadow-color)]">
            BZ
          </div>
          <div>
            <p className="font-serif text-xl font-semibold tracking-tight text-[var(--foreground)]">
              BryoZoo
            </p>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
              Bryozoa catalogue
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]/85">
              by Consuelo Sendino
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <Link href="/explorer">
            <Button size="sm">Open catalogue</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
