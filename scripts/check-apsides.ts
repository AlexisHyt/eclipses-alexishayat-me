import {
  getApsides,
  LUNAR_APSIS_COUNT,
  MOON_DISTANCE_RANGE_KM,
  SOLAR_APSIS_COUNT,
  SUN_DISTANCE_RANGE_KM,
} from "@/lib/apsides";

async function main() {
  const now = new Date();
  const { lunar, solar, lunarNow, solarNow } = await getApsides(
    now.toISOString(),
  );

  if (lunar.length !== LUNAR_APSIS_COUNT) {
    throw new Error(`Apsides lunaires: ${lunar.length} au lieu de 8.`);
  }

  if (solar.length !== SOLAR_APSIS_COUNT) {
    throw new Error(`Apsides solaires: ${solar.length} au lieu de 4.`);
  }

  for (const [label, events, range, kinds] of [
    ["Lune", lunar, MOON_DISTANCE_RANGE_KM, ["perigee", "apogee"]],
    ["Soleil", solar, SUN_DISTANCE_RANGE_KM, ["perihelion", "aphelion"]],
  ] as const) {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      if (!kinds.includes(event.type as never)) {
        throw new Error(`${label}: type inattendu ${event.type}.`);
      }

      if (new Date(event.timeISO).getTime() <= now.getTime()) {
        throw new Error(`${label}: apside ${i} n'est pas dans le futur.`);
      }

      if (event.distanceKm < range.min || event.distanceKm > range.max) {
        throw new Error(
          `${label}: distance hors bornes (${event.distanceKm} km).`,
        );
      }

      if (i > 0) {
        const previous = events[i - 1];
        if (
          new Date(event.timeISO).getTime() <=
          new Date(previous.timeISO).getTime()
        ) {
          throw new Error(`${label}: apsides non triées par date croissante.`);
        }

        // Perigee and apogee must alternate.
        if (event.type === previous.type) {
          throw new Error(`${label}: deux ${event.type} consécutifs.`);
        }
      }
    }
  }

  // The live position must sit on the ellipse built from the two apsides.
  // r(ν) = a(1 − e²) / (1 + e·cos ν)
  for (const [label, events, position, tolerance] of [
    ["Lune", lunar, lunarNow, 0.05],
    ["Terre", solar, solarNow, 0.01],
  ] as const) {
    if (position.trueAnomaly < 0 || position.trueAnomaly >= 360) {
      throw new Error(
        `${label}: anomalie vraie hors bornes (${position.trueAnomaly}).`,
      );
    }

    const periKm = events.find(
      (event) => event.type === "perigee" || event.type === "perihelion",
    )?.distanceKm;
    const apoKm = events.find(
      (event) => event.type === "apogee" || event.type === "aphelion",
    )?.distanceKm;

    if (periKm === undefined || apoKm === undefined) {
      throw new Error(`${label}: apsides incomplètes.`);
    }

    const a = (periKm + apoKm) / 2;
    const e = (apoKm - periKm) / (apoKm + periKm);
    const nu = (position.trueAnomaly * Math.PI) / 180;
    const expected = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
    const deviation = Math.abs(position.distanceKm - expected) / a;

    if (deviation > tolerance) {
      throw new Error(
        `${label}: la position réelle s'écarte de l'ellipse de ${(deviation * 100).toFixed(2)} % (max ${(tolerance * 100).toFixed(0)} %).`,
      );
    }

    console.log(
      `OK ${label}: anomalie vraie ${position.trueAnomaly.toFixed(1)}°, distance ${new Intl.NumberFormat("fr-FR").format(position.distanceKm)} km, écart à l'ellipse ${(deviation * 100).toFixed(2)} %.`,
    );
  }

  console.log("OK: apsides lunaires et solaires cohérentes.");
  console.table(
    [...lunar, ...solar].map((event) => ({
      type: event.type,
      date: new Date(event.timeISO).toLocaleString("fr-FR"),
      distance: `${new Intl.NumberFormat("fr-FR").format(event.distanceKm)} km`,
      au: event.distanceAu.toFixed(6),
    })),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
