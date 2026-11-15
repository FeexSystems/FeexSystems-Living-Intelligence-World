$ErrorActionPreference = 'Stop'
$SourceDir = 'C:\Users\ENGR BILLI\Downloads\FEEXSYSTEMS WORLD ASSETS (1)'
$TargetBase = Join-Path $PSScriptRoot '..\public\media'
$FileMap = @(
  @{ Pattern = 'FEEX_WORLD_02_YURRHEELER*.mp4'; Dest = 'worlds\world-02-yurrheeler.mp4' },
  @{ Pattern = 'FEEX_WORLD_03_FARMPLUG*.mp4'; Dest = 'worlds\world-03-farmplug.mp4' },
  @{ Pattern = 'FEEX_WORLD_04_FIREHOUSE*.mp4'; Dest = 'worlds\world-04-firehouse.mp4' },
  @{ Pattern = 'FEEX_WORLD_06_KAPPA*.mp4'; Dest = 'worlds\world-06-kappa.mp4' },
  @{ Pattern = 'FEEX_WORLD_07_RENTALL*.mp4'; Dest = 'worlds\world-07-rentall.mp4' },
  @{ Pattern = 'Smart_home_interior*.mp4'; Dest = 'worlds\world-07-rentall-interior.mp4' },
  @{ Pattern = 'FEEX_WORLD_08_HOLOKAI*.mp4'; Dest = 'worlds\world-08-holokai.mp4' },
  @{ Pattern = 'FEEX_WORLD_09_VYRA*.mp4'; Dest = 'worlds\world-09-vyra.mp4' },
  @{ Pattern = 'Scientist_observing*.mp4'; Dest = 'architect\scientist-observing-universe.mp4' },
  @{ Pattern = 'Scientist_speaks_and_robot_eyes*.mp4'; Dest = 'architect\scientist-robot-eyes.mp4' },
  @{ Pattern = 'Holokai_scans*.mp4'; Dest = 'holokai\holokai-env-scan.mp4' },
  @{ Pattern = 'FEEX_NAVIGATOR_S01*.mp4'; Dest = 'surfaces\navigator-s01.mp4' },
  @{ Pattern = 'FEEX_EVIDENCE_S01_KEYFRAME*.jpg'; Dest = 'surfaces\evidence-s01-keyframe.jpg' },
  @{ Pattern = 'FEEX_GALAXY_S04_CORE_KEYFRAME*.jpg'; Dest = 'surfaces\galaxy-s04-core.jpg' }
)
if (-not (Test-Path $SourceDir)) { throw "World media source directory missing: $SourceDir" }
foreach ($directory in @('worlds', 'architect', 'holokai', 'surfaces')) {
  New-Item -ItemType Directory -Path (Join-Path $TargetBase $directory) -Force | Out-Null
}
foreach ($item in $FileMap) {
  $source = Get-ChildItem -Path $SourceDir -File -Filter $item.Pattern | Select-Object -First 1
  if ($source) {
    $destination = Join-Path $TargetBase $item.Dest
    Copy-Item -LiteralPath $source.FullName -Destination $destination -Force
    Write-Output "[OK] $($source.Name) -> $destination"
  } else {
    Write-Warning "[MISSING] No source matched $($item.Pattern)"
  }
}
