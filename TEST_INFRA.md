# XploitVerse End-to-End Test Infrastructure (TEST_INFRA.md)

**Document Version:** 1.0.0  
**Status:** Approved Architecture Specification  
**Scope:** Full-Stack Cyber Range Platform (Go Backend + React Vite Frontend + Docker Lab Sandbox)  
**Authoritative Sources:** `/mnt/sda3/Users/smwlc/proj/Test/xploitverse/ORIGINAL_REQUEST.md`, `/mnt/sda3/Users/smwlc/proj/Test/xploitverse/.agents/orchestrator_1/PROJECT.md`

---

## 1. Executive Summary & Test Philosophy

### 1.1 Opaque-Box, Requirement-Driven Verification
The XploitVerse End-to-End (E2E) Test Infrastructure is engineered under a strict **opaque-box, requirement-driven methodology**. The test harness treats the implementation details of the Go backend and React frontend as completely opaque boundaries. Test specifications, input domains, and expected outputs are derived strictly and exclusively from:
1. The authoritative user request (`ORIGINAL_REQUEST.md` R1–R7),
2. The project contract specifications (`PROJECT.md` § Interface Contracts), and
3. Formal industry RFCs (RFC 7519 for JWT, RFC 6455 for WebSockets, RFC 9110 for HTTP semantics).

Under no circumstances do tests adapt to match buggy or shortcut implementations. If an implementation produces non-contract responses (such as returning `snake_case` instead of `camelCase`, dropping the `{ success, message, data }` envelope, or hanging on null session expirations), the test fails deterministically and the issue is escalated to the implementation team.

### 1.2 Test Tiers & Progressive Testability
The test architecture is divided into four rigorous tiers:
- **Tier 1: Feature Coverage (Core Functional)**: Validates primary happy paths and core operational semantics for every feature. Requires $\ge 5$ distinct test cases per core feature across Authentication, Courses, and Lab Workspaces.
- **Tier 2: Boundary & Corner Cases**: Exercises system limits, extreme inputs, off-by-one errors, invalid state transitions, rate limit throttling, malformed envelopes, and security boundaries.
- **Tier 3: End-to-End User Workflows**: Validates multi-step lifecycle journeys (e.g., Register $\to$ Login $\to$ Browse Course $\to$ Launch Task Lab $\to$ Attach Terminal $\to$ Submit Flag $\to$ Verify Leaderboard Rank & Telemetry Update $\to$ Terminate Lab).
- **Tier 4: Non-Functional & Security Hardening**: Validates strict RBAC role barriers, container privilege de-escalation, CORS/Origin policies, WebSocket JWT leakage prevention, and zero-warning build/lint gates.

### 1.3 State Isolation & Flakiness Immunity
Every test case is **strictly self-contained and idempotent**:
- Tests set up their own ephemeral state, isolated mock stores, or isolated database rows.
- No test depends on the execution order or side effects of preceding tests.
- Asynchronous operations, timers, and WebSocket events utilize deterministic fake clocks or explicit condition waiters with timeouts to eliminate race conditions and flakiness.

---

## 2. Formal Test Methodologies

The test harness systematically combines four formal test design techniques to ensure exhaustive coverage without redundant bloat.

### 2.1 Category-Partition Method (Ostrand & Balcer)
For every functional interface, inputs and environmental conditions are decomposed into distinct categories, which are then partitioned into mutually exclusive equivalence classes:
1. **Input Parameters**: Payload bodies, URL parameters, query strings, HTTP headers, authentication tokens.
2. **Environment Conditions**: Database state (empty, populated, foreign key broken), User state (guest, authenticated student, instructor, admin, deactivated), Network state (healthy, slow, severed), Rate limiter state (under quota, at quota, exceeded quota).
3. **Equivalence Partitions & Constraints**:
   - Valid partitions: Nominal valid values that trigger expected business logic.
   - Error partitions: Invalid types, missing required fields, or illegal values that must trigger immediate contract rejections without side effects.
   - Constraint-based generation: Mutually exclusive properties (e.g., `[if Authenticated]`, `[if TokenValid]`, `[if ActiveSessionExists]`) prevent illegal combinatorial explosions.

### 2.2 Boundary Value Analysis (BVA)
BVA evaluates behavior at the parameter boundaries where software faults cluster. For all numerical values, string lengths, collection sizes, and time durations, tests execute against six canonical boundary points:
$$\text{Boundary Set} = \{ \text{Min} - 1, \; \text{Min}, \; \text{Nominal}, \; \text{Max}, \; \text{Max} + 1, \; \text{Extreme/Invalid} \}$$

