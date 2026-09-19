# ============================================================================
# XploitVerse Startup Script for Windows (PowerShell)
# Tries Docker Compose first; falls back to local Go + mock mode if Docker fails.
# ============================================================================

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   [+] Starting XploitVerse Stack" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = $PSScriptRoot

function Refresh-Path {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath;C:\Program Files\Go\bin"
}

# ── 1. Check Docker Status ──────────────────────────────────────────────────
Write-Host "[1/4] Checking Docker status..." -ForegroundColor Yellow

$dockerReady = $false
try {
    $null = docker info 2>$null
    if ($LASTEXITCODE -eq 0) { $dockerReady = $true }
} catch {
    $dockerReady = $false
}

if (-not $dockerReady) {
    Write-Host "[!] Docker daemon not responding. Attempting to start Docker..." -ForegroundColor Yellow
    $dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerDesktopPath) {
        Start-Process $dockerDesktopPath -ErrorAction SilentlyContinue
    }
    
    $retries = 0
    while ($retries -lt 10) {
        Start-Sleep -Seconds 2
        $retries++
        $res = & docker info 2>&1
        if ($LASTEXITCODE -eq 0) {
            $dockerReady = $true
            break
        }
    }
}

# ── 2. Handle Docker vs Local Go Fallback ───────────────────────────────────
if ($dockerReady) {
    Write-Host "[OK] Docker daemon connected!" -ForegroundColor Green
    Write-Host "[*] Starting Docker Compose stack (Postgres, Redis, Go Backend)..." -ForegroundColor Yellow
    Set-Location $rootDir
    docker compose up -d
} else {
    Write-Host "[!] Docker Desktop is offline/unavailable." -ForegroundColor Yellow
    Write-Host "[*] Falling back to native Go server (Mock Mode)..." -ForegroundColor Cyan

    Refresh-Path
    $goCmd = Get-Command go -ErrorAction SilentlyContinue
    if (-not $goCmd) {
        Write-Host "[X] Go is not installed on Windows. Cannot run fallback mode." -ForegroundColor Red
        exit 1
    }

    $backendDir = Join-Path $rootDir "backend"
    Set-Location $backendDir

    if (-not (Test-Path ".env")) {
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
        }
    }

    Write-Host "[*] Launching Go Backend natively on Windows (port 5000)..." -ForegroundColor Green
    Start-Process -FilePath "go" -ArgumentList @("run", "cmd/server/main.go") -WorkingDirectory $backendDir
    Set-Location $rootDir
}

# ── 3. Setup and Start React Frontend ───────────────────────────────────────
Write-Host ""
Write-Host "[3/4] Setting up React Frontend..." -ForegroundColor Yellow
$clientDir = Join-Path $rootDir "client"
Set-Location $clientDir

if (-not (Test-Path "node_modules")) {
    Write-Host "[*] Installing frontend dependencies..." -ForegroundColor Cyan
    cmd /c "npm install"
}

Write-Host "[*] Launching Vite Frontend Dev Server..." -ForegroundColor Green
Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", "npm run dev") -WorkingDirectory $clientDir
Set-Location $rootDir
Write-Host ""

# ── 4. Completion & Browser Launch ─────────────────────────────────────────
Write-Host "========================================" -ForegroundColor Green
Write-Host "   [OK] XploitVerse Stack is Running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "-> Backend API:  http://localhost:5000" -ForegroundColor Cyan
Write-Host "-> Frontend UI:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"
