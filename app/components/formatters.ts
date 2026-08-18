/** Shared, locale-aware formatting helpers for the astronomical panels. */

import { LOCALE_TAGS, type Locale } from "@/app/i18n/dictionaries";

/** How each language writes a duration; French spaces its units, English does not. */
interface DurationStyle {
  hourMinute: (hours: number, minutes: string) => string;
  minuteSecond: (minutes: number, seconds: string) => string;
  minutesOnly: (minutes: number) => string;
  secondsOnly: (seconds: number) => string;
}

const DURATION_STYLES: Record<Locale, DurationStyle> = {
  fr: {
    hourMinute: (hours, minutes) => `${hours} h ${minutes}`,
    minuteSecond: (minutes, seconds) => `${minutes} min ${seconds} s`,
    minutesOnly: (minutes) => `${minutes} min`,
    secondsOnly: (seconds) => `${seconds} s`,
  },
  en: {
    hourMinute: (hours, minutes) => `${hours}h ${minutes}m`,
    minuteSecond: (minutes, seconds) => `${minutes}m ${seconds}s`,
    minutesOnly: (minutes) => `${minutes}m`,
    secondsOnly: (seconds) => `${seconds}s`,
  },
};

const COMPASS_POINTS: Record<Locale, readonly string[]> = {
  // French names the west "Ouest", so its compass runs O rather than W.
  fr: [
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
  ],
  en: [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ],
};

const RELATIVE_DAYS: Record<
  Locale,
  { today: string; tomorrow: string; inDays: (days: number) => string }
> = {
  fr: {
    today: "aujourd'hui",
    tomorrow: "demain",
    inDays: (days) => `dans ${days} jours`,
  },
  en: {
    today: "today",
    tomorrow: "tomorrow",
    inDays: (days) => `in ${days} days`,
  },
};

export function formatFullDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(LOCALE_TAGS[locale], {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(iso: string, locale: Locale) {
  return new Date(iso).toLocaleDateString(LOCALE_TAGS[locale], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatTime(iso: string, locale: Locale) {
  return new Date(iso).toLocaleTimeString(LOCALE_TAGS[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** 14:32 CET — the same clock time, with the browser time zone spelled out. */
export function formatTimeWithZone(iso: string, locale: Locale) {
  const parts = new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).formatToParts(new Date(iso));

  const hour = parts.find((part) => part.type === "hour")?.value ?? "--";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "--";
  const zone = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
  return `${hour}:${minute} ${zone}`;
}

export function formatKm(km: number, locale: Locale) {
  return `${new Intl.NumberFormat(LOCALE_TAGS[locale]).format(km)} km`;
}

/** 13 h 45 */
export function formatDurationHM(seconds: number, locale: Locale) {
  const total = Math.max(0, Math.round(seconds / 60));
  return DURATION_STYLES[locale].hourMinute(
    Math.floor(total / 60),
    String(total % 60).padStart(2, "0"),
  );
}

/** 3 min 20 s, for the short central phase of an eclipse. */
export function formatDurationMinutes(minutes: number, locale: Locale) {
  const style = DURATION_STYLES[locale];
  if (minutes < 1) return style.secondsOnly(Math.round(minutes * 60));

  const whole = Math.floor(minutes);
  const seconds = Math.round((minutes - whole) * 60);
  return seconds > 0
    ? style.minuteSecond(whole, String(seconds))
    : style.minutesOnly(whole);
}

/** +2 min 14 s, always signed, used for day-length variations. */
export function formatSignedDuration(seconds: number, locale: Locale) {
  const style = DURATION_STYLES[locale];
  const sign = seconds < 0 ? "−" : "+";
  const abs = Math.abs(Math.round(seconds));
  const minutes = Math.floor(abs / 60);
  const rest = abs % 60;

  if (minutes === 0) return `${sign}${style.secondsOnly(rest)}`;
  return `${sign}${style.minuteSecond(minutes, String(rest).padStart(2, "0"))}`;
}

/** Turn an azimuth in degrees into a compass point (N, ENE, SO/SW…). */
export function compassPoint(azimuth: number, locale: Locale) {
  const index = Math.round((((azimuth % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS_POINTS[locale][index];
}

/** Relative day count: "aujourd'hui", "demain", "dans 12 jours". */
export function formatInDays(iso: string, fromISO: string, locale: Locale) {
  const words = RELATIVE_DAYS[locale];
  const days = Math.round(
    (new Date(iso).getTime() - new Date(fromISO).getTime()) /
      (24 * 60 * 60 * 1000),
  );

  if (days <= 0) return words.today;
  if (days === 1) return words.tomorrow;
  return words.inDays(days);
}
