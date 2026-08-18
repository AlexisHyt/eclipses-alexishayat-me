"use client";

import { useEffect, useState, useTransition } from "react";
import { fetchSunWeek } from "@/app/actions/sun";
import { useFormatters, useI18n } from "@/app/i18n/context";
import type { Dictionary } from "@/app/i18n/dictionaries";
import type { SunDay, SunWeek } from "@/lib/sun";
import type { Location } from "./LocationPicker";
import SunArc from "./SunArc";

interface Props {
  location: Location | null;
}

/** A rise or set time, or the reason there is none that day. */
function riseSetCell(
  iso: string | null,
  day: SunDay,
  t: Dictionary,
  time: (iso: string) => string,
) {
  if (iso !== null) return time(iso);
  if (day.regime === "normal") return "—";
  return t.sun.regimes[day.regime];
}

export default function SunApp({ location }: Props) {
  const { t } = useI18n();
  const fmt = useFormatters();
  const [week, setWeek] = useState<SunWeek | null>(null);
  const [failed, setFailed] = useState(false);
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

    setFailed(false);
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
        setFailed(true);
        console.error(e);
      }
    });
  }, [lat, lng]);

  if (location === null) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/30">
        {t.sun.pickLocation}
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

  if (failed) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
        {t.sun.error}
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
          {t.sun.todayAt(location.label)}
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
              <dt className="mb-0.5 text-white/40">{t.sun.rise}</dt>
              <dd className="font-mono text-white/85">
                {riseSetCell(today.riseISO, today, t, fmt.time)}
              </dd>
              {today.riseAzimuth !== null && (
                <dd className="text-white/35">
                  {fmt.compass(today.riseAzimuth)} ·{" "}
                  {Math.round(today.riseAzimuth)}°
                </dd>
              )}
            </div>
            <div className="rounded-lg bg-white/4 px-3 py-2">
              <dt className="mb-0.5 text-white/40">{t.sun.culmination}</dt>
              <dd className="font-mono text-white/85">
                {fmt.time(today.culminationISO)}
              </dd>
              <dd className="text-white/35">
                {t.sun.aboveHorizon(today.culminationAltitude.toFixed(1))}
              </dd>
            </div>
            <div className="rounded-lg bg-white/4 px-3 py-2">
              <dt className="mb-0.5 text-white/40">{t.sun.set}</dt>
              <dd className="font-mono text-white/85">
                {riseSetCell(today.setISO, today, t, fmt.time)}
              </dd>
              {today.setAzimuth !== null && (
                <dd className="text-white/35">
                  {fmt.compass(today.setAzimuth)} ·{" "}
                  {Math.round(today.setAzimuth)}°
                </dd>
              )}
            </div>
          </dl>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/45">
            {today.dayLengthSec !== null && (
              <span>
                ⏱ {t.sun.dayLength} :{" "}
                <span className="font-mono text-white/75">
                  {fmt.durationHM(today.dayLengthSec)}
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
                    {t.sun.sinceYesterday(
                      fmt.signedDuration(today.dayLengthDeltaSec),
                    )}
                  </span>
                )}
              </span>
            )}
            {today.civilDawnISO && (
              <span>
                🌅 {t.sun.civilDawn} :{" "}
                <span className="font-mono text-white/75">
                  {fmt.time(today.civilDawnISO)}
                </span>
              </span>
            )}
            {today.civilDuskISO && (
              <span>
                🌆 {t.sun.civilDusk} :{" "}
                <span className="font-mono text-white/75">
                  {fmt.time(today.civilDuskISO)}
                </span>
              </span>
            )}
            <span>
              {isUp ? "☀️" : "🌙"} {t.sun.currentAltitude}{" "}
              <span className="font-mono text-white/75">
                {week.current.altitude.toFixed(1)}°
              </span>{" "}
              ({fmt.compass(week.current.azimuth)})
            </span>
          </div>
        </article>
      </section>

      {/* Week */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
          {t.sun.week}
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-white/8 bg-white/3">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-xs uppercase tracking-wider text-white/35">
                <th className="px-4 py-3 font-medium">{t.sun.columnDay}</th>
                <th className="px-4 py-3 font-medium">{t.sun.rise}</th>
                <th className="px-4 py-3 font-medium">{t.sun.culmination}</th>
                <th className="px-4 py-3 font-medium">{t.sun.set}</th>
                <th className="px-4 py-3 font-medium">
                  {t.sun.columnDuration}
                </th>
              </tr>
            </thead>
            <tbody>
              {week.days.map((day, i) => (
                <tr
                  key={day.dayStartISO}
                  className="border-b border-white/5 last:border-0"
                >
                  <td className="px-4 py-3 capitalize text-white/70">
                    {i === 0 ? t.sun.today : fmt.shortDate(day.dayStartISO)}
                  </td>
                  <td className="px-4 py-3 font-mono text-white/85">
                    {riseSetCell(day.riseISO, day, t, fmt.time)}
                  </td>
                  <td className="px-4 py-3 font-mono text-white/85">
                    {fmt.time(day.culminationISO)}
                    <span className="ml-2 font-sans text-xs text-white/30">
                      {day.culminationAltitude.toFixed(1)}°
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-white/85">
                    {riseSetCell(day.setISO, day, t, fmt.time)}
                  </td>
                  <td className="px-4 py-3 font-mono text-white/85">
                    {day.dayLengthSec !== null
                      ? fmt.durationHM(day.dayLengthSec)
                      : "—"}
                    {day.dayLengthDeltaSec !== null && (
                      <span
                        className={`ml-2 font-sans text-xs ${
                          day.dayLengthDeltaSec >= 0
                            ? "text-emerald-400/70"
                            : "text-rose-400/70"
                        }`}
                      >
                        {fmt.signedDuration(day.dayLengthDeltaSec)}
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
        {t.sun.credit(Intl.DateTimeFormat().resolvedOptions().timeZone)}
      </p>
    </div>
  );
}
