import { hash } from "bcryptjs";
import { AuditAction, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import {
  normalizeKeyPart,
  normalizeUnknown,
  prepareImportRow,
} from "@/lib/import/normalizers";
import type { RecordFormValues, UserFormValues } from "@/lib/validators";

function recordFormToSourceRow(values: RecordFormValues) {
  return {
    OID_: values.oid ?? "",
    Register: values.register ?? "",
    Stratigrap: values.stratigraphy ?? "",
    Class: values.taxClass ?? "",
    Order_: values.taxOrder ?? "",
    Family: values.family ?? "",
    Taxon: values.taxon ?? "",
    Taxon_author: values.taxonAuthor ?? "",
    "Verbatim ID": values.verbatimIdentification ?? "",
    Type: values.typeStatus ?? "",
    Cited_Figu: values.citedFigure ?? "",
    Site: values.siteName ?? "",
    "Min_Depth (m)": values.minDepthMRaw ?? "",
    "Max_Depth (m)": values.maxDepthMRaw ?? "",
    "Province/County/District": values.provinceOrDistrict ?? "",
    "Community/Region": values.region ?? "",
    Country: values.country ?? "",
    Continent_Plate: values.continentOrPlate ?? "",
    "Water body": values.waterBody ?? "",
    Ocean_Sea: values.oceanSea ?? "",
    Latitude: values.latitudeRaw ?? "",
    Longitud: values.longitudeRaw ?? "",
    "Radius (km)": values.radiusKmRaw ?? "",
    Collection_date: values.collectionDateRaw ?? "",
    "Date Qualifier": values.dateQualifier ?? "",
    "Collector/Recorder": values.collectorRecorderRaw ?? "",
    "Donor / Collection": values.donorCollection ?? "",
    Indentifie: values.identifiedByRaw ?? "",
    Number_of_: values.specimenCountRaw ?? "",
    Notes: values.notes ?? "",
    Reference1: values.references[0]?.citation ?? "",
    Reference2: values.references[1]?.citation ?? "",
    Reference3: values.references[2]?.citation ?? "",
    Reference4: values.references[3]?.citation ?? "",
    Image1: values.images[0]?.originalValue ?? "",
    Image2: values.images[1]?.originalValue ?? "",
    Image3: values.images[2]?.originalValue ?? "",
    Image4: values.images[3]?.originalValue ?? "",
    Image5: values.images[4]?.originalValue ?? "",
    Image6: values.images[5]?.originalValue ?? "",
    Image7: values.images[6]?.originalValue ?? "",
    Image8: values.images[7]?.originalValue ?? "",
    Image9: values.images[8]?.originalValue ?? "",
    Image10: values.images[9]?.originalValue ?? "",
    Image11: values.images[10]?.originalValue ?? "",
    Image12: values.images[11]?.originalValue ?? "",
    Image13: values.images[12]?.originalValue ?? "",
    Image14: values.images[13]?.originalValue ?? "",
    Image15: values.images[14]?.originalValue ?? "",
    Image16: values.images[15]?.originalValue ?? "",
    Image17: values.images[16]?.originalValue ?? "",
    Image_auth: values.imageAuthor ?? "",
  };
}

async function ensureTaxonomy(prepared: ReturnType<typeof prepareImportRow>) {
  if (!prepared.taxonomy) return null;

  const taxonomy = await prisma.taxonomy.upsert({
    where: { normalizedKey: prepared.taxonomy.normalizedKey },
    update: prepared.taxonomy,
    create: prepared.taxonomy,
    select: { id: true },
  });

  return taxonomy.id;
}

async function ensureLocation(prepared: ReturnType<typeof prepareImportRow>) {
  if (!prepared.location) return null;

  const location = await prisma.location.upsert({
    where: { normalizedKey: prepared.location.normalizedKey },
    update: prepared.location,
    create: prepared.location,
    select: { id: true },
  });

  return location.id;
}

async function ensurePerson(rawName: string | null) {
  const normalizedName = normalizeKeyPart(normalizeUnknown(rawName));
  if (!normalizedName || !rawName) return null;

  const person = await prisma.person.upsert({
    where: { normalizedName },
    update: { name: rawName },
    create: { name: rawName, normalizedName },
    select: { id: true },
  });

  return person.id;
}

export async function saveSpecimenRecord(values: RecordFormValues, actorUserId: string) {
  const prepared = prepareImportRow(recordFormToSourceRow(values), 0);
  const taxonomyId = await ensureTaxonomy(prepared);
  const locationId = await ensureLocation(prepared);
  const collectorPersonId = await ensurePerson(prepared.collectorName);
  const identifierPersonId = await ensurePerson(prepared.identifierName);

  if (values.id) {
    const conflictingRecord = await prisma.specimenRecord.findFirst({
      where: {
        importKey: prepared.importKey,
        id: { not: values.id },
      },
      select: { id: true },
    });

    if (conflictingRecord) {
      throw new Error("Another record already uses the same deduplication key.");
    }

    const updated = await prisma.specimenRecord.update({
      where: { id: values.id },
      data: {
        importKey: prepared.importKey,
        importKeySource: prepared.importKeySource,
        taxonomyId,
        locationId,
        collectorPersonId,
        identifierPersonId,
        archivedAt: values.archived ? new Date() : null,
        ...prepared.record,
      },
      select: { id: true },
    });

    await prisma.imageAsset.deleteMany({ where: { specimenRecordId: updated.id } });
    await prisma.bibliographicReference.deleteMany({ where: { specimenRecordId: updated.id } });

    if (prepared.images.length > 0) {
      await prisma.imageAsset.createMany({
        data: prepared.images.map((image) => ({
          specimenRecordId: updated.id,
          position: image.position,
          originalValue: image.originalValue,
          url: image.url,
          fileName: image.fileName,
          isUrl: image.isUrl,
          author: image.author,
        })),
      });
    }

    if (prepared.references.length > 0) {
      await prisma.bibliographicReference.createMany({
        data: prepared.references.map((reference) => ({
          specimenRecordId: updated.id,
          position: reference.position,
          citation: reference.citation,
          normalizedCitation: reference.normalizedCitation,
        })),
      });
    }

    await writeAuditLog({
      userId: actorUserId,
      specimenRecordId: updated.id,
      action: AuditAction.UPDATE,
      entityType: "SpecimenRecord",
      entityId: updated.id,
      metadata: { importKey: prepared.importKey },
    });

    return updated.id;
  }

  const created = await prisma.specimenRecord.create({
    data: {
      importKey: prepared.importKey,
      importKeySource: prepared.importKeySource,
      taxonomyId,
      locationId,
      collectorPersonId,
      identifierPersonId,
      archivedAt: values.archived ? new Date() : null,
      ...prepared.record,
      images: {
        create: prepared.images.map((image) => ({
          position: image.position,
          originalValue: image.originalValue,
          url: image.url,
          fileName: image.fileName,
          isUrl: image.isUrl,
          author: image.author,
        })),
      },
      references: {
        create: prepared.references.map((reference) => ({
          position: reference.position,
          citation: reference.citation,
          normalizedCitation: reference.normalizedCitation,
        })),
      },
    },
    select: { id: true },
  });

  await writeAuditLog({
    userId: actorUserId,
    specimenRecordId: created.id,
    action: AuditAction.CREATE,
    entityType: "SpecimenRecord",
    entityId: created.id,
    metadata: { importKey: prepared.importKey },
  });

  return created.id;
}

export async function setRecordArchived(recordId: string, archived: boolean, actorUserId: string) {
  await prisma.specimenRecord.update({
    where: { id: recordId },
    data: { archivedAt: archived ? new Date() : null },
  });

  await writeAuditLog({
    userId: actorUserId,
    specimenRecordId: recordId,
    action: AuditAction.ARCHIVE,
    entityType: "SpecimenRecord",
    entityId: recordId,
    metadata: { archived },
  });
}

export async function deleteRecord(recordId: string, actorUserId: string) {
  await prisma.specimenRecord.delete({ where: { id: recordId } });

  await writeAuditLog({
    userId: actorUserId,
    action: AuditAction.DELETE,
    entityType: "SpecimenRecord",
    entityId: recordId,
  });
}

export async function getAdminDashboardData() {
  const recordCount = await prisma.specimenRecord.count({ where: { archivedAt: null } });
  const archivedCount = await prisma.specimenRecord.count({
    where: { archivedAt: { not: null } },
  });
  const importCount = await prisma.importBatch.count();
  const userCount = await prisma.user.count();
  const recentIssues = await prisma.importIssue.count({ where: { severity: "ERROR" } });

  return { recordCount, archivedCount, importCount, userCount, recentIssues };
}

export async function getImportHistory() {
  return prisma.importBatch.findMany({
    orderBy: { startedAt: "desc" },
    include: {
      issues: {
        orderBy: [{ severity: "desc" }, { rowNumber: "asc" }],
        take: 8,
      },
    },
    take: 20,
  });
}

export async function getAuditHistory() {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      specimenRecord: { select: { register: true } },
      batch: { select: { sourceFile: true } },
    },
    take: 100,
  });
}

