import { constants } from "node:fs";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "pg";

export const LOCAL_POSTGRES_HOST = process.env.EMBEDDED_PG_HOST ?? "127.0.0.1";
export const LOCAL_POSTGRES_PORT = Number(process.env.EMBEDDED_PG_PORT ?? "5432");
export const LOCAL_POSTGRES_USER = process.env.EMBEDDED_PG_USER ?? "postgres";
export const LOCAL_POSTGRES_PASSWORD = process.env.EMBEDDED_PG_PASSWORD ?? "postgres";
export const LOCAL_POSTGRES_DATABASE = process.env.EMBEDDED_PG_DATABASE ?? "bryozoo";
export const LOCAL_POSTGRES_DATA_DIR = resolve(process.cwd(), "data", "postgres");
export const LOCAL_POSTGRES_RUNTIME_DIR = resolve(process.cwd(), "data", "runtime");
export const LOCAL_POSTGRES_READY_FILE = resolve(
  LOCAL_POSTGRES_RUNTIME_DIR,
  "embedded-postgres.ready.json",
);
export const LOCAL_POSTGRES_PID_FILE = resolve(
  LOCAL_POSTGRES_RUNTIME_DIR,
  "embedded-postgres.pid",
);
export const LOCAL_POSTGRES_LOG_FILE = resolve(
  LOCAL_POSTGRES_RUNTIME_DIR,
  "embedded-postgres.log",
);
export const LOCAL_POSTGRES_SCHEMA = "public";

export type EmbeddedPostgresReadyState = {
  pid: number;
  port: number;
  host: string;
  database: string;
  dataDir: string;
  startedAt: string;
};

export function getLocalDatabaseUrl() {
  return `postgresql://${LOCAL_POSTGRES_USER}:${LOCAL_POSTGRES_PASSWORD}@${LOCAL_POSTGRES_HOST}:${LOCAL_POSTGRES_PORT}/${LOCAL_POSTGRES_DATABASE}?schema=${LOCAL_POSTGRES_SCHEMA}`;
}

export async function ensureRuntimeDirectories() {
  await mkdir(LOCAL_POSTGRES_DATA_DIR, { recursive: true });
  await mkdir(LOCAL_POSTGRES_RUNTIME_DIR, { recursive: true });
}

export async function fileExists(path: string) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readReadyState() {
  if (!(await fileExists(LOCAL_POSTGRES_READY_FILE))) {
    return null;
  }

  const raw = await readFile(LOCAL_POSTGRES_READY_FILE, "utf8");
  return JSON.parse(raw) as EmbeddedPostgresReadyState;
}

export async function writeReadyState(state: EmbeddedPostgresReadyState) {
  await ensureRuntimeDirectories();
  await writeFile(LOCAL_POSTGRES_READY_FILE, JSON.stringify(state, null, 2), "utf8");
  await writeFile(LOCAL_POSTGRES_PID_FILE, `${state.pid}\n`, "utf8");
}

export async function cleanupRuntimeFiles() {
  await Promise.allSettled([
    rm(LOCAL_POSTGRES_READY_FILE, { force: true }),
    rm(LOCAL_POSTGRES_PID_FILE, { force: true }),
  ]);
}

export async function readPidFile() {
  if (!(await fileExists(LOCAL_POSTGRES_PID_FILE))) {
    return null;
  }

  const raw = await readFile(LOCAL_POSTGRES_PID_FILE, "utf8");
  const pid = Number(raw.trim());
  return Number.isFinite(pid) ? pid : null;
}

export function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function writeDatabaseUrlToEnv() {
  const envPath = resolve(".env");
  const nextUrl = getLocalDatabaseUrl();
  const current = await readFile(envPath, "utf8");
  const next = current.match(/^DATABASE_URL=/m)
    ? current.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${nextUrl}"`)
    : `DATABASE_URL="${nextUrl}"\n${current}`;

  await writeFile(envPath, next, "utf8");
  return nextUrl;
}

export async function appendLocalPostgresLog(message: string) {
  await ensureRuntimeDirectories();
  await writeFile(LOCAL_POSTGRES_LOG_FILE, message, {
    encoding: "utf8",
    flag: "a",
  });
}

export async function canConnectToLocalDatabase(
  database = LOCAL_POSTGRES_DATABASE,
  timeoutMs = 4_000,
) {
  const client = new Client({
    host: LOCAL_POSTGRES_HOST,
    port: LOCAL_POSTGRES_PORT,
    user: LOCAL_POSTGRES_USER,
    password: LOCAL_POSTGRES_PASSWORD,
    database,
    connectionTimeoutMillis: timeoutMs,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}
