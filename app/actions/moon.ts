"use server";

import { getMoonWeek, type MoonWeek } from "@/lib/moon";

/**
 * Server Action: compute the Moon phase for the coming week.
 *
 * `startISO` is the visitor's local midnight and `nowISO` the current instant,
 * both sent by the client so the days match its calendar and time zone.
 * Coordinates are optional: without them the phases are still returned, only
 * the moonrise / moonset times are omitted.
 */
export async function fetchMoonWeek(
  lat: number | null,
  lng: number | null,
  startISO: string,
  nowISO: string,
): Promise<MoonWeek> {
  if (lat !== null || lng !== null) {
    if (
      lat === null ||
      lng === null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      throw new Error("Coordonnées invalides.");
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error("Coordonnées hors limites.");
    }
  }

  if (Number.isNaN(new Date(startISO).getTime())) {
    throw new Error("Date de départ invalide.");
  }

  if (Number.isNaN(new Date(nowISO).getTime())) {
    throw new Error("Instant courant invalide.");
  }

  return getMoonWeek(lat, lng, startISO, nowISO);
}
