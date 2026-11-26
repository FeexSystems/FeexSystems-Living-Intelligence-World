import { useMemo } from "react";
import * as THREE from "three";
import { FEEX_NOIR } from "../../../landing/config/noir";
import { LAB_ZONES, zoneCenterToScene, type LabZone } from "../../../lib/lab/lab-zones";
import type { LabHotspot } from "../../../lib/lab/lab-contracts";

/**
 * LabZoneSet — per-zone furniture, signature equipment silhouettes, and
 * interaction hotspot markers. Procedural greybox mirroring
 * build_feex_sorl_zones.py; swapped for GLB chunks via lab-manifest later.
 */

function B({ p, s, c, m = 0.1, r = 0.85, e, ei = 0 }: {
  p: [number, number, number]; s: [number, number, number]; c: string;
  m?: number; r?: number; e?: string; ei?: number;
}) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={r} metalness={m}
        emissive={e ?? "#000"} emissiveIntensity={ei} />
    </mesh>
  );
}

function Workstation({ x, z, rotY }: { x: number; z: number; rotY: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <B p={[0, 0.74, 0]} s={[1.6, 0.06, 0.8]} c={FEEX_NOIR.panel} />
      <B p={[-0.7, 0.37, 0]} s={[0.08, 0.74, 0.7]} c={FEEX_NOIR.graphite} m={0.4} r={0.7} />
      <B p={[0.7, 0.37, 0]} s={[0.08, 0.74, 0.7]} c={FEEX_NOIR.graphite} m={0.4} r={0.7} />
      <B p={[0, 1.15, -0.28]} s={[0.55, 0.35, 0.05]} c={FEEX_NOIR.graphite} m={0.4} r={0.7} />
      <B p={[0, 0.95, -0.28]} s={[0.06, 0.4, 0.06]} c={FEEX_NOIR.graphite} m={0.4} r={0.7} />
      <B p={[0, 1.15, -0.315]} s={[0.48, 0.28, 0.01]} c={FEEX_NOIR.signal} e={FEEX_NOIR.signal} ei={0.9} />
      <B p={[0, 0.48, 0.55]} s={[0.5, 0.08, 0.5]} c={FEEX_NOIR.graphite} m={0.4} r={0.7} />
      <B p={[0, 0.85, 0.78]} s={[0.5, 0.6, 0.08]} c={FEEX_NOIR.graphite} m={0.4} r={0.7} />
    </group>
  );
}

