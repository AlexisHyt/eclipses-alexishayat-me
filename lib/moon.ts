import {
  Body,
  Illumination,
  KM_PER_AU,
  MoonPhase,
  NextMoonQuarter,
  Observer,
  SearchMoonPhase,
  SearchMoonQuarter,
  SearchRiseSet,
} from "astronomy-engine";

export type MoonPhaseKey =
  | "new"
  | "waxing-crescent"
  | "first-quarter"
  | "waxing-gibbous"
  | "full"
  | "waning-gibbous"
  | "last-quarter"
  | "waning-crescent";

export type MoonQuarterKey = "new" | "first-quarter" | "full" | "last-quarter";

export interface MoonMoment {
  /** ISO string of the instant these values describe (UTC) */
  atISO: string;
  /** Elongation Moon-Sun in degrees: 0 = new, 90 = first quarter, 180 = full */
  phaseAngle: number;
  /** Fraction 0–1 of the lunar disc lit as seen from Earth */
  illumination: number;
  phase: MoonPhaseKey;
  /** Days elapsed since the previous new moon */
  ageDays: number;
  /** Earth–Moon distance in kilometres */
  distanceKm: number;
}

export interface MoonDay extends MoonMoment {
  /** ISO string of the start of the local day this entry describes */
  dayStartISO: string;
  /** Moonrise / moonset for the observer during that day, null when none */
  riseISO: string | null;
  setISO: string | null;
}

export interface MoonQuarterEvent {
  quarter: MoonQuarterKey;
  timeISO: string;
}

export interface MoonWeek {
  /** Phase at the exact moment the request was made */
  current: MoonMoment;
  /** One entry per day, starting with the requested day */
  days: MoonDay[];
  /** Quarter phases occurring during the covered period */
  quarters: MoonQuarterEvent[];
  /** True when rise/set times were computed for an observer */
  hasObserver: boolean;
}

export const MOON_WEEK_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const SYNODIC_MONTH_DAYS = 29.530588;

const QUARTER_KEYS: MoonQuarterKey[] = [
  "new",
  "first-quarter",
  "full",
  "last-quarter",
];

/**
 * Bucket the Moon–Sun elongation into the eight traditional phases, each
 * spanning 45° centred on its exact angle (0°, 45°, 90°, …).
 */
function phaseFromAngle(angle: number): MoonPhaseKey {
  const keys: MoonPhaseKey[] = [
    "new",
    "waxing-crescent",
    "first-quarter",
    "waxing-gibbous",
    "full",
    "waning-gibbous",
    "last-quarter",
    "waning-crescent",
  ];
  const index = Math.floor(((angle + 22.5) % 360) / 45);
  return keys[index];
}

/** Days elapsed since the new moon that precedes `date`. */
function moonAgeDays(date: Date): number {
  const windowStart = new Date(date.getTime() - 45 * DAY_MS);
  let last = SearchMoonPhase(0, windowStart, 45);
  if (last === null) return (MoonPhase(date) / 360) * SYNODIC_MONTH_DAYS;

  for (let i = 0; i < 3; i++) {
    const next = SearchMoonPhase(0, new Date(last.date.getTime() + DAY_MS), 40);
    if (next === null || next.date.getTime() > date.getTime()) break;
    last = next;
  }

  return (date.getTime() - last.date.getTime()) / DAY_MS;
}

function describeMoment(date: Date): MoonMoment {
  const angle = MoonPhase(date);
  const illum = Illumination(Body.Moon, date);

  return {
    atISO: date.toISOString(),
    phaseAngle: Math.round(angle * 100) / 100,
    illumination: Math.round(illum.phase_fraction * 10000) / 10000,
    phase: phaseFromAngle(angle),
    ageDays: Math.round(moonAgeDays(date) * 100) / 100,
    distanceKm: Math.round(illum.geo_dist * KM_PER_AU),
  };
}

function findQuarters(from: Date, to: Date): MoonQuarterEvent[] {
  const events: MoonQuarterEvent[] = [];
  let quarter = SearchMoonQuarter(from);

  for (let i = 0; i < 8 && quarter.time.date.getTime() <= to.getTime(); i++) {
    events.push({
      quarter: QUARTER_KEYS[quarter.quarter],
      timeISO: quarter.time.date.toISOString(),
    });
    quarter = NextMoonQuarter(quarter);
  }

  return events;
}

/**
 * Compute the Moon phase for each of the next `MOON_WEEK_DAYS` days.
 *
 * `startISO` is the instant the caller considers the beginning of "today",
 * so days line up with the visitor's own calendar rather than with UTC.
 * Rise and set times are only returned when coordinates are provided.
 */
export async function getMoonWeek(
  lat: number | null,
  lng: number | null,
  startISO: string,
  nowISO: string,
): Promise<MoonWeek> {
  const start = new Date(startISO);
  const now = new Date(nowISO);
  const observer =
    lat !== null && lng !== null ? new Observer(lat, lng, 0) : null;

  const days: MoonDay[] = [];

  for (let i = 0; i < MOON_WEEK_DAYS; i++) {
    const dayStart = new Date(start.getTime() + i * DAY_MS);
    // Sample the phase at mid-day so the value is representative of the day.
    const reference = new Date(dayStart.getTime() + DAY_MS / 2);

    const rise = observer
      ? SearchRiseSet(Body.Moon, observer, +1, dayStart, 1)
      : null;
    const set = observer
      ? SearchRiseSet(Body.Moon, observer, -1, dayStart, 1)
      : null;

    days.push({
      ...describeMoment(reference),
      dayStartISO: dayStart.toISOString(),
      riseISO: rise?.date.toISOString() ?? null,
      setISO: set?.date.toISOString() ?? null,
    });
  }

  return {
    current: describeMoment(now),
    days,
    quarters: findQuarters(
      start,
      new Date(start.getTime() + MOON_WEEK_DAYS * DAY_MS),
    ),
    hasObserver: observer !== null,
  };
}
