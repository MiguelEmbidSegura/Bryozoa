import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { getSession } from "@/lib/auth";
import { toReadableDatabaseError } from "@/lib/db-errors";
import { downloadRemoteWorkbook } from "@/lib/import/remote";
import { importBryozoaWorkbook } from "@/lib/import/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function getRedirectTarget(raw: FormDataEntryValue | null, fallback: string) {
  if (typeof raw !== "string") {
    return fallback;
  }

  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }

  return raw;
}

function redirectWithParams(
  request: Request,
  pathname: string,
  params: Record<string, string>,
) {
  const url = new URL(pathname, request.url);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url, { status: 303 });
}

function toSafeErrorMessage(error: unknown) {
  const message = toReadableDatabaseError(error).trim();
  return message.length > 240 ? `${message.slice(0, 237)}...` : message;
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== UserRole.ADMIN) {
    return redirectWithParams(request, "/admin/login", {
      redirectTo: "/admin/imports",
    });
  }

  const formData = await request.formData();
  const redirectTo = getRedirectTarget(formData.get("redirectTo"), "/admin/imports");
  const dryRun = formData.get("dryRun") === "on";

  try {
    const rawSourceUrl = formData.get("sourceUrl");

    if (typeof rawSourceUrl !== "string") {
      throw new Error("Paste the public URL of the Excel workbook.");
    }

    const { buffer, fileName } = await downloadRemoteWorkbook(rawSourceUrl);
    const summary = await importBryozoaWorkbook({
      buffer,
      fileName,
      dryRun,
      initiatedByUserId: session.userId,
    });

    if (redirectTo === "/") {
      return NextResponse.redirect(new URL("/", request.url), { status: 303 });
    }

    return redirectWithParams(request, "/admin/imports", {
      batch: summary.batchId,
    });
  } catch (error) {
    console.error("[import-url] Excel import failed:", error);

    return redirectWithParams(request, redirectTo, {
      error: "import-failed",
      message: toSafeErrorMessage(error),
    });
  }
}
