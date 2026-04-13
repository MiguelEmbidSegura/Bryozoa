"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Database, RefreshCw } from "lucide-react";
import type { CatalogBootstrapStatus } from "@/lib/catalog-bootstrap";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function formatEta(seconds: number | null) {
  if (seconds === null || Number.isNaN(seconds)) {
    return "Calculating ETA...";
  }

  if (seconds < 60) {
    return `About ${seconds}s remaining`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `About ${minutes}m ${remainingSeconds}s remaining`;
}

async function readStatus() {
  const response = await fetch("/api/catalog-bootstrap", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not read import progress.");
  }

  return (await response.json()) as CatalogBootstrapStatus;
}

async function startBootstrap() {
  const response = await fetch("/api/catalog-bootstrap", {
    method: "POST",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not start the automatic import.");
  }

  return (await response.json()) as CatalogBootstrapStatus;
}

export function CatalogBootstrapState({
  initialStatus,
}: {
  initialStatus: CatalogBootstrapStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const hasTriggeredStart = useRef(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function syncProgress() {
      try {
        const nextStatus = await readStatus();

        if (!active) {
          return;
        }

        setStatus(nextStatus);
        setRetryMessage(null);

        if (nextStatus.state === "ready") {
          router.refresh();
          return;
        }
      } catch (error) {
        if (!active) {
          return;
        }

        setRetryMessage(error instanceof Error ? error.message : "Could not refresh progress.");
      }

      timer = setTimeout(syncProgress, status.state === "running" ? 2_000 : 3_500);
    }

    timer = setTimeout(syncProgress, 1_000);

    return () => {
      active = false;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [router, status.state]);

  useEffect(() => {
    if (hasTriggeredStart.current || status.state === "ready" || status.state === "running") {
      return;
    }

    hasTriggeredStart.current = true;

    startBootstrap()
      .then((nextStatus) => {
        setStatus(nextStatus);
        setRetryMessage(null);
      })
      .catch((error) => {
        setRetryMessage(error instanceof Error ? error.message : "Could not start the import.");
      });
  }, [status.state]);

  const percent = useMemo(() => Math.max(0, Math.min(100, status.percent)), [status.percent]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="overflow-hidden">
        <CardContent className="space-y-8 p-8 md:p-10">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--muted)]">
              <Database className="h-6 w-6 text-[var(--accent)]" />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Loading catalogue
              </p>
              <h1 className="font-serif text-4xl font-semibold text-[var(--foreground)]">
                Bryozoa data is being imported automatically
              </h1>
              <p className="max-w-3xl text-[var(--muted-foreground)]">{status.message}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--muted)] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Progress
              </p>
              <p className="mt-3 font-serif text-4xl font-semibold text-[var(--foreground)]">
                {percent}%
              </p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {status.processedRows.toLocaleString()} of {status.totalRows.toLocaleString()} rows
              </p>
            </div>

            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--muted)] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                ETA
              </p>
              <p className="mt-3 font-serif text-2xl font-semibold text-[var(--foreground)]">
                {formatEta(status.etaSeconds)}
              </p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">Status: {status.statusLabel}</p>
            </div>

            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--muted)] p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                Active records now
              </p>
              <p className="mt-3 font-serif text-4xl font-semibold text-[var(--foreground)]">
                {status.recordCount.toLocaleString()}
              </p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Target: at least {status.targetRecordFloor.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="h-4 overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              Source file: <code>{status.fileName ?? "bundled Bryozoa dataset"}</code>
            </p>
          </div>

          {retryMessage || status.failureMessage ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {retryMessage ?? status.failureMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                hasTriggeredStart.current = false;
                setStatus((current) => ({ ...current, state: "idle" }));
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry automatic import
            </Button>
            <Link href="/admin/imports">
              <Button variant="ghost">Open admin imports</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
