import type { ReactNode } from 'react';
import { CinematicScene } from '../components/CinematicScene';
import { Effect } from '../effects/EffectGate';
import { cn } from '@/lib/utils';

/**
 * NoirPrimitivesScene — Hyperiux text/button primitives in the FeexSystems
 * monochromatic noir system (white / greyscale / black only, white glow for
 * active states). Appended after the seven canonical cinematic scenes; it does
 * not alter them.
 */

function FxCard({
  index,
  label,
  children,
  className,
}: {
  index: string;
  label: string;
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
    </article>
  );
}

export function NoirPrimitivesScene() {
  return (
    <CinematicScene
      id="fx-primitives"
      title="EFFECT PRIMITIVES"
      subtitle="Hyperiux free tier — text, actions and surfaces in monochrome noir."
      videoSrc="/media/landing/scenes/ui-loops.webm"
      hideMedia
      fxLayer={
        <Effect
          name="dotted-grid"
          spacing={38}
          baseRadius={1}
          mouseRadius={110}
          backgroundColor="#050505"
          showDesktopHint={false}
          className="absolute inset-0 h-full w-full opacity-70"
        />
      }
      titleNode={
        <Effect
          name="glowing-text"
          fallback="EFFECT PRIMITIVES"
          eyebrow="HYPERIUX // FREE TIER"
          text="EFFECT PRIMITIVES"
          textColor="#fafafa"
          glowColor="#d4d4d4"
          fontSize={40}
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0"
        />
      }
    >
      <div className="mt-8 grid w-full grid-cols-1 gap-4 lg:grid-cols-3">
        <FxCard index="FX/01" label="Text — Drop">
          <Effect
            name="drop-text"
            fallback="NOIR"
            text="NOIR"
            fontSize={4}
            fontColor="#fafafa"
            backgroundColor="#050505"
            textAlign="center"
            className="!min-h-0 !h-auto w-full items-center justify-center overflow-visible px-0 py-0"
          />
        </FxCard>

        <FxCard index="FX/02" label="Text — Typing">
          <Effect
            name="typing-text"
            fallback="EVIDENCE → INTELLIGENCE → WORLD"
            lines={['EVIDENCE → INTELLIGENCE → WORLD']}
            textColor="#e5e5e5"
            cursorColor="#fafafa"
            backgroundColor="transparent"
            fontSize={0.95}
            charactersPerSecond={26}
            className="!min-h-0 !h-auto w-full items-center justify-center overflow-visible px-0 py-0"
          />
        </FxCard>

        <FxCard index="FX/03" label="Text — Focus">
          <Effect
            name="focus-text"
            fallback="CANONICAL"
            text="CANONICAL"
            fontSize={2.4}
            textColor="#fafafa"
            backgroundColor="transparent"
            showReplayButton={false}
            loop={false}
            className="!min-h-0 !h-auto w-full items-center justify-center overflow-visible px-0 py-0"
          />
        </FxCard>
      </div>

      <div className="mt-4 grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
        <FxCard index="FX/04" label="Actions — Buttons">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Effect
              name="arrow-fill-button"
              fallback={
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/80">
                  ENTER WORLD →
                </span>
              }
              href="/world"
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
              baseColor="#1c1c1c"
              sheenColor="#fafafa"
              className="px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest"
            />
          </div>
        </FxCard>

        <FxCard index="FX/05" label="Media — Pixel Reveal" className="lg:col-span-1">
          <div className="h-40 w-full overflow-hidden rounded-lg border border-white/10">
            <Effect
              name="image-pixel-reveal"
              fallback={
                <img
                  src="/media/landing/scenes/ui-loops-poster.webp"
                  alt="FeexSystems cinematic poster"
                  className="h-full w-full object-cover opacity-70"
                />
              }
              imageSrc="/media/landing/scenes/ui-loops-poster.webp"
              alt="FeexSystems cinematic poster"
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
