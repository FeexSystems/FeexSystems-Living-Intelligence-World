import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  CircleDot,
  Command,
  Database,
  Eye,
  GitBranch,
  Globe2,
  Layers3,
  Network,
  Search,
  ShieldCheck,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { SYSTEM_WORLDS } from "@/data/systemWorlds";

const CATEGORIES = ["ALL", ...Array.from(new Set(SYSTEM_WORLDS.map((world) => world.domain.split(" / ")[0])))];

const POSITIONS = [
  { x: 50, y: 50 },
  { x: 50, y: 13 },
  { x: 78, y: 28 },
  { x: 87, y: 61 },
  { x: 66, y: 86 },
  { x: 34, y: 86 },
  { x: 13, y: 61 },
  { x: 22, y: 28 },
];

const RELATIONSHIPS = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7],
  [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 1],
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
      <span className="h-px w-8 bg-white/20" />
      {children}
    </div>
  );
}

function GlassButton({
  children,
  to,
  onClick,
  secondary = false,
}: {
  children: React.ReactNode;
  to?: string;
  onClick?: () => void;
  secondary?: boolean;
}) {
  const className = `group inline-flex items-center gap-2 rounded-full border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.18em] transition-all duration-300 ${
    secondary
      ? "border-white/10 bg-white/[0.025] text-white/65 hover:border-white/25 hover:bg-white/[0.06] hover:text-white"
      : "border-white/20 bg-white text-black hover:bg-white/90"
  }`;
  if (to) return <Link to={to} className={className}>{children}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></Link>;
  return <button onClick={onClick} className={className}>{children}<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></button>;
}

