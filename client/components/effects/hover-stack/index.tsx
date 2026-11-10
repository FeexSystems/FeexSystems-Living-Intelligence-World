// Built using Hyperiux Vault: https://vault.hyperiux.com
import { useEffect, useMemo, useState, type CSSProperties } from "react";

type CSSVars = CSSProperties & Record<string, string | number | undefined>;

export interface HoverStackCard {
  id?: number;
  quote: string;
  tag?: string;
  bg: string;
  accent?: string;
  /** Primary card heading (rendered above the quote when provided). */
  title?: string;
  /** Secondary line — service / feature detail text. */
  detail?: string;
  /** Explicit text color for the card content (noir theming). */
  textColor?: string;
  /** Muted text color for tag/detail/footer (defaults to a derived grey). */
  mutedTextColor?: string;
  /** Footer action label (defaults to "Explore"). */
  ctaLabel?: string;
}

interface PreparedHoverStackCard extends HoverStackCard {
  _rotation: number;
  _baseX: number;
  _baseZ: number;
}

interface HoverStackCompProps {
  cards?: HoverStackCard[];
  cardWidth?: number;
  cardHeight?: number;
  overlap?: number;
  hoverLift?: number;
  pushDistance?: number;
  spread?: number;
  rotation?: number;
  duration?: number;
  borderColor?: string;
  accentColor?: string;
  className?: string;
}

const PRESET_ROTATIONS = [-8, 4, -3, 5, -4, 6, 3, -6, 2, -5];

const BREAKPOINT = 1025;

