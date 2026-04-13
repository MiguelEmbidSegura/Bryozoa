import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/enums";
import { env } from "@/lib/env";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

const secret = new TextEncoder().encode(env.AUTH_SECRET);
const ENV_ADMIN_USER_ID = "env-admin";

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
  if (
    email.toLowerCase().trim() !== env.ADMIN_SEED_EMAIL.toLowerCase().trim() ||
    password !== env.ADMIN_SEED_PASSWORD
  ) {
    return null;
  }

  const token = await signSession({
    sub: ENV_ADMIN_USER_ID,
    email: env.ADMIN_SEED_EMAIL,
    role: UserRole.ADMIN,
    name: "BryoZoo Admin",
  });

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return {
    id: ENV_ADMIN_USER_ID,
    email: env.ADMIN_SEED_EMAIL,
    role: UserRole.ADMIN,
    name: "BryoZoo Admin",
  };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
