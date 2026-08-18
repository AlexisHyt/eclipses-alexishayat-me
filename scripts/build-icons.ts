/**
 * Generates app/favicon.ico and app/apple-icon.png from app/icon.svg.
 * Usage: bun run scripts/build-icons.ts
 */
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const SOURCE = "app/icon.svg";
const BASE_SIZE = 64;

const svg = await readFile(SOURCE, "utf8");

async function renderPng(source: string, size: number): Promise<Buffer> {
  const density = (72 * size) / BASE_SIZE;
  return sharp(Buffer.from(source), { density })
    .resize(size, size)
    .png()
    .toBuffer();
}

function packIco(entries: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  const dirs: Buffer[] = [];
  let offset = 6 + 16 * entries.length;
  for (const { size, data } of entries) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(size >= 256 ? 0 : size, 0);
    dir.writeUInt8(size >= 256 ? 0 : size, 1);
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(data.length, 8);
    dir.writeUInt32LE(offset, 12);
    offset += data.length;
    dirs.push(dir);
  }
  return Buffer.concat([header, ...dirs, ...entries.map((e) => e.data)]);
}

const icoSizes = [16, 32, 48];
const icoEntries = await Promise.all(
  icoSizes.map(async (size) => ({ size, data: await renderPng(svg, size) })),
);
await writeFile("app/favicon.ico", packIco(icoEntries));
console.log(`favicon.ico written (${icoSizes.join(", ")}px)`);

// Apple touch icons get their corners rounded by iOS itself: full-bleed square.
const squareSvg = svg.replace(
  /<rect [^>]*\/>/,
  '<rect width="64" height="64" fill="url(#bg)"/>',
);
await writeFile("app/apple-icon.png", await renderPng(squareSvg, 180));
console.log("apple-icon.png written (180px)");
