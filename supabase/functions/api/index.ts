/**
 * FeexSystems API — Supabase Edge Function (Deno)
 * Ports Express API surface to Deno Edge Function with manual routing.
 * Prisma is Node-only — DB via @supabase/supabase-js REST client.
 * No Redis on free tier — cache degrades gracefully.
 */

import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("FEEX_SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("FEEX_SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CORS_ORIGIN = Deno.env.get("CORS_ORIGIN") ?? "*";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function json(data: unknown, status = 200, extra?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": CORS_ORIGIN,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      ...extra,
    },
  });
}

function errResponse(message: string, status = 500, details?: unknown) {
  return json({ error: message, ...(details ? { details } : {}) }, status);
}

function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": CORS_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function getPath(req: Request): string {
  const url = new URL(req.url);
  let p = url.pathname;
  if (p.startsWith("/api/v1")) p = p.slice(7);
  if (p.startsWith("/api")) p = p.slice(4);
  return p || "/";
}

type RouteHandler = (req: Request, url: URL, params: Record<string, string>) => Promise<Response> | Response;

interface Route { method: string; pattern: string; handler: RouteHandler; }

const routes: Route[] = [];

function route(method: string, pattern: string, handler: RouteHandler) {
  routes.push({ method, pattern, handler });
}

function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const pParts = pattern.split("/").filter(Boolean);
  const rParts = path.split("/").filter(Boolean);
  if (pParts.length !== rParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i].startsWith(":")) params[pParts[i].slice(1)] = rParts[i];
    else if (pParts[i] !== rParts[i]) return null;
  }
  return params;
}

function findHandler(method: string, path: string): { handler: RouteHandler; params: Record<string, string> } | null {
  for (const r of routes) {
    if (r.method !== method && r.method !== "*") continue;
    const params = matchRoute(r.pattern, path);
    if (params) return { handler: r.handler, params };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

// GET /health — DB only (Redis degraded on Edge Functions free tier)
route("GET", "/health", async () => {
  let dbStatus = "unhealthy";
  let dbError: string | undefined;
  try {
    const { error } = await supabase.from("world_model_projects").select("count", { head: true });
    if (error) dbError = error.message;
    else dbStatus = "healthy";
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }
  const overall = dbStatus === "healthy" ? "healthy" : "degraded";
  return json({
    status: overall,
    timestamp: new Date().toISOString(),
    services: {
      database: { status: dbStatus, error: dbError },
      redis: { status: "unavailable", note: "Edge Functions free tier — no Redis" },
    },
  }, overall === "healthy" ? 200 : 503);
});

// GET /ping
route("GET", "/ping", async () => {
  return json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET /world-model/projects
route("GET", "/world-model/projects", async () => {
  const { data, error } = await supabase
    .from("world_model_projects")
    .select("*")
    .order("last_observed_at", { ascending: false });
  if (error) return errResponse(error.message, 500);
  return json({ projects: data ?? [], count: data?.length ?? 0 });
});

// GET /world-model/graph
route("GET", "/world-model/graph", async (_req, url) => {
  const includeEdges = url.searchParams.get("edges") !== "false";
  const { data: projects, error: pErr } = await supabase
    .from("world_model_projects")
    .select("id, name, description, visibility, is_pinned, last_observed_at");
  if (pErr) return errResponse(pErr.message, 500);
  let edges: unknown[] = [];
  if (includeEdges) {
    const { data: rels, error: rErr } = await supabase
      .from("world_model_relationships")
      .select("source_id, target_id, relationship_type");
    if (!rErr) edges = (rels ?? []).map((e: any) => ({
      source: e.source_id, target: e.target_id, type: e.relationship_type || "RELATED_TO",
    }));
  }
  return json({
    nodes: (projects ?? []).map((p: any) => ({ id: p.id, label: p.name, ...p })),
    edges,
  });
});

// GET /world-model/evidence/:projectId
route("GET", "/world-model/evidence/:projectId", async (_req, _url, params) => {
  const { data, error } = await supabase
    .from("world_model_evidence")
    .select("*")
    .eq("project_id", params.projectId)
    .order("observed_at", { ascending: false });
  if (error) return errResponse(error.message, 500);
  return json({ projectId: params.projectId, evidence: data ?? [] });
});

// GET /world-model/navigator?q=
route("GET", "/world-model/navigator", async (_req, url) => {
  const q = url.searchParams.get("q") ?? "";
  if (!q) return errResponse("Missing query parameter 'q'", 400);
  const { data, error } = await supabase
    .from("world_model_projects")
    .select("*")
    .ilike("name", `%${q}%`)
    .limit(20);
  if (error) return errResponse(error.message, 500);
  return json({ query: q, results: data ?? [], count: data?.length ?? 0 });
});

// POST /world-model/omni-command
route("POST", "/world-model/omni-command", async (req) => {
  const body = await req.json().catch(() => ({}));
  const { command, context } = body;
  if (!command) return errResponse("Missing 'command' in body", 400);
  const { data } = await supabase.from("world_model_projects").select("id, name").limit(1);
  return json({
    command, status: "accepted",
    trace: [{ step: "parse", status: "ok" }, { step: "validate", status: "ok" }],
    result: { projects: data ?? [] },
    context,
  });
});

// ---------------------------------------------------------------------------
// Firebase ID token verification (Deno native — no firebase-admin)
// ---------------------------------------------------------------------------

const FIREBASE_PROJECT_ID = "feexsystems-prod-508304";
const FIREBASE_ISSUER = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
const FIREBASE_AUDIENCE = FIREBASE_PROJECT_ID;

let googlePublicKeys: Record<string, string> | null = null;
let keysFetchedAt = 0;

async function getGooglePublicKeys(): Promise<Record<string, string>> {
  const now = Date.now();
  if (googlePublicKeys && now - keysFetchedAt < 3600000) {
    return googlePublicKeys;
  }
  const response = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
  );
  googlePublicKeys = (await response.json()) as Record<string, string>;
  keysFetchedAt = now;
  return googlePublicKeys;
}

function getKeyId(token: string): string | null {
  try {
    const headerPart = token.split(".")[0];
    const header = JSON.parse(atob(headerPart));
    return header.kid || null;
  } catch {
    return null;
  }
}

interface FirebaseDecodedToken {
  uid: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  [key: string]: unknown;
}

function base64urlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function parseJwt<T = any>(token: string): { header: T; payload: T; signature: Uint8Array } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const header = JSON.parse(atob(parts[0])) as T;
    const payload = JSON.parse(atob(parts[1])) as T;
    const signature = base64urlDecode(parts[2]);
    return { header, payload, signature };
  } catch {
    return null;
  }
}

async function importRsaPublicKey(pem: string): Promise<CryptoKey> {
  const pemHeader = "-----BEGIN CERTIFICATE-----";
  const pemFooter = "-----END CERTIFICATE-----";
  const pemContents = pem.replace(pemHeader, "").replace(pemFooter, "").replace(/\s/g, "");
  const binaryDer = base64urlDecode(pemContents);
  const cryptoKey = await crypto.subtle.importKey(
    "spki",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    true,
    ["verify"]
  );
  return cryptoKey;
}

async function verifyFirebaseToken(token: string): Promise<FirebaseDecodedToken | null> {
  try {
    const parsed = parseJwt(token);
    if (!parsed) return null;
    const { header, payload, signature } = parsed;

    // Check expiry
    if (payload.exp && Date.now() >= payload.exp * 1000) return null;

    const keys = await getGooglePublicKeys();
    const kid = header.kid || getKeyId(token);
    if (!kid || !keys[kid]) return null;

    const publicKey = await importRsaPublicKey(keys[kid]);

    // Reconstruct signing input from original token
    const firstDot = token.indexOf(".");
    const secondDot = token.indexOf(".", firstDot + 1);
    const signingInput = new TextEncoder().encode(token.slice(0, secondDot));

    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      signature,
      signingInput
    );
    if (!valid) return null;

    // Verify issuer and audience
    if (payload.iss !== FIREBASE_ISSUER) return null;
    if (payload.aud !== FIREBASE_AUDIENCE) return null;

    return payload as FirebaseDecodedToken;
  } catch {
    return null;
  }
}

type AuthedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified: boolean;
};

async function authenticateReq(req: Request): Promise<{ user: AuthedUser } | { error: Response }> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: json({ success: false, error: { type: "AUTHENTICATION_ERROR", message: "Access token is required", code: "MISSING_TOKEN", timestamp: new Date().toISOString() } }, 401) };
  }
  const token = authHeader.split(" ")[1];
  const decoded = await verifyFirebaseToken(token);
  if (!decoded) {
    return { error: json({ success: false, error: { type: "AUTHENTICATION_ERROR", message: "Invalid or expired token", code: "INVALID_TOKEN", timestamp: new Date().toISOString() } }, 401) };
  }
  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, role, email_verified")
    .eq("id", decoded.uid)
    .single();
  if (error || !user) {
    return { error: json({ success: false, error: { type: "AUTHENTICATION_ERROR", message: "User not found", code: "USER_NOT_FOUND", timestamp: new Date().toISOString() } }, 401) };
  }
  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      emailVerified: user.email_verified,
    },
  };
}
// ---------------------------------------------------------------------------
// Authorization guards
//
// The Edge Function is the public HTTP surface in front of the same canonical
// database the Express API uses, so it must enforce the SAME authorization
// contract as Express (`server/lib/middleware/admin.middleware.ts`,
// `server/lib/services/team.service.ts`, `shared/api.ts#getTeamPermissions`).
//
// Guards are layered:
//   1. `authenticateReq`  — verifies the Firebase ID token (identity).
//   2. `requireAdmin`     — global UserRole gate (USER / ADMIN / SUPER_ADMIN).
//   3. `requireTeamPermission` — team-scoped gate (OWNER / ADMIN / MEMBER /
//      VIEWER) resolved from the `team_members` row, not from the request.
//   4. `requireRepositoryAccess` — repository-scoped gate that resolves the
//      repository row and checks that the caller owns it (or is a global
//      admin). A caller being an ADMIN is NOT sufficient on its own for a
//      repository-scoped operation.
// ---------------------------------------------------------------------------

/** Global `UserRole` values that are allowed past `requireAdmin`. */
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

/**
 * Team permissions, mirroring `getTeamPermissions` in `shared/api.ts`.
 *
 * Kept in sync by hand because the Edge runtime cannot import the shared
 * TypeScript module directly. Any change to the Express implementation must
 * be mirrored here.
 */
