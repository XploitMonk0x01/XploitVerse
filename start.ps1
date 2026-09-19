# ==============================================================================
# XploitVerse Tactical Stack Launcher (Windows PowerShell)
# Supports: Core Dev Mode, Full Docker Mode, Status Audits, and Clean Teardowns
# ==============================================================================

param(
    [switch]$DockerOnly,
    [switch]$FullDocker,
    [switch]$Status,
    [switch]$Down,
    [switch]$Build,
    [switch]$Help
)

$ErrorActionPreference = "Continue"

$rootDir = $PSScriptRoot
$backendDir = Join-Path $rootDir "backend"
$clientDir = Join-Path $rootDir "client"

# ── Helper Functions ──────────────────────────────────────────────────────────

function Write-Banner {
    Write-Host "  ================================================================" -ForegroundColor DarkYellow
    Write-Host "  XPLOITVERSE // TACTICAL CYBERSECURITY TRAINING INFRASTRUCTURE" -ForegroundColor Yellow
    Write-Host "  Launcher v2.1 [Windows Edition]" -ForegroundColor DarkGray
    Write-Host "  ================================================================" -ForegroundColor DarkYellow
    Write-Host ""
}

function Log-Info ($msg) { Write-Host "  [*] $msg" -ForegroundColor Cyan }
function Log-Ok   ($msg) { Write-Host "  [+] $msg" -ForegroundColor Green }
function Log-Warn ($msg) { Write-Host "  [!] $msg" -ForegroundColor Yellow }
function Log-Err  ($msg) { Write-Host "  [x] $msg" -ForegroundColor Red }

function Refresh-EnvPath {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath;C:\Program Files\Go\bin"
}

function Show-Help {
    Write-Banner
    Write-Host "USAGE:" -ForegroundColor White
    Write-Host "  .\start.ps1 [-Option]`n"
    Write-Host "OPTIONS:" -ForegroundColor White
    Write-Host "  (no args)    Standard Dev Mode: Starts DB containers (Postgres, Redis), then runs Go & Vite locally" -ForegroundColor Green
    Write-Host "  -DockerOnly  Start only core Docker database services (Postgres on 5433, Redis on 6379)" -ForegroundColor Cyan
    Write-Host "  -FullDocker  Run entire stack in Docker containers (DBs, Go Backend, React/Nginx)" -ForegroundColor Cyan
    Write-Host "  -Status      Audit running stack services, ports, and container health status" -ForegroundColor Cyan
    Write-Host "  -Build       Rebuild client assets and verify Go compilation before launch" -ForegroundColor Yellow
    Write-Host "  -Down        Stop and tear down all Docker containers and local servers" -ForegroundColor Red
    Write-Host "  -Help        Show this operational manual`n" -ForegroundColor DarkGray
    exit 0
}

function Free-Port ($port, $name) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($p in $pids) {
                if ($p -and $p -ne 0 -and $p -ne $PID) {
                    Log-Warn "Port $port ($name) is occupied by PID $p. Terminating stale listener..."
                    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                }
            }
            Start-Sleep -Milliseconds 500
            Log-Ok "Port $port ($name) freed."
        }
    } catch {
        try {
            $lines = netstat -ano | Select-String ":$port "
            foreach ($line in $lines) {
                $tokens = $line.Line.Trim() -split '\s+'
                $ownerPid = $tokens[-1]
                if ($ownerPid -match '^\d+$' -and [int]$ownerPid -ne 0 -and [int]$ownerPid -ne $PID) {
                    Log-Warn "Terminating PID $ownerPid on port $port ($name)..."
                    Stop-Process -Id [int]$ownerPid -Force -ErrorAction SilentlyContinue
                }
            }
        } catch { }
    }
}

