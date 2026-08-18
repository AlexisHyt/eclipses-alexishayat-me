"use client";

import { useEffect, useState, useTransition } from "react";
import { fetchMoonWeek } from "@/app/actions/moon";
import type { MoonPhaseKey, MoonQuarterKey, MoonWeek } from "@/lib/moon";
import {
  formatFullDate,
  formatKm,
  formatShortDate,
  formatTime,
} from "./formatters";
import type { Location } from "./LocationPicker";
import MoonDisc from "./MoonDisc";

interface Props {
  location: Location | null;
}

const PHASE_LABELS: Record<MoonPhaseKey, string> = {
  new: "Nouvelle Lune",
  "waxing-crescent": "Premier croissant",
  "first-quarter": "Premier quartier",
  "waxing-gibbous": "Gibbeuse croissante",
  full: "Pleine Lune",
  "waning-gibbous": "Gibbeuse décroissante",
  "last-quarter": "Dernier quartier",
  "waning-crescent": "Dernier croissant",
};

const QUARTER_LABELS: Record<MoonQuarterKey, string> = {
  new: "Nouvelle Lune",
  "first-quarter": "Premier quartier",
  full: "Pleine Lune",
  "last-quarter": "Dernier quartier",
};

function isWaxing(phaseAngle: number) {
  return phaseAngle < 180;
}

export default function MoonPhasesApp({ location }: Props) {
  const [week, setWeek] = useState<MoonWeek | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const lat = location?.lat ?? null;
  const lng = location?.lng ?? null;

  useEffect(() => {
    const now = new Date();
    // Local midnight, so the week matches the visitor's own calendar days.
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    setError(null);
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
        setError("Erreur lors du calcul des phases de la Lune.");
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

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
        {error}
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
          Phase actuelle
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
                {PHASE_LABELS[current.phase]}
              </p>
              <p className="text-sm capitalize text-white/45">
                {formatFullDate(current.atISO)}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
              <div className="rounded-lg bg-white/4 px-3 py-2">
                <dt className="mb-0.5 text-white/40">Illumination</dt>
                <dd className="font-mono text-white/80">
                  {(current.illumination * 100).toFixed(1)} %
                </dd>
              </div>
              <div className="rounded-lg bg-white/4 px-3 py-2">
                <dt className="mb-0.5 text-white/40">Âge</dt>
                <dd className="font-mono text-white/80">
                  {current.ageDays.toFixed(1)} j
                </dd>
              </div>
              <div className="rounded-lg bg-white/4 px-3 py-2">
                <dt className="mb-0.5 text-white/40">Distance</dt>
                <dd className="font-mono text-white/80">
                  {formatKm(current.distanceKm)}
                </dd>
              </div>
            </dl>
            {today && (today.riseISO || today.setISO) && (
              <p className="text-xs text-white/45">
                {today.riseISO && (
                  <>
                    🌘 Lever :{" "}
                    <span className="font-mono text-white/70">
                      {formatTime(today.riseISO)}
                    </span>
                  </>
                )}
                {today.riseISO && today.setISO && " · "}
                {today.setISO && (
                  <>
                    🌒 Coucher :{" "}
                    <span className="font-mono text-white/70">
                      {formatTime(today.setISO)}
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
          Les 7 prochains jours
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {days.map((day, i) => (
            <article
              key={day.dayStartISO}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-white/3 px-3 py-4 text-center transition hover:border-white/15"
            >
              <span className="text-[11px] font-medium capitalize text-white/50">
                {i === 0 ? "Aujourd'hui" : formatShortDate(day.dayStartISO)}
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
                {PHASE_LABELS[day.phase]}
              </span>
              {week.hasObserver && (
                <span className="text-[10px] font-mono leading-tight text-white/30">
                  {day.riseISO ? formatTime(day.riseISO) : "—"} ·{" "}
                  {day.setISO ? formatTime(day.setISO) : "—"}
                </span>
              )}
            </article>
          ))}
        </div>
        {week.hasObserver ? (
          <p className="text-xs text-white/30">
            Sous chaque jour : heure de lever · heure de coucher de la Lune pour
            {location ? ` ${location.label}` : " votre emplacement"}.
          </p>
        ) : (
          <p className="text-xs text-white/30">
            Sélectionnez un emplacement pour afficher les heures de lever et de
            coucher de la Lune.
          </p>
        )}
      </section>

      {/* Quarters */}
      {quarters.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
            Phases principales de la semaine
          </h2>
          <ul className="flex flex-col gap-2">
            {quarters.map((q) => (
              <li
                key={q.timeISO}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm"
              >
                <span className="text-white/85">
                  {QUARTER_LABELS[q.quarter]}
                </span>
                <span className="text-xs text-white/50">
                  <span className="capitalize">
                    {formatFullDate(q.timeISO)}
                  </span>{" "}
                  ·{" "}
                  <span className="font-mono text-white/70">
                    {formatTime(q.timeISO)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="pt-1 text-center text-xs text-white/25">
        Phases calculées avec astronomy-engine · heures dans votre fuseau (
        {Intl.DateTimeFormat().resolvedOptions().timeZone})
      </p>
    </div>
  );
}
