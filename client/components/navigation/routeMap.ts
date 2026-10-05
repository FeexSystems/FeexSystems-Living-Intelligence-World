/**
 * Canonical navigation registry for the FeexSystems SPA.
 *
 * This is the single source of truth for:
 *   - the human label of every route,
 *   - the parent ("return") target used by breadcrumbs / back controls,
 *   - the document title fragment applied by <RouteTitle />.
 *
 * Keeping it in one module means a new page only needs one entry to become
 * fully navigable (enter + return) across breadcrumbs, the back control and the
 * browser tab title.
 */

export type Surface = "public" | "auth" | "dashboard" | "admin" | "system";

export interface RouteMeta {
  /** Human-readable label used by breadcrumbs and the back control. */
  label: string;
  /** Parent route used as the breadcrumb ancestor and back fallback. */
  parent?: string;
  /** Top-level surface grouping this route belongs to. */
  surface: Surface;
  /** Optional document-title override. An empty string suppresses the fragment. */
  title?: string;
}

export const SITE_TITLE = "FEEXSYSTEMS";
export const HOME_LABEL = "Home";

export const ROUTE_META: Record<string, RouteMeta> = {
  "/": { label: HOME_LABEL, surface: "public", title: "" },

  // Public World Model surfaces
  "/projects": { label: "Projects", parent: "/", surface: "public" },
  "/navigator": { label: "AI Navigator", parent: "/", surface: "public" },
  "/world": { label: "Spatial Galaxy", parent: "/", surface: "public" },
  "/omni": { label: "Omni Command", parent: "/", surface: "public" },
  "/evidence": { label: "Evidence Fabric", parent: "/", surface: "public" },

  // Guest-only authentication surfaces
  "/login": { label: "Sign In", parent: "/", surface: "auth" },
  "/register": { label: "Create Account", parent: "/login", surface: "auth" },
  "/forgot-password": { label: "Reset Password", parent: "/login", surface: "auth" },
  "/reset-password": { label: "Set New Password", parent: "/login", surface: "auth" },
  "/verify-email": { label: "Verify Email", parent: "/login", surface: "auth" },

  // Authenticated dashboard
  "/dashboard": { label: "Dashboard", parent: "/", surface: "dashboard" },
  "/dashboard/ai": { label: "AI Services", parent: "/dashboard", surface: "dashboard" },
  "/dashboard/ai-services": { label: "AI Services", parent: "/dashboard", surface: "dashboard" },
  "/dashboard/ai-agents": { label: "AI Agents", parent: "/dashboard", surface: "dashboard" },
  "/dashboard/ai-observability": { label: "Agent Observability", parent: "/dashboard", surface: "dashboard" },
  "/dashboard/analytics": { label: "Analytics", parent: "/dashboard", surface: "dashboard" },
  "/dashboard/billing": { label: "Billing", parent: "/dashboard", surface: "dashboard" },
  "/dashboard/devops": { label: "DevOps", parent: "/dashboard", surface: "dashboard" },
  "/dashboard/security": { label: "Security", parent: "/dashboard", surface: "dashboard" },
  "/dashboard/settings": { label: "Settings", parent: "/dashboard", surface: "dashboard" },
  "/dashboard/teams": { label: "Teams", parent: "/dashboard", surface: "dashboard" },
  "/dashboard/profile": { label: "Profile", parent: "/dashboard", surface: "dashboard" },
  "/dashboard/marketing": { label: "Marketing", parent: "/dashboard", surface: "dashboard" },
  "/profile": { label: "Profile", parent: "/dashboard", surface: "dashboard" },

  // Admin console
  "/admin": { label: "Admin", parent: "/dashboard", surface: "admin" },
  "/admin/users": { label: "Users", parent: "/admin", surface: "admin" },
  "/admin/health": { label: "System Health", parent: "/admin", surface: "admin" },
  "/admin/security": { label: "Security", parent: "/admin", surface: "admin" },
  "/admin/audit-logs": { label: "Audit Logs", parent: "/admin", surface: "admin" },
  "/admin/subscriptions": { label: "Subscriptions", parent: "/admin", surface: "admin" },
};

/** Strip query / hash / trailing slash so pathname comparisons are stable. */
export function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  const clean = pathname.split("?")[0].split("#")[0];
  if (clean.length > 1 && clean.endsWith("/")) return clean.slice(0, -1);
  return clean || "/";
}

/** Turn a slug segment ("audit-logs", "project_x") into a readable label. */
function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export interface ResolvedRoute {
  /** Metadata for the closest registered ancestor (or a synthetic fallback). */
  meta: RouteMeta;
  /** The registered route path that matched (longest prefix). */
  matchedPath: string;
  /** Dynamic path segments beyond the matched route (e.g. `/evidence/:id`). */
  extraSegments: string[];
}

/**
 * Resolve the closest registered route for a pathname.
 *
 * Exact matches win; otherwise the longest registered path that is a proper
 * ancestor of `pathname` is used and any remaining segments are returned so
 * callers can render them as dynamic crumbs.
 */
export function resolveRoute(pathname: string): ResolvedRoute {
  const path = normalizePath(pathname);

  if (ROUTE_META[path]) {
    return { meta: ROUTE_META[path], matchedPath: path, extraSegments: [] };
  }

  const ancestor = Object.keys(ROUTE_META)
    .filter((key) => key !== "/" && path.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];

  if (ancestor) {
    return {
      meta: ROUTE_META[ancestor],
      matchedPath: ancestor,
      extraSegments: path.slice(ancestor.length + 1).split("/").filter(Boolean),
    };
  }

  // Unknown route (e.g. the 404 boundary).
  const fallbackLabel = titleCase(path.split("/").filter(Boolean).pop() || "Not Found");
  return {
    meta: { label: fallbackLabel, parent: "/", surface: "system" },
    matchedPath: path,
    extraSegments: [],
  };
}

/** Resolve the full `document.title` string for a pathname. */
export function resolveRouteTitle(pathname: string): string {
  const { meta } = resolveRoute(pathname);
  const fragment = meta.title !== undefined ? meta.title : meta.label;
  return fragment ? `${fragment} — ${SITE_TITLE}` : `${SITE_TITLE} — Living Engineering Intelligence`;
}

export interface Crumb {
  label: string;
  href: string;
  isCurrent: boolean;
}

/**
 * Build an ordered breadcrumb trail for a pathname by walking the `parent`
 * chain up to the site root, then appending any dynamic segments.
 */
export function buildBreadcrumbTrail(pathname: string): Crumb[] {
  const { matchedPath, extraSegments } = resolveRoute(pathname);

  const chain: RouteMeta[] = [];
  const paths: string[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined = matchedPath;

  while (cursor && ROUTE_META[cursor] && !seen.has(cursor)) {
    seen.add(cursor);
    chain.unshift(ROUTE_META[cursor]);
    paths.unshift(cursor);
    cursor = ROUTE_META[cursor].parent;
  }

  const crumbs: Crumb[] = chain.map((meta, index) => ({
    label: meta.label,
    href: paths[index],
    isCurrent: false,
  }));

  let accumulated = matchedPath;
  for (const segment of extraSegments) {
    accumulated = `${accumulated}/${segment}`;
    crumbs.push({ label: titleCase(decodeURIComponent(segment)), href: accumulated, isCurrent: false });
  }

  if (crumbs.length > 0) {
    crumbs[crumbs.length - 1].isCurrent = true;
  }

  return crumbs;
}

/** The most sensible "return" target for a pathname (its parent, else home). */
export function resolveReturnTarget(pathname: string): string {
  const { meta } = resolveRoute(pathname);
  return meta.parent ?? "/";
}
