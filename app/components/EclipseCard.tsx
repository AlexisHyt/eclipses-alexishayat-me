"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { EclipseWithPath } from "@/app/actions/eclipses";

const EclipseMap = dynamic(() => import("./EclipseMap"), { ssr: false });

interface Props {
  eclipse: EclipseWithPath;
  index: number;
  userLat: number;
  userLng: number;
}

const TYPE_LABELS: Record<string, string> = {
  Total: "Totale",
  Annular: "Annulaire",
  Partial: "Partielle",
};

const TYPE_BADGE: Record<string, string> = {
  Total: "bg-red-500/20 text-red-400 border border-red-500/30",
  Annular: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  Partial: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === "hour")?.value ?? "--";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "--";
  const tzStr = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
  const timeStr = `${hour}:${minute}`;
  return `${timeStr} ${tzStr}`;
}

function formatDuration(minutes: number) {
  if (minutes < 1) return `${Math.round(minutes * 60)} s`;
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return s > 0 ? `${m} min ${s} s` : `${m} min`;
}

export default function EclipseCard({
  eclipse,
  index,
  userLat,
  userLng,
}: Props) {
  const [open, setOpen] = useState(false);
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const obscurationPct = Math.round(eclipse.obscuration * 100);

  return (
    <article className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm overflow-hidden transition hover:border-white/15">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start gap-4 px-5 py-4 text-left"
      >
        {/* Index */}
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/6 text-xs font-semibold text-white/50">
          {index + 1}
        </span>

        {/* Date + type */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_BADGE[eclipse.type]}`}
            >
              {TYPE_LABELS[eclipse.type] ?? eclipse.type}
            </span>
            <span className="text-sm font-medium text-white/90 capitalize">
              {formatDate(eclipse.peakISO)}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
            <span>
              🌑 Pic :{" "}
              <span className="text-white/70">
                {formatTime(eclipse.peakISO)}
              </span>
            </span>
            <span>
              ☀️ Obscuration :{" "}
              <span className="text-white/70">{obscurationPct} %</span>
            </span>
            {eclipse.centralDurationMin > 0 && (
              <span>
                ⏱ Durée centrale :{" "}
                <span className="text-white/70">
                  {formatDuration(eclipse.centralDurationMin)}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <svg
          aria-hidden="true"
          className={`mt-1 shrink-0 h-4 w-4 text-white/30 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-5 pb-5 flex flex-col gap-4 border-t border-white/6 pt-4">
          {/* Time zone note */}
          <p className="text-xs text-white/35">
            Heures affichées selon votre fuseau navigateur ({browserTimeZone}),
            format 24 h.
          </p>

          {/* Contact times */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg bg-white/4 px-3 py-2">
              <div className="text-white/40 mb-0.5">Début partiel</div>
              <div className="text-white/80 font-mono">
                {formatTime(eclipse.partialBeginISO)}
              </div>
            </div>
            {eclipse.totalBeginISO && (
              <div className="rounded-lg bg-white/4 px-3 py-2">
                <div className="text-white/40 mb-0.5">
                  Début {eclipse.type === "Total" ? "total" : "annulaire"}
                </div>
                <div className="text-white/80 font-mono">
                  {formatTime(eclipse.totalBeginISO)}
                </div>
              </div>
            )}
            {eclipse.totalEndISO && (
              <div className="rounded-lg bg-white/4 px-3 py-2">
                <div className="text-white/40 mb-0.5">
                  Fin {eclipse.type === "Total" ? "total" : "annulaire"}
                </div>
                <div className="text-white/80 font-mono">
                  {formatTime(eclipse.totalEndISO)}
                </div>
              </div>
            )}
            <div className="rounded-lg bg-white/4 px-3 py-2">
              <div className="text-white/40 mb-0.5">Fin partiel</div>
              <div className="text-white/80 font-mono">
                {formatTime(eclipse.partialEndISO)}
              </div>
            </div>
          </div>

          {eclipse.nasaPathStatus === "unavailable" ? (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-6 text-center text-sm text-rose-200">
              Impossible de contacter les serveurs de la NASA
            </div>
          ) : (
            <>
              {/* Map */}
              <EclipseMap
                userLat={userLat}
                userLng={userLng}
                pathPoints={eclipse.pathPoints}
                maxLat={eclipse.maxLat}
                maxLng={eclipse.maxLng}
                eclipseType={eclipse.type}
              />
              {eclipse.nasaPathStatus === "not-found" && (
                <p className="text-[11px] text-white/35 text-center">
                  Trajectoire centrale NASA non disponible pour cette éclipse.
                </p>
              )}
            </>
          )}

          <p className="text-[10px] text-white/25 text-right">
            Heures locales · Trajectoire source NASA (quand disponible)
          </p>
        </div>
      )}
    </article>
  );
}
