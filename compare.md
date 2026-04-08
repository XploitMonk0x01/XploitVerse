# XploitVerse: Current State vs Production Architecture

**Last Updated:** 2026-04-06 (`express_server` branch)

This document compares the current `express_server` implementation against the production-grade architecture outlined in `advance.md` and provides a phased roadmap to bridge the gap.

---

## 📊 Progress Overview

```
Foundation:     ████████████████████████ 100%
Core Features:  ██████████████████████░░  90%
Infrastructure: ██████████████░░░░░░░░░  55%
Code Quality:   ███████████████░░░░░░░░  65%
Production:     ████░░░░░░░░░░░░░░░░░░░  15%
```

**Latest Status (2026-04-06):**

- ✅ Real `docker exec` PTY terminal bridging (replaced mock)
- ✅ Redis fully wired (user cache, leaderboard, flag rate-limit, lab TTL)
- ✅ Docker containers healthy (MongoDB 7, Redis 7-alpine)
- ✅ Structured logging moved to `pino` + `pino-http`
- ✅ Fail-fast config, graceful shutdown, request IDs, and enhanced security headers
- ✅ Service extraction done for auth/subscription/lab/leaderboard/flag
- ✅ Socket terminal-input rate limiting added
- ⚠️ Main blocker now: test coverage + remaining architecture goals from `advance.md`

---

## ✅ What's Been Done (Phase 0: Foundation)

### Frontend (`client/`)

- [x] **UI/UX Foundation**
  - TryHackMe-inspired dark theme implemented
  - Clean typography (Ubuntu + Source Sans Pro)
  - Solid color palette (muted green accent, no gradients)
  - Base component library (`Button`, `Input`, `LoadingSpinner`)
  - Global CSS utilities (`.btn-cyber`, `.card-cyber`, `.input-cyber`)
- [x] **Core Pages**
  - Landing page
  - Auth flows (Login, Register, Forgot/Reset Password)
  - **Email OTP Verification page** (`VerifyEmailOtp.jsx`)
  - Dashboard layout
  - Admin Dashboard (shell)
  - Lab Workspace (shell)
  - Profile page
- [x] **Routing & Guards**
  - `PrivateRoute` for authenticated users
  - `RoleRoute` for role-based access (`ADMIN`, `INSTRUCTOR`)
  - Redirect logic with state preservation
- [x] **Build System**
  - Vite build pipeline configured
  - Tailwind CSS integrated
  - Production builds working

### Backend (`server/`) — Node.js / Express

- [x] **Express API Foundation**
  - Express 4 + `http.createServer` + Socket.io 4
  - MongoDB connection via Mongoose 8
  - JWT authentication (`jsonwebtoken` HS256)
  - HttpOnly cookie management
  - Helmet, CORS, express-rate-limit security stack
- [x] **User Model (enhanced)**
  - Roles: STUDENT / INSTRUCTOR / ADMIN
  - `firstName`, `lastName`, `avatar` profile fields
  - `isEmailVerified`, OTP hash/expiry/attempts fields
  - `passwordResetToken` + hashed reset flow
  - `passwordChangedAt`, `changedPasswordAfter()` method
  - `plan` — denormalized subscription tier (FREE/PRO/PREMIUM)
  - `totalLabTime`, `totalSpent` billing stubs
  - `preferences` (theme, notifications)
  - Mongoose indexes on `email`, `username`, `role`, `createdAt`
- [x] **Auth System (complete)**
  - Register / Login / Logout
  - `/me` with `activeSessions` virtual populated
  - JWT token generation & verification
  - Password hashing (bcrypt, salt rounds 12)
  - Update password + refresh token endpoints
  - Forgot/reset password with SHA-256 hashed token (10-min TTL)
  - **Email OTP verification**: send/verify/resend OTP, max 5 attempts, 60-s cooldown
  - Role-based middleware (`verifyToken`, `checkRole`)
- [x] **Email Service**
  - `nodemailer` SMTP transporter (graceful no-op if unconfigured)
  - Branded HTML password-reset email
  - Branded HTML OTP verification email
  - Dev mode returns token/OTP in response when SMTP not configured
- [x] **Subscription & Payment System** (Hardened 2026-04-02)
  - Razorpay SDK integration with order creation
  - HMAC-SHA256 signature verification
  - Server-side payment status verification (refetch from Razorpay API)
  - Webhook handler with idempotent subscription activation
  - Raw body preservation for webhook signature validation
  - Environment-driven configuration (all secrets from env vars)
  - `requirePlan` middleware for tier-gated content
- [x] **REST Controllers**
  - Auth, User, Lab, LabSession, Course, Module, Task, Flag, Leaderboard, Chat, Admin, Subscription
- [x] **Socket.io Real-time** ← **Real Docker PTY (2026-04-06)**
  - JWT auth middleware on socket handshake
  - **Real `docker exec` PTY bridge** — connects to actual container terminal
  - Bidirectional stream: input → container stdin, stdout → terminal-output
  - Terminal resize support
  - Session countdown timer (emits every 60s)
  - Cleanup on leave/disconnect