export async function getAdminUsers() {
  return prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export async function saveAdminUser(values: UserFormValues, actorUserId: string) {
  const passwordHash = values.password ? await hash(values.password, 12) : undefined;

  if (values.id) {
    const updated = await prisma.user.update({
      where: { id: values.id },
      data: {
        name: values.name,
        email: values.email.toLowerCase().trim(),
        role: values.role as UserRole,
        isActive: values.isActive,
        ...(passwordHash ? { passwordHash } : {}),
      },
      select: { id: true },
    });

    await writeAuditLog({
      userId: actorUserId,
      action: AuditAction.UPDATE,
      entityType: "User",
      entityId: updated.id,
      metadata: { managedUserEmail: values.email },
    });

    return updated.id;
  }

  if (!passwordHash) {
    throw new Error("Password is required when creating a new user.");
  }

  const created = await prisma.user.create({
    data: {
      name: values.name,
      email: values.email.toLowerCase().trim(),
      role: values.role as UserRole,
      isActive: values.isActive,
      passwordHash,
    },
    select: { id: true },
  });

  await writeAuditLog({
    userId: actorUserId,
    action: AuditAction.CREATE,
    entityType: "User",
    entityId: created.id,
    metadata: { managedUserEmail: values.email },
  });

  return created.id;
}
