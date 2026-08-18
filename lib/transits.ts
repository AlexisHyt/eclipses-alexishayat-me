import {
  Body,
  Equator,
  GeoVector,
  Horizon,
  KM_PER_AU,
  NextTransit,
  Observer,
  SearchTransit,
  type TransitInfo,
} from "astronomy-engine";

export type TransitPlanet = "mercury" | "venus";

/** How much of the transit happens while the Sun is up at the observer's site. */
export type TransitVisibility = "full" | "partial";

/** One of the three instants of a transit, seen from the observer's horizon. */
export interface TransitContact {
  /** ISO string of the instant (UTC) */
  timeISO: string;
  /** Apparent altitude of the Sun, in degrees, refraction included */
  sunAltitude: number;
  /** Azimuth of the Sun, in degrees from the north, clockwise */
  sunAzimuth: number;
  /** Whether the Sun is above the horizon at that instant */
  visible: boolean;
}

export interface TransitEvent {
  planet: TransitPlanet;
  /** First contact: the planet's silhouette enters the solar disc */
  start: TransitContact;
  /** Greatest alignment between the centres of the planet and the Sun */
  peak: TransitContact;
  /** Last contact: the silhouette leaves the solar disc */
  finish: TransitContact;
  /** Geocentric duration of the whole transit, in minutes */
  durationMin: number;
  /** Minimum separation between the two centres at peak, in arcminutes */
  separationArcmin: number;
  /** Apparent radius of the Sun at peak, in arcminutes */
  sunRadiusArcmin: number;
  /** Apparent diameter of the planet's silhouette at peak, in arcseconds */
  planetDiameterArcsec: number;
  /** Apparent diameter of the Sun at peak, in arcseconds */
  sunDiameterArcsec: number;
  /** Start of the part of the transit that happens in daylight (ISO, UTC) */
  visibleStartISO: string;
  /** End of that same part (ISO, UTC) */
  visibleEndISO: string;
  /** Minutes of the transit spent with the Sun above the horizon */
  visibleMinutes: number;
  visibility: TransitVisibility;
}

/** How many locally visible transits the list is filled with. */
export const MAX_TRANSITS = 20;

/**
 * Safety net for the merged search. Roughly half of all transits are visible
 * from a given site, so 20 of them are usually found within ~45 candidates;
 * 200 covers any pathological site without ever looping forever.
 */
const MAX_CANDIDATES = 200;

/** Mean radii, in kilometres (IAU 2015), used for the apparent diameters. */
const RADIUS_KM: Record<TransitPlanet | "sun", number> = {
  mercury: 2439.7,
  venus: 6051.8,
  sun: 695_700,
};

const BODIES: Record<TransitPlanet, Body> = {
  mercury: Body.Mercury,
  venus: Body.Venus,
};

/** Sampling step used to scan a transit window for daylight, in milliseconds. */
const SCAN_STEP_MS = 5 * 60 * 1000;

interface Interval {
  from: Date;
  to: Date;
}

/** Apparent horizontal position of the Sun, refraction included. */
function sunHorizontal(observer: Observer, time: Date) {
  const equatorial = Equator(Body.Sun, time, observer, true, true);
  return Horizon(time, observer, equatorial.ra, equatorial.dec, "normal");
}

function sunAltitude(observer: Observer, time: Date): number {
  return sunHorizontal(observer, time).altitude;
}

function toContact(observer: Observer, time: Date): TransitContact {
  const horizontal = sunHorizontal(observer, time);

  return {
    timeISO: time.toISOString(),
    sunAltitude: Math.round(horizontal.altitude * 100) / 100,
    sunAzimuth: Math.round(horizontal.azimuth * 10) / 10,
    visible: horizontal.altitude > 0,
  };
}

/**
 * Instant, to the second, where the Sun crosses the horizon between two
 * samples of opposite sign.
 */
