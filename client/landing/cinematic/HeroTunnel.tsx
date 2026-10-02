import React, { useRef, useEffect } from "react";
import * as THREE from "three";

export interface HeroTunnelProps {
  isDarkMode?: boolean;
  transparent?: boolean;
  opacity?: number;
  tunnelSpeed?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function HeroTunnel({
  isDarkMode = true,
  transparent = true,
  opacity = 1,
  tunnelSpeed = 0.045,
  className = "",
  style = {},
}: HeroTunnelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const scrollPosRef = useRef<number>(0);

  const TUNNEL_WIDTH = 22;
  const TUNNEL_HEIGHT = 14;
  const SEGMENT_DEPTH = 8;
  const NUM_SEGMENTS = 8;
  const FLOOR_COLS = 5;
  const WALL_ROWS = 3;
  const COL_WIDTH = TUNNEL_WIDTH / FLOOR_COLS;
  const ROW_HEIGHT = TUNNEL_HEIGHT / WALL_ROWS;

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let frameId: number;
    let isVisible = true;
    let isContextLost = false;
    const cleanupFns: (() => void)[] = [];
    const segments: THREE.Group[] = [];

    // Shared geometry and materials to avoid texture allocation leaks
    const sharedGeometries: THREE.BufferGeometry[] = [];
    const sharedMaterials: THREE.Material[] = [];

    try {
      const scene = new THREE.Scene();
      if (!transparent) {
        scene.background = new THREE.Color(isDarkMode ? 0x050505 : 0xffffff);
      }
      scene.fog = new THREE.FogExp2(
        isDarkMode ? 0x000000 : 0xffffff,
        transparent ? 0.02 : 0.03
      );

      const width = containerRef.current.clientWidth || window.innerWidth;
      const height = containerRef.current.clientHeight || window.innerHeight;

      const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 800);
      camera.position.set(0, 0, 0);
      cameraRef.current = camera;

      renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: false, // Low memory footprint, prevents D3D11 Texture2D allocation spikes
        alpha: transparent,
        powerPreference: "default",
        precision: "mediump",
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      rendererRef.current = renderer;

      // Handle WebGL context lost gracefully (prevent unhandled browser crashes)
      const onContextLost = (e: Event) => {
        e.preventDefault();
        isContextLost = true;
        cancelAnimationFrame(frameId);
        console.warn("[HeroTunnel] WebGL Context Lost gracefully handled.");
      };

      const onContextRestored = () => {
        isContextLost = false;
        console.log("[HeroTunnel] WebGL Context Restored.");
      };

      const canvasEl = canvasRef.current;
      canvasEl.addEventListener("webglcontextlost", onContextLost, false);
      canvasEl.addEventListener("webglcontextrestored", onContextRestored, false);
      cleanupFns.push(() => {
        canvasEl.removeEventListener("webglcontextlost", onContextLost);
        canvasEl.removeEventListener("webglcontextrestored", onContextRestored);
      });

      // Wireframe line material
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: isDarkMode ? 0.2 : 0.35,
      });
      sharedMaterials.push(lineMaterial);

      // Procedural architectural data slab material (zero dynamic textures)
      const slabMaterial = new THREE.MeshBasicMaterial({
        color: isDarkMode ? 0x161618 : 0xeeeeee,
        transparent: true,
        opacity: isDarkMode ? 0.35 : 0.25,
        side: THREE.DoubleSide,
      });
      sharedMaterials.push(slabMaterial);

      const slabEdgeMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.18,
      });
      sharedMaterials.push(slabEdgeMaterial);

      // Shared slab plane geometry
      const slabGeom = new THREE.PlaneGeometry(COL_WIDTH - 0.5, SEGMENT_DEPTH - 0.5);
      sharedGeometries.push(slabGeom);

      const slabEdgesGeom = new THREE.EdgesGeometry(slabGeom);
      sharedGeometries.push(slabEdgesGeom);

      const createSegment = (zPos: number) => {
        const group = new THREE.Group();
        group.position.z = zPos;
        const w = TUNNEL_WIDTH / 2;
        const h = TUNNEL_HEIGHT / 2;
        const d = SEGMENT_DEPTH;

        const vertices: number[] = [];
        for (let i = 0; i <= FLOOR_COLS; i++) {
          const x = -w + i * COL_WIDTH;
          vertices.push(x, -h, 0, x, -h, -d);
          vertices.push(x, h, 0, x, h, -d);
        }
        for (let i = 1; i < WALL_ROWS; i++) {
          const y = -h + i * ROW_HEIGHT;
          vertices.push(-w, y, 0, -w, y, -d);
          vertices.push(w, y, 0, w, y, -d);
        }
        vertices.push(-w, -h, 0, w, -h, 0);
        vertices.push(-w, h, 0, w, h, 0);
        vertices.push(-w, -h, 0, -w, h, 0);
        vertices.push(w, -h, 0, w, h, 0);

        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
        sharedGeometries.push(lineGeo);

        const lines = new THREE.LineSegments(lineGeo, lineMaterial);
        group.add(lines);

        // Add static architectural slabs (reused across loop, zero texture allocations)
        for (let i = 0; i < FLOOR_COLS; i++) {
          if ((i + Math.abs(zPos / SEGMENT_DEPTH)) % 3 === 0) {
            const slab = new THREE.Mesh(slabGeom, slabMaterial);
            slab.position.set(-w + i * COL_WIDTH + COL_WIDTH / 2, -h, -d / 2);
            slab.rotation.set(-Math.PI / 2, 0, 0);

            const slabWire = new THREE.LineSegments(slabEdgesGeom, slabEdgeMaterial);
            slab.add(slabWire);
            group.add(slab);
          }
        }

        return group;
      };

      for (let i = 0; i < NUM_SEGMENTS; i++) {
        const z = -i * SEGMENT_DEPTH;
        const segment = createSegment(z);
        scene.add(segment);
        segments.push(segment);
      }

      const tunnelLength = NUM_SEGMENTS * SEGMENT_DEPTH;

      const animate = () => {
        if (!isVisible || isContextLost) return;
        frameId = requestAnimationFrame(animate);

        if (!cameraRef.current || !rendererRef.current) return;
        const glCtx = rendererRef.current.getContext();
        if (!glCtx || glCtx.isContextLost()) return;

        // Smooth scroll interpolation
        const targetZ = -scrollPosRef.current * tunnelSpeed;
        const currentZ = cameraRef.current.position.z;
        cameraRef.current.position.z += (targetZ - currentZ) * 0.1;

        const camZ = cameraRef.current.position.z;

        // Recycle segments efficiently WITHOUT memory allocations or mesh reconstruction
        segments.forEach((segment) => {
          if (segment.position.z > camZ + SEGMENT_DEPTH) {
            let minZ = 0;
            segments.forEach((s) => (minZ = Math.min(minZ, s.position.z)));
            segment.position.z = minZ - SEGMENT_DEPTH;
          } else if (segment.position.z < camZ - tunnelLength - SEGMENT_DEPTH) {
            let maxZ = -999999;
            segments.forEach((s) => (maxZ = Math.max(maxZ, s.position.z)));
            segment.position.z = maxZ + SEGMENT_DEPTH;
          }
        });

        try {
          rendererRef.current.render(scene, cameraRef.current);
        } catch {
          // Catch and absorb any render frame errors
        }
      };

      const observer = new IntersectionObserver(
        ([entry]) => {
          isVisible = entry.isIntersecting;
          if (isVisible && !isContextLost) {
            cancelAnimationFrame(frameId);
            animate();
          } else {
            cancelAnimationFrame(frameId);
          }
        },
        { threshold: 0.05 }
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      const onScroll = () => {
        scrollPosRef.current = window.scrollY || document.documentElement.scrollTop;
      };

      window.addEventListener("scroll", onScroll, { passive: true });

      const handleResize = () => {
        if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
        const w = containerRef.current.clientWidth || window.innerWidth;
        const h = containerRef.current.clientHeight || window.innerHeight;
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      };

      window.addEventListener("resize", handleResize);

      // Start animation loop
      animate();

      cleanupFns.push(() => {
        observer.disconnect();
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(frameId);

        // Dispose geometries and materials cleanly
        sharedGeometries.forEach((g) => g.dispose());
        sharedMaterials.forEach((m) => m.dispose());

        segments.forEach((seg) => {
          scene.remove(seg);
        });

        if (renderer) {
          try {
            renderer.dispose();
            renderer.forceContextLoss();
          } catch {}
        }
      });
    } catch (err) {
      console.warn("[HeroTunnel] WebGL initialization failed, skipping 3D tunnel:", err);
      if (renderer) {
        try { renderer.dispose(); } catch {}
      }
    }

    return () => {
      isVisible = false;
      cleanupFns.forEach((fn) => fn());
    };
  }, [isDarkMode, transparent, tunnelSpeed]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{
        opacity,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block pointer-events-none"
      />
    </div>
  );
}

export { HeroTunnel as InfiniteScrollTunnel };
export default HeroTunnel;
