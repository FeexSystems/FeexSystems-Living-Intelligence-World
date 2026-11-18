import { useEffect, useRef, type KeyboardEvent } from "react";
import * as THREE from "three";

interface HoloKaiRoboticCoreProps {
  isStreaming?: boolean;
  accentColor?: string;
  alertPulse?: number;
  onCoreClick?: () => void;
  className?: string;
}

/** Lightweight procedural servo core; all geometry is generated locally (no model downloads). */
export function HoloKaiRoboticCore({
  isStreaming = false,
  accentColor = "#ffffff",
  alertPulse = 0,
  onCoreClick,
  className = "h-56 w-full",
}: HoloKaiRoboticCoreProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const streamingRef = useRef(isStreaming);
  const pulseRef = useRef(alertPulse);
  const onCoreClickRef = useRef(onCoreClick);
  streamingRef.current = isStreaming;
  pulseRef.current = alertPulse;
  onCoreClickRef.current = onCoreClick;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.z = 5.4;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);

    const primaryColor = new THREE.Color(accentColor);
    const brushedSteel = new THREE.Color("#18181b");
    const silver = new THREE.Color("#d4d4d8");
    const whiteLight = new THREE.Color("#ffffff");
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    const trackedGeometries: THREE.BufferGeometry[] = [];
    const trackedMaterials: THREE.Material[] = [];
    const trackGeometry = <T extends THREE.BufferGeometry>(geometry: T) => (trackedGeometries.push(geometry), geometry);
    const trackMaterial = <T extends THREE.Material>(material: T) => (trackedMaterials.push(material), material);

    const housing = new THREE.Mesh(
      trackGeometry(new THREE.SphereGeometry(0.68, 24, 24)),
      trackMaterial(new THREE.MeshStandardMaterial({ color: brushedSteel, metalness: 0.85, roughness: 0.25 })),
    );
    const eyeGroup = new THREE.Group();
    const irisMaterial = trackMaterial(new THREE.MeshBasicMaterial({ color: primaryColor, side: THREE.DoubleSide }));
    const iris = new THREE.Mesh(trackGeometry(new THREE.RingGeometry(0.22, 0.42, 32)), irisMaterial);
    iris.position.z = 0.69;
    const pupil = new THREE.Mesh(
      trackGeometry(new THREE.CircleGeometry(0.14, 24)),
      trackMaterial(new THREE.MeshBasicMaterial({ color: whiteLight })),
    );
    pupil.position.z = 0.7;
    eyeGroup.add(housing, iris, pupil);
    rootGroup.add(eyeGroup);

    const createServoRing = (radius: number, tube: number, arc: number) => {
      const geometry = trackGeometry(new THREE.TorusGeometry(radius, tube, 12, 64, arc));
      const material = trackMaterial(new THREE.MeshStandardMaterial({
        color: brushedSteel,
        emissive: silver,
        emissiveIntensity: 0.22,
        metalness: 0.9,
        roughness: 0.2,
      }));
      const mesh = new THREE.Mesh(geometry, material);
      const wire = new THREE.LineSegments(
        trackGeometry(new THREE.EdgesGeometry(geometry)),
        trackMaterial(new THREE.LineBasicMaterial({ color: silver, transparent: true, opacity: 0.45 })),
      );
      mesh.add(wire);
      return mesh;
    };

    const ringInner = createServoRing(1.15, 0.045, Math.PI * 1.65);
    const ringMid = createServoRing(1.52, 0.035, Math.PI * 1.35);
    const ringOuter = createServoRing(1.9, 0.025, Math.PI * 1.8);
    rootGroup.add(ringInner, ringMid, ringOuter);

    const clawPivots: THREE.Group[] = [];
    const bladeMaterials: THREE.MeshStandardMaterial[] = [];
    for (let index = 0; index < 4; index += 1) {
      const angle = (index * Math.PI) / 2 + Math.PI / 4;
      const anchor = new THREE.Group();
      anchor.rotation.z = angle;
      const pivot = new THREE.Group();
      pivot.position.x = 1.65;
      const bladeMaterial = trackMaterial(new THREE.MeshStandardMaterial({
        color: brushedSteel,
        emissive: silver,
        emissiveIntensity: 0.15,
        metalness: 0.8,
        roughness: 0.3,
      }));
      bladeMaterials.push(bladeMaterial);
      const blade = new THREE.Mesh(trackGeometry(new THREE.BoxGeometry(0.65, 0.14, 0.12)), bladeMaterial);
      blade.position.x = 0.25;
      pivot.add(blade);
      anchor.add(pivot);
      rootGroup.add(anchor);
      clawPivots.push(pivot);
    }

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const pointLight = new THREE.PointLight(whiteLight, 3.5, 12);
    pointLight.position.set(2.5, 2.5, 4);
    scene.add(ambient, pointLight);

    const pointer = { x: 0, y: 0 };
    const dragRotation = { x: 0, y: 0 };
    let dragging = false;
    let didDrag = false;
    let previousPointer = { x: 0, y: 0 };
    let lastPulse = pulseRef.current;
    let pulseStarted = -10;
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const onPointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 + 1;
      if (dragging) {
        const dx = event.clientX - previousPointer.x;
        const dy = event.clientY - previousPointer.y;
        if (Math.abs(dx) + Math.abs(dy) > 1) didDrag = true;
        dragRotation.y += dx * 0.01;
        dragRotation.x += dy * 0.01;
        previousPointer = { x: event.clientX, y: event.clientY };
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      dragging = true;
      didDrag = false;
      previousPointer = { x: event.clientX, y: event.clientY };
      container.setPointerCapture?.(event.pointerId);
    };
    const onPointerUp = () => { dragging = false; };
    const onClick = () => {
      if (didDrag) { didDrag = false; return; }
      pulseStarted = clock.getElapsedTime();
      onCoreClickRef.current?.();
    };

    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("click", onClick);
    window.addEventListener("pointerup", onPointerUp);

    const resizeObserver = new ResizeObserver(() => {
      if (disposed) return;
      const nextWidth = Math.max(container.clientWidth, 1);
      const nextHeight = Math.max(container.clientHeight, 1);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
      // `setSize` clears the drawing buffer. While the loop is paused (hidden
      // tab, reduced motion) nothing else would repaint it, so re-render once
      // here — otherwise the canvas is left blank until the loop resumes.
      if (!running) renderer.render(scene, camera);
    });
    resizeObserver.observe(container);

    // ── Render gating (principle #9) ──────────────────────────────────────
    // The core lives mid-scroll on the landing and inside the uplink drawer,
    // so an unconditional RAF loop burns GPU/CPU on frames nobody sees.
    // Three gates: off-screen (IntersectionObserver), background tab
    // (visibilitychange), and reduced-motion (single static frame).
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let onScreen = true;
    let running = false;

    const animate = () => {
      // `disposed` is the only condition that must stop the chain outright: the
      // effect has been torn down and the renderer is gone. `running` is NOT
      // checked here — under React StrictMode (and any fast mount/unmount/remount)
      // a frame scheduled by the previous effect instance can be served after the
      // new instance set `running = true`, and bailing on `running` left the loop
      // permanently dead with a blank canvas. Pausing is handled by `stopLoop()`
      // cancelling the pending frame instead.
      if (disposed) return;
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const streaming = streamingRef.current;
      const activeSpeed = streaming ? 3.2 : 1;
      if (pulseRef.current !== lastPulse) {
        lastPulse = pulseRef.current;
        pulseStarted = elapsed;
      }

      eyeGroup.rotation.y = THREE.MathUtils.lerp(eyeGroup.rotation.y, pointer.x * 0.65, 0.1);
      eyeGroup.rotation.x = THREE.MathUtils.lerp(eyeGroup.rotation.x, -pointer.y * 0.65, 0.1);
      ringInner.rotation.z += 0.012 * activeSpeed;
      ringInner.rotation.x = Math.sin(elapsed * 0.9) * 0.35;
      ringMid.rotation.y -= 0.015 * activeSpeed;
      ringMid.rotation.z = Math.cos(elapsed * 0.7) * 0.4;
      ringOuter.rotation.x += 0.008 * activeSpeed;
      ringOuter.rotation.y += 0.006 * activeSpeed;
      const targetClawAngle = streaming ? -0.55 : 0.25 + Math.sin(elapsed * 2) * 0.06;
      clawPivots.forEach((pivot) => { pivot.rotation.y = THREE.MathUtils.lerp(pivot.rotation.y, targetClawAngle, 0.12); });
      rootGroup.rotation.x = THREE.MathUtils.lerp(rootGroup.rotation.x, dragRotation.x, 0.08);
      rootGroup.rotation.y = THREE.MathUtils.lerp(rootGroup.rotation.y, dragRotation.y, 0.08);

      const pulseAge = elapsed - pulseStarted;
      const pulsing = pulseAge >= 0 && pulseAge < 1.2;
      const pulseStrength = pulsing ? Math.sin((pulseAge / 1.2) * Math.PI) : 0;
      const pulseColor = pulseStrength > 0 ? new THREE.Color().lerpColors(silver, whiteLight, pulseStrength) : primaryColor;
      irisMaterial.color.copy(pulseColor);
      bladeMaterials.forEach((material) => {
        material.emissive.copy(pulseColor);
        material.emissiveIntensity = 0.15 + pulseStrength * 1.2;
      });
      renderer.render(scene, camera);
    };

    /** Start the loop only when it is both on-screen and in a visible tab. */
    const startLoop = () => {
      if (disposed || running || reduceMotion || !onScreen || document.hidden) return;
      running = true;
      // Reset the clock so the first frame after a resume does not compute a
      // huge `elapsed` delta and snap every rotation to its target.
      clock.getDelta();
      frameId = requestAnimationFrame(animate);
    };

    /** Stop the loop and drop the pending frame. */
    const stopLoop = () => {
      running = false;
      if (frameId) cancelAnimationFrame(frameId);
      frameId = 0;
    };

    if (reduceMotion) {
      // Render a single static frame so the core is still present, then never
      // start the loop — `startLoop` also refuses under reduced motion, so the
      // observer and visibility handlers cannot restart it.
      renderer.render(scene, camera);
    }

    // Seed visibility synchronously, then start.
    //
    // IntersectionObserver with `threshold: 0` only delivers when the ratio
    // *changes*; an element that is already fully visible at observe() time may
    // never produce a callback (observed here: a fresh observer fires ratio 1
    // immediately, but the one created during React's StrictMode remount never
    // fired at all, leaving the loop stopped forever and the canvas blank).
    // Measuring the rect up front makes the initial state correct with or
    // without a callback; the observer then only handles later transitions.
    const rect = container.getBoundingClientRect();
    const viewportH = window.innerHeight || document.documentElement.clientHeight;
    const viewportW = window.innerWidth || document.documentElement.clientWidth;
    onScreen =
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < viewportH &&
      rect.left < viewportW;

    if (!reduceMotion) startLoop();

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        onScreen = entry.isIntersecting;
        if (onScreen) startLoop();
        else stopLoop();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(container);

    const onVisibilityChange = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      stopLoop();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("click", onClick);
      window.removeEventListener("pointerup", onPointerUp);
      trackedGeometries.forEach((geometry) => geometry.dispose());
      trackedMaterials.forEach((material) => material.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
  }, [accentColor]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onCoreClick?.();
    }
  };


  return (
    <div
      ref={containerRef}
      role="button"
      tabIndex={0}
      aria-label="Interactive HoloKai robotic telemetry core. Drag to orbit or press Enter to dispatch a diagnostic ping."
      onKeyDown={handleKeyDown}
      className={`relative touch-none cursor-grab select-none active:cursor-grabbing ${className}`}
    />
  );
}