function Wait-ForHttp ($url, $serviceName, $maxAttempts = 30) {
    Log-Info "Awaiting $serviceName readiness ($url)..."
    for ($i = 1; $i -le $maxAttempts; $i++) {
        try {
            $req = [System.Net.WebRequest]::Create($url)
            $req.Timeout = 1000
            $resp = $req.GetResponse()
            $resp.Close()
            Log-Ok "$serviceName is ONLINE and healthy."
            return $true
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }
    Log-Warn "$serviceName readiness probe timed out."
    return $false
}

function Wait-ForDockerContainer ($containerName, $label, $maxAttempts = 25) {
    Log-Info "Awaiting $label container readiness ($containerName)..."
    for ($i = 1; $i -le $maxAttempts; $i++) {
        $health = docker inspect --format '{{json .State.Health.Status}}' $containerName 2>$null
        if ($health -match 'healthy') {
            Log-Ok "$label is ONLINE and healthy."
            return $true
        }
        Start-Sleep -Seconds 1
    }
    Log-Warn "$label container health probe timed out; proceeding."
    return $false
}

# ── Command Line Options Handling ─────────────────────────────────────────────

if ($Help) {
    Show-Help
}

if ($Down) {
    Write-Banner
    Log-Info "Initiating full infrastructure teardown..."
    Free-Port 5000 "Backend API"
    Free-Port 5173 "Vite Frontend"
    Set-Location $rootDir
    docker compose --profile full down --remove-orphans
    Log-Ok "All services neutralized and containers terminated."
    exit 0
}

if ($Status) {
    Write-Banner
    Log-Info "Auditing XploitVerse runtime nodes..."
    Write-Host ""
    Write-Host "  ── DOCKER INFRASTRUCTURE ──────────────────────────────────" -ForegroundColor White
    docker compose ps
    Write-Host ""
    Write-Host "  ── PORT TELEMETRY ─────────────────────────────────────────" -ForegroundColor White

    $portMap = @(
        @{ Port = 5433; Label = "PostgreSQL" },
        @{ Port = 6379; Label = "Redis" },
        @{ Port = 5000; Label = "Go Backend" },
        @{ Port = 5173; Label = "Vite Frontend" }
    )

    foreach ($item in $portMap) {
        $p = $item.Port
        $lbl = $item.Label
        $isOnline = $false
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $iar = $tcp.BeginConnect("127.0.0.1", $p, $null, $null)
            if ($iar.AsyncWaitHandle.WaitOne(800, $false)) {
                $tcp.EndConnect($iar)
                $isOnline = $true
            }
            $tcp.Close()
        } catch { }

        if ($isOnline) {
            Write-Host "  Port $p [$lbl]: " -NoNewline
            Write-Host "ONLINE" -ForegroundColor Green
        } else {
            Write-Host "  Port $p [$lbl]: " -NoNewline
            Write-Host "OFFLINE" -ForegroundColor Red
        }
    }
    Write-Host ""
    exit 0
}

Write-Banner

# ── Pre-flight Checks ─────────────────────────────────────────────────────────

Log-Info "Verifying operational toolchain..."

# 1. Docker Daemon Check
$dockerReady = $false
try {
    $null = docker info 2>$null
    if ($LASTEXITCODE -eq 0) { $dockerReady = $true }
} catch {
    $dockerReady = $false
}

if (-not $dockerReady) {
    Log-Warn "Docker daemon is unreachable. Attempting to start Docker..."
    $launcherPath = Join-Path $rootDir "start-docker-service.ps1"
    if (Test-Path $launcherPath) {
        & powershell -ExecutionPolicy Bypass -File $launcherPath -Wait
    } else {
        $dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        if (Test-Path $dockerDesktopPath) {
            Start-Process $dockerDesktopPath -ErrorAction SilentlyContinue
        }
    }

    $retries = 0
    while ($retries -lt 10) {
        Start-Sleep -Seconds 2
        $retries++
        try {
            $null = docker info 2>$null
            if ($LASTEXITCODE -eq 0) {
                $dockerReady = $true
                break
            }
        } catch { }
    }

    if (-not $dockerReady) {
        Log-Err "Docker daemon is unreachable. Please start Docker Desktop and retry."
        exit 1
    }
}

# 2. Go Toolchain Check
Refresh-EnvPath
$goCmd = Get-Command go -ErrorAction SilentlyContinue
if (-not $goCmd) {
    Log-Err "Go toolchain not detected. Required for local backend execution (https://go.dev/dl/)."
    exit 1
}

# 3. Node.js & npm Check
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $nodeCmd -or -not $npmCmd) {
    Log-Err "Node.js or npm not detected. Required for local client execution (https://nodejs.org/)."
    exit 1
}

Log-Ok "Toolchain verified: Docker CLI, Go toolchain, Node & npm."

# ── Handle Docker Only Mode ───────────────────────────────────────────────────
if ($DockerOnly) {
    Log-Info "Deploying core database containers (Postgres, Redis)..."
    Set-Location $rootDir
    docker compose up -d postgres redis
    Wait-ForDockerContainer "xv-postgres" "PostgreSQL"
    Wait-ForDockerContainer "xv-redis" "Redis"
    Write-Host ""
    Log-Ok "Core infrastructure online!"
    Write-Host "  Postgres:  127.0.0.1:5433 (user: postgres, db: xploitverse)" -ForegroundColor Cyan
    Write-Host "  Redis:     127.0.0.1:6379`n" -ForegroundColor Cyan
    exit 0
}