const HoverStackComp = ({
  cards = [],
  cardWidth = 280,
  cardHeight = 360,
  overlap = 92,
  hoverLift = 28,
  pushDistance = 110,
  spread = 24,
  rotation = 7,
  duration = 0.35,
  borderColor,
  accentColor,
  className = "",
}: HoverStackCompProps) => {
  const activeBorderColor = borderColor ?? accentColor ?? "transparent";
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false)
  );

  useEffect(() => {
    const checkWidth = () => {
      setIsSmallScreen(window.innerWidth < BREAKPOINT);
    };

    checkWidth();
    setHasMounted(true);

    window.addEventListener("resize", checkWidth);

    return () => {
      window.removeEventListener("resize", checkWidth);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;

    const onChange = (event: MediaQueryListEvent) => {
      setReduceMotion(event.matches);
      if (event.matches) setActiveIndex(null);
    };

    setReduceMotion(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const preparedCards: PreparedHoverStackCard[] = useMemo(() => {
    const rotationScale = rotation / 7;

    return cards.map((card, index) => {
      const presetRotation =
        PRESET_ROTATIONS[index % PRESET_ROTATIONS.length] +
        (index % 2 === 0 ? 0 : 1);

      const baseX = index * overlap;

      return {
        ...card,
        _rotation: presetRotation * rotationScale,
        _baseX: baseX,
        _baseZ: index + 1,
      };
    });
  }, [cards, overlap, rotation]);

  const getCardStyle = (card: PreparedHoverStackCard, index: number): CSSVars => {
    const isActive = activeIndex === index;
    const hasActive = activeIndex !== null;

    let x = card._baseX;
    let y = 0;
    let rotate = card._rotation;
    let zIndex = card._baseZ;
    let scale = 1;

    if (reduceMotion) {
      // No lift / push / rotate snap - only raise z-index so the card is readable.
      if (isActive) zIndex = 999;

      return {
        "--card-width": `${cardWidth}px`,
        "--card-height": `${cardHeight}px`,
        transform: `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg) scale(1)`,
        zIndex,
        transition: "none",
        background: card.bg,
        borderColor: activeBorderColor !== "transparent" ? activeBorderColor : undefined,
      };
    }

    let boxShadow;

    if (hasActive) {
      if (index < activeIndex) {
        x -= pushDistance;
        y -= spread * 0.4;
      } else if (index > activeIndex) {
        x += pushDistance;
        y += spread * 0.4;
      }

      if (isActive) {
        x = card._baseX;
        y = -hoverLift;
        rotate = 0;
        zIndex = 999;
        scale = 1.035;
        boxShadow = `0 0 0 3px ${activeBorderColor}`;
      }
    }

    const activeMs = Math.max(0, duration) * 1000;
    const transition = isActive
      ? `transform ${activeMs}ms cubic-bezier(0.22, 1.6, 0.32, 1), box-shadow ${activeMs * (900 / 700)}ms cubic-bezier(0.22, 1.6, 0.32, 1)`
      : hasActive
        ? `transform ${activeMs}ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow ${activeMs}ms cubic-bezier(0.22, 1, 0.36, 1)`
        : `transform ${activeMs * (480 / 700)}ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow ${activeMs * (380 / 700)}ms cubic-bezier(0.4, 0, 0.2, 1)`;

    return {
      "--card-width": `${cardWidth}px`,
      "--card-height": `${cardHeight}px`,
      transform: `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg) scale(${scale})`,
      zIndex,
      transition,
      background: card.bg,
      boxShadow,
      borderColor: activeBorderColor !== "transparent" ? activeBorderColor : undefined,
    };
  };

  const totalWidth =
    preparedCards.length > 0
      ? preparedCards[preparedCards.length - 1]!._baseX + cardWidth
      : cardWidth;

  if (!hasMounted) {
    return null;
  }

  return (
    <div className={`relative w-full px-[7vw] ${className}`}>
      {isSmallScreen ? (
        <div className="flex flex-col gap-[8.8vw]">
          {cards.map((card, index) => (
            <div
              key={card.id ?? index}
              className={`relative flex min-h-[58.667vw] w-full cursor-default select-none flex-col justify-between overflow-hidden rounded-[4.8vw] border border-black/10 p-[4.8vw] ${card.accent || ""}`}
              style={{
                background: card.bg,
                borderColor: activeBorderColor !== "transparent" ? activeBorderColor : undefined,
              }}
            >
              <div />

              <div className="relative z-2 flex flex-1 items-center">
                <div className="flex max-w-full flex-col gap-[1.6vw]">
                  {card.title ? (
                    <p
                      className="m-0 text-[4.5vw] font-semibold uppercase leading-[1.05] tracking-[0.08em]"
                      style={{ color: card.textColor ?? 'inherit' }}
                    >
                      {card.title}
                    </p>
                  ) : null}
                  <p
                    className="m-0 text-[4vw] max-md:text-[4.5vw] leading-[1.05] tracking-[-0.04em]"
                    style={{ color: card.textColor ?? 'inherit' }}
                  >
                    {card.quote}
                  </p>
                  {card.detail || card.tag ? (
                    <p
                      className="m-0 text-[2.4vw] uppercase leading-snug tracking-[0.14em]"
                      style={{ color: card.mutedTextColor ?? 'rgba(128,128,128,0.9)' }}
                    >
                      {card.detail ?? card.tag}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="relative z-2 flex flex-col gap-[3.2vw]">
                <div className="h-[0.267vw] w-full bg-current opacity-20" />

                <div className="flex items-center justify-between gap-[3.2vw]">
                  <div className="flex items-center gap-[2.1vw]">
                    <div
                      className="flex size-[8.5vw] items-center justify-center rounded-full border bg-black text-[0.82rem] text-white shadow-[0_0.586vw_1.367vw_rgba(0,0,0,0.12)]"
                      style={{ borderColor: card.mutedTextColor ?? 'rgba(0,0,0,0.15)' }}
                    >
                      ↗
                    </div>

                    <span
                      className="text-[2.667vw] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: card.textColor ?? 'inherit' }}
                    >
                      {card.ctaLabel ?? 'Explore'}
                    </span>
                  </div>

                  <span
                    className="text-[2.6vw] uppercase tracking-[0.16em] opacity-70"
                    style={{ color: card.mutedTextColor ?? 'inherit' }}
                  >
                    0{index + 1}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="relative mx-auto"
          style={{
            "--stack-width": `${totalWidth}px`,
            "--stack-height": `${cardHeight + (reduceMotion ? 0 : hoverLift) + 24}px`,
            width: "var(--stack-width)",
            height: "var(--stack-height)",
          } as CSSVars}
        >
          {preparedCards.map((card, index) => (
            <div
              key={card.id ?? index}
              className={`absolute left-0 top-0 flex h-[var(--card-height)] w-[var(--card-width)] origin-[center_center] cursor-pointer select-none flex-col justify-between overflow-hidden rounded-[1.667vw] border border-black/10 p-[1.667vw] will-change-transform ${card.accent || ""}`}
              style={getCardStyle(card, index)}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div />

              <div className="relative z-2 flex flex-1 items-center">
                <div className="flex max-w-[92%] flex-col gap-[0.9vw]">
                  {card.title ? (
                    <p
                      className="m-0 text-[1.35rem] font-semibold uppercase leading-tight tracking-[0.08em]"
                      style={{ color: card.textColor ?? 'inherit' }}
                    >
                      {card.title}
                    </p>
                  ) : null}
                  <p
                    className="m-0 text-[1.9rem] leading-[0.95] tracking-tighter"
                    style={{ color: card.textColor ?? 'inherit' }}
                  >
                    {card.quote}
                  </p>
                  {card.detail || card.tag ? (
                    <p
                      className="m-0 text-[0.78rem] uppercase leading-snug tracking-[0.14em]"
                      style={{ color: card.mutedTextColor ?? 'rgba(128,128,128,0.9)' }}
                    >
                      {card.detail ?? card.tag}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="relative z-2 flex flex-col gap-[1.111vw]">
                <div className="h-[0.069vw] w-full bg-current opacity-20" />

                <div className="flex items-center justify-between gap-[1.111vw]">
                  <div className="flex items-center gap-[0.556vw]">
                    <div
                      className="flex size-[2.5vw] items-center justify-center rounded-full border bg-black text-[0.9rem] text-white shadow-[0_0.417vw_0.972vw_rgba(0,0,0,0.12)]"
                      style={{ borderColor: card.mutedTextColor ?? 'rgba(0,0,0,0.15)' }}
                    >
                      ↗
                    </div>

                    <span
                      className="text-[0.833vw] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: card.textColor ?? 'inherit' }}
                    >
                      {card.ctaLabel ?? 'Explore'}
                    </span>
                  </div>

                  <span
                    className="text-[0.764vw] uppercase tracking-[0.16em] opacity-70"
                    style={{ color: card.mutedTextColor ?? 'inherit' }}
                  >
                    0{index + 1}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { HoverStackComp };

const cards: HoverStackCard[] = [
    {
        id: 1,
        quote: "A must-have for anyone looking to save time and boost productivity.",
        tag: "Efficiency",
        bg: "#E4FF1A",
        accent: "text-[#1A1A1A]",
    },
    {
        id: 2,
        quote: "This tech has completely streamlined my daily tasks.",
        tag: "Workflow",
        bg: "#DD1155",
        accent: "text-[#ffffff]",
    },
    {
        id: 3,
        quote: "Innovative and powerful, yet so easy to use!",
        tag: "Simplicity",
        bg: "#FF5714",
        accent: "text-[#1A1A1A]",
    },
    {
        id: 4,
        quote: "It made everything smoother. Highly recommend!",
        tag: "Reliability",
        bg: "#E980FC",
        accent: "text-[#1A1A1A]",
    },
    {
        id: 5,
        quote: "Fast, reliable, and user-friendly. Exactly what I needed.",
        tag: "Speed",
        bg: "#67D6A3",
        accent: "text-[#1A1A1A]",
    },
    {
        id: 6,
        quote: "I can’t imagine my workflow without it now. Simply amazing!",
        tag: "Impact",
        bg: "#3454D1",
        accent: "text-[#ffffff]",
    },
    {
        id: 7,
        quote: "Performance is a game changer. So much smoother now.",
        tag: "Performance",
        bg: "#B98CFF",
        accent: "text-[#1A1A1A]",
    },
];

interface HoverStackProps {
    cards?: HoverStackCard[];
    cardWidth?: number;
    cardHeight?: number;
    overlap?: number;
    pushDistance?: number;
    hoverLift?: number;
    spread?: number;
    rotation?: number;
    duration?: number;
    borderColor?: string;
    accentColor?: string;
}

const HoverStack = ({
    cards: cardsProp,
    cardWidth = 280,
    cardHeight = 360,
    overlap = 96,
    pushDistance = 235,
    hoverLift = 30,
    spread = 24,
    rotation = 7,
    duration = 0.35,
    borderColor = "transparent",
    accentColor,
}: HoverStackProps) => {
    const activeBorderColor = borderColor ?? accentColor ?? "transparent";
    const hasCustomCards = Array.isArray(cardsProp) && cardsProp.length > 0;
    return (
        <>
            {hasCustomCards ? (
                <HoverStackComp
                    cards={cardsProp}
                    cardWidth={cardWidth}
                    cardHeight={cardHeight}
                    overlap={overlap}
                    pushDistance={pushDistance}
                    hoverLift={hoverLift}
                    spread={spread}
                    rotation={rotation}
                    duration={duration}
                    borderColor={activeBorderColor}
                />
            ) : (
            <section className="w-full h-fit bg-[#fff9ec] py-[10%] max-md:py-[20%] overflow-hidden flex flex-col gap-[7vw] justify-center items-center">
                <div className="flex flex-col w-full justify-center items-center gap-[1vw] max-md:gap-[3vw] text-center text-[#1a1a1a]">
                <h1 className=" text-[5.5vw] max-md:text-[9vw] max-lg:text-[7vw]">
                    Hover Stack Cards
                </h1>
                <p className="text-[1.2vw] max-lg:hidden">
                    Hover any card , so they can pop out.
                </p>

                </div>

                <HoverStackComp
                    cards={cards}
                    cardWidth={cardWidth}
                    cardHeight={cardHeight}
                    overlap={overlap}
                    pushDistance={pushDistance}
                    hoverLift={hoverLift}
                    spread={spread}
                    rotation={rotation}
                    duration={duration}
                    borderColor={activeBorderColor}
                />
            </section>
            )}
        </>
    );
};

export default HoverStack;
