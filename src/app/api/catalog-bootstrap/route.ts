import { NextResponse } from "next/server";
import { getCatalogBootstrapStatus, runCatalogBootstrapImport } from "@/lib/catalog-bootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  const status = await getCatalogBootstrapStatus();
  return NextResponse.json(status, {
    headers: {
      "cache-control": "no-store",
    },
  });
}

export async function POST() {
  await runCatalogBootstrapImport("manual-refresh");
  const status = await getCatalogBootstrapStatus();

  return NextResponse.json(status, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
