import { compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuditAction, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { writeAuditLog } from "@/lib/audit";

const secret = new TextEncoder().encode(env.AUTH_SECRET);

type SessionPayload = {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
};

async function signSession(payload: SessionPayload) {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    name: payload.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, secret);

    return {
      userId: verified.payload.sub as string,
      email: verified.payload.email as string,
      role: verified.payload.role as UserRole,
      name: verified.payload.name as string,
    };
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const session = await getSession();

  if (!session || session.role !== UserRole.ADMIN) {
    redirect("/admin/login");
  }

  return session;
}

export async function loginWithCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const isValidPassword = await compare(password, user.passwordHash);

  if (!isValidPassword) {
    return null;
  }

  const token = await signSession({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await writeAuditLog({
    userId: user.id,
    action: AuditAction.LOGIN,
    entityType: "User",
    entityId: user.id,
    metadata: { email: user.email },
  });

  return user;
}

export async function logout() {
  const session = await getSession();
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);

  if (session) {
    await writeAuditLog({
      userId: session.userId,
      action: AuditAction.LOGOUT,
      entityType: "User",
      entityId: session.userId,
      metadata: { email: session.email },
    });
  }
}
