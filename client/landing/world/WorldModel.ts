import { PLANETARY_ECOSYSTEMS, type EcosystemSatellite } from "@/world-model";

/**
 * Landing World Model projection.
 *
 * This module is the ONLY place the landing derives world data. It reads the
 * canonical `PLANETARY_ECOSYSTEMS` registry and exposes *derived views* —
 * filters, relationship edges and topology — used by the landing scenes.
 *
 * Migration Invariant 1 ("World Model authority"): presentation components must
 * never restate world identity, count, or repositories. Everything below is
 * computed from the registry so a registry change propagates automatically.
 */

export type WorldRecord = EcosystemSatellite;

export interface WorldEdge {
  id: string;
  from: string;
  to: string;
  kind: "SHARES_DOMAIN" | "SHARES_REPOSITORY";
  label: string;
}

/** Canonical worlds, unmodified. */
export function getWorlds(): readonly WorldRecord[] {
  return PLANETARY_ECOSYSTEMS;
}

export function getWorldById(id: string): WorldRecord | undefined {
  return PLANETARY_ECOSYSTEMS.find((world) => world.id === id);
}

/**
 * The leading segment of `category` acts as the world's domain family, e.g.
 * "AUDIO PLATFORM (BUSHFEEXER)" → "AUDIO PLATFORM". Derived, never hardcoded.
 */
export function getWorldDomain(world: WorldRecord): string {
  return world.category.split("(")[0].trim();
}

/** Distinct domain families present in the registry, sorted for stable UI. */
export function getWorldDomains(): string[] {
  return Array.from(new Set(PLANETARY_ECOSYSTEMS.map(getWorldDomain))).sort();
}

/**
 * Real filtering over canonical records. An empty/`ALL` domain means no filter.
 * Matching is case-insensitive across name, category and capabilities.
 */
export function filterWorlds(options: {
  domain?: string;
  query?: string;
}): WorldRecord[] {
  const { domain, query } = options;
  const normalizedQuery = query?.trim().toLowerCase() ?? "";

  return PLANETARY_ECOSYSTEMS.filter((world) => {
    if (domain && domain !== "ALL" && getWorldDomain(world) !== domain) {
      return false;
    }

    if (!normalizedQuery) return true;

    const haystack = [
      world.name,
      world.category,
      world.description,
      world.repo,
      ...world.capabilities,
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

/**
 * Relationship graph derived from shared domains and shared repositories.
 * An edge is only emitted when two worlds genuinely share a canonical
 * attribute — no invented topology.
 */
export function getWorldEdges(): WorldEdge[] {
  const edges: WorldEdge[] = [];

  for (let i = 0; i < PLANETARY_ECOSYSTEMS.length; i += 1) {
    for (let j = i + 1; j < PLANETARY_ECOSYSTEMS.length; j += 1) {
      const a = PLANETARY_ECOSYSTEMS[i];
      const b = PLANETARY_ECOSYSTEMS[j];

      const sharesRepo =
        a.repo === b.repo && a.repo !== "Pending canonical repository connection";

      if (sharesRepo) {
        edges.push({
          id: `${a.id}->${b.id}:repo`,
          from: a.id,
          to: b.id,
          kind: "SHARES_REPOSITORY",
          label: a.repo,
        });
        continue;
      }

      if (getWorldDomain(a) === getWorldDomain(b)) {
        edges.push({
          id: `${a.id}->${b.id}:domain`,
          from: a.id,
          to: b.id,
          kind: "SHARES_DOMAIN",
          label: getWorldDomain(a),
        });
      }
    }
  }

  return edges;
}

/**
 * Circular node layout for the topology view. Deterministic so render output is
 * stable across environments (tests can assert positions).
 */
export function getTopologyLayout(radius = 42): Array<{
  world: WorldRecord;
  x: number;
  y: number;
}> {
  const count = PLANETARY_ECOSYSTEMS.length;
  return PLANETARY_ECOSYSTEMS.map((world, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    return {
      world,
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
    };
  });
}

/**
 * Evidence fabric view for a single world. This reads the canonical
 * `evidence` provenance record — it does NOT synthesize confidence or counts.
 * A world is only "verified" when the registry itself says so.
 */
export interface WorldEvidenceView {
  worldId: string;
  worldName: string;
  evidenceClass: WorldRecord["evidence"]["class"];
  source: WorldRecord["evidence"]["source"];
  verified: boolean;
  reference?: string;
  repository: string;
  repositoryUrl: string;
}

export function getWorldEvidence(worldId: string): WorldEvidenceView | undefined {
  const world = getWorldById(worldId);
  if (!world) return undefined;

  return {
    worldId: world.id,
    worldName: world.name,
    evidenceClass: world.evidence.class,
    source: world.evidence.source,
    verified: world.evidence.verified,
    reference: world.evidence.reference,
    repository: world.repo,
    repositoryUrl: world.repoUrl,
  };
}
