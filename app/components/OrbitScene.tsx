"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { formatKm } from "./formatters";
import { createStage } from "./three/stage";

interface ApsisMarker {
  name: string;
  km: number;
  color: string;
}

interface Props {
  centerName: string;
  centerColor: string;
  bodyName: string;
  bodyColor: string;
  periapsis: ApsisMarker;
  apoapsis: ApsisMarker;
  /** Where the body actually is right now. */
  trueAnomaly: number;
  distanceKm: number;
}

const ORBIT_SEGMENTS = 512;
const CENTER_RADIUS = 0.06;
const BODY_RADIUS = 0.03;
const MARKER_RADIUS = 0.018;

/**
 * Points of an ellipse of semi-major axis 1 and eccentricity `e`, laid flat in
 * the XZ plane with the occupied focus at the origin and the periapsis on +X.
 * With `e = 0` this is simply the unit circle.
 */
function ellipsePoints(e: number): THREE.Vector3[] {
  const b = Math.sqrt(1 - e * e);
  const points: THREE.Vector3[] = [];

  for (let i = 0; i < ORBIT_SEGMENTS; i++) {
    const t = (i / ORBIT_SEGMENTS) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(t) - e, 0, b * Math.sin(t)));
  }

  return points;
}

/**
 * Position of the body for a true anomaly in degrees and a radius already
 * normalised on the semi-major axis. The minus on Z makes the body travel
 * counterclockwise as seen from the ecliptic north, the way it really does.
 */
function positionAt(trueAnomaly: number, radius: number): THREE.Vector3 {
  const nu = (trueAnomaly * Math.PI) / 180;
  return new THREE.Vector3(radius * Math.cos(nu), 0, -radius * Math.sin(nu));
}

/** `offsetY` above the anchor places the label on top of it, below puts it under. */
function makeLabel(text: string, color: string, offsetY: number): CSS2DObject {
  const element = document.createElement("div");
  element.textContent = text;
  element.style.cssText = [
    "font-size:11px",
    "line-height:1",
    "white-space:nowrap",
    "padding:3px 8px",
    "border-radius:999px",
    "background:rgba(7,7,15,0.78)",
    "border:1px solid rgba(255,255,255,0.12)",
    `color:${color}`,
  ].join(";");

  const label = new CSS2DObject(element);
  label.position.set(0, offsetY, 0);
  label.center.set(0.5, offsetY < 0 ? 0 : 1);
  return label;
}

function bodyMesh(radius: number, color: string, glow: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: glow,
      roughness: 0.55,
    }),
  );
}

function dashedLine(
  points: THREE.Vector3[],
  color: string,
  opacity: number,
  dashSize: number,
): THREE.Line {
  const line = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineDashedMaterial({
      color,
      transparent: true,
      opacity,
      dashSize,
      gapSize: dashSize,
    }),
  );
  line.computeLineDistances();
  return line;
}

/**
 * Orbit of one body around another, with the radial distances drawn to scale
 * and the body placed where it actually is at the requested instant. The
 * bodies themselves are deliberately not to scale — at these distances they
 * would be invisible.
 */
export default function OrbitScene({
  centerName,
  centerColor,
  bodyName,
  bodyColor,
  periapsis,
  apoapsis,
  trueAnomaly,
  distanceKm,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  // Flattened so the scene is only rebuilt when a value really changes, not
  // every time the parent hands down fresh marker objects.
  const { name: periName, km: periKm, color: periColor } = periapsis;
  const { name: apoName, km: apoKm, color: apoColor } = apoapsis;

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    // Normalise on the semi-major axis: every radius in the scene is then a
    // faithful fraction of the real one.
    const semiMajorKm = (periKm + apoKm) / 2;
    const e = (apoKm - periKm) / (apoKm + periKm);

    let stage: ReturnType<typeof createStage>;
    try {
      stage = createStage(container);
    } catch (error) {
      console.error(error);
      setFailed(true);
      return;
    }

    stage.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(2, 3, 2);
    stage.scene.add(keyLight);

    // Circular orbit of the same semi-major axis, for comparison.
    stage.scene.add(
      dashedLine(
        [...ellipsePoints(0), new THREE.Vector3(1, 0, 0)],
        "#ffffff",
        0.14,
        0.05,
      ),
    );

    const orbit = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(ellipsePoints(e)),
      new THREE.LineBasicMaterial({
        color: bodyColor,
        transparent: true,
        opacity: 0.75,
      }),
    );
    stage.scene.add(orbit);

    const center = bodyMesh(CENTER_RADIUS, centerColor, 0.45);
    center.add(makeLabel(centerName, "rgba(255,255,255,0.8)", -0.09));
    stage.scene.add(center);

    for (const [name, color, x] of [
      [periName, periColor, 1 - e],
      [apoName, apoColor, -1 - e],
    ] as const) {
      // Name only: the exact distances are listed right under the scene, and
      // long labels would spill out of a narrow canvas.
      const marker = bodyMesh(MARKER_RADIUS, color, 0.6);
      marker.position.set(x, 0, 0);
      marker.add(makeLabel(name, color, 0.1));
      stage.scene.add(marker);

      stage.scene.add(
        dashedLine(
          [new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, 0, 0)],
          color,
          0.4,
          0.04,
        ),
      );
    }

    // Real position: the measured distance, at the angle actually travelled
    // since the periapsis.
    const current = positionAt(trueAnomaly, distanceKm / semiMajorKm);

    stage.scene.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          current,
        ]),
        new THREE.LineBasicMaterial({
          color: bodyColor,
          transparent: true,
          opacity: 0.5,
        }),
      ),
    );

    // Label below the body, so it never collides with the apsis labels above.
    const body = bodyMesh(BODY_RADIUS, bodyColor, 0.3);
    body.position.copy(current);
    body.add(
      makeLabel(
        `${bodyName} · ${formatKm(distanceKm)}`,
        "rgba(255,255,255,0.75)",
        -0.09,
      ),
    );
    stage.scene.add(body);

    return () => {
      stage.dispose();
    };
  }, [
    centerName,
    centerColor,
    bodyName,
    bodyColor,
    periName,
    periKm,
    periColor,
    apoName,
    apoKm,
    apoColor,
    trueAnomaly,
    distanceKm,
  ]);

  if (failed) {
    return (
      <div className="flex h-72 items-center justify-center rounded-2xl border border-white/8 bg-white/3 px-5 text-center text-sm text-white/40 sm:h-96">
        Votre navigateur ne permet pas d&apos;afficher l&apos;orbite en 3D
        (WebGL indisponible).
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-72 w-full overflow-hidden rounded-2xl border border-white/8 bg-white/3 sm:h-96"
    />
  );
}
