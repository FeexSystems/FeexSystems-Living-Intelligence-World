import { useMemo } from "react";
import { FEEX_NOIR } from "../../../landing/config/noir";
import { LAB_SHELL, LAB_ZONES, zoneCenterToScene } from "../../../lib/lab/lab-zones";

/**
 * LabEnvironment — procedural FEEX-SORL greybox.
 *
 * Mirrors scripts/authoring/build_feex_sorl_architecture.py in three.js
 * scene coords until the Phase 4 GLB chunk replaces it via
 * client/lib/lab/lab-manifest.ts. Pure geometry — no state, no agents.
 */

const W = LAB_SHELL.width;    // 30 (x)
const D = LAB_SHELL.depth;    // 24 (z)
const H = LAB_SHELL.ceilingHeight; // 5.5

function LabBox({
  position,
  size,
  color,
  roughness = 0.85,
  metalness = 0.1,
  emissive,
  emissiveIntensity = 0,
  transparent,
  opacity,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
}) {
  return (
    <mesh position={position} castShadow={false} receiveShadow={false}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissiveIntensity}
        transparent={transparent}
        opacity={opacity}
      />
    </mesh>
  );
}

export function LabEnvironment() {
  const columns = useMemo(() => {
    const out: [number, number][] = [];
    for (const gx of [-12, -6, 6, 12]) {
      for (const gz of [-9, -3, 3, 9]) {
        // keep atrium (|x|<5.5, |z|<3) open — scene z = -blender y
        if (Math.abs(gx) < 5.5 && Math.abs(gz) < 3.0) continue;
        out.push([gx, gz]);
      }
    }
    return out;
  }, []);

  const lightStrips: { pos: [number, number, number]; size: [number, number, number] }[] = [
    { pos: [0, H - 0.02, 0], size: [24, 0.04, 0.35] },
    { pos: [0, H - 0.02, -8], size: [24, 0.04, 0.35] },
    { pos: [0, H - 0.02, 8], size: [24, 0.04, 0.35] },
    { pos: [-10, H - 0.02, 0], size: [0.35, 0.04, 18] },
    { pos: [10, H - 0.02, 0], size: [0.35, 0.04, 18] },
  ];

  return (
    <group name="sorl-lab-environment">
      {/* Floor + atrium medallion */}
      <LabBox position={[0, -0.15, 0]} size={[W, 0.3, D]} color={FEEX_NOIR.graphite} roughness={0.9} />
      <LabBox position={[0, -0.005, 0]} size={[10, 0.02, 10]} color={FEEX_NOIR.panel} roughness={0.8} />

      {/* Perimeter walls */}
      <LabBox position={[0, H / 2, -D / 2 - 0.2]} size={[W + 0.8, H, 0.4]} color={FEEX_NOIR.panel} roughness={0.92} />
      <LabBox position={[0, H / 2, D / 2 + 0.2]} size={[W + 0.8, H, 0.4]} color={FEEX_NOIR.panel} roughness={0.92} />
      <LabBox position={[-W / 2 - 0.2, H / 2, 0]} size={[0.4, H, D]} color={FEEX_NOIR.panel} roughness={0.92} />
      <LabBox position={[W / 2 + 0.2, H / 2, 0]} size={[0.4, H, D]} color={FEEX_NOIR.panel} roughness={0.92} />

      {/* Ceiling */}
      <LabBox position={[0, H + 0.15, 0]} size={[W + 0.8, 0.3, D + 0.8]} color={FEEX_NOIR.panel} roughness={0.92} />

      {/* Emissive light strips */}
      {lightStrips.map((s, i) => (
        <LabBox
          key={i}
          position={s.pos}
          size={s.size}
          color={FEEX_NOIR.signal}
          emissive={FEEX_NOIR.signal}
          emissiveIntensity={1.6}
          roughness={0.4}
        />
      ))}

      {/* Structural columns */}
      {columns.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <LabBox position={[0, H / 2, 0]} size={[0.55, H, 0.55]} color={FEEX_NOIR.steel} metalness={0.85} roughness={0.38} />
          <LabBox position={[0, 0.15, 0]} size={[0.9, 0.3, 0.9]} color={FEEX_NOIR.graphite} metalness={0.4} roughness={0.7} />
        </group>
      ))}

      {/* Ceiling beams */}
      {[-12, -6, 0, 6, 12].map((x) => (
        <LabBox key={`bx${x}`} position={[x, H - 0.25, 0]} size={[0.4, 0.5, D]} color={FEEX_NOIR.steel} metalness={0.85} roughness={0.38} />
      ))}
      {[-9, -4.5, 0, 4.5, 9].map((z) => (
        <LabBox key={`bz${z}`} position={[0, H - 0.35, z]} size={[W, 0.4, 0.35]} color={FEEX_NOIR.steel} metalness={0.85} roughness={0.38} />
      ))}

      {/* Atrium glass partitions (N/S with door gaps at |x|<1) */}
      {([
        ["N_L", -3, -2.5, 8], ["N_R", 3, -2.5, 8],
        ["S_L", -3, 2.5, 8], ["S_R", 3, 2.5, 8],
      ] as const).map(([key, x, z, w]) => (
        <group key={key} position={[x, H / 2 - 0.4, z]}>
          <mesh>
            <boxGeometry args={[w, H - 1.6, 0.12]} />
            <meshStandardMaterial color="#8c99a3" transparent opacity={0.16} roughness={0.12} metalness={0.1} />
          </mesh>
          <LabBox position={[0, (H - 1.6) / 2 + 0.05, 0]} size={[w + 0.08, 0.1, 0.16]} color={FEEX_NOIR.steel} metalness={0.85} roughness={0.38} />
          <LabBox position={[0, -(H - 1.6) / 2 - 0.05, 0]} size={[w + 0.08, 0.1, 0.16]} color={FEEX_NOIR.steel} metalness={0.85} roughness={0.38} />
        </group>
      ))}
      {/* Atrium E/W glass */}
      {([[-5, "E"], [5, "W"]] as const).map(([x, key]) => (
        <group key={key} position={[x, H / 2 - 0.4, 0]}>
          <mesh>
            <boxGeometry args={[0.12, H - 1.6, 5]} />
            <meshStandardMaterial color="#8c99a3" transparent opacity={0.16} roughness={0.12} metalness={0.1} />
          </mesh>
        </group>
      ))}

      {/* Circulation guide strips */}
      <LabBox position={[0, 0.01, 0]} size={[1.6, 0.02, 16]} color={FEEX_NOIR.signal} emissive={FEEX_NOIR.signal} emissiveIntensity={0.5} />
      <LabBox position={[-10, 0.01, 0]} size={[8, 0.02, 1.2]} color={FEEX_NOIR.signal} emissive={FEEX_NOIR.signal} emissiveIntensity={0.5} />
      <LabBox position={[10, 0.01, 0]} size={[8, 0.02, 1.2]} color={FEEX_NOIR.signal} emissive={FEEX_NOIR.signal} emissiveIntensity={0.5} />

      {/* Entry frame (south, +z wall) */}
      <LabBox position={[0, 2.6, D / 2 + 0.1]} size={[4, 0.5, 0.5]} color={FEEX_NOIR.steel} metalness={0.85} roughness={0.38} />
      <LabBox position={[-1.9, 1.3, D / 2 + 0.1]} size={[0.3, 2.6, 0.5]} color={FEEX_NOIR.steel} metalness={0.85} roughness={0.38} />
      <LabBox position={[1.9, 1.3, D / 2 + 0.1]} size={[0.3, 2.6, 0.5]} color={FEEX_NOIR.steel} metalness={0.85} roughness={0.38} />

      {/* Zone floor pads + totems */}
      {LAB_ZONES.map((z) => {
        const [zx, zz] = zoneCenterToScene(z.center);
        const totemZ = zz < 0 ? zz + z.size[1] / 2 - 0.9 : zz - z.size[1] / 2 + 0.9;
        return (
          <group key={z.id}>
            <LabBox
              position={[zx, 0.015, zz]}
              size={[z.size[0] - 0.6, 0.03, z.size[1] - 0.6]}
              color={FEEX_NOIR.graphite}
              roughness={0.8}
            />
            {/* ID totem at atrium-facing edge */}
            <group position={[zx, 0, totemZ]}>
              <mesh position={[0, 1.1, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 2.2, 12]} />
                <meshStandardMaterial color={FEEX_NOIR.steel} metalness={0.85} roughness={0.38} />
              </mesh>
              <LabBox position={[0, 2.35, 0]} size={[0.7, 0.45, 0.12]} color={FEEX_NOIR.graphite} metalness={0.4} roughness={0.7} />
              <LabBox
                position={[0, 2.35, zz < 0 ? 0.07 : -0.07]}
                size={[0.6, 0.35, 0.02]}
                color={FEEX_NOIR.signal}
                emissive={FEEX_NOIR.signal}
                emissiveIntensity={1.8}
              />
            </group>
          </group>
        );
      })}
    </group>
  );
}
