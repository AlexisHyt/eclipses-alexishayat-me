import { fetchNasaEclipsePath } from "@/lib/nasa-eclipse-path";

async function main() {
  const result = await fetchNasaEclipsePath(
    "2027-08-02T09:01:06.496Z",
    "Total",
  );

  if (result.status !== "ok") {
    throw new Error(
      `NASA path non disponible. status=${result.status}, url=${result.sourceUrl}`,
    );
  }

  if (result.pathPoints.length < 20) {
    throw new Error(
      `Trajectoire NASA trop courte: ${result.pathPoints.length} points`,
    );
  }

  console.log(`OK: ${result.pathPoints.length} points NASA récupérés.`);
  console.log(`Source: ${result.sourceUrl}`);
  console.table(result.pathPoints.slice(0, 5));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
