import { describe, expect, it } from "vitest";
import {
  buildImportKey,
  parseCollectionDate,
  parseCoordinates,
} from "@/lib/import/normalizers";
import { DatePrecision, ImportKeySource } from "@/generated/prisma/enums";

describe("buildImportKey", () => {
  it("prefers register over oid", () => {
    const result = buildImportKey({
      Register: "MNCN_25.02_1",
      OID_: "1",
    } as Record<string, string>);

    expect(result.importKeySource).toBe(ImportKeySource.REGISTER);
    expect(result.importKey).toContain("register:");
  });

  it("falls back to a stable generated key", () => {
    const row = {
      Class: "Stenolaemata",
      Order_: "Cyclostomatida",
      Family: "Crisiidae",
      Taxon: "Crisia ramosa",
      Site: "Unknown",
      Country: "Unknown",
      Collection_date: "00/00/1991",
      Notes: "Example",
    } as Record<string, string>;

    const first = buildImportKey(row);
    const second = buildImportKey(row);

    expect(first.importKeySource).toBe(ImportKeySource.GENERATED);
    expect(first.importKey).toBe(second.importKey);
  });
});

describe("parseCollectionDate", () => {
  it("parses partial dates into year precision", () => {
    const result = parseCollectionDate("00/00/1991", "By that year");

    expect(result.collectionDateRaw).toBe("00/00/1991");
    expect(result.parsedYear).toBe(1991);
    expect(result.parsedMonth).toBeNull();
    expect(result.parsedDay).toBeNull();
    expect(result.datePrecision).toBe(DatePrecision.YEAR);
  });
});

describe("parseCoordinates", () => {
  it("treats 0/0 as invalid map coordinates", () => {
    const result = parseCoordinates({
      Latitude: "0",
      Longitud: "0",
      "Radius (km)": "0",
    } as Record<string, string>);

    expect(result.hasValidCoordinates).toBe(false);
    expect(result.latitude).toBeNull();
    expect(result.longitude).toBeNull();
  });
});
