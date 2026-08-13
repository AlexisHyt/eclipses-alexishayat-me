"use server";

import { cacheLife } from "next/cache";
import type { PathPoint } from "@/lib/eclipse-path";
import {
  type EclipseResult,
  getEclipsesForLocation,
  getGlobalTotalEclipsesPage,
} from "@/lib/eclipses";
import {
  fetchNasaEclipsePath,
  type NasaPathStatus,
} from "@/lib/nasa-eclipse-path";

export interface EclipseWithPath extends EclipseResult {
  pathPoints: PathPoint[];
  nasaPathStatus: NasaPathStatus;
  nasaSourceUrl: string | null;
}

export interface GlobalEclipsesPageWithPath {
  eclipses: EclipseWithPath[];
  nextCursorISO: string | null;
}

async function enrichEclipsesWithPath(
  eclipses: EclipseResult[],
): Promise<EclipseWithPath[]> {
  return Promise.all(
    eclipses.map(async (eclipse) => {
      const nasaPath = await fetchNasaEclipsePath(
        eclipse.peakISO,
        eclipse.globalType,
      );

      return {
        ...eclipse,
        pathPoints: nasaPath.pathPoints,
        nasaPathStatus: nasaPath.status,
        nasaSourceUrl: nasaPath.sourceUrl,
      };
    }),
  );
}

async function getCachedEclipsesForGridCell(
  lat: number,
  lng: number,
): Promise<EclipseWithPath[]> {
  "use cache";
  cacheLife("days");

  const eclipses = await getEclipsesForLocation(lat, lng);

  return enrichEclipsesWithPath(eclipses);
}

async function getCachedGlobalTotalEclipsesPage(
  afterISO: string | null,
  limit: number,
): Promise<GlobalEclipsesPageWithPath> {
  "use cache";
  cacheLife("weeks");

  const page = await getGlobalTotalEclipsesPage(afterISO, limit);

  return {
    eclipses: await enrichEclipsesWithPath(page.eclipses),
    nextCursorISO: page.nextCursorISO,
  };
}

/**
 * Server Action: compute the 20 next solar eclipses visible from a location.
 * Results are cached per rounded coordinate pair (±0.5°) for 24 h.
 */
export async function fetchEclipsesForLocation(
  lat: number,
  lng: number,
): Promise<EclipseWithPath[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Coordonnées invalides.");
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error("Coordonnées hors limites.");
  }

  // Round to 0.5° grid to maximise cache hits for nearby locations
  const rLat = Math.round(lat * 2) / 2;
  const rLng = Math.round(lng * 2) / 2;

  return getCachedEclipsesForGridCell(rLat, rLng);
}

export async function fetchGlobalTotalEclipsesPage(
  afterISO: string | null = null,
  limit = 10,
): Promise<GlobalEclipsesPageWithPath> {
  if (afterISO !== null && Number.isNaN(new Date(afterISO).getTime())) {
    throw new Error("Curseur invalide.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new Error("Limite invalide.");
  }

  return getCachedGlobalTotalEclipsesPage(afterISO, limit);
}
