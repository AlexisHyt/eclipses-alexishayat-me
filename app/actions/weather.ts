"use server";

import { cacheLife } from "next/cache";
import {
  getWeather,
  type WeatherLanguage,
  type WeatherResult,
} from "@/lib/weather";

async function getCachedWeatherForGridCell(
  lat: number,
  lng: number,
  language: WeatherLanguage,
): Promise<WeatherResult> {
  "use cache";
  cacheLife("weather");

  return getWeather(lat, lng, language);
}

/**
 * Server Action: current weather, today's three hour slots, and the evening of
 * each following day.
 *
 * Coordinates are rounded to a 0.1° grid — about ten kilometres, well inside
 * the resolution of the forecast — so neighbouring visitors share one pair of
 * calls to OpenWeatherMap, whose key stays on the server.
 */
export async function fetchWeather(
  lat: number,
  lng: number,
  language: WeatherLanguage,
): Promise<WeatherResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Coordonnées invalides.");
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error("Coordonnées hors limites.");
  }

  if (language !== "fr" && language !== "en") {
    throw new Error("Langue non prise en charge.");
  }

  const rLat = Math.round(lat * 10) / 10;
  const rLng = Math.round(lng * 10) / 10;

  return getCachedWeatherForGridCell(rLat, rLng, language);
}
