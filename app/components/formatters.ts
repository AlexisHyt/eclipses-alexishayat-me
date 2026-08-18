/** Shared French formatting helpers for the astronomical panels. */

export function formatFullDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatKm(km: number) {
  return `${new Intl.NumberFormat("fr-FR").format(km)} km`;
}

/** 13 h 45 */
export function formatDurationHM(seconds: number) {
  const total = Math.max(0, Math.round(seconds / 60));
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, "0")}`;
}

/** +2 min 14 s, always signed, used for day-length variations. */
export function formatSignedDuration(seconds: number) {
  const sign = seconds < 0 ? "−" : "+";
  const abs = Math.abs(Math.round(seconds));
  const minutes = Math.floor(abs / 60);
  const rest = abs % 60;

  if (minutes === 0) return `${sign}${rest} s`;
  return `${sign}${minutes} min ${String(rest).padStart(2, "0")} s`;
}

const COMPASS_POINTS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSO",
  "SO",
  "OSO",
  "O",
  "ONO",
  "NO",
  "NNO",
];

/** Turn an azimuth in degrees into a French compass point (N, ENE, SO…). */
export function compassPoint(azimuth: number) {
  const index = Math.round((((azimuth % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS_POINTS[index];
}

/** Relative day count: "aujourd'hui", "demain", "dans 12 jours". */
export function formatInDays(iso: string, fromISO: string) {
  const days = Math.round(
    (new Date(iso).getTime() - new Date(fromISO).getTime()) /
      (24 * 60 * 60 * 1000),
  );

  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "demain";
  return `dans ${days} jours`;
}
