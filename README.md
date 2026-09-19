# XploitVerse

> Production-grade, containerized cybersecurity training and hands-on vulnerability lab platform.

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://golang.org)
[![React Version](https://img.shields.io/badge/React-18.2+-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Engine%2024+-2496ED?style=flat&logo=docker)](https://www.docker.com)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF?style=flat&logo=vite)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

XploitVerse is an enterprise-ready offensive cybersecurity education platform designed for defensive and offensive security engineers, penetration testers, students, and CTF competitors. It pairs a high-performance **Go (Gin)** API engine with an interactive **React + TypeScript** tactical interface, orchestrating ephemeral, isolated Docker containers on-demand for real-world vulnerability exploitation and CTF challenges.

---

## Table of Contents

- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
  - [Backend (Go Engine)](#backend-go-engine)
  - [Frontend (Tactical Client)](#frontend-tactical-client)
  - [Infrastructure & Containerization](#infrastructure--containerization)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Automated Launch via Tactical Launcher](#2-automated-launch-via-tactical-launcher)
  - [3. Manual Setup (Step-by-Step)](#3-manual-setup-step-by-step)
    - [Step A: Database & Cache Infrastructure](#step-a-database--cache-infrastructure)
    - [Step B: Go Backend Configuration & Startup](#step-b-go-backend-configuration--startup)
    - [Step C: Seeding Database & Challenge Catalog](#step-c-seeding-database--challenge-catalog)
    - [Step D: React/TypeScript Frontend Setup](#step-d-reacttypescript-frontend-setup)
- [Architecture Overview](#architecture-overview)
  - [Directory Structure](#directory-structure)
  - [Request Lifecycle](#request-lifecycle)
  - [System Data Flow](#system-data-flow)
  - [Core Subsystems](#core-subsystems)
  - [Database Schema (PostgreSQL)](#database-schema-postgresql)
- [Challenge & Vulnerability Lab System](#challenge--vulnerability-lab-system)
  - [Available Labs](#available-labs)
  - [Lab Orchestration & Isolation Lifecycle](#lab-orchestration--isolation-lifecycle)
  - [Flag Verification & Cryptographic Hashes](#flag-verification--cryptographic-hashes)
- [Environment Variables Reference](#environment-variables-reference)
  - [Backend Environment Variables (`backend/.env`)](#backend-environment-variables-backendenv)
  - [Frontend Environment Variables (`client/.env`)](#frontend-environment-variables-clientenv)
- [Available Scripts](#available-scripts)
  - [Root Orchestration](#root-orchestration)
  - [Backend Commands](#backend-commands)
  - [Frontend Commands](#frontend-commands)
- [Testing & Quality Assurance](#testing--quality-assurance)
  - [Backend Tests (Go)](#backend-tests-go)
  - [Frontend Tests (Vitest & Testing Library)](#frontend-tests-vitest--testing-library)
- [Production Deployment](#production-deployment)
  - [1. Full-Stack Docker Compose](#1-full-stack-docker-compose)
  - [2. AWS Infrastructure via Terraform](#2-aws-infrastructure-via-terraform)
  - [3. Manual Linux Host / VPS Deployment](#3-manual-linux-host--vps-deployment)
- [Troubleshooting](#troubleshooting)
  - [Docker Daemon Unreachable](#docker-daemon-unreachable)
  - [PostgreSQL Port 5433 Collisions](#postgresql-port-5433-collisions)
  - [WebSocket Terminal Connection Refused](#websocket-terminal-connection-refused)
  - [Container Provisioning Fails or Timeouts](#container-provisioning-fails-or-timeouts)
- [Contributing](#contributing)
- [License](#license)

---

## Key Features

- **On-Demand Ephemeral Labs**: Seamlessly spins up isolated target containers (e.g. AWS Capital One SSRF replica, SQL injection playgrounds, multi-stage privilege escalation boxes) on an isolated internal Docker bridge network (`172.30.0.0/16`).
- **Interactive Web Terminal**: Full bidirectional in-browser terminal connected over Gorilla WebSockets directly to the target container's SSH daemon or bash shell.
- **Cryptographic Flag Verification**: Canonical flags validated via SHA-256 hash checks with automated hint-penalty calculations and real-time score auditing.
- **Curated Mission Tracks & Rooms**: Structured rooms, modules, and step-by-step tasks designed for progressive offensive skill development.
- **Real-Time Leaderboards**: Points and achievement tracking with millisecond-grade rankings backed by PostgreSQL aggregations.
- **Automated Resource Reaper**: Background cron daemon automatically terminates abandoned or expired lab containers to prevent runaway CPU and memory consumption.
- **Enterprise-Grade Type Safety & UI**: 100% TypeScript client featuring a cyber-tactical design system (custom canvas crosshairs, telemetry gauges, matrix scanlines, and animated status feeds).

---

## Tech Stack

### Backend (Go Engine)

| Layer | Technology | Description |
|---|---|---|
| **Language** | Go 1.22+ / 1.25 | Statically typed, high-concurrency compiled backend |
| **HTTP Framework** | [Gin](https://github.com/gin-gonic/gin) | Minimal overhead, zero-allocation JSON routing framework |
| **Database Pool** | [pgx/v5](https://github.com/jackc/pgx) | High-performance PostgreSQL driver and connection pooling |
| **Container Engine** | [Docker Go SDK](https://github.com/moby/moby) | Direct programmatic container and network lifecycle control |
| **Realtime I/O** | [Gorilla WebSocket](https://github.com/gorilla/websocket) | Bidirectional protocol for interactive terminal streaming |
| **Security & Auth** | `golang-jwt/jwt/v5`, `bcrypt` | Stateless bearer token authentication & Argon2/bcrypt hashing |
| **Cache & Sessions** | [go-redis/v9](https://github.com/redis/go-redis) | Fast distributed caching and session rate-limiting |

### Frontend (Tactical Client)

| Layer | Technology | Description |
|---|---|---|
| **Core Framework** | React 18.2 | Component-driven declarative UI |
| **Language** | TypeScript 5.0+ | Strict type safety across all views, contracts, and APIs |
| **Build Tool** | Vite 5 | Lightning-fast HMR and Rollup-optimized production bundling |
| **Styling** | Tailwind CSS 3 | Cyberpunk military-grade tactical theme with custom tokens |
| **Motion & Micro-interactions** | Framer Motion | Smooth layout transforms, terminal reveal animations, and toasts |
| **Icons & Visuals** | Lucide React | Clean, scalable vector tactical iconography |
| **Testing** | Vitest + Testing Library | Contract testing, integration testing, and UI stress suites |

### Infrastructure & Containerization

- **Durable Store**: PostgreSQL 16 Alpine
- **Memory Store**: Redis 7 Alpine
- **Lab Sandbox**: Docker Engine + Bridge Network with Port Address Translation
- **Cloud IaC**: Terraform (AWS VPC, EC2, RDS PostgreSQL, ElastiCache Redis, SSM)

---

## Prerequisites

Before starting, ensure your host machine has the following tools installed and available in your `PATH`:

- **Git** `2.34+`
- **Docker Engine** `24.0+` and **Docker Compose v2** (`docker compose`)
- **Go Toolchain** `1.22+` (Go 1.25 recommended)
- **Node.js** `18.x` or `20.x` (LTS) & **npm** `9.x+`
- **OpenSSL** (for generating cryptographically secure JWT secrets)

> [!NOTE]
> On Linux, ensure your user belongs to the `docker` group (`sudo usermod -aG docker $USER`) so the backend can communicate with `/var/run/docker.sock` without root privileges.

---

## Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/XploitMonk0x01/XploitVerse.git
cd XploitVerse
```

---

### 2. Automated Launch via Tactical Launcher

The repository includes unified launch automation scripts for all major operating systems:

```bash
# On Linux / macOS
chmod +x ./start.sh
./start.sh
```

```powershell
# On Windows (PowerShell)
.\start.ps1
```

```cmd
# On Windows (Command Prompt)
.\start.bat
```

What the launcher does automatically:
1. Validates Docker daemon, Go toolchain, and Node.js installation.
2. Starts the core background database services (PostgreSQL on port `5433`, Redis on port `6379`).
3. Auto-provisions `backend/.env` with an auto-generated 256-bit JWT secret if missing.
4. Executes database schema migrations and baseline seeds.
5. Launches the Go API server (`http://localhost:5000`) and Vite frontend (`http://localhost:5173`) in parallel.

---

### 3. Manual Setup (Step-by-Step)

If you prefer to run and inspect each component manually:

#### Step A: Database & Cache Infrastructure

Launch the PostgreSQL and Redis containers in the background:

```bash
docker compose up -d
```

Verify that the containers are healthy:

```bash
docker compose ps
```

*Expected output:*
```text
NAME          IMAGE                COMMAND                  SERVICE    STATUS
xv-postgres   postgres:16-alpine   "docker-entrypoint.s…"   postgres   Up (healthy) (0.0.0.0:5433->5432/tcp)
xv-redis      redis:7-alpine       "docker-entrypoint.s…"   redis      Up (healthy) (0.0.0.0:6379->6379/tcp)
```

#### Step B: Go Backend Configuration & Startup

1. Navigate to the backend directory and create your environment file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Generate a secure JWT secret and configure `backend/.env`:
   ```bash
   # Linux / macOS
   sed -i "s/JWT_SECRET=/JWT_SECRET=$(openssl rand -hex 32)/" .env
   ```

3. Download Go module dependencies:
   ```bash
   go mod download
   ```

4. Start the backend API server:
   ```bash
   go run cmd/server/main.go
   ```

The backend starts on `http://localhost:5000`, automatically applies schema migrations, and registers the baseline database records.

#### Step C: Seeding Database & Challenge Catalog

In a separate terminal, populate the challenge assets and curriculum:

```bash
cd backend

# Seed real containerized challenges (Capital One SSRF, SQLi, XSS, etc.)
go run cmd/seed/main.go

# Seed course tracks and modules
go run cmd/seed_courses/main.go
```

#### Step D: React/TypeScript Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server with Hot Module Replacement (HMR):
   ```bash
   npm run dev
   ```

Open your browser and navigate to **`http://localhost:5173`**.

---

## Architecture Overview

### Directory Structure

```text
xploitverse/
├── .agent/                     # Antigravity agent & skills configuration
├── backend/                    # Go / Gin REST API Engine
│   ├── cmd/
│   │   ├── seed/               # Challenge catalog seeder (assets, flags, ports)
│   │   ├── seed_courses/       # Curriculum seeder (rooms, modules, tasks)
│   │   └── server/             # API server entrypoint (main.go)
│   ├── internal/
│   │   ├── config/             # Environment variable parsing and validation
│   │   ├── database/           # pgxpool setup, DDL migrations, baseline seeds
│   │   ├── middleware/         # Auth JWT, rate-limiter, CORS, security headers
│   │   ├── pgapi/              # REST handlers (auth, labs, tasks, leaderboard)
│   │   ├── services/           # DockerService, RedisService, AutoTermination
│   │   └── utils/              # Password hashing, JWT utils, responses
│   ├── ws/                     # Gorilla WebSocket terminal streaming
│   ├── Dockerfile              # Production multi-stage Go build
│   └── go.mod                  # Go dependencies
├── challenges/                 # Vulnerable target Dockerfiles and lab source
│   ├── aws-autopsy/            # Capital One SSRF -> IMDSv1 -> S3 Exfiltration
│   ├── sqli-lab/               # Multi-stage SQL injection challenge
│   ├── ssrf-lab/               # IndiShell SSRF & DNS rebinding lab
│   ├── tiredful-api/           # Broken REST API & IDOR vulnerabilities
│   ├── vulnlab/                # Multi-vuln suite (LFI, RFI, SQLi, RCE)
│   ├── vulnerable-app/         # OWASP VulnerableApp Spring Boot testbed
│   ├── web-basic/              # Command injection & path traversal
│   └── xss-labs/               # 40-level DOM/Reflected/Stored XSS suite
├── client/                     # React 18 + TypeScript + Vite Frontend
│   ├── src/
│   │   ├── components/         # Reusable tactical UI components
│   │   │   ├── auth/           # Protected routes and role guards
│   │   │   ├── labs/           # LabCard, ActiveSession, Terminal widgets
│   │   │   ├── layout/         # Navigation bar, Footer, CyberShell
│   │   │   └── ui/             # SpotlightCard, TacticalBadge, Modal, Inputs
│   │   ├── context/            # AuthContext and Session state management
│   │   ├── pages/              # View pages (Dashboard, LabWorkspace, etc.)
│   │   ├── services/           # Axios API client & typed endpoint services
│   │   ├── test/               # E2E contracts, mocks, and UI stress suites
│   │   └── types/              # Comprehensive TypeScript interfaces
│   ├── index.html              # Single Page Application HTML root
│   ├── package.json            # Node.js dependencies & test scripts
│   ├── tailwind.config.js      # Tactical cyberpunk theme tokens
│   ├── tsconfig.json           # Strict TypeScript configuration
│   └── vite.config.ts          # Vite build & proxy settings
├── database/                   # Standalone SQL migration scripts & seeds
├── infra/                      # Infrastructure as Code
│   └── terraform/              # AWS EC2 + RDS + Redis production deployment
├── docker-compose.yml          # Local orchestration for DBs and full stack
├── start.sh                    # Unified Linux/macOS launcher
├── start.ps1                   # Unified Windows PowerShell launcher
└── start.bat                   # Unified Windows Batch launcher
```

---

### Request Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Student / Pentester
    participant Client as React/TS Frontend
    participant Gin as Go API Router
    participant MW as Middleware (CORS/JWT/RateLimit)
    participant Handler as PGAPI Handler
    participant DB as PostgreSQL 16
    participant Docker as Docker Engine Daemon
    participant WS as WebSocket Hub (/ws/terminal)

    User->>Client: Click "Execute Lab"
    Client->>Gin: POST /api/lab-sessions { assetId: 1 }
    Gin->>MW: Verify Bearer JWT & Rate Limit
    MW->>Handler: Dispatch Request
    Handler->>DB: Check Active User Sessions
    Handler->>Docker: Pull/Build & Run Container on xploitverse-labs
    Docker-->>Handler: Container Created (Allocated Port: 32771)
    Handler->>DB: INSERT INTO lab_sessions (status='running', port=32771)
    Handler-->>Client: 201 Created { sessionId: 42, hostPort: 32771 }
    Client->>WS: Connect /ws/terminal?sessionId=42&token=JWT
    WS->>Docker: Attach stdin/stdout/stderr to container shell
    WS-->>Client: Bi-directional pseudo-terminal stream
```

---

### System Data Flow

```text
[ Browser / Tactical UI ]
       │
       ├─────────────────────────────────────────┐
       ▼ (HTTP REST / JSON)                      ▼ (WebSockets / Raw Stream)
[ Gin Router (:5000) ]                   [ WebSocket Terminal Hub ]
       │                                         │
       ├─► Middleware: JWT / CORS / RateLimit    │
       │                                         │
       ├─► Services / Repositories               │
       │         │                               │
       │         ├─► [ PostgreSQL 16 ]           │
       │         │   (Users, Labs, Sessions)     │
       │         │                               │
       │         ├─► [ Redis 7 ]                 │
       │         │   (Cache & Ephemeral Tokens)  │
       │         │                               │
       │         └─► [ Docker SDK Engine ] ◄─────┘
       │                   │
       │                   ├─► Network: xploitverse-labs (172.30.0.0/16)
       │                   │
       │                   ├─► xv-lab-user42-ssrf (Port 32771 -> 80)
       │                   └─► xv-lab-user42-sqli (Port 32772 -> 5000)
```

---

### Core Subsystems

#### 1. Authentication & Security Middleware
- **Stateless JWTs**: Signed using HMAC-SHA256 (`JWT_SECRET`) with configurable expiration (`7d`).
- **Role-Based Access Control (RBAC)**: Supports `STUDENT`, `INSTRUCTOR`, and `ADMIN` tiers.
- **Security Headers**: Injects Strict-Transport-Security, X-Content-Type-Options (`nosniff`), X-Frame-Options (`DENY`), and Referrer-Policy headers on every response.
- **IP Rate Limiter**: Memory-efficient sliding-window limiter preventing brute-force login and flag guessing.

#### 2. Lab Provisioning Engine (`DockerService`)
- Communicates with `/var/run/docker.sock` via Docker Engine API v1.43+.
- Allocates an isolated Docker network (`xploitverse-labs` with subnet `172.30.0.0/16`) ensuring target containers cannot reach host networking or cloud metadata services unless explicitly mocked.
- Dynamic port allocation maps container ports (`80`, `5000`, `22`, etc.) to random ephemeral host ports.

#### 3. Auto-Termination Service
- Background goroutine ticking every 60 seconds.
- Queries `lab_sessions` for sessions exceeding their allotted lifetime (default: 60 minutes) or abandoned by disconnected users.
- Automatically invokes `docker stop` and `docker rm` to reclaim server memory and CPU.

---

### Database Schema (PostgreSQL)

The primary database is PostgreSQL 16. The schema is initialized automatically on startup by [`backend/internal/database/postgres.go`](file:///mnt/sda3/Users/smwlc/proj/Test/xploitverse/backend/internal/database/postgres.go).

```text
users
├── id (BIGINT, PK)
├── username (TEXT, UNIQUE)
├── email (TEXT, UNIQUE)
├── password_hash (TEXT)
├── role (TEXT: STUDENT | INSTRUCTOR | ADMIN)
├── total_lab_time (BIGINT)
└── created_at (TIMESTAMPTZ)

assets (Lab Target Definitions)
├── id (BIGINT, PK)
├── name (TEXT)
├── source_type (TEXT: custom | hub)
├── source_ref (TEXT)
├── docker_image (TEXT)
├── build_context_path (TEXT)
├── exposed_ports_json (JSONB)
└── type (TEXT: target | attack)

rooms (Curriculum Courses)
├── id (BIGINT, PK)
├── slug (TEXT, UNIQUE)
├── title (TEXT)
├── difficulty (TEXT: Easy | Medium | Hard)
└── is_public (BOOLEAN)

modules
├── id (BIGINT, PK)
├── room_id (BIGINT, FK → rooms.id)
├── title (TEXT)
├── order_no (BIGINT)
└── points_reward (BIGINT)

tasks
├── id (BIGINT, PK)
├── room_id (BIGINT, FK → rooms.id)
├── module_id (BIGINT, FK → modules.id)
├── asset_id (BIGINT, FK → assets.id)
├── title (TEXT)
├── points (BIGINT)
├── hint_penalty (BIGINT)
└── flag_hash (TEXT: SHA-256 string)

lab_sessions (Active & Historical Containers)
├── id (BIGINT, PK)
├── user_id (BIGINT, FK → users.id)
├── task_id (BIGINT, FK → tasks.id)
├── container_id (TEXT)
├── status (TEXT: pending | initializing | running | stopped | terminated | error)
├── port_mappings_json (JSONB)
├── started_at (TIMESTAMPTZ)
└── expires_at (TIMESTAMPTZ)

user_task_progress
├── id (BIGINT, PK)
├── user_id (BIGINT, FK → users.id)
├── task_id (BIGINT, FK → tasks.id)
├── solved (BOOLEAN)
└── solved_at (TIMESTAMPTZ)
```

---

## Challenge & Vulnerability Lab System

### Available Labs

| Target Directory | Image Name | Vulnerability Class | Difficulty | Standard Flag |
|---|---|---|---|---|
| `challenges/aws-autopsy` | `xploitverse/aws-autopsy:latest` | Capital One SSRF → IMDSv1 → S3 Exfil | **Hard** | `FLAG{xv_aws_autopsy_root_pwned}` |
| `challenges/sqli-lab` | `xploitverse/sqli-lab:latest` | SQL Injection, Auth Bypass, Table Dumps | **Easy** | `FLAG{xv_sqli_database_compromised}` |
| `challenges/ssrf-lab` | `xploitverse/ssrf-lab:latest` | DNS Rebinding, File Disclosure, PDF SSRF | **Medium** | `FLAG{xv_ssrf_vulnerable_lab_flag}` |
| `challenges/web-basic` | `xploitverse/web-basic:latest` | OS Command Injection & Directory Traversal | **Easy** | `FLAG{xv_web_basic_command_injection_2024}` |
| `challenges/vulnlab` | `xploitverse/vulnlab:latest` | PHP Multi-vuln Suite (LFI/RFI/SQLi/RCE) | **Medium** | `FLAG{xv_vulnlab_root_compromised}` |
| `challenges/tiredful-api` | `xploitverse/tiredful-api:latest` | Broken REST API, IDOR, JWT Flaws | **Medium** | `FLAG{xv_tiredful_api_token_cracked}` |
| `challenges/vulnerable-app` | `xploitverse/vulnerable-app:latest` | OWASP VulnerableApp Spring Boot Benchmark | **Hard** | `FLAG{xv_owasp_vulnerableapp_pwned}` |
| `challenges/xss-labs` | `xploitverse/xss-labs:latest` | 40-level DOM, Reflected, & Stored XSS | **Easy** | `FLAG{xv_xss_labs_mastered}` |

### Lab Orchestration & Isolation Lifecycle

1. **Trigger**: When a user clicks **Execute Lab**, `POST /api/lab-sessions` checks if the image exists locally.
2. **Build/Pull**: If `build_context_path` is specified, the backend triggers an automated `docker build` using the Docker SDK.
3. **Sandbox Deployment**: A container is provisioned with strictly limited resources (`Memory: 512MB`, `CPUs: 1.0`, `no-new-privileges: true`).
4. **Networking**: The container is attached to `xploitverse-labs` and isolated from other student containers.
5. **Interactive Access**: Web terminal communicates via SSH (`22`) or raw exec pipes directly to the container context.

### Flag Verification & Cryptographic Hashes

To prevent flag leaking through database inspection, flags are stored as salted SHA-256 hashes:

```text
Student Submits: "FLAG{xv_aws_autopsy_root_pwned}"
                    │
                    ▼
          Crypto SHA-256 Digest
                    │
                    ▼
Database Matches: 7b3d9c... (tasks.flag_hash)
                    │
                    ├─► Match: Award Points, Mark Solved, Broadcast Leaderboard Update
                    └─► Mismatch: Log Failed Attempt, Increment Rate-Limiter
```

---

## Environment Variables Reference

### Backend Environment Variables (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Port for the Go HTTP API server |
| `NODE_ENV` | No | `development` | Environment mode (`development` or `production`) |
| `GIN_MODE` | No | `release` | Gin framework log mode (`debug` or `release`) |
| `POSTGRES_URI` | **Yes** | `postgres://postgres:postgres@127.0.0.1:5433/xploitverse?sslmode=disable` | PostgreSQL connection string |
| `REDIS_URL` | No | `redis://127.0.0.1:6379` | Redis connection URL |
| `JWT_SECRET` | **Yes** | *(None)* | Secret used to sign authentication JWT tokens |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiration duration string |
| `CLIENT_URL` | No | `http://localhost:5173` | Allowed CORS origin for frontend client |
| `SMTP_HOST` | No | `smtp.gmail.com` | Mail server host for password reset emails |
| `SMTP_PORT` | No | `587` | Mail server port |
| `SMTP_USERNAME` | No | *(None)* | Mail server authentication username |
| `SMTP_PASSWORD` | No | *(None)* | Mail server authentication password/app key |
| `SMTP_FROM` | No | `noreply@xploitverse.io` | Default sender email address |

### Frontend Environment Variables (`client/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE` | No | `/api` | Base URL for REST API requests (proxied via Vite in dev) |
| `VITE_WS_BASE` | No | *(Auto-derived)* | Base WebSocket endpoint for terminal sessions |

---

## Available Scripts

### Root Orchestration

| Command | Platform | Description |
|---|---|---|
| `./start.sh` | Linux/macOS | Starts DB containers and launches local Go backend + Vite frontend |
| `./start.sh -d` | Linux/macOS | Starts only background Docker database containers |
| `./start.sh -f` | Linux/macOS | Runs entire stack inside Docker containers |
| `./start.sh -s` | Linux/macOS | Audits running services, open ports, and health status |
| `./start.sh -k` | Linux/macOS | Stops and tears down all local containers and servers |
| `.\start.ps1` | Windows PowerShell | Windows native tactical stack launcher |
| `.\start.bat` | Windows CMD | Windows native quick-launch batch script |

### Backend Commands

```bash
cd backend

# Run API server locally with hot reload / restart
go run cmd/server/main.go

# Compile binary for production
go build -o bin/server cmd/server/main.go

# Seed challenge catalog and vulnerable targets
go run cmd/seed/main.go

# Seed course tracks, modules, and lessons
go run cmd/seed_courses/main.go

# Run all backend unit and integration tests
go test -v -race ./...
```

### Frontend Commands

```bash
cd client

# Start Vite development server (HMR on port 5173)
npm run dev

# Typecheck and build production bundle
npm run build

# Preview production build locally
npm run preview

# Run ESLint validation
npm run lint

# Run full Vitest test suite
npm run test

# Run tests in interactive UI mode
npm run test:ui
```

---

## Testing & Quality Assurance

### Backend Tests (Go)

The Go backend includes unit and contract tests across middleware, utilities, and API serialization:

```bash
cd backend
go test -v ./...
```

*Example Output:*
```text
=== RUN   TestJWTMiddleware
--- PASS: TestJWTMiddleware (0.01s)
=== RUN   TestRateLimiter
--- PASS: TestRateLimiter (0.02s)
=== RUN   TestFlagVerificationSHA256
--- PASS: TestFlagVerificationSHA256 (0.00s)
PASS
ok      github.com/xploitverse/backend/internal/middleware    0.035s
ok      github.com/xploitverse/backend/internal/utils         0.012s
```

### Frontend Tests (Vitest & Testing Library)

The frontend includes contract tests, auth flow verifications, and component stress testing:

```bash
cd client
npm run test
```

*Test Coverage Includes:*
- **Authentication Contracts**: Login, register, token persistence, and cyber tactical layout rendering.
- **Course & Module Catalog**: Difficulty filters, progress meters, and room routing.
- **Active Workspace & Lab Sessions**: Ephemeral container timers, connection details, and flag submission.
- **UI Primitives Stress Testing**: Adversarial edge cases for `Button`, `Checkbox`, `ConfirmDialog`, `PasswordInput`, `Tabs`, and `Textarea`.

---

## Production Deployment

### 1. Full-Stack Docker Compose

To deploy the entire platform containerized on a single Linux host:

```bash
# Start PostgreSQL, Redis, Go Backend, and Nginx-served Client
docker compose --profile full up -d --build
```

Access the application on port `5173` (or reverse proxy port `80`/`443`).

---

### 2. AWS Infrastructure via Terraform

Infrastructure as Code lives in [`infra/terraform/`](file:///mnt/sda3/Users/smwlc/proj/Test/xploitverse/infra/terraform/). It provisions:
- Dedicated **VPC** with public application subnets and isolated private database subnets.
- **EC2 Application Host** equipped with Docker, Go runtime, and systemd services.
- Managed **AWS RDS PostgreSQL** instance.
- Managed **AWS ElastiCache Redis** cluster node.
- **AWS Systems Manager (SSM)** configuration for secure shell access without opening port 22.

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars

# Edit credentials and domain configuration
nano terraform.tfvars

# Deploy AWS infrastructure
terraform init
terraform plan
terraform apply
```

---

### 3. Manual Linux Host / VPS Deployment

1. **System Packages**:
   ```bash
   sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 golang nodejs npm nginx
   ```

2. **Backend systemd Service** (`/etc/systemd/system/xploitverse-backend.service`):
   ```ini
   [Unit]
   Description=XploitVerse Go API
   After=network.target docker.service

   [Service]
   Type=simple
   User=root
   WorkingDirectory=/opt/xploitverse/backend
   ExecStart=/opt/xploitverse/backend/bin/server
   Restart=always
   RestartSec=5
   EnvironmentFile=/opt/xploitverse/backend/.env

   [Install]
   WantedBy=multi-user.target
   ```

3. **Build Frontend**:
   ```bash
   cd /opt/xploitverse/client
   npm install && npm run build
   # Serve /opt/xploitverse/client/dist via Nginx
   ```

---

## Troubleshooting

### Docker Daemon Unreachable

**Symptom**: `❌ Cannot connect to the Docker daemon at unix:///var/run/docker.sock`

**Solution**:
1. Check if Docker is running: `sudo systemctl status docker`
2. Add your current user to the docker group:
   ```bash
   sudo usermod -aG docker $USER
   newgrp docker
   ```

### PostgreSQL Port 5433 Collisions

**Symptom**: `bind: address already in use` for port `5433`

**Solution**:
1. Identify the process holding port `5433`:
   ```bash
   # Linux / macOS
   sudo lsof -i :5433
   # Windows
   netstat -ano | findstr 5433
   ```
2. If an old container is orphaned: `docker compose down -v` and restart with `./start.sh`.

### WebSocket Terminal Connection Refused

**Symptom**: In-browser workspace terminal displays `── Terminal disconnected ──`

**Solution**:
1. Confirm the backend is running and reachable on `http://localhost:5000/health`.
2. Ensure you have a valid session token in `localStorage.getItem("token")`.
3. If running behind a reverse proxy (Nginx), verify WebSocket upgrade headers:
   ```nginx
   proxy_http_version 1.1;
   proxy_set_header Upgrade $http_upgrade;
   proxy_set_header Connection "upgrade";
   ```

### Container Provisioning Fails or Timeouts

**Symptom**: Lab workspace gets stuck on `PROVISIONING_CONTAINER...`

**Solution**:
1. Check container build status in the Docker daemon:
   ```bash
   docker ps -a
   docker logs <container-id>
   ```
2. Manually test-build the target image to verify its Dockerfile:
   ```bash
   docker build -t xploitverse/aws-autopsy:latest ./challenges/aws-autopsy/
   ```

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/new-cyber-lab`.
3. Verify all tests pass:
   - Backend: `cd backend && go test ./...`
   - Frontend: `cd client && npm run test && npm run lint`
4. Commit your changes following Conventional Commits (`feat:`, `fix:`, `docs:`).
5. Open a Pull Request targeting `main`.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
