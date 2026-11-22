/**
 * G5 Stage 3 — EIL renderer projection kill switch.
 *
 * Single source of truth for whether the humanoid projection mounts.
 * Rollback = set to false (or revert the Stage 3 PRs): every consumer
 * renders the pre-EIL scene. No persisted state is affected — the EIL
 * runtime is ephemeral by construction.
 */
export const EIL_PROJECTION_ENABLED = true;
