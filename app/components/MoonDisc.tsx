"use client";

import { useId } from "react";
import { useI18n } from "@/app/i18n/context";

interface Props {
  /** Fraction 0–1 of the disc that is lit */
  illumination: number;
  /** True between new moon and full moon (lit limb on the right) */
  waxing: boolean;
  /** Rendered size in pixels */
  size?: number;
  className?: string;
}

const R = 50;
const CX = 50;
const CY = 50;

/**
 * The terminator is the projection of a circle seen at an angle, so it is
 * always a half-ellipse whose width shrinks to zero at the quarters. The lit
 * area is therefore the right half-disc closed by that half-ellipse, bulging
 * left for a gibbous moon and right for a crescent.
 */
function litPath(illumination: number): string {
  const f = Math.min(Math.max(illumination, 0), 1);
  const rx = R * Math.abs(1 - 2 * f);
  const sweep = f > 0.5 ? 1 : 0;

  return [
    `M ${CX} ${CY - R}`,
    `A ${R} ${R} 0 0 1 ${CX} ${CY + R}`,
    `A ${rx} ${R} 0 0 ${sweep} ${CX} ${CY - R}`,
    "Z",
  ].join(" ");
}

const MARIA = [
  { cx: 38, cy: 34, r: 12 },
  { cx: 62, cy: 52, r: 9 },
  { cx: 44, cy: 68, r: 7 },
  { cx: 66, cy: 27, r: 5 },
];

export default function MoonDisc({
  illumination,
  waxing,
  size = 96,
  className = "",
}: Props) {
  const { t } = useI18n();
  const id = useId();
  const clipId = `moon-lit-${id}`;
  const gradientId = `moon-glow-${id}`;
  const label = t.moon.discLabel(Math.round(illumination * 100));

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <defs>
        <radialGradient id={gradientId} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#fdfbf3" />
          <stop offset="70%" stopColor="#e6e0cf" />
          <stop offset="100%" stopColor="#c8c0ab" />
        </radialGradient>
        <clipPath id={clipId}>
          {/* Mirror the terminator, not the surface, when the Moon is waning */}
          <path
            d={litPath(illumination)}
            transform={
              waxing ? undefined : `translate(${2 * CX} 0) scale(-1 1)`
            }
          />
        </clipPath>
      </defs>

      {/* Unlit disc */}
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="#15152a"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={0.8}
      />

      {/* Lit part */}
      <g clipPath={`url(#${clipId})`}>
        <circle cx={CX} cy={CY} r={R} fill={`url(#${gradientId})`} />
        {MARIA.map((m) => (
          <circle
            key={`${m.cx}-${m.cy}`}
            cx={m.cx}
            cy={m.cy}
            r={m.r}
            fill="#000"
            opacity={0.07}
          />
        ))}
      </g>
    </svg>
  );
}
