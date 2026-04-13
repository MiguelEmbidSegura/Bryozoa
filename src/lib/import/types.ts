export type ImportInput =
  | { filePath: string; fileName?: string }
  | { buffer: Buffer; fileName: string };

export type ImportRow = Record<string, string>;

export type TabularImportSource = {
  fileName: string;
  sheetName: string;
  totalRows: number;
  headers: string[];
  sourceHash: string;
  sourceFormat: "excel" | "json";
  iterateRows: () => Generator<ImportRow>;
};
