/**
 * Stage 2 Navigator display normalization.
 * Client-only projection of the existing Navigator response. It does not
 * issue requests, change the server contract, or create EIL evidence values.
 * A grounded-evidence count is display metadata, not a stable evidence ID.
 */
export interface NormalizedNavigatorResult {
  kind: "success" | "error" | "unavailable";
  data?: Record<string, unknown>;
  errorMessage?: string;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function normalizeNavigatorResponse(payload: unknown): NormalizedNavigatorResult {
  if (!isRecord(payload)) {
    return { kind: "unavailable", errorMessage: "Navigator returned an invalid response." };
  }
  if (payload.success === false) {
    const error = isRecord(payload.error) ? payload.error : undefined;
    const message = typeof error?.message === "string" && error.message.trim()
      ? error.message : "Navigator request failed.";
    return { kind: "error", errorMessage: message };
  }
  if (payload.success === true) {
    if (!isRecord(payload.data)) {
      return { kind: "unavailable", errorMessage: "Navigator response data is unavailable." };
    }
    return { kind: "success", data: payload.data };
  }
  const hasNavigatorFields =
    "explanation" in payload || "summary" in payload || "projects" in payload ||
    "llm" in payload || "groundedEvidenceCount" in payload;
  return hasNavigatorFields
    ? { kind: "success", data: payload }
    : { kind: "unavailable", errorMessage: "Navigator response shape is unavailable." };
}