function horizonCrossing(
  observer: Observer,
  before: Date,
  after: Date,
  altitudeBefore: number,
): Date {
  const startsAbove = altitudeBefore > 0;
  let low = before.getTime();
  let high = after.getTime();

  while (high - low > 1000) {
    const middle = Math.round((low + high) / 2);
    if (sunAltitude(observer, new Date(middle)) > 0 === startsAbove) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return new Date(high);
}

/**
 * The stretches of `[from, to]` during which the Sun is above the horizon.
 *
 * A transit lasts at most about eight hours, so a five minute scan cannot miss
 * a sunrise or a sunset; each sign change is then refined by bisection. Near
 * the poles the window can hold a sunset *and* a sunrise, hence a list.
 */
function daylightIntervals(
  observer: Observer,
  from: Date,
  to: Date,
): Interval[] {
  const total = to.getTime() - from.getTime();
  const steps = Math.max(1, Math.ceil(total / SCAN_STEP_MS));
  const intervals: Interval[] = [];

  let previousTime = from;
  let previousAltitude = sunAltitude(observer, from);
  let openedAt: Date | null = previousAltitude > 0 ? from : null;

  for (let i = 1; i <= steps; i++) {
    const time = new Date(from.getTime() + (total * i) / steps);
    const altitude = sunAltitude(observer, time);

    if (altitude > 0 && previousAltitude <= 0) {
      openedAt = horizonCrossing(
        observer,
        previousTime,
        time,
        previousAltitude,
      );
    } else if (altitude <= 0 && previousAltitude > 0 && openedAt !== null) {
      intervals.push({
        from: openedAt,
        to: horizonCrossing(observer, previousTime, time, previousAltitude),
      });
      openedAt = null;
    }

    previousTime = time;
    previousAltitude = altitude;
  }

  if (openedAt !== null) intervals.push({ from: openedAt, to });

  return intervals;
}

/** Apparent diameter of a body of known radius, in arcseconds. */
function apparentDiameterArcsec(radiusKm: number, distanceKm: number): number {
  return (2 * Math.atan(radiusKm / distanceKm) * 180 * 3600) / Math.PI;
}

function geocentricDistanceKm(body: Body, time: Date): number {
  return GeoVector(body, time, true).Length() * KM_PER_AU;
}

/**
 * Turn a geocentric transit into a local one, or `null` when the Sun never
 * rises above the observer's horizon while it lasts.
 */
function toLocalTransit(
  planet: TransitPlanet,
  transit: TransitInfo,
  observer: Observer,
): TransitEvent | null {
  const start = transit.start.date;
  const peak = transit.peak.date;
  const finish = transit.finish.date;

  const daylight = daylightIntervals(observer, start, finish);
  if (daylight.length === 0) return null;

  const visibleMs = daylight.reduce(
    (total, interval) =>
      total + (interval.to.getTime() - interval.from.getTime()),
    0,
  );
  const durationMs = finish.getTime() - start.getTime();

  const planetDiameterArcsec = apparentDiameterArcsec(
    RADIUS_KM[planet],
    geocentricDistanceKm(BODIES[planet], peak),
  );
  const sunDiameterArcsec = apparentDiameterArcsec(
    RADIUS_KM.sun,
    geocentricDistanceKm(Body.Sun, peak),
  );

  return {
    planet,
    start: toContact(observer, start),
    peak: toContact(observer, peak),
    finish: toContact(observer, finish),
    durationMin: Math.round(durationMs / 60000),
    separationArcmin: Math.round(transit.separation * 100) / 100,
    sunRadiusArcmin: Math.round((sunDiameterArcsec / 120) * 100) / 100,
    planetDiameterArcsec: Math.round(planetDiameterArcsec * 10) / 10,
    sunDiameterArcsec: Math.round(sunDiameterArcsec),
    visibleStartISO: daylight[0].from.toISOString(),
    visibleEndISO: daylight[daylight.length - 1].to.toISOString(),
    visibleMinutes: Math.round(visibleMs / 60000),
    // A minute of slack absorbs the rounding of the horizon crossings.
    visibility: visibleMs >= durationMs - 60_000 ? "full" : "partial",
  };
}

/**
 * A lazy, chronological stream of the transits of Mercury and Venus after
 * `from`, obtained by always advancing whichever planet transits next.
 */
function* transitStream(from: Date): Generator<[TransitPlanet, TransitInfo]> {
  const pending: Record<TransitPlanet, TransitInfo> = {
    mercury: SearchTransit(Body.Mercury, from),
    venus: SearchTransit(Body.Venus, from),
  };

  while (true) {
    const next: TransitPlanet =
      pending.mercury.peak.date <= pending.venus.peak.date
        ? "mercury"
        : "venus";

    yield [next, pending[next]];
    pending[next] = NextTransit(BODIES[next], pending[next].finish);
  }
}

/**
 * Find the next transits of Mercury and Venus across the Sun that are at least
 * partly visible from the given lat/lng — that is, whose window overlaps a
 * moment when the Sun is above the observer's horizon.
 *
 * Contact times are geocentric, as returned by astronomy-engine; the parallax
 * of the observer shifts them by a few minutes at most, far less than the
 * hours a transit lasts.
 */
export async function getTransitsForLocation(
  lat: number,
  lng: number,
  fromISO: string,
): Promise<TransitEvent[]> {
  const observer = new Observer(lat, lng, 0);
  const stream = transitStream(new Date(fromISO));
  const events: TransitEvent[] = [];

  for (let i = 0; i < MAX_CANDIDATES && events.length < MAX_TRANSITS; i++) {
    const { value } = stream.next();
    if (value === undefined) break;

    const [planet, transit] = value;
    const local = toLocalTransit(planet, transit, observer);
    if (local !== null) events.push(local);
  }

  return events;
}
