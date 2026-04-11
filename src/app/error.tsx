"use client";

import { DatabaseSetupState } from "@/components/shared/database-setup-state";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDatabaseError =
    /ECONNREFUSED/i.test(error.message) ||
    /Can't reach database server/i.test(error.message);

  if (isDatabaseError) {
    return (
      <div>
        <DatabaseSetupState />
        <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          <Button onClick={reset} variant="secondary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col justify-center gap-4 px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-serif text-4xl font-semibold text-[var(--foreground)]">
        Something went wrong
      </h1>
      <p className="text-[var(--muted-foreground)]">{error.message}</p>
      <div>
        <Button onClick={reset}>Retry</Button>
      </div>
    </div>
  );
}
