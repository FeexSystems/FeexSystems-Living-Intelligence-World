import React, { useRef, useState, useEffect, useMemo, MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import rawVert from "@/shaders/lutShader.vert";
import rawFrag from "@/shaders/lutShader.frag";
import ErrorBoundary from "./ErrorBoundary";
import { MotionToggle, DEFAULT_CONTROLS_LABEL } from "./heroTypes";

export interface LutPipelineCanvasProps {
  src: string;
  poster: string;
  lutMap?: string;
  lutIntensity?: number;
  className?: string;
  mask?: "radial" | "linear" | "none";
  objectPosition?: string;
  ariaLabel?: string;
  showPauseControl?: boolean;
  controlsLabel?: string;
}

export function computeCoverTransform(
  containerW: number,
  containerH: number,
  videoW: number,
  videoH: number
): { sx: number; sy: number; ox: number; oy: number } {
  if (!containerW || !containerH || !videoW || !videoH) {
    return { sx: 1, sy: 1, ox: 0, oy: 0 };
  }

  const containerAspect = containerW / containerH;
  const videoAspect = videoW / videoH;

  let sx = 1;
  let sy = 1;
  let ox = 0;
  let oy = 0;

  if (containerAspect > videoAspect) {
    // Container is wider than video: scale Y (crop top/bottom)
    sy = videoAspect / containerAspect;
    oy = (1 - sy) * 0.5;
  } else {
    // Container is taller than video: scale X (crop left/right)
    sx = containerAspect / videoAspect;
    ox = (1 - sx) * 0.5;
  }

  return { sx, sy, ox, oy };
}

interface LutSceneProps {
  video: HTMLVideoElement;
  lutTexture: THREE.Texture;
  intensity: number;
  visibleRef: MutableRefObject<boolean>;
}

function LutScene({ video, lutTexture, intensity, visibleRef }: LutSceneProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();

  const videoTexture = useMemo(() => {
    const vt = new THREE.VideoTexture(video);
    vt.minFilter = THREE.LinearFilter;
    vt.magFilter = THREE.LinearFilter;
    vt.generateMipmaps = false;
    vt.format = THREE.RGBAFormat;
    return vt;
  }, [video]);

  // Cleanup video texture on unmount
  useEffect(() => {
    return () => {
      videoTexture.dispose();
    };
  }, [videoTexture]);

  const uniforms = useMemo(() => {
    return {
      uTexture: { value: videoTexture },
      uLutMap: { value: lutTexture },
      uLutIntensity: { value: intensity },
      uCoverTransform: { value: new THREE.Vector4(1, 1, 0, 0) },
    };
  }, [videoTexture, lutTexture, intensity]);

  useFrame(() => {
    if (!visibleRef.current || (typeof document !== "undefined" && document.hidden)) {
      return;
    }

    if (materialRef.current && video.videoWidth && video.videoHeight) {
      const transform = computeCoverTransform(
        viewport.width,
        viewport.height,
        video.videoWidth,
        video.videoHeight
      );

      materialRef.current.uniforms.uCoverTransform.value.set(
        transform.sx,
        transform.sy,
        transform.ox,
        transform.oy
      );
      materialRef.current.uniforms.uLutIntensity.value = intensity;
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={rawVert}
        fragmentShader={rawFrag}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

export function LutPipelineCanvas({
  src,
  poster,
  lutMap = "/media/feex/lut-cinematic-16.png",
  lutIntensity = 0.75,
  className,
  mask = "radial",
  objectPosition = "center",
  ariaLabel = "Cinematic video background",
  showPauseControl = true,
  controlsLabel = DEFAULT_CONTROLS_LABEL,
}: LutPipelineCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [hasError, setHasError] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(true);
  const [lutTexture, setLutTexture] = useState<THREE.Texture | null>(null);
  // Raw media/network errors are latched; autoplay *rejections* are not (see
  // the video-mount effect below).
  const [mediaError, setMediaError] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Mirror of videoRef in state. `<Canvas>` only binds the shader pipeline once
  // the element exists; the effect that creates it runs after the first render,
  // so a ref alone never re-rendered the scene and the hero painted nothing.
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const visibleRef = useRef(true);
  const userPausedRef = useRef(false);

  // The observed element is the only trigger for React state. Playback is
  // started/stopped by the observer callback directly on the element, so the
  // dependency array must stay empty: depending on `isIntersecting` would
  // disconnect and re-observe the container on every intersection change.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
        setIsIntersecting(visible);
        visibleRef.current = visible;

        if (videoRef.current) {
          if (visible && !userPausedRef.current) {
            videoRef.current.play().catch(() => {});
          } else {
            videoRef.current.pause();
          }
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Clamp intensity to 0.35 - 0.95
  const clampedIntensity = Math.min(Math.max(lutIntensity, 0.35), 0.95);

  // Synchronize paused and visibility state
  useEffect(() => {
    userPausedRef.current = userPaused;
    if (videoRef.current) {
      if (userPaused) {
        videoRef.current.pause();
      } else if (isIntersecting && !reduced && !hasError) {
        videoRef.current.play().catch(() => setHasError(true));
      }
    }
  }, [userPaused, isIntersecting, reduced, hasError]);

  // Listen to document visibility changes
  useEffect(() => {
    const handleVis = () => {
      if (document.hidden) {
        visibleRef.current = false;
        videoRef.current?.pause();
      } else {
        // Derive visibility from the ref: `isIntersecting` is captured stale
        // because this effect only re-runs on container intersection changes.
        const visible = containerRef.current
          ? !document.hidden && visibleRef.current === true && !userPausedRef.current
          : false;
        visibleRef.current = visible || (visibleRef.current && !document.hidden);
        if (visibleRef.current) {
          videoRef.current?.play().catch(() => {});
        }
      }
    };

    document.addEventListener("visibilitychange", handleVis);
    return () => document.removeEventListener("visibilitychange", handleVis);
  }, []);

  // Instantiate and mount video element
  useEffect(() => {
    if (reduced) return;

    const vid = document.createElement("video");
    vid.src = src;
    vid.poster = poster;
    vid.crossOrigin = "anonymous";
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    // NOTE: `autoplay` is deliberately NOT set. The IntersectionObserver below
    // is the single authority for playback, so we start the element ourselves
    // and never let a stale `autoplay` attribute restart it while paused.

    const handleError = () => setHasError(true);
    vid.addEventListener("error", handleError);

    videoRef.current = vid;
    setVideoEl(vid);

    // Surface the element to React so the R3F scene mounts against it.
    const playPromise = vid.play();
    if (playPromise && typeof playPromise.catch === "function") {
      // A rejected autoplay promise is NOT a media failure: the browser may
      // refuse playback before metadata is decoded, and the IntersectionObserver
      // retries on the next intersection change. Only `error` events latch the
      // poster fallback, otherwise the hero silently dies to a black frame.
      playPromise.catch(() => {});
    }

    return () => {
      vid.removeEventListener("error", handleError);
      vid.pause();
      vid.removeAttribute("src");
      vid.load();
      videoRef.current = null;
      setVideoEl((current) => (current === vid ? null : current));
    };
  }, [src, poster, reduced]);

  // Load LUT texture
  useEffect(() => {
    if (reduced || !lutMap) return;

    const loader = new THREE.TextureLoader();
    let isMounted = true;

    loader.load(
      lutMap,
      (tex) => {
        if (!isMounted) {
          tex.dispose();
          return;
        }
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.flipY = false;
        setLutTexture(tex);
      },
      undefined,
      () => {
        if (isMounted) setMediaError(true);
      }
    );

    return () => {
      isMounted = false;
    };
  }, [lutMap, reduced]);

  // Clean up LUT texture on unmount
  useEffect(() => {
    return () => {
      lutTexture?.dispose();
    };
  }, [lutTexture]);

  const togglePause = () => {
    setUserPaused((prev) => !prev);
  };

  // `hasError` = raw media/network failure, `mediaError` = LUT texture could not
  // be decoded. A rejected autoplay promise is intentionally not treated as a
  // fatal condition here (see the video-mount effect).
  const isFallback = reduced || hasError || mediaError;

  const posterFallback = (
    <div
      className={cn(
        "hero-poster-static absolute inset-0 bg-cover bg-center overflow-hidden pointer-events-none",
        maskClass(mask),
        className
      )}
      style={{ backgroundImage: `url(${poster})`, backgroundPosition: objectPosition }}
      role="img"
      aria-label={ariaLabel}
    />
  );

  if (isFallback) {
    return (
      <div ref={containerRef} className="absolute inset-0 overflow-hidden">
        {posterFallback}
      </div>
    );
  }

  // Frameloop is gated: only runs when visible, not paused, and page active
  const frameloop = isIntersecting && !userPaused ? "always" : "never";

  return (
    <div
      ref={containerRef}
      className={cn("hero-canvas absolute inset-0 overflow-hidden", maskClass(mask), className)}
      style={{ backgroundImage: `url(${poster})`, backgroundPosition: objectPosition }}
    >
      <ErrorBoundary fallback={posterFallback}>
        <Canvas
          frameloop={frameloop}
          gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [0, 0, 1] }}
          className="w-full h-full"
        >
          {videoEl && lutTexture && (
            <LutScene
              video={videoEl}
              lutTexture={lutTexture}
              intensity={clampedIntensity}
              visibleRef={visibleRef}
            />
          )}
        </Canvas>
      </ErrorBoundary>

      <div className="absolute inset-0 bg-vignette-cinema pointer-events-none" />

      {showPauseControl && (
        <MotionToggle
          paused={userPaused}
          label={controlsLabel}
          onToggle={togglePause}
        />
      )}
    </div>
  );
}

function maskClass(mask: "radial" | "linear" | "none") {
  if (mask === "radial") {
    return "hero-mask-radial";
  }
  if (mask === "linear") {
    return "hero-mask-linear";
  }
  return "";
}

export default LutPipelineCanvas;