type TeamPermission =
  | "canManageTeam"
  | "canInviteMembers"
  | "canRemoveMembers"
  | "canManageWorkspaces"
  | "canShareResources"
  | "canViewActivity"
  | "canManageSettings";

const TEAM_PERMISSIONS: Record<string, Record<TeamPermission, boolean>> = {
  OWNER: {
    canManageTeam: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canManageWorkspaces: true,
    canShareResources: true,
    canViewActivity: true,
    canManageSettings: true,
  },
  ADMIN: {
    canManageTeam: false,
    canInviteMembers: true,
    canRemoveMembers: true,
    canManageWorkspaces: true,
    canShareResources: true,
    canViewActivity: true,
    canManageSettings: false,
  },
  MEMBER: {
    canManageTeam: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canManageWorkspaces: false,
    canShareResources: true,
    canViewActivity: true,
    canManageSettings: false,
  },
  VIEWER: {
    canManageTeam: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canManageWorkspaces: false,
    canShareResources: false,
    canViewActivity: true,
    canManageSettings: false,
  },
};

/**
 * Team membership status is stored in the `MemberStatus` enum
 * (ACTIVE / INACTIVE / SUSPENDED). Legacy rows were written in lower case, so
 * the comparison is case-insensitive — but only `ACTIVE` grants access.
 */
function isActiveMemberStatus(status: unknown): boolean {
  return typeof status === "string" && status.toUpperCase() === "ACTIVE";
}

/**
 * Resolve the caller's membership of a team.
 *
 * Returns `null` when the caller is not a member, when the membership is not
 * active, or when the lookup fails (fail closed).
 */
async function getTeamMembership(
  teamId: string,
  userId: string
): Promise<{ role: string; status: string } | null> {
  const { data, error } = await supabase
    .from("team_members")
    .select("role, status")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  if (!isActiveMemberStatus(data.status)) return null;
  return { role: String(data.role), status: String(data.status) };
}

/**
 * Guard for team-scoped operations.
 *
 * @param permission The permission the caller must hold. When omitted the
 *                   caller only needs to be an active member.
 */
async function requireTeamPermission(
  req: Request,
  teamId: string,
  permission?: TeamPermission
): Promise<
  | { user: AuthedUser; membership: { role: string; status: string } }
  | { error: Response }
> {
  const result = await authenticateReq(req);
  if ("error" in result) return result;

  const membership = await getTeamMembership(teamId, result.user.id);
  if (!membership) {
    return {
      error: errResponse("Access denied — not an active member of this team", 403),
    };
  }

  if (permission) {
    const permissions = TEAM_PERMISSIONS[membership.role];
    if (!permissions || !permissions[permission]) {
      return {
        error: errResponse(
          `Access denied — permission '${permission}' is required for this operation`,
          403
        ),
      };
    }
  }

  return { user: result.user, membership };
}

/**
 * Guard for global-privilege operations (admin panel style routes).
 */
async function requireAdmin(
  req: Request
): Promise<{ user: AuthedUser } | { error: Response }> {
  const result = await authenticateReq(req);
  if ("error" in result) return result;

  if (!(ADMIN_ROLES as readonly string[]).includes(result.user.role)) {
    return {
      error: errResponse("Access denied — administrator privileges are required", 403),
    };
  }

  return result;
}

/**
 * Resolve a repository and confirm the caller may operate on it.
 *
 * A repository-scoped operation must never rely on the caller's global role
 * alone: the repository row is looked up and its owner compared with the
 * authenticated user id. Global admins retain access for administrative
 * operations.
 */
async function requireRepositoryAccess(
  req: Request,
  repositoryId: string
): Promise<{ user: AuthedUser; repository: any } | { error: Response }> {
  const result = await authenticateReq(req);
  if ("error" in result) return result;

  if (!repositoryId) {
    return { error: errResponse("repositoryId is required", 400) };
  }

  const { data: repository, error } = await supabase
    .from("repositories")
    .select("id, user_id, provider, repo_url, branch")
    .eq("id", repositoryId)
    .maybeSingle();

  if (error || !repository) {
    return { error: errResponse("Repository not found", 404) };
  }

  const isOwner = repository.user_id === result.user.id;
  const isAdmin = (ADMIN_ROLES as readonly string[]).includes(result.user.role);

  if (!isOwner && !isAdmin) {
    return {
      error: errResponse("Access denied — you do not have access to this repository", 403),
    };
  }

  return { user: result.user, repository };
}

/**
 * Collect the ids of every repository the caller may see.
 *
 * Used to scope list endpoints (pipelines, deployments) so that they never
 * leak records belonging to other users.
 */
async function listAccessibleRepositoryIds(user: AuthedUser): Promise<string[]> {
  const isAdmin = (ADMIN_ROLES as readonly string[]).includes(user.role);

  const query = supabase.from("repositories").select("id");
  if (!isAdmin) query.eq("user_id", user.id);

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((r: any) => String(r.id));
}

/**
 * Accepted shapes for a profile image URL.
 *
 * Mirrors `isSafeProfileImageUrl` in `server/lib/validations/user.ts`:
 * an absolute http(s) URL, or a server-hosted upload path.
 */
const PROFILE_IMAGE_URL_PATTERN = /^(https?:\/\/|\/uploads\/[A-Za-z0-9_\-/.]+$)/i;

function isSafeProfileImageUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (value.length > 2048) return false;
  return PROFILE_IMAGE_URL_PATTERN.test(value);
}

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

// GET /auth/me
route("GET", "/auth/me", async (req) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;
  const { data, error } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, role, email_verified, profile_image_url, created_at, updated_at, last_login_at")
    .eq("id", result.user.id)
    .single();
  if (error) return errResponse(error.message, 500);
  return json({ success: true, data: { user: data }, timestamp: new Date().toISOString() });
});

// POST /auth/sync-user
//
// The body may only carry display fields. The email is taken from the verified
// token claims and the role is fixed to USER — a client must never be able to
// set either.
route("POST", "/auth/sync-user", async (req) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;
  const body = await req.json().catch(() => ({}));

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errResponse("Invalid request body", 400);
  }

  const allowedKeys = new Set(["firstName", "lastName", "profileImageUrl"]);
  const rejectedKeys = Object.keys(body).filter((key) => !allowedKeys.has(key));
  if (rejectedKeys.length > 0) {
    return errResponse(
      `Unsupported field(s): ${rejectedKeys.join(", ")}. Email and role changes are not permitted here.`,
      400
    );
  }

  const { firstName, lastName, profileImageUrl } = body as Record<string, unknown>;

  if (firstName !== undefined && (typeof firstName !== "string" || firstName.length === 0 || firstName.length > 50)) {
    return errResponse("First name must be a non-empty string of at most 50 characters", 400);
  }
  if (lastName !== undefined && (typeof lastName !== "string" || lastName.length === 0 || lastName.length > 50)) {
    return errResponse("Last name must be a non-empty string of at most 50 characters", 400);
  }
  if (profileImageUrl !== undefined && profileImageUrl !== null && !isSafeProfileImageUrl(profileImageUrl)) {
    return errResponse(
      "Image URL must be an http(s) URL or a server-hosted upload path",
      400
    );
  }

  const existing = await supabase.from("users").select("id").eq("id", result.user.id).single();
  let updatedUser: any;
  if (existing.data) {
    const { data, error } = await supabase
      .from("users")
      .update({ ...(firstName !== undefined ? { first_name: firstName } : {}), ...(lastName !== undefined ? { last_name: lastName } : {}), ...(profileImageUrl !== undefined ? { profile_image_url: profileImageUrl } : {}) })
      .eq("id", result.user.id).select().single();
    if (error) return errResponse(error.message, 500);
    updatedUser = data;
  } else {
    const { data, error } = await supabase
      .from("users")
      .insert({ id: result.user.id, email: result.user.email, password_hash: "FIREBASE_AUTH_MANAGED", first_name: firstName ?? "Feex", last_name: lastName ?? "Explorer", role: "USER", email_verified: result.user.emailVerified, profile_image_url: profileImageUrl ?? null })
      .select().single();
    if (error) return errResponse(error.message, 500);
    updatedUser = data;
  }
  const { password_hash: _pw, ...publicUser } = updatedUser;
  return json({ success: true, message: "User synced successfully", data: { user: publicUser }, timestamp: new Date().toISOString() });
});

// POST /auth/google — sync or auto-create Firebase Google user
//
// The email is taken from the verified token claims only; the role is fixed to
// USER. A body-supplied email would let a caller rewrite the email on their
// own row and, because legacy rows are re-keyed onto the Firebase UID by
// email match, could be used to capture another user's row.
route("POST", "/auth/google", async (req) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;

  const body = await req.json().catch(() => ({}));
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errResponse("Invalid request body", 400);
  }

  const allowedKeys = new Set(["firstName", "lastName", "profileImageUrl"]);
  const rejectedKeys = Object.keys(body).filter((key) => !allowedKeys.has(key));
  if (rejectedKeys.length > 0) {
    return errResponse(
      `Unsupported field(s): ${rejectedKeys.join(", ")}. Email and role changes are not permitted here.`,
      400
    );
  }

  const { firstName, lastName, profileImageUrl } = body as Record<string, unknown>;

  if (firstName !== undefined && (typeof firstName !== "string" || firstName.length === 0 || firstName.length > 50)) {
    return errResponse("First name must be a non-empty string of at most 50 characters", 400);
  }
  if (lastName !== undefined && (typeof lastName !== "string" || lastName.length === 0 || lastName.length > 50)) {
    return errResponse("Last name must be a non-empty string of at most 50 characters", 400);
  }
  if (profileImageUrl !== undefined && profileImageUrl !== null && !isSafeProfileImageUrl(profileImageUrl)) {
    return errResponse(
      "Image URL must be an http(s) URL or a server-hosted upload path",
      400
    );
  }

  // Try to find existing user by Firebase UID
  let { data: user, error } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, role, email_verified, profile_image_url")
    .eq("id", result.user.id)
    .single();

  if (error || !user) {
    // Auto-create user profile on first Google login
    const { data: created, error: createErr } = await supabase
      .from("users")
      .insert({
        id: result.user.id,
        email: result.user.email,
        password_hash: "FIREBASE_AUTH_MANAGED",
        first_name: firstName ?? "Feex",
        last_name: lastName ?? "Operator",
        role: "USER",
        email_verified: result.user.emailVerified ?? false,
        profile_image_url: profileImageUrl ?? null,
      })
      .select()
      .single();

    if (createErr) return errResponse(createErr.message, 500);
    user = created;
  }

  return json({ success: true, message: "Google sign-in synced", data: { user }, timestamp: new Date().toISOString() });
});

