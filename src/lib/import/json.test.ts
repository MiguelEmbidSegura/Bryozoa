import { describe, expect, it } from "vitest";
import { readJsonSource } from "@/lib/import/json";
import { readImportSource } from "@/lib/import/source";

describe("readJsonSource", () => {
  it("reads the canonical BryoZoo JSON envelope", async () => {
    const source = await readJsonSource({
      buffer: Buffer.from(
        JSON.stringify({
          sheetName: "ALL",
          headers: ["OID_", "Register", "Class"],
          rows: [
            { OID_: 12, Register: "MNCN-1", Class: "Gymnolaemata" },
            { OID_: null, Register: "", Class: "" },
          ],
        }),
      ),
      fileName: "ALL_Bryozoa.json",
    });

    expect(source.sourceFormat).toBe("json");
    expect(source.sheetName).toBe("ALL");
    expect(source.totalRows).toBe(1);
    expect(Array.from(source.iterateRows())).toEqual([
      { OID_: "12", Register: "MNCN-1", Class: "Gymnolaemata" },
    ]);
  });

  it("accepts a plain array of source rows", async () => {
    const source = await readJsonSource({
      buffer: Buffer.from(
        JSON.stringify([
          { OID_: "1", Register: "MNCN-1", Country: "Spain" },
          { OID_: "2", Register: "MNCN-2", Country: "France" },
        ]),
      ),
      fileName: "plain-array.json",
    });

    expect(source.headers).toEqual(["OID_", "Register", "Country"]);
    expect(source.totalRows).toBe(2);
  });
});

describe("readImportSource", () => {
  it("routes .json files through the JSON reader", async () => {
    const source = await readImportSource({
      buffer: Buffer.from(JSON.stringify([{ Register: "MNCN-1" }])),
      fileName: "records.json",
    });

    expect(source.sourceFormat).toBe("json");
    expect(Array.from(source.iterateRows())).toEqual([{ Register: "MNCN-1" }]);
  });
});
