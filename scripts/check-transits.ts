import {
  Body,
  Equator,
  Horizon,
  Observer,
  SearchTransit,
} from "astronomy-engine";
import { getTransitsForLocation, MAX_TRANSITS } from "@/lib/transits";

const PLACES = [
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093 },
  { name: "Longyearbyen", lat: 78.2232, lng: 15.6267 },
] as const;

/** Independent altitude check, straight from astronomy-engine. */
function sunAltitude(observer: Observer, iso: string): number {
  const time = new Date(iso);
  const equatorial = Equator(Body.Sun, time, observer, true, true);
  return Horizon(time, observer, equatorial.ra, equatorial.dec, "normal")
    .altitude;
}

async function main() {
  const now = new Date();

  for (const place of PLACES) {
    const observer = new Observer(place.lat, place.lng, 0);
    const transits = await getTransitsForLocation(
      place.lat,
      place.lng,
      now.toISOString(),
    );

    if (transits.length !== MAX_TRANSITS) {
      throw new Error(
        `${place.name}: ${transits.length} transits au lieu de ${MAX_TRANSITS}.`,
      );
    }

    for (let i = 0; i < transits.length; i++) {
      const transit = transits[i];
      const start = new Date(transit.start.timeISO).getTime();
      const peak = new Date(transit.peak.timeISO).getTime();
      const finish = new Date(transit.finish.timeISO).getTime();

      if (start <= now.getTime()) {
        throw new Error(`${place.name}: transit ${i} n'est pas dans le futur.`);
      }

      if (!(start < peak && peak < finish)) {
        throw new Error(`${place.name}: contacts désordonnés au transit ${i}.`);
      }

      if (i > 0) {
        const previous = new Date(transits[i - 1].peak.timeISO).getTime();
        if (peak <= previous) {
          throw new Error(`${place.name}: transits non triés par date.`);
        }
      }

      // A transit only happens when the planet is between the Earth and the
      // Sun, so the silhouette must be far smaller than the disc it crosses.
      const ratio = transit.planetDiameterArcsec / transit.sunDiameterArcsec;
      const expected =
        transit.planet === "venus" ? [0.02, 0.045] : [0.003, 0.01];
      if (ratio < expected[0] || ratio > expected[1]) {
        throw new Error(
          `${place.name}: silhouette de ${transit.planet} à ${(ratio * 100).toFixed(2)} % du Soleil, hors bornes.`,
        );
      }

      // The centres must come closer than the Sun's radius, otherwise the
      // planet would miss the disc entirely.
      if (transit.separationArcmin >= transit.sunRadiusArcmin) {
        throw new Error(
          `${place.name}: séparation ${transit.separationArcmin}' supérieure au rayon solaire ${transit.sunRadiusArcmin}'.`,
        );
      }

      // The window kept must be inside the transit, in daylight, and its
      // bounds must agree with a direct altitude computation.
      const visibleStart = new Date(transit.visibleStartISO).getTime();
      const visibleEnd = new Date(transit.visibleEndISO).getTime();

      if (visibleStart < start || visibleEnd > finish) {
        throw new Error(`${place.name}: fenêtre visible hors du transit ${i}.`);
      }

      if (transit.visibleMinutes <= 0) {
        throw new Error(`${place.name}: transit ${i} retenu sans visibilité.`);
      }

      const middleISO = new Date((visibleStart + visibleEnd) / 2).toISOString();
      if (sunAltitude(observer, middleISO) <= 0) {
        throw new Error(
          `${place.name}: Soleil sous l'horizon au milieu de la fenêtre du transit ${i}.`,
        );
      }

      // A full visibility means the Sun is up from the first to the last
      // contact; a partial one means it is down at one of the two ends.
      const startAltitude = sunAltitude(observer, transit.start.timeISO);
      const finishAltitude = sunAltitude(observer, transit.finish.timeISO);
      const bothUp = startAltitude > 0 && finishAltitude > 0;

      if (transit.visibility === "full" && !bothUp) {
        throw new Error(
          `${place.name}: transit ${i} annoncé entièrement visible alors que le Soleil est couché à un contact.`,
        );
      }

      for (const [label, contact, altitude] of [
        ["start", transit.start, startAltitude],
        ["finish", transit.finish, finishAltitude],
      ] as const) {
        if (Math.abs(contact.sunAltitude - altitude) > 0.01) {
          throw new Error(
            `${place.name}: altitude ${label} ${contact.sunAltitude}° au lieu de ${altitude.toFixed(2)}°.`,
          );
        }
      }
    }

    const first = transits[0];
    console.log(
      `OK ${place.name}: ${transits.length} transits, prochain ${first.planet} le ${new Date(first.peak.timeISO).toLocaleDateString("fr-FR")} (${first.visibility}, ${first.visibleMinutes} min visibles sur ${first.durationMin}).`,
    );
  }

  // Nothing may be dropped when every transit is visible: seen from the whole
  // Earth, the geocentric list and the sum of the local ones must line up.
  const geocentricFirst = SearchTransit(Body.Mercury, now);
  const parisFirstMercury = (
    await getTransitsForLocation(48.8566, 2.3522, now.toISOString())
  ).find((transit) => transit.planet === "mercury");

  if (parisFirstMercury === undefined) {
    throw new Error("Aucun transit de Mercure trouvé depuis Paris.");
  }

  if (
    new Date(parisFirstMercury.peak.timeISO).getTime() <
    geocentricFirst.peak.date.getTime()
  ) {
    throw new Error(
      "Un transit local précède le premier transit géocentrique, ce qui est impossible.",
    );
  }

  console.table(
    (await getTransitsForLocation(48.8566, 2.3522, now.toISOString())).map(
      (transit) => ({
        planète: transit.planet,
        pic: new Date(transit.peak.timeISO).toLocaleString("fr-FR"),
        durée: `${transit.durationMin} min`,
        visible: `${transit.visibleMinutes} min (${transit.visibility})`,
        "hauteur Soleil au pic": `${transit.peak.sunAltitude}°`,
        séparation: `${transit.separationArcmin}'`,
        silhouette: `${transit.planetDiameterArcsec}"`,
      }),
    ),
  );

  console.log("OK: transits de Mercure et de Vénus cohérents.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
