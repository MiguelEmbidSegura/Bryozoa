export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)]/70">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-[var(--muted-foreground)] sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
        <p>BryoZoo catalog for Bryozoa records, taxonomy, locality data and imagery.</p>
        <p>Built with Next.js, Prisma and PostgreSQL.</p>
      </div>
    </footer>
  );
}
