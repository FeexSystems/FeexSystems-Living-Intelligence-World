import { LAB_HUMANOID_STAGING } from "../../../lib/lab/lab-zones";
import { HumanoidModel } from "../../../landing/components/humanoid/HumanoidModel";
import type { HumanoidState } from "../../../landing/config/humanoid.config";

/**
 * SovereignCharacter — the rigged humanoid staged inside humanoid-bay.
 *
 * Thin wrapper over the existing HumanoidModel boundary: the model keeps
 * its own normalization/clip/gaze logic; this component only places it
 * at the lab staging anchor and aims it toward the atrium (+z).
 */
export function SovereignCharacter({
  state,
  clip,
  pointer,
  onLoaded,
  onError,
}: {
  state: HumanoidState;
  clip: string | null;
  pointer: { x: number; y: number };
  onLoaded?: () => void;
  onError?: (reason: string) => void;
}) {
  return (
    <group
      name="sorl-sovereign-character"
      position={LAB_HUMANOID_STAGING}
      rotation={[0, 0.15, 0]}
    >
      <HumanoidModel
        state={state}
        clip={clip}
        pointer={pointer}
        onLoaded={onLoaded}
        onError={onError}
      />
    </group>
  );
}
