import { extname } from "node:path";
import { readExcelSource } from "@/lib/import/excel";
import { readJsonSource } from "@/lib/import/json";
import type { ImportInput } from "@/lib/import/types";

function getInputFileName(input: ImportInput) {
  return input.fileName ?? ("filePath" in input ? input.filePath.split(/[\\/]/).at(-1)! : "");
}

export async function readImportSource(input: ImportInput) {
  const fileName = getInputFileName(input);

  if (extname(fileName).toLowerCase() === ".json") {
    return readJsonSource(input);
  }

  return readExcelSource(input);
}

export type { ImportInput } from "@/lib/import/types";
