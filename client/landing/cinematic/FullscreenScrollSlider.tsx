import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface FullscreenSlide {
  image: string;
  title: string;
  subtitle?: string;
  category?: string;
  tagline?: string;
}

export interface FullscreenScrollSliderProps {
  slides?: FullscreenSlide[];
  showIntroOutro?: boolean;
  introText?: string;
  introSubtitle?: string;
  introVideo?: string;
  outroText?: string;
  outroSubtitle?: string;
  outroVideo?: string;
  navLabel?: string;
  showIndices?: boolean;
  vhPerSlide?: number;
  overlayOpacity?: number;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  className?: string;
}

const DEFAULT_SLIDES: FullscreenSlide[] = [
  {
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2000&q=80",
    title: "Canonical Systems Hold Sovereign Facts",
    subtitle: "WORLD MODEL ARCHITECTURE",
    category: "01 // CANONICAL DATA",
    tagline: "AI models reason, summarize, and retrieve. The database remains the immutable source of truth.",
  },
  {
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2000&q=80",
    title: "Graph Topology Over Isolated Lists",
    subtitle: "KNOWLEDGE GRAPH ENGINE",
    category: "02 // CONNECTED INTELLIGENCE",
    tagline: "Every project, repository, commit, artifact, and technology exists as a first-class traversable node.",
  },
  {
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=80",
    title: "Cryptographic Evidence Over Claims",
    subtitle: "EVIDENCE FABRIC LEDGER",
    category: "03 // PROVENANCE FABRIC",
    tagline: "Every architectural assertion is grounded in verifiable commit SHAs and live repository state.",
  },
  {
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=2000&q=80",
    title: "Provider-Neutral Reasoning Engines",
    subtitle: "AI SERVICE ABSTRACTIONS",
    category: "04 // REPLACEABLE AI",
    tagline: "Underlying LLMs can be swapped or upgraded without mutating or invalidating the World Model contracts.",
  },
  {
    image: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=2000&q=80",
    title: "Planetary Spatial Knowledge Galaxies",
    subtitle: "THREE.JS 3D INTERFACES",
    category: "05 // SPATIAL MEANING",
    tagline: "3D coordinates communicate structural relationships and architecture, not mere cosmetic decoration.",
  },
];

