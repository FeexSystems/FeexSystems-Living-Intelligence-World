import React from "react";
import { useBox } from "@react-three/cannon";

export function BoundingWorkspaceEnclosure() {
  // Rigid workspace structural floor, ceiling, and perimeter walls to capture drone coordinates
  useBox(() => ({
    type: "Static",
    position: [0, -4.5, 0],
    args: [30, 0.4, 30],
  })); // Floor

  useBox(() => ({
    type: "Static",
    position: [0, 8.0, 0],
    args: [30, 0.4, 30],
  })); // Ceiling

  useBox(() => ({
    type: "Static",
    position: [-10.0, 0, 0],
    args: [0.4, 16, 30],
  })); // Left boundary

  useBox(() => ({
    type: "Static",
    position: [10.0, 0, 0],
    args: [0.4, 16, 30],
  })); // Right boundary

  useBox(() => ({
    type: "Static",
    position: [0, 0, -14],
    args: [30, 16, 0.4],
  })); // Rear mainframe boundary

  useBox(() => ({
    type: "Static",
    position: [0, 0, 6],
    args: [30, 16, 0.4],
  })); // Front viewport cap

  return (
    <group>
      {/* Visual Workspace Wireframe Indicator - Obsidian Grid Scheme */}
      <mesh position={[0, 0, -4]}>
        <boxGeometry args={[18, 12, 18]} />
        <meshBasicMaterial
          color="#38bdf8"
          wireframe
          transparent
          opacity={0.03}
        />
      </mesh>
    </group>
  );
}

export default BoundingWorkspaceEnclosure;
