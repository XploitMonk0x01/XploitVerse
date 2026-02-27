# 🛡️ XploitVerse — Cybersecurity Metaverse

> A cloud-native cybersecurity training platform where Red/Blue teams practice on real, isolated AWS environments.

---

## 🎯 Core Value Proposition

| Feature | Details |
|---|---|
| **Pay-as-you-go Labs** | ~$0.50/hour — only pay for what you use |
| **Isolated Environments** | Each user gets their own EC2 instance |
| **68% Cost Reduction** | vs. traditional fixed servers |
| **Real-World Practice** | Actual AWS infrastructure, not simulations |

---

## 🏗️ Architecture Overview

```
User Request → Go (Gin) API → MongoDB → AWS EC2 (Phase 2) → Terminate
```

### Stack

| Layer | Technology |
|---|---|
| **Backend** | Go 1.25 + Gin framework |
| **Auth** | JWT (`golang-jwt/jwt/v5`) + HTTP-only cookies |
| **Database** | MongoDB (`mongo-driver/v2`) |
| **Real-time** | WebSockets (`gorilla/websocket`) |
| **Frontend** | React + Vite (`client/`) |
| **Legacy API** | Node.js + Express (`server/`) |

---

## 📁 Project Structure

```
xploitverse/
├── backend/                    # ✅ Go API Server (primary)
│   ├── cmd/
│   │   ├── server/main.go      # Entry point
│   │   └── seed/main.go        # Database seeder
│   ├── internal/
│   │   ├── config/             # Env & app config
│   │   ├── database/           # MongoDB connection
│   │   ├── handlers/           # HTTP handlers (auth, labs, users…)
│   │   ├── middleware/         # Auth, rate-limit, error middleware
│   │   ├── models/             # MongoDB document models
│   │   ├── routes/             # Route registration (routes.go)
│   │   ├── services/           # Business logic (email, AI…)
│   │   ├── utils/              # JWT helpers, token utils
│   │   └── ws/                 # WebSocket hub
│   ├── go.mod
│   └── .env.example
├── client/                     # React + Vite Frontend
└── server/                     # Express + Node Legacy Backend
```

---

## 🚀 Running the Go Server

### Prerequisites

