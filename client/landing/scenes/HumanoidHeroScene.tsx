import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSceneVisibility } from "../hooks/useSceneVisibility";
import { useHumanoidState } from "../hooks/useHumanoidState";
import {
  HUMANOID_STATUS,
  type HumanoidState,
} from "../config/humanoid.config";
import { HumanoidStage } from "../components/humanoid/HumanoidStage";
import { getWorlds } from "../world/WorldModel";
import { useLabState } from "@/hooks/lab/useLabState";
import { useLabNavigation } from "@/hooks/lab/useLabNavigation";
import { useLabSelection } from "@/hooks/lab/useLabSelection";
import { getLabZone, type LabZoneId } from "@/lib/lab/lab-zones";
import { LAB_ZONE_IDS, type LabNodeId } from "@/lib/lab/lab-zone-graph";
import {
  getLabZoneEvidence,
  getLabCharacterEvidence,
  getLabRegistryRevision,
  isLabProjectionStale,
} from "@/lib/lab/lab-world-model";

/**
 * HumanoidHeroScene — Scene 01
 *
 * The humanoid is the first thing a visitor experiences: a rigged glTF
 * character on a React Three Fiber stage, framed by a three-zone composition
 * (identity left, character centre-right, contextual inspector right).
 *
 * Honesty contract: every status label reflects real component state. The
 * character is a local visual simulation — no AI reasoning, telemetry or
 * actuation is implied anywhere in this scene.
 */

type ModelStatus = "loading" | "ready" | "error";

const STATE_LABELS: Record<HumanoidState, string> = {
  idle: "IDLE",
  attention: "ATTENTION",
  observe: "OBSERVE",
  welcome: "WELCOME",
  explain: "EXPLAIN",
  disabled: "DISABLED",
};

