"use server";

import { getSunWeek, type SunWeek } from "@/lib/sun";

/**
 * Server Action: compute sunrise, culmination and sunset for the coming week.
 *
 * `startISO` is the visitor's local midnight, sent by the client so the days
 * match its calendar and time zone.
 */
export async function fetchSunWeek(
  lat: number,
  lng: number,
  startISO: string,
  nowISO: string,
): Promise<SunWeek> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Coordonnées invalides.");
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error("Coordonnées hors limites.");
  }

  if (Number.isNaN(new Date(startISO).getTime())) {
    throw new Error("Date de départ invalide.");
  }

  if (Number.isNaN(new Date(nowISO).getTime())) {
    throw new Error("Instant courant invalide.");
  }

  return getSunWeek(lat, lng, startISO, nowISO);
}
