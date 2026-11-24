import { CinematicScene } from '../components/CinematicScene';
import { CinematicHero } from '../../components/CinematicHero';
import { HumanoidHeroOverlay } from '../components/HumanoidHeroOverlay';
import { getSceneAsset } from '../registry/landingAssets';
import { Effect } from '../effects/EffectGate';
import { Link } from 'react-router-dom';
import { getWorlds } from '../world/WorldModel';

export function HeroScene() {
  const hero = getSceneAsset('hero');
  return (
    <CinematicScene
      id="hero"
      title="EXPLORE THE PLANETARY INTELLIGENCE."
      subtitle="The provider-neutral AI orchestration platform that converts code-level engineering evidence into a live, verifiable planetary world model."
      videoSrc={hero?.videoSrc ?? '/media/landing/scenes/hero.webm'}
      posterSrc={hero?.posterSrc}
      mediaLayer={
        <CinematicHero
          src={hero?.videoSrc ?? '/media/landing/scenes/hero.webm'}
          poster={hero?.posterSrc ?? '/media/landing/scenes/hero-poster.webp'}
          ariaLabel="Cinematic hero background"
        />
      }
      fxLayer={
        <>
          <HumanoidHeroOverlay />
          <Effect
            name="dot-transition"
            transparent
            dotColor="#737373"
            spacing={30}
            dotSize={2}
            maxDotSize={5}
            className="!h-full pointer-events-none opacity-60"
            fallback={null}
            gate={['reducedMotion', 'lowPower', 'coarsePointer']}
          />
        </>
      }
      titleNode={
        <Effect
          name="rectangular-text-reveal"
          fallback="EXPLORE THE PLANETARY INTELLIGENCE."
          baseColor="#262626"
          overlayColor="#fafafa"
          direction="left"
          once
          triggerStart="top 90%"
        >
          EXPLORE THE PLANETARY INTELLIGENCE.
        </Effect>
      }
      subtitleNode={
        <Effect
          name="typing-text"
          fallback="The provider-neutral AI orchestration platform that converts code-level engineering evidence into a live, verifiable planetary world model."
          lines={['The provider-neutral AI orchestration platform that converts code-level engineering evidence into a live, verifiable planetary world model.']}
          textColor="#e5e5e5"
          cursorColor="#fafafa"
          backgroundColor="transparent"
          fontSize={0.85}
          charactersPerSecond={30}
          className="!min-h-0 !h-auto w-full max-w-3xl items-start justify-start overflow-visible px-0 py-0 font-sans normal-case text-left leading-relaxed tracking-normal"
        />
      }
    >
      <div className="mt-8 flex-wrap gap-3 font-mono text-[10px] font-semibold tracking-widest text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        <span className="border-l border-white/80 pl-3">WORLD MODEL / {getWorlds().length} CANONICAL WORLDS</span>
        <span className="border-l border-white/80 pl-3">STATE / REGISTRY PROJECTION</span>
      </div>
      <div className="mt-6 flex-wrap gap-3 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
        <Link to="/world" className="border border-white/40 bg-white/20 px-6 py-3 font-mono text-xs font-semibold text-white backdrop-blur-xl transition-all duration-300 hover:bg-white/30 hover:border-white/60 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:-translate-y-0.5 focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-white relative overflow-hidden group">
          <span className="absolute inset-0 -z-10 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full"></span>
          ENTER FEEX WORLD
        </Link>
        <a href="#systems" className="border border-white/30 bg-black/40 px-6 py-3 font-mono text-xs font-semibold text-white/90 backdrop-blur-xl transition-all duration-300 hover:bg-white/10 hover:border-white/50 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:-translate-y-0.5 focus-visible:outline-solid focus-visible:outline-white relative overflow-hidden group">
          <span className="absolute inset-0 -z-10 -translate-x-full bg-linear-to-r from-transparent via-white/10 to-transparent transition-transform duration-1000 group-hover:translate-x-full"></span>
          EXPLORE SYSTEMS
        </a>
      </div>
      <span className="mt-7 font-mono text-[10px] font-semibold tracking-widest text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">↓ SCROLL TO ENTER</span>
    </CinematicScene>
  );
}
