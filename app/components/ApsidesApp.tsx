"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useTransition } from "react";
import { fetchApsides } from "@/app/actions/apsides";
import { useFormatters, useI18n } from "@/app/i18n/context";
import {
  type ApsidesData,
  type ApsisEvent,
  type ApsisType,
  MOON_DISTANCE_RANGE_KM,
  SUN_DISTANCE_RANGE_KM,
} from "@/lib/apsides";

// Three.js is a heavy, browser-only dependency: keep it out of the initial
// bundle and out of the server render.
const OrbitScene = dynamic(() => import("./OrbitScene"), {
  ssr: false,
  loading: () => (
    <div className="h-72 animate-pulse rounded-2xl bg-white/4 sm:h-96" />
  ),
});

const TYPE_BADGE: Record<ApsisType, string> = {
  perigee: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  apogee: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
  perihelion: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  aphelion: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
};

const APSIS_COLORS: Record<ApsisType, string> = {
  perigee: "#38bdf8",
  apogee: "#818cf8",
  perihelion: "#fbbf24",
  aphelion: "#fb923c",
};

function firstOfType(
  events: ApsisEvent[],
  type: ApsisType,
): ApsisEvent | undefined {
  return events.find((event) => event.type === type);
}

/** Caption shared by both 3D panels. */
function SceneCaption({
  periKm,
  apoKm,
  bodyName,
  atISO,
}: {
  periKm: number;
  apoKm: number;
  bodyName: string;
  atISO: string;
}) {
  const { t } = useI18n();
  const fmt = useFormatters();
  const eccentricity = (apoKm - periKm) / (apoKm + periKm);

  return (
    <p className="text-xs text-white/25">
      {t.apsides.captionPosition(bodyName)}{" "}
      <span className="text-white/40">
        {fmt.fullDate(atISO)} {t.apsides.captionAt} {fmt.time(atISO)}
      </span>{" "}
      {t.apsides.captionScale}{" "}
      <span className="font-mono text-white/40">
        e = {eccentricity.toFixed(4)}
      </span>{" "}
      {t.apsides.captionDrag}
    </p>
  );
}

interface RowProps {
  event: ApsisEvent;
  fromISO: string;
  range: { min: number; max: number };
  showAu?: boolean;
}

function ApsisRow({ event, fromISO, range, showAu = false }: RowProps) {
  const { t } = useI18n();
  const fmt = useFormatters();
  const ratio = Math.min(
    Math.max((event.distanceKm - range.min) / (range.max - range.min), 0),
    1,
  );
  const isNear = event.type === "perigee" || event.type === "perihelion";

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/3 px-5 py-4 transition hover:border-white/15 sm:flex-row sm:items-center sm:gap-5">
      <div className="flex-1 min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_BADGE[event.type]}`}
          >
            {t.apsides.types[event.type]}
          </span>
          <span className="text-sm font-medium capitalize text-white/90">
            {fmt.fullDate(event.timeISO)}
          </span>
          <span className="font-mono text-xs text-white/50">
            {fmt.time(event.timeISO)}
          </span>
        </div>
        <p className="text-xs text-white/40">
          {t.apsides.hints[event.type]} · {fmt.inDays(event.timeISO, fromISO)}
        </p>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-1.5 sm:w-52">
        <span className="font-mono text-sm text-white/85">
          {fmt.km(event.distanceKm)}
        </span>
        {showAu && (
          <span className="font-mono text-[11px] text-white/35">
            {event.distanceAu.toFixed(6)} au
          </span>
        )}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/8">
          <div
            className={`h-full rounded-full ${isNear ? "bg-sky-400/70" : "bg-indigo-400/70"}`}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
      </div>
    </li>
  );
}

