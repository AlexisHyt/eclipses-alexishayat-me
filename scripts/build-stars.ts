/**
 * Builds `public/stars.json` from the HYG star database.
 *
 * The catalogue is only fetched when this script runs; the generated file is
 * committed, so the site never depends on a third-party server at runtime.
 *
 *   bun run build:stars              # downloads the catalogue
 *   bun run build:stars ./hyg.csv    # reuses a local copy
 *
 * Source: HYG Database v4.1, David Nash / astronexus, CC BY-SA 4.0.
 */

import { readFile, writeFile } from "node:fs/promises";

const SOURCE_URL =
  "https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv";

/** Faintest star visible to the naked eye under a very dark sky. */
const MAGNITUDE_LIMIT = 6.5;

/** Stars brighter than this get a name label in the sky view. */
const NAMED_MAGNITUDE_LIMIT = 2.2;

const OUTPUT = "public/stars.json";

/** Split one CSV line, honouring double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

async function readCatalogue(): Promise<string> {
  const local = process.argv[2];

  if (local !== undefined) {
    console.log(`Lecture de ${local}…`);
    return readFile(local, "utf8");
  }

  console.log(`Téléchargement de ${SOURCE_URL}…`);
  const response = await fetch(SOURCE_URL);

  if (!response.ok) {
    throw new Error(`Téléchargement impossible: HTTP ${response.status}`);
  }

  return response.text();
}

async function main() {
  const csv = await readCatalogue();
  const lines = csv.split("\n");
  const header = splitCsvLine(lines[0]);

  const column = (name: string) => {
    const index = header.indexOf(name);
    if (index === -1) throw new Error(`Colonne "${name}" absente du CSV.`);
    return index;
  };

  const idIndex = column("id");
  const raIndex = column("ra");
  const decIndex = column("dec");
  const magIndex = column("mag");
  const ciIndex = column("ci");
  const properIndex = column("proper");

  const ra: number[] = [];
  const dec: number[] = [];
  const mag: number[] = [];
  const ci: number[] = [];
  const names: { i: number; name: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "") continue;

    const fields = splitCsvLine(line);
    // Row 0 of the catalogue is the Sun, which has no place in a night sky.
    if (fields[idIndex] === "0") continue;

    const magnitude = Number.parseFloat(fields[magIndex]);
    if (!Number.isFinite(magnitude) || magnitude > MAGNITUDE_LIMIT) continue;

    const rightAscension = Number.parseFloat(fields[raIndex]);
    const declination = Number.parseFloat(fields[decIndex]);
    if (!Number.isFinite(rightAscension) || !Number.isFinite(declination)) {
      continue;
    }

    const colorIndex = Number.parseFloat(fields[ciIndex]);
    const proper = fields[properIndex].trim();

    if (proper !== "" && magnitude <= NAMED_MAGNITUDE_LIMIT) {
      names.push({ i: ra.length, name: proper });
    }

    ra.push(round(rightAscension, 4));
    dec.push(round(declination, 4));
    mag.push(round(magnitude, 2));
    // Missing colours default to 0.0, roughly an A0 white star.
    ci.push(Number.isFinite(colorIndex) ? round(colorIndex, 2) : 0);
  }

  // Brightest first, so the most prominent stars win any overlap.
  const order = ra.map((_, index) => index).sort((a, b) => mag[a] - mag[b]);
  const position = new Map(order.map((from, to) => [from, to]));

  const data = {
    source: "HYG Database v4.1 (astronexus), CC BY-SA 4.0",
    sourceUrl: "https://github.com/astronexus/HYG-Database",
    magnitudeLimit: MAGNITUDE_LIMIT,
    count: order.length,
    /** Right ascension in hours, J2000 */
    ra: order.map((index) => ra[index]),
    /** Declination in degrees, J2000 */
    dec: order.map((index) => dec[index]),
    /** Apparent visual magnitude */
    mag: order.map((index) => mag[index]),
    /** B−V colour index */
    ci: order.map((index) => ci[index]),
    /** Proper names of the brightest stars, by index into the arrays above */
    names: names
      .map((entry) => ({ i: position.get(entry.i) ?? 0, name: entry.name }))
      .sort((a, b) => a.i - b.i),
  };

  const serialised = JSON.stringify(data);
  await writeFile(OUTPUT, serialised, "utf8");

  const size = Buffer.byteLength(serialised, "utf8");
  console.log(
    `OK: ${data.count} étoiles jusqu'à la magnitude ${MAGNITUDE_LIMIT}, ${data.names.length} nommées, ${(size / 1024).toFixed(0)} Kio dans ${OUTPUT}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
