#!/bin/pwsh
$ErrorActionPreference = "Stop"
$ws = "f:/ENGR BILLI/FeexSystems-Living-Intelligence-World"
Set-Location $ws
& "$ws/node_modules/.bin/vitest" run "client/test/hooks/use-auth.test.tsx" 2>&1 | Out-File -FilePath "$ws/test-output.txt" -Encoding UTF8
Write-Host "Tests completed. Output written to $ws/test-output.txt"