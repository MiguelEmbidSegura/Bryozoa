import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { readExcelSource } from "@/lib/import/excel";

function readArg(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const file = readArg("--file");
  const out = readArg("--out");

  if (!file || !out) {
    throw new Error(
      'Usage: npm run export:bryozoa-json -- --file "C:/path/file.xlsx" --out "data/ALL_Bryozoa.json"',
    );
  }

  const inputPath = resolve(file);
  const outputPath = resolve(out);
  const source = await readExcelSource({
    filePath: inputPath,
    fileName: file.split(/[\\/]/).at(-1),
  });

  const payload = {
    format: "bryozoo-import-json-v1",
    sourceFormat: source.sourceFormat,
    originalFileName: source.fileName,
    sheetName: source.sheetName,
    sourceHash: source.sourceHash,
    totalRows: source.totalRows,
    headers: source.headers,
    rows: Array.from(source.iterateRows()),
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(payload), "utf8");

  console.log(
    JSON.stringify(
      {
        outputPath,
        totalRows: payload.totalRows,
        headers: payload.headers.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
