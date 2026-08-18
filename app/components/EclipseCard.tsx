"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { EclipseWithPath } from "@/app/actions/eclipses";
import { useFormatters, useI18n } from "@/app/i18n/context";

const EclipseMap = dynamic(() => import("./EclipseMap"), { ssr: false });

interface Props {
  eclipse: EclipseWithPath;
  index: number;
  userLat?: number | null;
  userLng?: number | null;
}

const TYPE_BADGE: Record<string, string> = {
  Total: "bg-red-500/20 text-red-400 border border-red-500/30",
  Annular: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  Partial: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
};

function formatCoordinate(value: number, positive: string, negative: string) {
  const abs = Math.abs(value).toFixed(2);
  return `${abs}° ${value >= 0 ? positive : negative}`;
}

export default function EclipseCard({
  eclipse,
  index,
  userLat,
  userLng,
}: Props) {
  const { t } = useI18n();
  const fmt = useFormatters();
  const [open, setOpen] = useState(false);
  const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const obscurationPct =
    eclipse.obscuration !== null ? Math.round(eclipse.obscuration * 100) : null;
  const hasContactTimes =
    eclipse.partialBeginISO !== null ||
    eclipse.partialEndISO !== null ||
    eclipse.totalBeginISO !== null ||
    eclipse.totalEndISO !== null;
  const hasUserLocation = userLat !== null && userLng !== null;

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
              {t.eclipseCard.types[eclipse.type] ?? eclipse.type}
            </span>
            <span className="text-sm font-medium text-white/90 capitalize">
              {fmt.fullDate(eclipse.peakISO)}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
            <span>
              🌑 {t.eclipseCard.peak} :{" "}
              <span className="text-white/70">
                {fmt.timeWithZone(eclipse.peakISO)}
              </span>
            </span>
            {obscurationPct !== null && (
              <span>
                ☀️ {t.eclipseCard.obscuration} :{" "}
                <span className="text-white/70">{obscurationPct} %</span>
              </span>
            )}
            {eclipse.centralDurationMin !== null &&
              eclipse.centralDurationMin > 0 && (
                <span>
                  ⏱ {t.eclipseCard.centralDuration} :{" "}
                  <span className="text-white/70">
                    {fmt.durationMinutes(eclipse.centralDurationMin)}
                  </span>
                </span>
              )}
            {eclipse.maxLat !== null && eclipse.maxLng !== null && (
              <span>
                📍 {t.eclipseCard.maximum} :{" "}
                <span className="text-white/70">
                  {formatCoordinate(eclipse.maxLat, "N", "S")} ·{" "}
                  {formatCoordinate(eclipse.maxLng, "E", "W")}
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
          {hasContactTimes && (
            <>
              <p className="text-xs text-white/35">
                {t.eclipseCard.timeZoneNote(browserTimeZone)}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {eclipse.partialBeginISO && (
                  <div className="rounded-lg bg-white/4 px-3 py-2">
                    <div className="text-white/40 mb-0.5">
                      {t.eclipseCard.partialBegin}
                    </div>
                    <div className="text-white/80 font-mono">
                      {fmt.timeWithZone(eclipse.partialBeginISO)}
                    </div>
                  </div>
                )}
                {eclipse.totalBeginISO && (
                  <div className="rounded-lg bg-white/4 px-3 py-2">
                    <div className="text-white/40 mb-0.5">
                      {t.eclipseCard.centralBegin(eclipse.type)}
                    </div>
                    <div className="text-white/80 font-mono">
                      {fmt.timeWithZone(eclipse.totalBeginISO)}
                    </div>
                  </div>
                )}
                {eclipse.totalEndISO && (
                  <div className="rounded-lg bg-white/4 px-3 py-2">
                    <div className="text-white/40 mb-0.5">
                      {t.eclipseCard.centralEnd(eclipse.type)}
                    </div>
                    <div className="text-white/80 font-mono">
                      {fmt.timeWithZone(eclipse.totalEndISO)}
                    </div>
                  </div>
                )}
                {eclipse.partialEndISO && (
                  <div className="rounded-lg bg-white/4 px-3 py-2">
                    <div className="text-white/40 mb-0.5">
                      {t.eclipseCard.partialEnd}
                    </div>
                    <div className="text-white/80 font-mono">
                      {fmt.timeWithZone(eclipse.partialEndISO)}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {eclipse.nasaPathStatus === "unavailable" ? (
            <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-4 py-6 text-center text-sm text-rose-200">
              {t.eclipseCard.nasaUnreachable}
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
                  {t.eclipseCard.nasaPathMissing}
                </p>
              )}
            </>
          )}

          <p className="text-[10px] text-white/25 text-right">
            {hasUserLocation
              ? t.eclipseCard.localTimes
              : t.eclipseCard.globalView}{" "}
            · {t.eclipseCard.nasaSource}
          </p>
        </div>
      )}
    </article>
  );
}
