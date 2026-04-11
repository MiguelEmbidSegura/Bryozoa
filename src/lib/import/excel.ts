import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as XLSX from "xlsx";

export type ExcelInput =
  | { filePath: string; fileName?: string }
  | { buffer: Buffer; fileName: string };

export type ExcelSource = {
  fileName: string;
  sheetName: string;
  totalRows: number;
  headers: string[];
  sourceHash: string;
  iterateRows: () => Generator<Record<string, string>>;
};

function detectHeaders(sheet: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  const headers: Array<{ column: number; name: string }> = [];
  let blankStreak = 0;

  for (let column = range.s.c; column <= Math.min(range.e.c, 512); column++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: column })];
    const name = String(cell?.v ?? "").trim();

    if (!name) {
      blankStreak += 1;

      if (headers.length > 0 && blankStreak >= 8) {
        break;
      }

      continue;
    }

    blankStreak = 0;
    headers.push({ column, name });
  }

  return headers;
}

export async function readExcelSource(input: ExcelInput): Promise<ExcelSource> {
  const buffer = "buffer" in input ? input.buffer : await readFile(input.filePath);
  const sourceHash = createHash("sha1").update(buffer).digest("hex");
  const workbook = XLSX.read(buffer, { dense: false, raw: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  const headers = detectHeaders(sheet);

  return {
    fileName:
      input.fileName ??
      ("filePath" in input ? input.filePath.split(/[\\/]/).at(-1)! : "upload.xlsx"),
    sheetName,
    totalRows: range.e.r,
    headers: headers.map((header) => header.name),
    sourceHash,
    iterateRows: function* iterateRows() {
      for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex++) {
        const row: Record<string, string> = {};
        let hasValue = false;

        for (const header of headers) {
          const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: header.column })];
          const value = String(cell?.w ?? cell?.v ?? "").trim();
          row[header.name] = value;

          if (value) {
            hasValue = true;
          }
        }

        if (hasValue) {
          yield row;
        }
      }
    },
  };
}
