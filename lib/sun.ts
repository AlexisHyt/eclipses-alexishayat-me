import {
  type AstroTime,
  Body,
  Equator,
  Horizon,
  Observer,
  SearchAltitude,
  SearchHourAngle,
  SearchRiseSet,
} from "astronomy-engine";

/** Whether the Sun actually rises and sets on a given day. */
export type SunRegime = "normal" | "polar-day" | "polar-night";

export interface SunDay {
  /** ISO string of the start of the local day this entry describes */
  dayStartISO: string;
  regime: SunRegime;
  riseISO: string | null;
  /** Azimuth in degrees clockwise from north, at sunrise */
  riseAzimuth: number | null;
  /** Highest point of the Sun that day, which always exists */
  culminationISO: string;
  culminationAltitude: number;
  setISO: string | null;
  setAzimuth: number | null;
  /** Daylight duration in seconds, null when it cannot be determined */
  dayLengthSec: number | null;
  /** Daylight gained (positive) or lost since the previous day, in seconds */
  dayLengthDeltaSec: number | null;
  /** Sun 6° below the horizon: start and end of civil twilight */
  civilDawnISO: string | null;
  civilDuskISO: string | null;
}

export interface SunMoment {
  /** ISO string of the instant these values describe (UTC) */
  atISO: string;
  /** Degrees above the horizon, negative when the Sun is down */
  altitude: number;
  /** Degrees clockwise from north */
  azimuth: number;
}

export interface SunWeek {
  /** Position of the Sun at the exact moment the request was made */
  current: SunMoment;
  days: SunDay[];
}

export const SUN_WEEK_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const CIVIL_TWILIGHT_ALTITUDE = -6;

interface RawSunDay {
  dayStart: Date;
  regime: SunRegime;
  rise: AstroTime | null;
  set: AstroTime | null;
  culmination: AstroTime;
  culminationAltitude: number;
  dayLengthSec: number | null;
  civilDawn: AstroTime | null;
  civilDusk: AstroTime | null;
}

function horizontalAt(
  observer: Observer,
  time: AstroTime | Date,
): { altitude: number; azimuth: number } {
  const equatorial = Equator(Body.Sun, time, observer, true, true);
  const horizontal = Horizon(
    time,
    observer,
    equatorial.ra,
    equatorial.dec,
    "normal",
  );

  return {
    altitude: Math.round(horizontal.altitude * 100) / 100,
    azimuth: Math.round(horizontal.azimuth * 10) / 10,
  };
}

function computeDay(observer: Observer, dayStart: Date): RawSunDay {
  const rise = SearchRiseSet(Body.Sun, observer, +1, dayStart, 1);
  // Pair each sunrise with the sunset that follows it rather than with the one
  // that happens to fall in the same calendar day, so a row always reads as a
  // single continuous day even at high latitudes.
  const set =
    rise !== null
      ? SearchRiseSet(Body.Sun, observer, -1, rise, 2)
      : SearchRiseSet(Body.Sun, observer, -1, dayStart, 1);
  const culmination = SearchHourAngle(Body.Sun, observer, 0, dayStart);
  const culminationAltitude = culmination.hor.altitude;

  let regime: SunRegime = "normal";
  if (rise === null && set === null) {
    regime = culminationAltitude > 0 ? "polar-day" : "polar-night";
  }

  let dayLengthSec: number | null = null;
  if (regime === "polar-day") {
    dayLengthSec = 24 * 60 * 60;
  } else if (regime === "polar-night") {
    dayLengthSec = 0;
  } else if (rise !== null && set !== null) {
    dayLengthSec = Math.round(
      (set.date.getTime() - rise.date.getTime()) / 1000,
    );
  }

  return {
    dayStart,
    regime,
    rise,
    set,
    culmination: culmination.time,
    culminationAltitude: Math.round(culminationAltitude * 100) / 100,
    dayLengthSec,
    civilDawn: SearchAltitude(
      Body.Sun,
      observer,
      +1,
      dayStart,
      1,
      CIVIL_TWILIGHT_ALTITUDE,
    ),
    civilDusk: SearchAltitude(
      Body.Sun,
      observer,
      -1,
      dayStart,
      1,
      CIVIL_TWILIGHT_ALTITUDE,
    ),
  };
}

/**
 * Compute sunrise, culmination and sunset for each of the next
 * `SUN_WEEK_DAYS` days as seen from the given coordinates.
 *
 * `startISO` is the instant the caller considers the beginning of "today", so
 * days line up with the visitor's own calendar rather than with UTC.
 */
export async function getSunWeek(
  lat: number,
  lng: number,
  startISO: string,
  nowISO: string,
): Promise<SunWeek> {
  const start = new Date(startISO);
  const now = new Date(nowISO);
  const observer = new Observer(lat, lng, 0);

  // Compute the day before as well, purely to know how much daylight the
  // first day of the week gains or loses.
  const raw: RawSunDay[] = [];
  for (let i = -1; i < SUN_WEEK_DAYS; i++) {
    raw.push(computeDay(observer, new Date(start.getTime() + i * DAY_MS)));
  }

  const days = raw.slice(1).map((day, index) => {
    const previous = raw[index];
    const delta =
      day.dayLengthSec !== null && previous.dayLengthSec !== null
        ? day.dayLengthSec - previous.dayLengthSec
        : null;

    return {
      dayStartISO: day.dayStart.toISOString(),
      regime: day.regime,
      riseISO: day.rise?.date.toISOString() ?? null,
      riseAzimuth: day.rise ? horizontalAt(observer, day.rise).azimuth : null,
      culminationISO: day.culmination.date.toISOString(),
      culminationAltitude: day.culminationAltitude,
      setISO: day.set?.date.toISOString() ?? null,
      setAzimuth: day.set ? horizontalAt(observer, day.set).azimuth : null,
      dayLengthSec: day.dayLengthSec,
      dayLengthDeltaSec: delta,
      civilDawnISO: day.civilDawn?.date.toISOString() ?? null,
      civilDuskISO: day.civilDusk?.date.toISOString() ?? null,
    } satisfies SunDay;
  });

  return {
    current: { atISO: now.toISOString(), ...horizontalAt(observer, now) },
    days,
  };
}
