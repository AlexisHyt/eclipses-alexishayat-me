import {
  EclipseKind,
  type LocalSolarEclipseInfo,
  NextLocalSolarEclipse,
  Observer,
  SearchGlobalSolarEclipse,
  SearchLocalSolarEclipse,
} from "astronomy-engine";

export type EclipseType = "Total" | "Annular" | "Partial";

export interface EclipseResult {
  /** ISO string of the peak time (UTC) */
  peakISO: string;
  type: EclipseType;
  /** Fraction 0–1 of Sun obscured at local peak */
  obscuration: number;
  /** Total/annular duration in minutes (0 for partial) */
  centralDurationMin: number;
  /** Geographic lat/lng of maximum eclipse on Earth */
  maxLat: number | null;
  maxLng: number | null;
  /** Global eclipse type for NASA path lookup */
  globalType: EclipseType;
  /** Local contact times (ISO strings) */
  partialBeginISO: string;
  partialEndISO: string;
  totalBeginISO: string | null;
  totalEndISO: string | null;
}

function eclipseKindToType(kind: EclipseKind): EclipseType | null {
  if (kind === EclipseKind.Total) return "Total";
  if (kind === EclipseKind.Annular) return "Annular";
  if (kind === EclipseKind.Partial) return "Partial";
  return null;
}

function isLocallyVisible(local: LocalSolarEclipseInfo): boolean {
  return [
    local.partial_begin.altitude,
    local.peak.altitude,
    local.partial_end.altitude,
    local.total_begin?.altitude,
    local.total_end?.altitude,
  ].some((altitude) => (altitude ?? -90) > 0);
}

/**
 * Find the next 20 solar eclipses (total, annular, partial) visible from
 * the given lat/lng (obscuration > 0).
 */
export async function getEclipsesForLocation(
  lat: number,
  lng: number,
): Promise<EclipseResult[]> {
  const observer = new Observer(lat, lng, 0);
  const results: EclipseResult[] = [];

  let local = SearchLocalSolarEclipse(new Date(), observer);

  for (let i = 0; i < 400 && results.length < 30; i++) {
    const type = eclipseKindToType(local.kind);

    if (type !== null && local.obscuration > 0 && isLocallyVisible(local)) {
      const peakDate = local.peak.time.date;
      const globalSearchStart = new Date(peakDate.getTime() - 36 * 3600 * 1000);
      const global = SearchGlobalSolarEclipse(globalSearchStart);
      const globalType = eclipseKindToType(global.kind) ?? type;

      let centralDurationMin = 0;
      if (local.total_begin && local.total_end) {
        centralDurationMin =
          (local.total_end.time.date.getTime() -
            local.total_begin.time.date.getTime()) /
          60000;
      }

      results.push({
        peakISO: peakDate.toISOString(),
        type,
        obscuration: Math.round(local.obscuration * 1000) / 1000,
        centralDurationMin: Math.round(centralDurationMin * 10) / 10,
        maxLat: global.latitude ?? null,
        maxLng: global.longitude ?? null,
        globalType,
        partialBeginISO: local.partial_begin.time.date.toISOString(),
        partialEndISO: local.partial_end.time.date.toISOString(),
        totalBeginISO: local.total_begin
          ? local.total_begin.time.date.toISOString()
          : null,
        totalEndISO: local.total_end
          ? local.total_end.time.date.toISOString()
          : null,
      });
    }

    local = NextLocalSolarEclipse(local.peak.time.date, observer);
  }

  return results;
}
