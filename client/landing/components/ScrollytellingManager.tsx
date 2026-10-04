import React from 'react';

export function ScrollytellingManager({ children, scrollRef }: { children: React.ReactNode; scrollRef?: React.Ref<HTMLDivElement> }) {
  return (
    <div ref={scrollRef} className="h-screen w-full overflow-y-auto overflow-x-hidden snap-y snap-mandatory bg-black">
      {children}
    </div>
  );
}
