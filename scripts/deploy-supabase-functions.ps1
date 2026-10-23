<#
.FeexSystems — Supabase Edge Functions local deploy
==================================================

Deploys the bundled `api` Edge Function to Supabase (replaces the
monolithic index.ts routing with a `supabase functions deploy` workflow).

Prerequisites (one-time):
  1. Install Supabase CLI:  npm install  (provides npx supabase)
  2. Link the project:      supabase link --project-ref <ref>
     (already linked — see supabase/.temp/linked-project.json)
  3. Set env vars in the Supabase dashboard (Edge Functions → api → Env Vars):
     FEEX_SUPABASE_URL, FEEX_SUPABASE_SERVICE_ROLE_KEY, CORS_ORIGIN
  4. Authenticate locally:  supabase login (or set SUPABASE_ACCESS_TOKEN)

Usage:
  npm run deploy:supabase:win    # Windows
  npm run deploy:supabase        # macOS / Linux / WSL
#>

$ErrorActionPreference = "Stop"

Write-Host "== FeexSystems — Supabase Edge Functions deploy ==" -ForegroundColor Cyan

Write-Host "[1/1] Deploying 'api' Edge Function to Supabase..." -ForegroundColor Cyan
$Ref = if (Test-Path "supabase/.temp/project-ref") { Get-Content "supabase/.temp/project-ref" -Raw } else { "anzhoagofbebgojbidxu" }
$npx = "npx supabase functions deploy api --project-ref `"$Ref`""
Write-Host "  Running: $npx" -ForegroundColor DarkGray
Invoke-Expression $npx
Write-Host "[done] Deployment complete." -ForegroundColor Green
Write-Host "  - Function endpoint: https://$Ref.functions.supabase.co/api/health"
Write-Host "  - Run 'supabase functions logs api --tail' to monitor."