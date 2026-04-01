# XploitVerse: Current State vs Production Architecture

**Last Updated:** 2026-04-01 (`express_server` branch)

This document compares the current `express_server` implementation against the production-grade architecture outlined in `advance.md` and provides a phased roadmap to bridge the gap.

---

## 📊 Progress Overview

```
Foundation:     ████████████████████████  98%
Core Features:  ████████████████░░░░░░░  70%
Infrastructure: ████░░░░░░░░░░░░░░░░░░  15%
Production:     ░░░░░░░░░░░░░░░░░░░░░░   0%
```

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
  - **Email OTP Verification page** (`VerifyEmailOtp.jsx`) ← **NEW**
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

### Backend (`server/`) — Node.js / Express ← **Replaced Go**

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
  - `totalLabTime`, `totalSpent` billing stubs
  - `preferences` (theme, notifications)
  - Mongoose indexes on `email`, `role`, `createdAt`
- [x] **Auth System (complete)**
  - Register / Login / Logout
  - `/me` with `activeSessions` virtual populated
  - JWT token generation & verification
  - Password hashing (bcrypt, salt rounds 12)
  - Update password + refresh token endpoints
  - Forgot/reset password with SHA-256 hashed token (10-min TTL)
  - **Email OTP verification** ← **NEW**: send/verify/resend OTP, max 5 attempts, 60-s cooldown, `isEmailVerified` flag
  - Role-based middleware (`verifyToken`, `requireRole`)
- [x] **Email Service** ← **NEW**
  - `nodemailer` SMTP transporter (graceful no-op if unconfigured)
  - Branded HTML password-reset email
  - Branded HTML OTP verification email
  - Dev mode returns token/OTP in response when SMTP not configured
- [x] **REST Controllers**
  - Auth, User, Lab, LabSession, Course, Module, Task, Flag, Leaderboard, Chat, Admin
- [x] **Socket.io Real-time** ← **Replaces Go native WS**
  - JWT auth middleware on socket handshake
  - `join-lab` → simulated boot log stream (500 ms intervals)
  - Random activity log stream after boot
  - `terminal-input` → mock command responses
  - `leave-lab` + disconnect cleanup
  - ⚠️ Terminal is **simulated** (no real `docker exec` bridge yet)
- [x] **Rate Limiting**
  - Global: 100 req / 15 min per IP (1000 in dev)
  - Auth routes: 10 req / 15 min per IP (100 in dev)
- [x] **Health check** — `GET /health`
- [x] **Database Seeding** — `server/src/scripts/seedLabs.js`
- [x] **Auto-termination service** — kills lab sessions on TTL expiry

### Challenges (`challenges/`) ← **NEW vs main**

Real Docker lab images included:
- `linux-basics`, `web-basic`, `sqli-lab`, `owasp-juice`, `reverse-shell`
- `recon-basic`, `privesc-basic`, `privesc-linux`, `crypto-basics`
- `boot2root`, `network-recon`

### DevOps

- [x] `docker-compose.yml` — MongoDB 7 + Redis 7-alpine (persistent volumes)
- [x] Environment configuration (`.env.example`)
- [x] Basic project structure

---

## ✅ What's Been Done (Phase 1: Core Features — In Progress)

- [x] **Course content browsing (MVP)**
  - Backend: course/module/task read endpoints wired
  - Frontend: `/courses` → course → module → task pages
  - Course catalog — search + difficulty filter + color badges + tag chips
  - Course detail — difficulty badge, tags, module count
  - Module page — task type badges (Flag/Quiz/Lab) + points total
- [x] **Flag submission & scoring (MVP+)**
  - `POST /api/flags/submit`, SHA-256 hashing
  - MongoDB: `user_task_progress` persistence
  - Anti-cheat: 5 attempts/60 s per user+task (in-memory on `FlagHandler`)
  - `GET /api/users/me/progress` — completion summary endpoint
  - Frontend: flag form, toast feedback, completion banner
- [x] **Leaderboard (MVP)**
  - MongoDB aggregation pipeline, 5-min in-memory cache
  - `GET /api/leaderboard` + `GET /api/leaderboard/me`
  - `Leaderboard.jsx` — trophy/medal icons, current-user highlight, 30-s auto-refresh