- [Go 1.21+](https://go.dev/dl/)
- [MongoDB](https://www.mongodb.com/try/download/community) (local or Atlas)
- `git`

### 1. Clone & Configure

```bash
git clone <repo-url>
cd xploitverse/backend

# Copy environment file
cp .env.example .env
# Open .env and fill in your values (see Environment Variables below)
```

### 2. Install Dependencies

```bash
go mod tidy
```

### 3. Run the Server

```bash
# Development (from backend/ directory)
go run ./cmd/server

# Or build & run the binary
go build -o xploitverse-server ./cmd/server
./xploitverse-server
```

> The server starts on **`http://localhost:5000`** by default (configurable via `PORT`).

### 4. (Optional) Seed the Database

```bash
go run ./cmd/seed
```

### 5. Run the Frontend

```bash
cd ../client
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

---

## ⚙️ Environment Variables

Copy `backend/.env.example` → `backend/.env` and set:

```env
# Server
PORT=5000
NODE_ENV=development          # "development" enables debug helpers

# MongoDB
MONGODB_URI=mongodb://localhost:27017/xploitverse

# JWT
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7       # days

# CORS
CLIENT_URL=http://localhost:5173

# SMTP (optional — password reset emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=XploitVerse

# AWS (Phase 2+)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1

# AI APIs (Phase 2+)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

---

## 🔐 Middleware & Authentication Status

### How Auth Works

The `VerifyToken` middleware (in `internal/middleware/auth.go`) protects routes by:

1. Extracting JWT from `Authorization: Bearer <token>` header **or** `jwt` HTTP-only cookie
2. Verifying signature & expiry using `JWT_SECRET`
3. Confirming the user still exists and is active in MongoDB
4. Checking if the password was changed after the token was issued (forces re-login)
5. Attaching `user` and `userId` to the Gin context for downstream handlers

### Checking Authentication Status

**1. Verify your token is valid** — call the `GET /api/auth/me` endpoint:

```bash
# With Bearer token
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>"

# With cookie (browser / httpie)
curl -X GET http://localhost:5000/api/auth/me \
  --cookie "jwt=<YOUR_JWT_TOKEN>"
```

**Expected responses:**

| Status | Body | Meaning |
|---|---|---|
| `200 OK` | `{ "success": true, "data": { "user": {...} } }` | ✅ Authenticated |
| `401` | `Access denied. No token provided.` | No token sent |
| `401` | `Token expired. Please log in again.` | JWT expired |
| `401` | `Invalid token.` | Bad signature / malformed |
| `401` | `User no longer exists.` | User deleted from DB |
| `401` | `Password recently changed. Please log in again.` | Token issued before password change |
| `401` | `User account has been deactivated.` | Account suspended |

**2. Test rate limiting** — auth endpoints are throttled to **10 requests / 15 minutes** per IP via `NewRateLimiter` middleware.

### Middleware Stack

| Middleware | File | Purpose |
|---|---|---|
| `VerifyToken` | `middleware/auth.go` | JWT validation + user lookup |
| `CheckRole(roles...)` | `middleware/auth.go` | RBAC — validates user role |
| `IsAdmin()` | `middleware/auth.go` | Shortcut: admin only |
| `IsInstructor()` | `middleware/auth.go` | Shortcut: admin **or** instructor |
| `OptionalAuth` | `middleware/auth.go` | Attaches user if token exists, never blocks |
| `NewRateLimiter` | `middleware/ratelimit.go` | IP-based request throttling |
| `AbortWithError` | `middleware/error.go` | Standardised JSON error response |

---

## 📡 API Reference

### Auth Routes (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | Public | Register a new user |
| `POST` | `/login` | Public | Login + receive JWT |
| `POST` | `/logout` | Public | Clear JWT cookie |
| `GET` | `/me` | 🔒 Required | Get current user profile |
| `PUT` | `/update-password` | 🔒 Required | Change password |
| `POST` | `/refresh-token` | 🔒 Required | Refresh JWT |
| `POST` | `/forgot-password` | Public | Trigger password reset email |
| `POST` | `/reset-password/:token` | Public | Reset password with token |

### User Routes (`/api/users`) — 🔒 Auth Required

| Method | Path | Role | Description |
|---|---|---|---|
| `PUT` | `/profile` | Any | Update own profile |
| `GET` | `/stats` | Instructor+ | View aggregate user stats |
| `GET` | `/` | Admin | List all users |
| `GET` | `/:id` | Admin | Get user by ID |
| `PUT` | `/:id/role` | Admin | Change user role |
| `PUT` | `/:id/deactivate` | Admin | Deactivate user |
| `PUT` | `/:id/reactivate` | Admin | Reactivate user |

### Lab Routes (`/api/labs`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/` | Public | List all labs |
| `GET` | `/:id` | Public | Get lab details |
| `POST` | `/start` | 🔒 Required | Start a lab session |
| `POST` | `/stop` | 🔒 Required | Stop active session |
| `GET` | `/active-session` | 🔒 Required | Get current session |
| `GET` | `/history` | 🔒 Required | Past sessions |

### User Roles

| Role | Capabilities |
|---|---|
| `student` | Launch labs, view own sessions |
| `instructor` | All student access + monitor users, view stats |
| `admin` | Full access including user management |

---

## 🏅 Backend Best Practices (from Awesome Go)

### ✅ Project Structure
- Code is split into `handlers/`, `middleware/`, `models/`, `services/`, and `utils/` — keeping separation of concerns
- `cmd/server/main.go` is the entry point; all business logic is in `internal/`

### ✅ Authentication & Security
- JWT secrets are loaded from env vars — **never hardcoded**
- Passwords are hashed using `bcrypt` (`golang.org/x/crypto`)
- Password reset tokens are stored as **SHA-256 hashes** in MongoDB (raw token never persisted)
- HTTP-only cookies prevent XSS token theft
- Rate limiting on all auth endpoints prevents brute-force attacks
- `changedPasswordAfter` invalidates old JWTs on password change

### ✅ Error Handling
- Centralized `AbortWithError` helper returns consistent `{ success, message }` JSON
- Sensitive info (e.g., email enumeration) is hidden — forgot-password always returns `200`

### ✅ HTTP Design
- No verbs in URLs — HTTP methods convey the action (`POST /start` not `/startLab`)
- Correct HTTP status codes (`201` for creation, `401` for auth, `403` for forbidden, `404` for not found)
- Request body validation via Gin's `binding` tags before any DB access

### ✅ Middleware
- Cross-cutting concerns (auth, rate-limiting, logging) handled via Gin middleware chains
- `OptionalAuth` for routes that work with or without authentication

### ✅ Configuration
- All secrets and URLs are environment-variable driven via `.env` + `godotenv`
- `NODE_ENV=development` enables dev-only response fields (e.g., password reset tokens in body)

### ✅ Database
- MongoDB indexed queries via `bson.M` filter objects
- Connection managed in `internal/database/` — single reusable `*mongo.Database` instance

### ✅ Testing Checklist
- Unit test handlers with mock DB
- Integration tests against a test MongoDB instance
- Test rate limiter edge cases
- Validate JWT expiry and role-based access for every protected route

---

## 📅 Roadmap

| Phase | Status | Scope |
|---|---|---|
| **Phase 1** | ✅ Complete | Auth, Database, Role-Based Access, Frontend Shell |
| **Phase 2** | 🔜 Planned | AWS EC2 Integration — Auto Scaling, Lab Provisioning |
| **Phase 3** | 🔜 Planned | AI Integration — Claude/OpenAI for hints & analysis |
| **Phase 4** | 🔜 Planned | Team Battles, Leaderboards, Certifications |

---

## 📝 License

MIT License — See [LICENSE](LICENSE) for details.
