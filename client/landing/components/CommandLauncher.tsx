import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Terminal, X, Layers3 } from "lucide-react";

/**
 * CommandLauncher
 *
 * The landing's router-backed command surface.
 *
 * Extracted from the old monolithic `Index.tsx` during Phase D so it can be
 * reviewed independently. Behaviour is unchanged: it maps a typed command to a
 * real route and navigates. It deliberately does NOT simulate infrastructure
 * output — the footer note states this explicitly.
 */

const ROUTE_ALIASES: Record<string, string> = {
  "/world": "/world",
  world: "/world",
  "/navigator": "/navigator",
  navigator: "/navigator",
  "/omni": "/omni",
  omni: "/omni",
  "/evidence": "/evidence",
  evidence: "/evidence",
};

/** Shortcut tiles rendered in the launcher footer grid. */
export const COMMAND_SHORTCUTS = ["/world", "/navigator", "/omni", "/evidence"];

export interface CommandLauncherProps {
  open: boolean;
  onClose: () => void;
}

export function CommandLauncher({ open, onClose }: CommandLauncherProps) {
  const navigate = useNavigate();
  const [command, setCommand] = useState("");

  if (!open) return null;

  const runCommand = () => {
    const value = command.trim().toLowerCase();
    const target = ROUTE_ALIASES[value];
    if (target) {
      navigate(target);
      setCommand("");
      onClose();
    }
  };

  const go = (route: string) => {
    navigate(route);
    onClose();
  };

  return (
    <div
      data-testid="command-launcher"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-4 backdrop-blur-md sm:items-center"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#070707] shadow-[0_30px_120px_rgba(0,0,0,.7)]">
        <div className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[.2em] text-white/50">
            <Terminal className="h-4 w-4" /> FEEX COMMAND LAUNCHER
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/30 hover:text-white"
            aria-label="Close command launcher"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            runCommand();
          }}
          className="p-5"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black px-4 py-4">
            <span className="font-mono text-white/30">$</span>
            <input
              autoFocus
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="type /world, /navigator, /omni or /evidence"
              aria-label="Command input"
              className="w-full bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/20"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {COMMAND_SHORTCUTS.map((route) => (
              <button
                key={route}
                type="button"
                onClick={() => go(route)}
                className="rounded-xl border border-white/[.07] px-3 py-3 text-left font-mono text-[9px] text-white/40 transition hover:border-white/20 hover:text-white"
              >
                {route}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-2 font-mono text-[9px] text-white/20">
            <Layers3 className="h-3.5 w-3.5" /> Router-backed navigation only. No
            simulated infrastructure output.
          </div>
        </form>
      </div>
    </div>
  );
}
