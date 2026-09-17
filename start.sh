#!/usr/bin/env bash
# ==============================================================================
# XploitVerse Tactical Stack Launcher
# Supports: Core Dev Mode, Full Docker Mode, Status Audits, and Clean Teardowns
# ==============================================================================

set -euo pipefail

# ANSI Styling Tokens
BOLD="\033[1m"
DIM="\033[2m"
CYAN="\033[36m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
ORANGE="\033[38;5;208m"
RESET="\033[0m"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
CLIENT_DIR="${ROOT_DIR}/client"

BACKEND_PID=""
FRONTEND_PID=""

# ── Helper Functions ──────────────────────────────────────────────────────────

print_banner() {
  echo -e "${ORANGE}${BOLD}"
  echo "  ██╗  ██╗██████╗ ██╗      ██████╗ ██╗████████╗██╗   ██╗███████╗██████╗ ███████╗"
  echo "  ╚██╗██╔╝██╔══██╗██║     ██╔═══██╗██║╚══██╔══╝██║   ██║██╔════╝██╔══██╗██╔════╝"
  echo "   ╚███╔╝ ██████╔╝██║     ██║   ██║██║   ██║   ██║   ██║█████╗  ██████╔╝███████╗"
  echo "   ██╔██╗ ██╔═══╝ ██║     ██║   ██║██║   ██║   ╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║"
  echo "  ██╔╝ ██╗██║     ███████╗╚██████╔╝██║   ██║    ╚████╔╝ ███████╗██║  ██║███████║"
  echo "  ╚═╝  ╚═╝╚═╝     ╚══════╝ ╚═════╝ ╚═╝   ╚═╝     ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝"
  echo -e "${RESET}${DIM}  [ TACTICAL CYBERSECURITY TRAINING INFRASTRUCTURE // LAUNCHER v2.0 ]${RESET}\n"
}

log_info() {
  echo -e "  ${CYAN}[*]${RESET} ${1}"
}

log_ok() {
  echo -e "  ${GREEN}[+]${RESET} ${1}"
}

log_warn() {
  echo -e "  ${YELLOW}[!]${RESET} ${1}"
}

log_err() {
  echo -e "  ${RED}[x]${RESET} ${1}"
}

show_help() {
  print_banner
  echo -e "${BOLD}USAGE:${RESET}"
  echo -e "  ./start.sh [OPTION]\n"
  echo -e "${BOLD}OPTIONS:${RESET}"
  echo -e "  ${GREEN}(no args)${RESET}       Standard Dev Mode: Starts DB containers (Postgres, Redis), then runs Go & Vite locally"
  echo -e "  ${CYAN}-d, --docker-only${RESET} Start only core Docker database services (Postgres on 5433, Redis on 6379)"
  echo -e "  ${CYAN}-f, --full-docker${RESET} Run entire stack in Docker containers (DBs, Go Backend, React/Nginx)"
  echo -e "  ${CYAN}-s, --status${RESET}      Audit running stack services, ports, and container health status"
  echo -e "  ${YELLOW}-b, --build${RESET}       Rebuild client assets and verify Go compilation before launch"
  echo -e "  ${RED}-k, --down${RESET}        Stop and tear down all Docker containers and local servers"
  echo -e "  ${DIM}-h, --help${RESET}        Show this operational manual\n"
  exit 0
}

# ── Pre-flight Checks ─────────────────────────────────────────────────────────

check_dependencies() {
  log_info "Verifying operational toolchain..."

  # 1. Docker Binary
  if ! command -v docker >/dev/null 2>&1; then
    log_err "Docker is not installed or not in PATH."
    log_info "Install Docker from https://docs.docker.com/engine/install/"
    exit 1
  fi

  # 2. Docker Daemon Connectivity
  if ! docker info >/dev/null 2>&1; then
    log_err "Docker daemon is unreachable. Is Docker service running?"
    log_info "Try: 'sudo systemctl start docker' or start Docker Desktop."
    exit 1
  fi

  # 3. Docker Compose v2 Plugin
  if ! docker compose version >/dev/null 2>&1; then
    log_err "Docker Compose v2 plugin is required ('docker compose')."
    exit 1
  fi

  # 4. Go Toolchain
  if ! command -v go >/dev/null 2>&1; then
    log_err "Go toolchain not detected. Required for local backend execution."
    log_info "Install Go 1.22+ from https://go.dev/dl/"
    exit 1
  fi

  # 5. Node.js & npm
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    log_err "Node.js or npm not detected. Required for local client execution."
    log_info "Install Node.js v18+ from https://nodejs.org/"
    exit 1
  fi

  log_ok "Toolchain verified: $(docker --version | awk '{print $1,$2,$3}' | tr -d ',') | $(go version | awk '{print $3}') | Node $(node -v)"
}

