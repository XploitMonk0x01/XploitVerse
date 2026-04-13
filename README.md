# XploitVerse (Go Backend Branch)

This branch uses the Go + Gin backend implementation.

## Branch Info

- Current branch: go_backend
- Go API: backend/
- Frontend: client/
- Express implementation is maintained separately in branch: express_server

## Tech Stack

### Backend (Go)

- Go 1.25+
- Gin
- PostgreSQL (primary durable database)
- Redis (for caching/services)
- JWT authentication
- Gorilla WebSocket
- Docker-based lab lifecycle support
- AI mentor endpoints disabled

### Frontend

- React 18
- Vite 5
- React Router
- Axios
- Tailwind CSS

## Prerequisites

- Go 1.25+
- Node.js 18+
- npm 9+
- Docker + Docker Compose
- Git

## Quick Start

1. Clone and enter project

```bash
git clone https://github.com/XploitMonk0x01/XploitVerse.git
cd XploitVerse
```

2. Start local infrastructure

```bash
docker compose up -d
```

3. Configure and run Go backend

```bash
cd backend
cp .env.example .env
go mod download
go run cmd/server/main.go
```

The API runs on http://localhost:5000 by default.

4. Run frontend

```bash
cd ../client
npm install
npm run dev
```

Frontend runs on http://localhost:5173.

## Main API Areas (Go)

- /api/auth
- /api/users
- /api/labs
- /api/labs/:id
- /api/lab-sessions
- /api/lab-sessions/active
- /api/lab-sessions/:id/terminate
- /api/rooms (new.md compatibility)
- /api/tasks/:task_id/lab-sessions (new.md compatibility)
- /api/tasks/:task_id/submit-flag (new.md compatibility)
- /api/courses
- /api/modules
- /api/tasks
- /api/flags
- /api/leaderboard
- /ws/terminal?sessionId=<id>&token=<jwt>

## Environment Notes

Set these at minimum in backend/.env for local development:

- PORT
- NODE_ENV
- POSTGRES_URI
- REDIS_URL
- JWT_SECRET
- CLIENT_URL

AI-related environment variables are no longer required.

## AWS Terraform

Terraform for the current EC2 + PostgreSQL + Redis deployment shape lives in [infra/terraform/README.md](/C:/Users/smwlc/proj/Test/xploitverse/infra/terraform/README.md).

## Scripts and Commands

### Backend (backend)

- go run cmd/server/main.go
- go build -o server ./cmd/server
- go test ./...

### Frontend (client)

- npm run dev
- npm run build
- npm run preview

## Branch Switching

To switch to the Express backend branch:

```bash
git checkout express_server
```
