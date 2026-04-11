import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  cleanupRuntimeFiles,
  isProcessAlive,
  readPidFile,
  readReadyState,
} from "./embedded-postgres/shared";

const execFileAsync = promisify(execFile);

async function waitForExit(pid: number, timeoutMs = 15_000) {
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
  const ready = await readReadyState();
  const pid = ready?.pid ?? (await readPidFile());

  if (!pid) {
    await cleanupRuntimeFiles();
    console.log("Embedded PostgreSQL is not running.");
    return;
  }

  if (isProcessAlive(pid)) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Fall through to taskkill on Windows if needed.
    }

    const exited = await waitForExit(pid);

    if (!exited && process.platform === "win32") {
      await execFileAsync("taskkill", ["/PID", String(pid), "/T", "/F"]);
    }
  }

  await cleanupRuntimeFiles();
  console.log("Embedded PostgreSQL stopped.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