check_port_conflict() {
  local port=$1
  local name=$2
  if command -v lsof >/dev/null 2>&1; then
    local pid
    pid=$(lsof -ti :"${port}" 2>/dev/null || true)
    if [ -n "${pid}" ]; then
      log_warn "Port ${port} (${name}) is currently occupied by PID ${pid}."
    fi
  elif command -v ss >/dev/null 2>&1; then
    if ss -tulwn | grep -q ":${port} "; then
      log_warn "Port ${port} (${name}) is currently occupied."
    fi
  fi
}

# ── Teardown & Status ─────────────────────────────────────────────────────────

teardown_all() {
  print_banner
  log_info "Initiating full infrastructure teardown..."
  
  # Terminate local Go or Vite processes if running on ports 5000/5173
  if command -v fuser >/dev/null 2>&1; then
    fuser -k 5000/tcp >/dev/null 2>&1 || true
    fuser -k 5173/tcp >/dev/null 2>&1 || true
  fi

  cd "${ROOT_DIR}"
  docker compose --profile full down --remove-orphans || true
  log_ok "All services neutralized and containers terminated."
  exit 0
}

audit_status() {
  print_banner
  log_info "Auditing XploitVerse runtime nodes..."
  echo ""
  
  # Docker container status
  echo -e "  ${BOLD}── DOCKER INFRASTRUCTURE ──────────────────────────────────${RESET}"
  docker compose ps || true
  echo ""

  # Ports status
  echo -e "  ${BOLD}── PORT TELEMETRY ─────────────────────────────────────────${RESET}"
  for item in "5433:PostgreSQL" "6379:Redis" "5000:Go Backend" "5173:Vite Frontend"; do
    port="${item%%:*}"
    label="${item#*:}"
    if command -v nc >/dev/null 2>&1; then
      if nc -z -w 1 127.0.0.1 "${port}" >/dev/null 2>&1; then
        echo -e "  Port ${port} [${label}]: ${GREEN}ONLINE${RESET}"
      else
        echo -e "  Port ${port} [${label}]: ${RED}OFFLINE${RESET}"
      fi
    fi
  done
  echo ""
  exit 0
}

# ── Health Waiters ────────────────────────────────────────────────────────────

wait_for_docker_service() {
  local container_name=$1
  local service_label=$2
  local max_attempts=20
  local count=0

  log_info "Awaiting ${service_label} readiness (${container_name})..."
  while [ $count -lt $max_attempts ]; do
    local health
    health=$(docker inspect --format='{{json .State.Health.Status}}' "${container_name}" 2>/dev/null || echo "\"unknown\"")
    if [ "${health}" = "\"healthy\"" ]; then
      log_ok "${service_label} is ONLINE and healthy."
      return 0
    fi
    sleep 1
    count=$((count + 1))
  done

  log_warn "${service_label} health probe timed out; proceeding with initialization."
}

# ── Trap Cleanup ──────────────────────────────────────────────────────────────

cleanup_on_exit() {
  echo ""
  log_warn "Termination signal caught. Neutralizing background subprocesses..."
  if [ -n "${BACKEND_PID}" ] && kill -0 "${BACKEND_PID}" 2>/dev/null; then
    kill -TERM "${BACKEND_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
  fi
  if [ -n "${FRONTEND_PID}" ] && kill -0 "${FRONTEND_PID}" 2>/dev/null; then
    kill -TERM "${FRONTEND_PID}" 2>/dev/null || true
    wait "${FRONTEND_PID}" 2>/dev/null || true
  fi
  log_ok "Local processes halted. Docker containers remain intact in background."
  echo -e "  ${DIM}Use './start.sh --down' to stop Docker databases.${RESET}\n"
}

# ── Main Entrypoint ───────────────────────────────────────────────────────────

MODE="dev"
DO_BUILD=false

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      show_help
      ;;
    -d|--docker-only)
      MODE="docker_only"
      shift
      ;;
    -f|--full-docker)
      MODE="full_docker"
      shift
      ;;
    -s|--status)
      audit_status
      ;;
    -k|--down|--stop)
      teardown_all
      ;;
    -b|--build)
      DO_BUILD=true
      shift
      ;;
    *)
      log_err "Unknown argument: $1"
      show_help
      ;;
  esac
done

print_banner
check_dependencies

