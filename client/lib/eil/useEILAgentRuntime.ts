/**
 * G5 Stage 3 — Ephemeral EIL agent runtime (client hook).
 *
 * Owns one LocalEILAdapter per component instance. The adapter boots
 * OFFLINE and is moved to IDLE on mount — the only legal exit. All
 * subsequent states come from planAgentTransitions applied against
 * real UI signals; nothing here invents evidence, persists state, or
 * touches the network.
 */

import { useCallback, useEffect, useRef, useState } from "react";
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
  const adapterRef = useRef<LocalEILAdapter | null>(null);
  if (adapterRef.current === null) {
    adapterRef.current = new LocalEILAdapter({ agentId });
  }
  const [event, setEvent] = useState<AgentStateEvent | undefined>(undefined);

  useEffect(() => {
    const adapter = adapterRef.current!;
    const unsubscribe = adapter.subscribeState(setEvent);
    // Boot: OFFLINE → IDLE is the only legal entry into the machine.
    adapter.transition("IDLE", "system", { reason: "runtime-mounted" });
    return unsubscribe;
  }, []);

  const applySignals = useCallback((signals: AgentSignalInput) => {
    const adapter = adapterRef.current;
    if (!adapter) return;
    for (const step of planAgentTransitions(adapter.currentState(), signals)) {
      // Illegal steps are rejected by the adapter and ignored — the
      // planner only emits legal paths, so a rejection indicates drift
      // between planner and contract and is safe to skip.
      adapter.transition(step.to, step.source, { reason: step.reason });
    }
  }, []);

  return { event, applySignals };
}
