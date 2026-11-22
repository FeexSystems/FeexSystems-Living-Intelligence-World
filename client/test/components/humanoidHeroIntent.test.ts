import { describe, it, expect } from "vitest";
import { heroAwareIntent } from "@/landing/components/humanoidHeroIntent";

describe("heroAwareIntent", () => {
  const W = 1000;
  const H = 800;

  it("returns aware inside the bounded focal zone", () => {
    // center of viewport
    expect(heroAwareIntent(500, 400, W, H)).toEqual({ kind: "aware" });
    // edges of the zone: nx=±0.5 → x = 250 or 750; ny=±0.6 → y = 160 or 640
    expect(heroAwareIntent(250, 400, W, H)).toEqual({ kind: "aware" });
    expect(heroAwareIntent(750, 160, W, H)).toEqual({ kind: "aware" });
  });

  it("returns null outside the focal zone", () => {
    expect(heroAwareIntent(100, 400, W, H)).toBeNull(); // nx=-0.8
    expect(heroAwareIntent(900, 400, W, H)).toBeNull(); // nx=0.8
    expect(heroAwareIntent(500, 50, W, H)).toBeNull(); // ny=-0.875
    expect(heroAwareIntent(500, 780, W, H)).toBeNull(); // ny≈0.95
  });

  it("fails closed on degenerate viewport sizes", () => {
    expect(heroAwareIntent(500, 400, 0, 800)).toBeNull();
    expect(heroAwareIntent(500, 400, 1000, 0)).toBeNull();
    expect(heroAwareIntent(500, 400, -1, 800)).toBeNull();
  });
});
