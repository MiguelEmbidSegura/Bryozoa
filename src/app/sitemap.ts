import type { MetadataRoute } from "next";
import { getRecordSitemapEntries } from "@/lib/records";
import { absoluteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const records = await getRecordSitemapEntries();

  return ["", "/explorer", "/map", "/taxonomy"]
    .map((path) => ({
      url: absoluteUrl(path || "/"),
      lastModified: new Date(),
    }))
    .concat(
      records.map((record) => ({
        url: absoluteUrl(`/records/${record.id}`),
        lastModified: record.updatedAt,
      })),
    );
}
