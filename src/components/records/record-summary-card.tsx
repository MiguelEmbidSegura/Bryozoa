/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Camera, Globe, MapPin, Microscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatMaybe } from "@/lib/utils";

type RecordSummaryCardProps = {
  item: {
    id: string;
    register: string | null;
    oid?: string | null;
    typeStatus?: string | null;
    parsedYear?: number | null;
    taxonomy: {
      taxClass?: string | null;
      taxOrder?: string | null;
      family?: string | null;
      taxon?: string | null;
      taxonAuthor?: string | null;
    } | null;
    location: {
      siteName?: string | null;
      country?: string | null;
      region?: string | null;
      waterBody?: string | null;
      oceanSea?: string | null;
      hasValidCoordinates?: boolean;
    } | null;
    collectorPerson?: { name?: string | null } | null;
    identifierPerson?: { name?: string | null } | null;
    images?: Array<{
      originalValue?: string | null;
      url?: string | null;
      fileName?: string | null;
      isUrl?: boolean;
    }>;
    _count?: {
      images?: number;
      references?: number;
    };
  };
};

function renderImageSource(item: RecordSummaryCardProps["item"]) {
  const image = item.images?.[0];
  if (!image) return null;
  return image.url ?? image.originalValue ?? image.fileName ?? null;
}

export function RecordSummaryCard({ item }: RecordSummaryCardProps) {
  const imageSource = renderImageSource(item);

  return (
    <Card className="group overflow-hidden transition duration-200 hover:-translate-y-0.5">
      <Link href={`/records/${item.id}`} className="block h-full">
        <div className="relative h-52 overflow-hidden border-b border-[var(--border)] bg-[var(--muted)]">
          {imageSource ? (
            <img
              src={imageSource}
              alt={item.taxonomy?.taxon ?? item.register ?? "Bryozoa record"}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(26,104,104,0.2),_transparent_65%)]">
              <Microscope className="h-12 w-12 text-[var(--muted-foreground)]" />
            </div>
          )}
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            {item.typeStatus ? <Badge>{item.typeStatus}</Badge> : null}
            {item.location?.hasValidCoordinates ? <Badge>Mapped</Badge> : null}
          </div>
        </div>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              {formatMaybe(item.register)}
            </p>
            <h3 className="font-serif text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              {formatMaybe(item.taxonomy?.taxon)}
            </h3>
            <p className="text-sm text-[var(--muted-foreground)]">
              {formatMaybe(item.taxonomy?.family)} • {formatMaybe(item.location?.country)}
            </p>
          </div>

          <div className="grid gap-2 text-sm text-[var(--muted-foreground)]">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{formatMaybe(item.location?.siteName)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span>{formatMaybe(item.location?.oceanSea ?? item.location?.waterBody)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span>
                {item._count?.images ?? 0} image(s) • {item.parsedYear ?? "date unknown"}
              </span>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
