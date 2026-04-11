import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatMaybe } from "@/lib/utils";

type RecordTableProps = {
  items: Array<{
    id: string;
    register: string | null;
    typeStatus: string | null;
    parsedYear: number | null;
    taxonomy: { family: string | null; taxon: string | null } | null;
    location: { country: string | null; siteName: string | null; hasValidCoordinates: boolean } | null;
    _count: { images: number; references: number };
  }>;
};

export function RecordTable({ items }: RecordTableProps) {
  return (
    <div className="overflow-x-auto rounded-[28px] border border-[var(--border)] bg-[var(--panel)]">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-[var(--border)] bg-[var(--muted)]/50 text-[var(--muted-foreground)]">
          <tr>
            <th className="px-4 py-3 font-medium">Register</th>
            <th className="px-4 py-3 font-medium">Taxon</th>
            <th className="px-4 py-3 font-medium">Family</th>
            <th className="px-4 py-3 font-medium">Country</th>
            <th className="px-4 py-3 font-medium">Site</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Media</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-[var(--border)] last:border-b-0">
              <td className="px-4 py-3">
                <Link href={`/records/${item.id}`} className="font-medium text-[var(--foreground)] hover:underline">
                  {formatMaybe(item.register)}
                </Link>
              </td>
              <td className="px-4 py-3">{formatMaybe(item.taxonomy?.taxon)}</td>
              <td className="px-4 py-3">{formatMaybe(item.taxonomy?.family)}</td>
              <td className="px-4 py-3">{formatMaybe(item.location?.country)}</td>
              <td className="px-4 py-3">{formatMaybe(item.location?.siteName)}</td>
              <td className="px-4 py-3">{item.parsedYear ?? "Unknown"}</td>
              <td className="px-4 py-3">
                {item.typeStatus ? <Badge>{item.typeStatus}</Badge> : <span>Unknown</span>}
              </td>
              <td className="px-4 py-3">
                {item._count.images} image(s) • {item._count.references} ref(s)
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