export default function Index() {
  const navigate = useNavigate();
  const [category, setCategory] = useState("ALL");
  const [selectedId, setSelectedId] = useState("08");
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [command, setCommand] = useState("");

  const filteredWorlds = useMemo(
    () =>
      SYSTEM_WORLDS.filter(
        (world) => category === "ALL" || world.domain.startsWith(category),
      ),
    [category],
  );

  const selectedWorld = SYSTEM_WORLDS.find((world) => world.id === selectedId) ?? SYSTEM_WORLDS[7];
  const selectedIndex = SYSTEM_WORLDS.findIndex((world) => world.id === selectedWorld.id);

  const runCommand = () => {
    const value = command.trim().toLowerCase();
    const routes: Record<string, string> = {
      "/world": "/world",
      "world": "/world",
      "/navigator": "/navigator",
      navigator: "/navigator",
      "/omni": "/omni",
      omni: "/omni",
      "/evidence": "/evidence",
      evidence: "/evidence",
    };
    if (routes[value]) {
      navigate(routes[value]);
      setLauncherOpen(false);
      setCommand("");
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030303] text-white selection:bg-white selection:text-black">
      <style>{`
        .feex-grid {
          background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(to bottom, black, transparent 92%);
        }
        .feex-noise {
          background-image: radial-gradient(rgba(255,255,255,.12) .6px, transparent .6px);
          background-size: 7px 7px;
          opacity: .055;
        }
        .feex-orbit { animation: feex-orbit 28s linear infinite; transform-origin: 50% 50%; }
        .feex-pulse { animation: feex-pulse 3.5s ease-in-out infinite; }
        @keyframes feex-orbit { to { transform: rotate(360deg); } }
        @keyframes feex-pulse { 0%,100% { opacity:.38; transform:scale(.96); } 50% { opacity:.8; transform:scale(1.04); } }
        @media (prefers-reduced-motion: reduce) {
          .feex-orbit, .feex-pulse { animation: none; }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="feex-grid absolute inset-0" />
        <div className="feex-noise absolute inset-0" />
        <div className="absolute left-1/2 top-[30%] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-white/[0.018] blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#030303]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-3 font-mono text-xs tracking-[0.22em]">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-white/20">
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
            FEEXSYSTEMS
          </Link>
          <div className="hidden items-center gap-7 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 md:flex">
            <a href="#world-model" className="transition hover:text-white">World Model</a>
            <a href="#architecture" className="transition hover:text-white">Architecture</a>
            <a href="#surfaces" className="transition hover:text-white">Surfaces</a>
          </div>
          <button
            onClick={() => setLauncherOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.025] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/55 transition hover:border-white/25 hover:text-white"
          >
            <Terminal className="h-3.5 w-3.5" />
            Command
          </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-[1500px] px-5 pb-20 pt-20 sm:px-8 sm:pt-28 lg:pb-28">
        <div className="grid items-end gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <SectionLabel>FEEXSYSTEMS // LIVING INTELLIGENCE WORLD</SectionLabel>
            <div className="max-w-4xl">
              <p className="mb-6 font-mono text-xs uppercase tracking-[0.35em] text-white/35">Build intelligent worlds.</p>
              <h1 className="text-[clamp(4rem,10vw,9.8rem)] font-light leading-[.82] tracking-[-0.075em]">
                FEEX<span className="text-white/35">SYSTEMS</span>
              </h1>
              <p className="mt-9 max-w-2xl text-base leading-7 text-white/55 sm:text-lg">
                A living World Model for systems, repositories, relationships and evidence.
                The canonical graph defines what exists; intelligence interprets it.
              </p>
              <p className="mt-4 max-w-2xl font-mono text-[11px] leading-6 text-white/30">
                LLM interprets the World Model; it does not become the World Model.
              </p>
            </div>
            <div className="mt-9 flex flex-wrap gap-3">
              <GlassButton to="/world">Enter FEEX World</GlassButton>
              <GlassButton secondary onClick={() => document.getElementById("world-model")?.scrollIntoView({ behavior: "smooth" })}>
                Explore 8 Systems
              </GlassButton>
              <GlassButton secondary to="/evidence">View Evidence</GlassButton>
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] border border-white/[0.08] bg-white/[0.018]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,.09),transparent_28%)]" />
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.07]" />
            <div className="feex-orbit absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/[0.08]" />
            <div className="absolute left-1/2 top-1/2 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/80 shadow-[0_0_80px_rgba(255,255,255,.08)]">
              <div className="text-center">
                <div className="font-mono text-[9px] tracking-[.28em] text-white/35">CORE</div>
                <div className="mt-1 text-sm tracking-tight">FEEX WORLD</div>
              </div>
            </div>
            {SYSTEM_WORLDS.map((world, i) => {
              const p = POSITIONS[i];
              return (
                <button
                  key={world.id}
                  onClick={() => setSelectedId(world.id)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 text-left"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  aria-label={`Select ${world.name}`}
                >
                  <span className={`block h-3 w-3 rounded-full border transition-all ${selectedId === world.id ? "scale-150 border-white bg-white shadow-[0_0_20px_rgba(255,255,255,.8)]" : "border-white/50 bg-black hover:scale-125 hover:border-white"}`} />
                  <span className="absolute left-1/2 top-5 hidden -translate-x-1/2 whitespace-nowrap font-mono text-[8px] uppercase tracking-widest text-white/35 sm:block">{world.id} // {world.name}</span>
                </button>
              );
            })}
            <div className="absolute bottom-5 left-5 font-mono text-[9px] uppercase tracking-[.25em] text-white/25">WORLD MODEL // 08 NODES // RELATIONSHIPS</div>
          </div>
        </div>
      </section>

      <section id="world-model" className="relative z-10 border-y border-white/[0.07]">
        <div className="mx-auto max-w-[1500px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
            <div>
              <SectionLabel>01 // CANONICAL WORLD MODEL</SectionLabel>
              <h2 className="max-w-xl text-4xl font-light tracking-[-.04em] sm:text-6xl">What exists is explicit.</h2>
              <p className="mt-6 max-w-lg text-sm leading-7 text-white/45">
                Eight canonical worlds form the public FEEXSYSTEMS registry. Nodes are selectable,
                relationships are visible, and category filters operate on the same registry used by the inspector.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {CATEGORIES.map((item) => (
                  <button
                    key={item}
                    onClick={() => setCategory(item)}
                    className={`rounded-full border px-3 py-2 font-mono text-[9px] uppercase tracking-[.16em] transition ${
                      category === item ? "border-white bg-white text-black" : "border-white/10 text-white/40 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="mt-10 grid max-w-lg grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/[.07] p-4"><Database className="h-4 w-4 text-white/40" /><div className="mt-5 font-mono text-xl">08</div><div className="mt-1 text-[10px] text-white/30">WORLDS</div></div>
                <div className="rounded-2xl border border-white/[.07] p-4"><Network className="h-4 w-4 text-white/40" /><div className="mt-5 font-mono text-xl">14</div><div className="mt-1 text-[10px] text-white/30">EDGES</div></div>
                <div className="rounded-2xl border border-white/[.07] p-4"><ShieldCheck className="h-4 w-4 text-white/40" /><div className="mt-5 font-mono text-xl">TRACE</div><div className="mt-1 text-[10px] text-white/30">EVIDENCE</div></div>
              </div>
            </div>

            <div className="relative min-h-[520px] rounded-[2rem] border border-white/[.07] bg-white/[.018] p-5 sm:p-8">
              <svg viewBox="0 0 100 100" className="absolute inset-8 h-[calc(100%-4rem)] w-[calc(100%-4rem)]" preserveAspectRatio="none" aria-hidden="true">
                {RELATIONSHIPS.map(([a, b]) => (
                  <line key={`${a}-${b}`} x1={POSITIONS[a].x} y1={POSITIONS[a].y} x2={POSITIONS[b].x} y2={POSITIONS[b].y} stroke="rgba(255,255,255,.12)" strokeWidth=".22" />
                ))}
              </svg>
              <div className="absolute left-1/2 top-1/2 z-10 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-black/90 text-center shadow-[0_0_60px_rgba(255,255,255,.06)]">
                <div><div className="font-mono text-[8px] tracking-[.25em] text-white/30">CORE</div><div className="mt-1 text-xs">FEEX WORLD</div></div>
              </div>
              {SYSTEM_WORLDS.map((world, i) => {
                const visible = filteredWorlds.some((w) => w.id === world.id);
                const p = POSITIONS[i];
                return (
                  <button
                    key={world.id}
                    onClick={() => setSelectedId(world.id)}
                    className={`absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${visible ? "opacity-100" : "pointer-events-none opacity-10"}`}
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  >
                    <span className={`mx-auto block h-5 w-5 rounded-full border ${selectedId === world.id ? "border-white bg-white shadow-[0_0_26px_rgba(255,255,255,.8)]" : "border-white/40 bg-[#030303] hover:border-white"}`} />
                    <span className="mt-2 block max-w-28 text-center font-mono text-[8px] uppercase leading-3 tracking-wider text-white/45">{world.id}<br />{world.name}</span>
                  </button>
                );
              })}
              <div className="absolute bottom-5 right-6 font-mono text-[9px] uppercase tracking-[.2em] text-white/20">SELECT NODE // INSPECT</div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-[1500px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <SectionLabel>02 // SELECTED WORLD INSPECTOR</SectionLabel>
            <div className="rounded-[2rem] border border-white/[.08] bg-white/[.025] p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[9px] tracking-[.22em] text-white/30">WORLD {selectedWorld.id}</div>
                  <h3 className="mt-2 text-2xl font-light tracking-tight">{selectedWorld.name}</h3>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-white/35">{selectedWorld.domain}</p>
                </div>
                <CircleDot className="h-5 w-5 text-white/50" />
              </div>
              <p className="mt-7 text-sm leading-7 text-white/50">{selectedWorld.description}</p>
              <div className="mt-7 border-t border-white/[.07] pt-6">
                <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/30">Evidence Fabric</div>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/[.07] bg-black/30 p-3">
                  <ShieldCheck className="h-4 w-4 text-white/45" />
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] text-white/65">REPOSITORY TRACE</div>
                    <div className="mt-1 truncate font-mono text-[9px] text-white/30">{selectedWorld.repo}</div>
                  </div>
                </div>
              </div>
              <div className="mt-7 flex flex-wrap gap-2">
                {selectedWorld.capabilities.map((capability) => (
                  <span key={capability} className="rounded-full border border-white/[.08] px-2.5 py-1.5 font-mono text-[8px] uppercase tracking-wider text-white/35">{capability}</span>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <GlassButton to={`/evidence?world=${selectedWorld.id}`}>Inspect World</GlassButton>
                <a href={selectedWorld.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 font-mono text-[10px] uppercase tracking-wider text-white/45 transition hover:border-white/25 hover:text-white">
                  Repository Trace <GitBranch className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/[.07] bg-white/[.018] p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[.22em] text-white/30">Relationship Graph</div>
                <div className="mt-2 text-xl font-light">How the selected world connects.</div>
              </div>
              <div className="font-mono text-[9px] text-white/25">NODE {selectedIndex + 1}/8</div>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {SYSTEM_WORLDS.filter((_, i) => i !== selectedIndex).slice(0, 6).map((world) => (
                <button key={world.id} onClick={() => setSelectedId(world.id)} className="group flex items-center justify-between rounded-2xl border border-white/[.07] bg-black/20 p-4 text-left transition hover:border-white/20 hover:bg-white/[.035]">
                  <span className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full border border-white/50 group-hover:bg-white" />
                    <span><span className="block font-mono text-[9px] text-white/30">{world.id}</span><span className="mt-1 block text-xs text-white/65">{world.name}</span></span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-white/20 transition group-hover:translate-x-1 group-hover:text-white/60" />
                </button>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-3 border-t border-white/[.07] pt-6 font-mono text-[9px] uppercase tracking-[.2em] text-white/25">
              <Eye className="h-3.5 w-3.5" /> Graph relationships remain canonical; interpretation is downstream.
            </div>
          </div>
        </div>
      </section>

      <section id="architecture" className="relative z-10 border-y border-white/[.07]">
        <div className="mx-auto max-w-[1500px] px-5 py-20 sm:px-8 lg:py-28">
          <SectionLabel>03 // INTELLIGENCE ARCHITECTURE</SectionLabel>
          <div className="grid gap-px overflow-hidden rounded-[2rem] border border-white/[.07] bg-white/[.07] md:grid-cols-3">
            {[
              { icon: Database, index: "01", title: "World Model", text: "Canonical entities, relationships and system identity. The authoritative layer of what exists." },
              { icon: Network, index: "02", title: "Graph Navigation", text: "Traverse relationships and expose context without collapsing the ecosystem into a text prompt." },
              { icon: ShieldCheck, index: "03", title: "Evidence Fabric", text: "Connect system claims to repositories, artifacts and traceable source evidence." },
            ].map(({ icon: Icon, index, title, text }) => (
              <div key={title} className="bg-[#050505] p-7 sm:p-9">
                <Icon className="h-5 w-5 text-white/45" />
                <div className="mt-10 font-mono text-[9px] tracking-[.25em] text-white/25">{index}</div>
                <h3 className="mt-2 text-2xl font-light">{title}</h3>
                <p className="mt-4 text-sm leading-7 text-white/40">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="surfaces" className="relative z-10 mx-auto max-w-[1500px] px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
          <div>
            <SectionLabel>04 // COMMAND SURFACES</SectionLabel>
            <h2 className="text-4xl font-light tracking-[-.04em] sm:text-6xl">Enter the system.</h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-white/40">Each surface has a distinct responsibility. Navigation is explicit, and the landing page does not simulate infrastructure that does not exist.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["/world", "01", "Spatial World", "Immersive planetary experience", Globe2],
              ["/navigator", "02", "Navigator", "Graph-aware intelligence", Search],
              ["/omni", "03", "Omni", "Command center", Command],
              ["/evidence", "04", "Evidence", "Evidence Fabric explorer", ShieldCheck],
            ] as const).map(([path, index, title, text, Icon]) => (
              <Link key={path as string} to={path as string} className="group rounded-[1.5rem] border border-white/[.07] bg-white/[.018] p-6 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.035]">
                <div className="flex items-center justify-between"><span className="font-mono text-[9px] tracking-[.22em] text-white/25">{index}</span>{React.createElement(Icon as React.ElementType, { className: "h-4 w-4 text-white/30 transition group-hover:text-white" })}</div>
                <h3 className="mt-12 text-xl font-light">{title} <span className="font-mono text-xs text-white/25">{path}</span></h3>
                <p className="mt-2 text-xs text-white/35">{text}</p>
                <div className="mt-7 flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest text-white/30 group-hover:text-white/60">Open surface <ArrowRight className="h-3 w-3" /></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[.07]">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-mono text-xs tracking-[.22em]">FEEXSYSTEMS</div>
            <div className="mt-2 text-xs text-white/25">Build intelligent worlds.</div>
          </div>
          <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[.18em] text-white/20">
            <Zap className="h-3.5 w-3.5" /> Canonical World Model // Evidence First
          </div>
        </div>
      </footer>

      <button
        onClick={() => setLauncherOpen(true)}
        className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/80 text-white/55 shadow-2xl backdrop-blur-xl transition hover:border-white/30 hover:text-white"
        aria-label="Open command launcher"
      >
        <Terminal className="h-4 w-4" />
      </button>

      {launcherOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-4 backdrop-blur-md sm:items-center">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#070707] shadow-[0_30px_120px_rgba(0,0,0,.7)]">
            <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[.2em] text-white/50"><Terminal className="h-4 w-4" /> FEEX COMMAND LAUNCHER</div>
              <button onClick={() => setLauncherOpen(false)} className="text-white/30 hover:text-white" aria-label="Close command launcher"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); runCommand(); }} className="p-5">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black px-4 py-4">
                <span className="font-mono text-white/30">$</span>
                <input autoFocus value={command} onChange={(e) => setCommand(e.target.value)} placeholder="type /world, /navigator, /omni or /evidence" className="w-full bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/20" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {["/world", "/navigator", "/omni", "/evidence"].map((route) => (
                  <button key={route} type="button" onClick={() => { navigate(route); setLauncherOpen(false); }} className="rounded-xl border border-white/[.07] px-3 py-3 text-left font-mono text-[9px] text-white/40 transition hover:border-white/20 hover:text-white">{route}</button>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2 font-mono text-[9px] text-white/20"><Layers3 className="h-3.5 w-3.5" /> Router-backed navigation only. No simulated infrastructure output.</div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
