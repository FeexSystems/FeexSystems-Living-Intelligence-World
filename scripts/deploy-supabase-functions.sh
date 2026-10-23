#!/usr/bin/env bash
# FeexSystems — Supabase Edge Functions local deploy.
# This deploys the bundled `api` Edge Function to Supabase.
#
# Prerequisites (one-time):
#   1. Install Supabase CLI:  npm install  (or globally: npm i -g supabase)
#   2. Link the project:      supabase link --project-ref <ref>
#      (already linked — see supabase/.temp/linked-project.json)
#   3. Set env vars in the Supabase dashboard (Edge Functions → api → Env Vars):
#      FEEX_SUPABASE_URL, FEEX_SUPABASE_SERVICE_ROLE_KEY, CORS_ORIGIN
#   4. Authenticate locally: supabase login (or set SUPABASE_ACCESS_TOKEN)
#
# Usage:
#   npm run deploy:supabase        # macOS / Linux / WSL
#   npm run deploy:supabase:win    # Windows
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== FeexSystems — Supabase Edge Functions deploy =="

# 1) Deploy the Edge Function bundle.
echo "[1/1] Deploying 'api' Edge Function to Supabase..."
# Resolve project ref from linked project or fall back to known ref.
REF="$(cat supabase/.temp/project-ref 2>/dev/null || echo 'anzhoagofbebgojbidxu')"
npx supabase functions deploy api --project-ref "$REF"

# 2) Done.
echo "[done] Deployment complete."
echo "  - Function endpoint: https://${REF}.functions.supabase.co/api/health"
echo "  - Run 'supabase functions logs api --tail' to monitor."