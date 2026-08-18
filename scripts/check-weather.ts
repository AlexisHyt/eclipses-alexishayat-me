import { dewPoint, getWeather, MAX_FORECAST_DAYS } from "@/lib/weather";

const PLACES = [
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093 },
] as const;

const ICON_PATTERN = /^\d{2}[dn]$/;

/** Every code the drawn icons know how to render. */
const KNOWN_ICON_GROUPS = [
  "01",
  "02",
  "03",
  "04",
  "09",
  "10",
  "11",
  "13",
  "50",
];

function assertTemperature(label: string, celsius: number) {
  // Wide, but enough to catch a unit mix-up: Kelvin or Fahrenheit would land
  // far outside this range.
  if (celsius < -90 || celsius > 60) {
    throw new Error(`${label}: température invraisemblable (${celsius} °C).`);
  }
}

async function main() {
  // The Magnus formula must agree with the textbook cases before it is trusted
  // to fill in the dew point the free endpoints do not report.
  if (Math.abs(dewPoint(20, 100) - 20) > 0.1) {
    throw new Error(
      "Point de rosée à 100 % d'humidité différent de la température.",
    );
  }

  if (Math.abs(dewPoint(20, 50) - 9.3) > 0.5) {
    throw new Error(
      `Point de rosée à 20 °C et 50 % attendu vers 9,3 °C, obtenu ${dewPoint(20, 50).toFixed(1)} °C.`,
    );
  }

  for (const place of PLACES) {
    const result = await getWeather(place.lat, place.lng, "fr");

    if (result.status === "unauthorized") {
      throw new Error(
        `${place.name}: OpenWeatherMap a refusé la clé. Vérifiez OPEN_WEATHER_API_KEY dans .env ; une clé nouvellement créée peut mettre jusqu'à deux heures à être activée.`,
      );
    }

    if (result.status === "unavailable") {
      throw new Error(
        `${place.name}: l'API OpenWeatherMap est injoignable ou a renvoyé une réponse inexploitable.`,
      );
    }

    const { report } = result;
    const { current } = report;

    // The offset drives every hour displayed in the tab.
    if (
      !Number.isInteger(report.utcOffsetSec) ||
      Math.abs(report.utcOffsetSec) > 14 * 3600
    ) {
      throw new Error(
        `${place.name}: décalage horaire aberrant (${report.utcOffsetSec} s).`,
      );
    }

    assertTemperature(`${place.name} (actuel)`, current.temp);
    assertTemperature(`${place.name} (ressenti)`, current.feelsLike);

    if (current.humidity < 0 || current.humidity > 100) {
      throw new Error(`${place.name}: humidité hors bornes.`);
    }

    if (current.dewPoint > current.temp + 1) {
      throw new Error(
        `${place.name}: point de rosée (${current.dewPoint} °C) au-dessus de la température (${current.temp} °C).`,
      );
    }

    if (current.pressure < 850 || current.pressure > 1100) {
      throw new Error(
        `${place.name}: pression invraisemblable (${current.pressure} hPa).`,
      );
    }

    if (!ICON_PATTERN.test(current.condition.icon)) {
      throw new Error(
        `${place.name}: code d'icône inattendu (${current.condition.icon}).`,
      );
    }

    if (current.condition.description === "") {
      throw new Error(`${place.name}: description météo vide.`);
    }

    const age = Date.now() - new Date(current.timeISO).getTime();
    if (age < -60_000 || age > 3 * 60 * 60 * 1000) {
      throw new Error(
        `${place.name}: observation datée de ${Math.round(age / 60000)} min.`,
      );
    }

    // Today's slots must be in the future, three hours apart, and all fall on
    // the same local day.
    for (let i = 0; i < report.todaySlices.length; i++) {
      const slice = report.todaySlices[i];
      assertTemperature(`${place.name} tranche ${i}`, slice.temp);

      if (slice.pop < 0 || slice.pop > 1) {
        throw new Error(
          `${place.name}: probabilité de précipitations hors bornes (${slice.pop}).`,
        );
      }

      if (slice.localHour < 0 || slice.localHour > 23) {
        throw new Error(`${place.name}: heure locale ${slice.localHour}.`);
      }

      if (i > 0) {
        const previous = new Date(report.todaySlices[i - 1].timeISO).getTime();
        const gapHours =
          (new Date(slice.timeISO).getTime() - previous) / (60 * 60 * 1000);

        if (gapHours !== 3) {
          throw new Error(
            `${place.name}: ${gapHours} h entre deux tranches au lieu de 3.`,
          );
        }
      }
    }

    if (report.days.length === 0 || report.days.length > MAX_FORECAST_DAYS) {
      throw new Error(
        `${place.name}: ${report.days.length} jours de prévision, hors des bornes attendues.`,
      );
    }

    for (let i = 0; i < report.days.length; i++) {
      const day = report.days[i];

      if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date)) {
        throw new Error(`${place.name}: date mal formée (${day.date}).`);
      }

      if (i > 0) {
        const previous = new Date(
          `${report.days[i - 1].date}T00:00:00Z`,
        ).getTime();
        const gapDays =
          (new Date(`${day.date}T00:00:00Z`).getTime() - previous) /
          (24 * 60 * 60 * 1000);

        if (gapDays !== 1) {
          throw new Error(
            `${place.name}: les jours ne se suivent pas (${report.days[i - 1].date} → ${day.date}).`,
          );
        }
      }

      assertTemperature(`${place.name} ${day.date} (min)`, day.tempMin);
      assertTemperature(`${place.name} ${day.date} (max)`, day.tempMax);

      if (day.tempMin > day.tempMax) {
        throw new Error(`${place.name} ${day.date}: minimum au-dessus du max.`);
      }

      // The row stands for the evening, so its slot has to be one.
      if (day.evening.localHour < 15 || day.evening.localHour > 23) {
        throw new Error(
          `${place.name} ${day.date}: tranche retenue à ${day.evening.localHour} h, hors de la soirée.`,
        );
      }

      if (day.evening.temp < day.tempMin || day.evening.temp > day.tempMax) {
        throw new Error(
          `${place.name} ${day.date}: la tranche du soir sort de l'amplitude du jour.`,
        );
      }

      if (!KNOWN_ICON_GROUPS.includes(day.evening.condition.icon.slice(0, 2))) {
        throw new Error(
          `${place.name} ${day.date}: icône ${day.evening.condition.icon} sans dessin correspondant.`,
        );
      }
    }

    console.log(
      `OK ${place.name} (UTC${report.utcOffsetSec >= 0 ? "+" : ""}${report.utcOffsetSec / 3600}) : ${current.temp} °C, ${current.condition.description}, vent ${current.windSpeedKmh} km/h · ${report.todaySlices.length} tranches aujourd'hui · ${report.days.length} jours suivants.`,
    );

    console.table(
      report.days.map((day) => ({
        jour: day.date,
        soir: `${day.evening.localHour} h`,
        temps: day.evening.condition.description,
        "T° soir": `${day.evening.temp} °C`,
        min: `${day.tempMin} °C`,
        max: `${day.tempMax} °C`,
        pluie: `${Math.round(day.evening.pop * 100)} %`,
        vent: `${day.evening.windSpeedKmh} km/h`,
      })),
    );
  }

  console.log("OK : météo OpenWeatherMap complète et cohérente.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
