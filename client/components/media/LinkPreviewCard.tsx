import React, { useState } from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, GitBranch, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LinkPreviewCardProps {
  children: React.ReactNode;
  url: string;
  title: string;
  description?: string;
  imageSrc?: string;
  badge?: string;
  className?: string;
}

export function LinkPreviewCard({
  children,
  url,
  title,
  description = "Authoritative entity in the FEEXSYSTEMS Living World Model.",
  imageSrc,
  badge = "EVIDENCE // GROUNDED",
  className,
}: LinkPreviewCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <HoverCardPrimitive.Root openDelay={150} closeDelay={150} onOpenChange={setIsOpen}>
      <HoverCardPrimitive.Trigger asChild>
        <span className={cn("inline-flex items-center gap-1 cursor-pointer transition-colors", className)}>
          {children}
        </span>
      </HoverCardPrimitive.Trigger>

      <HoverCardPrimitive.Content
        side="top"
        align="center"
        sideOffset={8}
        className="z-50 select-none font-mono"
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="w-72 overflow-hidden rounded-[20px] border border-white/10 bg-[#121212]/95 p-3.5 shadow-2xl backdrop-blur-2xl font-mono text-white selection:bg-white selection:text-black"
            >
              {/* Optional Thumbnail Image */}
              {imageSrc && (
                <div className="relative mb-2 aspect-video w-full overflow-hidden rounded-[10px] border border-white/10 bg-black">
                  <img src={imageSrc} alt={title} className="size-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                </div>
              )}

              {/* Card Meta Header */}
              <div className="flex items-center justify-between text-[9px] text-white/70 mb-1">
                <span className="flex items-center gap-1">
                  <Sparkles className="size-2.5 text-white/80" />
                  {badge}
                </span>
                <span className="text-white/50 flex items-center gap-0.5">
                  <GitBranch className="size-2.5" />
                  MAIN
                </span>
              </div>

              {/* Title & Description */}
              <h4 className="text-xs font-bold text-white tracking-tight truncate">{title}</h4>
              <p className="text-[10px] text-white/50 mt-1 line-clamp-2 leading-relaxed">
                {description}
              </p>

              {/* URL Action Link */}
              <a
                href={url}
                target={url.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="mt-2.5 flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-white/50 hover:text-white transition-colors"
              >
                <span className="truncate max-w-[180px]">{url.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="size-3" />
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </HoverCardPrimitive.Content>
    </HoverCardPrimitive.Root>
  );
}

export default LinkPreviewCard;
