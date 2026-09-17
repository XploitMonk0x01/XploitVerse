<#
.SYNOPSIS
    XploitVerse - Add Lab Automation Script (PowerShell for Windows)
.DESCRIPTION
    Interactively or via argument adds a challenge lab:
    1. Validates lab directory and Dockerfile
    2. Builds Docker image
    3. Computes flag SHA-256 hash
    4. Inserts Asset, Room, Module, Task into PostgreSQL container (xv-postgres)
#>

param(
    [string]$LabName
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$ChallengesDir = "$RootDir\challenges"
$PostgresContainer = "xv-postgres"
$DbName = "xploitverse"
$DbUser = "postgres"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   XploitVerse - Add Lab Automation (PowerShell)  " -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

if (-not $LabName) {
    Write-Host "Available lab directories in challenges:" -ForegroundColor Yellow
    Get-ChildItem -Directory -Path $ChallengesDir | ForEach-Object {
        $dockerfilePath = Join-Path $_.FullName "Dockerfile"
        if (Test-Path $dockerfilePath) {
            Write-Host "  [OK] $($_.Name)" -ForegroundColor Green
        } else {
            Write-Host "  [--] $($_.Name) (no Dockerfile)" -ForegroundColor DarkGray
        }
    }
    Write-Host ""
    $LabName = Read-Host "Enter the lab directory name (e.g. sqli-lab, owasp-juice)"
}

$LabDir = Join-Path $ChallengesDir $LabName
if (-not (Test-Path $LabDir)) {
    Write-Error "Directory not found: $LabDir"
    exit 1
}

$DockerfilePath = Join-Path $LabDir "Dockerfile"
if (-not (Test-Path $DockerfilePath)) {
    Write-Error "No Dockerfile found in $LabDir"
    exit 1
}

Write-Host "[OK] Lab directory validated: $LabDir" -ForegroundColor Green

$LabDisplayName = Read-Host "Lab display name (e.g. 'SQL Injection Lab') [$LabName]"
if (-not $LabDisplayName) { $LabDisplayName = $LabName }

$LabDescription = Read-Host "Description [Vulnerable security challenge environment for $LabName]"
if (-not $LabDescription) { $LabDescription = "Vulnerable security challenge environment for $LabName" }

$LabDifficulty = Read-Host "Difficulty (Easy/Medium/Hard) [Easy]"
if (-not $LabDifficulty) { $LabDifficulty = "Easy" }

$LabCategory = Read-Host "Category (e.g. 'Web Exploitation') [Red Team]"
if (-not $LabCategory) { $LabCategory = "Red Team" }

$LabPorts = Read-Host "Exposed ports (comma-separated, e.g. '80/tcp' or '3000/tcp') [80/tcp]"
if (-not $LabPorts) { $LabPorts = "80/tcp" }

$LabFlag = Read-Host "Flag value [FLAG{xv_$LabName}]"
if (-not $LabFlag) { $LabFlag = "FLAG{xv_$LabName}" }

$DockerImage = "xploitverse/${LabName}:latest"

Write-Host "[INFO] Building Docker image: $DockerImage..." -ForegroundColor Yellow
docker build -t "$DockerImage" "$LabDir"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed!"
    exit 1
}
Write-Host "[OK] Docker image built: $DockerImage" -ForegroundColor Green

# Parse ports into JSON array
$portList = $LabPorts -split ',' | ForEach-Object { '"' + $_.Trim() + '"' }
$portsJson = "[" + ($portList -join ',') + "]"

# Compute flag hash using SHA-256
$hasher = [System.Security.Cryptography.SHA256]::Create()
$flagBytes = [System.Text.Encoding]::UTF8.GetBytes($LabFlag)
$hashBytes = $hasher.ComputeHash($flagBytes)
$flagHash = -join ($hashBytes | ForEach-Object { "{0:x2}" -f $_ })

$slug = $LabName.ToLower() -replace '[^a-z0-9]', '-'

$sql = @"
DO `$do`$
DECLARE
    v_asset_id BIGINT;
    v_room_id BIGINT;
    v_module_id BIGINT;
BEGIN
    INSERT INTO assets (name, source_type, source_ref, docker_image, build_context_path, exposed_ports_json, env_json, type, is_active)
    VALUES ('$LabDisplayName', 'custom', 'challenges/$LabName', '$DockerImage', NULL, '$portsJson'::jsonb, '{}'::jsonb, 'target', true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_asset_id;

    IF v_asset_id IS NULL THEN
        SELECT id INTO v_asset_id FROM assets WHERE docker_image = '$DockerImage' LIMIT 1;
        RAISE NOTICE 'Asset already exists (id=%)', v_asset_id;
    END IF;

    INSERT INTO rooms (slug, title, description, difficulty, is_public)
    VALUES ('$slug', '$LabDisplayName', '$LabDescription', '$LabDifficulty', true)
    ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
    RETURNING id INTO v_room_id;

    INSERT INTO modules (room_id, title, description, order_no, points_reward, is_published)
    VALUES (v_room_id, 'Module 1', '$LabDescription', 1, 100, true)
    RETURNING id INTO v_module_id;

    INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, flag_hash, is_published)
    VALUES (v_room_id, v_module_id, v_asset_id, 'Find the Flag', 'flag', 'string', 'Exploit the vulnerabilities in this lab to find the hidden flag.', 'Submit the captured flag.', '["Look for common vulnerabilities","Check all endpoints","Try default credentials"]'::jsonb, 1, 100, 25, '$flagHash', true);

    RAISE NOTICE 'Lab added: asset=% room=% module=%', v_asset_id, v_room_id, v_module_id;
END `$do`$;
"@

Write-Host "[INFO] Inserting lab metadata into PostgreSQL..." -ForegroundColor Yellow
$tempSql = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempSql -Value $sql -Encoding UTF8
docker exec -i $PostgresContainer psql -U $DbUser -d $DbName < $tempSql
Remove-Item -Path $tempSql -Force

Write-Host "==================================================" -ForegroundColor Green
Write-Host "   Lab '$LabDisplayName' Added Successfully!      " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "Docker Image : $DockerImage"
Write-Host "Flag         : $LabFlag"
Write-Host "Flag Hash    : $flagHash"