Key boundaries applied in XploitVerse:
- **Password Length**: 0 chars (Min-1), 1 char, 8 chars (Min valid), 32 chars (Nominal), 128 chars (Max), 129 chars (Max+1), 10,000 chars (Buffer/DoS stress).
- **Username Length**: 0 chars, 2 chars (Min-1), 3 chars (Min valid), 15 chars (Nominal), 30 chars (Max), 31 chars (Max+1), special control characters.
- **Task & Lab IDs**: Negative numbers ($-1$), zero ($0$), valid IDs ($1, 42$), max 64-bit integer ($9223372036854775807$), non-numeric strings (`"abc"`, `"' OR 1=1--"`).
- **Rate Limit Thresholds**: Auth limiter ($20$ req / $15$m in prod, $1000$ in dev): req $1$, req $N-1$, req $N$ ($200$ OK), req $N+1$ ($429$ Too Many Requests).
- **Lab Session Duration**: 0 seconds, 14 minutes (pre-warning), 15 minutes (warning trigger), 4 hours (hard termination limit).

### 2.3 Pairwise & Orthogonal Combinatorial Testing
To test the high-dimensional interaction space of the platform, Pairwise Testing (Orthogonal Arrays) is deployed across all independent operational variables:

$$\text{Factors} = \begin{cases}
\text{Actor Role}: & \{ \text{Anonymous}, \text{Student}, \text{Instructor}, \text{Admin} \} \\
\text{Auth Transport}: & \{ \text{Bearer Header}, \text{JWT Cookie}, \text{Expired JWT}, \text{Tampered JWT}, \text{None} \} \\
\text{Resource State}: & \{ \text{Non-Existent}, \text{Active}, \text{Initializing}, \text{Stopped}, \text{Terminated} \} \\
\text{Action / Endpoint}: & \{ \text{Read Catalog}, \text{Start Lab}, \text{Terminate Lab}, \text{Submit Flag}, \text{View Leaderboard}, \text{Admin Metrics} \}
\end{cases}$$

Every 2-way combination of factor values is guaranteed to be exercised by at least one test case, uncovering combinatorial authorization flaws, state collision bugs, and race conditions.

### 2.4 Workload, Concurrency & Endurance Testing
Workload tests evaluate the platform under operational stress:
1. **Concurrent Session Provisioning**: Simulates simultaneous `POST /api/tasks/:id/lab-sessions` requests for the same user to ensure atomic session locking and prevent duplicate container leaks.
2. **Flag Submission Bursts**: Rapid consecutive flag attempts to verify rate-limiting, correct attempt counter increments, and prevention of double-scoring race conditions.
3. **WebSocket Reconnection & Heartbeat Stress**: Network dropouts during active terminal sessions, verifying exponential backoff retries, ping/pong health checks (30s ping, 10s pong timeout), and graceful terminal teardown.

---

## 3. 34-Feature Inventory Mapping Matrix

The table below maps all 34 features from `PROJECT.md` § Feature Inventory to formal test tiers, input categories, boundary cases, and test specifications.