function SignatureEquipment({ zone }: { zone: LabZone }) {
  const [cx, cz] = zoneCenterToScene(zone.center);
  const [, zd] = zone.size;
  // "back" edge = away from atrium
  const backZ = cz < 0 ? cz - zd / 2 : cz + zd / 2;
  const innerZ = cz < 0 ? cz + zd / 2 : cz - zd / 2;

  switch (zone.signature) {
    case "command_wall": {
      // 3-wall screen array on back wall + console desk
      return (
        <group>
          {[-2.4, 0, 2.4].map((dx) => (
            <group key={dx} position={[cx + dx, 0, backZ]}>
              <B p={[0, 2.6, 0]} s={[2.2, 1.4, 0.12]} c={FEEX_NOIR.graphite} m={0.4} r={0.7} />
              <B p={[0, 2.6, cz < 0 ? 0.08 : -0.08]} s={[2.0, 1.2, 0.02]} c={FEEX_NOIR.signal} e={FEEX_NOIR.signal} ei={1.4} />
            </group>
          ))}
          {/* Console desk just inside the atrium-facing edge */}
          <B p={[cx, 0.5, innerZ + (cz < 0 ? 1.2 : -1.2)]} s={[5, 1, 0.9]} c={FEEX_NOIR.panel} />
        </group>
      );
    }
    case "turntable": {
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.08, 0]}>
            <cylinderGeometry args={[1.5, 1.5, 0.16, 48]} />
            <meshStandardMaterial color={FEEX_NOIR.steel} metalness={0.85} roughness={0.38} />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[1.3, 1.3, 0.06, 48]} />
            <meshStandardMaterial color={FEEX_NOIR.graphite} metalness={0.4} roughness={0.7} />
          </mesh>
          <mesh position={[0, H - 1.2, 0]}>
            <cylinderGeometry args={[2.2, 2.2, 0.08, 48]} />
            <meshStandardMaterial color={FEEX_NOIR.signal} emissive={FEEX_NOIR.signal} emissiveIntensity={1.6} />
          </mesh>
          <B p={[0, H / 2, backZ - cz]} s={[6, H - 0.5, 0.15]} c={FEEX_NOIR.panel} />
        </group>
      );
    }
    case "server_rack": {
      return (
        <group>
          {Array.from({ length: 4 }, (_, i) => (
            <group key={i} position={[cx - 3.3 + i * 2.2, 0, backZ]}>
              <B p={[0, 1.1, 0]} s={[0.9, 2.2, 0.7]} c={FEEX_NOIR.graphite} m={0.4} r={0.7} />
              <B p={[0, 1.6, cz < 0 ? 0.36 : -0.36]} s={[0.7, 0.04, 0.02]} c={FEEX_NOIR.signal} e={FEEX_NOIR.signal} ei={0.8} />
            </group>
          ))}
          <mesh position={[cx, 0.6, innerZ]}>
            <cylinderGeometry args={[0.5, 0.5, 1.2, 24]} />
            <meshStandardMaterial color={FEEX_NOIR.steel} metalness={0.85} roughness={0.38} />
          </mesh>
          <mesh position={[cx, 2.0, innerZ]}>
            <cylinderGeometry args={[0.45, 0.45, 0.9, 24]} />
            <meshStandardMaterial color={FEEX_NOIR.signal} emissive={FEEX_NOIR.signal} emissiveIntensity={1.2} transparent opacity={0.7} />
          </mesh>
        </group>
      );
    }
    case "sim_ring": {
      return (
        <group position={[cx, 0, cz]}>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.4, 2.6, 64]} />
            <meshStandardMaterial color={FEEX_NOIR.signal} emissive={FEEX_NOIR.signal} emissiveIntensity={1.4} side={THREE.DoubleSide} />
          </mesh>
          {[0, 1, 2].map((i) => {
            const a = (i * 120 * Math.PI) / 180;
            return (
              <group key={i} position={[2 * Math.cos(a), 0, 2 * Math.sin(a)]}>
                <mesh position={[0, 1.5, 0]}>
                  <cylinderGeometry args={[0.06, 0.06, 3, 12]} />
                  <meshStandardMaterial color={FEEX_NOIR.steel} metalness={0.85} roughness={0.38} />
                </mesh>
                <B p={[0, 3.0, 0]} s={[0.3, 0.2, 0.3]} c={FEEX_NOIR.graphite} m={0.4} r={0.7} />
              </group>
            );
          })}
        </group>
      );
    }
    case "culture_racks": {
      return (
        <group>
          {[0, 1, 2].map((t) => (
            <group key={t}>
              <B p={[cx - 0.35, 0.6 + t * 0.7, backZ]} s={[4.5, 0.08, 0.6]} c={FEEX_NOIR.panel} />
              {Array.from({ length: 6 }, (_, s) => (
                <mesh key={s} position={[cx - 4 + s * 0.8, 0.75 + t * 0.7, backZ]}>
                  <cylinderGeometry args={[0.07, 0.07, 0.25, 12]} />
                  <meshStandardMaterial color={FEEX_NOIR.steel} metalness={0.85} roughness={0.38} />
                </mesh>
              ))}
            </group>
          ))}
          <B p={[cx, 0.45, innerZ]} s={[1, 0.9, 1]} c={FEEX_NOIR.panel} />
        </group>
      );
    }
    case "fab_bench": {
      return (
        <group>
          <B p={[cx - 1.5, 0.5, innerZ]} s={[4, 1, 1.2]} c={FEEX_NOIR.panel} />
          <B p={[cx - 1.5, 2.6, innerZ - (cz < 0 ? 1.7 : -1.7)]} s={[5, 0.4, 0.4]} c={FEEX_NOIR.steel} m={0.85} r={0.38} />
          {[0, 1, 2].map((i) => (
            <B key={i} p={[cx + 2.5, 1.0, innerZ + (cz < 0 ? 0.7 : -0.7) + i * (cz < 0 ? -1.4 : 1.4)]} s={[2.2, 2, 0.5]} c={FEEX_NOIR.graphite} m={0.4} r={0.7} />
          ))}
        </group>
      );
    }
    case "observation_deck": {
      // Evidence wall panels on the back wall + glass railing at the
      // atrium edge + deck edge light — the gallery overlooks the lab.
      const railZ = innerZ + (cz < 0 ? 0.15 : -0.15);
      return (
        <group>
          {[-8, -4, 0, 4, 8].map((dx) => (
            <group key={dx} position={[cx + dx, 0, backZ]}>
              <B p={[0, 2.4, 0]} s={[3.2, 1.9, 0.14]} c={FEEX_NOIR.graphite} m={0.4} r={0.7} />
              <B p={[0, 2.4, cz < 0 ? 0.09 : -0.09]} s={[3.0, 1.7, 0.02]} c={FEEX_NOIR.signal} e={FEEX_NOIR.signal} ei={1.1} />
            </group>
          ))}
          {/* Glass railing along the atrium-facing edge */}
          <mesh position={[cx, 1.1, railZ]}>
            <boxGeometry args={[Math.min(zone.size[0] - 2, 22), 1.1, 0.06]} />
            <meshStandardMaterial color="#8c99a3" transparent opacity={0.18} roughness={0.12} metalness={0.1} />
          </mesh>
          <B p={[cx, 0.08, railZ]} s={[Math.min(zone.size[0] - 2, 22), 0.16, 0.3]} c={FEEX_NOIR.steel} m={0.85} r={0.38} />
          {/* Deck edge light strip */}
          <B p={[cx, 0.02, innerZ + (cz < 0 ? -0.4 : 0.4)]} s={[Math.min(zone.size[0] - 4, 20), 0.02, 0.12]} c={FEEX_NOIR.signal} e={FEEX_NOIR.signal} ei={0.9} />
        </group>
      );
    }
    default:
      return null;
  }
}

