"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import type { ConstellationLines } from "@/lib/constellations";
import type { Matrix3 } from "@/lib/sidereal";
import type { SkyBody, SkyBodyId } from "@/lib/sky";
import {
  colourIndexToKelvin,
  kelvinToRgb,
  type StarCatalogue,
} from "@/lib/star-catalogue";
import { createStage } from "./three/stage";

interface Props {
  /** Local apparent sidereal time to show, in hours */
  siderealHours: number;
  /** Position within the night, 0 at sunset and 1 at sunrise */
  nightFraction: number;
  /** Observer latitude in degrees */
  latitude: number;
  /**
   * J2000 → equator of date rotation, row-major. Rebuilding the whole sky is
   * keyed on this value, so pass a stable reference.
   */
  precession: Matrix3;
  /** Moon and planets, also keyed for rebuilds: pass a stable reference. */
  bodies: SkyBody[];
  showConstellations: boolean;
}

const STAR_RADIUS = 100;
const DOME_RADIUS = 300;
const GROUND_RADIUS = 280;
const HORIZON_RADIUS = 260;

/** Only the brightest stars are worth a name in the view. */
const LABEL_MAGNITUDE_LIMIT = 1.6;

/** Faint constellations keep their lines but lose their label, to cut clutter. */
const LABEL_RANK_LIMIT = 2;

/** How much every star is pulled towards white, since the eye barely sees colour. */
const DESATURATION = 0.35;

/** Even Venus and the Moon have to stop growing somewhere. */
const MAX_POINT_SIZE = 12;

const CARDINALS: { label: string; east: number; south: number }[] = [
  { label: "N", east: 0, south: -1 },
  { label: "E", east: 1, south: 0 },
  { label: "S", east: 0, south: 1 },
  { label: "O", east: -1, south: 0 },
];

const BODY_NAMES: Record<SkyBodyId, string> = {
  moon: "Lune",
  mercury: "Mercure",
  venus: "Vénus",
  mars: "Mars",
  jupiter: "Jupiter",
  saturn: "Saturne",
  uranus: "Uranus",
};

const BODY_COLOURS: Record<SkyBodyId, string> = {
  moon: "#e8e6df",
  mercury: "#c9c3b8",
  venus: "#fdf3d0",
  mars: "#e2734a",
  jupiter: "#f0dfb4",
  saturn: "#e6d6a3",
  uranus: "#9fd8e0",
};

interface SkyData {
  stars: StarCatalogue;
  constellations: ConstellationLines;
}

let skyData: Promise<SkyData> | null = null;

function loadJson<T>(path: string): Promise<T> {
  return fetch(path).then((response) => {
    if (!response.ok) {
      throw new Error(`${path} indisponible (${response.status}).`);
    }
    return response.json() as Promise<T>;
  });
}

function loadSkyData(): Promise<SkyData> {
  skyData ??= Promise.all([
    loadJson<StarCatalogue>("/stars.json"),
    loadJson<ConstellationLines>("/constellations.json"),
  ]).then(([stars, constellations]) => ({ stars, constellations }));

  return skyData;
}

const POINT_VERTEX_SHADER = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aIntensity;

  uniform float uPixelRatio;
  uniform float uRadius;

  varying vec3 vColor;
  varying float vIntensity;

  void main() {
    vColor = aColor;

    vec4 world = modelMatrix * vec4(position, 1.0);
    // world.y / radius is the sine of the star's altitude above the horizon.
    float altitude = world.y / uRadius;
    // Nothing shows below the horizon, and the last few degrees above it are
    // dimmed the way the atmosphere really does.
    float extinction = smoothstep(-0.005, 0.14, altitude);

    vIntensity = aIntensity * extinction;
    gl_Position = projectionMatrix * viewMatrix * world;
    gl_PointSize = extinction > 0.0 ? aSize * uPixelRatio : 0.0;
  }
