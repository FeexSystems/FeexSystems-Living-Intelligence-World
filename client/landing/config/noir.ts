/**
 * noir.ts — FEEX Noir design tokens (FEEX-SORL Phase 1).
 *
 * Monochromatic noir palette for the Sovereign Research & Operations
 * Laboratory and all SORL-adjacent surfaces. Strictly desaturated:
 * no amber, brass, gold, teal, or brand-color accents. Functional
 * signal colors (error/success) remain reserved for semantic states
 * and are defined separately in lab-contracts — they are not part
 * of the decorative palette.
 */

export const FEEX_NOIR = {
  /** Near-black void — lab floor and clear color. */
  void: "#050505",
  /** Deep graphite — secondary surfaces, panels. */
  graphite: "#0b0b0c",
  /** Raised graphite — cards, instrument bezels. */
  panel: "#141416",
  /** Brushed metal — structural frames, columns, equipment. */
  steel: "#6e6e6a",
  /** Hairline borders. */
  border: "rgba(255, 255, 255, 0.14)",
  /** Dim border for recessed zones. */
  borderSubtle: "rgba(255, 255, 255, 0.08)",

  /** Primary neutral — silver-white text and key light. */
  silver: "#e8e8e6",
  /** Secondary neutral — body text. */
  ash: "#b8b8b4",
  /** Tertiary neutral — labels, captions. */
  smoke: "#6f6f6b",

  /** High-contrast signal — active state, selection, attention. */
  signal: "#fafafa",
  /** Cool rim accent — silhouette separation only. */
  rim: "#d4d4d0",

  /** Lightformer / environment key color. */
  keyLight: "#f2f2ef",
  /** Fill light — neutral silver. */
  fillLight: "#8f8f8c",
  /** Ambient bounce — dim warm-neutral grey (no chroma). */
  ambient: "#9c9c98",
  /** Hemisphere sky contribution. */
  hemiSky: "#3d3d3a",
  /** Hemisphere ground contribution. */
  hemiGround: "#050505",

  /** Particle / dust motes — desaturated silver. */
  dust: "#c9c9c4",
} as const;

export type NoirToken = keyof typeof FEEX_NOIR;
