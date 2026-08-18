/**
 * Builds `public/constellations.json` from the d3-celestial sky data.
 *
 * Like the star catalogue, the result is committed so the site never depends
 * on a third-party server at runtime.
 *
 *   bun run build:constellations
 *
 * Source: d3-celestial, Olaf Frohn, BSD 3-Clause. Its coordinates are J2000,
 * the same frame as the HYG catalogue, so the lines land on our stars.
 */

import { readFile, writeFile } from "node:fs/promises";

const LINES_URL =
  "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.lines.json";
const NAMES_URL =
  "https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/constellations.json";

const OUTPUT = "public/constellations.json";

interface LineFeature {
  id: string;
  geometry: { coordinates: [number, number][][] };
}

interface NameFeature {
  id: string;
  properties: { fr?: string; name: string; rank: string };
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** d3-celestial stores right ascension in degrees, wrapped to −180…180. */
function toHours(degrees: number): number {
  return (((degrees % 360) + 360) % 360) / 15;
}

function toUnitVector(raHours: number, decDegrees: number): number[] {
  const ra = (raHours / 12) * Math.PI;
  const dec = (decDegrees * Math.PI) / 180;
  const cosDec = Math.cos(dec);
  return [cosDec * Math.cos(ra), cosDec * Math.sin(ra), Math.sin(dec)];
}

async function load<T>(url: string, local: string | undefined): Promise<T> {
  if (local !== undefined) {
    console.log(`Lecture de ${local}…`);
    return JSON.parse(await readFile(local, "utf8")) as T;
  }

  console.log(`Téléchargement de ${url}…`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Téléchargement impossible: HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

async function main() {
  const lines = await load<{ features: LineFeature[] }>(
    LINES_URL,
    process.argv[2],
  );
  const names = await load<{ features: NameFeature[] }>(
    NAMES_URL,
    process.argv[3],
  );

  const nameById = new Map(names.features.map((f) => [f.id, f.properties]));

  // Two entries per segment, ready to feed a LineSegments geometry.
  const ra: number[] = [];
  const dec: number[] = [];
  const labels: { name: string; ra: number; dec: number; rank: number }[] = [];

  for (const feature of lines.features) {
    const properties = nameById.get(feature.id);
    if (properties === undefined) {
      throw new Error(`Constellation "${feature.id}" sans nom.`);
    }

    // Average the directions rather than the angles, so the label sits in the
    // middle of the figure even when it straddles right ascension 0 h.
    const centre = [0, 0, 0];
    let points = 0;

    for (const polyline of feature.geometry.coordinates) {
      for (let i = 0; i < polyline.length; i++) {
        const [raDegrees, decDegrees] = polyline[i];
        const raHours = toHours(raDegrees);

        const vector = toUnitVector(raHours, decDegrees);
        centre[0] += vector[0];
        centre[1] += vector[1];
        centre[2] += vector[2];
        points++;

        // Every interior point closes one segment and opens the next.
        if (i > 0) {
          ra.push(round(raHours, 4));
          dec.push(round(decDegrees, 4));
        }
        if (i < polyline.length - 1) {
          ra.push(round(raHours, 4));
          dec.push(round(decDegrees, 4));
        }
      }
    }

    const length = Math.hypot(centre[0], centre[1], centre[2]);
    if (length === 0 || points === 0) {
      throw new Error(`Constellation "${feature.id}" sans géométrie.`);
    }

    const centreRa = Math.atan2(centre[1], centre[0]);
    labels.push({
      name: properties.fr ?? properties.name,
      ra: round(((((centreRa * 12) / Math.PI) % 24) + 24) % 24, 4),
      dec: round((Math.asin(centre[2] / length) * 180) / Math.PI, 4),
      rank: Number.parseInt(properties.rank, 10),
    });
  }

  if (ra.length % 2 !== 0) {
    throw new Error("Nombre de sommets impair: segments incomplets.");
  }

  const data = {
    source: "d3-celestial (Olaf Frohn), BSD 3-Clause",
    sourceUrl: "https://github.com/ofrohn/d3-celestial",
    segmentCount: ra.length / 2,
    /** Right ascension in hours, J2000; two entries per segment */
    ra,
    /** Declination in degrees, J2000; two entries per segment */
    dec,
    /** One label per constellation, at the centre of its figure */
    labels: labels.sort(
      (a, b) => a.rank - b.rank || a.name.localeCompare(b.name),
    ),
  };

  const serialised = JSON.stringify(data);
  await writeFile(OUTPUT, serialised, "utf8");

  console.log(
    `OK: ${data.segmentCount} segments, ${data.labels.length} constellations, ${(Buffer.byteLength(serialised, "utf8") / 1024).toFixed(0)} Kio dans ${OUTPUT}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
