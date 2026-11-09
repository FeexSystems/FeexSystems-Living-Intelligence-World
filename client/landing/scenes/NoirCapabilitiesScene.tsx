import type { ReactNode } from 'react';
import { CinematicScene } from '../components/CinematicScene';
import { Effect } from '../effects/EffectGate';
import { PLANETARY_ECOSYSTEMS } from '../../world-model';
import { cn } from '@/lib/utils';

/**
 * Capabilities scene — canonical FeexSystems metrics, the world index, card
 * stacks, flip deck, evidence pipeline and FAQ. Every value is projected from
 * PLANETARY_ECOSYSTEMS or fixed FeexSystems surface copy; no third-party
 * branding. Appended after the seven canonical cinematic scenes.
 */

const POSTERS = [
  '/media/landing/scenes/hero-poster.webp',
  '/media/landing/scenes/galaxy-poster.webp',
  '/media/landing/scenes/systems-poster.webp',
  '/media/landing/scenes/worlds-poster.webp',
  '/media/landing/scenes/missions-poster.webp',
  '/media/landing/scenes/convergence-poster.webp',
  '/media/landing/scenes/ui-loops-poster.webp',
];

const worldIndexItems = PLANETARY_ECOSYSTEMS.map((world, i) => ({
  client: world.name,
  platform: world.category,
  services: world.tagline,
  img: POSTERS[i % POSTERS.length],
}));

const stackCards = PLANETARY_ECOSYSTEMS.slice(0, 6).map((world, i) => ({
  quote: world.name,
  tag: world.category,
  bg: `linear-gradient(155deg, #0b0b0b 0%, #1a1a1a ${30 + i * 8}%, #050505 100%)`,
  accent: '#a3a3a3',
}));

const flipItems = PLANETARY_ECOSYSTEMS.slice(0, 5).map((world, i) => ({
  id: i,
  image: POSTERS[(i + 2) % POSTERS.length],
  alt: `${world.name} cinematic projection`,
  title: world.name,
  meta: `${world.category} // WORLD ${String(i + 1).padStart(2, '0')}`,
  description: world.description || world.tagline,
  caption: world.status,
}));

const FAQS: { id: string; q: string; a: string }[] = [
  {
    id: 'q1',
    q: 'What is the FeexSystems World Model?',
    a: 'A database-backed graph of the FeexSystems ecosystem — projects, repositories, artifacts and technologies as first-class entities with traceable evidence.',
  },
  {
    id: 'q2',
    q: 'How does the Evidence Ledger work?',
    a: 'Every claim links to implementation evidence: GitHub repository, branch, commit SHA, file path and observation timestamp. Nothing is asserted without provenance.',
  },
  {
    id: 'q3',
    q: 'What can the AI Navigator answer?',
    a: 'Grounded questions over the canonical graph — retrieval is evidence-first and provider-neutral, so answers cite the world model rather than inventing facts.',
  },
  {
    id: 'q4',
    q: 'What is Omni Command?',
    a: 'An agent orchestration surface that runs commands against the living world model and streams its reasoning trace in real time.',
  },
  {
    id: 'q5',
    q: 'Which surfaces are public?',
    a: 'The landing, projects, navigator, world, evidence and omni surfaces are accessible to guests. Dashboard and admin routes require authentication.',
  },
];

function Panel({
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
        <span className="font-mono text-[9px] uppercase tracking-[.25em] text-white/50">{index}</span>
        <span className="font-mono text-[9px] uppercase tracking-[.25em] text-white/80">{label}</span>
      </header>
      <div className="flex-1 p-5">{children}</div>
      <footer className="border-t border-white/10 px-5 py-3">
        <p className="font-mono text-[9px] uppercase leading-relaxed tracking-[.18em] text-white/45">{caption}</p>
      </footer>
    </article>
  );
}

