"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  compassPoint,
  formatDurationHM,
  formatDurationMinutes,
  formatFullDate,
  formatInDays,
  formatInYears,
  formatKm,
  formatMillimetres,
  formatPercent,
  formatPressure,
  formatShortDate,
  formatSignedDuration,
  formatSpeed,
  formatTemperature,
  formatTime,
  formatTimeAtOffset,
  formatTimeWithZone,
} from "@/app/components/formatters";
import {
  DEFAULT_LOCALE,
  DICTIONARIES,
  type Dictionary,
  isLocale,
  type Locale,
} from "./dictionaries";

const STORAGE_KEY = "sky.locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** The stored choice, or `null` when nothing usable is saved. */
function readStoredLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored !== null && isLocale(stored) ? stored : null;
  } catch {
    // Storage can be blocked entirely; the default locale is a fine fallback.
    return null;
  }
}

/** First browser language we actually translate, if any. */
function detectBrowserLocale(): Locale | null {
  const preferred =
    navigator.languages && navigator.languages.length > 0
      ? navigator.languages
      : [navigator.language];

  for (const tag of preferred) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return null;
}

/**
 * The language lives in `localStorage`, so the server has no way to know it:
 * the first paint is always the default locale and the stored choice is
 * applied right after mount, which keeps hydration free of mismatches.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const resolved = readStoredLocale() ?? detectBrowserLocale();
    if (resolved !== null && resolved !== DEFAULT_LOCALE) {
      setLocaleState(resolved);
    }
  }, []);

  // Keep the document in sync for screen readers, spellcheck and hyphenation.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A rejected write only costs persistence, not the switch itself.
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: DICTIONARIES[locale] }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LocaleContext);
  if (context === null) {
    throw new Error("useI18n must be used inside a LocaleProvider.");
  }
  return context;
}

/** The formatting helpers, already bound to the current locale. */
export function useFormatters() {
  const { locale } = useI18n();

  return useMemo(
    () => ({
      fullDate: (iso: string) => formatFullDate(iso, locale),
      shortDate: (iso: string) => formatShortDate(iso, locale),
      time: (iso: string) => formatTime(iso, locale),
      timeWithZone: (iso: string) => formatTimeWithZone(iso, locale),
      timeAtOffset: (iso: string, offsetSec: number) =>
        formatTimeAtOffset(iso, locale, offsetSec),
      km: (km: number) => formatKm(km, locale),
      pressure: (hectopascals: number) => formatPressure(hectopascals, locale),
      temperature: (celsius: number) => formatTemperature(celsius, locale),
      speed: (kmh: number) => formatSpeed(kmh, locale),
      millimetres: (mm: number) => formatMillimetres(mm, locale),
      percent: (ratio: number) => formatPercent(ratio, locale),
      durationHM: (seconds: number) => formatDurationHM(seconds, locale),
      durationMinutes: (minutes: number) =>
        formatDurationMinutes(minutes, locale),
      signedDuration: (seconds: number) =>
        formatSignedDuration(seconds, locale),
      compass: (azimuth: number) => compassPoint(azimuth, locale),
      inDays: (iso: string, fromISO: string) =>
        formatInDays(iso, fromISO, locale),
      inYears: (iso: string, fromISO: string) =>
        formatInYears(iso, fromISO, locale),
    }),
    [locale],
  );
}
