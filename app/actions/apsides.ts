"use server";

import { type ApsidesData, getApsides } from "@/lib/apsides";

/**
 * Server Action: compute the upcoming lunar and solar apsides.
 *
 * `fromISO` is the current instant sent by the client. Apsides are the same
 * everywhere on Earth, so no coordinates are involved.
 */
export async function fetchApsides(fromISO: string): Promise<ApsidesData> {
  if (Number.isNaN(new Date(fromISO).getTime())) {
    throw new Error("Instant courant invalide.");
  }

  return getApsides(fromISO);
}