export default function ApsidesApp() {
  const { t } = useI18n();
  const fmt = useFormatters();
  const [data, setData] = useState<ApsidesData | null>(null);
  const [fromISO, setFromISO] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const now = new Date().toISOString();

    setFailed(false);
    startTransition(async () => {
      try {
        const result = await fetchApsides(now);
        setData(result);
        setFromISO(now);
      } catch (e) {
        setFailed(true);
        console.error(e);
      }
    });
  }, []);

  if (isPending && data === null) {
    return (
      <div className="flex flex-col gap-3">
        {(["s1", "s2", "s3", "s4"] as const).map((id, i) => (
          <div
            key={id}
            className="h-20 animate-pulse rounded-2xl bg-white/4"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    );
  }

  if (failed) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
        {t.apsides.error}
      </div>
    );
  }

  if (data === null || fromISO === null) return null;

  const nextPerigee = firstOfType(data.lunar, "perigee");
  const nextApogee = firstOfType(data.lunar, "apogee");
  const nextPerihelion = firstOfType(data.solar, "perihelion");
  const nextAphelion = firstOfType(data.solar, "aphelion");

  return (
    <div
      className={`flex flex-col gap-8 transition-opacity ${isPending ? "opacity-50" : ""}`}
    >
      <section className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4 text-sm text-white/55">
        {t.apsides.introBefore}
        <strong className="text-white">{t.apsides.introStrong}</strong>
        {t.apsides.introAfter}
      </section>

      {/* Moon */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
          {t.apsides.moonSection}
        </h2>
        {nextPerigee && nextApogee && (
          <>
            <OrbitScene
              centerName={t.apsides.bodies.earth}
              centerColor="#3b82f6"
              bodyName={t.apsides.bodies.moon}
              bodyColor="#d4d4d8"
              periapsis={{
                name: t.apsides.types.perigee,
                km: nextPerigee.distanceKm,
                color: APSIS_COLORS.perigee,
              }}
              apoapsis={{
                name: t.apsides.types.apogee,
                km: nextApogee.distanceKm,
                color: APSIS_COLORS.apogee,
              }}
              trueAnomaly={data.lunarNow.trueAnomaly}
              distanceKm={data.lunarNow.distanceKm}
            />
            <SceneCaption
              periKm={nextPerigee.distanceKm}
              apoKm={nextApogee.distanceKm}
              bodyName={t.apsides.bodiesInSentence.moon}
              atISO={data.lunarNow.atISO}
            />
          </>
        )}
        <ul className="flex flex-col gap-2">
          {data.lunar.map((event) => (
            <ApsisRow
              key={event.timeISO}
              event={event}
              fromISO={fromISO}
              range={MOON_DISTANCE_RANGE_KM}
            />
          ))}
        </ul>
        <p className="text-xs text-white/25">
          {t.apsides.moonRange(
            fmt.km(MOON_DISTANCE_RANGE_KM.min),
            fmt.km(MOON_DISTANCE_RANGE_KM.max),
          )}
        </p>
      </section>

      {/* Sun */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
          {t.apsides.sunSection}
        </h2>
        {nextPerihelion && nextAphelion && (
          <>
            <OrbitScene
              centerName={t.apsides.bodies.sun}
              centerColor="#fde68a"
              bodyName={t.apsides.bodies.earth}
              bodyColor="#3b82f6"
              periapsis={{
                name: t.apsides.types.perihelion,
                km: nextPerihelion.distanceKm,
                color: APSIS_COLORS.perihelion,
              }}
              apoapsis={{
                name: t.apsides.types.aphelion,
                km: nextAphelion.distanceKm,
                color: APSIS_COLORS.aphelion,
              }}
              trueAnomaly={data.solarNow.trueAnomaly}
              distanceKm={data.solarNow.distanceKm}
            />
            <SceneCaption
              periKm={nextPerihelion.distanceKm}
              apoKm={nextAphelion.distanceKm}
              bodyName={t.apsides.bodiesInSentence.earth}
              atISO={data.solarNow.atISO}
            />
          </>
        )}
        <ul className="flex flex-col gap-2">
          {data.solar.map((event) => (
            <ApsisRow
              key={event.timeISO}
              event={event}
              fromISO={fromISO}
              range={SUN_DISTANCE_RANGE_KM}
              showAu
            />
          ))}
        </ul>
        <p className="text-xs text-white/25">{t.apsides.sunNote}</p>
      </section>

      <p className="pt-1 text-center text-xs text-white/25">
        {t.apsides.credit(Intl.DateTimeFormat().resolvedOptions().timeZone)}
      </p>
    </div>
  );
}