# ── Handle Docker Only Mode ───────────────────────────────────────────────────
if [ "${MODE}" = "docker_only" ]; then
  log_info "Deploying core database containers (Postgres, Redis)..."
  cd "${ROOT_DIR}"
  docker compose up -d postgres redis
  wait_for_docker_service "xv-postgres" "PostgreSQL"
  wait_for_docker_service "xv-redis" "Redis"
  echo ""
  log_ok "Core infrastructure online!"
  echo -e "  ${CYAN}Postgres:${RESET}  127.0.0.1:5433 (user: postgres, db: xploitverse)"
  echo -e "  ${CYAN}Redis:${RESET}     127.0.0.1:6379\n"
  exit 0
fi

# ── Handle Full Docker Mode ───────────────────────────────────────────────────
if [ "${MODE}" = "full_docker" ]; then
  log_info "Building and deploying full stack via Docker Compose..."
  cd "${ROOT_DIR}"
  docker compose --profile full up -d --build
  echo ""
  log_ok "Full containerized stack launched!"
  echo -e "  ${GREEN}Frontend Web:${RESET} http://localhost:5173"
  echo -e "  ${CYAN}Backend API:${RESET}  http://localhost:5000"
  echo -e "  ${DIM}Postgres:${RESET}     127.0.0.1:5433"
  echo -e "  ${DIM}Redis:${RESET}        127.0.0.1:6379\n"
  exit 0
fi

# ── Standard Development Mode ─────────────────────────────────────────────────

trap cleanup_on_exit SIGINT SIGTERM EXIT

# 1. Port Collision Detection
check_port_conflict 5000 "Backend API"
check_port_conflict 5173 "Vite Client"

# 2. Spin up Docker databases
log_info "Spinning up core database substrate (Postgres, Redis)..."
cd "${ROOT_DIR}"
docker compose up -d postgres redis
wait_for_docker_service "xv-postgres" "PostgreSQL"
wait_for_docker_service "xv-redis" "Redis"

# 3. Backend Provisioning & Startup
log_info "Configuring Go backend..."
cd "${BACKEND_DIR}"

if [ ! -f .env ]; then
  log_info "Provisioning backend/.env from template..."
  cp .env.example .env
  # Auto-generate secure JWT Secret if blank
  if command -v openssl >/dev/null 2>&1; then
    SECRET=$(openssl rand -hex 32)
    sed -i "s/^JWT_SECRET=$/JWT_SECRET=${SECRET}/" .env || true
  fi
fi

if [ "${DO_BUILD}" = true ]; then
  log_info "Compiling Go binary..."
  go build -o /dev/null cmd/server/main.go
fi

log_info "Initializing Go API server..."
go run cmd/server/main.go &
BACKEND_PID=$!

# 4. Frontend Provisioning & Startup
log_info "Configuring React client..."
cd "${CLIENT_DIR}"

if [ ! -d node_modules ] || [ "${CLIENT_DIR}/package.json" -nt "${CLIENT_DIR}/node_modules" ]; then
  log_info "Synchronizing npm dependencies..."
  npm install
fi

if [ "${DO_BUILD}" = true ]; then
  log_info "Building production frontend bundle..."
  npm run build
fi

log_info "Initializing Vite development server..."
npm run dev &
FRONTEND_PID=$!

cd "${ROOT_DIR}"

# 5. Operational Summary HUD
echo ""
echo -e "  ${BOLD}${GREEN}============================================================${RESET}"
echo -e "  ${BOLD}${GREEN}  [✓] XPLOITVERSE SYSTEM OPERATIONAL                        ${RESET}"
echo -e "  ${BOLD}${GREEN}============================================================${RESET}"
echo -e "  ${CYAN}Frontend UI:${RESET}       http://localhost:5173"
echo -e "  ${CYAN}Backend API:${RESET}       http://localhost:5000"
echo -e "  ${CYAN}Health Probe:${RESET}      http://localhost:5000/health"
echo -e "  ${DIM}PostgreSQL DB:${RESET}     127.0.0.1:5433 (container: xv-postgres)"
echo -e "  ${DIM}Redis Cache:${RESET}       127.0.0.1:6379 (container: xv-redis)"
echo -e "  ${DIM}Challenge Net:${RESET}     xploitverse-labs (172.30.0.0/16)"
echo -e "  ${YELLOW}Telemetry:${RESET}         Press [Ctrl+C] to halt local servers."
echo -e "  ${BOLD}${GREEN}============================================================${RESET}\n"

# Await server termination
wait "${BACKEND_PID}" "${FRONTEND_PID}"
