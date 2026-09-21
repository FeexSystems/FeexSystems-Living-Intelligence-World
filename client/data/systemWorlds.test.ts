import { describe, expect, it } from "vitest";
import { SYSTEM_WORLDS } from "../data/systemWorlds";

describe("Sovereign World Model registry", () => {
  it("defines exactly eight canonical worlds", () => {
    expect(SYSTEM_WORLDS).toHaveLength(8);
  });

  it("keeps world IDs unique and ordered", () => {
    expect(SYSTEM_WORLDS.map((world) => world.id)).toEqual(
      ["01", "02", "03", "04", "05", "06", "07", "08"],
    );
  });

  it("provides a repository URL and status for every world", () => {
    for (const world of SYSTEM_WORLDS) {
      expect(world.repoUrl).toMatch(/^https:\/\//);
      expect(world.status).toBeTruthy();
    }
  });
});
