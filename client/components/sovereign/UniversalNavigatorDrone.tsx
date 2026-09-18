import React, { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useSphere } from "@react-three/cannon";
import * as THREE from "three";
import { sonikAudio } from "../../lib/sonikAudio";

export interface UniversalNavigatorDroneProps {
  joystickVector?: THREE.Vector2;
  onHit?: (msg: string) => void;
}

export function UniversalNavigatorDrone({
  joystickVector = new THREE.Vector2(0, 0),
  onHit,
}: UniversalNavigatorDroneProps) {
  const velocityRef = useRef<[number, number, number]>([0, 0, 0]);

  const [ref, api] = useSphere(() => ({
    mass: 2.0,
    position: [0, 0.5, 0],
    args: [0.4],
    linearDamping: 0.55,
    angularDamping: 0.4,
    onCollide: (e) => {
      const v = velocityRef.current;
      const speed = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
      sonikAudio.playNodeImpact(0, Math.min(2.0, speed));
      sonikAudio.triggerHaptic(20);
      if (onHit && e.body) {
        onHit("Tactile Collision: Sensor mesh impact registered");
      }
    },
  }));

  useEffect(() => {
    if (api?.velocity && typeof (api.velocity as any).subscribe === "function") {
      const unsub = (api.velocity as any).subscribe((v: [number, number, number]) => {
        velocityRef.current = v;
      });
      return () => {
        unsub();
        sonikAudio.updateProbeEngine(0, 0);
      };
    }
  }, [api]);

  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    arrowup: false,
    arrowdown: false,
    arrowleft: false,
    arrowright: false,
  });

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k in keys.current) {
        if (!keys.current[k as keyof typeof keys.current]) {
          sonikAudio.playCyberClick(1.1);
          sonikAudio.triggerHaptic(8);
        }
        keys.current[k as keyof typeof keys.current] = true;
      }
    };
    const handleUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k in keys.current) {
        keys.current[k as keyof typeof keys.current] = false;
      }
    };
    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
    };
  }, []);

  useFrame(() => {
    const impulseForce = new THREE.Vector3(0, 0, 0);
    const accelerationMultiplier = 16.0;

    // Keyboard Vector Processing (WASD & Arrows)
    if (keys.current.w || keys.current.arrowup) impulseForce.z -= accelerationMultiplier;
    if (keys.current.s || keys.current.arrowdown) impulseForce.z += accelerationMultiplier;
    if (keys.current.a || keys.current.arrowleft) impulseForce.x -= accelerationMultiplier;
    if (keys.current.d || keys.current.arrowright) impulseForce.x += accelerationMultiplier;

    // Concurrent Native Mobile/Touch Joystick Vector Application
    if (joystickVector && joystickVector.lengthSq() > 0) {
      impulseForce.x += joystickVector.x * accelerationMultiplier;
      impulseForce.z -= joystickVector.y * accelerationMultiplier;
    }

    api.applyForce([impulseForce.x, impulseForce.y, impulseForce.z], [0, 0, 0]);

    // Modulate real-time DSP engine drone frequency & amplitude based on current thrust & velocity
    const thrustAmount = Math.min(1.0, impulseForce.length() / accelerationMultiplier);
    const v = velocityRef.current;
    const speed = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    sonikAudio.updateProbeEngine(thrustAmount, speed);
  });

  return (
    <group ref={ref as any}>
      {/* Core Drone Orb - Monochrome Obsidian */}
      <mesh>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshPhysicalMaterial
          color="#050508"
          roughness={0.03}
          metalness={0.98}
          clearcoat={1.0}
          clearcoatRoughness={0.01}
          reflectivity={1.0}
        />
      </mesh>

      {/* Cybernetic Wireframe Lattice Housing */}
      <mesh>
        <sphereGeometry args={[0.43, 16, 16]} />
        <meshBasicMaterial
          color="#00f0ff"
          wireframe
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Sensor Beacon Core */}
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#00f0ff"
          emissiveIntensity={4.0}
        />
      </mesh>

      {/* Dynamic Sensor Point Light */}
      <pointLight intensity={3.5} distance={8} color="#00f0ff" decay={2} />
    </group>
  );
}

export default UniversalNavigatorDrone;
