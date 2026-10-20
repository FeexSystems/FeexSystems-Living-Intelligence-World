$token = $env:GITHUB_TOKEN
$headers = @{
    "Accept" = "application/vnd.github+json"
}
if ($token) {
    $headers["Authorization"] = "Bearer $token"
}

$repo = "FeexSystems/FeexSystems-Living-Intelligence-World"
$branch = "feat/ai-core-mission-005"

try {
    $resp = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/branches/$branch" -Headers $headers -TimeoutSec 10 -Method Delete
    Write-Output "Deleted branch: $($resp.name)"
} catch {
    Write-Output "Error: $($_.Exception.Response.StatusCode.value__) $($_.Exception.Response.StatusDescription)"
    Write-Output "Body: $($_.Exception.Response.Content.ReadAsStringAsync().Result)"
}