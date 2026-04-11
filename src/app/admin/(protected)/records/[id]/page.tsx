import Link from "next/link";
import { notFound } from "next/navigation";
import { archiveRecordAction, deleteRecordAction } from "@/app/admin/actions";
import { RecordForm } from "@/components/admin/record-form";
import { DatabaseSetupState } from "@/components/shared/database-setup-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isDatabaseConnectionError } from "@/lib/db-errors";
import { getRecordDetail } from "@/lib/records";

async function loadAdminRecordEditPageData(id: string) {
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

export default async function AdminEditRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await loadAdminRecordEditPageData(id);

  if (result.databaseUnavailable) {
    return <DatabaseSetupState title="Record editor is waiting for the database" />;
  }

  const detail = result.detail;

  if (!detail) {
    notFound();
  }

  const { record } = detail;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
            Edit record
          </p>
          <h2 className="font-serif text-4xl font-semibold text-[var(--foreground)]">
            {record.taxonomy?.taxon ?? record.register ?? "Record"}
          </h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/records/${record.id}`}>
            <Button variant="secondary">Open public view</Button>
          </Link>
          <form action={archiveRecordAction}>
            <input type="hidden" name="recordId" value={record.id} />
            <input type="hidden" name="archived" value={record.archivedAt ? "false" : "true"} />
            <Button type="submit" variant="secondary">
              {record.archivedAt ? "Restore" : "Archive"}
            </Button>
          </form>
          <form action={deleteRecordAction}>
            <input type="hidden" name="recordId" value={record.id} />
            <Button type="submit" variant="danger">
              Delete
            </Button>
          </form>
        </div>
      </section>

      <Card>
        <CardContent className="space-y-2">
          <p className="text-sm text-[var(--muted-foreground)]">
            Reimports update this record by deduplication key when possible. Manual edits are still
            tracked in the audit log.
          </p>
        </CardContent>
      </Card>

      <RecordForm
        defaultValues={{
          id: record.id,
          oid: record.oid ?? "",
          register: record.register ?? "",
          stratigraphy: record.stratigraphy ?? "",
          taxClass: record.taxonomy?.taxClass ?? "",
          taxOrder: record.taxonomy?.taxOrder ?? "",
          family: record.taxonomy?.family ?? "",
          taxon: record.taxonomy?.taxon ?? "",
          taxonAuthor: record.taxonomy?.taxonAuthor ?? "",
          verbatimIdentification: record.taxonomy?.verbatimIdentification ?? "",
          typeStatus: record.typeStatus ?? "",
          citedFigure: record.citedFigure ?? "",
          siteName: record.location?.siteName ?? "",
          minDepthMRaw: record.minDepthMRaw ?? "",
          maxDepthMRaw: record.maxDepthMRaw ?? "",
          provinceOrDistrict: record.location?.provinceOrDistrict ?? "",
          region: record.location?.region ?? "",
          country: record.location?.country ?? "",
          continentOrPlate: record.location?.continentOrPlate ?? "",
          waterBody: record.location?.waterBody ?? "",
          oceanSea: record.location?.oceanSea ?? "",
          latitudeRaw: record.location?.latitudeRaw ?? "",
          longitudeRaw: record.location?.longitudeRaw ?? "",
          radiusKmRaw: record.location?.radiusKmRaw ?? "",
          collectionDateRaw: record.collectionDateRaw ?? "",
          dateQualifier: record.dateQualifier ?? "",
          collectorRecorderRaw: record.collectorRecorderRaw ?? "",
          donorCollection: record.donorCollection ?? "",
          identifiedByRaw: record.identifiedByRaw ?? "",
          specimenCountRaw: record.specimenCountRaw ?? "",
          notes: record.notes ?? "",
          imageAuthor: record.imageAuthor ?? "",
          images: record.images.map((image, index) => ({
            position: index + 1,
            originalValue: image.originalValue,
          })),
          references: record.references.map((reference, index) => ({
            position: index + 1,
            citation: reference.citation,
          })),
          archived: Boolean(record.archivedAt),
        }}
      />
    </div>
  );
}
