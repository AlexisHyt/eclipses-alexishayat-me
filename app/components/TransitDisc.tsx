"use client";

interface Props {
  /** Minimum distance between the centres of the planet and the Sun, arcminutes */
  separationArcmin: number;
  /** Apparent radius of the solar disc at that moment, arcminutes */
  sunRadiusArcmin: number;
  /** Apparent diameter of the planet's silhouette, arcseconds */
  planetDiameterArcsec: number;
  /** Apparent diameter of the Sun, arcseconds */
  sunDiameterArcsec: number;
  /** Spoken description of the drawing, already translated */
  label: string;
}

const SIZE = 200;
const CENTER = SIZE / 2;
const SUN_RADIUS = 82;

/**
 * The chord the planet draws across the Sun, seen from the Earth.
 *
 * The impact parameter — how far the chord runs from the centre of the disc —
 * and the size of the silhouette are both to scale; the orientation of the
 * path is not, since a transit can cross the disc at any angle.
 */
export default function TransitDisc({
  separationArcmin,
  sunRadiusArcmin,
  planetDiameterArcsec,
  sunDiameterArcsec,
  label,
}: Props) {
  const impact = Math.min(separationArcmin / sunRadiusArcmin, 1);
  const chordY = CENTER - impact * SUN_RADIUS;
  const halfChord = SUN_RADIUS * Math.sqrt(Math.max(1 - impact * impact, 0));
  // Mercury covers a third of a percent of the disc: without a floor its
  // silhouette would land under a single pixel.
  const planetRadius = Math.max(
    (SUN_RADIUS * planetDiameterArcsec) / sunDiameterArcsec,
    1.6,
  );

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-auto w-full max-w-[200px]"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <defs>
        <radialGradient id="transit-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff7d6" />
          <stop offset="70%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
      </defs>

      <circle
        cx={CENTER}
        cy={CENTER}
        r={SUN_RADIUS + 6}
        fill="#f59e0b"
        opacity={0.12}
      />
      <circle cx={CENTER} cy={CENTER} r={SUN_RADIUS} fill="url(#transit-sun)" />

      {/* Distance from the centre of the disc to the chord */}
      <line
        x1={CENTER}
        y1={CENTER}
        x2={CENTER}
        y2={chordY}
        stroke="#78350f"
        strokeWidth={1}
        strokeDasharray="2 3"
        opacity={0.5}
      />
      <circle cx={CENTER} cy={CENTER} r={1.5} fill="#78350f" opacity={0.5} />

      {/* Path followed by the silhouette, from first to last contact */}
      <line
        x1={CENTER - halfChord}
        y1={chordY}
        x2={CENTER + halfChord}
        y2={chordY}
        stroke="#7c2d12"
        strokeWidth={1.2}
        strokeDasharray="4 3"
        opacity={0.75}
      />

      {[-1, 1].map((side) => (
        <circle
          key={side}
          cx={CENTER + side * halfChord}
          cy={chordY}
          r={planetRadius}
          fill="#1c1917"
          opacity={0.45}
        />
      ))}

      {/* The planet at greatest transit */}
      <circle cx={CENTER} cy={chordY} r={planetRadius} fill="#0c0a09" />
      <circle
        cx={CENTER}
        cy={chordY}
        r={planetRadius + 3}
        fill="none"
        stroke="#0c0a09"
        strokeWidth={0.8}
        opacity={0.35}
      />
    </svg>
  );
}
