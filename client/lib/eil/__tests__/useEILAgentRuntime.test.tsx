import { act, render, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import React, { useEffect } from "react";
import { useEILAgentRuntime, type EILAgentRuntime } from "../useEILAgentRuntime";

describe("useEILAgentRuntime", () => {
  it("boots OFFLINE then settles to IDLE on mount", () => {
    const { result } = renderHook(() => useEILAgentRuntime("test-agent"));
    expect(result.current.event?.state).toBe("IDLE");
    expect(result.current.event?.previousState).toBe("OFFLINE");
    expect(result.current.event?.agentId).toBe("test-agent");
  });

  it("projects listening → thinking → idle through legal transitions", () => {
    const { result } = renderHook(() => useEILAgentRuntime("test-agent"));

    act(() => result.current.applySignals({ speechStatus: "listening", isLoading: false }));
    expect(result.current.event?.state).toBe("LISTENING");

    act(() => result.current.applySignals({ speechStatus: "idle", isLoading: true }));
    expect(result.current.event?.state).toBe("THINKING");

    act(() => result.current.applySignals({ speechStatus: "idle", isLoading: false }));
    expect(result.current.event?.state).toBe("IDLE");
  });

  it("routes a text query through PERCEIVING → THINKING", () => {
    const { result } = renderHook(() => useEILAgentRuntime("test-agent"));
    act(() => result.current.applySignals({ speechStatus: "idle", isLoading: true }));
    expect(result.current.event?.state).toBe("THINKING");
    expect(result.current.event?.previousState).toBe("PERCEIVING");
  });

  it("surfaces ERROR on denied speech and recovers to IDLE", () => {
    const { result } = renderHook(() => useEILAgentRuntime("test-agent"));
    act(() => result.current.applySignals({ speechStatus: "denied", isLoading: false }));
    expect(result.current.event?.state).toBe("ERROR");
    act(() => result.current.applySignals({ speechStatus: "idle", isLoading: false }));
    expect(result.current.event?.state).toBe("IDLE");
  });

  it("seeds the latest committed event when a child effect transitions first", () => {
    // Regression: React runs child effects before parent effects. A
    // descendant calling applySignals on mount (e.g. HoloKaiVoiceModal
    // projecting its initial signals) commits OFFLINE→IDLE before this
    // hook subscribes. The runtime must seed that committed event or
    // the projection stays empty forever.
    let runtime: EILAgentRuntime | undefined;
    function Child({ rt }: { rt: EILAgentRuntime }) {
      useEffect(() => {
        rt.applySignals({ speechStatus: "idle", isLoading: false });
      }, [rt]);
      return null;
    }
    function Parent() {
      const rt = useEILAgentRuntime("seed-agent");
      runtime = rt;
      return <Child rt={rt} />;
    }
    render(<Parent />);
    expect(runtime?.event?.state).toBe("IDLE");
    expect(runtime?.event?.previousState).toBe("OFFLINE");
  });
});
