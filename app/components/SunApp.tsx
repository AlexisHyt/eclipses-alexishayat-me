"use client";

import { useEffect, useState, useTransition } from "react";
import { fetchSunWeek } from "@/app/actions/sun";
import type { SunDay, SunWeek } from "@/lib/sun";
import {
  compassPoint,
  formatDurationHM,
  formatShortDate,
  formatSignedDuration,
  formatTime,
} from "./formatters";
import type { Location } from "./LocationPicker";
import SunArc from "./SunArc";

interface Props {
  location: Location | null;
}

const REGIME_LABELS: Record<string, string> = {
  "polar-day": "Jour polaire",
  "polar-night": "Nuit polaire",
};

function riseSetCell(iso: string | null, day: SunDay) {
  if (iso !== null) return formatTime(iso);
  return REGIME_LABELS[day.regime] ?? "—";
}

export default function SunApp({ location }: Props) {
  const [week, setWeek] = useState<SunWeek | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const lat = location?.lat ?? null;
  const lng = location?.lng ?? null;

  useEffect(() => {
    if (lat === null || lng === null) {
      setWeek(null);
      return;
    }

    const now = new Date();
    // Local midnight, so the days match the visitor's own calendar.
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    setError(null);
    startTransition(async () => {
      try {
        const data = await fetchSunWeek(
          lat,
          lng,
          start.toISOString(),
          now.toISOString(),
        );
        setWeek(data);
      } catch (e) {
        setError("Erreur lors du calcul de la course du Soleil.");
        console.error(e);
      }
    });
  }, [lat, lng]);

  if (location === null) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/30">
        Sélectionnez un emplacement pour voir le lever, la culmination et le
        coucher du Soleil.
      </div>
    );
  }

  if (isPending && week === null) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-56 animate-pulse rounded-2xl bg-white/4" />
        <div className="h-40 animate-pulse rounded-2xl bg-white/4" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (week === null) return null;

  const today = week.days[0];
  const isUp = week.current.altitude > 0;

  return (
    <div
      className={`flex flex-col gap-8 transition-opacity ${isPending ? "opacity-50" : ""}`}
    >
      {/* Today */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
          Aujourd&apos;hui à {location.label}
        </h2>
        <article className="flex flex-col gap-5 rounded-2xl border border-white/8 bg-white/3 px-5 py-6">
          <SunArc
            riseISO={today.riseISO}
            setISO={today.setISO}
            culminationAltitude={today.culminationAltitude}
            nowISO={week.current.atISO}
            regime={today.regime}
          />

          <dl className="grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-white/4 px-3 py-2">
              <dt className="mb-0.5 text-white/40">Lever</dt>
              <dd className="font-mono text-white/85">
                {riseSetCell(today.riseISO, today)}
              </dd>
              {today.riseAzimuth !== null && (
                <dd className="text-white/35">
                  {compassPoint(today.riseAzimuth)} ·{" "}
                  {Math.round(today.riseAzimuth)}°
                </dd>
              )}
            </div>
            <div className="rounded-lg bg-white/4 px-3 py-2">
              <dt className="mb-0.5 text-white/40">Culmination</dt>
              <dd className="font-mono text-white/85">
                {formatTime(today.culminationISO)}
              </dd>
              <dd className="text-white/35">
                {today.culminationAltitude.toFixed(1)}° au-dessus de
                l&apos;horizon
              </dd>
            </div>
            <div className="rounded-lg bg-white/4 px-3 py-2">
              <dt className="mb-0.5 text-white/40">Coucher</dt>
              <dd className="font-mono text-white/85">
                {riseSetCell(today.setISO, today)}
              </dd>
              {today.setAzimuth !== null && (
                <dd className="text-white/35">
                  {compassPoint(today.setAzimuth)} ·{" "}
                  {Math.round(today.setAzimuth)}°
                </dd>
              )}
            </div>
          </dl>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/45">
            {today.dayLengthSec !== null && (
              <span>
                ⏱ Durée du jour :{" "}
                <span className="font-mono text-white/75">
                  {formatDurationHM(today.dayLengthSec)}
                </span>
                {today.dayLengthDeltaSec !== null && (
                  <span
                    className={
                      today.dayLengthDeltaSec >= 0
                        ? " text-emerald-400/80"
                        : " text-rose-400/80"
                    }
                  >
                    {" "}
                    ({formatSignedDuration(today.dayLengthDeltaSec)} depuis
                    hier)
                  </span>
                )}
              </span>
            )}
            {today.civilDawnISO && (
              <span>
                🌅 Aube civile :{" "}
                <span className="font-mono text-white/75">
                  {formatTime(today.civilDawnISO)}
                </span>
              </span>
            )}
            {today.civilDuskISO && (
              <span>
                🌆 Crépuscule civil :{" "}
                <span className="font-mono text-white/75">
                  {formatTime(today.civilDuskISO)}
                </span>
              </span>
            )}
            <span>
              {isUp ? "☀️ Soleil actuellement à" : "🌙 Soleil actuellement à"}{" "}
              <span className="font-mono text-white/75">
                {week.current.altitude.toFixed(1)}°
              </span>{" "}
              ({compassPoint(week.current.azimuth)})
            </span>
          </div>
        </article>
      </section>

      {/* Week */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
          Les 7 prochains jours
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-white/8 bg-white/3">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-xs uppercase tracking-wider text-white/35">
                <th className="px-4 py-3 font-medium">Jour</th>
                <th className="px-4 py-3 font-medium">Lever</th>
                <th className="px-4 py-3 font-medium">Culmination</th>
                <th className="px-4 py-3 font-medium">Coucher</th>
                <th className="px-4 py-3 font-medium">Durée</th>
              </tr>
            </thead>
            <tbody>
              {week.days.map((day, i) => (
                <tr
                  key={day.dayStartISO}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-4 py-3 capitalize text-white/70">
                    {i === 0 ? "Aujourd'hui" : formatShortDate(day.dayStartISO)}
                  </td>
                  <td className="px-4 py-3 font-mono text-white/85">
                    {riseSetCell(day.riseISO, day)}
                  </td>
                  <td className="px-4 py-3 font-mono text-white/85">
                    {formatTime(day.culminationISO)}
                    <span className="ml-2 font-sans text-xs text-white/30">
                      {day.culminationAltitude.toFixed(1)}°
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-white/85">
                    {riseSetCell(day.setISO, day)}
                  </td>
                  <td className="px-4 py-3 font-mono text-white/85">
                    {day.dayLengthSec !== null
                      ? formatDurationHM(day.dayLengthSec)
                      : "—"}
                    {day.dayLengthDeltaSec !== null && (
                      <span
                        className={`ml-2 font-sans text-xs ${
                          day.dayLengthDeltaSec >= 0
                            ? "text-emerald-400/70"
                            : "text-rose-400/70"
                        }`}
                      >
                        {formatSignedDuration(day.dayLengthDeltaSec)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="pt-1 text-center text-xs text-white/25">
        Altitudes corrigées de la réfraction atmosphérique · heures dans votre
        fuseau ({Intl.DateTimeFormat().resolvedOptions().timeZone})
      </p>
    </div>
  );
}
