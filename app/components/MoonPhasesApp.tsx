"use client";

import { useEffect, useState, useTransition } from "react";
import { fetchMoonWeek } from "@/app/actions/moon";
import { useFormatters, useI18n } from "@/app/i18n/context";
import type { MoonWeek } from "@/lib/moon";
import type { Location } from "./LocationPicker";
import MoonDisc from "./MoonDisc";

interface Props {
  location: Location | null;
}

function isWaxing(phaseAngle: number) {
  return phaseAngle < 180;
}

export default function MoonPhasesApp({ location }: Props) {
  const { t } = useI18n();
  const fmt = useFormatters();
  const [week, setWeek] = useState<MoonWeek | null>(null);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const lat = location?.lat ?? null;
  const lng = location?.lng ?? null;

  useEffect(() => {
    const now = new Date();
    // Local midnight, so the week matches the visitor's own calendar days.
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    setFailed(false);
    startTransition(async () => {
      try {
        const data = await fetchMoonWeek(
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

  if (isPending && week === null) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-44 rounded-2xl bg-white/4 animate-pulse" />
        <div className="h-32 rounded-2xl bg-white/4 animate-pulse" />
      </div>
    );
  }

  if (failed) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
        {t.moon.error}
      </div>
    );
  }

  if (week === null) return null;

  const { current, days, quarters } = week;
  const today = days[0];

  return (
    <div
      className={`flex flex-col gap-8 transition-opacity ${isPending ? "opacity-50" : ""}`}
    >
      {/* Current phase */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
          {t.moon.currentPhase}
        </h2>
        <article className="flex flex-col items-center gap-5 rounded-2xl border border-white/8 bg-white/3 px-5 py-6 sm:flex-row sm:items-center sm:gap-7">
          <MoonDisc
            illumination={current.illumination}
            waxing={isWaxing(current.phaseAngle)}
            size={128}
            className="shrink-0 drop-shadow-[0_0_30px_rgba(255,255,255,0.12)]"
          />
          <div className="flex flex-1 flex-col gap-3 text-center sm:text-left">
            <div>
              <p className="text-xl font-semibold text-white">
                {t.moon.phases[current.phase]}
              </p>
              <p className="text-sm capitalize text-white/45">
                {fmt.fullDate(current.atISO)}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-lg bg-white/4 px-3 py-2">
                <dt className="mb-0.5 text-white/40">{t.moon.illumination}</dt>
                <dd className="font-mono text-white/80">
                  {(current.illumination * 100).toFixed(1)} %
                </dd>
              </div>
              <div className="rounded-lg bg-white/4 px-3 py-2">
                <dt className="mb-0.5 text-white/40">{t.moon.age}</dt>
                <dd className="font-mono text-white/80">
                  {current.ageDays.toFixed(1)} {t.moon.ageUnit}
                </dd>
              </div>
              <div className="rounded-lg bg-white/4 px-3 py-2">
                <dt className="mb-0.5 text-white/40">{t.moon.distance}</dt>
                <dd className="font-mono text-white/80">
                  {fmt.km(current.distanceKm)}
                </dd>
              </div>
            </dl>
            {today && (today.riseISO || today.setISO) && (
              <p className="text-xs text-white/45">
                {today.riseISO && (
                  <>
                    🌘 {t.moon.rise} :{" "}
                    <span className="font-mono text-white/70">
                      {fmt.time(today.riseISO)}
                    </span>
                  </>
                )}
                {today.riseISO && today.setISO && " · "}
                {today.setISO && (
                  <>
                    🌒 {t.moon.set} :{" "}
                    <span className="font-mono text-white/70">
                      {fmt.time(today.setISO)}
                    </span>
                  </>
                )}
              </p>
            )}
          </div>
        </article>
      </section>

      {/* Week */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
          {t.moon.week}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {days.map((day, i) => (
            <article
              key={day.dayStartISO}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-white/3 px-3 py-4 text-center transition hover:border-white/15"
            >
              <span className="text-[11px] font-medium capitalize text-white/50">
                {i === 0 ? t.moon.today : fmt.shortDate(day.dayStartISO)}
              </span>
              <MoonDisc
                illumination={day.illumination}
                waxing={isWaxing(day.phaseAngle)}
                size={56}
              />
              <span className="text-xs font-mono text-white/75">
                {Math.round(day.illumination * 100)} %
              </span>
              <span className="text-[11px] leading-tight text-white/40">
                {t.moon.phases[day.phase]}
              </span>
              {week.hasObserver && (
                <span className="text-[10px] font-mono leading-tight text-white/30">
                  {day.riseISO ? fmt.time(day.riseISO) : "—"} ·{" "}
                  {day.setISO ? fmt.time(day.setISO) : "—"}
                </span>
              )}
            </article>
          ))}
        </div>
        {week.hasObserver ? (
          <p className="text-xs text-white/30">
            {t.moon.riseSetNote(
              location ? location.label : t.moon.yourLocation,
            )}
          </p>
        ) : (
          <p className="text-xs text-white/30">{t.moon.pickLocation}</p>
        )}
      </section>

      {/* Quarters */}
      {quarters.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
            {t.moon.quarters}
          </h2>
          <ul className="flex flex-col gap-2">
            {quarters.map((q) => (
              <li
                key={q.timeISO}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm"
              >
                <span className="text-white/85">
                  {t.moon.quarterNames[q.quarter]}
                </span>
                <span className="text-xs text-white/50">
                  <span className="capitalize">{fmt.fullDate(q.timeISO)}</span>{" "}
                  ·{" "}
                  <span className="font-mono text-white/70">
                    {fmt.time(q.timeISO)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="pt-1 text-center text-xs text-white/25">
        {t.moon.credit(Intl.DateTimeFormat().resolvedOptions().timeZone)}
      </p>
    </div>
  );
}
