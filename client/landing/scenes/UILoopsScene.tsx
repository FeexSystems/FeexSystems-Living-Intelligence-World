import 'react';
import type { ReactNode } from 'react';
import { CinematicScene } from '../components/CinematicScene';
import { Effect } from '../effects/EffectGate';
import { MagneticGlowButton } from '../cinematic/MagneticGlowButton';
import { TransitionVisualizer } from '../cinematic/TransitionVisualizer';
import { Compass, Database, TerminalSquare } from 'lucide-react';

function CardBeam({ children }: { children: ReactNode }) {
  return (
    <Effect
      name="border-beam"
      exportName="BeamBorder"
      colorVariant="mono"
      theme="dark"
      size="sm"
      className="h-full rounded-none"
    >
      {children}
    </Effect>
  );
}

export function UILoopsScene() {
  return (
    <CinematicScene
      id="ui-loops"
      title="OPERATE THE WORLD"
      subtitle="The model is canonical. Intelligence interprets; the interface projects."
      videoSrc="/media/landing/scenes/ui-loops.webm"
      titleNode={
        <Effect
          name="chromatic-text"
          fallback="OPERATE THE WORLD"
          text="OPERATE THE WORLD"
          staticMode
          baseTextColor="#fafafa"
          firstTextColor="#d4d4d4"
          secondTextColor="#737373"
          fontSize={4.4}
          fontWeight={600}
          backgroundColor="transparent"
          className="!min-h-0 !h-auto w-full items-start justify-start overflow-visible px-0 py-0 text-left"
        />
      }
      subtitleNode={
        <Effect
          name="pixel-text-fill"
          fallback="The model is canonical. Intelligence interprets; the interface projects."
          staticMode
          text="The model is canonical. Intelligence interprets; the interface projects."
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
      <div className="mt-8 flex flex-col items-center gap-10">
        <CardBeam>
          <div className="w-full max-w-4xl opacity-90">
            <TransitionVisualizer />
          </div>
        </CardBeam>
        <div className="flex flex-col sm:flex-row gap-6">
            <MagneticGlowButton to="/world" variant="primary" size="lg">
                <Compass className="w-5 h-5 opacity-70" />
                Explore The Systems
            </MagneticGlowButton>
            <MagneticGlowButton to="/evidence" variant="secondary" size="lg">
                <Database className="w-5 h-5 opacity-70" />
                View Evidence Ledger
            </MagneticGlowButton>
            <MagneticGlowButton to="/navigator" variant="outline-solid" size="lg">
                <TerminalSquare className="w-5 h-5 opacity-70" />
                AI Navigator
            </MagneticGlowButton>
        </div>
      </div>
    </CinematicScene>
  );
}
