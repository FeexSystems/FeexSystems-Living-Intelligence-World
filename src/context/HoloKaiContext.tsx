import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CANONICAL_WORLDS } from "../data/canonicalRegistry";
import { HoloKaiRoboticCore } from "../components/holokai/HoloKaiRoboticCore";

export interface HoloKaiPayload {
  grounded: boolean;
  inference: string;
  target: string | null;
  evidence: string[];
  source: "holokai" | "canonical-fallback";
}

interface HoloKaiContextValue {
  open: boolean;
  isStreaming: boolean;
  alertPulse: number;
  target: string | null;
  payload: HoloKaiPayload;
  openUplink: (prompt?: string) => void;
  closeUplink: () => void;
  setTarget: (target: string | null) => void;
  dispatchInference: (prompt?: string, targetOverride?: string) => Promise<void>;
}

const HoloKaiContext = createContext<HoloKaiContextValue | null>(null);
const dispatchUrl = (import.meta.env.VITE_HOLOKAI_API_URL as string | undefined) ?? "http://localhost:4000/api/oracle/query";

function canonicalFallback(target: string | null): HoloKaiPayload {
  const world = CANONICAL_WORLDS.find((item) => item.id === target || item.name === target);
  return {
    grounded: true,
    inference: world
      ? `${world.name}: ${world.description} Canonical topology and provenance remain authoritative.`
      : `Canonical graph contains ${CANONICAL_WORLDS.length} worlds and 5 missions. Select a world to inspect its grounded context.`,
    target,
    evidence: world ? [world.repo, world.evidence.reference ?? "design-spec provenance"].filter(Boolean) : ["canonicalRegistry.ts", `${CANONICAL_WORLDS.length} canonical worlds`, "5 canonical missions"],
    source: "canonical-fallback",
  };
}

export function HoloKaiProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [alertPulse, setAlertPulse] = useState(0);
  const [target, setTarget] = useState<string | null>(null);
  const [payload, setPayload] = useState<HoloKaiPayload>(() => canonicalFallback(null));

  const dispatchInference = useCallback(async (prompt = "Summarize the selected canonical world with evidence.", targetOverride?: string) => {
    const focus = targetOverride ?? target;
    setIsStreaming(true);
    setAlertPulse((value) => value + 1);
    try {
      if (!dispatchUrl) {
        setPayload(canonicalFallback(focus));
        return;
      }
      const response = await fetch(dispatchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, civilizationFocus: focus ?? "FEEXSYSTEMS" }),
      });
      if (!response.ok) throw new Error(`HoloKai dispatch returned ${response.status}`);
      const result = await response.json() as { text?: string; answer?: string; evidence?: Array<{ sourceTitle?: string; textSnippet?: string }>; citations?: string[] };
      setPayload({
        grounded: Boolean(result.evidence?.length || result.citations?.length),
        inference: result.text ?? result.answer ?? "HoloKai returned no inference payload.",
        target: focus,
        evidence: [...(result.citations ?? []), ...(result.evidence ?? []).map((item) => item.sourceTitle ?? item.textSnippet ?? "HoloKai evidence")],
        source: "holokai",
      });
    } catch {
      setPayload(canonicalFallback(focus));
    } finally {
      setIsStreaming(false);
    }
  }, [target]);

  const value = useMemo<HoloKaiContextValue>(() => ({
    open,
    isStreaming,
    alertPulse,
    target,
    payload,
    openUplink: (prompt) => { setOpen(true); void dispatchInference(prompt); },
    closeUplink: () => setOpen(false),
    setTarget: (nextTarget) => { setTarget(nextTarget); setPayload(canonicalFallback(nextTarget)); },
    dispatchInference,
  }), [open, isStreaming, alertPulse, target, payload, dispatchInference]);

  return <HoloKaiContext.Provider value={value}>{children}<HoloKaiUplinkDrawer /></HoloKaiContext.Provider>;
}

export function useHoloKai() {
  const context = useContext(HoloKaiContext);
  if (!context) throw new Error("useHoloKai must be used within HoloKaiProvider.");
  return context;
}

export function HoloKaiUplinkDrawer() {
  const { open, closeUplink, target, payload, isStreaming, alertPulse, dispatchInference } = useHoloKai();
  if (!open) return null;
  return (
    <aside className="fixed bottom-5 right-5 z-[100] w-[min(92vw,420px)] rounded-xl border border-cyan-300/30 bg-[#05090d]/95 p-5 text-white shadow-2xl backdrop-blur-xl" aria-label="HoloKai uplink" aria-live="polite">
      <HoloKaiRoboticCore isStreaming={isStreaming} alertPulse={alertPulse} onCoreClick={() => void dispatchInference("Run an interactive HoloKai diagnostic status ping.")} className="h-44 w-full" />
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div><p className="font-mono text-[9px] uppercase tracking-[.24em] text-white/70">HOLOKAI // UPLINK</p><h2 className="mt-1 font-mono text-sm">{target ?? "Canonical graph"}</h2></div>
        <button type="button" onClick={closeUplink} className="rounded border border-white/20 px-2 py-1 font-mono text-xs" aria-label="Close HoloKai uplink">Close</button>
      </div>
      <p className="py-4 text-sm leading-relaxed text-white/80">{payload.inference}</p>
      <ul className="space-y-1 font-mono text-[9px] text-white/70">{payload.evidence.map((item) => <li key={item}>EVIDENCE // {item}</li>)}</ul>
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 font-mono text-[9px] uppercase tracking-widest text-white/45"><span>{payload.source} · {payload.grounded ? "grounded" : "unverified"}</span><button type="button" onClick={() => void dispatchInference()} className="text-white/70 hover:text-white">Re-run inference</button></div>
    </aside>
  );
}