export function FullscreenScrollSlider({
  slides = DEFAULT_SLIDES,
  showIntroOutro = true,
  introText = "Scroll to explore the architecture of living engineering intelligence.",
  introSubtitle = "FEEXSYSTEMS // FULLSCREEN SCROLL NARRATIVE",
  introVideo = "/media/feex/feex-humanoids.mp4",
  outroText = "Canonical foundations. Living models. Uncompromising engineering rigor.",
  outroSubtitle = "FEEXSYSTEMS // END OF SCROLL RUNWAY",
  outroVideo = "/media/feex/feex-humanoid-fullbody.mp4",
  navLabel = "[ FULLSCREEN SCROLL MOTION SLIDER // SYSTEM NARRATIVE ]",
  showIndices = true,
  vhPerSlide = 120,
  overlayOpacity = 0.55,
  accentColor = "#ffffff",
  backgroundColor = "#000000",
  textColor = "#ffffff",
  className = "",
}: FullscreenScrollSliderProps) {
  const runwayRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Compute total height of the pinned runway
  const runwayHeightVh = slides.length * vhPerSlide;

  const handleScroll = useCallback(() => {
    if (!runwayRef.current) return;
    const rect = runwayRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const totalDist = rect.height - windowHeight;

    if (totalDist <= 0) return;

    // Relative distance scrolled inside the runway
    const currentDist = -rect.top;
    const progress = Math.max(0, Math.min(1, currentDist / totalDist));
    setScrollProgress(progress);

    const index = Math.min(
      Math.floor(progress * slides.length),
      slides.length - 1
    );
    setActiveSlide(index);
  }, [slides.length]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [handleScroll]);

  const scrollToSlide = (index: number) => {
    if (!runwayRef.current) return;
    const rect = runwayRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const totalDist = rect.height - window.innerHeight;
    const targetProgress = index / slides.length + 0.01;
    const targetY = scrollTop + rect.top + targetProgress * totalDist;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  const current = slides[activeSlide] || slides[0];
  const words = (current.title || "").split(" ");

  return (
    <div
      className={`relative w-full text-white font-mono select-none ${className}`}
      style={{ backgroundColor }}
    >
      {/* ---------------- INTRO SECTION (OPTIONAL) ---------------- */}
      {showIntroOutro && (
        <section className="relative w-full h-[85vh] sm:h-[95vh] flex flex-col items-center justify-center px-6 text-center border-b border-white/10 bg-[#020202] overflow-hidden">
          {introVideo && (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
              <video
                src={introVideo}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="w-full h-full object-cover transition-opacity duration-700"
                style={{ opacity: 0.75 }}
              />
              {/* Cybernetic Dark Contrast Shield Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/55 to-black/85 pointer-events-none" />
              <div className="absolute inset-0 bg-black/35 pointer-events-none" />
            </div>
          )}

          <div className="max-w-4xl space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 tracking-widest uppercase backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              {introSubtitle}
            </div>

            <h2 className="text-3xl sm:text-5xl md:text-6xl font-extralight tracking-tight leading-tight text-white">
              {introText}
            </h2>

            <div className="pt-4 text-xs tracking-widest text-white/40 uppercase flex items-center justify-center gap-3">
              <span>SCROLL DOWN TO ADVANCE</span>
              <span>↓</span>
            </div>
          </div>
        </section>
      )}

      {/* ---------------- PINNED SCROLL RUNWAY ---------------- */}
      <div
        ref={runwayRef}
        className="relative w-full"
        style={{ height: `${runwayHeightVh}vh` }}
      >
        {/* Sticky 100vh Viewport Stage */}
        <div className="sticky top-0 h-screen w-full overflow-hidden bg-black flex flex-col justify-between">
          {/* Top HUD Nav Header */}
          <div className="absolute top-0 left-0 w-full z-30 px-6 py-6 md:px-10 flex items-center justify-between pointer-events-none border-b border-white/5 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span className="text-[11px] uppercase tracking-widest text-white/80 font-bold">
                {navLabel}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-4 text-[10px] text-white/50">
              <span>FRAME {String(activeSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span>
              <span>•</span>
              <span>STAGE LOCKED</span>
            </div>
          </div>

          {/* Background Images Stack with Scale & Fade */}
          <div className="absolute inset-0 z-0">
            {slides.map((slide, idx) => {
              const isCurrent = idx === activeSlide;
              return (
                <div
                  key={slide.title + idx}
                  className="absolute inset-0 transition-all duration-1000 ease-out"
                  style={{
                    opacity: isCurrent ? 1 : 0,
                    transform: isCurrent ? "scale(1)" : "scale(1.08)",
                    zIndex: isCurrent ? 2 : 1,
                  }}
                >
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Contrast Vignette Overlay */}
                  <div
                    className="absolute inset-0 bg-black"
                    style={{ opacity: overlayOpacity }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60" />
                </div>
              );
            })}
          </div>

          {/* Center-Left Content Area (Title with Word Reveal) */}
          <div className="relative z-20 flex-1 flex flex-col justify-center px-6 sm:px-12 md:px-16 lg:px-24 max-w-4xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="space-y-4"
              >
                {/* Category & Badge */}
                {current.category && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white/10 border border-white/20 text-[10px] text-white tracking-widest uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    {current.category}
                  </div>
                )}

                {/* Subtitle */}
                {current.subtitle && (
                  <div className="text-xs sm:text-sm text-white/60 tracking-wider uppercase font-mono">
                    {current.subtitle}
                  </div>
                )}

                {/* Word-by-Word Revealed Title */}
                <h1
                  className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-tight"
                  style={{ color: textColor }}
                >
                  {words.map((word, i) => (
                    <span
                      key={i}
                      className="inline-block overflow-hidden align-top mr-2.5"
                    >
                      <motion.span
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{
                          duration: 0.5,
                          delay: i * 0.035,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="inline-block"
                      >
                        {word}
                      </motion.span>
                    </span>
                  ))}
                </h1>

                {/* Tagline / Explication */}
                {current.tagline && (
                  <p className="max-w-2xl text-xs sm:text-sm md:text-base text-white/70 font-sans leading-relaxed pt-2">
                    {current.tagline}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right Side Vertical Numeric Indicators & Progress Track */}
          {showIndices && (
            <div className="absolute right-4 sm:right-8 md:right-12 top-1/2 -translate-y-1/2 z-30 flex items-center gap-3">
              {/* Indices Numbers */}
              <div className="flex flex-col gap-3 py-2 pr-3 text-right">
                {slides.map((_, idx) => {
                  const isActive = idx === activeSlide;
                  const num = String(idx + 1).padStart(2, "0");
                  return (
                    <button
                      key={idx}
                      onClick={() => scrollToSlide(idx)}
                      className="group flex items-center justify-end gap-3 text-xs tracking-wider transition-all focus:outline-none"
                    >
                      <span
                        className="font-mono transition-all duration-300"
                        style={{
                          color: isActive ? textColor : "rgba(255,255,255,0.35)",
                          fontWeight: isActive ? 700 : 400,
                        }}
                      >
                        {num}
                      </span>
                      <span
                        className="inline-block h-[1px] transition-all duration-300 origin-right"
                        style={{
                          width: isActive ? "1.5rem" : "0.5rem",
                          backgroundColor: isActive ? accentColor : "rgba(255,255,255,0.25)",
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Continuous Vertical Scroll Track */}
              <div className="relative w-[2px] h-32 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 w-full bg-white transition-all duration-150 rounded-full"
                  style={{
                    height: "100%",
                    transform: `scaleY(${scrollProgress})`,
                    transformOrigin: "top",
                  }}
                />
              </div>
            </div>
          )}

          {/* Bottom HUD Telemetry Bar */}
          <div className="relative z-30 px-6 py-4 md:px-10 border-t border-white/10 bg-black/60 backdrop-blur-md flex flex-wrap items-center justify-between text-[11px] text-white/50">
            <div className="flex items-center gap-4">
              <span>INDEX // {String(activeSlide + 1).padStart(2, "0")} OF {String(slides.length).padStart(2, "0")}</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">VELOCITY SCROLLER</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden md:inline">CLICK NUMBERS TO TELEPORT</span>
              <span className="text-white/80 font-mono">
                PROGRESS: {(scrollProgress * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- OUTRO SECTION (OPTIONAL) ---------------- */}
      {showIntroOutro && (
        <section className="relative w-full h-[80vh] flex flex-col items-center justify-center px-6 text-center border-t border-white/10 bg-[#020202] overflow-hidden">
          {outroVideo && (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
              <video
                src={outroVideo}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="w-full h-full object-cover transition-opacity duration-700"
                style={{ opacity: 0.75 }}
              />
              {/* Cybernetic Dark Contrast Shield Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/55 to-black/85 pointer-events-none" />
              <div className="absolute inset-0 bg-black/35 pointer-events-none" />
            </div>
          )}

          <div className="max-w-3xl space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 tracking-widest uppercase backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              {outroSubtitle}
            </div>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-light tracking-tight leading-tight text-white">
              {outroText}
            </h2>

            <div className="pt-4 text-xs tracking-widest text-white/40 uppercase">
              CONTINUE DISCOVERY BELOW ↓
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
