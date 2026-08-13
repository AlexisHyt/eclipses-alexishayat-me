import { getEclipsesForLocation } from "@/lib/eclipses";

async function main() {
  const paris = { lat: 48.8566, lng: 2.3522 };
  const eclipses = await getEclipsesForLocation(paris.lat, paris.lng);

  if (eclipses.length === 0) {
    throw new Error("Aucune éclipse visible trouvée pour Paris.");
  }

  if (eclipses.length > 20) {
    throw new Error(`Trop de résultats: ${eclipses.length}`);
  }

  for (let i = 0; i < eclipses.length; i++) {
    const eclipse = eclipses[i];
    if (eclipse.obscuration <= 0 || eclipse.obscuration > 1) {
      throw new Error(
        `Obscuration invalide pour ${eclipse.peakISO}: ${eclipse.obscuration}`,
      );
    }

    if (i > 0) {
      const prev = new Date(eclipses[i - 1].peakISO).getTime();
      const current = new Date(eclipse.peakISO).getTime();
      if (current <= prev) {
        throw new Error("Les éclipses ne sont pas triées par date croissante.");
      }
    }
  }

  console.log(`OK: ${eclipses.length} éclipses visibles calculées pour Paris.`);
  console.table(
    eclipses.slice(0, 5).map((eclipse) => ({
      date: eclipse.peakISO,
      type: eclipse.type,
      obscuration: `${Math.round(eclipse.obscuration * 100)}%`,
    })),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
