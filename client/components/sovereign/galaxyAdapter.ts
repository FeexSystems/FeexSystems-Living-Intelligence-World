/**
 * galaxyAdapter.ts — bridges the Sovereign Engine's GroundedWorld catalog
 * to the GraphData shape expected by GalaxyScene.
 *
 * CANONICAL PRINCIPLE #1: Data is projected from the World Model; nodes are
 * never invented. Technology nodes are synthesized from the `language` fields
 * already grounded in the canonical API response.
 */

import type { GroundedWorld } from './useSovereignWorldModel';
import type { GraphData, GraphLink, GraphNode } from '@/components/galaxy/types';

/**
 * Converts one GroundedWorld entry into a GalaxyScene GraphNode.
 * All fields are derived from the canonical World Model payload.
 */
export function groundedWorldToGraphNode(w: GroundedWorld): GraphNode {
  return {
    id: w.id,
    name: w.shortTitle,
    type: 'project',
    repository: w.repo ?? undefined,
    description: w.description,
    url: undefined,
    isPinned: w.canonical,
    domain: w.category,
    language: undefined,
    artifactCount: w.artifactCount ?? undefined,
    val: w.canonical ? 32 : 20,
  };
}

/**
 * Builds a complete GraphData object from the Sovereign World Model state.
 *
 * - Projects are converted from GroundedWorld entries.
 * - Technology nodes are synthesised from distinct domain categories
 *   so the galaxy has meaningful cluster structure.
 * - Links include the canonical typed edges from the World Model API
 *   plus synthesised CATEGORIZED_AS edges from world → domain.
 */
export function buildHudGraphData(
  worlds: GroundedWorld[],
  canonicalLinks: Array<{ id: string; source: string; target: string; relation: string }>
): GraphData {
  const projectNodes: GraphNode[] = worlds.map(groundedWorldToGraphNode);

  // Synthesise one technology/domain node per distinct category
  const categoryIds = new Map<string, string>();
  worlds.forEach((w) => {
    const cat = w.category;
    if (!categoryIds.has(cat)) {
      const catId = `domain-${cat.toLowerCase().replace(/\s+/g, '-')}`;
      categoryIds.set(cat, catId);
    }
  });

  const domainNodes: GraphNode[] = Array.from(categoryIds.entries()).map(
    ([cat, catId]) => ({
      id: catId,
      name: cat,
      type: 'technology' as const,
      domain: cat,
      val: 14,
    })
  );

  const nodes: GraphNode[] = [...projectNodes, ...domainNodes];

  // Convert canonical typed links (project ─► project relationships)
  const canonical: GraphLink[] = canonicalLinks.map((l) => ({
    id: l.id,
    source: l.source,
    target: l.target,
    relation: l.relation,
  }));

  // Synthesised domain-cluster links (world → its domain node)
  const domainLinks: GraphLink[] = worlds.map((w) => {
    const catId = categoryIds.get(w.category)!;
    return {
      id: `domain-link-${w.id}`,
      source: w.id,
      target: catId,
      relation: 'CATEGORIZED_AS',
    };
  });

  const links: GraphLink[] = [...canonical, ...domainLinks];

  return {
    nodes,
    links,
    stats: {
      totalProjects: projectNodes.length,
      totalTechnologies: domainNodes.length,
      totalLinks: links.length,
    },
  };
}
