# XploitVerse: Current State vs Production Architecture

**Last Updated:** 2026-07-04

This document compares our current implementation against the production-grade architecture outlined in `advance.md` and provides a phased roadmap to bridge the gap.

---

## 📊 Progress Overview

```
Foundation:     ██████████████████████  95%
Core Features:  █████████████░░░░░░░░  62%
Infrastructure: ██░░░░░░░░░░░░░░░░░░  10%
Production:     ░░░░░░░░░░░░░░░░░░░░   0%
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

### Backend (`backend/`)

- [x] **Go API Foundation**
  - Gin framework setup
  - MongoDB connection via `mongo-driver/v2`
  - JWT authentication (`golang-jwt/jwt/v5`)
  - HTTP-only cookie management
- [x] **Core Models**
  - User model (with role: STUDENT/INSTRUCTOR/ADMIN)
  - Lab model
  - Lab Session model
- [x] **Auth System**
  - Register/Login/Logout endpoints
  - JWT token generation & verification
  - Password hashing (bcrypt)
  - Role-based middleware (`VerifyToken`, `RequireRole`)
- [x] **Basic Handlers**
  - Auth handlers (register, login, logout, /me)
  - Lab handlers (list, get by ID)
  - User handlers (basic CRUD)
  - Lab session handlers (shell)
- [x] **Middleware**
  - Auth verification
  - Rate limiting (memory-based)
  - Error handling
  - CORS
- [x] **Database Seeding**
  - `cmd/seed/main.go` for lab data

### DevOps

- [x] Environment configuration (`.env` files)
- [x] Basic project structure
- [x] Git repository setup _(assumed)_

---

## ✅ What's Been Done (Phase 1: Core Features — In Progress)

- [x] **Course content browsing (MVP)**
  - Backend: course/module/task read endpoints wired
  - Frontend: `/courses` → course → module → task pages
- [x] **Flag submission (MVP)**
  - Backend: `POST /api/flags/submit`
  - MongoDB: `user_task_progress` persistence
  - Seed: includes a demo `flag` task for testing
  - Frontend: flag submission form shown for `task.type === "flag"`

---

## 🎯 What Needs to Be Done

The roadmap below is organized into **6 phases**, with AWS/infrastructure work saved for the final phase as requested.

### Terraform/AWS Compatibility (Do Now, No AWS Yet)

These are small constraints we follow now so the app drops cleanly into Terraform-managed AWS later:

- **12-factor config only**: all endpoints/credentials via env vars (no hard-coded localhost assumptions)
  - Backend: `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGINS`, cookie/domain settings
  - Client: a single API base URL env (so Terraform outputs can wire it later)
- **Clear network boundaries**: one backend HTTP port, one frontend static hosting target
- **Health/readiness**: keep or add simple `/health` endpoints before Phase 6 (Terraform + ALB health checks)
- **Stateless services**: no local disk state required for runtime correctness (except optional logs)
- **Idempotent seed/scripts**: keep seed scripts safe to run repeatedly in dev/staging

---

## Phase 1: Core Application Features (Current Priority)

_Estimated: 2-3 weeks_

### 1.1 Course & Module System

**Status:** 🟢 Done (MVP)  
**Priority:** High

- [x] **Database Models**
  - Course schema (title, slug, difficulty, prerequisites, is_premium)
  - Module schema (title, order, points, course relationship)
  - Task schema (title, type, flag_hash, points, hints)
- [x] **API Endpoints**
  - `GET /api/courses` - List all courses
  - `GET /api/courses/:slug` - Get course details
  - `GET /api/modules/:id` - Get module details
  - `GET /api/tasks/:id` - Get task details
  - `POST /api/admin/courses` - Create course (admin)
  - `PUT /api/admin/courses/:id` - Update course (admin)
- [x] **Frontend Pages**
  - [x] Course catalog page — search + difficulty filter + color badges + tag chips
  - [x] Course detail page — difficulty badge, tags, module count, chevron nav
  - [x] Module page — task type badges (Flag/Quiz/Lab) + points total
  - [x] Task detail page (task view + flag submission)

---

### 1.2 Lab Spawning (Local/Docker)

**Status:** � Foundation Complete (CLI-based Docker orchestration)  
**Priority:** High

- [x] **Lab Lifecycle Management**
  - `POST /api/lab-sessions` - Start a lab
  - `GET /api/lab-sessions/:id` - Get session status
  - `DELETE /api/lab-sessions/:id` - Terminate lab
  - Session TTL enforcement (auto-terminate after N minutes)
- [x] **Docker Integration (Phase 1)**
  - `DockerService` (CLI-based) spawns/stops containers via `docker` CLI — no SDK dependency
  - Mock-fallback mode if Docker daemon unavailable (dev/CI friendly)
  - `ContainerID` + `DockerImage` stored in `LabSession` model
  - Resource limits: `--memory=512m` per container
  - Auto-termination service kills containers on TTL expiry
  - `GET /api/users/me/progress` endpoint for completion status
- [x] **Frontend Integration**
  - Lab spawn/stop wired in Dashboard
  - `VITE_API_BASE` env var for Terraform-injectable API URL
- [ ] Post-spawn: forward terminal via `docker exec` (Phase 1.3 WebSocket work)
  - Mount read-only flag files into container
  - Per-container VPN/network isolation

---

### 1.3 Flag Submission & Scoring

**Status:** 🟡 Partially Done (MVP working)  
**Priority:** High

- [x] **Scoring Service (Monolith First)**
  - `POST /api/flags/submit` endpoint
  - SHA-256 flag hashing
  - Flag validation against task flag_hash
- [ ] **Anti-cheat**
  - Per-task rate limit (e.g., 5 attempts/min per user per task)
- [ ] **Points rules**
  - Apply hint-penalty logic (currently awards base points on correct)
- [x] **Progress Tracking (MVP)**
  - `user_task_progress` collection in MongoDB
  - Track: task_id, completed_at, attempts, points_earned
- [ ] **Progress API**
  - `GET /api/users/me/progress` - Get user's completion status
- [x] **Frontend (MVP)**
  - Flag submission form in task page
  - Toast feedback on success/error
- [ ] **Polish**
  - Progress indicator update in UI
  - Success animation (optional)

---

### 1.4 Leaderboard (Basic)

**Status:** 🔴 Not Started  
**Priority:** Medium

- [ ] **Backend**
  - Aggregate total points per user (MongoDB aggregation)
  - Cache leaderboard in-memory (rebuild every 5 min)
  - `GET /api/leaderboard` - Top 100 users
  - `GET /api/leaderboard/me` - Current user's rank
- [ ] **Frontend**
  - Leaderboard page (table view)
  - Rank, username, points columns
  - Highlight current user
  - Auto-refresh every 30s

---

## Phase 2: Enhanced Features & Real-time

_Estimated: 2-3 weeks_

### 2.1 Redis Integration

**Status:** 🔴 Not Started  
**Priority:** High (prerequisite for scaling)

- [ ] **Setup**
  - Add Redis client to Go backend (`go-redis/redis/v9`)
  - Docker Compose for local Redis instance
- [ ] **Use Cases**
  - Session caching (JWT payload, TTL 15 min)
  - Leaderboard as Redis Sorted Set (`ZADD`, `ZREVRANGE`)
  - Rate limiting (per-user counters with sliding window)
  - Flag submission dedup (prevent double-submit)
  - Lab session TTL tracking

### 2.2 WebSockets (Real-time Updates)

**Status:** 🟡 Shell exists (`ws/handler.go`)  
**Priority:** Medium

- [ ] **Lab Terminal Access**
  - WebSocket endpoint for terminal input/output
  - Forward commands to Docker container via `docker exec`
  - Stream stdout/stderr back to client
- [ ] **Leaderboard Live Updates**
  - Redis Pub/Sub on flag capture events
  - Broadcast rank changes to all connected clients
- [ ] **Lab Status Updates**
  - Push session state changes (initializing → running → completed)
  - Push error events (spawn failed, container OOM)

### 2.3 Chat/AI Mentor

**Status:** 🟡 Handlers exist, needs AI integration  
**Priority:** Low (nice-to-have)

- [ ] Integrate OpenAI/Anthropic API
- [ ] Context-aware hints (pass task description + user progress)
- [ ] Rate limiting (10 messages/hour for free tier)
- [ ] Conversation history storage

---

## Phase 3: User Management & Subscriptions

_Estimated: 2 weeks_

### 3.1 User Profiles & Social

**Status:** 🟡 Basic profile exists  
**Priority:** Medium

- [ ] **Profile Enhancements**
  - Avatar upload (S3 or local storage)
  - Bio, social links
  - Badges/achievements (first blood, streak, completionist)
  - Public profile page
- [ ] **Activity Feed**
  - Recent flags captured
  - Labs completed
  - Writeups published

### 3.2 Subscription & Payment (Stripe)

**Status:** 🔴 Not Started  
**Priority:** Medium

- [ ] **Stripe Integration**
  - Subscription model schema
  - Webhook handler for `checkout.session.completed`
  - Webhook handler for `invoice.payment_succeeded`
  - Webhook handler for `customer.subscription.deleted`
- [ ] **Tier Enforcement**
  - Free: 3 labs/day, basic rooms only
  - Pro: unlimited labs, all rooms, priority queue
  - Premium: + private labs, custom VMs
- [ ] **Frontend**
  - Pricing page
  - Checkout flow (Stripe Checkout redirect)
  - Billing management page (customer portal link)

### 3.3 Writeups

**Status:** 🔴 Not Started  
**Priority:** Low

- [ ] Markdown editor (TipTap or SimpleMDE)
- [ ] Submit writeup for task
- [ ] Moderation queue (admin approval)
- [ ] Public writeup listing per task
- [ ] Upvote/downvote system

---

## Phase 4: Kubernetes Lab Orchestration

_Estimated: 3-4 weeks_

### 4.1 Local Kubernetes (minikube/kind)

**Status:** 🔴 Not Started  
**Priority:** High (prerequisite for Phase 5)

- [ ] **Setup**
  - Local k8s cluster (minikube or kind)
  - Install cert-manager, ingress-nginx
- [ ] **Lab Pod Definitions**
  - Helm chart templates for lab pods
  - SecurityContext enforced (non-root, no privileges)
  - ResourceQuota per namespace
  - NetworkPolicy (isolate pods)
- [ ] **Lab Service Refactor**
  - Replace Docker SDK with Kubernetes `client-go`
  - Create namespace per user or per session
  - Create pod with lab image
  - Wait for pod ready state
  - Return pod IP or service endpoint

### 4.2 VPN/Network Access

**Status:** 🔴 Not Started  
**Priority:** Medium

**Option A: Browser Terminal** (easier)

- [ ] Embed `ttyd` or `Wetty` in lab containers
- [ ] Expose via ingress with auth token
- [ ] WebSocket terminal in React frontend

**Option B: WireGuard VPN** (production-grade)

- [ ] WireGuard server container
- [ ] Generate per-user keypair
- [ ] Assign /30 subnet per lab session
- [ ] Provide `.conf` file download
- [ ] Fallback to browser terminal

---

## Phase 5: Advanced Features & Scaling

_Estimated: 3-4 weeks_

### 5.1 Microservices Split (Optional)

**Status:** 🔴 Not Planned for Semester Project  
**Priority:** Low

- [ ] Split monolith into services (auth, labs, scoring, courses)
- [ ] API Gateway (Kong or Traefik)
- [ ] Service-to-service auth (mTLS or JWT)

### 5.2 Message Queue (Kafka/RabbitMQ)

**Status:** 🔴 Not Started  
**Priority:** Low

- [ ] Event-driven architecture
  - Publish: `lab.started`, `flag.captured`, `user.registered`
  - Consume: Update leaderboard, send notifications, analytics
- [ ] Use Kafka or RabbitMQ (simpler for project)

### 5.3 Observability Stack

**Status:** 🔴 Not Started  
**Priority:** Medium

- [ ] **Logging**
  - Structured JSON logs (use `slog` in Go 1.21+)
  - Centralized logging (Loki or ELK stack)
- [ ] **Metrics**
  - Prometheus client in Go services
  - Grafana dashboards (lab spawn time, flag submission rate, error rate)
- [ ] **Tracing**
  - OpenTelemetry SDK
  - Trace context propagation (trace_id in headers)

### 5.4 PostgreSQL Migration

**Status:** 🔴 Not Started  
**Priority:** Low (optional)

**Why:** MongoDB works fine for project. Only migrate if you need ACID transactions for subscriptions.

- [ ] Add PostgreSQL (via Docker Compose)
- [ ] Migrate: users, subscriptions, courses, progress
- [ ] Keep MongoDB for: lab_sessions, writeups, audit logs

---

## Phase 6: AWS Production Infrastructure (FINAL PHASE)

_Estimated: 2-3 weeks_

### 6.1 AWS Setup

**Status:** 🔴 Not Started  
**Priority:** Final Phase Only

- [ ] **AWS Account Structure**
  - Create AWS account (or use existing)
  - IAM roles with least privilege
  - Enable MFA on root account
- [ ] **Networking**
  - VPC with public + private subnets (multi-AZ)
  - NAT Gateway for private subnet egress
  - Security Groups (strict ingress rules)

### 6.2 Managed Services

**Status:** 🔴 Not Started  
**Priority:** Final Phase Only

- [ ] **MongoDB Atlas** (or AWS DocumentDB)
  - Migrate from local MongoDB
  - Configure connection string in backend
- [ ] **ElastiCache (Redis)**
  - Replace local Redis
  - Configure cluster endpoint
- [ ] **RDS Aurora** (if using PostgreSQL)
  - Provision cluster
  - Run migrations

### 6.3 EKS (Kubernetes on AWS)

**Status:** 🔴 Not Started  
**Priority:** Final Phase Only

- [ ] **Provision EKS Cluster**
  - Use Terraform (preferred; `eksctl` acceptable)
  - Node groups: t3.medium (2-5 nodes, autoscaling)
  - Spot instances for cost savings
- [ ] **Deploy Services**
  - Helm chart for backend API
  - Ingress controller (ALB or nginx-ingress)
  - Cert-manager for TLS
- [ ] **Lab Pods on EKS**
  - Deploy lab images to EKS
  - Namespace isolation per user
  - Resource limits + NetworkPolicies

### 6.4 Frontend Hosting

**Status:** 🔴 Not Started  
**Priority:** Final Phase Only

- [ ] **Option A: S3 + CloudFront**
  - Static site hosting on S3
  - CloudFront CDN in front
  - Route53 for DNS
- [ ] **Option B: Vercel/Netlify** (easier)
  - Connect GitHub repo
  - Automatic deployments

### 6.5 CI/CD

**Status:** 🔴 Not Started  
**Priority:** Final Phase Only

- [ ] **GitHub Actions**
  - Workflow: Lint → Test → Build → Push to ECR
  - Scan Docker images (Trivy)
- [ ] **ArgoCD (GitOps)**
  - Deploy to EKS from Helm chart repo
  - Auto-sync on main branch push

### 6.6 Monitoring & Security

**Status:** 🔴 Not Started  
**Priority:** Final Phase Only

- [ ] **CloudWatch**
  - EKS logs forwarding
  - RDS/ElastiCache metrics
- [ ] **GuardDuty**
  - Enable threat detection
- [ ] **AWS WAF**
  - Frontend protection (rate limit, SQL injection rules)

---

## 🗓️ Recommended Timeline (16-Week Semester)

| Week  | Phase         | Focus                                     |
| ----- | ------------- | ----------------------------------------- |
| 1-2   | Phase 0       | ✅ **Done:** Foundation, UI, Basic Auth   |
| 3-4   | Phase 1.1     | Course/Module system                      |
| 5-6   | Phase 1.2     | Docker lab spawning (local)               |
| 7-8   | Phase 1.3-1.4 | Flag submission + Leaderboard             |
| 9-10  | Phase 2       | Redis + WebSockets + Real-time            |
| 11-12 | Phase 3       | Profiles + Stripe subscriptions           |
| 13-14 | Phase 4       | Kubernetes (minikube) + Lab orchestration |
| 15    | Phase 2/3/4   | Buffer week (finish features)             |
| 16    | Phase 6       | **AWS deployment** (if time permits)      |

**Key Decision Points:**

- **End of Week 8:** You have a working MVP (courses, labs, flags, leaderboard)
- **End of Week 14:** You have a production-ready app (k8s orchestration, subscriptions)
- **Week 16:** AWS is a "nice-to-have" — focus on polishing core features if behind schedule

---

## 🎓 For Semester Project: Minimum Viable Product (MVP)

If time is limited, prioritize this subset:

### Must Have

1. ✅ Auth + JWT
2. Course/Module CRUD
3. **Docker lab spawning** (locally)
4. Flag submission + scoring
5. Basic leaderboard (no real-time)
6. User progress tracking

### Should Have

7. Redis caching
8. WebSocket terminal
9. Stripe test mode integration

### Nice to Have

10. Kubernetes (minikube)
11. VPN setup
12. AWS deployment

### Document But Don't Implement

- Microservices architecture (show diagrams)
- Full observability stack (describe in report)
- Advanced security (gVisor, Falco) — document approach
- Multi-region deployment — architecture diagram only

This shows you **understand** production systems without spending weeks implementing infrastructure details.

---

## 📊 Feature Comparison: Current vs Production

| Feature           | Current Status           | Phase 1-4 Target | Production (advance.md)      |
| ----------------- | ------------------------ | ---------------- | ---------------------------- |
| **Auth**          | JWT + cookies            | + OAuth2 + MFA   | + Session mgmt + audit logs  |
| **Database**      | MongoDB                  | + Redis cache    | + PostgreSQL + sharding      |
| **Labs**          | Model only               | Docker local     | Kubernetes + VM pools        |
| **Scoring**       | Anti-cheat rate-limit ✅ | + Dynamic flags  | + Anti-cheat + dynamic flags |
| **Leaderboard**   | Basic API + UI ✅        | Redis cache      | Redis sorted set + WebSocket |
| **Subscriptions** | Not impl.                | Stripe test      | + Usage tracking + billing   |
| **Monitoring**    | Logs only                | Basic metrics    | Prometheus + Grafana + Loki  |
| **Networking**    | N/A                      | Local VPN        | WireGuard + isolated VPCs    |
| **Deployment**    | Local dev                | Docker Compose   | EKS + multi-AZ + ArgoCD      |
| **Scaling**       | Single instance          | Vertical         | Horizontal + autoscaling     |

---

## 🚀 Quick Start: Next Steps

**Completed (Docker + Course UI sprint):**

1. ✅ `DockerService` (CLI-based) — spawn/stop containers with mock fallback
2. ✅ `GET /api/users/me/progress` — completion summary endpoint
3. ✅ `VITE_API_BASE` env-driven API URL for deployments
4. ✅ CourseCatalog — search + difficulty filter + badges
5. ✅ CourseDetail — difficulty badge, tags, module count
6. ✅ ModuleDetail — task type badges (Flag/Quiz/Lab), total points

**Completed (Week 4 — Terminal + Leaderboard + Anti-cheat sprint):**

1. ✅ `backend/ws/handler.go` — native WebSocket terminal bridging browser → `docker exec -i <cid> /bin/sh`; mock fallback for local dev; JWT auth via `?token=` query param
2. ✅ Per-task anti-cheat rate limiting — 5 flag attempts per 60 s per user+task, in-memory on `FlagHandler`
3. ✅ Leaderboard aggregation endpoint (`GET /api/leaderboard`, `GET /api/leaderboard/me`) — MongoDB pipeline, 5-min cache
4. ✅ `Leaderboard.jsx` page — trophy/medal rank icons, current-user highlight, auto-refresh every 30 s
5. ✅ TaskDetail completion indicator — parallel fetch of `/me/progress`; green "Completed" banner + points earned; flag form hidden after solve
6. ✅ Navbar — Leaderboard link added (Trophy icon, all roles)
7. ✅ Backend + client both compile and build clean

**Next (Week 5):**

1. Quiz/question task type — multiple-choice form in TaskDetail and scoring handler
2. Redis cache for leaderboard (replace in-memory; survive restarts)
3. Admin panel — course/module/task CRUD UI (wire to existing handlers)
4. Lab Workspace — show real container logs on connect; reconnect indicator
5. Email verification flow — confirm the email service wiring end-to-end
6. Write integration tests for flag submission (critical path)

---

## 📝 Notes

- **Don't over-engineer early**: Start with monolith, split into microservices only if needed
- **AWS is expensive**: Use AWS Academy credits or stick to local k8s for demo
- **Document everything**: Architecture diagrams are as valuable as working code for grades
- **Test continuously**: Write integration tests for flag submission (most critical flow)
- **Security mindset**: Even in dev, never store flags in plaintext, always hash

---

## 📚 Resources

- **Current state**: [current.md](./current.md)
- **Production target**: [advance.md](./advance.md)
- **Architecture docs**: [README.md](./README.md)
- **UI guidelines**: [client/UI.md](./client/UI.md)
