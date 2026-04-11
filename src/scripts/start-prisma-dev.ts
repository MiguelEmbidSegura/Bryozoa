import { exec } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const execAsync = promisify(exec);
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const serverName = "bryozoo";

function ensureSchemaQuery(url: string) {
  return url.includes("schema=")
    ? url
    : `${url}${url.includes("?") ? "&" : "?"}schema=public`;
}

function parseTcpUrl(output: string) {
  const rawMatch = output.match(
    /postgres:\/\/postgres:postgres@localhost:\d+\/[^\s?]+(?:\?[^\s]+)?/i,
  );

  if (rawMatch) {
    return ensureSchemaQuery(rawMatch[0].replace(/\u0007.*$/, ""));
  }

  const portMatch = output.match(/localhost -p (\d+) -U postgres -d ([^\s\u0007]+)/i);

  if (!portMatch) {
    return null;
  }

  const [, port, database] = portMatch;
  return ensureSchemaQuery(
    `postgres://postgres:postgres@localhost:${port}/${database}?sslmode=disable`,
  );
}

async function updateEnvFile(databaseUrl: string) {
  const envPath = resolve(".env");
  const current = await readFile(envPath, "utf8");
  const next = current.match(/^DATABASE_URL=/m)
    ? current.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${databaseUrl}"`)
    : `DATABASE_URL="${databaseUrl}"\n${current}`;

  await writeFile(envPath, next, "utf8");
}

async function main() {
  await execAsync(`${npxCommand} prisma dev -d -n ${serverName}`, {
    cwd: process.cwd(),
  });

  const { stdout } = await execAsync(`${npxCommand} prisma dev ls`, {
    cwd: process.cwd(),
  });

  const databaseUrl = parseTcpUrl(stdout);

  if (!databaseUrl) {
    throw new Error(
      "Prisma Dev started, but the TCP PostgreSQL URL could not be detected from `prisma dev ls`.",
    );
  }

  await updateEnvFile(databaseUrl);

  console.log("Prisma Dev server is running.");
  console.log(`DATABASE_URL updated in .env -> ${databaseUrl}`);
  console.log("Next steps:");
  console.log("  npm run prisma:migrate");
  console.log("  npm run db:seed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
