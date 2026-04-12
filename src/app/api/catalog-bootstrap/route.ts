import { after, NextResponse } from "next/server";
import {
  ensureCatalogBootstrapBatch,
  getCatalogBootstrapStatus,
  runCatalogBootstrapImport,
} from "@/lib/catalog-bootstrap";

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
  const ensured = await ensureCatalogBootstrapBatch();

  if (ensured.shouldStart && ensured.batchId) {
    after(async () => {
      try {
        await runCatalogBootstrapImport(ensured.batchId!);
      } catch (error) {
        console.error("[catalog-bootstrap] Automatic import failed:", error);
      }
    });
  }

  const status = await getCatalogBootstrapStatus();

  return NextResponse.json(status, {
    status: ensured.shouldStart ? 202 : 200,
    headers: {
      "cache-control": "no-store",
    },
  });
}
