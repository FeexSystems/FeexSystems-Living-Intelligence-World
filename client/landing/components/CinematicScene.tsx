import React from 'react';

export interface CinematicSceneProps {
  id: string;
  videoSrc: string;
  posterSrc?: string;
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

export function CinematicScene({ id, videoSrc, posterSrc, title, subtitle, children }: CinematicSceneProps) {
  return (
    <section id={id} className="relative h-screen w-screen snap-start snap-always flex items-center justify-center overflow-hidden bg-black">
      <video
        autoPlay
        muted
        loop
        playsInline
        poster={posterSrc}
        className="absolute inset-0 w-full h-full object-cover opacity-60"
      >
        <source src={videoSrc} type="video/webm" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
      <div className="relative z-10 w-full max-w-[1500px] px-8 py-20 text-white flex flex-col justify-end h-full">
        <h2 className="text-[clamp(3rem,6vw,5rem)] font-light leading-none tracking-tight mb-4 uppercase">{title}</h2>
        <p className="font-mono text-sm tracking-widest text-white/50 uppercase">{subtitle}</p>
        {children}
      </div>
    </section>
  );
}
