"use client";

import { useId } from "react";

interface Props {
  /** OpenWeatherMap icon code, e.g. `04n`; the trailing letter tells day from night */
  code: string;
  /** Spoken description, already translated; omit for a decorative icon */
  label?: string;
  className?: string;
}

const SUN = "#fbbf24";
const MOON = "#e2e8f0";
const CLOUD = "#cbd5e1";
const CLOUD_DARK = "#94a3b8";
const RAIN = "#60a5fa";
const SNOW = "#e0f2fe";
const BOLT = "#facc15";
const MIST = "#94a3b8";

function Sun({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={SUN} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const radians = (angle * Math.PI) / 180;
        const from = r + 3.5;
        const to = r + 8;

        return (
          <line
            key={angle}
            x1={cx + from * Math.cos(radians)}
            y1={cy + from * Math.sin(radians)}
            x2={cx + to * Math.cos(radians)}
            y2={cy + to * Math.sin(radians)}
            stroke={SUN}
            strokeWidth={2.6}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

/** Crescent cut out of a disc, so it needs no knowledge of the background. */
function Moon({
  cx,
  cy,
  r,
  maskId,
}: {
  cx: number;
  cy: number;
  r: number;
  maskId: string;
}) {
  return (
    <g>
      <mask id={maskId}>
        <circle cx={cx} cy={cy} r={r} fill="#fff" />
        <circle
          cx={cx + r * 0.55}
          cy={cy - r * 0.55}
          r={r * 0.95}
          fill="#000"
        />
      </mask>
      <circle cx={cx} cy={cy} r={r} fill={MOON} mask={`url(#${maskId})`} />
    </g>
  );
}

/** Cloud built from overlapping discs, drawn in a single flat colour. */
function Cloud({
  x = 0,
  y = 0,
  scale = 1,
  fill = CLOUD,
}: {
  x?: number;
  y?: number;
  scale?: number;
  fill?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={fill}>
      <circle cx={24} cy={36} r={10} />
      <circle cx={36} cy={32} r={13} />
      <circle cx={47} cy={38} r={8} />
      <rect x={18} y={38} width={31} height={10} rx={5} />
    </g>
  );
}

function Drops({ color, count }: { color: string; count: number }) {
  const positions = count === 3 ? [24, 34, 44] : [27, 41];

  return (
    <g>
      {positions.map((x, index) => (
        <line
          key={x}
          x1={x}
          y1={50 + (index % 2) * 2}
          x2={x - 3}
          y2={58 + (index % 2) * 2}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

function Flakes() {
  return (
    <g fill={SNOW}>
      {[
        [25, 53],
        [35, 57],
        [45, 53],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.6} />
      ))}
    </g>
  );
}

function Bolt() {
  return (
    <polygon
      points="36,46 27,58 33,58 29,64 41,51 34,51 39,46"
      fill={BOLT}
      stroke={BOLT}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  );
}

/**
 * The eleven states OpenWeatherMap encodes, drawn rather than fetched: the
 * provider's own PNGs are 100 px wide and sit badly on a dark background.
 */
function Shape({ code, maskId }: { code: string; maskId: string }) {
  const group = code.slice(0, 2);
  const night = code.endsWith("n");

  switch (group) {
    case "01":
      return night ? (
        <Moon cx={32} cy={32} r={15} maskId={maskId} />
      ) : (
        <Sun cx={32} cy={32} r={13} />
      );

    case "02":
      return (
        <g>
          {night ? (
            <Moon cx={22} cy={18} r={11} maskId={maskId} />
          ) : (
            <Sun cx={26} cy={22} r={9} />
          )}
          <Cloud y={6} />
        </g>
      );

    case "03":
      return <Cloud y={4} />;

    case "04":
      return (
        <g>
          <Cloud x={4} y={-12} scale={0.7} fill={CLOUD_DARK} />
          <Cloud y={9} />
        </g>
      );

    case "09":
      return (
        <g>
          <Cloud y={-2} fill={CLOUD_DARK} />
          <Drops color={RAIN} count={3} />
        </g>
      );

    case "10":
      return (
        <g>
          {night ? (
            <Moon cx={22} cy={16} r={10} maskId={maskId} />
          ) : (
            <Sun cx={26} cy={20} r={8} />
          )}
          <Cloud y={2} />
          <Drops color={RAIN} count={2} />
        </g>
      );

    case "11":
      return (
        <g>
          <Cloud y={-4} fill={CLOUD_DARK} />
          <Bolt />
        </g>
      );

    case "13":
      return (
        <g>
          <Cloud y={-2} />
          <Flakes />
        </g>
      );

    case "50":
      return (
        <g>
          <Cloud y={-8} fill={CLOUD_DARK} />
          <g stroke={MIST} strokeWidth={4} strokeLinecap="round">
            <line x1={14} y1={44} x2={50} y2={44} />
            <line x1={20} y1={54} x2={54} y2={54} opacity={0.7} />
            <line x1={14} y1={64} x2={44} y2={64} opacity={0.45} />
          </g>
        </g>
      );

    default:
      return <Cloud y={4} />;
  }
}

export default function WeatherIcon({ code, label, className }: Props) {
  const maskId = useId();

  return (
    <svg
      viewBox="0 0 64 68"
      className={className ?? "h-12 w-12"}
      role={label === undefined ? "presentation" : "img"}
      aria-label={label}
      aria-hidden={label === undefined}
    >
      {label !== undefined && <title>{label}</title>}
      <Shape code={code} maskId={maskId} />
    </svg>
  );
}
