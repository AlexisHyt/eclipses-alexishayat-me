import { formatDurationHM } from "@/app/components/formatters";
import { getSunWeek, SUN_WEEK_DAYS } from "@/lib/sun";

const DAY_MS = 24 * 60 * 60 * 1000;

const PLACES = [
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Quito", lat: -0.1807, lng: -78.4678 },
  { name: "Longyearbyen", lat: 78.2232, lng: 15.6469 },
];

async function main() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const place of PLACES) {
    const week = await getSunWeek(
      place.lat,
      place.lng,
      start.toISOString(),
      now.toISOString(),
    );

    if (week.days.length !== SUN_WEEK_DAYS) {
      throw new Error(`${place.name}: ${week.days.length} jours au lieu de 7.`);
    }

    for (let i = 0; i < week.days.length; i++) {
      const day = week.days[i];

      const expected = start.getTime() + i * DAY_MS;
      if (new Date(day.dayStartISO).getTime() !== expected) {
        throw new Error(`${place.name}: jour ${i} mal aligné.`);
      }

      if (day.culminationAltitude < -90 || day.culminationAltitude > 90) {
        throw new Error(
          `${place.name}: altitude de culmination invalide (${day.culminationAltitude}).`,
        );
      }

      // The culmination must fall inside the day it belongs to.
      const culmination = new Date(day.culminationISO).getTime();
      if (culmination < expected || culmination > expected + DAY_MS) {
        throw new Error(`${place.name}: culmination hors du jour ${i}.`);
      }

      if (day.regime === "normal") {
        if (day.riseISO === null || day.setISO === null) {
          continue; // A civil day may legitimately miss one of the two events.
        }

        if (day.dayLengthSec === null) {
          throw new Error(`${place.name}: durée du jour absente au jour ${i}.`);
        }

        if (day.dayLengthSec <= 0 || day.dayLengthSec >= DAY_MS / 1000) {
          throw new Error(
            `${place.name}: durée du jour invalide (${day.dayLengthSec} s).`,
          );
        }
      }

      if (day.regime === "polar-day" && day.culminationAltitude <= 0) {
        throw new Error(
          `${place.name}: jour polaire avec Soleil sous l'horizon.`,
        );
      }

      if (day.regime === "polar-night" && day.culminationAltitude > 0) {
        throw new Error(`${place.name}: nuit polaire avec Soleil au-dessus.`);
      }
    }

    console.log(
      `OK ${place.name}: Soleil actuellement à ${week.current.altitude.toFixed(1)}° (azimut ${week.current.azimuth.toFixed(1)}°).`,
    );
    console.table(
      week.days.map((day) => ({
        jour: new Date(day.dayStartISO).toLocaleDateString("fr-FR"),
        regime: day.regime,
        lever: day.riseISO
          ? new Date(day.riseISO).toLocaleTimeString("fr-FR")
          : "—",
        culmination: new Date(day.culminationISO).toLocaleTimeString("fr-FR"),
        altitude: `${day.culminationAltitude.toFixed(1)}°`,
        coucher: day.setISO
          ? new Date(day.setISO).toLocaleTimeString("fr-FR")
          : "—",
        duree:
          day.dayLengthSec !== null ? formatDurationHM(day.dayLengthSec) : "—",
      })),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
