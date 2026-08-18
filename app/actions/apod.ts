"use server";

import { cacheLife } from "next/cache";
import { type ApodPicture, getApod } from "@/lib/apod";

async function getCachedApod(): Promise<ApodPicture> {
  "use cache";
  cacheLife("hours");

  return getApod();
}

/**
 * Server Action: fetch NASA's picture of the day.
 *
 * The picture changes once a day, around 05:00 UTC, so the result is cached
 * for an hour: every visitor shares the same handful of calls to the NASA API,
 * whose key stays on the server.
 */
export async function fetchApod(): Promise<ApodPicture> {
  return getCachedApod();
}
