"use client";

import { useMemo, useTransition } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { saveRecordAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  recordFormSchema,
  type RecordFormInput,
  type RecordFormValues,
} from "@/lib/validators";

const DynamicRecordMap = dynamic(
  () => import("@/components/map/record-map").then((mod) => mod.RecordMap),
  { ssr: false },
);

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <h3 className="font-serif text-2xl font-semibold text-[var(--foreground)]">{title}</h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function RecordForm({ defaultValues }: { defaultValues?: Partial<RecordFormValues> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<RecordFormInput, undefined, RecordFormValues>({
    resolver: zodResolver(recordFormSchema),
    defaultValues: {
      id: defaultValues?.id,
      oid: defaultValues?.oid ?? "",
      register: defaultValues?.register ?? "",
      stratigraphy: defaultValues?.stratigraphy ?? "",
      taxClass: defaultValues?.taxClass ?? "",
      taxOrder: defaultValues?.taxOrder ?? "",
      family: defaultValues?.family ?? "",
      taxon: defaultValues?.taxon ?? "",
      taxonAuthor: defaultValues?.taxonAuthor ?? "",
      verbatimIdentification: defaultValues?.verbatimIdentification ?? "",
      typeStatus: defaultValues?.typeStatus ?? "",
      citedFigure: defaultValues?.citedFigure ?? "",
      siteName: defaultValues?.siteName ?? "",
      minDepthMRaw: defaultValues?.minDepthMRaw ?? "",
      maxDepthMRaw: defaultValues?.maxDepthMRaw ?? "",
      provinceOrDistrict: defaultValues?.provinceOrDistrict ?? "",
      region: defaultValues?.region ?? "",
      country: defaultValues?.country ?? "",
      continentOrPlate: defaultValues?.continentOrPlate ?? "",
      waterBody: defaultValues?.waterBody ?? "",
      oceanSea: defaultValues?.oceanSea ?? "",
      latitudeRaw: defaultValues?.latitudeRaw ?? "",
      longitudeRaw: defaultValues?.longitudeRaw ?? "",
      radiusKmRaw: defaultValues?.radiusKmRaw ?? "",
      collectionDateRaw: defaultValues?.collectionDateRaw ?? "",
      dateQualifier: defaultValues?.dateQualifier ?? "",
      collectorRecorderRaw: defaultValues?.collectorRecorderRaw ?? "",
      donorCollection: defaultValues?.donorCollection ?? "",
      identifiedByRaw: defaultValues?.identifiedByRaw ?? "",
      specimenCountRaw: defaultValues?.specimenCountRaw ?? "",
      notes: defaultValues?.notes ?? "",
      imageAuthor: defaultValues?.imageAuthor ?? "",
      images: defaultValues?.images ?? [],
      references: defaultValues?.references ?? [],
      archived: defaultValues?.archived ?? false,
    },
  });

  const images = useFieldArray({ control: form.control, name: "images" });
  const references = useFieldArray({ control: form.control, name: "references" });
  const latitudeRaw = useWatch({ control: form.control, name: "latitudeRaw" });
  const longitudeRaw = useWatch({ control: form.control, name: "longitudeRaw" });
  const taxonValue = useWatch({ control: form.control, name: "taxon" });
  const registerValue = useWatch({ control: form.control, name: "register" });
  const countryValue = useWatch({ control: form.control, name: "country" });
  const siteNameValue = useWatch({ control: form.control, name: "siteName" });

  const latitude = Number(latitudeRaw?.replace(",", "."));
  const longitude = Number(longitudeRaw?.replace(",", "."));
  const hasMap =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;

  const mapMarkers = useMemo(
    () =>
      hasMap
        ? [
            {
              id: "draft",
              latitude,
              longitude,
              title: taxonValue || registerValue || "Draft record",
              subtitle: countryValue || siteNameValue || "",
            },
          ]
        : [],
    [countryValue, hasMap, latitude, longitude, registerValue, siteNameValue, taxonValue],
  );

  return (
    <form
      onSubmit={form.handleSubmit((values: RecordFormValues) => {
        startTransition(async () => {
          try {
            const normalizedValues = {
              ...values,
              images: values.images
                .filter((image: RecordFormValues["images"][number]) => image.originalValue.trim().length > 0)
                .map((image: RecordFormValues["images"][number], index: number) => ({
                  ...image,
                  position: index + 1,
                })),
              references: values.references
                .filter(
                  (reference: RecordFormValues["references"][number]) =>
                    reference.citation.trim().length > 0,
                )
                .map((reference: RecordFormValues["references"][number], index: number) => ({
                  ...reference,
                  position: index + 1,
                })),
            };
            const result = await saveRecordAction(normalizedValues);
            toast.success("Record saved");
            router.push(`/admin/records/${result.id}`);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not save record");
          }
        });
      })}
      className="space-y-6"
    >
      <input type="hidden" {...form.register("id")} />

      <FormSection
        title="Core record"
        description="Identifiers, stratigraphy and specimen metadata."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="register">Register</Label>
            <Input id="register" {...form.register("register")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oid">OID</Label>
            <Input id="oid" {...form.register("oid")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stratigraphy">Stratigraphy</Label>
            <Input id="stratigraphy" {...form.register("stratigraphy")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="specimenCountRaw">Specimen count</Label>
            <Input id="specimenCountRaw" {...form.register("specimenCountRaw")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="typeStatus">Type</Label>
            <Input id="typeStatus" {...form.register("typeStatus")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="citedFigure">Cited figure</Label>
            <Input id="citedFigure" {...form.register("citedFigure")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="collectionDateRaw">Collection date</Label>
            <Input id="collectionDateRaw" {...form.register("collectionDateRaw")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateQualifier">Date qualifier</Label>
            <Input id="dateQualifier" {...form.register("dateQualifier")} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Taxonomy" description="Normalized taxonomic hierarchy and verbatim ID.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="taxClass">Class</Label>
            <Input id="taxClass" {...form.register("taxClass")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxOrder">Order</Label>
            <Input id="taxOrder" {...form.register("taxOrder")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="family">Family</Label>
            <Input id="family" {...form.register("family")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxon">Taxon</Label>
            <Input id="taxon" {...form.register("taxon")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxonAuthor">Taxon author</Label>
            <Input id="taxonAuthor" {...form.register("taxonAuthor")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verbatimIdentification">Verbatim ID</Label>
            <Input id="verbatimIdentification" {...form.register("verbatimIdentification")} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Location" description="Text locality plus map-reviewable coordinates.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="siteName">Site</Label>
            <Input id="siteName" {...form.register("siteName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provinceOrDistrict">Province / district</Label>
            <Input id="provinceOrDistrict" {...form.register("provinceOrDistrict")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Input id="region" {...form.register("region")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...form.register("country")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="continentOrPlate">Continent / plate</Label>
            <Input id="continentOrPlate" {...form.register("continentOrPlate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="waterBody">Water body</Label>
            <Input id="waterBody" {...form.register("waterBody")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oceanSea">Ocean / Sea</Label>
            <Input id="oceanSea" {...form.register("oceanSea")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="latitudeRaw">Latitude</Label>
            <Input id="latitudeRaw" {...form.register("latitudeRaw")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitudeRaw">Longitude</Label>
            <Input id="longitudeRaw" {...form.register("longitudeRaw")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="radiusKmRaw">Radius km</Label>
            <Input id="radiusKmRaw" {...form.register("radiusKmRaw")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minDepthMRaw">Min depth m</Label>
            <Input id="minDepthMRaw" {...form.register("minDepthMRaw")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxDepthMRaw">Max depth m</Label>
            <Input id="maxDepthMRaw" {...form.register("maxDepthMRaw")} />
          </div>
        </div>

        {hasMap ? <DynamicRecordMap markers={mapMarkers} heightClassName="h-80" /> : null}
      </FormSection>

      <FormSection title="People and notes" description="Collector, identifier, donor and free notes.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="collectorRecorderRaw">Collector / Recorder</Label>
            <Input id="collectorRecorderRaw" {...form.register("collectorRecorderRaw")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="identifiedByRaw">Identified by</Label>
            <Input id="identifiedByRaw" {...form.register("identifiedByRaw")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donorCollection">Donor / Collection</Label>
            <Input id="donorCollection" {...form.register("donorCollection")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imageAuthor">Image author</Label>
            <Input id="imageAuthor" {...form.register("imageAuthor")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...form.register("notes")} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Images" description="Add URLs or filename references in the desired order.">
        <div className="space-y-3">
          {images.fields.map((field, index) => (
            <div key={field.id} className="flex gap-3">
              <Input
                {...form.register(`images.${index}.originalValue`)}
                placeholder="https://... or filename"
              />
              <Button type="button" variant="secondary" onClick={() => images.remove(index)}>
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => images.append({ position: images.fields.length + 1, originalValue: "" })}
          >
            Add image
          </Button>
        </div>
      </FormSection>

      <FormSection title="References" description="Up to four bibliographic references per record.">
        <div className="space-y-3">
          {references.fields.map((field, index) => (
            <div key={field.id} className="flex gap-3">
              <Input {...form.register(`references.${index}.citation`)} placeholder="Full citation" />
              <Button type="button" variant="secondary" onClick={() => references.remove(index)}>
                Remove
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              references.append({ position: references.fields.length + 1, citation: "" })
            }
          >
            Add reference
          </Button>
        </div>
      </FormSection>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <input type="checkbox" {...form.register("archived")} />
            Archived
          </label>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save record"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
