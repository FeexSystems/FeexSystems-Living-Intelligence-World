import React, { useState, useEffect, useRef } from "react";
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
  const [selected, setSelected] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const descriptions: Record<string, string> = {
    '/world': 'Explore the canonical world model',
    '/navigator': 'Search the evidence-backed graph',
    '/omni': 'Reason across the World Model',
    '/evidence': 'Inspect provenance and source evidence',
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((current) => (current + (e.key === 'ArrowDown' ? 1 : COMMAND_SHORTCUTS.length - 1)) % COMMAND_SHORTCUTS.length);
      }
      if (e.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>('button, input');
        if (!focusables?.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
      inputRef.current?.focus();
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (open) previousFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const runCommand = () => {
    const value = command.trim().toLowerCase();
    const target = ROUTE_ALIASES[value] ?? (value ? undefined : COMMAND_SHORTCUTS[selected]);
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="FEEX command launcher" className="w-full max-w-2xl overflow-hidden rounded-xl border-white/25 bg-[#070707] shadow-[0_30px_120px_rgba(0,0,0,.7)]">
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
          <div className="flex items-center gap-3 rounded-xl border border-white/25 bg-black px-4 py-4 focus-within:border-white/60">
            <span className="font-mono text-white/30" aria-hidden="true">$</span>
            <input
              ref={inputRef}
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="type /world, /navigator, /omni or /evidence"
              aria-label="Command input"
              className="w-full bg-transparent font-mono text-sm text-white outline-none placeholder:text-white/20"
            />
          </div>

          <div className="mt-4 grid gap-1" role="listbox" aria-label="Routes">
            {COMMAND_SHORTCUTS.map((route) => (
              <button
                key={route}
                type="button"
                onClick={() => go(route)}
                onMouseEnter={() => setSelected(COMMAND_SHORTCUTS.indexOf(route))}
                aria-label={route}
                aria-selected={selected === COMMAND_SHORTCUTS.indexOf(route)}
                className="flex justify-between gap-3 border border-white/[.07] px-3 py-3 text-left font-mono text-[10px] text-white/70 transition hover:border-white/30 hover:text-white aria-selected:border-white/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                <span>{route.toUpperCase()}</span>
                <span className="hidden text-white/50 sm:inline">{descriptions[route]}</span>
                <span aria-hidden="true">↵</span>
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center gap-2 font-mono text-[9px] text-white/20">
            <Layers3 className="h-3.5 w-3.5" /> Router-backed navigation only. No
            simulated infrastructure output.
            <span className="ml-auto hidden sm:inline">↑↓ NAVIGATE · ENTER EXECUTE · ESC CLOSE</span>
          </div>
        </form>
      </div>
    </div>
  );
}
