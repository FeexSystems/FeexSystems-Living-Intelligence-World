import { EMAR_THE_SCIENTIST } from '../../../src/data/architectRegistry';
import { useHoloKai } from '../../../src/context/HoloKaiContext';
import { EVIDENCE_POSTER_URL, GALAXY_POSTER_URL } from '../../../src/data/canonicalRegistry';
import { AccessibleDisplayHeading } from '../components/AccessibleDisplayHeading';
import { HoverPlayVideo } from '../components/HoverPlayVideo';

// This scene is a static provenance panel, so its media is poster-only: passing
// no `src` makes HoverPlayVideo render an <img> instead of a video element,
// which keeps the section free of decoders and IntersectionObservers.

export function SectionArchitectOrigin() {
  const { openUplink } = useHoloKai();
  return (
    <section
      id="architect-origin"
      // Every landing scene is exactly one snap viewport (`h-screen snap-start`).
      // This section is not a CinematicScene, so it must declare that contract
      // itself — otherwise its natural height desynchronises the snap offsets
      // for every scene after it.
      className="relative flex h-screen w-full snap-start snap-always items-center justify-center overflow-hidden border-t border-white/10 bg-[#050505] px-6 py-10 lg:px-12"
    >
      {/* The scene rail is fixed at the right edge on md+ (w-44 + right-6),
          so the content column must stop before it or the bio is covered. */}
      <div className="mx-auto w-full max-w-7xl md:pr-52">
        <AccessibleDisplayHeading>
          <span className="mb-2 block font-mono text-[9px] tracking-[.25em] text-white/50">PLANETARY ORIGIN // CREATOR PROVENANCE</span>
          <span className="block text-[clamp(1.5rem,3.2vw,2.5rem)] leading-none">{EMAR_THE_SCIENTIST.alias}</span>
          <span className="mt-2 block font-mono text-xs font-normal tracking-normal text-white/55">{EMAR_THE_SCIENTIST.role}</span>
        </AccessibleDisplayHeading>
        {/* The section is one snap viewport tall, so the composed block is capped
            to the space left under the heading — otherwise the CTAs and core
            domains fall below the fold and are clipped by `overflow-hidden`. */}
        <div className="mt-6 grid max-h-[calc(100vh-14rem)] grid-cols-1 gap-6 overflow-y-auto border border-white/15 bg-white/[0.02] p-5 lg:grid-cols-12 lg:p-6">
          <div className="relative overflow-hidden border-white/15 bg-black lg:col-span-7">
            <div className="aspect-video w-full">
              <HoverPlayVideo poster={GALAXY_POSTER_URL} alt="Emar the Scientist observing the FeexSystems planetary universe" className="h-full w-full object-cover grayscale" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/90 px-4 py-2.5 font-mono text-[10px] tracking-widest text-zinc-400">
              <span>ORIGIN ARCHIVE // PLANETARY OBSERVATORY</span><span>COMMIT SHA: {EMAR_THE_SCIENTIST.pinnedCommitSha.slice(0, 8)}</span>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-4 lg:col-span-5">
            <div>
              <div className="flex items-center gap-4">
                <div className="h-16 w-24 shrink-0 overflow-hidden border border-white/40 bg-black">
                  <HoverPlayVideo poster={EVIDENCE_POSTER_URL} alt="Emar and HoloKai optical telemetry link" className="h-full w-full object-cover grayscale" />
                </div>
                <div><span className="font-mono text-[10px] uppercase tracking-widest text-white/65">VERIFIED ARCHITECT // {EMAR_THE_SCIENTIST.authoredWorldsCount} WORLDS</span><h3 className="mt-1 font-mono text-lg font-bold text-white">{EMAR_THE_SCIENTIST.alias}</h3><p className="font-mono text-[11px] text-zinc-400">Creator &amp; Builder of FeexSystems</p></div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-zinc-300">{EMAR_THE_SCIENTIST.bio}</p>
              <ul className="mt-3 space-y-1 font-mono text-[11px] text-zinc-300">{EMAR_THE_SCIENTIST.coreDomains.map((domain) => <li key={domain} className="flex items-center gap-2"><span className="text-white/60">▸</span><span>{domain}</span></li>)}</ul>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3 font-mono text-[11px]">
              <a href={EMAR_THE_SCIENTIST.resumeRepoUrl} target="_blank" rel="noopener noreferrer" className="bg-white px-3 py-2 font-bold uppercase tracking-wider text-black transition hover:bg-zinc-200">[OPEN VERIFIED RESUME ↗]</a>
              <button type="button" onClick={() => openUplink('Summarize Emar the Scientist architecture credentials and authored worlds')} className="border border-white/40 bg-white/[0.04] px-3 py-2 uppercase tracking-wider text-white/85 hover:bg-white hover:text-black">[AUDIT ARCHITECT IN HOLOKAI]</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
