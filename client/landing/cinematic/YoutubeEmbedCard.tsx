import React, { useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";

export interface YoutubeEmbedCardProps {
  videoId?: string;
  title?: string;
  channelTitle?: string;
  thumbnailUrl?: string;
  className?: string;
}

export function YoutubeEmbedCard({
  videoId = "dQw4w9WgXcQ",
  title = "FeexSystems World Model Architectural Walkthrough",
  channelTitle = "FEEXSYSTEMS Official",
  thumbnailUrl,
  className,
}: YoutubeEmbedCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div
      className={cn(
        "group relative w-full max-w-3xl mx-auto rounded-none overflow-hidden border border-white/15 bg-black shadow-[0_20px_50px_rgba(255,255,255,0.05)] select-none",
        className
      )}
    >
      {/* Ambient Bleed */}
      <div className="absolute -inset-1 bg-white/5 rounded-none blur-xl opacity-40 group-hover:opacity-70 transition-opacity pointer-events-none" />

      <div className="relative aspect-video w-full bg-[#08090f] flex items-center justify-center overflow-hidden">
        {isPlaying ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        ) : (
          <div
            onClick={() => setIsPlaying(true)}
            className="relative w-full h-full flex flex-col justify-between p-6 cursor-pointer group/play bg-gradient-to-t from-black/90 via-black/40 to-black/20"
          >
            {/* Background Thumbnail */}
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover -z-10 group-hover/play:scale-105 transition-transform duration-500"
              />
            )}

            {/* Top Channel Tag */}
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-none text-[10px] font-mono font-bold bg-white/10 text-white border border-white/20">
                YOUTUBE
              </span>
              <span className="text-xs font-mono text-gray-300">{channelTitle}</span>
            </div>
            
            {/* Center Play Button */}
            <div className="self-center flex items-center justify-center w-16 h-16 rounded-full bg-white/20 border border-white/30 text-white shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover/play:scale-110 transition-transform backdrop-blur-sm">
              <Play className="w-7 h-7 fill-white translate-x-0.5" />
            </div>

            {/* Bottom Title */}
            <div>
              <h4 className="font-mono text-sm sm:text-base font-bold text-white group-hover/play:text-gray-300 transition-colors">
                {title}
              </h4>
              <p className="text-xs text-gray-400 mt-1">Click to stream live video</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default YoutubeEmbedCard;
