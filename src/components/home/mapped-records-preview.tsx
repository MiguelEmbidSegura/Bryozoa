"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight, Globe2 } from "lucide-react";
import type { MapMarker, RecordMapProps } from "@/components/map/record-map";

const PreviewRecordMap = dynamic<RecordMapProps>(
  () => import("@/components/map/record-map").then((mod) => mod.RecordMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(15,109,104,0.18),rgba(255,255,255,0.72))] md:h-[260px]" />
    ),
  },
);

export function MappedRecordsPreview({ markers }: { markers: MapMarker[] }) {
  if (markers.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--panel)] px-5 py-8 text-sm text-[var(--muted-foreground)]">
        Map preview will appear here once records with valid coordinates are available.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--panel)] shadow-lg shadow-[color:var(--shadow-color)]/10">
      <Link href="/map" aria-label="Inspect mapped records" className="absolute inset-0 z-[450]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[400] h-20 bg-gradient-to-b from-[color:color-mix(in_srgb,var(--panel)_88%,white_12%)] via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[400] flex items-center justify-between rounded-full border border-white/60 bg-[color:color-mix(in_srgb,var(--background)_72%,white_28%)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] shadow-xl shadow-[color:var(--shadow-color)]/10">
        <span className="inline-flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-[var(--accent)]" />
          Mapped localities
        </span>
        <span className="inline-flex items-center gap-1 text-[var(--muted-foreground)]">
          Open map
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
      <PreviewRecordMap
        markers={markers}
        heightClassName="h-[220px] md:h-[260px]"
        interactive={false}
        showPopups={false}
      />
    </div>
  );
}