# ── Handle Full Docker Mode ───────────────────────────────────────────────────
if ($FullDocker) {
    Log-Info "Building and deploying full stack via Docker Compose..."
    Set-Location $rootDir
    docker compose --profile full up -d --build
    Write-Host ""
    Log-Ok "Full containerized stack launched!"
    Write-Host "  Frontend Web: http://localhost:5173" -ForegroundColor Green
    Write-Host "  Backend API:  http://localhost:5000" -ForegroundColor Cyan
    Write-Host "  Postgres:     127.0.0.1:5433" -ForegroundColor DarkGray
    Write-Host "  Redis:        127.0.0.1:6379`n" -ForegroundColor DarkGray
    exit 0
}

# ── Standard Development Mode ─────────────────────────────────────────────────

# 1. Port Conflict Auto-Clearing
Free-Port 5000 "Backend API"
Free-Port 5173 "Vite Frontend"

# 2. Start Docker Database Containers
Log-Info "Spinning up core database substrate (Postgres, Redis)..."
Set-Location $rootDir
docker compose up -d postgres redis
Wait-ForDockerContainer "xv-postgres" "PostgreSQL"
Wait-ForDockerContainer "xv-redis" "Redis"

# 3. Configure and Start Go Backend
Log-Info "Configuring Go backend..."
Set-Location $backendDir

if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Log-Info "Provisioning backend\.env from template..."
        Copy-Item ".env.example" ".env"
    }
}

Log-Info "Launching Go API server on port 5000..."
$backendProc = Start-Process -FilePath "go" -ArgumentList @("run", "cmd/server/main.go") -WorkingDirectory $backendDir -PassThru

# Verify backend health
Wait-ForHttp "http://127.0.0.1:5000/health" "Go Backend API" 30

# 4. Configure and Start React Frontend
Log-Info "Configuring React client..."
Set-Location $clientDir

$viteBin = Join-Path $clientDir "node_modules\.bin\vite.cmd"
if (-not (Test-Path "node_modules") -or -not (Test-Path $viteBin)) {
    Log-Info "Installing npm dependencies in client..."
    cmd.exe /c "npm install"
}

if ($Build) {
    Log-Info "Building production frontend bundle..."
    cmd.exe /c "npm run build"
}

Log-Info "Launching Vite Frontend Dev Server on port 5173..."
$frontendProc = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", "npm run dev") -WorkingDirectory $clientDir -PassThru

# Verify frontend readiness
Wait-ForHttp "http://localhost:5173" "Vite Frontend" 30

Set-Location $rootDir

# 5. Operational Summary HUD
Write-Host ""
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host "    [✓] XPLOITVERSE SYSTEM OPERATIONAL" -ForegroundColor Green
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host "  Frontend UI:       http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend API:       http://localhost:5000" -ForegroundColor Cyan
Write-Host "  Health Probe:      http://localhost:5000/health" -ForegroundColor Cyan
Write-Host "  PostgreSQL DB:     127.0.0.1:5433 (container: xv-postgres)" -ForegroundColor DarkGray
Write-Host "  Redis Cache:       127.0.0.1:6379 (container: xv-redis)" -ForegroundColor DarkGray
Write-Host "  Challenge Net:     xploitverse-labs (172.30.0.0/16)" -ForegroundColor DarkGray
Write-Host "  Telemetry:         Press [Ctrl+C] or Enter to halt local servers." -ForegroundColor Yellow
Write-Host "  ================================================================" -ForegroundColor Green
Write-Host ""

Start-Sleep -Seconds 1
try {
    Start-Process "http://localhost:5173" -ErrorAction SilentlyContinue
} catch { }

# Supervise and clean exit
try {
    while ($true) {
        if ($backendProc.HasExited) {
            Log-Warn "Go Backend server process terminated."
            break
        }
        if ($frontendProc.HasExited) {
            Log-Warn "Vite Frontend server process terminated."
            break
        }
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host ""
    Log-Warn "Halting local services..."
    if ($backendProc -and -not $backendProc.HasExited) {
        Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
    }
    if ($frontendProc -and -not $frontendProc.HasExited) {
        Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue
    }
    Free-Port 5000 "Backend API"
    Free-Port 5173 "Vite Frontend"
    Log-Ok "Local processes halted. Docker containers remain intact in background."
    Write-Host "  Use '.\start.ps1 -Down' to stop Docker databases.`n" -ForegroundColor DarkGray
}