| # | Feature Name | Milestone / Phase | Contract Ref | Tiers | Category-Partition Keys | Boundary & Corner Conditions | Derivation of Expected Output | Test IDs |
|---|--------------|-------------------|--------------|-------|-------------------------|------------------------------|-------------------------------|----------|
| **1** | Baseline Verification & Audit | M1 (Phase 1) | R1 Gate Script | Tier 1, 4 | Git state, DB authority, CLI gates | Dirty git tree, unmigrated DB, broken deps | Exit code 0 on all 7 verification gates | `TEST-BASE-001` to `005` |
| **2** | Code Cleanup & `any` Elimination | M1 (Phase 1) | R1 Static Analysis | Tier 1, 4 | TS strictness, Go vet cleanliness | Residual `as any`, loose interface types | `tsc --noEmit` and `go vet` return 0 errors | `TEST-CLEAN-001` to `005` |
| **3** | Tailwind Token Refactor | M2 (Phase 2) | R2 Theme Config | Tier 1, 2 | Color tokens, spacing, typography | Missing `ink`/`paper`/`cyan`, hardcoded hex | CSS classes resolve with standard design tokens | `TEST-UI-TOK-001` to `005` |
| **4** | CRT Scanline Fix | M2 (Phase 2) | R2 DOM Hierarchy | Tier 1, 2 | Overlay z-index, modal focus, dropdowns | Scanline intercepting clicks on modals/toasts | Scanline `pointer-events: none` or $z < 50$ | `TEST-UI-CRT-001` to `005` |
| **5** | UI Primitives Repair & Standardization | M2 (Phase 3) | R2 Component Specs | Tier 1, 2 | 16 UI primitives, variants, states | Disabled buttons clickable, missing ARIA | Full keyboard/click support, WCAG compliance | `TEST-UI-PRIM-001` to `008` |
| **6** | Legacy Component Migration | M2 (Phase 3) | R2 Deprecation Audit | Tier 1 | Legacy tags (`TacticalBadge`, `SpotlightCard`) | Deprecated imports remaining in codebase | Zero references to legacy components | `TEST-UI-MIG-001` to `005` |
| **7** | Layout & Navigation Unification | M2 (Phase 3) | R2 App Shell | Tier 1, 3 | Navbar, Footer, Route transitions | Unauthenticated vs authenticated header links | Responsive navigation, active route highlighting | `TEST-UI-NAV-001` to `005` |
| **8** | Shared AuthLayout | M3 (Phase 4) | R3 Auth Views | Tier 1, 2 | Login, Register, Forgot, Reset routes | Switching forms, responsive card alignment | Single layout wraps all 4 auth flows cleanly | `TEST-AUTH-LAY-001` to `006` |
| **9** | Password Visibility & Validation | M3 (Phase 4) | R3 PasswordInput | Tier 1, 2 | Toggle button, strength validation | Short passwords, mismatch passwords, toggles | Input type flips `password` $\leftrightarrow$ `text` | `TEST-AUTH-PWD-001` to `006` |
| **10** | Centralized API Client Envelope | M3 (Phase 5) | R3 `apiClient` / `ApiEnvelope` | Tier 1, 2 | `{ success, message, data }` unwrap | HTTP 200 with `success: false`, HTTP 500 | Resolves `data`, throws normalized `ApiError` | `TEST-API-ENV-001` to `008` |
| **11** | AuthContext Type Hardening | M3 (Phase 5) | R3 `AuthContext.tsx` | Tier 1, 2 | State `{ user, token, role }`, `hasRole` | 401 response on bootstrap, role verification | State strictly typed; no `any` casts in context | `TEST-AUTH-CTX-001` to `007` |
| **12** | Dashboard Redesign & Real Telemetry | M4 (Phase 6) | R4 Dashboard Route | Tier 1, 2 | User stats: `totalLabTime`, `totalSpent` | Zero time/spend, large time/spend, active lab | Accurate rendering of real telemetry numbers | `TEST-DASH-TEL-001` to `005` |
| **13** | Smart Dashboard Polling | M4 (Phase 6) | R4 Polling Hook | Tier 1, 2 | Visibility API, tab blur/focus, backoff | Tab hidden for 10m, rapid tab toggling | Suspends polling on hidden, resumes on visible | `TEST-DASH-POL-001` to `005` |
| **14** | Course Catalog & Filtering | M4 (Phase 7) | `GET /api/courses` | Tier 1, 2 | Difficulty filters, search queries | Empty query, non-matching search, special chars | Filtered course array matches query criteria | `TEST-CRS-CAT-001` to `007` |
| **15** | Module Detail View | M4 (Phase 7) | `GET /api/modules/:id` | Tier 1, 2 | Task list, order index, difficulty | Non-existent module ID, empty task list | Returns 404 for invalid ID, ordered tasks | `TEST-CRS-MOD-001` to `006` |
| **16** | Task Description Alignment | M4 (Phase 8) | `GET /api/tasks/:id` | Tier 1, 2 | Markdown rendering, body description | Null description, raw HTML, code blocks | Renders `task.description` / `body_markdown` | `TEST-CRS-TSK-001` to `006` |
| **17** | Canonical Task Lab Provisioning | M4 (Phase 8) | `POST /api/tasks/:id/lab-sessions` | Tier 1, 2 | Provision request, active session check | Concurrent start, starting when session active | Returns 201 with `LabSessionView` in camelCase | `TEST-LAB-PRV-001` to `008` |
| **18** | Flag Submission Flow | M4 (Phase 8) | `POST /api/tasks/:id/submit-flag` | Tier 1, 2 | Correct flag, wrong flag, rate limit | Leading/trailing spaces, duplicate submission | Returns 200 with `pointsEarned` or rejection | `TEST-LAB-FLG-001` to `008` |
| **19** | Interactive Terminal WebSocket | M4 (Phase 9) | `/ws/terminal` | Tier 1, 2 | WebSocket connect, PTY stream, ping/pong | Broken pipe, missing token, protocol error | Valid PTY streaming, exponential reconnect | `TEST-WS-TRM-001` to `007` |
| **20** | Session Timer & Confirm Dialog | M4 (Phase 9) | `POST /api/lab-sessions/:id/terminate` | Tier 1, 2 | Countdown timer, modal confirmation | Canceling confirmation vs confirming | Timer triggers warning; terminate yields 200 | `TEST-LAB-TMR-001` to `006` |
| **21** | `PUT /api/users/profile` Endpoint | M4 (Phase 10) | `PUT /api/users/profile` | Tier 1, 2 | Profile fields (`firstName`, `lastName`) | Empty names, long names, unicode characters | Returns 200 with updated user model | `TEST-USR-PRF-001` to `005` |
| **22** | Leaderboard Standing Matrix | M4 (Phase 10) | `GET /api/leaderboard`, `/me` | Tier 1, 2 | Ranked users, score ties, personal rank | User with 0 points, top 100 pagination | Returns sorted list by points descending | `TEST-LDR-BRD-001` to `006` |
| **23** | Server-Side RBAC Enforcement | M5 (Phase 11) | `RequireRole` Middleware | Tier 1, 2 | Role access: STUDENT vs INSTRUCTOR vs ADMIN | Student hitting admin endpoint $\to$ 403 | Rejects unauthorized roles with 403 Forbidden | `TEST-SEC-RBC-001` to `006` |
| **24** | Instructor Ownership Bug Fix | M5 (Phase 11) | Session Ownership Guard | Tier 1, 2 | Instructor terminating student's session | Instructor ID $\ne$ session Owner ID | Returns 403/404; cannot hijack others' labs | `TEST-SEC-OWN-001` to `005` |
| **25** | Admin Metrics & Honest Dashboard | M5 (Phase 12) | `GET /api/admin/metrics` | Tier 1, 2 | Platform metrics, active count | Zero sessions, unprivileged access | Real stats or honest 503/404 unavailable state | `TEST-ADM-MTR-001` to `005` |
| **26** | JSON camelCase Standardization | M5 (Phase 13) | Global Response DTOs | Tier 1, 2 | Field serialization: `userId`, `taskId`, etc. | Snake case regression (`user_id`, `task_id`) | Strict camelCase JSON matching TS interfaces | `TEST-API-CAS-001` to `006` |
| **27** | UI State Standardization | M5 (Phase 14) | Skeleton, ErrorState, EmptyState | Tier 1, 2 | Loading skeleton, error retry, zero data | Fast network, failing network, empty list | Shows skeleton on load, error banner on fail | `TEST-UI-STA-001` to `006` |
| **28** | Accessibility & Code Splitting | M5 (Phase 15) | WCAG AA & React.lazy | Tier 1, 4 | Keyboard focus, ARIA tags, bundle size | Tab index navigation, screen reader labels | 100% accessible primitives, lazy chunks | `TEST-ACC-A11Y-001` to `005` |
| **29** | WebSocket Security Hardening | M6 (Phase 16) | `/ws/terminal` Security | Tier 1, 2 | Origin validation, token transport | Token in query string, spoofed origin header | Rejects query tokens & illegal origins | `TEST-SEC-WSS-001` to `006` |
| **30** | Mock Shell & Error Sanitization | M6 (Phase 16) | Prod Mode Shell Guard | Tier 1, 2 | Production mode mock shell execution | Requesting mock shell when `NODE_ENV=prod` | Rejects mock shell, sanitizes stack traces | `TEST-SEC-SHL-001` to `005` |
| **31** | Container Hardening | M6 (Phase 17) | Docker Sandbox Options | Tier 1, 4 | Capabilities, privilege escalation, memory | Container trying `sudo` or memory exhaustion | Non-root exec, read-only root, memory cap | `TEST-SEC-CNT-001` to `005` |
| **32** | Session Deadlock Fix & Cleanup | M6 (Phase 17) | `auto_termination_pg.go` | Tier 1, 2 | `expires_at = NULL`, abandoned sessions | Session expired 10 minutes ago | Auto-sweeper terminates expired containers | `TEST-LAB-SWP-001` to `005` |
| **33** | Unit & Integration Test Coverage | M7 (Phase 18) | Test Suites | Tier 1, 4 | Frontend Vitest, Backend Go test suites | Edge assertions, complete branch execution | 100% test pass rate across both runtimes | `TEST-COV-INT-001` to `005` |
| **34** | Final Audit & Documentation | M7 (Phase 18) | `AUDIT.md`, `FINAL_REPORT.md` | Tier 1, 4 | All 7 verification gates, documentation | Stale docs, unresolved audit items | Zero-warning verification gates and report | `TEST-AUD-DOC-001` to `005` |

