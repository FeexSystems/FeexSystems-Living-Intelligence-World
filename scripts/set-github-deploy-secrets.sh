#!/usr/bin/env bash
# ============================================================================
# FeexSystems — Add the 3 deploy secrets to the GitHub repo
# ============================================================================
# Run this ONCE after the WIF pool + SA bindings are in place (see
# docs/CI-DEPLOYMENT-SETUP.md). It sets:
#   - GCP_PROJECT_ID       = feexsystems-prod-508304
#   - WIF_PROVIDER         = projects/1098867692790/locations/global/
#                            workloadIdentityPools/github-pool/providers/github-provider
#   - WIF_SERVICE_ACCOUNT  = github-deployer@feexsystems-prod-508304.iam.gserviceaccount.com
#
# Prereqs:
#   - GitHub CLI (gh) installed: https://cli.github.com/
#   - Authenticated against FeexSystems org with `repo` scope:
#         gh auth login
#
# Usage (PowerShell on Windows, or bash/zsh on macOS/Linux):
#   bash scripts/set-github-deploy-secrets.sh
#
# Re-runnable (idempotent — `gh secret set` upserts).
# ============================================================================

set -euo pipefail

REPO="${GITHUB_REPO:-FeexSystems/FeexSystems-Living-Intelligence-World}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install: https://cli.github.com/" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Not authenticated with gh. Run: gh auth login" >&2
  exit 1
fi

declare -A SECRETS=(
  [GCP_PROJECT_ID]="feexsystems-prod-508304"
  [WIF_PROVIDER]="projects/1098867692790/locations/global/workloadIdentityPools/github-pool/providers/github-provider"
  [WIF_SERVICE_ACCOUNT]="github-deployer@feexsystems-prod-508304.iam.gserviceaccount.com"
)

echo "== Adding 3 deploy secrets to $REPO =="

for NAME in "${!SECRETS[@]}"; do
  VALUE="${SECRETS[$NAME]}"
  echo -n "  - $NAME ... "
  printf '%s' "$VALUE" | gh secret set "$NAME" --repo "$REPO" --body -
  echo "ok"
done

echo ""
echo "Verify: https://github.com/$REPO/settings/secrets/actions"
echo "Next:    create a 'production' GitHub Environment and add a required reviewer."
