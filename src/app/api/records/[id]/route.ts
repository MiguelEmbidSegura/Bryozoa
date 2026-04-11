import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const record = await prisma.specimenRecord.findUnique({
    where: { id },
    include: {
      taxonomy: true,
      location: true,
      collectorPerson: true,
      identifierPerson: true,
      images: { orderBy: { position: "asc" } },
      references: { orderBy: { position: "asc" } },
    },
  });

  if (!record || record.archivedAt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(record);
}
