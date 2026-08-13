import { getGlobalTotalEclipsesPage } from "@/lib/eclipses";

async function main() {
  const firstPage = await getGlobalTotalEclipsesPage(null, 5);

  if (firstPage.eclipses.length === 0) {
    throw new Error("Aucune éclipse totale mondiale trouvée.");
  }

  if (firstPage.eclipses.some((eclipse) => eclipse.scope !== "global")) {
    throw new Error("La page mondiale contient un résultat non mondial.");
  }

  if (firstPage.eclipses.some((eclipse) => eclipse.type !== "Total")) {
    throw new Error("La page mondiale contient une éclipse non totale.");
  }

  for (let i = 1; i < firstPage.eclipses.length; i++) {
    const previous = new Date(firstPage.eclipses[i - 1].peakISO).getTime();
    const current = new Date(firstPage.eclipses[i].peakISO).getTime();

    if (current <= previous) {
      throw new Error(
        "Les éclipses mondiales ne sont pas triées par date croissante.",
      );
    }
  }

  if (firstPage.nextCursorISO !== null) {
    const secondPage = await getGlobalTotalEclipsesPage(
      firstPage.nextCursorISO,
      5,
    );
    const overlap = secondPage.eclipses.find(
      (eclipse) => eclipse.peakISO === firstPage.eclipses.at(-1)?.peakISO,
    );

    if (overlap) {
      throw new Error("La pagination mondiale duplique la dernière éclipse.");
    }
  }

  console.log(
    `OK: ${firstPage.eclipses.length} éclipses totales mondiales chargées.`,
  );
  console.table(
    firstPage.eclipses.map((eclipse) => ({
      date: eclipse.peakISO,
      latitudeMax: eclipse.maxLat,
      longitudeMax: eclipse.maxLng,
    })),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