export function NoirCapabilitiesScene() {
  return (
    <CinematicScene
      id="fx-capabilities"
      title="CAPABILITIES"
      subtitle="Canonical metrics, the world index, evidence pipeline and platform FAQ."
      videoSrc="/media/landing/scenes/ui-loops.webm"
      titleNode={
        <Effect
          name="glowing-text"
          fallback="CAPABILITIES"
          eyebrow="FEEXSYSTEMS // CAPABILITIES"
          text="CAPABILITIES"
          textColor="#fafafa"
          glowColor="#d4d4d4"
          backgroundColor="transparent"
          fontSize={38}
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0"
        />
      }
      subtitleNode={
        <Effect
          name="pixel-text-fill"
          fallback="Canonical metrics, the world index, evidence pipeline and platform FAQ."
          staticMode
          text="Canonical metrics, the world index, evidence pipeline and platform FAQ."
          textColor="#fafafa"
          primaryColor="#e5e5e5"
          dimColor="#262626"
          backgroundColor="transparent"
          fontSize={0.8}
          fontWeight={500}
          textAlign="left"
          maxWidth={100}
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0"
        />
      }
    >
      {/* Canonical counters — animate on mount (div-scrolled surface). */}
      <Panel
        index="CAP/01"
        label="Canonical Metrics"
        caption="Counts projected from the registry — not marketing numbers."
        className="mt-8"
      >
        <Effect
          name="number-counter"
          exportName="NumberCounterOne"
          fallback={
            <div className="flex gap-10 font-mono text-sm text-white/80">
              <span>9 WORLDS</span>
              <span>5 SURFACES</span>
              <span>7 SCENES</span>
            </div>
          }
          immediate
          stats={[
            { value: '9', suffix: ' WORLDS' },
            { value: '5', suffix: ' SURFACES' },
            { value: '7', suffix: ' CINEMATIC SCENES' },
          ]}
          textColor="#fafafa"
          textSize="text-4xl lg:text-5xl"
          fontWeight="medium"
          duration={1.6}
          stagger={0.12}
          className="!min-h-0"
        />
      </Panel>

      {/* Canonical world index — hover a row to preview its projection. */}
      <Panel
        index="CAP/02"
        label="World Index"
        caption="Every canonical ecosystem from PLANETARY_ECOSYSTEMS."
        className="mt-4"
      >
        <Effect
          name="interactive-list-preview"
          fallback={
            <ul className="grid grid-cols-1 gap-2 font-mono text-[10px] uppercase tracking-widest text-white/60 sm:grid-cols-2">
              {PLANETARY_ECOSYSTEMS.map((world) => (
                <li key={world.id} className="border-b border-white/10 py-2">{world.name}</li>
              ))}
            </ul>
          }
          items={worldIndexItems}
          title="Canonical Worlds"
          subtitle="Hover a world to preview its cinematic projection"
          className="py-4"
        />
      </Panel>

      <div className="mt-4 grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
        {/* World card stack — fan out on hover. */}
        <Panel
          index="CAP/03"
          label="World Stack"
          caption="The ecosystem as a tactile deck — hover to fan the cards."
        >
          <Effect
            name="hover-stack"
            fallback={
              <div className="flex flex-wrap gap-2">
                {stackCards.map((card) => (
                  <span key={card.quote} className="rounded-md border border-white/15 px-3 py-2 font-mono text-[9px] uppercase tracking-widest text-white/60">
                    {card.quote}
                  </span>
                ))}
              </div>
            }
            cards={stackCards}
            cardWidth={240}
            cardHeight={140}
            borderColor="#a3a3a3"
            accentColor="#fafafa"
            className="flex min-h-[220px] items-center justify-center"
          />
        </Panel>

        {/* Evidence → Intelligence → World pipeline. */}
        <Panel
          index="CAP/04"
          label="Pipeline"
          caption="How canonical state becomes an explorable world."
        >
          <Effect
            name="timeline"
            fallback={
              <ol className="space-y-3 font-mono text-[10px] uppercase tracking-widest text-white/60">
                <li>EVIDENCE → INGEST</li>
                <li>GRAPH → TOPOLOGY</li>
                <li>MODEL → REASONING</li>
                <li>PROJECTION → SPATIAL</li>
              </ol>
            }
            staticMode
            title="Evidence → Intelligence → World"
            periodLabel="CANONICAL PIPELINE"
            textColor="#fafafa"
            mutedTextColor="#a3a3a3"
            activeColor="#fafafa"
            backgroundColor="transparent"
          />
        </Panel>
      </div>

      <div className="mt-4 grid w-full grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Capability flip deck. */}
        <Panel
          index="CAP/05"
          label="Flip Deck"
          caption="Five canonical worlds as a cinematic card stack."
          className="lg:col-span-3"
        >
          <Effect
            name="gsap-flip-card"
            fallback={
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {flipItems.map((item) => (
                  <img key={item.id} src={item.image} alt={item.alt} className="h-24 w-full rounded-lg border border-white/10 object-cover" />
                ))}
              </div>
            }
            items={flipItems}
            title="Canonical Worlds"
            meta="FEEXSYSTEMS // WORLD DECK"
            description="A deck of the living ecosystem — tap a frame to promote it."
            backgroundColor="#0a0a0a"
            textColor="#fafafa"
            mutedColor="#a3a3a3"
            heroWidth={420}
            heroHeight={520}
            thumbWidth={86}
            thumbHeight={104}
            className="!h-[62vh] !min-h-[430px]"
          />
        </Panel>

        {/* Platform FAQ. */}
        <Panel
          index="CAP/06"
          label="FAQ"
          caption="Straight answers about the canonical model."
          className="lg:col-span-2"
        >
          <Effect
            name="animated-faq"
            exportName="FAQGroup"
            fallback={
              <dl className="space-y-4">
                {FAQS.map((faq) => (
                  <div key={faq.id}>
                    <dt className="font-mono text-[10px] uppercase tracking-widest text-white/80">{faq.q}</dt>
                    <dd className="mt-1 text-xs leading-relaxed text-white/50">{faq.a}</dd>
                  </div>
                ))}
              </dl>
            }
            allowMultiple
            className="space-y-3"
          >
            {FAQS.map((faq) => (
              <Effect
                key={faq.id}
                name="animated-faq"
                exportName="FAQWrapper"
                itemId={faq.id}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3"
                titleClassName="font-mono text-[10px] uppercase tracking-widest text-white/85"
                contentClassName="pt-2 text-xs leading-relaxed text-white/55"
                iconSize={14}
              >
                <Effect
                  name="animated-faq"
                  exportName="FAQTitle"
                  className="pb-0"
                >
                  {faq.q}
                </Effect>
                <Effect name="animated-faq" exportName="FAQContent">
                  {faq.a}
                </Effect>
              </Effect>
            ))}
          </Effect>
        </Panel>
      </div>
    </CinematicScene>
  );
}