- [x] **Socket.io lab terminal (simulated)**
  - Boot log stream + random activity stream
  - Mock command responses (`ls`, `pwd`, `whoami`, etc.)
  - Note: not yet a real `docker exec` PTY bridge
- [x] **Docker lab spawning (CLI-based)**
  - `DockerService` — spawn/stop containers via `docker` CLI
  - Mock fallback if Docker daemon unavailable
  - Auto-termination service on TTL expiry
  - `VITE_API_BASE` env var for Terraform-injectable API URL
- [x] **Email verification flow**
  - `VerifyEmailOtp.jsx` frontend page
  - OTP send/verify/resend API wired
  - `isEmailVerified` stored on user

---

## 🎯 What Needs to Be Done

### Terraform/AWS Compatibility (Do Now, No AWS Yet)

- **12-factor config only**: all endpoints/credentials via env vars
  - Backend: `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGINS`, `SMTP_*`, cookie/domain settings
  - Client: single `VITE_API_BASE` env var
- **Health/readiness**: `GET /health` already present ✅
- **Stateless services**: no local disk state required at runtime
- **Idempotent seed/scripts**: keep seed scripts safe to run repeatedly

---

## Phase 1: Core Application Features (Current Priority)

_Estimated: 1-2 weeks remaining_

### 1.1 Course & Module System

**Status:** 🟢 Done (MVP)

- [x] Database Models (Course, Module, Task schemas)
- [x] API Endpoints (list, get, create admin)
- [x] Frontend Pages (catalog, detail, module, task+flag)

---

### 1.2 Lab Spawning (Local/Docker)

**Status:** 🟡 Foundation Complete — real `docker exec` terminal pending

- [x] Lab Lifecycle Management (`POST /api/lab-sessions`, `GET`, `DELETE`)
- [x] Docker CLI integration with mock fallback
- [x] Auto-termination on TTL expiry
- [ ] **Replace simulated terminal with real `docker exec` PTY bridge** ← Next
  - Mount read-only flag files into container
  - Per-container network isolation

---

### 1.3 Flag Submission & Scoring

**Status:** 🟢 Done (MVP+)

- [x] `POST /api/flags/submit`, SHA-256 hashing, flag validation
- [x] Anti-cheat: 5 attempts/60 s per user per task
- [x] `user_task_progress` collection, points tracking
- [x] Progress API + frontend completion banner
- [ ] Hint-penalty deduction logic

---

### 1.4 Leaderboard (Basic)

**Status:** 🟢 Done (MVP)

- [x] MongoDB aggregation pipeline, 5-min in-memory cache
- [x] `GET /api/leaderboard` + `GET /api/leaderboard/me`
- [x] `Leaderboard.jsx` — auto-refresh, rank icons, current user highlight

---

## Phase 2: Enhanced Features & Real-time

_Estimated: 2-3 weeks_

### 2.1 Redis Integration

**Status:** 🟡 Redis container ready in Compose; server not yet wired to it
**Priority:** High

- [x] Docker Compose Redis service (port 6379, LRU 128 MB) ← **NEW**
- [ ] Add `ioredis` client to Express server
- [ ] Use cases:
  - Leaderboard as Redis Sorted Set (`ZADD`, `ZREVRANGE`)
  - Session JWT payload cache (TTL 15 min)
  - Rate limiting with sliding window
  - Flag submission dedup (anti-cheat)
  - Lab session TTL tracking

### 2.2 WebSockets (Real-time Updates)

**Status:** 🟡 Socket.io setup done; real terminal + live leaderboard pending
**Priority:** Medium

- [x] Socket.io server initialized with JWT auth
- [x] `join-lab` → simulated boot + activity log stream
- [x] `terminal-input` → mock command responses
- [ ] **Real `docker exec` PTY bridge** (replace mock with actual container access)
- [ ] Leaderboard live updates via Redis Pub/Sub on flag capture
- [ ] Lab status push events (initializing → running → completed/error)

