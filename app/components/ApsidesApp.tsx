"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useTransition } from "react";
import { fetchApsides } from "@/app/actions/apsides";
import {
  type ApsidesData,
  type ApsisEvent,
  type ApsisType,
  MOON_DISTANCE_RANGE_KM,
  SUN_DISTANCE_RANGE_KM,
} from "@/lib/apsides";
import {
  formatFullDate,
  formatInDays,
  formatKm,
  formatTime,
} from "./formatters";

// Three.js is a heavy, browser-only dependency: keep it out of the initial
// bundle and out of the server render.
const OrbitScene = dynamic(() => import("./OrbitScene"), {
  ssr: false,
  loading: () => (
    <div className="h-72 animate-pulse rounded-2xl bg-white/4 sm:h-96" />
  ),
});

const TYPE_LABELS: Record<ApsisType, string> = {
  perigee: "Périgée",
  apogee: "Apogée",
  perihelion: "Périhélie",
  aphelion: "Aphélie",
};

const TYPE_BADGE: Record<ApsisType, string> = {
  perigee: "bg-sky-500/20 text-sky-300 border border-sky-500/30",
  apogee: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
  perihelion: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  aphelion: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
};

const TYPE_HINTS: Record<ApsisType, string> = {
  perigee: "au plus près de la Terre",
  apogee: "au plus loin de la Terre",
  perihelion: "Terre au plus près du Soleil",
  aphelion: "Terre au plus loin du Soleil",
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
  const eccentricity = (apoKm - periKm) / (apoKm + periKm);

  return (
    <p className="text-xs text-white/25">
      Position réelle de {bodyName} le{" "}
      <span className="text-white/40">
        {formatFullDate(atISO)} à {formatTime(atISO)}
      </span>{" "}
      · distances à l&apos;échelle, tailles des corps volontairement exagérées ·
      le cercle en pointillé est l&apos;orbite circulaire de même demi-grand axe
      · excentricité{" "}
      <span className="font-mono text-white/40">
        e = {eccentricity.toFixed(4)}
      </span>{" "}
      · faites glisser pour tourner autour de la scène.
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
            {TYPE_LABELS[event.type]}
          </span>
          <span className="text-sm font-medium capitalize text-white/90">
            {formatFullDate(event.timeISO)}
          </span>
          <span className="font-mono text-xs text-white/50">
            {formatTime(event.timeISO)}
          </span>
        </div>
        <p className="text-xs text-white/40">
          {TYPE_HINTS[event.type]} · {formatInDays(event.timeISO, fromISO)}
        </p>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-1.5 sm:w-52">
        <span className="font-mono text-sm text-white/85">
          {formatKm(event.distanceKm)}
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
  const [data, setData] = useState<ApsidesData | null>(null);
  const [fromISO, setFromISO] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const now = new Date().toISOString();

    setError(null);
    startTransition(async () => {
      try {
        const result = await fetchApsides(now);
        setData(result);
        setFromISO(now);
      } catch (e) {
        setError("Erreur lors du calcul des apsides.");
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

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-400">
        {error}
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
        Une <strong className="text-white">apside</strong> est le point
        d&apos;une orbite le plus proche ou le plus éloigné du corps autour
        duquel on tourne. Ces dates sont identiques partout sur Terre : elles ne
        dépendent pas de l&apos;emplacement choisi.
      </section>

      {/* Moon */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
          Lune · périgée &amp; apogée
        </h2>
        {nextPerigee && nextApogee && (
          <>
            <OrbitScene
              centerName="Terre"
              centerColor="#3b82f6"
              bodyName="Lune"
              bodyColor="#d4d4d8"
              periapsis={{
                name: "Périgée",
                km: nextPerigee.distanceKm,
                color: APSIS_COLORS.perigee,
              }}
              apoapsis={{
                name: "Apogée",
                km: nextApogee.distanceKm,
                color: APSIS_COLORS.apogee,
              }}
              trueAnomaly={data.lunarNow.trueAnomaly}
              distanceKm={data.lunarNow.distanceKm}
            />
            <SceneCaption
              periKm={nextPerigee.distanceKm}
              apoKm={nextApogee.distanceKm}
              bodyName="la Lune"
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
          Distance entre les centres de la Terre et de la Lune, qui varie
          d&apos;environ {formatKm(MOON_DISTANCE_RANGE_KM.min)} à{" "}
          {formatKm(MOON_DISTANCE_RANGE_KM.max)}.
        </p>
      </section>

      {/* Sun */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/40">
          Soleil · périhélie &amp; aphélie
        </h2>
        {nextPerihelion && nextAphelion && (
          <>
            <OrbitScene
              centerName="Soleil"
              centerColor="#fde68a"
              bodyName="Terre"
              bodyColor="#3b82f6"
              periapsis={{
                name: "Périhélie",
                km: nextPerihelion.distanceKm,
                color: APSIS_COLORS.perihelion,
              }}
              apoapsis={{
                name: "Aphélie",
                km: nextAphelion.distanceKm,
                color: APSIS_COLORS.aphelion,
              }}
              trueAnomaly={data.solarNow.trueAnomaly}
              distanceKm={data.solarNow.distanceKm}
            />
            <SceneCaption
              periKm={nextPerihelion.distanceKm}
              apoKm={nextAphelion.distanceKm}
              bodyName="la Terre"
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
        <p className="text-xs text-white/25">
          Vue héliocentrique : le Soleil occupe le foyer de l&apos;orbite, la
          Terre est placée à sa position réelle, et le segment entre les deux
          donne donc la direction réelle du Soleil. L&apos;écart entre périhélie
          et aphélie représente environ 3 % de la distance moyenne.
        </p>
      </section>

      <p className="pt-1 text-center text-xs text-white/25">
        Calculs basés sur les éphémérides VSOP87 / ELP2000 via astronomy-engine
        · heures dans votre fuseau (
        {Intl.DateTimeFormat().resolvedOptions().timeZone})
      </p>
    </div>
  );
}
