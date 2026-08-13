import type { PathPoint } from "@/lib/eclipse-path";
import type { EclipseType } from "@/lib/eclipses";

export type NasaPathStatus = "ok" | "not-found" | "unavailable";

export interface NasaPathResult {
  status: NasaPathStatus;
  sourceUrl: string;
  pathPoints: PathPoint[];
}

function formatNasaMonth(date: Date): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ] as const;
  return months[date.getUTCMonth()];
}

function typeToNasaCode(globalType: EclipseType): "T" | "A" | "P" {
  if (globalType === "Total") return "T";
  if (globalType === "Annular") return "A";
  return "P";
}

function toDecimal(deg: number, minutes: number, hemi: "N" | "S" | "E" | "W") {
  const abs = deg + minutes / 60;
  return hemi === "S" || hemi === "W" ? -abs : abs;
}

function parseCentralLinePoints(html: string): PathPoint[] {
  const preMatch = html.match(/<pre>([\s\S]*?)<\/pre>/i);
  if (!preMatch) return [];

  const text = preMatch[1].replace(/&#\d+;/g, " ");
  const lines = text.split(/\r?\n/);
  const points: PathPoint[] = [];

  for (const line of lines) {
    if (!/^\s*\d{2}:\d{2}\s+/.test(line)) continue;

    const coordRegex =
      /(\d{1,2})\s+(\d{2}\.\d)([NS])\s+(\d{3})\s+(\d{2}\.\d)([EW])/g;
    const matches = [...line.matchAll(coordRegex)];

    // Each row has 3 coordinate pairs (north/south/central). We need central (3rd).
    if (matches.length < 3) continue;
    const center = matches[2];

    const latDeg = Number(center[1]);
    const latMin = Number(center[2]);
    const latHemi = center[3] as "N" | "S";
    const lngDeg = Number(center[4]);
    const lngMin = Number(center[5]);
    const lngHemi = center[6] as "E" | "W";

    const lat = toDecimal(latDeg, latMin, latHemi);
    const lng = toDecimal(lngDeg, lngMin, lngHemi);

    points.push({
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
    });
  }

  return points;
}

export function buildNasaPathUrl(
  peakISO: string,
  globalType: EclipseType,
): string {
  const date = new Date(peakISO);
  const year = date.getUTCFullYear();
  const month = formatNasaMonth(date);
  const day = String(date.getUTCDate()).padStart(2, "0");

  // NASA GSFC stores solar path tables in 100-year buckets like SEpath2001.
  const bucketStartYear = Math.floor((year - 1) / 100) * 100 + 1;
  const typeCode = typeToNasaCode(globalType);

  return `https://eclipse.gsfc.nasa.gov/SEpath/SEpath${bucketStartYear}/SE${year}${month}${day}${typeCode}path.html`;
}

export async function fetchNasaEclipsePath(
  peakISO: string,
  globalType: EclipseType,
): Promise<NasaPathResult> {
  const sourceUrl = buildNasaPathUrl(peakISO, globalType);

  try {
    const response = await fetch(sourceUrl, {
      method: "GET",
      redirect: "follow",
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    if (response.status === 404) {
      return { status: "not-found", sourceUrl, pathPoints: [] };
    }

    if (!response.ok) {
      return { status: "unavailable", sourceUrl, pathPoints: [] };
    }

    const html = await response.text();
    const pathPoints = parseCentralLinePoints(html);

    if (pathPoints.length < 2) {
      return { status: "not-found", sourceUrl, pathPoints: [] };
    }

    return {
      status: "ok",
      sourceUrl,
      pathPoints,
    };
  } catch {
    return {
      status: "unavailable",
      sourceUrl,
      pathPoints: [],
    };
  }
}
