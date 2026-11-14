import { useState } from "react";
import { Mic, MicOff, X, Activity } from "lucide-react";

interface HolokaiRobotControlProps {
  robotId: string;
  robotName: string;
  isOpen: boolean;
  onClose: () => void;
}

const ROBOT_COMMANDS = [
  "Status report",
  "Run diagnostics",
  "Execute task",
  "Calibrate arm",
  "Home position",
  "Emergency stop",
  "Resume operation",
  "Telemetry dump",
];

export function HolokaiRobotControl({
  robotId,
  robotName,
  isOpen,
  onClose,
}: HolokaiRobotControlProps) {
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (text?: string) => {
    const command = (text || inputText).trim();
    if (!command) return;
    setInputText("");
    setIsLoading(true);
    // In production, this would POST to /api/robotics/:robotId/holokai-command
    // and stream the response via SSE.
    setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/90 to-black/0 pointer-events-none"
      />

      <div className="absolute top-6 left-6 right-6 max-w-md mx-auto">
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white transition"
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 max-w-md w-full">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-bold text-white text-sm">
                Holokai \u2014 {robotName}
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">
              ROBOT ID: {robotId.slice(0, 8)}
            </span>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-white/50 uppercase">Voice Command</label>
              <div className="relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder='e.g. "Status report" or "Run diagnostics"'
                  className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-4 pr-10 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
                />
                <button
                  onClick={() => handleSubmit()}
                  disabled={isLoading || !inputText.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs text-white/40"
                >
                  TRANSMIT
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsListening((p) => !p)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? "bg-emerald-500 text-black border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.6)]"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-emerald-400 hover:border-emerald-500/30"
                }`}
                title={isListening ? "Listening… click to stop" : "Push to Talk"}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4 animate-bounce" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
              <span className="text-[10px] font-mono text-white/50">
                {isListening ? "LISTENING" : "PUSH TO TALK"}
              </span>
              {isLoading && (
                <div className="flex items-center gap-2">
                  <Activity className="h-3 w-3 animate-spin text-emerald-400" />
                  <span className="text-[10px] text-emerald-400">EXECUTING…</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <h4 className="text-[10px] font-mono text-white/40 uppercase mb-3">Quick Commands</h4>
            <div className="flex flex-wrap gap-2">
              {ROBOT_COMMANDS.map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(cmd)}
                  className="text-[10px] px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:border-emerald-500/30 hover:text-emerald-400 transition text-white/60"
                >
                  {">"} {cmd}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}