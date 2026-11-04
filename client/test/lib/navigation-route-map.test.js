import { describe, it, expect } from "vitest";
import {
  buildBreadcrumbTrail,
  normalizePath,
  resolveReturnTarget,
  resolveRoute,
  resolveRouteTitle,
  ROUTE_META,
} from "@/components/navigation/routeMap";

describe("navigation routeMap", () => {
  describe("normalizePath", () => {
    it("strips query, hash and trailing slashes", () => {
      expect(normalizePath("/dashboard/devops/")).toBe("/dashboard/devops");
      expect(normalizePath("/world?q=1")).toBe("/world");
      expect(normalizePath("/evidence#top")).toBe("/evidence");
    });

    it("always keeps the root path", () => {
      expect(normalizePath("/")).toBe("/");
      expect(normalizePath("")).toBe("/");
    });
  });

  describe("resolveRoute", () => {
    it("matches registered routes exactly", () => {
      const resolved = resolveRoute("/omni");
      expect(resolved.matchedPath).toBe("/omni");
      expect(resolved.extraSegments).toEqual([]);
      expect(resolved.meta.parent).toBe("/");
    });

    it("falls back to the longest ancestor and exposes dynamic segments", () => {
      const resolved = resolveRoute("/evidence/feex-backend");
      expect(resolved.matchedPath).toBe("/evidence");
      expect(resolved.meta.label).toBe("Evidence Fabric");
      expect(resolved.extraSegments).toEqual(["feex-backend"]);
    });

    it("synthesises metadata for unknown routes", () => {
      const resolved = resolveRoute("/totally-unknown");
      expect(resolved.meta.surface).toBe("system");
      expect(resolved.meta.parent).toBe("/");
    });
  });

  describe("resolveRouteTitle", () => {
    it("uses the full brand title for the home route", () => {
      expect(resolveRouteTitle("/")).toBe("FEEXSYSTEMS — Living Engineering Intelligence");
    });

    it("prefixes the page label for named routes", () => {
      expect(resolveRouteTitle("/world")).toBe("Spatial Galaxy — FEEXSYSTEMS");
      expect(resolveRouteTitle("/projects")).toBe("Projects — FEEXSYSTEMS");
      expect(resolveRouteTitle("/dashboard/devops")).toBe("DevOps — FEEXSYSTEMS");
    });
  });

  describe("buildBreadcrumbTrail", () => {
    it("returns a single crumb for the root", () => {
      const trail = buildBreadcrumbTrail("/");
      expect(trail).toHaveLength(1);
      expect(trail[0].isCurrent).toBe(true);
    });

    it("walks parents up to home", () => {
      const trail = buildBreadcrumbTrail("/dashboard/devops");
      expect(trail.map((c) => c.label)).toEqual(["Home", "Dashboard", "DevOps"]);
      expect(trail.map((c) => c.href)).toEqual(["/", "/dashboard", "/dashboard/devops"]);
      expect(trail[trail.length - 1].isCurrent).toBe(true);
    });

    it("includes the admin chain", () => {
      const trail = buildBreadcrumbTrail("/admin/users");
      expect(trail.map((c) => c.label)).toEqual(["Home", "Dashboard", "Admin", "Users"]);
    });

    it("appends dynamic segments with humanised labels", () => {
      const trail = buildBreadcrumbTrail("/evidence/feex-backend");
      expect(trail.map((c) => c.label)).toEqual(["Home", "Evidence Fabric", "Feex Backend"]);
      expect(trail[trail.length - 1].href).toBe("/evidence/feex-backend");
      expect(trail[trail.length - 1].isCurrent).toBe(true);
    });
  });

  describe("resolveReturnTarget", () => {
    it("returns the route parent", () => {
      expect(resolveReturnTarget("/dashboard/devops")).toBe("/dashboard");
      expect(resolveReturnTarget("/world")).toBe("/");
      expect(resolveReturnTarget("/profile")).toBe("/dashboard");
    });
  });

  describe("ROUTE_META integrity", () => {
    it("every parent points at a registered route", () => {
      for (const [path, meta] of Object.entries(ROUTE_META)) {
        if (meta.parent !== undefined) {
          expect(ROUTE_META[meta.parent], `${path} -> ${meta.parent}`).toBeDefined();
        }
      }
    });
  });
});
