import React, { useRef, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import {
  createMockBlendshapeStream,
  MOCK_EXPRESSION_FRAMES,
  NEUTRAL_BLENDSHAPES,
  categoriesToWeights,
} from './fixtures/mockArkitBlendshapes';
import { FeexSovereignPlaceholder } from './FeexSovereignPlaceholder';
import { resolveMorphIndices } from './arkitMorphMapper';

// Explicit structural string tracking array mapping directly to our Stage 01 layout
const ARKIT_MAP = [
  "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft", "browOuterUpRight",
  "cheekPuff", "cheekSquintLeft", "cheekSquintRight", "eyeBlinkLeft", "eyeBlinkRight",
  "eyeLookDownLeft", "eyeLookDownRight", "eyeLookInLeft", "eyeLookInRight", "eyeLookOutLeft",
  "eyeLookOutRight", "eyeLookUpLeft", "eyeLookUpRight", "eyeSquintLeft", "eyeSquintRight",
  "jawForward", "jawLeft", "jawOpen", "jawRight", "mouthClose", "mouthDimpleLeft",
  "mouthDimpleRight", "mouthFrownLeft", "mouthFrownRight", "mouthFunnel", "mouthLeft",
  "mouthLowerDownLeft", "mouthLowerDownRight", "mouthPressLeft", "mouthPressRight",
  "mouthPucker", "mouthRight", "mouthRollLower", "mouthRollUpper", "mouthShrugLower",
  "mouthShrugUpper", "mouthSmileLeft", "mouthSmileRight", "mouthStretchLeft", "mouthStretchRight",
  "mouthUpperUpLeft", "mouthUpperUpRight", "noseSneerLeft", "noseSquintRight", "tongueOut"
];

const FACE_LANDMARKER_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

function InteractiveSovereignMesh({ weightsRef, trackingActive }) {
  const group = useRef();
  const { scene } = useGLTF('/characters/feex_sovereign/feex_sovereign.glb');
  const faceMeshRef = useRef(null);

  // Locate the morph-target face mesh once the scene resolves
  useEffect(() => {
    let faceMesh = null;
    scene.traverse((child) => {
      if (!faceMesh && child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
        faceMesh = child;
      }
    });
    faceMeshRef.current = faceMesh;

    // Enforce material configurations down across child geometries
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (child.material.name.includes('SyntheticSkin')) {
            child.material.roughness = 0.42;
            child.material.metalness = 0.08;
          }
          if (child.material.name.includes('Obsidian') || child.material.name.includes('Honeycomb')) {
            child.material.roughness = 0.12;
            child.material.metalness = 0.95;
            child.material.clearcoat = 1.0;
          }
        }
      }
    });
  }, [scene]);

  // Build ARKit-name -> morph-target-index map once per mesh. Handles exact
  // ARKit names and ARK_Pose_XX ordinal keys via the cached resolver.
  const morphIndexMap = useRef(null);
  useEffect(() => {
    const mesh = faceMeshRef.current;
    if (!mesh) return;
    morphIndexMap.current = resolveMorphIndices(mesh.morphTargetDictionary, ARKIT_MAP);
  }, [scene]);

  // Frame processing execution loop mapping MediaPipe inputs onto mesh influences
  useFrame(() => {
    const mesh = faceMeshRef.current;
    const map = morphIndexMap.current;
    if (!mesh || !map || !mesh.morphTargetInfluences) return;

    if (trackingActive && weightsRef.current) {
      ARKIT_MAP.forEach((shapeName) => {
        const targetIdx = map[shapeName];
        if (targetIdx !== undefined) {
          const inputWeight = weightsRef.current[shapeName] || 0;
          // Apply a gentle exponential dampening filter to filter out raw camera jitter
          mesh.morphTargetInfluences[targetIdx] = THREE.MathUtils.lerp(
            mesh.morphTargetInfluences[targetIdx],
            inputWeight,
            0.25
          );
        }
      });
    }
  });

  return <primitive ref={group} object={scene} position={[0, -0.85, 0]} dispose={null} />;
}

