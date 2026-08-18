import {
  type AstroTime,
  Body,
  Equator,
  Illumination,
  MakeTime,
  Observer,
  RotateVector,
  Rotation_EQJ_EQD,
  SearchRiseSet,
  SiderealTime,
  Vector,
} from "astronomy-engine";

import type { Matrix3 } from "./sidereal";

export type SkyBodyId =
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus";

export interface SkyBody {
  id: SkyBodyId;
  /** Apparent visual magnitude in the middle of the night */
  magnitude: number;
  /**
   * J2000 unit vectors sampled evenly across the night. Unlike the stars,
   * these bodies drift against the sphere, so the viewer interpolates between
   * samples instead of riding the rotation alone.
   */
  samples: [number, number, number][];
}

export interface NightSky {
  /** Start of the night, normally sunset (UTC ISO string) */
  startISO: string;
  /** End of the night, normally sunrise (UTC ISO string) */
  endISO: string;
  /** Local apparent sidereal time at `startISO`, in hours [0, 24) */
  siderealStartHours: number;
  /** Observer latitude in degrees, used to tilt the celestial pole */
  latitude: number;
  /**
   * Rotation from J2000 equatorial coordinates — the frame the star catalogue
   * uses — to the equator and equinox of the night. Constant over one night.
   */
  precession: Matrix3;
  /** Moon and naked-eye planets, in the same J2000 frame as the catalogue */
  bodies: SkyBody[];
  /** True when the Sun never sets or never rises, so the window is a fallback */
  isFallbackWindow: boolean;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Fallback night when the Sun does not rise or set: 18 h to 6 h local. */
const FALLBACK_START_HOURS = 18;
const FALLBACK_LENGTH_HOURS = 12;

/**
 * The night surrounding `now`: the one in progress if it is already dark,
 * otherwise the one about to start.
 */
function findNight(
  observer: Observer,
  now: Date,
): { start: Date; end: Date } | null {
  const previousSunset = SearchRiseSet(
    Body.Sun,
    observer,
    -1,
    new Date(now.getTime() - DAY_MS),
    2,
  );
  if (previousSunset === null) return null;

  const sunriseAfter = SearchRiseSet(Body.Sun, observer, +1, previousSunset, 2);
  if (sunriseAfter === null) return null;

  // That night is already over: take the next one instead.
  if (sunriseAfter.date.getTime() <= now.getTime()) {
    const nextSunset = SearchRiseSet(Body.Sun, observer, -1, now, 2);
    if (nextSunset === null) return null;

    const nextSunrise = SearchRiseSet(Body.Sun, observer, +1, nextSunset, 2);
    if (nextSunrise === null) return null;

    return { start: nextSunset.date, end: nextSunrise.date };
  }

  return { start: previousSunset.date, end: sunriseAfter.date };
}

/**
 * Build the rotation the client needs to bring catalogue coordinates into the
 * equator of the night, by rotating the three basis vectors one at a time.
 * Doing it this way avoids having to guess the library's storage convention.
 */
function precessionMatrix(time: AstroTime): Matrix3 {
  const rotation = Rotation_EQJ_EQD(time);

  const axes = [
    new Vector(1, 0, 0, time),
    new Vector(0, 1, 0, time),
    new Vector(0, 0, 1, time),
  ].map((axis) => RotateVector(rotation, axis));

  const round = (value: number) => Math.round(value * 1e9) / 1e9;

  // Column j of the matrix is the image of input axis j.
  return [
    [round(axes[0].x), round(axes[1].x), round(axes[2].x)],
    [round(axes[0].y), round(axes[1].y), round(axes[2].y)],
    [round(axes[0].z), round(axes[1].z), round(axes[2].z)],
  ];
}

/** Bodies bright enough to pick out with the naked eye, plus the Moon. */
const TRACKED_BODIES: { id: SkyBodyId; body: Body }[] = [
  { id: "moon", body: Body.Moon },
  { id: "mercury", body: Body.Mercury },
  { id: "venus", body: Body.Venus },
  { id: "mars", body: Body.Mars },
  { id: "jupiter", body: Body.Jupiter },
  { id: "saturn", body: Body.Saturn },
  { id: "uranus", body: Body.Uranus },
];

/**
 * How many positions to take across the night. The Moon is the fastest of
 * these, and even it moves under a degree between two samples, so straight
 * interpolation between them is well below what the drawing can show.
 */
const BODY_SAMPLES = 9;

function sampleBodies(observer: Observer, start: Date, end: Date): SkyBody[] {
  const span = end.getTime() - start.getTime();

  return TRACKED_BODIES.map(({ id, body }) => {
    const samples: [number, number, number][] = [];

    for (let i = 0; i < BODY_SAMPLES; i++) {
      const when = new Date(start.getTime() + (span * i) / (BODY_SAMPLES - 1));
      // Topocentric and J2000, matching the star catalogue's frame. Being
      // topocentric matters for the Moon, whose parallax reaches a degree.
      const vector = Equator(body, when, observer, false, true).vec;
      const length = Math.hypot(vector.x, vector.y, vector.z);

      samples.push([
        Math.round((vector.x / length) * 1e6) / 1e6,
        Math.round((vector.y / length) * 1e6) / 1e6,
        Math.round((vector.z / length) * 1e6) / 1e6,
      ]);
    }

    const middle = new Date(start.getTime() + span / 2);

    return {
      id,
      magnitude: Math.round(Illumination(body, middle).mag * 100) / 100,
      samples,
    };
  });
}

/**
 * Describe tonight's sky for an observer: when the night runs from and to, and
 * the two fixed rotations plus the sidereal anchor a viewer needs to place the
 * stars. The sky itself is then just this frame spun about the celestial pole,
 * at a rate of `SIDEREAL_HOURS_PER_SECOND`.
 *
 * `dayStartISO` is the visitor's local midnight, only used when the Sun never
 * rises or never sets and a plain evening window has to stand in.
 */
export async function getNightSky(
  lat: number,
  lng: number,
  nowISO: string,
  dayStartISO: string,
): Promise<NightSky> {
  const now = new Date(nowISO);
  const observer = new Observer(lat, lng, 0);

  const night = findNight(observer, now);
  const dayStart = new Date(dayStartISO).getTime();

  const start =
    night?.start ?? new Date(dayStart + FALLBACK_START_HOURS * HOUR_MS);
  const end =
    night?.end ??
    new Date(
      dayStart + (FALLBACK_START_HOURS + FALLBACK_LENGTH_HOURS) * HOUR_MS,
    );

  const localSidereal = (SiderealTime(start) + lng / 15 + 24) % 24;
  // Precession and nutation barely move over one night, so a single matrix
  // taken at the middle of the window covers the whole slider range.
  const middle = MakeTime(new Date((start.getTime() + end.getTime()) / 2));

  return {
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    siderealStartHours: Math.round(localSidereal * 1e6) / 1e6,
    latitude: lat,
    precession: precessionMatrix(middle),
    bodies: sampleBodies(observer, start, end),
    isFallbackWindow: night === null,
  };
}