export function HumanoidHeroScene() {
  const reducedMotion = useReducedMotion();
  const { ref: sectionRef, visible } = useSceneVisibility<HTMLElement>();
  const humanoid = useHumanoidState({ reducedMotion });
  const labState = useLabState();
  const labNav = useLabNavigation({ reducedMotion });
  const labSelection = useLabSelection();
  const [modelStatus, setModelStatus] = useState<ModelStatus>("loading");
  const [modelError, setModelError] = useState<string | null>(null);

  const handleModelLoaded = useCallback(() => setModelStatus("ready"), []);
  const handleModelError = useCallback((reason: string) => {
    setModelStatus("error");
    setModelError(reason);
  }, []);

  const worldCount = getWorlds().length;

  // Phase 7 — World Model read projection for the inspector.
  const activeZoneId =
    labState.activeZone ??
    (labNav.state.targetZone &&
    LAB_ZONE_IDS.includes(labNav.state.targetZone as LabZoneId)
      ? (labNav.state.targetZone as LabZoneId)
      : null);
  const evidenceRefs = activeZoneId
    ? getLabZoneEvidence(activeZoneId)
    : [getLabCharacterEvidence()];
  const registryRevision = getLabRegistryRevision();
  const projectionStale = isLabProjectionStale();

  return (
    <section
      ref={sectionRef}
      id="humanoid-hero"
      aria-label="Scene 1 of 12: FEEX sovereign synthetic hero"
      data-testid="humanoid-hero"
      className="relative h-screen w-full snap-start snap-always overflow-hidden bg-[#050505] text-white"
      onPointerEnter={() => humanoid.setAttention(true)}
      onPointerLeave={() => humanoid.setAttention(false)}
    >
      {/* 3D stage — decorative to AT; all meaning lives in the DOM overlay. */}
      <HumanoidStage
        state={humanoid.state}
        clip={humanoid.clip}
        visible={visible}
        reducedMotion={reducedMotion}
        onModelLoaded={handleModelLoaded}
        onModelError={handleModelError}
        lab={{
          nav: labNav,
          onHotspotActivate: (hotspot) => {
            labSelection.activate(hotspot, {
              onNavigate: (zoneId) => {
                labNav.navigate(zoneId);
                labState.markVisited(zoneId);
              },
              onInspect: (zoneId) => labState.markInspected(zoneId),
            });
          },
        }}
      />

      {/* Legibility gradient behind the content zones only. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/70 via-black/20 to-transparent"
      />

      {/* ── Left zone: identity, headline, actions ─────────────────────── */}
      <div className="absolute inset-x-0 top-0 z-10 flex h-full flex-col justify-center px-5 pb-24 pt-24 sm:px-8 lg:pr-[46%] xl:pr-[42%]">
        <div className="max-w-xl">
          <p className="mb-5 font-mono text-[10px] font-semibold tracking-[0.35em] text-white/70">
            FEEXSYSTEMS <span className="text-white/50">//</span> LIVING
            INTELLIGENCE
          </p>
          <h1 className="text-[clamp(2.6rem,5.2vw,4.6rem)] font-semibold uppercase leading-[0.98] tracking-tight">
            Build Intelligent
            <br />
            Worlds.
          </h1>
          <p className="mt-6 max-w-md font-mono text-sm leading-relaxed text-white/70">
            A planetary intelligence interface connecting systems, knowledge,
            agents and embodied experiences.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/world"
              className="border border-white/40 bg-white/10 px-6 py-3 font-mono text-xs font-semibold tracking-widest text-white backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:border-white/60 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-white"
            >
              ENTER FEEX WORLD
            </Link>
            <a
              href="#systems"
              className="border border-white/25 bg-black/40 px-6 py-3 font-mono text-xs font-semibold tracking-widest text-white/80 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/50 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-white"
            >
              EXPLORE THE SYSTEMS
            </a>
          </div>

          {/* Zone navigation dock — deterministic waypoint travel.
              Accessible names are prefixed with the LAB scope so they cannot
              collide with global landing controls (e.g. the "Command" button
              that opens the FEEX command launcher). */}
          <nav
            aria-label="Laboratory zones"
            className="mt-8 flex flex-wrap items-center gap-1.5"
          >
            <span className="mr-1 font-mono text-[9px] tracking-[0.3em] text-white/50">
              LAB
            </span>
            {(
              [
                ["overview", "OVERVIEW"],
                ["humanoid", "HUMANOID"],
                ...LAB_ZONE_IDS.map((id) => [
                  id,
                  getLabZone(id).short,
                ]),
              ] as [LabNodeId, string][]
            ).map(([nodeId, label]) => {
              const isZone = LAB_ZONE_IDS.includes(nodeId as LabZoneId);
              const zoneState = isZone
                ? labState.zones.find((z) => z.zoneId === nodeId)
                : null;
              const active = labNav.state.targetZone === nodeId;
              const accessibleName = isZone
                ? `LAB ${getLabZone(nodeId as LabZoneId).name}`
                : `LAB ${label}`;
              return (
                <button
                  key={nodeId}
                  type="button"
                  aria-label={accessibleName}
                  onClick={() => {
                    labNav.navigate(nodeId);
                    if (isZone) labState.markVisited(nodeId as LabZoneId);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "border px-2.5 py-1 font-mono text-[9px] tracking-[0.18em] transition-colors",
                    active
                      ? "border-white/70 bg-white/15 text-white"
                      : "border-white/15 text-white/55 hover:border-white/40 hover:text-white/85",
                    "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-white"
                  )}
                >
                  {label}
                  {zoneState && zoneState.status !== "unvisited" ? " •" : ""}
                </button>
              );
            })}
          </nav>

          {/* Interaction prompts — deterministic local intents only.
              OBSERVE is an inspection intent: the loaded rollback GLB ships no
              dedicated Observe clip, so the character holds the Idle stance.
              The label states that rather than implying a distinct animation. */}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="mr-1 font-mono text-[9px] tracking-[0.3em] text-white/50">
              INTERACT
            </span>
            {(
              [
                ["welcome", "GREET", humanoid.greet],
                ["observe", "OBSERVE · INSPECT", humanoid.observe],
                ["explain", "EXPLAIN", humanoid.explain],
              ] as const
            ).map(([key, label, handler]) => (
              <button
                key={key}
                type="button"
                onClick={handler}
                disabled={reducedMotion || modelStatus !== "ready"}
                title={
                  key === "observe"
                    ? "Inspection intent — no dedicated Observe clip; holds Idle"
                    : undefined
                }
                className={cn(
                  "border px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] transition-colors",
                  "border-white/20 text-white/70 hover:border-white/50 hover:text-white",
                  "focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-white",
                  "disabled:cursor-not-allowed disabled:opacity-35"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right zone: contextual world inspector ────────────────────── */}
      <aside
        aria-label="Humanoid world inspector"
        className="absolute right-5 top-1/2 z-10 hidden w-64 -translate-y-1/2 border border-white/10 bg-black/55 p-5 backdrop-blur-md xl:right-8 xl:block 2xl:w-72"
      >
        <p className="font-mono text-[9px] tracking-[0.3em] text-white/50">
          WORLD INSPECTOR
        </p>
        <dl className="mt-4 space-y-3 font-mono text-[10px] tracking-widest">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-white/45">IDENTITY</dt>
            <dd className="text-right text-white/85">{HUMANOID_STATUS.identity}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-white/45">KIND</dt>
            <dd className="text-right text-white/85">{HUMANOID_STATUS.presentation}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-white/45">STATE</dt>
            <dd className="text-right text-white">
              {STATE_LABELS[humanoid.state]}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-white/45">MODEL</dt>
            <dd className="text-right text-white/85">
              {modelStatus === "ready"
                ? "GLB / RIGGED"
                : modelStatus === "error"
                  ? "LOAD FAILED"
                  : "LOADING"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-white/45">WORLDS</dt>
            <dd className="text-right text-white/85">
              {worldCount} CANONICAL
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-white/45">ZONE</dt>
            <dd className="text-right text-white/85">
              {labState.activeZone
                ? getLabZone(labState.activeZone).name.toUpperCase()
                : labNav.state.targetZone &&
                    LAB_ZONE_IDS.includes(labNav.state.targetZone as LabZoneId)
                  ? getLabZone(labNav.state.targetZone as LabZoneId).name.toUpperCase()
                  : "ATRIUM"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-white/45">VISITED</dt>
            <dd className="text-right text-white/85">
              {labState.zones.filter((z) => z.visited).length}/
              {LAB_ZONE_IDS.length}
            </dd>
          </div>
        </dl>

        {/* Evidence Fabric read projection — canonical refs only. */}
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="font-mono text-[9px] tracking-[0.3em] text-white/50">
            EVIDENCE{" "}
            {projectionStale && (
              <span className="text-white/70">[STALE — {registryRevision}]</span>
            )}
          </p>
          <ul className="mt-3 space-y-2 font-mono text-[9px] leading-relaxed">
            {evidenceRefs.slice(0, 4).map((ref) => (
              <li key={`${ref.kind}:${ref.id}`} className="text-white/60">
                <span
                  className={cn(
                    "mr-1.5 inline-block px-1 py-px text-[8px] tracking-widest",
                    ref.verified
                      ? "bg-white/15 text-white/85"
                      : "border border-white/20 text-white/45"
                  )}
                >
                  {ref.evidenceClass}
                </span>
                {ref.label}
              </li>
            ))}
          </ul>
          <p className="mt-3 font-mono text-[8px] tracking-[0.15em] text-white/55">
            REGISTRY {registryRevision}
            {projectionStale ? " · STALE" : ""} · READ ONLY
          </p>
        </div>

        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="font-mono text-[9px] leading-relaxed tracking-[0.2em] text-white/50">
            {HUMANOID_STATUS.simulation}
            <br />
            {HUMANOID_STATUS.actuation}
          </p>
        </div>
      </aside>

      {/* ── Bottom status strip ────────────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-5 pb-6 font-mono text-[9px] tracking-[0.25em] text-white/45 sm:px-8">
        <span>
          FEEX SOVEREIGN <span className="text-white/50">/</span>{" "}
          {STATE_LABELS[humanoid.state]}
        </span>
        <span className="hidden sm:inline">
          {HUMANOID_STATUS.simulation}{" "}
          <span className="text-white/50">/</span>{" "}
          {HUMANOID_STATUS.actuation}
        </span>
        <span className="text-white/60">SCROLL TO EXPLORE ↓</span>
      </div>

      {modelStatus === "error" && (
        <p className="absolute bottom-16 left-5 z-10 font-mono text-[9px] tracking-widest text-white/55 sm:left-8">
          CHARACTER UNAVAILABLE{modelError ? ` — ${modelError}` : ""}
        </p>
      )}
    </section>
  );
}
