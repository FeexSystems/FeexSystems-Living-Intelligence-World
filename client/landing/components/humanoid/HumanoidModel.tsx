import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import {
  GAZE_LIMITS,
  HUMANOID_MODEL,
  type HumanoidState,
} from "../../config/humanoid.config";

/**
 * HumanoidModel
 *
 * Loads the rigged glTF character with an imperative GLTFLoader (no suspense)
 * and drives it through the verified clip set via a single AnimationMixer.
 * Clip switching cross-fades; missing clips fall back to "Idle".
 *
 * Pointer gaze is applied ADDITIVELY after the mixer update inside the same
 * frame callback, so it layers on top of the playing clip. Gaze is clamped
 * to GAZE_LIMITS and disabled entirely when `clip` is null (the `disabled`
 * reduced-motion state).
 *
 * NOTE: the frame callback must stay at the default priority — a positive
 * priority subscriber prevents the R3F render loop from committing frames.
 */

interface HumanoidModelProps {
  /** Requested animation state from useHumanoidState. */
  state: HumanoidState;
  /** Resolved clip name (null = hold pose, no playback). */
  clip: string | null;
  /** Normalised pointer position, -1..1 on both axes. */
  pointer: { x: number; y: number };
  onLoaded?: () => void;
  onError?: (reason: string) => void;
}

interface LoadedGltf {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

function useGltfImperative(onLoaded?: () => void, onError?: (reason: string) => void) {
  const [gltf, setGltf] = useState<LoadedGltf | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.load(
      HUMANOID_MODEL.src,
      (result) => {
        if (cancelled) return;
        setGltf({ scene: result.scene, animations: result.animations });
        onLoaded?.();
      },
      undefined,
      () => {
        if (!cancelled) onError?.("GLB_LOAD_FAILED");
      }
    );
    return () => {
      cancelled = true;
    };
    // Load once per mount; the parent keeps callbacks stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return gltf;
}

function ModelInner({ state, clip, pointer, onLoaded, onError }: HumanoidModelProps) {
  const gltf = useGltfImperative(onLoaded, onError);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Map<string, THREE.AnimationAction>>(new Map());
  const headBonesRef = useRef<THREE.Object3D[]>([]);
  const glyphMatsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const gazeOffset = useRef({ yaw: 0, pitch: 0 });
  const currentClip = useRef<string | null>(null);
  const warnedClips = useRef<Set<string>>(new Set());

  const scene = gltf?.scene ?? null;

  // Normalise once: scale the character to the configured target height and
  // plant its feet on y=0.
  const { scale, groundOffset } = useMemo(() => {
    if (!scene) return { scale: 1, groundOffset: 0 };
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const raw = HUMANOID_MODEL.targetHeight / Math.max(size.y, 0.0001);
    const clamped = THREE.MathUtils.clamp(raw, 0.25, 8);
    return { scale: clamped, groundOffset: -box.min.y * clamped };
  }, [scene]);

  // Build mixer, actions and bone index once the GLB resolves.
  useEffect(() => {
    if (!gltf || !scene) return;
    const mixer = new THREE.AnimationMixer(scene);
    mixerRef.current = mixer;
    const actions = new Map<string, THREE.AnimationAction>();
    for (const clipDef of gltf.animations) {
      actions.set(clipDef.name, mixer.clipAction(clipDef));
    }
    actionsRef.current = actions;

    const bones: THREE.Object3D[] = [];
    const glyphMats: THREE.MeshStandardMaterial[] = [];
    scene.traverse((object) => {
      if ((object as THREE.Bone).isBone && object.name === "Head") {
        bones.push(object);
      }
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          if (mat && mat.name === "GlyphAccent" && !glyphMats.includes(mat as THREE.MeshStandardMaterial)) {
            glyphMats.push(mat as THREE.MeshStandardMaterial);
          }
        }
      }
    });
    headBonesRef.current = bones;
    glyphMatsRef.current = glyphMats;
    currentClip.current = null;

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
      mixerRef.current = null;
      actionsRef.current = new Map();
      glyphMatsRef.current = [];
    };
  }, [gltf, scene]);

  // Drive the mixer + clip cross-fade every frame, then layer additive gaze.
  useFrame((frame, delta) => {
    const mixer = mixerRef.current;
    if (!mixer || !scene) return;

    const resolved = clip && actionsRef.current.has(clip) ? clip : clip ? "Idle" : null;
    if (
      import.meta.env?.DEV &&
      clip &&
      clip !== "Idle" &&
      !actionsRef.current.has(clip) &&
      !warnedClips.current.has(clip)
    ) {
      warnedClips.current.add(clip);
      console.warn(`[humanoid] clip "${clip}" missing from GLB — falling back to Idle`);
    }
    if (resolved !== currentClip.current) {
      const prev = currentClip.current ? actionsRef.current.get(currentClip.current) : null;
      const next = resolved ? actionsRef.current.get(resolved) : null;
      if (prev && next !== prev) prev.fadeOut(0.25);
      if (next) {
        next.reset().fadeIn(0.25).play();
      } else {
        actionsRef.current.forEach((action) => action.fadeOut(0.25));
      }
      currentClip.current = resolved;
    }
    mixer.update(delta);

    // Additive head gaze after the mixer has posed the skeleton. Disabled
    // when clip is null so the reduced-motion `disabled` state holds a
    // neutral pose with no pointer reaction.
    const gazeEnabled = clip !== null;
    const targetYaw = gazeEnabled ? pointer.x * GAZE_LIMITS.yaw : 0;
    const targetPitch = gazeEnabled ? -pointer.y * GAZE_LIMITS.pitch : 0;
    gazeOffset.current.yaw = THREE.MathUtils.damp(
      gazeOffset.current.yaw,
      targetYaw,
      GAZE_LIMITS.damping,
      delta
    );
    gazeOffset.current.pitch = THREE.MathUtils.damp(
      gazeOffset.current.pitch,
      targetPitch,
      GAZE_LIMITS.damping,
      delta
    );
    for (const bone of headBonesRef.current) {
      bone.rotation.y += gazeOffset.current.yaw;
      bone.rotation.x += gazeOffset.current.pitch;
    }

    // Glyph "presence" pulse — the synthetic expression system. Slow sine
    // (~0.35 Hz, well under photosensitive thresholds); boosted while a
    // one-shot state plays and dimmed when the projection is disabled.
    const glyphBase = 3.0;
    const boost = state === "welcome" || state === "explain" ? 1.7 : 1.0;
    const target = clip === null ? glyphBase * 0.15 : glyphBase * boost;
    const pulse = clip === null ? 0 : Math.sin(frame.clock.elapsedTime * 2.2) * 0.55;
    for (const mat of glyphMatsRef.current) {
      mat.emissiveIntensity = THREE.MathUtils.damp(
        mat.emissiveIntensity ?? glyphBase,
        target + pulse,
        5,
        delta
      );
    }
  });

  if (!scene) return null;

  return (
    <group
      position={HUMANOID_MODEL.position}
      rotation={[0, HUMANOID_MODEL.rotationY, 0]}
    >
      <group scale={scale} position={[0, groundOffset, 0]}>
        {/* eslint-disable-next-line react/no-unknown-property -- primitive is the R3F intrinsic for raw three objects */}
        <primitive object={scene} />
      </group>
    </group>
  );
}

export function HumanoidModel(props: HumanoidModelProps) {
  return <ModelInner {...props} />;
}
