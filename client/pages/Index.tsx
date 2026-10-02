import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Terminal, X, Layers3 } from "lucide-react";

import { ScrollytellingManager } from "../landing/components/ScrollytellingManager";
import { NavigationOverlay } from "../landing/components/NavigationOverlay";
import { SoundscapeController } from "../landing/components/SoundscapeController";

import { HeroScene } from "../landing/scenes/HeroScene";
import { GalaxySequenceScene } from "../landing/scenes/GalaxySequenceScene";
import { CoreSystemsScene } from "../landing/scenes/CoreSystemsScene";
import { Worlds8Scene } from "../landing/scenes/Worlds8Scene";
import { Worlds9Scene } from "../landing/scenes/Worlds9Scene";
import { MissionCapabilityScene } from "../landing/scenes/MissionCapabilityScene";
import { ConvergenceScene } from "../landing/scenes/ConvergenceScene";
import { UILoopsScene } from "../landing/scenes/UILoopsScene";

export default function Index() {
  const navigate = useNavigate();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [command, setCommand] = useState("");

  const runCommand = () => {
    const value = command.trim().toLowerCase();
    const routes: Record<string, string> = {
      "/world": "/world",
      world: "/world",
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
    <>
      <NavigationOverlay onCommandClick={() => setLauncherOpen(true)} />
      <SoundscapeController />

      <ScrollytellingManager>
        <HeroScene />
        <GalaxySequenceScene />
        <CoreSystemsScene />
        <Worlds8Scene />
        <Worlds9Scene />
        <MissionCapabilityScene />
        <ConvergenceScene />
        <UILoopsScene />
      </ScrollytellingManager>

      {launcherOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-4 backdrop-blur-md sm:items-center">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#070707] shadow-[0_30px_120px_rgba(0,0,0,.7)]">
            <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[.2em] text-white/50">
                <Terminal className="h-4 w-4" /> FEEX COMMAND LAUNCHER
              </div>
              <button
                onClick={() => setLauncherOpen(false)}
                className="text-white/30 hover:text-white"
                aria-label="Close command launcher"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runCommand();
              }}
              className="p-5"
            >
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black px-4 py-4">
                <span className="font-mono text-white/30">$</span>
                <input
                  autoFocus
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="type /world, /navigator, /omni or /evidence"
                  className="w-full bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/20"
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {["/world", "/navigator", "/omni", "/evidence"].map((route) => (
                  <button
                    key={route}
                    type="button"
                    onClick={() => {
                      navigate(route);
                      setLauncherOpen(false);
                    }}
                    className="rounded-xl border border-white/[.07] px-3 py-3 text-left font-mono text-[9px] text-white/40 transition hover:border-white/20 hover:text-white"
                  >
                    {route}
                  </button>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2 font-mono text-[9px] text-white/20">
                <Layers3 className="h-3.5 w-3.5" /> Router-backed navigation only. No simulated infrastructure output.
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
