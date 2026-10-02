import React, { useState, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CinematicVideoProps {
  posterUrl?: string;
  videoUrl?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  onOpenTheater?: () => void;
}

export function CinematicVideo({
  posterUrl,
  videoUrl,
  title = "Living Intelligence Architecture",
  subtitle = "Interactive 3D Spatial Knowledge Galaxy & Grounded Reasoning",
  className,
  onOpenTheater,
}: CinematicVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (!videoRef.current) {
      setIsPlaying(!isPlaying);
      return;
    }
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) {
      setIsMuted(!isMuted);
      return;
    }
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <div
      className={cn(
        "group relative w-full max-w-4xl mx-auto rounded-none overflow-hidden border border-white/15 bg-black/80 shadow-[0_20px_50px_rgba(255,255,255,0.1)] select-none",
        className
      )}
    >
      {/* Ambient Glow Bleed */}
      <div className="absolute -inset-1 bg-white/10 rounded-none blur-xl opacity-50 group-hover:opacity-80 transition-opacity pointer-events-none" />

      {/* Main Video or Animated Simulated Viewport */}
      <div
        onClick={togglePlay}
        className="relative aspect-video w-full bg-gradient-to-br from-[#0a0d18] to-[#04060a] flex items-center justify-center cursor-pointer overflow-hidden"
      >
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            poster={posterUrl}
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          /* Simulated High-Tech Canvas Visualizer */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-8 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.05)_0%,transparent_70%)]">
            {/* Animated Ring Radar */}
            <div className="relative flex items-center justify-center">
              <div className={cn("w-48 h-48 rounded-full border border-white/20 animate-[ping_4s_cubic-bezier(0,0,0.2,1)_infinite]", !isPlaying && "animation-paused")} />
              <div className="absolute w-36 h-36 rounded-full border border-dashed border-white/30 animate-[spin_20s_linear_infinite]" />
              <div className="absolute w-24 h-24 rounded-full bg-white/10 backdrop-blur-sm border border-white/40 flex items-center justify-center">
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-white fill-white" />
                ) : (
                  <Play className="w-8 h-8 text-gray-300 fill-gray-300 translate-x-0.5" />
                )}
              </div>
            </div>

            {/* Soundwave Bars */}
            <div className="absolute bottom-6 flex items-end gap-1 h-8">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 rounded-full bg-white/60 transition-all duration-150",
                    isPlaying
                      ? "animate-[pulse_1s_ease-in-out_infinite]"
                      : "h-2 opacity-30"
                  )}
                  style={{
                    height: isPlaying ? `${Math.sin(i * 0.4) * 16 + 20}px` : "6px",
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Top Overlay Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-none bg-black/60 border border-white/10 backdrop-blur-md text-[11px] font-mono text-gray-300">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          4K DEMO • FEEXSYSTEMS SPATIAL
        </div>

        {/* Action Controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-gray-300 hover:text-white transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {onOpenTheater && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenTheater();
              }}
              className="p-2 rounded-full bg-black/60 border border-white/10 backdrop-blur-md text-gray-300 hover:text-white transition-colors"
              aria-label="Open fullscreen theater"
            >
              <Maximize className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bottom Metadata Info */}
        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end justify-between">
          <div>
            <h4 className="font-mono text-sm font-bold text-white">{title}</h4>
            <p className="text-xs text-gray-400 font-sans">{subtitle}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CinematicVideo;
