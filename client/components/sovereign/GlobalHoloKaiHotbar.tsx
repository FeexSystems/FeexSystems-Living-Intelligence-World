import React, { useState, useEffect } from "react";
import { Mic, Terminal, Activity, Compass, Volume2 } from "lucide-react";
import { HoloKaiVoiceModal } from "./HoloKaiVoiceModal";
import { sonikAudio } from "../../lib/sonikAudio";

export function GlobalHoloKaiHotbar() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key.toLowerCase() === "v" && (e.ctrlKey || e.altKey)) {
        e.preventDefault();
        sonikAudio.unlockAudio();
        sonikAudio.playCyberClick(1.4);
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <div className="fixed bottom-6 left-6 z-40 hidden sm:flex items-center gap-2 p-1.5 rounded-lg border border-white/15 bg-black/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] font-mono text-xs text-white">
        <span className="flex items-center gap-1.5 px-2 py-1 text-[#00ff41] bg-[#00ff41]/10 rounded border border-[#00ff41]/25">
          <Activity className="w-3.5 h-3.5 animate-pulse text-[#00ff41]" />
          <span className="font-semibold tracking-wider text-[11px]">HOLOKAI // OS</span>
        </span>
        <button
          onClick={() => {
            sonikAudio.unlockAudio();
            sonikAudio.playCyberClick(1.4);
            setIsOpen(true);
          }}
          className="flex items-center gap-2 px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all shadow-sm group"
          title="Open HoloKai Gemini Voice Uplink"
        >
          <Mic className="w-3.5 h-3.5 text-[#00ff41] group-hover:scale-110 transition-transform" />
          <span className="font-medium">VOICE UPLINK</span>
          <kbd className="ml-1 text-[10px] text-zinc-400 border border-white/20 px-1 py-0.2 rounded bg-black/40">
            Ctrl+V
          </kbd>
        </button>
      </div>

      <HoloKaiVoiceModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        activeEcosystem="FEEX WORLD OS"
      />
    </>
  );
}

export default GlobalHoloKaiHotbar;
