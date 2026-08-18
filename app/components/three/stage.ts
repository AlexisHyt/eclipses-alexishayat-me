import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";

/**
 * Minimal Three.js boilerplate shared by every 3D panel: renderer, camera,
 * controls, HTML label layer, resize handling and a render loop that pauses
 * while the container is off screen.
 */
export interface Stage {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  labelRenderer: CSS2DRenderer;
  /** Present in "orbit" mode only. */
  controls: OrbitControls | null;
  /** Register a per-frame callback. Returns a function to unregister it. */
  onFrame: (callback: (deltaSec: number) => void) => () => void;
  dispose: () => void;
}

export interface StageOptions {
  /**
   * "orbit" turns the camera around the origin, for looking at an object.
   * "look" keeps it still and turns it on itself, for looking from inside.
   */
  controls?: "orbit" | "look";
  cameraPosition?: [number, number, number];
  fov?: number;
  minDistance?: number;
  maxDistance?: number;
  /** Degrees per second; 0 disables the slow automatic rotation. Orbit only. */
  autoRotateSpeed?: number;
  /** Where the camera looks initially, in degrees. Look mode only. */
  initialLook?: { yaw: number; pitch: number };
  /** Field of view bounds reachable by zooming. Look mode only. */
  fovRange?: [number, number];
}

/** Container shape the default camera distance is tuned for. */
const REFERENCE_ASPECT = 1.6;

const MAX_PITCH_DEG = 85;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    for (const entry of material) entry.dispose();
    return;
  }
  material.dispose();
}

/**
 * Look-around controls for a camera standing inside the scene: dragging turns
 * it on itself, the wheel narrows or widens the field of view. Pointer events
 * cover mouse and touch alike. Returns a function that detaches everything.
 */
function attachLookControls(
  element: HTMLElement,
  camera: THREE.PerspectiveCamera,
  initial: { yaw: number; pitch: number },
  fovRange: [number, number],
): () => void {
  let yaw = THREE.MathUtils.degToRad(initial.yaw);
  let pitch = THREE.MathUtils.degToRad(initial.pitch);
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function apply() {
    camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, "YXZ"));
  }

  function onPointerDown(event: PointerEvent) {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    element.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging) return;

    // One pixel turns the view by one pixel's worth of the field of view, so
    // dragging feels the same whatever the zoom level.
    const perPixel =
      THREE.MathUtils.degToRad(camera.fov) / Math.max(element.clientHeight, 1);

    yaw += (event.clientX - lastX) * perPixel;
    pitch = THREE.MathUtils.clamp(
      pitch + (event.clientY - lastY) * perPixel,
      -THREE.MathUtils.degToRad(MAX_PITCH_DEG),
      THREE.MathUtils.degToRad(MAX_PITCH_DEG),
    );

    lastX = event.clientX;
    lastY = event.clientY;
    apply();
  }

  function onPointerUp(event: PointerEvent) {
    dragging = false;
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();
    camera.fov = THREE.MathUtils.clamp(
      camera.fov * Math.exp(event.deltaY * 0.001),
      fovRange[0],
      fovRange[1],
    );
    camera.updateProjectionMatrix();
  }

  element.style.touchAction = "none";
  element.style.cursor = "grab";
  element.addEventListener("pointerdown", onPointerDown);
  element.addEventListener("pointermove", onPointerMove);
  element.addEventListener("pointerup", onPointerUp);
  element.addEventListener("pointercancel", onPointerUp);
  element.addEventListener("wheel", onWheel, { passive: false });
  apply();

  return () => {
    element.removeEventListener("pointerdown", onPointerDown);
    element.removeEventListener("pointermove", onPointerMove);
    element.removeEventListener("pointerup", onPointerUp);
    element.removeEventListener("pointercancel", onPointerUp);
    element.removeEventListener("wheel", onWheel);
  };
}

export function createStage(
  container: HTMLElement,
  options: StageOptions = {},
): Stage {
  const {
    controls: controlsMode = "orbit",
    // A narrow field of view keeps the perspective gentle, so an orbit seen
    // from above reads as a true ellipse rather than a distorted one.
    cameraPosition = [0, 2.1, 2.55],
    fov = 32,
    minDistance = 1.5,
    maxDistance = 9,
    autoRotateSpeed = 0.35,
    initialLook = { yaw: 0, pitch: 0 },
    fovRange = [25, 95],
  } = options;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.01, 2000);
  camera.position.set(...cameraPosition);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.display = "block";
  container.appendChild(renderer.domElement);

  // HTML labels drawn above the canvas; pointer events fall through so the
  // orbit controls keep receiving them.
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.inset = "0";
  labelRenderer.domElement.style.pointerEvents = "none";
  container.appendChild(labelRenderer.domElement);

  let controls: OrbitControls | null = null;
  let userControlled = false;

  const direction = new THREE.Vector3(...cameraPosition);
  const baseDistance = direction.length();
  direction.normalize();

  if (controlsMode === "orbit") {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = minDistance;
    controls.maxDistance = maxDistance;
    controls.autoRotate = autoRotateSpeed > 0 && !prefersReducedMotion();
    controls.autoRotateSpeed = autoRotateSpeed;

    // Hand the camera over to the visitor as soon as they touch it.
    controls.addEventListener("start", () => {
      userControlled = true;
      if (controls !== null) controls.autoRotate = false;
    });
  }

  const detachLook =
    controlsMode === "look"
      ? attachLookControls(renderer.domElement, camera, initialLook, fovRange)
      : null;

  function resize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;

    const aspect = width / height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);

    // A narrow container needs the camera further back to keep the scene and
    // its labels inside the frame. Once the visitor has moved the camera
    // themselves, leave it alone.
    if (controlsMode === "orbit" && !userControlled) {
      const pullBack = Math.min(1.8, Math.max(1, REFERENCE_ASPECT / aspect));
      camera.position.copy(direction).multiplyScalar(baseDistance * pullBack);
    }
  }

  resize();

  const callbacks = new Set<(deltaSec: number) => void>();
  const timer = new THREE.Timer();
  timer.connect(document); // no jump in the animation when the tab comes back
  let frame = 0;

  function tick(timestamp: number) {
    frame = requestAnimationFrame(tick);
    timer.update(timestamp);
    const delta = timer.getDelta();

    for (const callback of callbacks) callback(delta);
    controls?.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  function start() {
    if (frame !== 0) return;
    timer.update(); // drop the time spent paused
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    if (frame === 0) return;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const visibilityObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) start();
    else stop();
  });
  visibilityObserver.observe(container);

  start();

  return {
    scene,
    camera,
    renderer,
    labelRenderer,
    controls,
    onFrame(callback) {
      callbacks.add(callback);
      return () => callbacks.delete(callback);
    },
    dispose() {
      stop();
      callbacks.clear();
      timer.dispose();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      controls?.dispose();
      detachLook?.();

      scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.Line ||
          object instanceof THREE.Points
        ) {
          object.geometry.dispose();
          disposeMaterial(object.material);
        }
      });
      scene.clear();

      // Browsers cap the number of live WebGL contexts, and these panels are
      // mounted and unmounted every time the visitor switches tab.
      renderer.forceContextLoss();
      renderer.dispose();

      renderer.domElement.remove();
      labelRenderer.domElement.remove();
    },
  };
}