---

## 4. Test Architecture & Runner Specification

### 4.1 Dual-Engine Architecture
The XploitVerse E2E test infrastructure utilizes a dual-engine architecture:
1. **Frontend Contract & E2E Engine (`client/src/test/e2e/`)**:
   - **Framework**: Vitest + JSDOM + `@testing-library/react`.
   - **Network Simulation**: Isolated Axios mock adapter and typed interceptor harness (`apiClient` envelope validation).
   - **Target**: Validates client-side routing, AuthContext state machines, form validation, error banners, and full REST contract compatibility.
2. **Backend Contract & Integration Engine (`backend/internal/...`)**:
   - **Framework**: Standard Go `testing` + `net/http/httptest` + Gin test engine.
   - **Database Harness**: Isolated PostgreSQL transactions on port 5433 or in-memory mock pools.
   - **Target**: Validates route handler HTTP status codes, JSON serialization contracts, JWT verification, and middleware filters.

```
                    ┌───────────────────────────────────────────────┐
                    │          XploitVerse Test Runner              │
                    └───────────────────────┬───────────────────────┘
                                            │
                ┌───────────────────────────┴───────────────────────────┐
                ▼                                                       ▼
  ┌───────────────────────────┐                           ┌───────────────────────────┐
  │  Client E2E Test Engine   │                           │  Backend Go Test Engine   │
  │     (Vitest + JSDOM)      │                           │   (Go testing / httptest) │
  ├───────────────────────────┤                           ├───────────────────────────┤
  │ - auth_contracts.spec.ts  │                           │ - jwt_test.go             │
  │ - courses_contracts.spec  │                           │ - api_contracts_test.go   │
  │ - labs_contracts.spec.ts  │                           │ - ratelimit_test.go       │
  │ - boundary_corner.spec.ts │                           │                           │
  └─────────────┬─────────────┘                           └─────────────┬─────────────┘
                ▼                                                       ▼
  ┌───────────────────────────┐                           ┌───────────────────────────┐
  │ Axios Envelope & Fixtures │                           │ PostgreSQL (Port 5433)    │
  │ Web Crypto & LocalStorage │                           │ Gin Router & Gorilla WS   │
  └───────────────────────────┘                           └───────────────────────────┘
```

