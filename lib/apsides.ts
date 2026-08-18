import {
  type Apsis,
  ApsisKind,
  Body,
  EclipticGeoMoon,
  KM_PER_AU,
  NextLunarApsis,
  NextPlanetApsis,
  SearchLunarApsis,
  SearchPlanetApsis,
  SunPosition,
} from "astronomy-engine";

export type ApsisType = "perigee" | "apogee" | "perihelion" | "aphelion";

export interface ApsisEvent {
  type: ApsisType;
  timeISO: string;
  distanceKm: number;
  distanceAu: number;
}

/** Where a body actually sits on its orbit at a given instant. */
export interface OrbitPosition {
  /** ISO string of the instant these coordinates describe (UTC) */
  atISO: string;
  /** Angle travelled since the periapsis, in degrees: 0 = periapsis, 180 = apoapsis */
  trueAnomaly: number;
  /** Distance between the two bodies at that instant, in kilometres */
  distanceKm: number;
}

export interface ApsidesData {
  /** Moon perigees and apogees, chronological */
  lunar: ApsisEvent[];
  /** Earth perihelions and aphelions, chronological */
  solar: ApsisEvent[];
  /** Current position of the Moon on its orbit around the Earth */
  lunarNow: OrbitPosition;
  /** Current position of the Earth on its orbit around the Sun */
  solarNow: OrbitPosition;
}

export const LUNAR_APSIS_COUNT = 8;
export const SOLAR_APSIS_COUNT = 4;

/** Extreme Earth–Moon distances, used to scale the distance gauges. */
export const MOON_DISTANCE_RANGE_KM = { min: 356_400, max: 406_800 };
/** Extreme Earth–Sun distances, used to scale the distance gauges. */
export const SUN_DISTANCE_RANGE_KM = { min: 147_000_000, max: 152_200_000 };

function toEvent(apsis: Apsis, isLunar: boolean): ApsisEvent {
  const pericenter = apsis.kind === ApsisKind.Pericenter;

  return {
    type: isLunar
      ? pericenter
        ? "perigee"
        : "apogee"
      : pericenter
        ? "perihelion"
        : "aphelion",
    timeISO: apsis.time.date.toISOString(),
    distanceKm: Math.round(apsis.dist_km),
    distanceAu: Math.round(apsis.dist_au * 1_000_000) / 1_000_000,
  };
}

function lunarApsides(from: Date, count: number): ApsisEvent[] {
  const events: ApsisEvent[] = [];
  let apsis = SearchLunarApsis(from);

  for (let i = 0; i < count; i++) {
    events.push(toEvent(apsis, true));
    apsis = NextLunarApsis(apsis);
  }

  return events;
}

function solarApsides(from: Date, count: number): ApsisEvent[] {
  const events: ApsisEvent[] = [];
  let apsis = SearchPlanetApsis(Body.Earth, from);

  for (let i = 0; i < count; i++) {
    events.push(toEvent(apsis, false));
    apsis = NextPlanetApsis(Body.Earth, apsis);
  }

  return events;
}

function normalizeDegrees(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * How far along its orbit a body has travelled since its last periapsis.
 *
 * The periapsis direction is taken from the ecliptic longitude the body has at
 * the next periapsis. The apsidal line does drift — about 1.5° over a lunar
 * month, far less for the Earth — which is well below what the drawing shows.
 */
function trueAnomalyFrom(
  longitudeNow: number,
  longitudeAtPeriapsis: number,
): number {
  return normalizeDegrees(longitudeNow - longitudeAtPeriapsis);
}

function lunarPosition(now: Date, nextPerigee: Date): OrbitPosition {
  const moon = EclipticGeoMoon(now);

  return {
    atISO: now.toISOString(),
    trueAnomaly:
      Math.round(
        trueAnomalyFrom(moon.lon, EclipticGeoMoon(nextPerigee).lon) * 100,
      ) / 100,
    distanceKm: Math.round(moon.dist * KM_PER_AU),
  };
}

function solarPosition(now: Date, nextPerihelion: Date): OrbitPosition {
  // The Sun's geocentric longitude and the Earth's heliocentric longitude are
  // 180° apart, so their difference from the periapsis is the same angle.
  const sun = SunPosition(now);

  return {
    atISO: now.toISOString(),
    trueAnomaly:
      Math.round(
        trueAnomalyFrom(sun.elon, SunPosition(nextPerihelion).elon) * 100,
      ) / 100,
    distanceKm: Math.round(sun.vec.Length() * KM_PER_AU),
  };
}

function firstTimeOfType(events: ApsisEvent[], type: ApsisType): Date {
  const event = events.find((entry) => entry.type === type);
  if (event === undefined) {
    throw new Error(`Aucune apside de type ${type} trouvée.`);
  }
  return new Date(event.timeISO);
}

/**
 * Find the upcoming apsides: the Moon's perigees and apogees around the Earth,
 * and the Earth's perihelions and aphelions around the Sun, plus where both
 * bodies actually are on their orbit right now.
 *
 * These are purely orbital quantities, identical for every observer, so no
 * coordinates are needed.
 */
export async function getApsides(fromISO: string): Promise<ApsidesData> {
  const from = new Date(fromISO);
  const lunar = lunarApsides(from, LUNAR_APSIS_COUNT);
  const solar = solarApsides(from, SOLAR_APSIS_COUNT);

  return {
    lunar,
    solar,
    lunarNow: lunarPosition(from, firstTimeOfType(lunar, "perigee")),
    solarNow: solarPosition(from, firstTimeOfType(solar, "perihelion")),
  };
}
