import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, MapPinned } from "lucide-react";
import { RecordMap } from "@/components/map/record-map";
import { ImageGallery } from "@/components/records/image-gallery";
import { CopyLinkButton } from "@/components/shared/copy-link-button";
import { DatabaseSetupState } from "@/components/shared/database-setup-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isDatabaseConnectionError } from "@/lib/db-errors";
import { getRecordDetail } from "@/lib/records";
import { absoluteUrl, formatCoordinate, formatMaybe } from "@/lib/utils";

export const dynamic = "force-dynamic";

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <h2 className="font-serif text-2xl font-semibold text-[var(--foreground)]">{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}

async function loadRecordDetailData(id: string) {
  try {
    const detail = await getRecordDetail(id);
    return { detail, databaseUnavailable: false as const };
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return { detail: null, databaseUnavailable: true as const };
    }

    throw error;
  }
}

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await loadRecordDetailData(id);

  if (result.databaseUnavailable) {
    return <DatabaseSetupState />;
  }

  const detail = result.detail;

  if (!detail) {
    notFound();
  }

  const { record, relatedByTaxon, relatedByFamily, relatedByCountry, relatedByCollector } = detail;
  const hasCoordinates =
    record.location?.hasValidCoordinates &&
    record.location.latitude !== null &&
    record.location.longitude !== null;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <CardContent className="space-y-6 p-8">
            <div className="flex flex-wrap gap-2">
              {record.typeStatus ? <Badge>{record.typeStatus}</Badge> : null}
              {hasCoordinates ? <Badge>Mapped</Badge> : null}
              <Badge>Shared catalogue</Badge>
            </div>
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
                {formatMaybe(record.register)}
              </p>
              <h1 className="font-serif text-5xl font-semibold tracking-tight text-[var(--foreground)]">
                {formatMaybe(record.taxonomy?.taxon)}
              </h1>
              <p className="text-lg text-[var(--muted-foreground)]">
                {formatMaybe(record.taxonomy?.taxonAuthor)} | {formatMaybe(record.taxonomy?.family)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href={`/api/records/${record.id}`} target="_blank" rel="noreferrer">
                <Button variant="secondary">
                  <Download className="mr-2 h-4 w-4" />
                  JSON
                </Button>
              </a>
              <a href={`/api/records/${record.id}/csv`} target="_blank" rel="noreferrer">
                <Button variant="secondary">CSV</Button>
              </a>
              <CopyLinkButton href={absoluteUrl(`/records/${record.id}`)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Key facts
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Country</p>
                <p className="font-medium">{formatMaybe(record.location?.country)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Site</p>
                <p className="font-medium">{formatMaybe(record.location?.siteName)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Collection date</p>
                <p className="font-medium">{formatMaybe(record.collectionDateRaw)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Date qualifier</p>
                <p className="font-medium">{formatMaybe(record.dateQualifier)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Collector</p>
                <p className="font-medium">{formatMaybe(record.collectorPerson?.name)}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Identifier</p>
                <p className="font-medium">{formatMaybe(record.identifierPerson?.name)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <DetailBlock title="Taxonomy">
          <div className="grid gap-4 md:grid-cols-2">
            <div><p className="text-sm text-[var(--muted-foreground)]">Class</p><p>{formatMaybe(record.taxonomy?.taxClass)}</p></div>
            <div><p className="text-sm text-[var(--muted-foreground)]">Order</p><p>{formatMaybe(record.taxonomy?.taxOrder)}</p></div>
            <div><p className="text-sm text-[var(--muted-foreground)]">Family</p><p>{formatMaybe(record.taxonomy?.family)}</p></div>
            <div><p className="text-sm text-[var(--muted-foreground)]">Taxon</p><p>{formatMaybe(record.taxonomy?.taxon)}</p></div>
            <div><p className="text-sm text-[var(--muted-foreground)]">Author</p><p>{formatMaybe(record.taxonomy?.taxonAuthor)}</p></div>
            <div><p className="text-sm text-[var(--muted-foreground)]">Verbatim ID</p><p>{formatMaybe(record.taxonomy?.verbatimIdentification)}</p></div>
          </div>
        </DetailBlock>

        <DetailBlock title="Location">
          <div className="grid gap-4 md:grid-cols-2">
            <div><p className="text-sm text-[var(--muted-foreground)]">Site</p><p>{formatMaybe(record.location?.siteName)}</p></div>
            <div><p className="text-sm text-[var(--muted-foreground)]">Region</p><p>{formatMaybe(record.location?.region)}</p></div>
            <div><p className="text-sm text-[var(--muted-foreground)]">Country</p><p>{formatMaybe(record.location?.country)}</p></div>
            <div><p className="text-sm text-[var(--muted-foreground)]">Water body</p><p>{formatMaybe(record.location?.waterBody)}</p></div>
            <div><p className="text-sm text-[var(--muted-foreground)]">Ocean / Sea</p><p>{formatMaybe(record.location?.oceanSea)}</p></div>
            <div><p className="text-sm text-[var(--muted-foreground)]">Coordinates</p><p>{formatCoordinate(record.location?.latitude)} / {formatCoordinate(record.location?.longitude)}</p></div>
          </div>
          {hasCoordinates ? (
            <RecordMap
              markers={[
                {
                  id: record.id,
                  latitude: record.location!.latitude!,
                  longitude: record.location!.longitude!,
                  title: record.taxonomy?.taxon ?? record.register ?? "Record",
                  subtitle: [record.location?.country, record.location?.siteName].filter(Boolean).join(" | "),
                },
              ]}
              heightClassName="h-72"
            />
          ) : (
            <div className="rounded-[24px] bg-[var(--muted)] p-5 text-sm text-[var(--muted-foreground)]">
              <MapPinned className="mb-2 h-5 w-5 text-[var(--accent)]" />
              This record remains searchable by site, region and country, but does not include valid
              map coordinates.
            </div>
          )}
        </DetailBlock>
      </div>

      <DetailBlock title="Chronology and specimen data">
        <div className="grid gap-4 md:grid-cols-3">
          <div><p className="text-sm text-[var(--muted-foreground)]">Raw date</p><p>{formatMaybe(record.collectionDateRaw)}</p></div>
          <div><p className="text-sm text-[var(--muted-foreground)]">Parsed Y / M / D</p><p>{record.parsedYear ?? "?"} / {record.parsedMonth ?? "?"} / {record.parsedDay ?? "?"}</p></div>
          <div><p className="text-sm text-[var(--muted-foreground)]">Date precision</p><p>{record.datePrecision}</p></div>
          <div><p className="text-sm text-[var(--muted-foreground)]">Min depth</p><p>{formatMaybe(record.minDepthMRaw)}</p></div>
          <div><p className="text-sm text-[var(--muted-foreground)]">Max depth</p><p>{formatMaybe(record.maxDepthMRaw)}</p></div>
          <div><p className="text-sm text-[var(--muted-foreground)]">Specimen count</p><p>{formatMaybe(record.specimenCountRaw)}</p></div>
        </div>
      </DetailBlock>

      <DetailBlock title="People and notes">
        <div className="grid gap-4 md:grid-cols-2">
          <div><p className="text-sm text-[var(--muted-foreground)]">Collector / Recorder</p><p>{formatMaybe(record.collectorRecorderRaw)}</p></div>
          <div><p className="text-sm text-[var(--muted-foreground)]">Identified by</p><p>{formatMaybe(record.identifiedByRaw)}</p></div>
          <div><p className="text-sm text-[var(--muted-foreground)]">Donor / Collection</p><p>{formatMaybe(record.donorCollection)}</p></div>
          <div><p className="text-sm text-[var(--muted-foreground)]">Image author</p><p>{formatMaybe(record.imageAuthor)}</p></div>
          <div className="md:col-span-2"><p className="text-sm text-[var(--muted-foreground)]">Notes</p><p>{formatMaybe(record.notes)}</p></div>
        </div>
      </DetailBlock>

      <DetailBlock title="References">
        {record.references.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No bibliographic references recorded.</p>
        ) : (
          <div className="space-y-3">
            {record.references.map((reference) => (
              <div key={reference.id} className="rounded-2xl bg-[var(--muted)] p-4 text-sm">
                {reference.citation}
              </div>
            ))}
          </div>
        )}
      </DetailBlock>

      <DetailBlock title="Images">
        {record.images.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No images linked to this record.</p>
        ) : (
          <ImageGallery images={record.images} />
        )}
      </DetailBlock>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {[
          { title: "Related by taxon", items: relatedByTaxon },
          { title: "Related by family", items: relatedByFamily },
          { title: "Related by country", items: relatedByCountry },
          { title: "Related by collector", items: relatedByCollector },
        ].map((group) => (
          <DetailBlock key={group.title} title={group.title}>
            {group.items.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No related records found.</p>
            ) : (
              <div className="space-y-3">
                {group.items.map((item) => (
                  <Link key={item.id} href={`/records/${item.id}`} className="block rounded-2xl bg-[var(--muted)] p-4">
                    <p className="font-medium text-[var(--foreground)]">{formatMaybe(item.register)}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {formatMaybe(item.taxonomy?.taxon)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </DetailBlock>
        ))}
      </div>
    </div>
  );
}
