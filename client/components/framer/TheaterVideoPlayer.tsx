import React, { useEffect, useState, useRef } from "react";
import { X, Play, Pause, Volume2, VolumeX, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TheaterVideoPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl?: string;
  /** First-frame still — required for zero black-flash */
  poster?: string;
  title?: string;
  description?: string;
}

export function TheaterVideoPlayer({
  isOpen,
  onClose,
  videoUrl,
  poster,
  title = "FeexSystems World Model Demonstration",
  description = "A comprehensive tour through 3D Spatial Knowledge, Evidence Fabric, and Autonomous Agent Orchestration.",
}: TheaterVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(35);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reduced-motion: keep modal usable but do not autoplay cinematic loops
  useEffect(() => {
    if (!isOpen) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="relative w-full max-w-5xl rounded-none border border-white/15 bg-[#05070e] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-white/10">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">{title}</h2>
            <p className="text-xs text-zinc-400 truncate">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative aspect-video w-full bg-[#05070e] flex items-center justify-center">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              poster={poster}
              autoPlay
              muted={isMuted}
              loop
              playsInline
              preload="metadata"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 text-zinc-400">
              <p className="text-sm">No video source configured.</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              const el = videoRef.current;
              if (!el) return;
              if (isPlaying) {
                el.pause();
                setIsPlaying(false);
              } else {
                el.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
              }
            }}
            className="p-2 rounded-full hover:bg-white/10 text-white"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              const el = videoRef.current;
              if (el) el.muted = !isMuted;
              setIsMuted((m) => !m);
            }}
            className="p-2 rounded-full hover:bg-white/10 text-white"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-white/40" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TheaterVideoPlayer;
