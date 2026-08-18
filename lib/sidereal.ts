/**
 * Small frame-and-rotation values shared by the server calculations and the
 * browser viewer. Kept free of any dependency so importing it from a client
 * component does not drag an ephemeris library into the bundle.
 */

/** Row-major 3×3 matrix: `out[i] = Σ m[i][j] · in[j]`. */
export type Matrix3 = [
  [number, number, number],
  [number, number, number],
  [number, number, number],
];

/** One sidereal day: the time the sky takes to come back to the same place. */
export const SIDEREAL_DAY_SEC = 86164.0905;

/** Sidereal hours gained per second of clock time. */
export const SIDEREAL_HOURS_PER_SECOND = 24 / SIDEREAL_DAY_SEC;
