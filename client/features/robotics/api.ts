/**
 * Robotics API client — calls /api/robotics/* endpoints.
 * Mirrors the world-model API client pattern.
 */

export interface RoboticsListParams {
  robotClass?: string;
  domain?: string;
  lifecycle?: string;
  protocol?: string;
  holokaiIntegrated?: boolean;
  q?: string;
  limit?: number;
}

export interface RoboticsFacets {
  modalities: Array<{ value: string; label: string; count: number }>;
  statuses: Array<{ value: string; label: string; count: number }>;
  lifecycles: Array<{ value: string; label: string; count: number }>;
  organizations: Array<{ value: string; label: string; count: number }>;
}

export interface RoboticsStatus {
  service: string;
  holokaiIntegration: boolean;
  roboticsWorldCount: number;
  status: string;
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Robotics API ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

/** List robotics worlds with optional facet filters. */
export async function listRobotics(
  params: RoboticsListParams = {},
): Promise<{ success: boolean; data: any[]; count: number; facet: { category: string } }> {
  const qs = new URLSearchParams();
  if (params.robotClass) qs.set("robotClass", params.robotClass);
  if (params.domain) qs.set("domain", params.domain);
  if (params.lifecycle) qs.set("lifecycle", params.lifecycle);
  if (params.protocol) qs.set("protocol", params.protocol);
  if (params.holokaiIntegrated !== undefined) qs.set("holokaiIntegrated", String(params.holokaiIntegrated));
  if (params.q) qs.set("q", params.q);
  if (params.limit) qs.set("limit", String(params.limit));

  return json<{
    success: boolean;
    data: any[];
    count: number;
    facet: { category: string };
  }>(`/api/robotics?${qs.toString()}`);
}

/** Get a single robotics world detail. */
export async function getRoboticsDetail(
  robotId: string,
): Promise<{ success: boolean; data: any }> {
  return json<{ success: boolean; data: any }>(`/api/robotics/${encodeURIComponent(robotId)}`);
}

/** Get robotics facet option values for filtering UI. */
export async function getRoboticsFacets(): Promise<{ success: boolean; data: RoboticsFacets }> {
  return json<{ success: boolean; data: RoboticsFacets }>("/api/robotics/facets");
}

/** Create or update robotics world metadata (admin). */
export async function upsertRobotics(
  body: Record<string, unknown>,
): Promise<{ success: boolean; data: any }> {
  return json<{ success: boolean; data: any }>("/api/robotics", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Update robotics world faceted metadata (admin). */
export async function updateRoboticsMetadata(
  robotId: string,
  body: Record<string, unknown>,
): Promise<{ success: boolean; data: any }> {
  return json<{ success: boolean; data: any }>(
    `/api/robotics/${encodeURIComponent(robotId)}/metadata`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

/** Robotics service health check. */
export async function getRoboticsStatus(): Promise<{ success: boolean; data: RoboticsStatus }> {
  return json<{ success: boolean; data: RoboticsStatus }>("/api/robotics/status");
}