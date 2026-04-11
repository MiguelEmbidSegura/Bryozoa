type PrismaLikeError = {
  code?: string;
  message?: string;
  meta?: unknown;
};

function getDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? "";
}

export function isDatabaseConnectionError(error: unknown) {
  const prismaError = error as PrismaLikeError | undefined;
  const code = prismaError?.code;
  const message = String(prismaError?.message ?? "");

  return (
    code === "ECONNREFUSED" ||
    code === "P1001" ||
    /ECONNREFUSED/i.test(message) ||
    /Can't reach database server/i.test(message) ||
    /connect ECONNREFUSED/i.test(message) ||
    /Server has closed the connection/i.test(message)
  );
}

export function getDatabaseConnectionSummary() {
  const url = getDatabaseUrl();
  try {
    const parsed = new URL(url);

    return {
      host: parsed.hostname || "localhost",
      port: parsed.port || "5432",
      database: parsed.pathname.replace(/^\//, "") || "postgres",
      rawUrl: url,
    };
  } catch {
    return {
      host: "localhost",
      port: "5432",
      database: "postgres",
      rawUrl: url,
    };
  }
}

export function toReadableDatabaseError(error: unknown) {
  if (isDatabaseConnectionError(error)) {
    const db = getDatabaseConnectionSummary();

    return [
      `Database connection failed.`,
      `Expected PostgreSQL at ${db.host}:${db.port} (${db.database}).`,
      `Run \`npm run db:start\` or start your own PostgreSQL server, then run migrations again.`,
    ].join(" ");
  }

  return error instanceof Error ? error.message : "Unexpected database error.";
}
