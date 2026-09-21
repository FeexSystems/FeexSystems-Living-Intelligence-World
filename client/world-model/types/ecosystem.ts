import type { EvidenceProvenance } from "../registry/evidence";

export interface EcosystemSatellite {
  evidence: EvidenceProvenance;
  id: string;
  name: string;
  category: string;
  tagline: string;
  status: string;
  metrics: { l1: string; l2: string; r1: string; r2: string };
  highlight: { title: string; value: string; status: string; subtitle: string };
  sysLog: string;
}