### 2.3 Chat/AI Mentor

**Status:** 🟡 Chat routes exist, no AI integration
**Priority:** Low

- [ ] Integrate OpenAI/Anthropic API
- [ ] Context-aware hints
- [ ] Rate limiting (10 messages/hour free tier)
- [ ] Conversation history storage

---

## Phase 3: User Management & Subscriptions

_Estimated: 2 weeks_

### 3.1 User Profiles & Social

**Status:** 🟡 Enhanced model ready; profile endpoints basic
**Priority:** Medium

- [x] `firstName`, `lastName`, `avatar` fields on User model ← **NEW**
- [x] `preferences` (theme, notifications) on User model ← **NEW**
- [ ] Avatar upload (S3 or local storage)
- [ ] Bio, social links
- [ ] Badges/achievements (first blood, streak, completionist)
- [ ] Public profile page
- [ ] Activity feed (recent flags, labs, writeups)

### 3.2 Subscription & Payment (Stripe)

**Status:** 🔴 Not Started
**Priority:** Medium

- [ ] Subscription model schema
- [ ] Stripe webhook handlers
- [ ] Tier enforcement (free/pro/premium)
- [ ] Pricing page + checkout flow + billing management

### 3.3 Writeups

**Status:** 🔴 Not Started
**Priority:** Low

- [ ] Markdown editor, submit/moderate/publish flow
- [ ] Upvote/downvote system

---

## Phase 4: Kubernetes Lab Orchestration

_Estimated: 3-4 weeks_

### 4.1 Local Kubernetes (minikube/kind)

**Status:** 🔴 Not Started
**Priority:** High (prerequisite for Phase 5)

- [ ] Local k8s cluster setup
- [ ] Helm chart templates for lab pods (SecurityContext, ResourceQuota, NetworkPolicy)
- [ ] Lab Service refactor: replace Docker CLI with `client-go`
- [ ] Namespace per user/session

### 4.2 VPN/Network Access

**Status:** 🔴 Not Started
**Priority:** Medium

**Option A: Browser Terminal** — embed `ttyd`/`Wetty` in lab containers
**Option B: WireGuard VPN** — per-user keypair, /30 subnet, `.conf` download

---

## Phase 5: Advanced Features & Scaling

_Estimated: 3-4 weeks_

### 5.1 Microservices Split (Optional)

**Status:** 🔴 Not Planned for Semester Project
**Priority:** Low

### 5.2 Message Queue (Kafka/RabbitMQ)

**Status:** 🔴 Not Started
**Priority:** Low

### 5.3 Observability Stack

**Status:** 🔴 Not Started
**Priority:** Medium

- [ ] Structured JSON logs (`morgan` is in place; add JSON formatter)
- [ ] Prometheus client + Grafana dashboards
- [ ] OpenTelemetry SDK + trace context propagation

### 5.4 PostgreSQL Migration

**Status:** 🔴 Not Started (MongoDB works fine for project)
**Priority:** Low (optional)

---

## Phase 6: AWS Production Infrastructure (FINAL PHASE)

_Estimated: 2-3 weeks_

### 6.1–6.6 (same as before — no change in status)

All sub-phases (AWS setup, Managed Services, EKS, Frontend hosting, CI/CD, Monitoring) remain **🔴 Not Started**.

---

## 🗓️ Recommended Timeline (16-Week Semester)

| Week  | Phase         | Focus                                                            |
| ----- | ------------- | ---------------------------------------------------------------- |
| 1-2   | Phase 0       | ✅ **Done:** Foundation, UI, Basic Auth                           |
| 3-4   | Phase 1.1     | ✅ **Done:** Course/Module/Task system                            |
| 5-6   | Phase 1.2     | ✅ **Done:** Docker lab spawning (CLI) + Email OTP                |
| 7-8   | Phase 1.3-1.4 | ✅ **Done:** Flag submission + Leaderboard + Socket.io setup      |
| 9-10  | Phase 2       | Redis wiring + real `docker exec` terminal + live leaderboard WS |
| 11-12 | Phase 3       | Profiles + Stripe subscriptions                                  |
| 13-14 | Phase 4       | Kubernetes (minikube) + Lab orchestration                        |
| 15    | Phase 2/3/4   | Buffer week (finish features)                                    |
| 16    | Phase 6       | **AWS deployment** (if time permits)                             |