export default function FeexLiveCaptureView({ usePlaceholder = import.meta.env.VITE_FEEX_PLACEHOLDER === 'true' }) {
  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const weightsRef = useRef({});
  const [trackingActive, setTrackingActive] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [useMockFixture, setUseMockFixture] = useState(false);
  const [activeMockExpr, setActiveMockExpr] = useState('none');
  const mockOverrideRef = useRef(false);

  // Mock feed runs when manually toggled or when camera capture is unavailable
  const mockActive = useMockFixture || (cameraError !== null && !trackingActive);
  mockOverrideRef.current = mockActive;

  useEffect(() => {
    if (!mockActive) {
      setActiveMockExpr('none');
      weightsRef.current = categoriesToWeights(NEUTRAL_BLENDSHAPES);
      return;
    }

    const stopStream = createMockBlendshapeStream(
      MOCK_EXPRESSION_FRAMES,
      (categories, exprName) => {
        weightsRef.current = categoriesToWeights(categories);
        setActiveMockExpr(exprName);
      }
    );

    return () => {
      stopStream();
    };
  }, [mockActive]);

  useEffect(() => {
    let cancelled = false;
    let animationFrameId;

    async function initMediaPipeTracking() {
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const { FilesetResolver, FaceLandmarker } = vision;

        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net'
        );

        const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: FACE_LANDMARKER_MODEL,
            delegate: 'GPU'
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1
        });

        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setModelLoaded(true);
      } catch (err) {
        console.error('MediaPipe vision matrix initialization failure:', err);
        setCameraError('Vision backend failed to load.');
      }
    }

    initMediaPipeTracking();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameId);
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  const predictLoop = () => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !landmarker || video.paused || video.ended) return;

    if (video.currentTime !== lastVideoTimeRef.current && !mockOverrideRef.current) {
      lastVideoTimeRef.current = video.currentTime;
      try {
        const result = landmarker.detectForVideo(video, performance.now());
        const blendshapes = result.faceBlendshapes?.[0]?.categories;
        if (blendshapes) {
          const weights = {};
          blendshapes.forEach((cat) => {
            weights[cat.categoryName] = cat.score;
          });
          weightsRef.current = weights;
        }
      } catch (err) {
        console.error('Face landmarker prediction fault:', err);
      }
    }

    requestAnimationFrame(predictLoop);
  };

  const lastVideoTimeRef = useRef(-1);

  const startLiveCapture = async () => {
    if (!videoRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener('loadeddata', predictLoop, { once: false });
      setTrackingActive(true);
    } catch (err) {
      console.error('Camera access verification failure:', err);
      setCameraError('Camera access denied or unavailable.');
    }
  };

  return (
    <div className="relative w-full h-screen bg-[#08080a] flex flex-col items-center justify-center">
      <div className="absolute top-4 left-4 z-10 flex gap-4 items-center">
        <button
          onClick={startLiveCapture}
          disabled={!modelLoaded || trackingActive}
          className="px-6 py-2 bg-white text-black font-semibold rounded hover:bg-slate-200 disabled:opacity-50 transition-all"
        >
          {trackingActive ? 'Tracking Live' : 'Enable Face Match Live'}
        </button>
        <button
          onClick={() => setUseMockFixture((v) => !v)}
          className={`px-6 py-2 font-semibold rounded border transition-all ${
            useMockFixture
              ? 'bg-amber-400 text-black border-amber-300'
              : 'bg-transparent text-slate-300 border-slate-600 hover:border-slate-400'
          }`}
        >
          {useMockFixture ? 'Mock Feed: ON' : 'Mock Feed'}
        </button>
        <span className="text-sm text-slate-400">
          {!modelLoaded
            ? 'Loading vision matrices...'
            : cameraError || `System status: Ready${mockActive ? ` · mock:${activeMockExpr}` : ''}`}
        </span>
      </div>

      {/* Hidden processing element mapping camera feeds onto local viewports */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute bottom-4 right-4 w-40 h-30 rounded border border-slate-800 object-cover transform scale-x-[-1] z-10 opacity-70"
      />

      <div className="w-full h-full">
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
          camera={{ position: [0, 1.2, 2.0], fov: 32 }}
        >
          <color attach="background" args={['#08080a']} />
          <ambientLight intensity={0.2} color="#ffffff" />
          <directionalLight position={[5, 5, 4]} intensity={2.0} color="#f0f4f8" castShadow />
          <directionalLight position={[-4, 2, -2]} intensity={1.5} color="#d2daf0" />

          <Suspense fallback={null}>
            <Stage intensity={0.4} environment="studio" shadows="contact" adjustCamera={false}>
              {usePlaceholder ? (
                <FeexSovereignPlaceholder blendshapeWeightsRef={weightsRef} />
              ) : (
                <InteractiveSovereignMesh weightsRef={weightsRef} trackingActive={trackingActive || mockActive} />
              )}
            </Stage>
            <Environment preset="neutral" intensity={0.2} />
          </Suspense>

          <OrbitControls
            enablePan={false}
            minDistance={1.2}
            maxDistance={3.0}
            minPolarAngle={Math.PI / 2.4}
            maxPolarAngle={Math.PI / 1.7}
          />
        </Canvas>
      </div>
    </div>
  );
}

useGLTF.preload('/characters/feex_sovereign/feex_sovereign.glb');