`;

const POINT_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vIntensity;

  void main() {
    float distance = length(gl_PointCoord - vec2(0.5)) * 2.0;
    if (distance > 1.0) discard;

    float falloff = pow(1.0 - distance, 1.6);
    gl_FragColor = vec4(vColor, falloff * vIntensity);
  }
`;

const LINE_VERTEX_SHADER = /* glsl */ `
  uniform float uRadius;
  varying float vFade;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vFade = smoothstep(-0.005, 0.14, world.y / uRadius);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const LINE_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;

  void main() {
    if (vFade <= 0.0) discard;
    gl_FragColor = vec4(uColor, uOpacity * vFade);
  }
`;

const DOME_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorld;

  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DOME_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform float uRadius;

  varying vec3 vWorld;

  void main() {
    float height = clamp(vWorld.y / uRadius, 0.0, 1.0);
    gl_FragColor = vec4(mix(uHorizon, uZenith, pow(height, 0.6)), 1.0);
  }
`;

/**
 * Star sizes and brightnesses are not physical fluxes — a magnitude scale
 * spans a factor of a million, which no screen can show. This is the usual
 * compromise: a gentle curve that keeps the constellations recognisable.
 */
function pointAppearance(magnitude: number, limit: number) {
  const brightness = Math.max(0, limit - magnitude) / 8;

  return {
    size: Math.min(1.4 + brightness ** 1.3 * 10, MAX_POINT_SIZE),
    // Bright objects are allowed past 1 so their additive cores burn out to
    // white, which is what makes them read as bright rather than merely big.
    intensity: 0.22 + brightness ** 0.9 * 1.5,
  };
}

/** Unit vector on the celestial sphere, scaled to the drawing radius. */
function direction(raHours: number, decDegrees: number): THREE.Vector3 {
  const ra = (raHours / 12) * Math.PI;
  const dec = THREE.MathUtils.degToRad(decDegrees);
  const cosDec = Math.cos(dec);

  return new THREE.Vector3(
    STAR_RADIUS * cosDec * Math.cos(ra),
    STAR_RADIUS * cosDec * Math.sin(ra),
    STAR_RADIUS * Math.sin(dec),
  );
}

function makeLabel(text: string, style: string): CSS2DObject {
  const element = document.createElement("div");
  element.textContent = text;
  element.style.cssText = [
    "line-height:1",
    "white-space:nowrap",
    "text-shadow:0 0 6px rgba(0,0,0,0.9)",
    style,
  ].join(";");

  return new CSS2DObject(element);
}

function toMatrix4(rows: Matrix3): THREE.Matrix4 {
  return new THREE.Matrix4().set(
    rows[0][0],
    rows[0][1],
    rows[0][2],
    0,
    rows[1][0],
    rows[1][1],
    rows[1][2],
    0,
    rows[2][0],
    rows[2][1],
    rows[2][2],
    0,
    0,
    0,
    0,
    1,
  );
}

/** Rotation that carries the equator of date onto the observer's horizon. */
function horizonMatrix(latitudeDeg: number): THREE.Matrix4 {
  const phi = THREE.MathUtils.degToRad(latitudeDeg);
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);

  // Scene axes are X = east, Y = zenith, Z = south. The input axes are the
  // hour-angle frame: X towards the meridian, Y east, Z the celestial pole.
  return toMatrix4([
    [0, 1, 0],
    [cos, 0, sin],
    [sin, 0, -cos],
  ]);
}

function pointsMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uRadius: { value: STAR_RADIUS },
    },
    vertexShader: POINT_VERTEX_SHADER,
    fragmentShader: POINT_FRAGMENT_SHADER,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function buildPoints(
  positions: Float32Array,
  colors: Float32Array,
  sizes: Float32Array,
  intensities: Float32Array,
): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute(
    "aIntensity",
    new THREE.BufferAttribute(intensities, 1),
  );

  const points = new THREE.Points(geometry, pointsMaterial());
  points.frustumCulled = false;
  return points;
}

function buildStars(stars: StarCatalogue): THREE.Points {
  const count = stars.count;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const intensities = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const at = direction(stars.ra[i], stars.dec[i]);
    positions[i * 3] = at.x;
    positions[i * 3 + 1] = at.y;
    positions[i * 3 + 2] = at.z;

    const [r, g, b] = kelvinToRgb(colourIndexToKelvin(stars.ci[i]));
    colors[i * 3] = r + (1 - r) * DESATURATION;
    colors[i * 3 + 1] = g + (1 - g) * DESATURATION;
    colors[i * 3 + 2] = b + (1 - b) * DESATURATION;

    const { size, intensity } = pointAppearance(
      stars.mag[i],
      stars.magnitudeLimit,
    );
    sizes[i] = size;
    intensities[i] = intensity;
  }

  return buildPoints(positions, colors, sizes, intensities);
}

function buildBodies(bodies: SkyBody[], limit: number): THREE.Points {
  const positions = new Float32Array(bodies.length * 3);
  const colors = new Float32Array(bodies.length * 3);
  const sizes = new Float32Array(bodies.length);
  const intensities = new Float32Array(bodies.length);

  for (let i = 0; i < bodies.length; i++) {
    const colour = new THREE.Color(BODY_COLOURS[bodies[i].id]);
    colors[i * 3] = colour.r;
    colors[i * 3 + 1] = colour.g;
    colors[i * 3 + 2] = colour.b;

    const { size, intensity } = pointAppearance(bodies[i].magnitude, limit);
    sizes[i] = size;
    intensities[i] = intensity;
  }

  return buildPoints(positions, colors, sizes, intensities);
}

function buildConstellations(lines: ConstellationLines): THREE.LineSegments {
  const vertices = new Float32Array(lines.ra.length * 3);

  for (let i = 0; i < lines.ra.length; i++) {
    const at = direction(lines.ra[i], lines.dec[i]);
    vertices[i * 3] = at.x;
    vertices[i * 3 + 1] = at.y;
    vertices[i * 3 + 2] = at.z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

  const segments = new THREE.LineSegments(
    geometry,
    new THREE.ShaderMaterial({
      uniforms: {
        uRadius: { value: STAR_RADIUS },
        uColor: { value: new THREE.Color("#7d8dc4") },
        uOpacity: { value: 0.32 },
      },
      vertexShader: LINE_VERTEX_SHADER,
      fragmentShader: LINE_FRAGMENT_SHADER,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  segments.frustumCulled = false;
  segments.renderOrder = -5;
  return segments;
}

/** Everything the component drives after the scene has been built. */
interface SkyHandles {
  setSidereal: (hours: number) => void;
  setNightFraction: (fraction: number) => void;
  setConstellationsVisible: (visible: boolean) => void;
}

/**
 * The sky seen from the ground: the whole star catalogue placed on a celestial
 * sphere, tilted for the observer's latitude and spun to the requested
 * sidereal time. Moving through the night is that spin — except for the Moon
 * and the planets, which also drift against the stars and so are interpolated
 * between positions sampled across the night.
 */
export default function StarSphere({
  siderealHours,
  nightFraction,
  latitude,
  precession,
  bodies,
  showConstellations,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handlesRef = useRef<SkyHandles | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Read inside the async build, which may finish after the slider has moved.
  const stateRef = useRef({ siderealHours, nightFraction, showConstellations });
  stateRef.current = { siderealHours, nightFraction, showConstellations };

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;

    let disposed = false;
    let dispose: (() => void) | null = null;

    loadSkyData()
      .then(({ stars, constellations }) => {
        if (disposed || containerRef.current === null) return;

        const stage = createStage(container, {
          controls: "look",
          cameraPosition: [0, 0, 0],
          fov: 70,
          autoRotateSpeed: 0,
          // Facing south, a little above the horizon: the classic view.
          initialLook: { yaw: 180, pitch: 18 },
          fovRange: [25, 95],
        });
        dispose = stage.dispose;

        // Sky gradient, drawn behind everything else.
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(DOME_RADIUS, 32, 16),
          new THREE.ShaderMaterial({
            uniforms: {
              uHorizon: { value: new THREE.Color("#151d40") },
              uZenith: { value: new THREE.Color("#03030a") },
              uRadius: { value: DOME_RADIUS },
            },
            vertexShader: DOME_VERTEX_SHADER,
            fragmentShader: DOME_FRAGMENT_SHADER,
            side: THREE.BackSide,
            depthTest: false,
            depthWrite: false,
          }),
        );
        dome.renderOrder = -10;
        stage.scene.add(dome);

        const horizonGroup = new THREE.Group();
        horizonGroup.applyMatrix4(horizonMatrix(latitude));
        stage.scene.add(horizonGroup);

        const spin = new THREE.Group();
        horizonGroup.add(spin);

        const equatorial = new THREE.Group();
        equatorial.applyMatrix4(toMatrix4(precession));
        spin.add(equatorial);

        equatorial.add(buildStars(stars));

        const constellationLines = buildConstellations(constellations);
        equatorial.add(constellationLines);

        // Every label is hidden once its target drops below the horizon.
        const tracked: CSS2DObject[] = [];
        const constellationLabels: CSS2DObject[] = [];

        function addLabel(
          parent: THREE.Object3D,
          text: string,
          at: THREE.Vector3,
          style: string,
          anchor: [number, number],
        ) {
          const label = makeLabel(text, style);
          label.position.copy(at);
          label.center.set(anchor[0], anchor[1]);
          parent.add(label);
          tracked.push(label);
          return label;
        }

        for (const entry of constellations.labels) {
          if (entry.rank > LABEL_RANK_LIMIT) continue;
          constellationLabels.push(
            addLabel(
              equatorial,
              entry.name,
              direction(entry.ra, entry.dec),
              "font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(150,166,220,0.5)",
              [0.5, 0.5],
            ),
          );
        }

        for (const entry of stars.names) {
          if (stars.mag[entry.i] > LABEL_MAGNITUDE_LIMIT) continue;
          addLabel(
            equatorial,
            entry.name,
            direction(stars.ra[entry.i], stars.dec[entry.i]),
            "font-size:11px;letter-spacing:0.04em;color:rgba(255,255,255,0.55)",
            [0.5, -0.35],
          );
        }

        // Moon and planets: a second point cloud, moved as the night advances.
        const bodyPoints = buildBodies(bodies, stars.magnitudeLimit);
        equatorial.add(bodyPoints);

        const bodyLabels = bodies.map((body) =>
          addLabel(
            equatorial,
            BODY_NAMES[body.id],
            new THREE.Vector3(),
            `font-size:11px;letter-spacing:0.04em;font-weight:600;color:${BODY_COLOURS[body.id]}`,
            [0.5, -0.4],
          ),
        );

        // Ground: a dark bowl under the horizon.
        const ground = new THREE.Mesh(
          new THREE.SphereGeometry(
            GROUND_RADIUS,
            48,
            16,
            0,
            Math.PI * 2,
            Math.PI / 2,
            Math.PI / 2,
          ),
          // A touch warmer than the sky, so the horizon reads without a
          // hard line doing all the work.
          new THREE.MeshBasicMaterial({
            color: "#100f16",
            side: THREE.BackSide,
            depthTest: false,
            depthWrite: false,
          }),
        );
        ground.renderOrder = 10;
        stage.scene.add(ground);

        const horizonPoints: THREE.Vector3[] = [];
        for (let i = 0; i <= 128; i++) {
          const angle = (i / 128) * Math.PI * 2;
          horizonPoints.push(
            new THREE.Vector3(
              HORIZON_RADIUS * Math.cos(angle),
              0,
              HORIZON_RADIUS * Math.sin(angle),
            ),
          );
        }
        const horizonLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(horizonPoints),
          new THREE.LineBasicMaterial({
            color: "#8ea0da",
            transparent: true,
            opacity: 0.5,
            depthTest: false,
          }),
        );
        horizonLine.renderOrder = 11;
        stage.scene.add(horizonLine);

        for (const cardinal of CARDINALS) {
          const label = makeLabel(
            cardinal.label,
            "font-size:11px;font-weight:600;letter-spacing:0.08em;color:rgba(199,210,254,0.7)",
          );
          label.position.set(
            cardinal.east * HORIZON_RADIUS,
            HORIZON_RADIUS * 0.03,
            cardinal.south * HORIZON_RADIUS,
          );
          stage.scene.add(label);
        }

        const worldPosition = new THREE.Vector3();
        let constellationsShown = true;

        /**
         * Label visibility only changes when the sphere turns or a body moves,
         * never when the camera does, so this runs on updates and not per frame.
         */
        function refreshLabels() {
          horizonGroup.updateMatrixWorld(true);
          for (const label of tracked) {
            label.getWorldPosition(worldPosition);
            label.visible = worldPosition.y > STAR_RADIUS * 0.03;
          }
          if (!constellationsShown) {
            for (const label of constellationLabels) label.visible = false;
          }
        }

        function setNightFraction(fraction: number) {
          const attribute = bodyPoints.geometry.getAttribute(
            "position",
          ) as THREE.BufferAttribute;
          const clamped = Math.min(Math.max(fraction, 0), 1);

          for (let i = 0; i < bodies.length; i++) {
            const samples = bodies[i].samples;
            const scaled = clamped * (samples.length - 1);
            const first = Math.min(Math.floor(scaled), samples.length - 2);
            const blend = scaled - first;

            const a = samples[first];
            const b = samples[first + 1];
            // Interpolating directions then renormalising keeps the body on
            // the sphere without any wrap-around trouble near 0 h.
            const x = a[0] + (b[0] - a[0]) * blend;
            const y = a[1] + (b[1] - a[1]) * blend;
            const z = a[2] + (b[2] - a[2]) * blend;
            const length = Math.hypot(x, y, z) || 1;

            attribute.setXYZ(
              i,
              (STAR_RADIUS * x) / length,
              (STAR_RADIUS * y) / length,
              (STAR_RADIUS * z) / length,
            );
            bodyLabels[i].position.set(
              (STAR_RADIUS * x) / length,
              (STAR_RADIUS * y) / length,
              (STAR_RADIUS * z) / length,
            );
          }

          attribute.needsUpdate = true;
          refreshLabels();
        }

        function setSidereal(hours: number) {
          spin.rotation.z = -THREE.MathUtils.degToRad(hours * 15);
          refreshLabels();
        }

        function setConstellationsVisible(visible: boolean) {
          constellationsShown = visible;
          constellationLines.visible = visible;
          refreshLabels();
        }

        handlesRef.current = {
          setSidereal,
          setNightFraction,
          setConstellationsVisible,
        };

        const initial = stateRef.current;
        setSidereal(initial.siderealHours);
        setNightFraction(initial.nightFraction);
        setConstellationsVisible(initial.showConstellations);
      })
      .catch((cause) => {
        console.error(cause);
        setError("Impossible de charger les données du ciel.");
      });

    return () => {
      disposed = true;
      handlesRef.current = null;
      dispose?.();
    };
  }, [latitude, precession, bodies]);

  // Advancing through the night is a rotation about the celestial pole…
  useEffect(() => {
    handlesRef.current?.setSidereal(siderealHours);
  }, [siderealHours]);

  // …plus the bodies that do not follow it.
  useEffect(() => {
    handlesRef.current?.setNightFraction(nightFraction);
  }, [nightFraction]);

  useEffect(() => {
    handlesRef.current?.setConstellationsVisible(showConstellations);
  }, [showConstellations]);

  if (error !== null) {
    return (
      <div className="flex h-80 items-center justify-center rounded-2xl border border-white/8 bg-white/3 px-5 text-center text-sm text-white/40 sm:h-[28rem]">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-80 w-full overflow-hidden rounded-2xl border border-white/8 bg-[#03030b] sm:h-[28rem]"
    />
  );
}
