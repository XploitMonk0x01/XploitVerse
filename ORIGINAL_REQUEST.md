# Original User Request

## Initial Request — 2026-09-17T01:49:33Z

Execute a comprehensive, 18-phase full-stack redesign, stabilization, and security audit of the XploitVerse cyber range platform across its Go backend and React frontend.

Working directory: /mnt/sda3/Users/smwlc/proj/Test/xploitverse
Integrity mode: development

## Execution Rules
- Work strictly **phase by phase**.
- Complete all tasks in the current phase before moving to the next.
- Do not redesign multiple unrelated areas simultaneously.
- Preserve working functionality unless intentionally replacing it.
- Fix problems at their source instead of loosening types or hiding errors.
- Keep frontend ↔ backend contracts synchronized.
- Remove fake, placeholder, and hardcoded application data.
- Maintain one consistent design system across the application.
- Run verification gates at the end of every phase.
- Document important architectural decisions.
- Do not proceed if the current phase leaves the project broken.

## Verification Resources & Gates
Execute at each phase gate and prior to final sign-off:
- `cd client && npm run lint`
- `cd client && npm run typecheck`
- `cd client && npm run test`
- `cd client && npm run build`
- `cd backend && go vet ./...`
- `cd backend && go test ./...`
- `cd backend && go build ./...`

## Requirements

### R1. Baseline Audit & Stabilization (Phase 1)
Inspect Git status and branch state, verify repository structure, verify PostgreSQL as authoritative DB, execute frontend and backend baseline checks, record all failures (`as any`, hardcoded data, undefined Tailwind classes, duplicate utils, unused deps), map API routes, authentication/RBAC, lab and WebSocket lifecycles, and document findings in `docs/redesign/AUDIT.md`.

### R2. Design System Foundation & Global Layout (Phases 2-3)
Refactor Tailwind tokens without overriding defaults unnecessarily, preserve visual identity while consolidating color/typography/spacing/shadow/transition/focus tokens. Build and standardize reusable UI primitives (`Button`, `Input`, `PasswordInput`, `Card`, `Badge`, `Table`, `Modal`, `ConfirmDialog`, `Tabs`, `Skeleton`, `PageHeader`, `Breadcrumbs`, `Alert`, `Select`, `Checkbox`, `Textarea`), migrate legacy components (`TacticalBadge`, `SpotlightCard`), resolve CRT scanline overlay z-index conflicts, and unify `Navbar`, `Footer`, and application `Layout`.

### R3. Authentication & API Client Architecture (Phases 4-5)
Unify Login, Register, Forgot Password, and Reset Password under a shared `AuthLayout`. Provide password visibility toggles, clear validation, and honest error messages. Centralize typed API response handling (`{ success, data, message }`), normalize errors and auth headers, eliminate redundant casts, tighten user typing in AuthContext, and align frontend token strategy with backend cookies/headers.

### R4. Core Application Surfaces & Real Data Integration (Phases 6-10)
Redesign Dashboard, Courses, Modules, Tasks, Lab Workspace, Profile, and Leaderboard using shared primitives. Eliminate all fake/hardcoded data (ports, pricing, shell commands, fake stats, isolation claims, email verification badges). Wire module task descriptions correctly (`task.description`), establish task-based lab sessions (`POST /tasks/:id/lab-sessions`) as the canonical flow, implement `PUT /users/profile`, fix `/leaderboard/me` contract parsing, and harden the interactive terminal WebSocket lifecycle with exponential backoff and error UX.

### R5. Admin Dashboard, RBAC & API Standardization (Phases 11-15)
Enforce server-side `requireRole` middleware and clean up role-based routing. Provide genuine read-only administrative metrics endpoints or honest unavailable states. Standardize camelCase JSON responses and align `LabSessionView`. Audit all frontend service methods against real backend routes. Implement consistent loading, skeleton, error, and empty states. Audit and enforce WCAG accessibility (contrast, keyboard navigation, ARIA semantics, reduced-motion preferences) and optimize bundle size and motion performance.

### R6. Security Hardening & Lab Reliability (Phases 16-17)
Harden WebSocket endpoint (validate origins, remove query token exposure, implement ping/pong and idle timeouts). Restrict mock session shell execution to development mode only. Secure container execution (`no-new-privileges`, capability drops, CPU/memory limits, tmpfs). Strictly enforce user ownership across all lab session endpoints and sanitize production error responses. Fix session state transitions to prevent hangs in `initializing`, ensure proper `expires_at` cleanup, and calculate accurate lab usage metrics.

### R7. Testing, Audit Completion & Documentation (Phase 18)
Implement frontend unit/integration tests for UI primitives, layouts, workflows, and state transitions. Add backend tests for auth middleware, RBAC enforcement, session ownership, and lifecycle management. Run final zero-warning verification gates across both client and backend, and produce finalized documentation in `docs/redesign/AUDIT.md` and `docs/redesign/FINAL_REPORT.md`.

## Acceptance Criteria

### Verification Gates
- [ ] `cd client && npm run lint` passes with zero errors and warnings.
- [ ] `cd client && npm run typecheck` passes with zero TypeScript errors.
- [ ] `cd client && npm run test` passes all tests.
- [ ] `cd client && npm run build` produces a production build without errors.
- [ ] `cd backend && go vet ./...` reports zero issues.
- [ ] `cd backend && go test ./...` passes all backend test suites.
- [ ] `cd backend && go build ./...` compiles cleanly.

### Functional & Architectural Criteria
- [ ] A single, cohesive visual design system is applied across all routes using shared primitives.
- [ ] Zero fake, placeholder, or hardcoded stats, pricing, or system states remain in the application.
- [ ] Frontend and backend API contracts are fully synchronized with no dead endpoints or broken shapes.
- [ ] Task-based lab provisioning and terminal WebSocket connectivity operate reliably with proper reconnection handling and lifecycle cleanup.
- [ ] Server-side RBAC is active and enforced on all privileged routes.
- [ ] Docker security boundaries (non-root privileges, resource limits) are verified.
- [ ] Both `docs/redesign/AUDIT.md` and `docs/redesign/FINAL_REPORT.md` are fully drafted, detailing baseline findings, architectural decisions, and resolution status.
