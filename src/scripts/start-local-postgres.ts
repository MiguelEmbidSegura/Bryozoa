import { spawn } from "node:child_process";
import { resolve } from "node:path";
import {
  canConnectToLocalDatabase,
  cleanupRuntimeFiles,
  ensureRuntimeDirectories,
  isProcessAlive,
  readPidFile,
  readReadyState,
  writeDatabaseUrlToEnv,
} from "./embedded-postgres/shared";

async function waitForReady(timeoutMs = 60_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const ready = await readReadyState();
    if (ready && isProcessAlive(ready.pid) && (await canConnectToLocalDatabase())) {
      return ready;
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }

  return null;
}

async function waitForProcessExit(pid: number, timeoutMs = 10_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (!isProcessAlive(pid)) {
      return true;
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }

  return false;
}

async function main() {
  await ensureRuntimeDirectories();

  const existing = await readReadyState();
  if (existing && isProcessAlive(existing.pid) && (await canConnectToLocalDatabase())) {
    const databaseUrl = await writeDatabaseUrlToEnv();
    console.log("Embedded PostgreSQL is already running.");
    console.log(`DATABASE_URL updated in .env -> ${databaseUrl}`);
    return;
  }

  if (existing && isProcessAlive(existing.pid) && !(await canConnectToLocalDatabase())) {
    try {
      process.kill(existing.pid, "SIGTERM");
    } catch {
      // Best effort: cleanup continues below.
    }

    await waitForProcessExit(existing.pid);
  }

  const stalePid = await readPidFile();
  if (stalePid && !isProcessAlive(stalePid)) {
    await cleanupRuntimeFiles();
  }

  const child = spawn(
    process.execPath,
    ["--import", "tsx", resolve("src/scripts/run-embedded-postgres.ts")],
    {
      cwd: process.cwd(),
      detached: true,
      stdio: "ignore",
      env: { ...process.env },
    },
  );

  child.unref();

  const ready = await waitForReady();
  if (!ready) {
    throw new Error(
      "Embedded PostgreSQL did not report ready state in time. Check data/runtime/embedded-postgres.log for details.",
    );
  }

  const databaseUrl = await writeDatabaseUrlToEnv();

  console.log("Embedded PostgreSQL is running.");
  console.log(`DATABASE_URL updated in .env -> ${databaseUrl}`);
  console.log("Next steps:");
  console.log("  npm run prisma:migrate");
  console.log("  npm run db:seed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
