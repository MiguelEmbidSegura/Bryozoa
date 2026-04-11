import { prisma } from "@/lib/db";

function csvEscape(value: unknown) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replace(/"/g, '""')}"`;
}

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
    return new Response("Not found", { status: 404 });
  }

  const headers = [
    "id",
    "register",
    "oid",
    "taxon",
    "family",
    "country",
    "site",
    "collectionDateRaw",
    "collector",
    "identifier",
    "references",
    "images",
  ];

  const values = [
    record.id,
    record.register,
    record.oid,
    record.taxonomy?.taxon,
    record.taxonomy?.family,
    record.location?.country,
    record.location?.siteName,
    record.collectionDateRaw,
    record.collectorPerson?.name,
    record.identifierPerson?.name,
    record.references.map((reference) => reference.citation).join(" | "),
    record.images.map((image) => image.originalValue).join(" | "),
  ];

  const csv = `${headers.join(",")}\n${values.map(csvEscape).join(",")}\n`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bryozoo-record-${record.id}.csv"`,
    },
  });
}
