import { describe, it, expect } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PLANETARY_ECOSYSTEMS } from "@/world-model";
import { WorldsScene } from "@/landing/scenes/WorldsScene";
import {
  filterWorlds,
  getWorldById,
  getWorldDomains,
  getWorldDomain,
  getWorldEdges,
  getWorldEvidence,
  getTopologyLayout,
} from "@/landing/world/WorldModel";

/**
 * Phase C — landing World Model projection.
 *
 * These tests pin the migration invariants:
 * - Invariant 1: the registry is the source of truth (no presentation registry).
 * - Invariant 3: evidence provenance is canonical, telemetry is not truth.
 */

function renderWorldsScene() {
  return render(
    <MemoryRouter>
      <WorldsScene />
    </MemoryRouter>
  );
}

describe("landing/world projection layer", () => {
  it("exposes every canonical world and nothing else", () => {
    const layout = getTopologyLayout();
    expect(layout).toHaveLength(PLANETARY_ECOSYSTEMS.length);
    expect(layout.map((n) => n.world.id)).toEqual(
      PLANETARY_ECOSYSTEMS.map((w) => w.id)
    );
  });

  it("derives domains from the registry without a local list", () => {
    const expected = Array.from(
      new Set(PLANETARY_ECOSYSTEMS.map((w) => w.category.split("(")[0].trim()))
    ).sort();
    expect(getWorldDomains()).toEqual(expected);
  });

  it("filters by domain family", () => {
    const domain = getWorldDomain(PLANETARY_ECOSYSTEMS[0]);
    const result = filterWorlds({ domain });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((w) => getWorldDomain(w) === domain)).toBe(true);
  });

  it("filters by free-text query across name/capabilities", () => {
    const target = PLANETARY_ECOSYSTEMS[0];
    const result = filterWorlds({ query: target.name.toLowerCase() });
    expect(result.map((w) => w.id)).toContain(target.id);
  });

  it("returns an empty set for a non-matching query", () => {
    expect(filterWorlds({ query: "zzz-definitely-not-a-world" })).toEqual([]);
  });

  it("only emits relationship edges backed by real shared attributes", () => {
    const edges = getWorldEdges();
    for (const edge of edges) {
      const from = getWorldById(edge.from)!;
      const to = getWorldById(edge.to)!;
      if (edge.kind === "SHARES_DOMAIN") {
        expect(getWorldDomain(from)).toBe(getWorldDomain(to));
      } else {
        expect(from.repo).toBe(to.repo);
      }
    }
  });

  it("surfaces canonical evidence provenance without upgrading it", () => {
    for (const world of PLANETARY_ECOSYSTEMS) {
      const view = getWorldEvidence(world.id)!;
      expect(view.evidenceClass).toBe(world.evidence.class);
      expect(view.verified).toBe(world.evidence.verified);
      expect(view.source).toBe(world.evidence.source);
    }
  });

  it("returns undefined evidence for an unknown world", () => {
    expect(getWorldEvidence("not-a-world")).toBeUndefined();
  });
});

describe("WorldsScene", () => {
  it("renders every canonical world by default", () => {
    renderWorldsScene();
    const nodes = screen.getAllByTestId("world-node");
    expect(nodes).toHaveLength(PLANETARY_ECOSYSTEMS.length);
    for (const world of PLANETARY_ECOSYSTEMS) {
      expect(screen.getAllByText(world.name).length).toBeGreaterThan(0);
    }
  });

  it("narrows the grid when a domain filter is applied", async () => {
    renderWorldsScene();

    const domain = getWorldDomain(PLANETARY_ECOSYSTEMS[0]);
    const expected = filterWorlds({ domain });

    await act(async () => {
      screen.getByRole("button", { name: domain }).click();
    });

    expect(screen.getAllByTestId("world-node")).toHaveLength(expected.length);
  });

  it("shows an empty state when the query matches nothing", async () => {
    renderWorldsScene();

    const input = screen.getByLabelText(/filter canonical worlds/i);
    await act(async () => {
      fireEvent.change(input, { target: { value: "zzz-no-world" } });
    });

    expect(screen.getByTestId("worlds-empty")).toBeInTheDocument();
    expect(screen.queryAllByTestId("world-node")).toHaveLength(0);
  });

  it("opens the inspector via INSPECT WORLD and closes it", async () => {
    renderWorldsScene();

    expect(screen.queryByTestId("world-inspector")).not.toBeInTheDocument();

    const inspectButtons = screen.getAllByRole("button", { name: /inspect world/i });
    await act(async () => {
      inspectButtons[0].click();
    });

    const inspector = screen.getByTestId("world-inspector");
    expect(inspector).toBeInTheDocument();

    await act(async () => {
      screen.getByLabelText(/close world inspector/i).click();
    });
    expect(screen.queryByTestId("world-inspector")).not.toBeInTheDocument();
  });

  it("renders the evidence fabric with the canonical provenance class", async () => {
    renderWorldsScene();

    const world = PLANETARY_ECOSYSTEMS[0];
    const firstInspect = screen.getAllByRole("button", { name: /inspect world/i })[0];
    await act(async () => {
      firstInspect.click();
    });

    const evidence = screen.getByTestId("inspector-evidence");
    expect(evidence).toBeInTheDocument();
    // The registry's own class must appear — never an invented "verified" value.
    expect(evidence.textContent).toContain(world.evidence.class);
  });

  it("toggles the relationship graph", async () => {
    renderWorldsScene();
    expect(screen.getByTestId("relationship-graph")).toBeInTheDocument();
    await act(async () => {
      screen.getByRole("button", { name: /show list/i }).click();
    });
    expect(screen.queryByTestId("relationship-graph")).not.toBeInTheDocument();
    await act(async () => {
      screen.getByRole("button", { name: /show topology/i }).click();
    });
    const graph = screen.getByTestId("relationship-graph");
    expect(graph).toBeInTheDocument();
    expect(graph).toHaveAttribute(
      "data-node-count",
      String(PLANETARY_ECOSYSTEMS.length)
    );
    expect(screen.getAllByTestId("graph-node")).toHaveLength(
      PLANETARY_ECOSYSTEMS.length
    );
  });
});
