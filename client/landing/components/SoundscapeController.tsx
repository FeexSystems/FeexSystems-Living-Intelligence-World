import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sonikAudio } from '@/lib/sonikAudio';

export function SoundscapeController() {
  const [isMuted, setIsMuted] = useState(sonikAudio.isMuted());

  const toggleMute = () => {
    sonikAudio.unlockAudio();
    setIsMuted(sonikAudio.toggleMute());
  };

  return (
    <button 
      onClick={toggleMute}
      className="fixed bottom-8 right-8 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/50 text-white/50 hover:text-white hover:border-white/30 backdrop-blur-md transition-all"
    >
      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
    </button>
  );
}
