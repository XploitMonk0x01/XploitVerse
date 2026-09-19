# XploitVerse Project Setup Stats

## Overview
XploitVerse is currently running on the `go_backend` branch. The project is split into a Go-based backend and a React (Vite) frontend. There also appears to be a separate Node.js/Express backend implementation maintained in a different branch (`express_server`), which left some residual files (like the `server/` directory).

## Tech Stack & Services

### Backend (`/backend`)
- **Language/Framework**: Go 1.25.0 with Gin web framework (`github.com/gin-gonic/gin`)
- **Database**: PostgreSQL (using `pgx` driver)
- **Cache/Services**: Redis
- **Authentication**: JWT (`golang-jwt`)
- **WebSockets**: Gorilla WebSocket
- **Port**: Default `5000`

### Frontend (`/client`)
- **Framework**: React 18 with Vite 5
- **Routing**: React Router DOM v6
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Real-time**: Socket.io-client
- **Port**: Default `5173`

### Infrastructure (`docker-compose.yml`)
Local development infrastructure is managed via Docker Compose, which spins up:
1. **PostgreSQL 16** (`xv-postgres` on port `5432`)
2. **Redis 7** (`xv-redis` on port `6379`)

*Note: The `xploitverse-labs` network for lab containers is orchestrated dynamically by the Go backend at startup.*

## How to Run

### 1. Start Infrastructure
Navigate to the root directory and start Postgres and Redis:
```bash
docker compose up -d
```

### 2. Start Backend
Navigate to the `backend` directory, set up your `.env`, and run the Go server:
```bash
cd backend
cp .env.example .env
go mod download
go run cmd/server/main.go
```

### 3. Start Frontend
Navigate to the `client` directory, install dependencies, and run the Vite dev server:
```bash
cd client
npm install
npm run dev
```

## Legacy/Alternative Stack Note
A `server/` directory exists with an `.env` file configured for MongoDB. This is related to the Express implementation mentioned in the README. For the current active setup, use the Go `backend/` directory instead.
