import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/utils";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const records = await prisma.specimenRecord.findMany({
    where: { archivedAt: null },
    take: 5000,
    orderBy: { updatedAt: "desc" },
    select: { id: true, updatedAt: true },
  });

  return [
    "",
    "/explorer",
    "/map",
    "/taxonomy",
  ].map((path) => ({
    url: absoluteUrl(path || "/"),
    lastModified: new Date(),
  })).concat(
    records.map((record) => ({
      url: absoluteUrl(`/records/${record.id}`),
      lastModified: record.updatedAt,
    })),
  );
}
