import { NextResponse } from "next/server";
import { UserRole } from "@/generated/prisma/enums";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== UserRole.ADMIN) {
    return redirectWithParams(request, "/admin/login", {
      redirectTo: "/admin/imports",
    });
  }

  return redirectWithParams(request, "/admin/imports", {
    error: "imports-disabled",
  });
}
