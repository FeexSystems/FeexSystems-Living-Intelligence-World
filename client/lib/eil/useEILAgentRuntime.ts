/**
 * G5 Stage 3 — Ephemeral EIL agent runtime (client hook).
 *
 * Owns one LocalEILAdapter per component instance. The adapter boots
 * OFFLINE and is moved to IDLE on mount — the only legal exit. All
 * subsequent states come from planAgentTransitions applied against
 * real UI signals; nothing here invents evidence, persists state, or
 * touches the network.
 */

import { useCallback, useEffect, useState } from "react";
import type { AgentStateEvent } from "../../../packages/feex-eil/contracts/agent-state";
import { LocalEILAdapter } from "../../../packages/feex-eil/interaction/LocalEILAdapter";
import {
  planAgentTransitions,
  type AgentSignalInput,
} from "./agentProjection";

export interface EILAgentRuntime {
  /** Latest committed AgentStateEvent, or undefined before boot. */
  event: AgentStateEvent | undefined;
  /** Apply the transition path implied by the current UI signals. */
  applySignals: (signals: AgentSignalInput) => void;
}

export function useEILAgentRuntime(agentId = "holokai-voice"): EILAgentRuntime {
  // Lazy state initializer: one adapter per mounted runtime. The
  // constructor has no external side effects (in-process machine +
  // bus only), so render-time creation is safe and StrictMode-stable.
  const [adapter] = useState(() => new LocalEILAdapter({ agentId }));
  const [event, setEvent] = useState<AgentStateEvent | undefined>(undefined);

  useEffect(() => {
    // Subscribe BEFORE emitting the boot transition so the IDLE event
    // is never missed by this runtime's own state stream.
    const unsubscribe = adapter.subscribeState(setEvent);
    // Child effects run before this hook's effect: a descendant may
    // already have committed transitions via applySignals (e.g. the
    // HoloKai modal projecting its initial signals). Seed the latest
    // committed event so those transitions are not lost, then boot
    // only if the machine is still OFFLINE.
    const committed = adapter.stateEvents;
    const latest = committed[committed.length - 1];
    if (latest) setEvent(latest);
    if (adapter.currentState() === "OFFLINE") {
      adapter.transition("IDLE", "system", { reason: "runtime-mounted" });
    }
    return unsubscribe;
  }, [adapter]);

  const applySignals = useCallback((signals: AgentSignalInput) => {
    for (const step of planAgentTransitions(adapter.currentState(), signals)) {
      // Illegal steps are rejected by the adapter and ignored — the
      // planner only emits legal paths, so a rejection indicates drift
      // between planner and contract and is safe to skip.
      adapter.transition(step.to, step.source, { reason: step.reason });
    }
  }, [adapter]);

  return { event, applySignals };
}