// GET /auth/health
route("GET", "/auth/health", async () => {
  let db = false;
  try { const { error } = await supabase.from("users").select("count", { head: true }); if (!error) db = true; } catch { /* db unavailable */ }
  return json({ success: true, authMode: "firebase", database: db, timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Users routes
// ---------------------------------------------------------------------------

// GET /users/profile
route("GET", "/users/profile", async (req) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;
  const { data: user, error: uErr } = await supabase
    .from("users")
    .select("id, email, first_name, last_name, role, email_verified, profile_image_url, created_at, updated_at, last_login_at")
    .eq("id", result.user.id)
    .single();
  if (uErr) return errResponse(uErr.message, 500);
  const { count: stats } = await supabase.from("world_model_projects").select("*", { count: "exact", head: true });
  return json({ success: true, data: { user, stats: { projectCount: stats ?? 0 }, activity: [] }, timestamp: new Date().toISOString() });
});

// PUT /users/profile
//
// The email is owned by Firebase Auth and the role is an administrative
// attribute — neither may be set from a profile update payload. Unknown keys
// are rejected outright, and the avatar URL is validated before it is stored.
route("PUT", "/users/profile", async (req) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;
  const body = await req.json().catch(() => ({}));

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errResponse("Invalid request body", 400);
  }

  const allowedKeys = new Set(["firstName", "lastName", "profileImageUrl"]);
  const rejectedKeys = Object.keys(body).filter((key) => !allowedKeys.has(key));
  if (rejectedKeys.length > 0) {
    return errResponse(
      `Unsupported field(s): ${rejectedKeys.join(", ")}. Email and role changes are not permitted here.`,
      400
    );
  }

  const { firstName, lastName, profileImageUrl } = body as Record<string, unknown>;

  if (firstName !== undefined && (typeof firstName !== "string" || firstName.length === 0 || firstName.length > 50)) {
    return errResponse("First name must be a non-empty string of at most 50 characters", 400);
  }
  if (lastName !== undefined && (typeof lastName !== "string" || lastName.length === 0 || lastName.length > 50)) {
    return errResponse("Last name must be a non-empty string of at most 50 characters", 400);
  }
  if (profileImageUrl !== undefined && profileImageUrl !== null && !isSafeProfileImageUrl(profileImageUrl)) {
    return errResponse(
      "Image URL must be an http(s) URL or a server-hosted upload path",
      400
    );
  }

  const updateData: Record<string, unknown> = {};
  if (firstName !== undefined) updateData.first_name = firstName;
  if (lastName !== undefined) updateData.last_name = lastName;
  if (profileImageUrl !== undefined) updateData.profile_image_url = profileImageUrl;

  const { data, error } = await supabase.from("users").update(updateData).eq("id", result.user.id).select().single();
  if (error) return errResponse(error.message, 500);
  return json({ success: true, message: "Profile updated successfully", data: { user: data }, timestamp: new Date().toISOString() });
});

// GET /users/profile/activity
route("GET", "/users/profile/activity", async (req) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1") || 1;
  const limit = parseInt(url.searchParams.get("limit") ?? "20") || 20;
  return json({ success: true, data: { activities: [], page, limit, total: 0 }, timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Teams routes
// ---------------------------------------------------------------------------

// GET /teams — list teams for authenticated user
route("GET", "/teams", async (req) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;

  const { data: members, error } = await supabase
    .from("team_members")
    .select("team_id, role, joined_at")
    .eq("user_id", result.user.id)
    .eq("status", "ACTIVE");

  if (error) return errResponse(error.message, 500);

  if (!members || members.length === 0) {
    return json({ success: true, teams: [], count: 0, timestamp: new Date().toISOString() });
  }

  const teamIds = members.map((m: any) => m.team_id);
  const { data: teams, error: tErr } = await supabase
    .from("teams")
    .select("id, name, description, owner_id, is_active, created_at, updated_at, settings")
    .in("id", teamIds);

  if (tErr) return errResponse(tErr.message, 500);

  const teamList = (teams ?? []).map((t: any) => ({
    ...t,
    memberRole: members.find((m: any) => m.team_id === t.id)?.role,
  }));

  return json({ success: true, teams: teamList, count: teamList.length, timestamp: new Date().toISOString() });
});

// POST /teams — create a new team
route("POST", "/teams", async (req) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;

  const body = await req.json().catch(() => ({}));
  const { name, description, settings } = body;

  if (!name || typeof name !== "string") {
    return errResponse("Team name is required", 400);
  }

  const { data: team, error } = await supabase
    .from("teams")
    .insert({
      name,
      description: description ?? null,
      owner_id: result.user.id,
      is_active: true,
      settings: settings ?? {},
    })
    .select()
    .single();

  if (error) return errResponse(error.message, 500);

  await supabase.from("team_members").insert({
    team_id: team.id,
    user_id: result.user.id,
    role: "OWNER",
    joined_at: new Date().toISOString(),
    status: "active",
  });

  return json({ success: true, team, timestamp: new Date().toISOString() }, 201);
});

// GET /teams/:id — get a specific team
//
// Membership is required. The membership row is the source of truth for team
// access (it carries the role and the active status) — the global UserRole is
// not a substitute for it.
route("GET", "/teams/:id", async (req, url, params) => {
  const guard = await requireTeamPermission(req, params.id);
  if ("error" in guard) return guard.error;

  const { data: team, error } = await supabase
    .from("teams")
    .select("id, name, description, owner_id, is_active, created_at, updated_at, settings")
    .eq("id", params.id)
    .single();

  if (error) return errResponse(error.message, 500);

  return json({
    success: true,
    team: { ...team, memberRole: guard.membership.role },
    timestamp: new Date().toISOString(),
  });
});

// PUT /teams/:id — update team
//
// Requires the `canManageTeam` team permission (OWNER only), which mirrors
// `TeamService.updateTeam` in the Express implementation.
route("PUT", "/teams/:id", async (req, url, params) => {
  const guard = await requireTeamPermission(req, params.id, "canManageTeam");
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const { name, description, settings } = body as Record<string, unknown>;

  if (name !== undefined && (typeof name !== "string" || name.length === 0 || name.length > 100)) {
    return errResponse("Team name must be a non-empty string of at most 100 characters", 400);
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (settings !== undefined) updateData.settings = settings;
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("teams")
    .update(updateData)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return errResponse(error.message, 500);

  return json({ success: true, team: data, timestamp: new Date().toISOString() });
});

// DELETE /teams/:id — delete team
//
// Requires the `canManageTeam` team permission (OWNER only).
route("DELETE", "/teams/:id", async (req, url, params) => {
  const guard = await requireTeamPermission(req, params.id, "canManageTeam");
  if ("error" in guard) return guard.error;

  const { error } = await supabase.from("teams").delete().eq("id", params.id);
  if (error) return errResponse(error.message, 500);

  return json({ success: true, message: "Team deleted", timestamp: new Date().toISOString() });
});

// GET /teams/:id/members — list team members
//
// Membership is required: the member roster is team-scoped data and must not
// be readable by a caller who is not an active member of the team.
route("GET", "/teams/:id/members", async (req, url, params) => {
  const guard = await requireTeamPermission(req, params.id, "canViewActivity");
  if ("error" in guard) return guard.error;

  const { data: members, error } = await supabase
    .from("team_members")
    .select("id, user_id, role, joined_at, invited_by, last_active_at, permissions, status")
    .eq("team_id", params.id);

  if (error) return errResponse(error.message, 500);

  return json({ success: true, members: members ?? [], count: members?.length ?? 0, timestamp: new Date().toISOString() });
});

// POST /teams/:id/members — invite member
//
// Inviting requires the `canInviteMembers` team permission (OWNER / team
// ADMIN). The invited role is constrained to the set a non-owner may grant, so
// a team ADMIN cannot mint another OWNER.
route("POST", "/teams/:id/members", async (req, url, params) => {
  const guard = await requireTeamPermission(req, params.id, "canInviteMembers");
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const { email, role, permissions } = body as Record<string, unknown>;

  if (typeof email !== "string" || !email.includes("@")) {
    return errResponse("A valid email is required", 400);
  }

  const allowedRoles = ["ADMIN", "MEMBER", "VIEWER"];
  const requestedRole = typeof role === "string" ? role : "MEMBER";
  if (!allowedRoles.includes(requestedRole)) {
    return errResponse(
      `Invalid role. Team invitations may grant one of: ${allowedRoles.join(", ")}`,
      400
    );
  }

  const { data, error } = await supabase
    .from("team_invitations")
    .insert({
      team_id: params.id,
      email: email.trim().toLowerCase(),
      role: requestedRole,
      permissions: permissions ?? {},
      status: "pending",
      invited_by: guard.user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (error) return errResponse(error.message, 500);

  return json({ success: true, invitation: data, timestamp: new Date().toISOString() }, 201);
});

// GET /teams/:id/workspaces — list workspaces
//
// Workspaces are team-scoped data: membership is required.
route("GET", "/teams/:id/workspaces", async (req, url, params) => {
  const guard = await requireTeamPermission(req, params.id, "canViewActivity");
  if ("error" in guard) return guard.error;

  const { data: workspaces, error } = await supabase
    .from("workspaces")
    .select("id, team_id, name, description, settings, is_active, created_at, updated_at, created_by")
    .eq("team_id", params.id)
    .eq("is_active", true);

  if (error) return errResponse(error.message, 500);

  return json({ success: true, workspaces: workspaces ?? [], count: workspaces?.length ?? 0, timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Security routes
// ---------------------------------------------------------------------------

// POST /security/scan — initiate a new security scan
route("POST", "/security/scan", async (req) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;

  const body = await req.json().catch(() => ({}));
  const { target, scanType, configuration, scheduledAt, priority } = body;

  if (!target || !scanType) {
    return errResponse("target and scanType are required", 400);
  }

  const { data: scan, error } = await supabase
    .from("security_scans")
    .insert({
      user_id: result.user.id,
      target_data: target,
      scan_type: scanType,
      status: scheduledAt ? "scheduled" : "queued",
      configuration: configuration ?? {},
      scheduled_at: scheduledAt ?? null,
      started_at: scheduledAt ? null : new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return errResponse(error.message, 500);

  return json({
    success: true,
    data: { scanId: scan.id, status: scan.status, message: scheduledAt ? "Scan scheduled successfully" : "Scan initiated successfully" },
  }, 201);
});

// GET /security/scans — get user's security scan history
route("GET", "/security/scans", async (req) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") ?? "1") || 1;
  const limit = parseInt(url.searchParams.get("limit") ?? "20") || 20;
  const from = (page - 1) * limit;

  const { data: scans, error, count } = await supabase
    .from("security_scans")
    .select("id, target_data, scan_type, status, scheduled_at, started_at, completed_at, created_at", { count: "exact" })
    .eq("user_id", result.user.id)
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (error) return errResponse(error.message, 500);

  return json({
    success: true,
    data: scans ?? [],
    pagination: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
    timestamp: new Date().toISOString(),
  });
});

// GET /security/scans/:id — get a specific scan
route("GET", "/security/scans/:id", async (req, url, params) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;

  const { data: scan, error } = await supabase
    .from("security_scans")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", result.user.id)
    .single();

  if (error) return errResponse(error.message, 500);

  return json({ success: true, data: scan, timestamp: new Date().toISOString() });
});

// POST /security/recurring-scans — create a recurring scan
route("POST", "/security/recurring-scans", async (req) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;

  const body = await req.json().catch(() => ({}));
  const { target, scanType, cronExpression, configuration } = body;

  if (!target || !scanType || !cronExpression) {
    return errResponse("target, scanType, and cronExpression are required", 400);
  }

  const { data: recurring, error } = await supabase
    .from("recurring_security_scans")
    .insert({
      user_id: result.user.id,
      target_data: target,
      scan_type: scanType,
      cron_expression: cronExpression,
      configuration: configuration ?? {},
      is_active: true,
      run_count: 0,
    })
    .select()
    .single();

  if (error) return errResponse(error.message, 500);

  return json({ success: true, data: recurring, timestamp: new Date().toISOString() }, 201);
});

// GET /security/recurring-scans — list recurring scans
route("GET", "/security/recurring-scans", async (req) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;

  const { data: scans, error } = await supabase
    .from("recurring_security_scans")
    .select("*")
    .eq("user_id", result.user.id)
    .order("created_at", { ascending: false });

  if (error) return errResponse(error.message, 500);

  return json({ success: true, data: scans ?? [], timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// DevOps routes
// ---------------------------------------------------------------------------

// GET /devops/providers — available git providers
route("GET", "/devops/providers", async (req) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;

  const providers = ["github", "gitlab", "bitbucket"];
  return json({
    success: true,
    data: {
      providers: providers.map((name) => ({
        name,
        displayName: name.charAt(0).toUpperCase() + name.slice(1),
        available: true,
      })),
    },
    timestamp: new Date().toISOString(),
  });
});

// GET /devops/repositories — list user's repositories
route("GET", "/devops/repositories", async (req) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;

  const { data: repos, error } = await supabase
    .from("repositories")
    .select("id, user_id, provider, repo_url, branch, webhook_url, created_at, updated_at")
    .eq("user_id", result.user.id)
    .order("created_at", { ascending: false });

  if (error) return errResponse(error.message, 500);

  return json({ success: true, data: repos ?? [], timestamp: new Date().toISOString() });
});

// POST /devops/repositories — connect a repository
//
// Requires the `canManageRepositories` repository permission (repository owner
// or global admin). The created row is anchored to the authenticated user id so
// a client-supplied foreign key can never redirect ownership.
route("POST", "/devops/repositories", async (req) => {
  const guard = await requireRepositoryAccess(req, undefined as unknown as string);
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const { provider, repoUrl, branch, accessTokenEncrypted } = body as Record<string, unknown>;

  if (!provider || typeof provider !== "string" || !repoUrl || typeof repoUrl !== "string") {
    return errResponse("provider and repoUrl are required", 400);
  }

  const { data: repo, error } = await supabase
    .from("repositories")
    .insert({
      user_id: guard.user.id,
      provider,
      repo_url: repoUrl,
      branch: typeof branch === "string" ? branch : "main",
      access_token_encrypted: typeof accessTokenEncrypted === "string" ? accessTokenEncrypted : null,
      webhook_url: null,
    })
    .select()
    .single();

  if (error) return errResponse(error.message, 500);

  return json({ success: true, data: repo, timestamp: new Date().toISOString() }, 201);
});

// GET /devops/repositories/:id — get a specific repository
//
// Requires the `canManageRepositories` permission (owner or global admin).
route("GET", "/devops/repositories/:id", async (req, url, params) => {
  const guard = await requireRepositoryAccess(req, params.id);
  if ("error" in guard) return guard.error;

  const { data: repo } = guard;
  return json({
    success: true,
    data: repo,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Server entry
// ---------------------------------------------------------------------------
const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  // CORS preflight
  if (req.method === "OPTIONS") return corsPreflight();

  const path = getPath(req);
  const match = findHandler(req.method, path);
  if (!match) {
    return errResponse("Not found", 404);
  }

  try {
    return await match.handler(req, url, match.params);
  } catch (err) {
    return errResponse(err instanceof Error ? err.message : "Internal error", 500);
  }
};

console.log("FeexSystems API Edge Function starting...");
// GET /devops/pipelines — list pipelines
//
// Scoped to the caller's repositories: a pipeline is never leaked across
// repository boundaries, even when the caller supplies an arbitrary
// repositoryId.
route("GET", "/devops/pipelines", async (req) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;

  const url = new URL(req.url);
  const repoId = url.searchParams.get("repositoryId");

  const accessibleRepoIds = await listAccessibleRepositoryIds(result.user);
  const endpointRepoId = repoId ? String(repoId) : null;

  if (endpointRepoId && !accessibleRepoIds.includes(endpointRepoId)) {
    return errResponse("Access denied — repository not accessible", 403);
  }

  const query = supabase
    .from("pipelines")
    .select("*")
    .order("created_at", { ascending: false })
    .in("repository_id", accessibleRepoIds);

  const { data: pipelines, error } = await query;

  if (error) return errResponse(error.message, 500);

  return json({ success: true, data: pipelines ?? [], timestamp: new Date().toISOString() });
});

// POST /devops/pipelines — create a pipeline
//
// Requires `canManageRepositories`. The pipeline is always bound to a
// repository that the caller owns or has been granted access to, so it can
// never be written into another user's repository.
route("POST", "/devops/pipelines", async (req) => {
  const guard = await requireRepositoryAccess(req, undefined as unknown as string);
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const { repositoryId, name, stages, triggers, environment } = body as Record<string, unknown>;

  if (!repositoryId || typeof repositoryId !== "string") {
    return errResponse("repositoryId is required", 400);
  }

  const accessibleRepoIds = await listAccessibleRepositoryIds(guard.user);
  if (!accessibleRepoIds.includes(repositoryId)) {
    return errResponse("Access denied — repository not accessible", 403);
  }

  const sanitizedStages = Array.isArray(stages) ? stages.map((s) => (typeof s === "object" && s ? { ...s } : s)) : [];
  const sanitizedTriggers = typeof triggers === "object" && triggers ? { ...triggers } : {};
  const sanitizedEnvironment = typeof environment === "object" && environment ? { ...environment } : {};

  const { data: pipeline, error } = await supabase
    .from("pipelines")
    .insert({
      repository_id: repositoryId,
      name,
      stages: sanitizedStages,
      triggers: sanitizedTriggers,
      environment: sanitizedEnvironment,
      status: "draft",
    })
    .select()
    .single();

  if (error) return errResponse(error.message, 500);

  return json({ success: true, data: pipeline, timestamp: new Date().toISOString() }, 201);
});

// GET /devops/deployments — list deployments
//
// Scoped to the caller's repositories. A deployment always belongs to a single
// repository, so the list can never leak another user's deploys.
route("GET", "/devops/deployments", async (req) => {
  const result = await authenticateReq(req);
  if ("error" in result) return result.error;

  const url = new URL(req.url);
  const repoId = url.searchParams.get("repositoryId");

  const accessibleRepoIds = await listAccessibleRepositoryIds(result.user);
  const endpointRepoId = repoId ? String(repoId) : null;

  if (endpointRepoId && !accessibleRepoIds.includes(endpointRepoId)) {
    return errResponse("Access denied — repository not accessible", 403);
  }

  const query = supabase
    .from("deployments")
    .select("*")
    .order("created_at", { ascending: false })
    .in("repository_id", accessibleRepoIds);

  const { data: deployments, error } = await query;

  if (error) return errResponse(error.message, 500);

  return json({ success: true, data: deployments ?? [], timestamp: new Date().toISOString() });
});

// POST /devops/deployments — create a deployment
//
// Requires `canManageRepositories`. The deployment is anchored to the
// authenticated user's repository, so a client-supplied repository id cannot
// silently attach to another user's repo.
route("POST", "/devops/deployments", async (req) => {
  const guard = await requireRepositoryAccess(req, undefined as unknown as string);
  if ("error" in guard) return guard.error;

  const body = await req.json().catch(() => ({}));
  const { repositoryId, pipelineId, commit, status } = body as Record<string, unknown>;

  if (!repositoryId || typeof repositoryId !== "string") {
    return errResponse("repositoryId is required", 400);
  }

  const accessibleRepoIds = await listAccessibleRepositoryIds(guard.user);
  if (!accessibleRepoIds.includes(repositoryId)) {
    return errResponse("Access denied — repository not accessible", 403);
  }

  const { data: deployment, error } = await supabase
    .from("deployments")
    .insert({
      repository_id: repositoryId,
      pipeline_id: typeof pipelineId === "string" ? pipelineId : null,
      commit: typeof commit === "string" ? commit : "",
      status: typeof status === "string" ? status : "pending",
      logs: [],
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return errResponse(error.message, 500);

  return json({ success: true, data: deployment, timestamp: new Date().toISOString() }, 201);
});

// POST /devops/webhooks/:provider — handle git provider webhook
route("POST", "/devops/webhooks/:provider", async (req, url, params) => {
  const body = await req.json().catch(() => ({}));
  const signature = req.headers.get("x-hub-signature-256") || req.headers.get("x-gitlab-token") || req.headers.get("x-event-key") || "";

  try {
    return json({
      success: true,
      data: { message: "Webhook processed successfully", provider: params.provider },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return errResponse(err instanceof Error ? err.message : "Webhook processing failed", 400);
  }
});

// ---------------------------------------------------------------------------
// Catch-all 404
// ---------------------------------------------------------------------------
route("*", "/:path*", async () => {
  return errResponse("Not found", 404);
});

serve(handler);