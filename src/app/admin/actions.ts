"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { loginWithCredentials, logout, requireAdmin } from "@/lib/auth";
import { toReadableDatabaseError } from "@/lib/db-errors";
import {
  deleteRecord,
  saveAdminUser,
  saveSpecimenRecord,
  setRecordArchived,
} from "@/lib/admin-data";
import { importBryozoaWorkbook } from "@/lib/import/service";
import {
  loginSchema,
  recordFormSchema,
  userFormSchema,
  type RecordFormValues,
  type UserFormValues,
} from "@/lib/validators";

type LoginState = {
  error?: string;
};

function getRedirectTarget(formData: FormData, fallback: string) {
  const raw = formData.get("redirectTo");

  if (typeof raw !== "string") {
    return fallback;
  }

  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return fallback;
  }

  return raw;
}

export async function loginAction(
  _previousState: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const redirectTo = getRedirectTarget(formData, "/admin");
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Please enter a valid email and password." };
  }

  let user;

  try {
    user = await loginWithCredentials(parsed.data.email, parsed.data.password);
  } catch (error) {
    return { error: toReadableDatabaseError(error) };
  }

  if (!user) {
    return { error: "Invalid credentials." };
  }

  redirect(redirectTo);
}

export async function logoutAction() {
  await logout();
  redirect("/admin/login");
}

export async function saveRecordAction(values: RecordFormValues) {
  const session = await requireAdmin();
  const parsed = recordFormSchema.parse(values);
  const id = await saveSpecimenRecord(parsed, session.userId);
  return { id };
}

export async function saveUserAction(values: UserFormValues) {
  const session = await requireAdmin();
  const parsed = userFormSchema.parse(values);
  const id = await saveAdminUser(parsed, session.userId);
  return { id };
}

export async function deleteRecordAction(formData: FormData) {
  const session = await requireAdmin();
  const recordId = z.string().min(1).parse(formData.get("recordId"));
  await deleteRecord(recordId, session.userId);
  redirect("/admin/records");
}

export async function archiveRecordAction(formData: FormData) {
  const session = await requireAdmin();
  const recordId = z.string().min(1).parse(formData.get("recordId"));
  const archived = formData.get("archived") === "true";
  await setRecordArchived(recordId, archived, session.userId);
  redirect(`/admin/records/${recordId}`);
}

export async function importWorkbookAction(formData: FormData) {
  const session = await requireAdmin();
  const file = formData.get("file");
  const dryRun = formData.get("dryRun") === "on";
  const redirectTo = getRedirectTarget(formData, "/admin/imports");

  if (!(file instanceof File) || file.size === 0) {
    redirect(`${redirectTo}?error=missing-file`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const summary = await importBryozoaWorkbook({
    buffer,
    fileName: file.name,
    dryRun,
    initiatedByUserId: session.userId,
  });

  revalidatePath("/");

  if (redirectTo === "/") {
    redirect("/");
  }

  redirect(`/admin/imports?batch=${summary.batchId}`);
}
