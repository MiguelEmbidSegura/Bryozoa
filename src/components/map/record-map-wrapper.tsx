"use client";

import dynamic from "next/dynamic";

const RecordMap = dynamic(
  () => import("@/components/map/record-map").then((mod) => mod.RecordMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[540px] rounded-[28px] border border-[var(--border)] bg-[var(--muted)]" />
    ),
  },
);

export { RecordMap };