"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useTransition } from "react";
import { fetchNightSky } from "@/app/actions/sky";
import { useFormatters, useI18n } from "@/app/i18n/context";
import { SIDEREAL_HOURS_PER_SECOND } from "@/lib/sidereal";
import type { NightSky } from "@/lib/sky";
import type { Location } from "./LocationPicker";

interface Props {
  location: Location | null;
}

// Three.js and the star catalogue are heavy and browser-only.
const StarSphere = dynamic(() => import("./StarSphere"), {
  ssr: false,
  loading: () => (
    <div className="h-80 animate-pulse rounded-2xl bg-white/4 sm:h-[28rem]" />
  ),
});

const MINUTE_MS = 60 * 1000;

/** Minutes from the start of the night to `iso`, clamped to the window. */
function offsetFor(iso: string, sky: NightSky, durationMinutes: number) {
  const offset =
    (new Date(iso).getTime() - new Date(sky.startISO).getTime()) / MINUTE_MS;
  return Math.min(Math.max(Math.round(offset), 0), durationMinutes);
}

export default function NightSkyApp({ location }: Props) {
  const { t } = useI18n();
  const fmt = useFormatters();
  const [sky, setSky] = useState<NightSky | null>(null);
  const [offsetMinutes, setOffsetMinutes] = useState(0);
  const [nowISO, setNowISO] = useState<string | null>(null);
  const [showConstellations, setShowConstellations] = useState(true);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const lat = location?.lat ?? null;
  const lng = location?.lng ?? null;

  useEffect(() => {
    if (lat === null || lng === null) {
      setSky(null);
      return;
    }

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    setFailed(false);
    startTransition(async () => {
      try {
        const data = await fetchNightSky(
          lat,
          lng,
          now.toISOString(),
          dayStart.toISOString(),
        );
        const duration = Math.round(
          (new Date(data.endISO).getTime() -
            new Date(data.startISO).getTime()) /
            MINUTE_MS,
        );

        setSky(data);
        setNowISO(now.toISOString());
        // Open on the current moment when the night is already under way.
        setOffsetMinutes(offsetFor(now.toISOString(), data, duration));
      } catch (e) {
        setFailed(true);
        console.error(e);
      }
    });
  }, [lat, lng]);

  if (location === null) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/30">
        {t.night.pickLocation}
      </div>
    );
  }

  if (isPending && sky === null) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-80 animate-pulse rounded-2xl bg-white/4 sm:h-[28rem]" />
        <div className="h-16 animate-pulse rounded-2xl bg-white/4" />
      </div>
    );
  }

  if (failed) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
        {t.night.error}
      </div>
    );
  }

  if (sky === null) return null;

  const startMs = new Date(sky.startISO).getTime();
  const durationMinutes = Math.round(
    (new Date(sky.endISO).getTime() - startMs) / MINUTE_MS,
  );
  const currentISO = new Date(
    startMs + offsetMinutes * MINUTE_MS,
  ).toISOString();

  // The sky turns at the sidereal rate, so the whole scene is one rotation
  // away from its position at sunset.
  const siderealHours =
    (sky.siderealStartHours +
      offsetMinutes * 60 * SIDEREAL_HOURS_PER_SECOND +
      24) %
    24;

  const nowOffset =
    nowISO === null ? null : offsetFor(nowISO, sky, durationMinutes);
  const nowIsInsideNight =
    nowISO !== null &&
    new Date(nowISO).getTime() >= startMs &&
    new Date(nowISO).getTime() <= new Date(sky.endISO).getTime();

  return (
    <div
      className={`flex flex-col gap-6 transition-opacity ${isPending ? "opacity-50" : ""}`}
    >
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
          {t.night.skyOf(location.label)}
        </h2>

        <StarSphere
          siderealHours={siderealHours}
          nightFraction={
            durationMinutes === 0 ? 0 : offsetMinutes / durationMinutes
          }
          latitude={sky.latitude}
          precession={sky.precession}
          bodies={sky.bodies}
          showConstellations={showConstellations}
        />

        {/* Night slider */}
        <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/3 px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-mono text-lg text-white/90">
              {fmt.time(currentISO)}
            </span>
            <span className="text-xs capitalize text-white/40">
              {fmt.shortDate(currentISO)}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={durationMinutes}
            step={1}
            value={offsetMinutes}
            onChange={(event) =>
              setOffsetMinutes(Number.parseInt(event.target.value, 10))
            }
            aria-label={t.night.sliderLabel}
            className="w-full accent-indigo-400"
          />

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-white/40">
            <span>
              {sky.isFallbackWindow ? t.night.windowStart : t.night.sunset} ·{" "}
              <span className="font-mono text-white/60">
                {fmt.time(sky.startISO)}
              </span>
            </span>
            <span className="text-white/30">
              {t.night.nightLength(fmt.durationHM(durationMinutes * 60))}
            </span>
            <span>
              {sky.isFallbackWindow ? t.night.windowEnd : t.night.sunrise} ·{" "}
              <span className="font-mono text-white/60">
                {fmt.time(sky.endISO)}
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {nowIsInsideNight && nowOffset !== null && (
              <button
                type="button"
                onClick={() => setOffsetMinutes(nowOffset)}
                disabled={offsetMinutes === nowOffset}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t.night.backToNow}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowConstellations((shown) => !shown)}
              aria-pressed={showConstellations}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                showConstellations
                  ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-100"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              {t.night.constellations}
            </button>
          </div>
        </div>
      </section>

      {sky.isFallbackWindow && (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-5 py-3 text-xs text-amber-200/80">
          {t.night.fallbackWindow}
        </p>
      )}

      <p className="text-xs text-white/25">{t.night.help}</p>

      <p className="pt-1 text-center text-xs text-white/25">
        {t.night.creditStarsFrom}{" "}
        <a
          href="https://github.com/astronexus/HYG-Database"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-white/40"
        >
          {t.night.creditCatalogue}
        </a>{" "}
        {t.night.creditConstellationsFrom}{" "}
        <a
          href="https://github.com/ofrohn/d3-celestial"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-white/40"
        >
          d3-celestial
        </a>{" "}
        {t.night.creditCredits(
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        )}
      </p>
    </div>
  );
}
