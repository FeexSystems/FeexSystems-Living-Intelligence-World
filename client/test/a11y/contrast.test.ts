/**
 * Automated Color Contrast Check — Task 29, Phase 2, Sprint 8
 *
 * Parses the live design tokens from `client/styles/global-body-p0.css` (and the
 * phosphor token from `sovereign-hud-glass.css`) at test time, so a token change
 * re-evaluates every audited pair — the test cannot silently drift from the CSS.
 *
 * Thresholds (WCAG 2.1 AA):
 *   - text pairs:        ≥ 4.5:1  (SC 1.4.3, normal text)
 *   - UI component pairs: ≥ 3:1   (SC 1.4.11 — borders, focus rings)
 *
 * Source of truth for the pair list & measured values: docs/CONTRAST_REPORT.md
 * Runs in `npm run test:a11y` and the regular `npm test` suite.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getContrastRatio, meetsWCAGAA } from "./utils";

const here = dirname(fileURLToPath(import.meta.url));
const TOKENS_CSS = resolve(here, "../../styles/global-body-p0.css");
const HUD_CSS = resolve(here, "../../styles/sovereign-hud-glass.css");

/** Extract `--name: value;` declarations (first definition wins, root-first order). */
function extractTokens(css: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  const re = /--([a-zA-Z0-9-]+):\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(css)) !== null) {
    const name = match[1];
    if (!(name in tokens)) {
      tokens[name] = match[2].trim();
    }
  }
  return tokens;
}

/** Convert a token value (`#hex`, `#abc`, or `h s% l%`) to `#rrggbb`. */
function toHex(value: string, label: string): string {
  if (value.startsWith("#")) {
    let hex = value.slice(1);
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      throw new Error(`Token ${label}: unsupported hex value "${value}"`);
    }
    return `#${hex.toLowerCase()}`;
  }
  const hsl = value.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%?\s+(\d+(?:\.\d+)?)%?$/);
  if (!hsl) {
    throw new Error(`Token ${label}: unsupported value "${value}"`);
  }
  const h = Number(hsl[1]);
  const s = Number(hsl[2]) / 100;
  const l = Number(hsl[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb: [number, number, number] = [0, 0, 0];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const to255 = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to255(rgb[0])}${to255(rgb[1])}${to255(rgb[2])}`;
}

const p0Tokens = extractTokens(readFileSync(TOKENS_CSS, "utf8"));
const hudTokens = extractTokens(readFileSync(HUD_CSS, "utf8"));

function token(name: string): string {
  const raw = p0Tokens[name] ?? hudTokens[name];
  if (raw === undefined) {
    throw new Error(`Token --${name} not found in global-body-p0.css or sovereign-hud-glass.css`);
  }
  return toHex(raw, name);
}

/** [foregroundToken, backgroundToken] pairs that must reach AA for normal text. */
const TEXT_PAIRS: Array<[string, string]> = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "card"],
  ["muted-foreground", "background"],
  ["destructive", "background"],
  ["destructive", "card"],
  ["destructive", "secondary"],
  ["destructive", "bg-dark"],
  ["destructive-foreground", "destructive"],
  ["text-main", "bg-dark"],
  ["text-muted", "bg-dark"],
  ["text-on-dark", "bg-dark"],
];

/** [foregroundToken, backgroundToken] pairs governed by SC 1.4.11 (≥ 3:1). */
const UI_PAIRS: Array<[string, string]> = [
  ["input", "background"],
  ["input", "card"],
  ["ring", "background"],
  ["ring", "card"],
];

describe("Task 29 — design token contrast (WCAG 2.1 AA)", () => {
  it("all text token pairs meet ≥ 4.5:1", () => {
    const failures: string[] = [];
    for (const [fg, bg] of TEXT_PAIRS) {
      const ratio = getContrastRatio(token(fg), token(bg));
      if (!meetsWCAGAA(ratio, 16)) {
        failures.push(`--${fg} on --${bg}: ${ratio.toFixed(2)}:1 (need ≥ 4.5:1)`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("all UI component token pairs meet ≥ 3:1 (SC 1.4.11)", () => {
    const failures: string[] = [];
    for (const [fg, bg] of UI_PAIRS) {
      const ratio = getContrastRatio(token(fg), token(bg));
      if (ratio < 3) {
        failures.push(`--${fg} on --${bg}: ${ratio.toFixed(2)}:1 (need ≥ 3:1)`);
      }
    }
    expect(failures).toEqual([]);
  });

  it("focus indicators keep ≥ 3:1 on their target surfaces", () => {
    // Phosphor ring on dark surfaces (brand color, sovereign-hud-glass.css).
    const phosphor = token("hud-phosphor");
    expect(getContrastRatio(phosphor, token("bg-dark"))).toBeGreaterThanOrEqual(3);
    expect(getContrastRatio(phosphor, token("background"))).toBeGreaterThanOrEqual(3);
    // Light-surface focus ring (Task 29 / F3) on pure white.
    expect(getContrastRatio(token("focus-on-light"), "#ffffff")).toBeGreaterThanOrEqual(3);
  });

  it("contrast tokens are actually defined (guards against accidental removal)", () => {
    for (const name of ["text-on-dark", "focus-on-light", "text-muted", "bg-dark"]) {
      const defined = p0Tokens[name] ?? hudTokens[name];
      expect(defined, `token --${name} must exist`).toBeDefined();
    }
  });
});