const H = 5.5;

export function LabZoneSet({
  onHotspotClick,
}: {
  onHotspotClick?: (hotspot: LabHotspot) => void;
}) {
  const hotspots = useMemo<LabHotspot[]>(() => {
    return LAB_ZONES.map((z) => {
      const [cx, cz] = zoneCenterToScene(z.center);
      const [, zd] = z.size;
      const hz = cz < 0 ? cz + zd / 4 : cz - zd / 4;
      return {
        id: `hotspot-${z.id}`,
        zoneId: z.id,
        kind: "navigate",
        position: [cx, 1.4, hz] as const,
        label: z.name,
      };
    });
  }, []);

  return (
    <group name="sorl-lab-zones">
      {LAB_ZONES.map((z) => {
        const [cx, cz] = zoneCenterToScene(z.center);
        const [wx] = z.size;
        // workstations flanking centre toward atrium edge
        const wsZ = cz < 0 ? cz + z.size[1] / 2 - 1.6 : cz - z.size[1] / 2 + 1.6;
        return (
          <group key={z.id}>
            <Workstation x={cx - wx / 4} z={wsZ} rotY={z.faceDeg * Math.PI / 180 + Math.PI} />
            <Workstation x={cx + wx / 4} z={wsZ} rotY={z.faceDeg * Math.PI / 180 + Math.PI} />
            <SignatureEquipment zone={z} />
          </group>
        );
      })}

      {/* Hotspot beacons — emissive rings at zone interaction points */}
      {hotspots.map((h) => (
        <group key={h.id} position={[h.position[0], 0, h.position[2]]}>
          <mesh
            position={[0, 0.03, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onHotspotClick?.(h);
            }}
          >
            <ringGeometry args={[0.55, 0.7, 32]} />
            <meshStandardMaterial
              color={FEEX_NOIR.signal}
              emissive={FEEX_NOIR.signal}
              emissiveIntensity={2.2}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, h.position[1], 0]}>
            <octahedronGeometry args={[0.14]} />
            <meshStandardMaterial
              color={FEEX_NOIR.signal}
              emissive={FEEX_NOIR.signal}
              emissiveIntensity={2.4}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
