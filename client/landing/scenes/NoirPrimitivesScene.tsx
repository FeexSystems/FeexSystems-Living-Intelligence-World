import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CinematicScene } from '../components/CinematicScene';
import { Effect } from '../effects/EffectGate';
import { cn } from '@/lib/utils';

/**
 * Interface Systems scene — FeexSystems features, services and use cases
 * presented through interactive text/action primitives. Appended after the
 * seven canonical cinematic scenes; monochromatic noir only.
 */

function FxCard({
  index,
  label,
  caption,
  children,
  className,
}: {
  index: string;
  label: string;
  caption: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/60 backdrop-blur-xl',
        className
      )}
    >
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <span className="font-mono text-[9px] uppercase tracking-[.25em] text-white/50">
          {index}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[.25em] text-white/80">
          {label}
        </span>
      </header>
      <div className="flex flex-1 items-center justify-center p-6">{children}</div>
      <footer className="border-t border-white/10 px-5 py-3">
        <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[.18em] text-white/45">
          {caption}
        </p>
      </footer>
    </article>
  );
}

export function NoirPrimitivesScene() {
  const navigate = useNavigate();
  const spaNav = (to: string) => (event: ReactMouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigate(to);
  };

  return (
    <CinematicScene
      id="fx-primitives"
      title="INTERFACE SYSTEMS"
      subtitle="Features, services and use cases — projected from the canonical World Model."
      videoSrc="/media/landing/scenes/ui-loops.webm"
      titleNode={
        <Effect
          name="glowing-text"
          fallback="INTERFACE SYSTEMS"
          eyebrow="FEEXSYSTEMS // LIVING INTELLIGENCE"
          text="INTERFACE SYSTEMS"
          textColor="#fafafa"
          glowColor="#d4d4d4"
          backgroundColor="transparent"
          fontSize={38}
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0"
        />
      }
      subtitleNode={
        <Effect
          name="typing-text"
          fallback="Features, services and use cases — projected from the canonical World Model."
          lines={['Features, services and use cases — projected from the canonical World Model.']}
          textColor="#a3a3a3"
          cursorColor="#fafafa"
          backgroundColor="transparent"
          fontSize={0.85}
          charactersPerSecond={32}
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0 font-mono uppercase"
        />
      }
    >
      <div className="mt-8 grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
        <FxCard
          index="SYS/01"
          label="Feature — World Model"
          caption="Nine canonical worlds. Graph topology. Registry-backed truth."
        >
          <Effect
            name="drop-text"
            fallback="NINE WORLDS"
            text="NINE WORLDS"
            fontSize={3.4}
            fontColor="#fafafa"
            backgroundColor="transparent"
            textAlign="center"
            className="!min-h-0 !h-auto w-full items-center justify-center overflow-visible px-0 py-0"
          />
        </FxCard>

        <FxCard
          index="SYS/02"
          label="Feature — Evidence Ledger"
          caption="Every claim traces to commits, files and observed state."
        >
          <Effect
            name="typing-text"
            fallback="EVIDENCE → PROVENANCE → TRUTH"
            lines={['EVIDENCE → PROVENANCE → TRUTH']}
            textColor="#e5e5e5"
            cursorColor="#fafafa"
            backgroundColor="transparent"
            fontSize={0.95}
            charactersPerSecond={24}
            className="!min-h-0 !h-auto w-full items-center justify-center overflow-visible px-0 py-0"
          />
        </FxCard>

        <FxCard
          index="SYS/03"
          label="Feature — AI Navigator"
          caption="Grounded answers over the canonical graph — never invented facts."
          className="lg:col-span-1"
        >
          <Effect
            name="drop-text"
            fallback="GROUNDED ANSWERS"
            text="GROUNDED ANSWERS"
            fontSize={2.6}
            fontColor="#fafafa"
            backgroundColor="transparent"
            textAlign="center"
            className="!min-h-0 !h-auto w-full items-center justify-center overflow-visible px-0 py-0"
          />
        </FxCard>
      </div>

      <div className="mt-4 grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
        <FxCard
          index="SYS/04"
          label="Use Cases — Surfaces"
          caption="Enter the world model, query the navigator, run omni commands, audit evidence."
        >
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Effect
              name="arrow-fill-button"
              fallback={
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/80">
                  ENTER WORLD →
                </span>
              }
              href="/world"
              onClick={spaNav('/world')}
              btnText="ENTER WORLD"
              bgColor="#0a0a0a"
              textColor="#fafafa"
              fillBgColor="#fafafa"
              fillTextColor="#0a0a0a"
              arrowColor="#fafafa"
              className="font-mono text-[10px] uppercase tracking-widest"
            />
            <Effect
              name="scramble-link-button"
              fallback={
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/80">
                  NAVIGATOR
                </span>
              }
              href="/navigator"
              onClick={spaNav('/navigator')}
              text="NAVIGATOR"
              textColor="#a3a3a3"
              hoverColor="#fafafa"
              showArrow={false}
              className="font-mono"
              textClassName="font-mono text-[10px] uppercase tracking-widest"
            />
            <Effect
              name="shiny-button"
              fallback={
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/80">
                  OMNI COMMAND
                </span>
              }
              label="OMNI COMMAND"
              onClick={() => navigate('/omni')}
              fillColor="#111111"
              labelColor="#fafafa"
              accentColor="#d4d4d4"
              accentSoftColor="#a3a3a3"
              cornerRadius={10}
              className="px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest"
            />
            <Effect
              name="metallic-button"
              fallback={
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/80">
                  EVIDENCE
                </span>
              }
              label="EVIDENCE"
              onClick={() => navigate('/evidence')}
              baseColor="#1c1c1c"
              sheenColor="#fafafa"
              className="px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest"
            />
          </div>
        </FxCard>

        <FxCard
          index="SYS/05"
          label="Service — Cinematic Projection"
          caption="The landing itself is a projection of canonical state — video, graph and evidence."
        >
          <div className="h-40 w-full overflow-hidden rounded-lg border border-white/10">
            <Effect
              name="image-pixel-reveal"
              fallback={
                <img
                  src="/media/landing/scenes/ui-loops-poster.webp"
                  alt="FeexSystems cinematic projection"
                  className="h-full w-full object-cover opacity-70"
                />
              }
              imageSrc="/media/landing/scenes/ui-loops-poster.webp"
              alt="FeexSystems cinematic projection"
              gridSize={18}
              direction="down"
              autoScrub={false}
              className="h-full w-full"
            />
          </div>
        </FxCard>
      </div>
    </CinematicScene>
  );
}