---

## 📊 Feature Comparison: Current vs Production

| Feature           | Current Status (`express_server`)        | Phase 1-4 Target               | Production (`advance.md`)          |
| ----------------- | ---------------------------------------- | ------------------------------ | ---------------------------------- |
| **Runtime**       | Node.js / Express 4                      | Same (or microservices split)  | Go microservices                   |
| **Auth**          | JWT + HttpOnly cookie + OTP email verify | + OAuth2 + MFA                 | + Session mgmt + audit logs + PKCE |
| **Email**         | Nodemailer SMTP (reset + OTP) ✅          | Same                           | Managed SES/SendGrid               |
| **Database**      | MongoDB (Mongoose 8)                     | + Redis wired                  | + PostgreSQL + sharding            |
| **Redis**         | Container ready; server not yet using it | Wired (leaderboard, cache)     | ElastiCache Cluster Mode           |
| **Labs**          | Docker CLI ✅                             | Real `docker exec` PTY / k8s   | Kubernetes + VM pools              |
| **Scoring**       | Anti-cheat rate-limit ✅                  | + Hint-penalty + dynamic flags | + Anti-cheat + dynamic flags       |
| **Leaderboard**   | MongoDB agg + in-memory cache ✅          | Redis sorted set               | Redis sorted set + WebSocket       |
| **Real-time**     | Socket.io (simulated terminal)           | Real `docker exec` PTY bridge  | WS + Redis Pub/Sub                 |
| **Challenges**    | 11 Docker lab images ✅ **NEW**           | + k8s scheduling               | Kubernetes pods + VM labs          |
| **Email verify**  | OTP flow end-to-end ✅ **NEW**            | Same                           | Same                               |
| **Subscriptions** | Not implemented                          | Stripe test mode               | + Usage tracking + billing         |
| **Monitoring**    | morgan logs only                         | Basic metrics                  | Prometheus + Grafana + Loki        |
| **Networking**    | N/A                                      | Local VPN                      | WireGuard + isolated VPCs          |
| **Deployment**    | Local dev (`npm run dev`)                | Docker Compose                 | EKS + multi-AZ + ArgoCD            |
| **Scaling**       | Single instance                          | Vertical                       | Horizontal + autoscaling           |

---

## 🚀 Quick Start: Next Steps (Week 9–10 sprint)

1. Wire `ioredis` inside Express server — replace in-memory leaderboard cache with Redis sorted set.
2. Replace simulated Socket.io terminal with real `dockerode`/`docker exec` PTY bridge.
3. Admin panel — course/module/task CRUD UI (endpoints already exist).
4. Quiz/question task type — multiple-choice form in TaskDetail + scoring handler.
5. Integration tests for flag submission (critical path).
6. End-to-end email verification test with real SMTP credentials.

---

## 📝 Notes

- **Backend language change**: `express_server` uses Node.js/Express instead of Go. This is simpler to extend quickly but sacrifices the concurrency/memory advantages Go has for lab orchestration. Consider keeping Node for API layer and using Go microservices for lab orchestration later.
- **Redis is there but idle**: The Compose file has Redis ready. The fastest win is wiring `ioredis` for leaderboard + session cache.
- **Mock terminal is a gap**: The Socket.io terminal currently returns hardcoded mock responses. Real `docker exec` bridging should be the top Phase 2 priority.
- **Don't over-engineer early**: Start with monolith, split into microservices only if needed.
- **AWS is expensive**: Use AWS Academy credits or stick to local k8s for demo.
- **Document everything**: Architecture diagrams are as valuable as working code for grades.
- **Security mindset**: Even in dev, never store flags in plaintext, always hash.

---

## 📚 Resources

- **Current state**: [current.md](./current.md)
- **Production target**: [advance.md](./advance.md)
- **Architecture docs**: [README.md](./README.md)
- **UI guidelines**: [client/UI.md](./client/UI.md)
