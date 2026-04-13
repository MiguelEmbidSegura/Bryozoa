import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function createPrismaClient() {
  // Keep provider-specific connection params such as sslmode=require.
  const connectionString = process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    return new Proxy(
      {},
      {
        get() {
          throw new Error("DATABASE_URL is not configured.");
        },
      },
    ) as PrismaClient;
  }

  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
      allowExitOnIdle: false,
    });

  // Prevent unhandled pool-level errors from crashing the process
  if (!globalForPrisma.pgPool) {
    pool.on("error", (err) => {
      console.error("[pg-pool] Unexpected connection error:", err.message);
    });
  }

  globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool, {
    disposeExternalPool: false,
  });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
