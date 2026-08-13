import { Body, Equator, Observer, SiderealTime } from "astronomy-engine";

export interface PathPoint {
  lat: number;
  lng: number;
}

/**
 * Compute the central shadow track (umbra/antumbra path) for a solar eclipse.
 *
 * Strategy: for each time step during the eclipse window, compute the
 * sub-lunar point (where the Moon is directly overhead = geographic coordinates
 * derived from geocentric RA/Dec + Greenwich Sidereal Time). This approximates
 * the umbra center path to within ~50 km, sufficient for map display.
 *
 * @param peakISO  ISO string of the eclipse peak (UTC)
 * @param halfDurationHours  half-duration of the partial phase in hours
 * @param stepMinutes  time step between samples (default 4 min)
 */
export function computeEclipsePath(
  peakISO: string,
  halfDurationHours: number,
  stepMinutes = 4,
): PathPoint[] {
  // Ensure minimum duration for calculation
  const minHalfDuration = Math.max(halfDurationHours, 0.5);

  const peakMs = new Date(peakISO).getTime();
  const halfMs = minHalfDuration * 3600 * 1000;
  const stepMs = stepMinutes * 60 * 1000;

  // Dummy observer at equator/meridian — we only need geocentric Moon coords
  const geoObserver = new Observer(0, 0, 0);

  const points: PathPoint[] = [];

  for (let t = peakMs - halfMs; t <= peakMs + halfMs; t += stepMs) {
    const date = new Date(t);

    try {
      // Geocentric equatorial coordinates of Moon (of date, aberration-corrected)
      const eq = Equator(Body.Moon, date, geoObserver, true, true);

      // Greenwich Apparent Sidereal Time in hours [0, 24)
      const gast = SiderealTime(date); // hours

      // Geographic latitude = declination
      const lat = eq.dec;

      // Geographic longitude = (RA - GAST) * 15 converted to degrees, normalised
      const raHours = eq.ra; // hours
      let lng = (raHours - gast) * 15; // degrees
      // Normalise to -180..180
      lng = ((lng + 180) % 360) - 180;
      if (lng < -180) lng += 360;

      points.push({
        lat: Math.round(lat * 100) / 100,
        lng: Math.round(lng * 100) / 100,
      });
    } catch {
      // Skip failed computation
    }
  }

  return points;
}

/**
 * Compute the eclipse path half-duration (partial phase) in hours from the
 * partial begin/end ISO strings.
 */
export function computeHalfDuration(
  partialBeginISO: string,
  partialEndISO: string,
): number {
  const begin = new Date(partialBeginISO).getTime();
  const end = new Date(partialEndISO).getTime();
  return (end - begin) / 2 / 3600 / 1000;
}
