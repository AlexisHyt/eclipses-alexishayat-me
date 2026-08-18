"use client";

import { useId } from "react";
import type { SunRegime } from "@/lib/sun";

interface Props {
  riseISO: string | null;
  setISO: string | null;
  culminationAltitude: number;
  nowISO: string;
  regime: SunRegime;
}

const LEFT = 30;
const RIGHT = 290;
const HORIZON = 100;
const CENTER = (LEFT + RIGHT) / 2;
const RX = (RIGHT - LEFT) / 2;
const MIN_HEIGHT = 14;
const MAX_HEIGHT = 78;

/** Arc height in pixels, scaled to how high the Sun climbs that day. */
function arcHeight(culminationAltitude: number) {
  const ratio = Math.min(Math.max(culminationAltitude, 0), 90) / 90;
  return MIN_HEIGHT + ratio * (MAX_HEIGHT - MIN_HEIGHT);
}

function pointAt(t: number, height: number) {
  return {
    x: CENTER - RX * Math.cos(Math.PI * t),
    y: HORIZON - height * Math.sin(Math.PI * t),
  };
}

/**
 * The Sun's daily course drawn as an arc above the horizon: the higher it
 * climbs at noon, the taller the arc. The disc sits where the Sun currently
 * is between sunrise and sunset, and is omitted once night has fallen.
 */
export default function SunArc({
  riseISO,
  setISO,
  culminationAltitude,
  nowISO,
  regime,
}: Props) {
  const id = useId();
  const glowId = `sun-glow-${id}`;
  const fillId = `sun-fill-${id}`;

  const height = arcHeight(culminationAltitude);
  const arc = `M ${LEFT} ${HORIZON} A ${RX} ${height} 0 0 1 ${RIGHT} ${HORIZON}`;

  let progress: number | null = null;
  if (regime === "normal" && riseISO !== null && setISO !== null) {
    const rise = new Date(riseISO).getTime();
    const set = new Date(setISO).getTime();
    const now = new Date(nowISO).getTime();
    if (set > rise && now >= rise && now <= set) {
      progress = (now - rise) / (set - rise);
    }
  }

  const sun = progress !== null ? pointAt(progress, height) : null;

  return (
    <svg
      viewBox="0 0 320 120"
      className="w-full"
      role="img"
      aria-label="Course du Soleil au-dessus de l'horizon"
    >
      <title>Course du Soleil au-dessus de l&apos;horizon</title>
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="60%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.16} />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
        </linearGradient>
      </defs>

      <path d={`${arc} Z`} fill={`url(#${fillId})`} />
      <path
        d={arc}
        fill="none"
        stroke="rgba(251,191,36,0.55)"
        strokeWidth={1.5}
        strokeDasharray={regime === "normal" ? undefined : "4 4"}
      />

      {/* Horizon */}
      <line
        x1={8}
        y1={HORIZON}
        x2={312}
        y2={HORIZON}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={1}
      />

      {/* Rise and set anchors */}
      {regime === "normal" && (
        <>
          <circle cx={LEFT} cy={HORIZON} r={3} fill="rgba(251,191,36,0.7)" />
          <circle cx={RIGHT} cy={HORIZON} r={3} fill="rgba(251,191,36,0.7)" />
        </>
      )}

      {/* Culmination */}
      <line
        x1={CENTER}
        y1={HORIZON}
        x2={CENTER}
        y2={HORIZON - height}
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <circle
        cx={CENTER}
        cy={HORIZON - height}
        r={2.5}
        fill="rgba(255,255,255,0.35)"
      />

      {/* Current position */}
      {sun && (
        <g>
          <circle cx={sun.x} cy={sun.y} r={13} fill="#fbbf24" opacity={0.18} />
          <circle cx={sun.x} cy={sun.y} r={7} fill={`url(#${glowId})`} />
        </g>
      )}

      <text
        x={LEFT}
        y={HORIZON + 15}
        textAnchor="middle"
        fill="rgba(255,255,255,0.35)"
        fontSize={9}
      >
        Lever
      </text>
      <text
        x={CENTER}
        y={HORIZON + 15}
        textAnchor="middle"
        fill="rgba(255,255,255,0.35)"
        fontSize={9}
      >
        Culmination
      </text>
      <text
        x={RIGHT}
        y={HORIZON + 15}
        textAnchor="middle"
        fill="rgba(255,255,255,0.35)"
        fontSize={9}
      >
        Coucher
      </text>
    </svg>
  );
}
