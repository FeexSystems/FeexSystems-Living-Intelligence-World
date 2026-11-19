import { useState } from "react";
import { CANONICAL_MISSIONS } from "../../../src/data/canonicalRegistry";
import { useHoloKai } from "../../../src/context/HoloKaiContext";
import { HoloKaiRoboticCore } from "../../../src/components/holokai/HoloKaiRoboticCore";
import { AccessibleDisplayHeading } from "../components/AccessibleDisplayHeading";
import { CinematicScene } from "../components/CinematicScene";

const PILLAR_NAMES = [
  "AI OPERATIONS ENGINE",
  "MULTI-TENANT AI GATEWAY",
  "CANONICAL GRAPH INTERPRETER",
  "VERTICAL TELEMETRY MESH",
  "EVIDENCE-HASHED RETRIEVAL",
] as const;

const PILLAR_COPY = [
  "Provider-neutral model routing, deterministic retries, and idempotent workflow execution.",
  "Hardened ingress enforcing team-level RBAC, rate limits, and auditable access controls.",
  "Separates authoritative repository facts from probabilistic model interpretations across the canonical worlds.",
  "Domain orchestration for RentAll smart homes and FarmPlug precision agriculture.",
  "Citation-oriented document retrieval with cryptographic evidence hashing.",
] as const;

export function Section03CoreArchitecture() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { openUplink, isStreaming, alertPulse } = useHoloKai();
  const mission = CANONICAL_MISSIONS[selectedIndex];

  return (
    <CinematicScene
      id="systems"
      title="CORE ARCHITECTURE"
      subtitle="Five AI Core products. Single tenancy boundary. Production-ready."
      videoSrc="/media/landing/scenes/systems.webm"
      titleNode={<AccessibleDisplayHeading>CORE ARCHITECTURE</AccessibleDisplayHeading>}
    >
      <div className="mt-8 w-full space-y-5" data-testid="core-systems-scene" data-section="03">
        <div role="tablist" aria-label="AI Core Architecture Pillars" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {CANONICAL_MISSIONS.map((item, index) => (
            <button
              key={item.id}
              id={`architecture-pillar-${item.id}`}
              type="button"
              role="tab"
              aria-selected={selectedIndex === index}
              aria-controls="architecture-pillar-detail"
              tabIndex={selectedIndex === index ? 0 : -1}
              onClick={() => setSelectedIndex(index)}
              className={`min-w-0 border px-3 py-3 text-left font-mono transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${selectedIndex === index ? "border-white bg-white text-black font-bold" : "border-white/10 bg-black/50 text-white/55 hover:border-white/35 hover:text-white"}`}
            >
              <span className="block text-[9px] tracking-widest text-white/70">{item.id} · {item.title.toUpperCase()}</span>
              <span className="mt-1 block text-[10px] font-semibold leading-snug">{PILLAR_NAMES[index]}</span>
            </button>
          ))}
        </div>

        <div className="grid w-full grid-cols-1 gap-4 rounded-xl border-white/15 bg-black/60 p-4 backdrop-blur-xl lg:grid-cols-12 lg:p-6">
          <div id="architecture-pillar-detail" role="tabpanel" tabIndex={0} aria-labelledby={`architecture-pillar-${mission.id}`} className="flex min-w-0 flex-col justify-between gap-6 lg:col-span-7">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[.24em] text-white/60">MISSION {mission.id} // {mission.title}</p>
              <h3 className="mt-3 font-mono text-xl font-semibold leading-tight tracking-wide text-white sm:text-2xl">{PILLAR_NAMES[selectedIndex]}</h3>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">{PILLAR_COPY[selectedIndex]}</p>
              <div className="mt-5 flex-wrap gap-2" aria-label="Architecture verification badges">
                <span className="rounded-sm border-white/40 bg-white/[0.04] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wider text-white/80">Verified · Tenant Isolation (RBAC)</span>
                <span className="rounded-sm border-white/40 bg-white/[0.04] px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wider text-white/80">Verified · AI Core Launch</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 font-mono text-[9px] uppercase tracking-widest">
              <button type="button" onClick={() => openUplink(`Inspect Mission ${mission.id} ${mission.title} using canonical evidence.`)} className="border border border-white bg-white px-3 py-2.5 font-bold text-black hover:bg-zinc-200">[QUERY HOLOKAI]</button>
              <a href="#05-missions" className="border border-white/20 px-3 py-2.5 text-white/75 hover:bg-white/10">[INSPECT TRACE IN 05]</a>
            </div>
          </div>

          <div className="flex min-w-0 flex-col items-center justify-center border border-white/10 bg-black/60 p-3 lg:col-span-5">
            <HoloKaiRoboticCore isStreaming={isStreaming} alertPulse={alertPulse} onCoreClick={() => openUplink(`Run a telemetry status ping for Mission ${mission.id} ${mission.title}.`)} className="h-48 w-full sm:h-56" />
            <p className="text-center font-mono text-[8px] uppercase tracking-[.18em] text-white/45">HOLOKAI SERVO CORE · DRAG TO ORBIT · CLICK TO DISPATCH</p>
          </div>
        </div>
      </div>
    </CinematicScene>
  );
}
