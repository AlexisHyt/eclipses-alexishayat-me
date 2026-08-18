import { readFile } from "node:fs/promises";
import { Body, Equator, Horizon, Observer } from "astronomy-engine";
import type { ConstellationLines } from "@/lib/constellations";
import { SIDEREAL_HOURS_PER_SECOND } from "@/lib/sidereal";
import { getNightSky, type SkyBodyId } from "@/lib/sky";
import type { StarCatalogue } from "@/lib/star-catalogue";

const BODY_BY_ID: Record<SkyBodyId, Body> = {
  moon: Body.Moon,
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
};

/** Largest gap tolerated between an interpolated body and its true place. */
const BODY_TOLERANCE_DEG = 0.05;

const PLACES = [
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Sydney", lat: -33.8688, lng: 151.2093 },
];

/** Largest gap between the viewer and the library, in degrees. */
const TOLERANCE_DEG = 0.05;

function toUnitVector(raHours: number, decDegrees: number): number[] {
  const ra = (raHours / 12) * Math.PI;
  const dec = (decDegrees * Math.PI) / 180;
  const cosDec = Math.cos(dec);
  return [cosDec * Math.cos(ra), cosDec * Math.sin(ra), Math.sin(dec)];
}

function applyMatrix(matrix: number[][], vector: number[]): number[] {
  return matrix.map(
    (row) => row[0] * vector[0] + row[1] * vector[1] + row[2] * vector[2],
  );
}

/**
 * Reproduce, in plain arithmetic, what the browser scene graph does: spin the
 * equator of date about the celestial pole by −LST, then tilt it onto the
 * observer's horizon.
 */
function project(
  ofDate: number[],
  siderealHours: number,
  latitudeDegrees: number,
): { altitude: number; azimuth: number } {
  const spin = -(siderealHours / 12) * Math.PI;
  const hourAngle = [
    ofDate[0] * Math.cos(spin) - ofDate[1] * Math.sin(spin),
    ofDate[0] * Math.sin(spin) + ofDate[1] * Math.cos(spin),
    ofDate[2],
  ];

  const phi = (latitudeDegrees * Math.PI) / 180;
  const east = hourAngle[1];
  const up = hourAngle[0] * Math.cos(phi) + hourAngle[2] * Math.sin(phi);
  const south = hourAngle[0] * Math.sin(phi) - hourAngle[2] * Math.cos(phi);

  return {
    altitude: (Math.asin(Math.min(1, Math.max(-1, up))) * 180) / Math.PI,
    azimuth: ((((Math.atan2(east, -south) * 180) / Math.PI) % 360) + 360) % 360,
  };
}

/** Read RA/Dec back out of a unit vector. */
function toRaDec(vector: number[]): { ra: number; dec: number } {
  return {
    ra: ((((Math.atan2(vector[1], vector[0]) * 12) / Math.PI) % 24) + 24) % 24,
    dec: (Math.asin(Math.min(1, Math.max(-1, vector[2]))) * 180) / Math.PI,
  };
}

function angularGap(a: number, b: number): number {
  return Math.abs(((((a - b + 540) % 360) + 360) % 360) - 180);
}

/** Angle between two unit vectors, in degrees. */
function separation(a: number[], b: number[]): number {
  const dot = Math.min(
    1,
    Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]),
  );
  return (Math.acos(dot) * 180) / Math.PI;
}

/** The interpolation the viewer runs between two sampled positions. */
function interpolate(
  samples: [number, number, number][],
  fraction: number,
): number[] {
  const scaled = Math.min(Math.max(fraction, 0), 1) * (samples.length - 1);
  const first = Math.min(Math.floor(scaled), samples.length - 2);
  const blend = scaled - first;

  const a = samples[first];
  const b = samples[first + 1];
  const vector = [
    a[0] + (b[0] - a[0]) * blend,
    a[1] + (b[1] - a[1]) * blend,
    a[2] + (b[2] - a[2]) * blend,
  ];
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;

  return vector.map((value) => value / length);
}

