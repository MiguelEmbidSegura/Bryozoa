import "dotenv/config";
import { resolve } from "node:path";
import { toReadableDatabaseError } from "@/lib/db-errors";
import { downloadRemoteWorkbook } from "@/lib/import/remote";
import { importBryozoaWorkbook } from "@/lib/import/service";

function readArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const file = readArg("--file");
  const url = readArg("--url");
  const limitArg = readArg("--limit");
  const dryRun = process.argv.includes("--dry-run") || !process.argv.includes("--commit");

  if ((!file && !url) || (file && url)) {
    throw new Error(
      'Usage: npm run import:bryozoa -- (--file "C:/path/file.xlsx" | --url "https://...") [--dry-run|--commit] [--limit 100]',
    );
  }

  const summary = file
    ? await importBryozoaWorkbook({
        filePath: resolve(file),
        fileName: file.split(/[\\/]/).at(-1),
        dryRun,
        limit: limitArg ? Number(limitArg) : undefined,
      })
    : await (async () => {
        const remoteWorkbook = await downloadRemoteWorkbook(url!);

        return importBryozoaWorkbook({
          buffer: remoteWorkbook.buffer,
          fileName: remoteWorkbook.fileName,
          dryRun,
          limit: limitArg ? Number(limitArg) : undefined,
        });
      })();

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(toReadableDatabaseError(error));
  process.exitCode = 1;
});
