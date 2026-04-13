import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { ImportInput, ImportRow, TabularImportSource } from "@/lib/import/types";

type JsonEnvelope = {
  sheetName?: unknown;
  headers?: unknown;
  rows?: unknown;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringifyCellValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  return JSON.stringify(value);
}

function getInputFileName(input: ImportInput) {
  return input.fileName ?? ("filePath" in input ? input.filePath.split(/[\\/]/).at(-1)! : "upload.json");
}

function normalizeHeaders(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const headers: string[] = [];

  for (const entry of value) {
    const header = stringifyCellValue(entry);

    if (!header || seen.has(header)) {
      continue;
    }

    seen.add(header);
    headers.push(header);
  }

  return headers;
}

function getRowObjects(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error(
      "The JSON file must contain either an array of rows or an object with a top-level \"rows\" array.",
    );
  }

  return value.map((row, index) => {
    if (!isPlainObject(row)) {
      throw new Error(`Row ${index + 1} in the JSON file is not an object.`);
    }

    return row;
  });
}

function collectHeadersFromRows(rows: Array<Record<string, unknown>>) {
  const seen = new Set<string>();
  const headers: string[] = [];

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      const header = key.trim();

      if (!header || seen.has(header)) {
        continue;
      }

      seen.add(header);
      headers.push(header);
    }
  }

  return headers;
}

function hasAnyValue(row: Record<string, unknown>, headers: string[]) {
  return headers.some((header) => stringifyCellValue(row[header]).length > 0);
}

function normalizeRow(row: Record<string, unknown>, headers: string[]): ImportRow {
  const normalized: ImportRow = {};

  for (const header of headers) {
    normalized[header] = stringifyCellValue(row[header]);
  }

  return normalized;
}

export async function readJsonSource(input: ImportInput): Promise<TabularImportSource> {
  const buffer = "buffer" in input ? input.buffer : await readFile(input.filePath);
  const sourceHash = createHash("sha1").update(buffer).digest("hex");
  const rawText = buffer.toString("utf8").replace(/^\uFEFF/, "");

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error("The JSON file is not valid.");
  }

  const envelope = isPlainObject(parsed) ? (parsed as JsonEnvelope) : null;
  const rows = getRowObjects(Array.isArray(parsed) ? parsed : envelope?.rows);
  const headers = normalizeHeaders(envelope?.headers);
  const effectiveHeaders = headers.length > 0 ? headers : collectHeadersFromRows(rows);

  if (effectiveHeaders.length === 0) {
    throw new Error("The JSON file does not contain any headers.");
  }

  const populatedRows = rows.filter((row) => hasAnyValue(row, effectiveHeaders));

  if (populatedRows.length === 0) {
    throw new Error("The JSON file does not contain any populated rows.");
  }

  const sheetName =
    envelope && typeof envelope.sheetName === "string" && envelope.sheetName.trim().length > 0
      ? envelope.sheetName.trim()
      : "JSON";

  return {
    fileName: getInputFileName(input),
    sheetName,
    totalRows: populatedRows.length,
    headers: effectiveHeaders,
    sourceHash,
    sourceFormat: "json",
    iterateRows: function* iterateRows() {
      for (const row of populatedRows) {
        yield normalizeRow(row, effectiveHeaders);
      }
    },
  };
}
