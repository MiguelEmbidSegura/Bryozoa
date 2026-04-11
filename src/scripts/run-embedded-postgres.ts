import { join } from "node:path";
import { Client } from "pg";
import EmbeddedPostgres from "embedded-postgres";
import {
  LOCAL_POSTGRES_DATA_DIR,
  LOCAL_POSTGRES_DATABASE,
  LOCAL_POSTGRES_HOST,
  LOCAL_POSTGRES_PASSWORD,
  LOCAL_POSTGRES_PORT,
  LOCAL_POSTGRES_USER,
  appendLocalPostgresLog,
  canConnectToLocalDatabase,
  cleanupRuntimeFiles,
  ensureRuntimeDirectories,
  fileExists,
  writeReadyState,
} from "./embedded-postgres/shared";

let server: EmbeddedPostgres | null = null;
let shuttingDown = false;
let recovering = false;

async function ensureDatabaseExists() {
  const client = new Client({
    host: LOCAL_POSTGRES_HOST,
    port: LOCAL_POSTGRES_PORT,
    user: LOCAL_POSTGRES_USER,
    password: LOCAL_POSTGRES_PASSWORD,
    database: "postgres",
  });

  await client.connect();

  try {
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      LOCAL_POSTGRES_DATABASE,
    ]);

    if (existing.rowCount === 0) {
      const identifier = `"${LOCAL_POSTGRES_DATABASE.replace(/"/g, "\"\"")}"`;
      await client.query(`CREATE DATABASE ${identifier}`);
    }
  } finally {
    await client.end();
  }
}

async function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  try {
    if (server) {
      await server.stop();
    }
  } catch (error) {
    await appendLocalPostgresLog(
      `[${new Date().toISOString()}] stop error: ${
        error instanceof Error ? error.stack ?? error.message : String(error)
      }\n`,
    );
  } finally {
    await cleanupRuntimeFiles();
    process.exit(0);
  }
}

async function recoverDatabaseServer() {
  if (!server || recovering || shuttingDown) {
    return;
  }

  recovering = true;

  try {
    await appendLocalPostgresLog(
      `[${new Date().toISOString()}] Database health check failed. Attempting restart.\n`,
    );
    await server.start();
    await ensureDatabaseExists();
    await writeReadyState({
      pid: process.pid,
      port: LOCAL_POSTGRES_PORT,
      host: LOCAL_POSTGRES_HOST,
      database: LOCAL_POSTGRES_DATABASE,
      dataDir: LOCAL_POSTGRES_DATA_DIR,
      startedAt: new Date().toISOString(),
    });
    await appendLocalPostgresLog(
      `[${new Date().toISOString()}] Database restart completed successfully.\n`,
    );
  } catch (error) {
    await appendLocalPostgresLog(
      `[${new Date().toISOString()}] Database restart failed: ${
        error instanceof Error ? error.stack ?? error.message : String(error)
      }\n`,
    );
  } finally {
    recovering = false;
  }
}

async function main() {
  await ensureRuntimeDirectories();

  server = new EmbeddedPostgres({
    databaseDir: LOCAL_POSTGRES_DATA_DIR,
    user: LOCAL_POSTGRES_USER,
    password: LOCAL_POSTGRES_PASSWORD,
    port: LOCAL_POSTGRES_PORT,
    persistent: true,
    initdbFlags: ["--encoding=UTF8"],
    onLog: (message) => {
      void appendLocalPostgresLog(`[${new Date().toISOString()}] ${message}\n`);
    },
    onError: (messageOrError) => {
      const text =
        messageOrError instanceof Error
          ? messageOrError.stack ?? messageOrError.message
          : String(messageOrError);

      void appendLocalPostgresLog(`[${new Date().toISOString()}] ERROR ${text}\n`);
    },
  });

  const isInitialized = await fileExists(join(LOCAL_POSTGRES_DATA_DIR, "PG_VERSION"));
  if (!isInitialized) {
    await server.initialise();
  }

  await server.start();
  await ensureDatabaseExists();

  await writeReadyState({
    pid: process.pid,
    port: LOCAL_POSTGRES_PORT,
    host: LOCAL_POSTGRES_HOST,
    database: LOCAL_POSTGRES_DATABASE,
    dataDir: LOCAL_POSTGRES_DATA_DIR,
    startedAt: new Date().toISOString(),
  });

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
  process.on("exit", () => {
    if (!shuttingDown) {
      void cleanupRuntimeFiles();
    }
  });

  setInterval(() => {
    void (async () => {
      const isHealthy = await canConnectToLocalDatabase();
      if (!isHealthy) {
        await recoverDatabaseServer();
      }
    })();
  }, 15_000);
}

main().catch(async (error) => {
  await appendLocalPostgresLog(
    `[${new Date().toISOString()}] startup error: ${
      error instanceof Error ? error.stack ?? error.message : String(error)
    }\n`,
  );
  await cleanupRuntimeFiles();
  process.exit(1);
});
