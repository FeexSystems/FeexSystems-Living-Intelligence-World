import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { EILProjectionSlot } from "@/components/sovereign/EILProjectionSlot";
import type { AgentStateEvent } from "../../../packages/feex-eil/contracts/agent-state";

// HumanoidScene pulls in @react-three/fiber; stub it so the slot's
// enable/disable contract can be asserted in jsdom.
vi.mock("../../../packages/feex-eil/renderer/HumanoidScene", () => ({
  HumanoidScene: ({ event }: { event: AgentStateEvent }) => (
    <div data-testid="humanoid-scene" data-state={event.state} />
  ),
}));

const event: AgentStateEvent = {
  eventId: "00000000-0000-4000-8000-000000000001",
  agentId: "holokai-01",
  state: "IDLE",
  previousState: "OFFLINE",
  timestamp: "2026-11-22T12:00:00.000Z",
  source: "system",
  evidenceRefs: [],
};

describe("EILProjectionSlot", () => {
  it("renders nothing when disabled, even with a valid event", () => {
    const { container } = render(
      <EILProjectionSlot event={event} enabled={false} />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("humanoid-scene")).not.toBeInTheDocument();
  });

  it("renders nothing when enabled but no event has been committed", () => {
    const { container } = render(
      <EILProjectionSlot event={null} enabled={true} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the humanoid projection when enabled with a committed event", () => {
    render(<EILProjectionSlot event={event} enabled={true} />);
    expect(screen.getByTestId("humanoid-scene")).toHaveAttribute(
      "data-state",
      "IDLE",
    );
  });
});
