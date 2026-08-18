"use server";

import { cacheLife } from "next/cache";
import { getTransitsForLocation, type TransitEvent } from "@/lib/transits";

async function getCachedTransitsForGridCell(
  lat: number,
  lng: number,
  fromISO: string,
): Promise<TransitEvent[]> {
  "use cache";
  cacheLife("weeks");

  return getTransitsForLocation(lat, lng, fromISO);
}

/**
 * Server Action: compute the 20 next transits of Mercury and Venus at least
 * partly visible from a location.
 *
 * Transits are decades apart, so the search is anchored to the current UTC day
 * rather than to the exact instant: together with the 0.5° grid, that keeps
 * the cache key stable for every visitor of the day.
 */
export async function fetchTransitsForLocation(
  lat: number,
  lng: number,
): Promise<TransitEvent[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Coordonnées invalides.");
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error("Coordonnées hors limites.");
  }

  // Round to a 0.5° grid to maximise cache hits for nearby locations.
  const rLat = Math.round(lat * 2) / 2;
  const rLng = Math.round(lng * 2) / 2;
  const dayStartISO = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;

  return getCachedTransitsForGridCell(rLat, rLng, dayStartISO);
}