async function main() {
  const stars = JSON.parse(
    await readFile("public/stars.json", "utf8"),
  ) as StarCatalogue;

  if (
    stars.count !== stars.ra.length ||
    stars.count !== stars.dec.length ||
    stars.count !== stars.mag.length ||
    stars.count !== stars.ci.length
  ) {
    throw new Error("Catalogue incohérent: tableaux de tailles différentes.");
  }

  for (let i = 1; i < stars.count; i++) {
    if (stars.mag[i] < stars.mag[i - 1]) {
      throw new Error("Catalogue non trié par magnitude croissante.");
    }
  }

  for (let i = 0; i < stars.count; i++) {
    if (stars.ra[i] < 0 || stars.ra[i] >= 24) {
      throw new Error(`Ascension droite invalide à l'index ${i}.`);
    }
    if (stars.dec[i] < -90 || stars.dec[i] > 90) {
      throw new Error(`Déclinaison invalide à l'index ${i}.`);
    }
  }

  for (const entry of stars.names) {
    if (entry.i < 0 || entry.i >= stars.count) {
      throw new Error(`Nom "${entry.name}" pointe hors du catalogue.`);
    }
  }

  console.log(
    `OK catalogue: ${stars.count} étoiles (magnitude ${stars.mag[0]} à ${stars.mag[stars.count - 1]}), ${stars.names.length} nommées.`,
  );

  const constellations = JSON.parse(
    await readFile("public/constellations.json", "utf8"),
  ) as ConstellationLines;

  if (
    constellations.ra.length !== constellations.dec.length ||
    constellations.ra.length !== constellations.segmentCount * 2
  ) {
    throw new Error("Constellations incohérentes: sommets mal appariés.");
  }

  for (let i = 0; i < constellations.ra.length; i++) {
    if (constellations.ra[i] < 0 || constellations.ra[i] >= 24) {
      throw new Error(`Constellations: ascension droite invalide en ${i}.`);
    }
    if (constellations.dec[i] < -90 || constellations.dec[i] > 90) {
      throw new Error(`Constellations: déclinaison invalide en ${i}.`);
    }
  }

  // Every drawn vertex should sit on a catalogue star, otherwise the figures
  // would float next to the sky they are meant to join up.
  let worstVertex = 0;
  for (let i = 0; i < constellations.ra.length; i++) {
    const vertex = toUnitVector(constellations.ra[i], constellations.dec[i]);
    let closest = 180;

    for (let s = 0; s < stars.count; s++) {
      const gap = separation(vertex, toUnitVector(stars.ra[s], stars.dec[s]));
      if (gap < closest) closest = gap;
      if (closest < 0.01) break;
    }

    worstVertex = Math.max(worstVertex, closest);
  }

  if (worstVertex > 0.5) {
    throw new Error(
      `Constellations: un sommet est à ${worstVertex.toFixed(3)}° de toute étoile.`,
    );
  }

  console.log(
    `OK constellations: ${constellations.segmentCount} segments, ${constellations.labels.length} figures, sommet le plus éloigné d'une étoile ${worstVertex.toFixed(4)}°.`,
  );

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  for (const place of PLACES) {
    const sky = await getNightSky(
      place.lat,
      place.lng,
      now.toISOString(),
      dayStart.toISOString(),
    );

    const start = new Date(sky.startISO).getTime();
    const end = new Date(sky.endISO).getTime();

    if (end <= start) {
      throw new Error(`${place.name}: nuit de durée nulle ou négative.`);
    }

    const observer = new Observer(place.lat, place.lng, 0);
    let worst = 0;
    let compared = 0;

    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
      const when = new Date(start + (end - start) * fraction);
      const elapsedSec = (when.getTime() - start) / 1000;
      const sidereal =
        (sky.siderealStartHours + elapsedSec * SIDEREAL_HOURS_PER_SECOND) % 24;

      for (let i = 0; i < 40; i++) {
        const ofDate = applyMatrix(
          sky.precession,
          toUnitVector(stars.ra[i], stars.dec[i]),
        );

        const mine = project(ofDate, sidereal, sky.latitude);

        // Same coordinates, converted by the library instead. Refraction is
        // switched off so this compares geometry against geometry.
        const equatorial = toRaDec(ofDate);
        // Omitting the refraction option compares geometry against geometry.
        const reference = Horizon(
          when,
          observer,
          equatorial.ra,
          equatorial.dec,
        );

        if (reference.altitude < 10) continue;
        compared++;

        // Near the zenith a large azimuth error is a small real one, hence the
        // cosine weighting.
        const gap = Math.max(
          Math.abs(mine.altitude - reference.altitude),
          angularGap(mine.azimuth, reference.azimuth) *
            Math.cos((reference.altitude * Math.PI) / 180),
        );
        worst = Math.max(worst, gap);
      }
    }

    if (compared === 0) {
      throw new Error(`${place.name}: aucune étoile comparable.`);
    }

    if (worst > TOLERANCE_DEG) {
      throw new Error(
        `${place.name}: écart de position trop grand (${worst.toFixed(4)}°).`,
      );
    }

    console.log(
      `OK ${place.name}: nuit ${new Date(sky.startISO).toLocaleString("fr-FR")} → ${new Date(sky.endISO).toLocaleString("fr-FR")}, écart max ${worst.toFixed(4)}° sur ${compared} comparaisons.`,
    );

    // Bodies are sampled across the night and interpolated in between, so
    // check the interpolation against the real position off the sample grid.
    let worstBody = 0;
    let worstBodyId = "";

    for (const body of sky.bodies) {
      if (body.samples.length !== 9) {
        throw new Error(`${place.name}: ${body.id} mal échantillonné.`);
      }

      for (const fraction of [0.07, 0.31, 0.5, 0.68, 0.94]) {
        const when = new Date(start + (end - start) * fraction);
        const truth = Equator(
          BODY_BY_ID[body.id],
          when,
          observer,
          false,
          true,
        ).vec;
        const length = Math.hypot(truth.x, truth.y, truth.z);

        const gap = separation(interpolate(body.samples, fraction), [
          truth.x / length,
          truth.y / length,
          truth.z / length,
        ]);

        if (gap > worstBody) {
          worstBody = gap;
          worstBodyId = body.id;
        }
      }
    }

    if (worstBody > BODY_TOLERANCE_DEG) {
      throw new Error(
        `${place.name}: interpolation de ${worstBodyId} à ${worstBody.toFixed(4)}° de la position réelle.`,
      );
    }

    console.log(
      `   ${sky.bodies.length} corps interpolés, écart max ${worstBody.toFixed(4)}° (${worstBodyId}).`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
