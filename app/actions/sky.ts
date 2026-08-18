"use server";

import { getNightSky, type NightSky } from "@/lib/sky";

/**
 * Server Action: describe the coming night for an observer — when it runs
 * from and to, and the rotations that place the star catalogue in their sky.
 *
 * `nowISO` and `dayStartISO` (the visitor's local midnight) are sent by the
 * client so the night matches its calendar and time zone.
 */
export async function fetchNightSky(
  lat: number,
  lng: number,
  nowISO: string,
  dayStartISO: string,
): Promise<NightSky> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Coordonnées invalides.");
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error("Coordonnées hors limites.");
  }

  if (Number.isNaN(new Date(nowISO).getTime())) {
    throw new Error("Instant courant invalide.");
  }

  if (Number.isNaN(new Date(dayStartISO).getTime())) {
    throw new Error("Date de départ invalide.");
  }

  return getNightSky(lat, lng, nowISO, dayStartISO);
}
