import { AuditAction } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

type AuditPayload = {
  userId?: string | null;
  specimenRecordId?: string | null;
  batchId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata?: unknown;
  diff?: unknown;
};

export async function writeAuditLog(payload: AuditPayload) {
  await prisma.auditLog.create({
    data: {
      userId: payload.userId ?? null,
      specimenRecordId: payload.specimenRecordId ?? null,
      batchId: payload.batchId ?? null,
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId,
      metadata: payload.metadata as object | undefined,
      diff: payload.diff as object | undefined,
    },
  });
}
