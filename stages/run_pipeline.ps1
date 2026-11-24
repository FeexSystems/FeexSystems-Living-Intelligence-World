# FEEX-HUMANOID-REDESIGN — Pipeline Orchestration Bootstrapper
# Handles consecutive tool verification calls across terminal sessions.
# Each stage writes a persistent status block to logs/pipeline-status.json
# so reruns resume cleanly regardless of which shell invoked them.

param(
    [string]$WorkspaceRoot = (Resolve-Path "$PSScriptRoot\..").Path,
    [string]$StartStage = "01",
    [switch]$SkipVerification
)

$ErrorActionPreference = "Continue"
$LogDir = Join-Path $WorkspaceRoot "logs"
$StatusFile = Join-Path $LogDir "pipeline-status.json"
$TranscriptLog = Join-Path $LogDir ("pipeline-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Start-Transcript -Path $TranscriptLog -Append | Out-Null

function Write-StageStatus {
    param([string]$Stage, [string]$State, [string]$Detail = "")
    $status = @{ stage = $Stage; state = $State; detail = $Detail; timestamp = (Get-Date).ToString("o") }
    if (Test-Path $StatusFile) {
        $all = Get-Content $StatusFile -Raw | ConvertFrom-Json
    } else {
        $all = @()
    }
    $all = @($all | Where-Object { $_.stage -ne $Stage }) + $status
    $all | ConvertTo-Json -Depth 5 | Set-Content $StatusFile
    Write-Host "[$Stage] $State — $Detail"
}

function Assert-Tool {
    param([string]$Name, [string]$Path)
    if (-not (Test-Path $Path)) {
        Write-StageStatus -Stage $Name -State "BLOCKED" -Detail "Binary missing: $Path"
        return $false
    }
    return $true
}

# --- Stage 01: Unreal ARKit bake -------------------------------------------
if ($StartStage -le "01") {
    Write-StageStatus -Stage "01-unreal-glb-export" -State "CHECKING"
    $cfg = Get-Content (Join-Path $WorkspaceRoot "_config/pipeline.yaml") -Raw
    $unrealCmd = "C:\Program Files\Epic Games\UE_5.7\Engine\Binaries\Win64\UnrealEditor-Cmd.exe"
    $uproject  = "C:\FeexSystems-Living-Intelligence-World\FEEX_World.uproject"

    if (-not $SkipVerification) {
        if (-not (Assert-Tool "01-unreal-glb-export" $unrealCmd)) { exit 1 }
        if (-not (Assert-Tool "01-unreal-glb-export" $uproject))  { exit 1 }
    }

    $script = Join-Path $WorkspaceRoot "stages\01-unreal-glb-export\tools\bake_arkit_sequence.py"
    & $unrealCmd $uproject -run=pythonscript -script=$script -headless -noscriptwarning
    if ($LASTEXITCODE -eq 0) {
        Write-StageStatus -Stage "01-unreal-glb-export" -State "PASS"
    } else {
        Write-StageStatus -Stage "01-unreal-glb-export" -State "FAIL" -Detail "exit=$LASTEXITCODE"
        exit 1
    }
}

# --- Stage 02: Blender shapekey transfer ------------------------------------
if ($StartStage -le "02") {
    Write-StageStatus -Stage "02-blender-assemble" -State "CHECKING"
    $blenderBin = "C:\Program Files\Blender Foundation\Blender 5.0\blender.exe"

    if (-not $SkipVerification) {
        if (-not (Assert-Tool "02-blender-assemble" $blenderBin)) { exit 1 }
    }

    $script = Join-Path $WorkspaceRoot "stages\02-blender-assemble\tools\shapekey_transfer.py"
    & $blenderBin -b -P $script
    if ($LASTEXITCODE -ne 0) {
        Write-StageStatus -Stage "02-blender-assemble" -State "FAIL" -Detail "transfer exit=$LASTEXITCODE"
        exit 1
    }

    # Morph delta range gate — must pass before the web target is built
    $validator = Join-Path $WorkspaceRoot "stages\02-blender-assemble\tools\validate_morph_deltas.py"
    & $blenderBin -b -P $validator
    if ($LASTEXITCODE -eq 0) {
        Write-StageStatus -Stage "02-blender-assemble" -State "PASS"
    } else {
        Write-StageStatus -Stage "02-blender-assemble" -State "FAIL" -Detail "morph delta validation exit=$LASTEXITCODE"
        exit 1
    }
}

# --- Stage 02b: Mixamo control-rig generation --------------------------------
if ($StartStage -le "02b") {
    Write-StageStatus -Stage "02b-mixamo-control-rig" -State "CHECKING"
    $blendFile = Join-Path $WorkspaceRoot "docs\characters\feex_sovereign\assembled.blend"
    if (-not (Test-Path $blendFile)) {
        Write-StageStatus -Stage "02b-mixamo-control-rig" -State "SKIPPED" -Detail "assembled.blend missing — no Mixamo scene to rig"
    } else {
        $rigScript = Join-Path $WorkspaceRoot "stages\02-blender-assemble\tools\generate_control_rig.py"
        & $blenderBin -b $blendFile -P $rigScript -- --armature "Armature"
        if ($LASTEXITCODE -eq 0) {
            Write-StageStatus -Stage "02b-mixamo-control-rig" -State "PASS"
        } else {
            Write-StageStatus -Stage "02b-mixamo-control-rig" -State "FAIL" -Detail "rig generation exit=$LASTEXITCODE"
            exit 1
        }
    }
}

# --- Stage 03: Web GLB export + Draco packing -------------------------------
if ($StartStage -le "03") {
    Write-StageStatus -Stage "03-export-to-glb" -State "CHECKING"
    $blendFile = Join-Path $WorkspaceRoot "docs\characters\feex_sovereign\assembled.blend"
    $intermediate = Join-Path $WorkspaceRoot "docs\characters\feex_sovereign\uncompressed.glb"

    # Produce the uncompressed GLB intermediate if it doesn't exist yet
    if (-not (Test-Path $intermediate)) {
        if (Test-Path $blendFile) {
            $exportScript = Join-Path $WorkspaceRoot "stages\02-blender-assemble\tools\export_web_glb.py"
            # --action exports only the Idles_Breathing clip (ACTIVE_ACTIONS mode,
            # all other actions/NLA muted). Remove the flag for a morph-only GLB.
            & $blenderBin -b $blendFile -P $exportScript -- --output $intermediate --action "Idles_Breathing"
            if ($LASTEXITCODE -ne 0) {
                Write-StageStatus -Stage "03-export-to-glb" -State "FAIL" -Detail "glb export exit=$LASTEXITCODE"
                exit 1
            }
        } else {
            Write-StageStatus -Stage "03-export-to-glb" -State "BLOCKED" -Detail "assembled.blend missing — cannot produce uncompressed.glb"
            exit 1
        }
    }

    Push-Location $WorkspaceRoot
    python (Join-Path $WorkspaceRoot "stages\03-export-to-glb\tools\compress_to_web.py")
    $code = $LASTEXITCODE
    Pop-Location

    if ($code -eq 0) {
        # Verify the compressed GLB contract: Idles_Breathing clip + morph targets
        $compressedGlb = Join-Path $WorkspaceRoot "docs\characters\feex_sovereign\feex_sovereign.glb"
        if (Test-Path $compressedGlb) {
            npx --no-install gltf-transform inspect $compressedGlb --format md
            node (Join-Path $WorkspaceRoot "stages\03-export-to-glb\tools\verify_glb.mjs") $compressedGlb "Idles_Breathing"
            if ($LASTEXITCODE -ne 0) {
                Write-StageStatus -Stage "03-export-to-glb" -State "FAIL" -Detail "GLB verification failed"
                exit 1
            }
        }
        Write-StageStatus -Stage "03-export-to-glb" -State "PASS"
    } else {
        Write-StageStatus -Stage "03-export-to-glb" -State "FAIL" -Detail "exit=$code"
        exit 1
    }
}

# --- Stage 04: Webview asset delivery ----------------------------------------
if ($StartStage -le "04") {
    Write-StageStatus -Stage "04-webview-build" -State "CHECKING"
    Push-Location $WorkspaceRoot
    node (Join-Path $WorkspaceRoot "stages\03-export-to-glb\tools\copy_to_client.js")
    $code = $LASTEXITCODE
    Pop-Location
    if ($code -eq 0) {
        Write-StageStatus -Stage "04-webview-build" -State "PASS"
    } else {
        Write-StageStatus -Stage "04-webview-build" -State "FAIL" -Detail "asset delivery exit=$code"
        exit 1
    }
}

Stop-Transcript | Out-Null
Write-Host "Pipeline orchestration complete. Status: $StatusFile"
