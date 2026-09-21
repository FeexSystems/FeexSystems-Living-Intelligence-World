import React, { useRef } from "react";
import { sonikAudio } from "../../lib/sonikAudio";

export interface SovereignVector { x: number; y: number; }

interface SovereignControlsProps {
  value: SovereignVector;
  onChange: (value: SovereignVector) => void;
}

export function SovereignControls({ value, onChange }: SovereignControlsProps) {
  const isDragging = useRef(false);

  const reset = () => {
    isDragging.current = false;
    onChange({ x: 0, y: 0 });
  };

  const processMove = (clientX: number, clientY: number, box: DOMRect) => {
    const rawX = (clientX - (box.left + box.width / 2)) / (box.width / 2);
    const rawY = ((box.top + box.height / 2) - clientY) / (box.width / 2);
    const magnitude = Math.hypot(rawX, rawY);
    const scale = magnitude > 1 ? 1 / magnitude : 1;
    const next = { x: rawX * scale, y: rawY * scale };
    if (Math.hypot(next.x - value.x, next.y - value.y) > 0.35) {
      sonikAudio.playCyberClick(0.9);
      sonikAudio.triggerHaptic(6);
    }
    onChange(next);
  };

  return (
    <div className="absolute bottom-28 right-6 z-30 flex flex-col items-center gap-1.5">
      <div className="text-[8px] uppercase tracking-widest text-[#788896]">WASD / DRAG</div>
      <div
        id="tactile-joystick-pad"
        aria-label="Tactical joystick"
        className="w-16 h-16 rounded-full bg-black/70 border border-[#00ff66]/30 relative touch-none cursor-grab active:cursor-grabbing backdrop-blur-md shadow-lg"
        onTouchStart={(e) => {
          sonikAudio.unlockAudio();
          isDragging.current = true;
          const rect = e.currentTarget.getBoundingClientRect();
          processMove(e.touches[0].clientX, e.touches[0].clientY, rect);
        }}
        onTouchMove={(e) => {
          if (!isDragging.current) return;
          const rect = e.currentTarget.getBoundingClientRect();
          processMove(e.touches[0].clientX, e.touches[0].clientY, rect);
        }}
        onTouchEnd={reset}
        onMouseDown={() => {
          sonikAudio.unlockAudio();
          isDragging.current = true;
        }}
        onMouseMove={(e) => {
          if (!isDragging.current) return;
          const rect = e.currentTarget.getBoundingClientRect();
          processMove(e.clientX, e.clientY, rect);
        }}
        onMouseUp={reset}
        onMouseLeave={reset}
      >
        <div
          className="w-5 h-5 rounded-full bg-[#00ff66]/20 border border-[#00ff66] absolute top-1/2 left-1/2 pointer-events-none shadow-[0_0_6px_rgba(0,255,102,0.4)]"
          style={{
            transform: `translate(-50%, -50%) translate(${value.x * 18}px, ${-value.y * 18}px)`,
            transition: isDragging.current ? "none" : "transform 0.15s ease-out",
          }}
        />
      </div>
    </div>
  );
}

export default SovereignControls;
