import { getMoonWeek, MOON_WEEK_DAYS } from "@/lib/moon";

const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  const paris = { lat: 48.8566, lng: 2.3522 };
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const week = await getMoonWeek(
    paris.lat,
    paris.lng,
    start.toISOString(),
    now.toISOString(),
  );

  if (week.days.length !== MOON_WEEK_DAYS) {
    throw new Error(`Nombre de jours inattendu: ${week.days.length}`);
  }

  if (!week.hasObserver) {
    throw new Error(
      "Observateur manquant alors que des coordonnées sont données.",
    );
  }

  for (let i = 0; i < week.days.length; i++) {
    const day = week.days[i];

    if (day.illumination < 0 || day.illumination > 1) {
      throw new Error(`Illumination invalide pour ${day.dayStartISO}`);
    }

    if (day.phaseAngle < 0 || day.phaseAngle >= 360) {
      throw new Error(`Angle de phase invalide pour ${day.dayStartISO}`);
    }

    if (day.ageDays < 0 || day.ageDays > 30) {
      throw new Error(`Âge lunaire invalide pour ${day.dayStartISO}`);
    }

    // The Moon stays between roughly 356 000 km and 407 000 km from Earth.
    if (day.distanceKm < 350_000 || day.distanceKm > 410_000) {
      throw new Error(`Distance invalide pour ${day.dayStartISO}`);
    }

    const expected = start.getTime() + i * DAY_MS;
    if (new Date(day.dayStartISO).getTime() !== expected) {
      throw new Error(`Jour ${i} mal aligné: ${day.dayStartISO}`);
    }
  }

  // A week covers a quarter of a lunation, so 0 or 1 quarter phase is expected.
  if (week.quarters.length > 2) {
    throw new Error(`Trop de phases principales: ${week.quarters.length}`);
  }

  console.log(
    `OK: phase actuelle ${week.current.phase} (${Math.round(week.current.illumination * 100)} %), ${week.quarters.length} phase(s) principale(s) cette semaine.`,
  );
  console.table(
    week.days.map((day) => ({
      jour: new Date(day.dayStartISO).toLocaleDateString("fr-FR"),
      phase: day.phase,
      illumination: `${Math.round(day.illumination * 100)}%`,
      age: `${day.ageDays.toFixed(1)} j`,
      lever: day.riseISO
        ? new Date(day.riseISO).toLocaleTimeString("fr-FR")
        : "—",
      coucher: day.setISO
        ? new Date(day.setISO).toLocaleTimeString("fr-FR")
        : "—",
    })),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