- [x] **Rate Limiting**
  - Global: 100 req / 15 min per IP (1000 in dev)
  - Auth routes: 10 req / 15 min per IP (100 in dev)
  - Flag submissions: 5 attempts / 60s per user+task (Redis or in-memory)
- [x] **Health check** — `GET /health`
- [x] **Database Seeding** — `server/src/scripts/seedLabs.js`
- [x] **Auto-termination service** — kills lab sessions on TTL expiry, recovers from Redis

### Challenges (`challenges/`)

Real Docker lab images included:

- `linux-basics`, `web-basic`, `sqli-lab`, `owasp-juice`, `reverse-shell`
- `recon-basic`, `privesc-basic`, `privesc-linux`, `crypto-basics`
- `boot2root`, `network-recon`

### DevOps

- [x] `docker-compose.yml` — MongoDB 7 + Redis 7-alpine (persistent volumes, health checks)
- [x] Environment configuration (`.env.example`)
- [x] Basic project structure

---

## ✅ What's Been Done (Phase 1: Core Features — Complete)

- [x] **Course content browsing (MVP)**
  - Backend: course/module/task read endpoints wired
  - Frontend: `/courses` → course → module → task pages
- [x] **Flag submission & scoring (MVP+)**
  - `POST /api/flags/submit`, SHA-256 hashing
  - Anti-cheat: 5 attempts/60s per user+task (Redis atomic counter + in-memory fallback)
  - Dedup guard prevents race-condition double-point awards
  - `GET /api/users/me/progress` — completion summary endpoint
- [x] **Leaderboard (MVP)**
  - Redis sorted set (`ZADD`, `ZREVRANGE`) with 5-min TTL
  - Pipeline rebuild on cache miss
  - Real-time score updates via `ZINCRBY` on flag capture
  - In-memory fallback when Redis unavailable
- [x] **Real Docker terminal** ← **DONE (2026-04-06)**
  - `docker exec` PTY bridge via Socket.io
  - bash/sh fallback in container
  - Container lifecycle: start → exec → resize → stop/remove
- [x] **Docker lab spawning**
  - `DockerService` — spawn/stop containers via `dockerode`
  - Resource limits: 256MB RAM, 0.5 vCPU, CapDrop ALL
  - Auto-termination on TTL expiry with Redis persistence
- [x] **Email verification flow**
  - `VerifyEmailOtp.jsx` frontend page
  - OTP send/verify/resend API wired

---

## ✅ What's Been Done (Phase 2: Redis & Real-time — Majority Complete)

### 2.1 Redis Integration ← **WIRED (2026-04-06)**

- [x] Docker Compose Redis service (port 6379, LRU 128 MB)
- [x] `ioredis` client in Express server with graceful fallback
- [x] User profile cache in auth middleware (15-min TTL)
- [x] Leaderboard as Redis Sorted Set (`ZADD`, `ZREVRANGE`, `ZINCRBY`)
- [x] Flag submission rate limiting (atomic `INCR` + `EXPIRE`)
- [x] Flag dedup guard (`SET NX EX` — prevents double-point racing)
- [x] Lab session TTL tracking + recovery on restart
- [x] Subscription cache invalidation on plan change
- [ ] Session JWT payload cache (stretch goal)

### 2.2 WebSockets (Real-time) ← **MAJOR PROGRESS**

- [x] Socket.io server with JWT auth
- [x] **Real `docker exec` PTY bridge** ← **DONE**
- [x] Session countdown timer
- [ ] Leaderboard live updates via Redis Pub/Sub on flag capture
- [ ] Lab status push events (initializing → running → completed/error)

---

## 🎯 What Needs to Be Done

### Code Quality Hardening (NEW — from audit)

**Status:** 🟡 In Progress | **Priority:** Highest | **BFRI: ~ -0.63 (improved)**

- [x] **Security hardening** — fail-fast config, removed insecure defaults, added security headers
- [x] **Service layer extraction** — auth/subscription/lab/leaderboard/flag extracted
- [x] **Input validation** — validators added for auth/lab/flag/subscription/chat/user routes
- [x] **Graceful shutdown** — SIGTERM/SIGINT handlers for clean connection draining
- [x] **Request correlation IDs** — tracing IDs added (`X-Request-Id`)
- [x] **Structured logging** — migrated to pino/pino-http
- [x] **Docker client dedup** — socket handler uses docker service shared path
- [x] **Socket.io rate limiting** — terminal-input throttle implemented
- [ ] **Tests** — unit (services), integration (API), payment (signature mocking)

---

## Phase 3: User Management & Subscriptions

### 3.1 User Profiles & Social

**Status:** 🟡 Enhanced model ready; profile endpoints basic

- [x] `firstName`, `lastName`, `avatar`, `preferences` fields
- [ ] Avatar upload (S3 or local storage)
- [ ] Badges/achievements
- [ ] Public profile page

### 3.2 Subscription & Payment (Razorpay) — Hardened 2026-04-02

**Status:** 🟢 MVP Complete — integration tests pending

