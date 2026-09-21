export type EvidenceClass =
  | "CANONICAL"
  | "OBSERVED_TELEMETRY"
  | "DESIGN_SPEC"
  | "ILLUSTRATIVE"
  | "SIMULATED";

export interface EvidenceProvenance {
  class: EvidenceClass;
  source: "world-model" | "static-registry" | "runtime-telemetry" | "simulation";
  verified: boolean;
  reference?: string;
}

/** Static registry values are design specifications until backed by World Model evidence. */
export const DESIGN_SPEC_PROVENANCE: EvidenceProvenance = {
  class: "DESIGN_SPEC",
  source: "static-registry",
  verified: false,
};
