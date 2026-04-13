import "dotenv/config";
import { buildCatalogSnapshot, writeCatalogSnapshot } from "@/lib/catalog/snapshot";

async function main() {
  const snapshot = await buildCatalogSnapshot();
  await writeCatalogSnapshot(snapshot);
  console.log(
    JSON.stringify(
      {
        generatedAt: snapshot.generatedAt,
        records: snapshot.records.length,
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