- [x] All payment features implemented
- [ ] Integration tests: signature mismatch, idempotency, captured:false rejection
- [ ] Rate limiting on `/create-order` endpoint
- [ ] Deployment documentation

---

## Phase 4: Kubernetes Lab Orchestration

**Status:** 🔴 Not Started | **Priority:** Medium

- [ ] Local k8s cluster setup (minikube/kind)
- [ ] Helm chart for lab pods
- [ ] Lab Service refactor: replace Docker CLI with `client-go`

---

## Phase 5: Advanced Features & Scaling

- [ ] Observability stack (Prometheus + Grafana + Loki)
- [ ] AI Chat integration (OpenAI/Anthropic API keys)
- [ ] Microservices split (optional)
- [ ] Message queue (Kafka/RabbitMQ)

---

## Phase 6: AWS Production Infrastructure

All sub-phases remain **🔴 Not Started**.

---

## 📊 Feature Comparison: Current vs Production

| Feature           | Current Status (`express_server`)                                | Next Target                                  | Production (`advance.md`)          |
| ----------------- | ---------------------------------------------------------------- | -------------------------------------------- | ---------------------------------- |
| **Runtime**       | Node.js / Express 4 with partial service-layer architecture      | complete remaining module extraction + tests | Go microservices                   |
| **Auth**          | JWT + HttpOnly cookie + OTP verify                               | + fail-fast config + OAuth2                  | + Session mgmt + audit logs + PKCE |
| **Email**         | Nodemailer SMTP (reset + OTP) ✅                                 | Same                                         | Managed SES/SendGrid               |
| **Database**      | MongoDB (Mongoose 8)                                             | Same                                         | + PostgreSQL + sharding            |
| **Redis**         | ✅ **Fully wired** (cache, leaderboard, flags, TTL)              | + Pub/Sub for live updates                   | ElastiCache Cluster Mode           |
| **Labs**          | ✅ **Real `docker exec` PTY** (was mock)                         | k8s scheduling                               | Kubernetes + VM pools              |
| **Scoring**       | ✅ Anti-cheat (Redis atomic) + dedup guard                       | + Hint-penalty + dynamic flags               | + Anti-cheat + dynamic flags       |
| **Leaderboard**   | ✅ **Redis sorted set** + pipeline rebuild                       | + WebSocket live updates                     | Redis sorted set + WebSocket       |
| **Real-time**     | ✅ **Real `docker exec` PTY bridge** via Socket.io               | + Redis Pub/Sub                              | WS + Redis Pub/Sub                 |
| **Challenges**    | 11 Docker lab images ✅                                          | + k8s scheduling                             | Kubernetes pods + VM labs          |
| **Subscriptions** | ✅ Razorpay MVP (sig verify, webhook, idempotency)               | + Rate limiting + tests                      | + Usage tracking + billing portal  |
| **Code Quality**  | ⚠️ BFRI ~ -0.63 (major hardening done; tests still missing)      | complete tests + remaining module extraction | Layered arch + full test suite     |
| **Docker**        | ✅ Multi-stage server Dockerfile + hardened compose for DB stack | Full app container orchestration path        | EKS pods                           |
| **Monitoring**    | pino + pino-http structured logging                              | metrics/tracing stack                        | Prometheus + Grafana + Loki        |
| **Networking**    | N/A                                                              | Local VPN                                    | WireGuard + isolated VPCs          |
| **Deployment**    | Local dev (`npm run dev`)                                        | Docker Compose (full stack)                  | EKS + multi-AZ + ArgoCD            |
| **Scaling**       | Single instance                                                  | Vertical                                     | Horizontal + autoscaling           |

---

## 🚀 Quick Start: Next Steps

### Immediate (Code Quality Sprint)

1. **Test coverage** — add unit tests for extracted services and integration tests for auth/payment/lab flows
2. **Complete service extraction** — remaining modules (`user`, `course`, `module`, `task`, `chat`, `admin`)
3. **Real-time improvements** — leaderboard push updates and richer lab lifecycle push events
4. **Production baseline** — CI/CD, observability stack, and deployment hardening

### Then (Feature Sprint)

7. Admin panel — course/module/task CRUD UI
8. Quiz/question task type
9. Payment integration tests
10. Leaderboard WebSocket live updates

---

## 📝 Notes

- **Real Docker terminal!** — Socket.io now bridges to actual container bash/sh sessions via `docker exec` PTY. This was the top Phase 2 priority and is now done.
- **Redis is fully wired** — user cache, leaderboard sorted set, flag rate limiting, dedup, lab session TTL, and subscription cache bust are all active. In-memory fallback works when Redis is down.
- **Code quality has improved materially** — major hardening and service extraction slices are done; tests and remaining module extraction are now the main blockers.
- **Security baseline improved** — fail-fast config, request IDs, graceful shutdown, structured logs, and socket input throttling are all in place.

---

## 📚 Resources

- **Current state**: [current.md](./current.md)
- **Production target**: [advance.md](./advance.md)
- **Architecture docs**: [README.md](./README.md)
- **UI guidelines**: [client/UI.md](./client/UI.md)
