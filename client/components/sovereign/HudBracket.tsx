/**
 * HudBracket — four-corner bracket wrapper for glass panels
 *
 * Drop into: client/components/sovereign/HudBracket.tsx
 * Prefer this over pure CSS when you need all four corners without
 * fighting limited ::before/::after slots on the same node.
 */

import React, { type ReactNode } from "react";

export interface HudBracketProps {
  children: ReactNode;
  className?: string;
  /** Cyan frame for Technical Dossier CTA */
  cyan?: boolean;
  /** Extra classes on the outer shell (e.g. hud-panel hud-panel--hero) */
  asPanel?: boolean;
}

export function HudBracket({
  children,
  className = "",
  cyan = false,
  asPanel = true,
}: HudBracketProps) {
  const shell = [
    asPanel ? "hud-panel" : "",
    "hud-bracket-4",
    cyan ? "hud-bracket--cyan hud-panel--cyan" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shell}>
      <span className="hud-c hud-c--tl" aria-hidden />
      <span className="hud-c hud-c--tr" aria-hidden />
      <span className="hud-c hud-c--bl" aria-hidden />
      <span className="hud-c hud-c--br" aria-hidden />
      {children}
    </div>
  );
}

export default HudBracket;