### 4.2 Test File Structure
```
/client/src/test/
├── setup.ts                           # Global JSDOM environment, localStorage mock
└── e2e/
    ├── auth_contracts.spec.ts         # Tier 1: Features 8, 9, 10, 11 (>=5 tests per feature)
    ├── courses_contracts.spec.ts      # Tier 1: Features 14, 15, 16 (>=5 tests per feature)
    ├── labs_contracts.spec.ts         # Tier 1: Features 17, 18, 19, 20 (>=5 tests per feature)
    └── tier2_boundary_corner.spec.ts  # Tier 2: Category-Partition BVA, Pairwise, Adversarial
/backend/internal/
├── utils/
│   └── jwt_test.go                    # Go backend JWT token creation, expiry & tampering
├── middleware/
│   └── middleware_test.go             # Go backend rate limiting & security headers
└── pgapi/
    └── api_contracts_test.go          # Go backend HTTP REST envelope & response formats
```

### 4.3 Test Runner Specification & Execution Commands
To execute the comprehensive test suite across both engines:

1. **Client Comprehensive Test Suite**:
   ```bash
   cd client && npm run test
   ```
   *Execution Mode*: Runs Vitest with all unit, integration, and E2E contract test files.

2. **Client Targeted E2E Suite**:
   ```bash
   cd client && npx vitest run src/test/e2e/
   ```

3. **Backend Go Verification Suite**:
   ```bash
   cd backend && go test -v ./...
   ```

4. **CI/CD Quality Gate Pipeline**:
   ```bash
   # Gate 1: Frontend Linting
   cd client && npm run lint
   # Gate 2: Frontend Type Check
   cd client && npm run typecheck
   # Gate 3: Frontend Test Suite
   cd client && npm run test
   # Gate 4: Frontend Production Build
   cd client && npm run build
   # Gate 5: Backend Vet
   cd backend && go vet ./...
   # Gate 6: Backend Test Suite
   cd backend && go test ./...
   # Gate 7: Backend Build
   cd backend && go build ./...
   ```

---

## 5. Implementation Verification & Defect Policy

1. **Zero Tolerance for Contract Divergence**: If the backend returns `user_id` instead of `userId`, or if the frontend fails to unpack `{ success, message, data }`, tests will fail.
2. **Defect Escalation**: Test writers never alter production source code. When a contract discrepancy is detected during test execution, it is recorded in the agent handoff report with exact reproduction payloads and HTTP logs for resolution by the feature implementer.
