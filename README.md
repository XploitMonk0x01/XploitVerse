# XploitVerse

XploitVerse is an advanced, cybersecurity-themed educational platform. It provides an immersive, real-world terminal and lab-based environment where students can master cybersecurity techniques through practical application.

## Key Features

- **Interactive Training Labs**: On-demand Dockerized lab environments that isolate interactive learning exercises.
- **Cybersecurity Terminal Interface**: A premium "green-on-black" glassmorphism design system inspired by professional hacking terminals.
- **Real-Time Execution**: WebSockets provide instantaneous terminal output and interaction directly in the browser.
- **Role-Based Access Control**: Differentiated dashboards and capabilities for Students, Instructors, and Administrators.

---

## Tech Stack

### Backend
- **Language**: Go 1.25+
- **Framework**: Gin (HTTP Web Framework)
- **Database**: MongoDB (via official Go driver)
- **Caching & Pub/Sub**: Redis
- **Real-Time Communication**: Gorilla WebSockets
- **Containerization**: Docker (dynamic container provisioning for labs)
- **Authentication**: JWT (JSON Web Tokens)

### Frontend
- **Framework**: React 18.2
- **Build Tool**: Vite 5
- **Routing**: React Router DOM 6
- **Styling**: TailwindCSS 3.3 (Custom XploitVerse Dark Theme)
- **State Management**: React Context (`AuthContext`)
- **HTTP/API Client**: Axios
- **Real-Time UI**: `socket.io-client`

---

## Prerequisites

Ensure you have the following installed before starting local development:
- **Go 1.25** or higher
- **Node.js 18** or higher (with `npm`)
- **Docker** and **Docker Compose**
- Git

---

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/smwlc/xploitverse.git
cd xploitverse
```

### 2. Start Core Infrastructure (Databases)
The project ships with a `docker-compose.yml` that provisions MongoDB and Redis.
```bash
docker compose up -d
```
You can verify the containers are healthy with `docker ps`.

### 3. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
go mod download
```

Copy the example environment file and configure it:
```bash
cp .env.example .env
```

Start the Go server:
```bash
# Depending on your main.go location, usually:
go run cmd/api/main.go
# Alternatively, if you have a pre-built binary:
# ./server.exe
```
The backend API will run on `http://localhost:5000`.

### 4. Frontend Setup
Open a new terminal session, navigate to the frontend directory, and install dependencies:
```bash
cd client
npm install
```

Start the Vite development server:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser to view the XploitVerse platform.

---

## Architecture Overview

### Directory Structure
```
xploitverse/
├── backend/                  # Go Backend Application
│   ├── cmd/                  # Entry points (main.go)
│   ├── internal/             # Private application code (Handlers, Services, Repos)
│   ├── ws/                   # WebSocket logic and connection managers
│   ├── .env.example          # Template environment config
│   ├── go.mod                # Go dependencies
│   └── server.exe            # Compiled Windows binary (optional usage)
├── client/                   # React Frontend Application
│   ├── src/                  
│   │   ├── components/       # Reusable UI (ui/, layout/, workspace/)
│   │   ├── context/          # React Context (AuthContext)
│   │   ├── pages/            # View components matching routes
│   │   ├── services/         # Axios API clients
│   │   ├── App.jsx           # Root layout and Router
│   │   ├── main.jsx          # React DOM mounting
│   │   └── index.css         # Tailwind directives and custom UI classes
│   ├── tailwind.config.js    # XploitVerse custom dark theme palette
│   └── vite.config.js        # Vite bundler config
└── docker-compose.yml        # Infrastructure (Mongo, Redis) definition
```

### Request Lifecycle & Data Flow

1. **Authentication:** User logs in via the React frontend. Axios makes a `POST` request to `/api/auth/login`.
2. **Backend Auth:** The Gin Go router forwards the request to the auth handler. The user is verified against MongoDB, and a JWT is issued (often via HTTP-only cookie).
3. **Frontend State:** `AuthContext` hydrates the user session and selectively renders private routes like `/dashboard` based on RBAC (Role-Based Access Control).
4. **Lab Initialization:** When a user launches a lab, a request is sent to the Go backend, which invokes Docker via the host daemon to spin up a new isolated container connected to the internal `xploitverse-labs` network.
5. **Real-Time I/O:** The frontend initiates a WebSocket connection (`socket.io-client`). The Go backend bridges this WebSocket directly to the Docker container's TTY over the `xploitverse-labs` network, providing instantaneous feedback.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
| -------- | ----------- | ------- |
| `PORT` | API Server Port | `5000` |
| `NODE_ENV` | Environment Type | `development` / `production` |
| `MONGODB_URI` | Mongo Connection String | `mongodb://localhost:27017/xploitverse` |
| `REDIS_URL` | Redis Connection String | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for signing tokens | `super-secret-key` |
| `JWT_EXPIRES_IN` | Token Lifespan | `7d` |
| `CLIENT_URL` | Frontend URL for CORS | `http://localhost:5173` |

*(Note: Additional AWS, LLM API, and SMTP variables can be set for Phase 2+ features).*

---

## Available Scripts

### Frontend (`client/package.json`)
| Command | Description |
| ------- | ----------- |
| `npm run dev` | Starts Vite dev server with Hot Module Replacement |
| `npm run build` | Compiles and optimizes assets for production |
| `npm run preview` | Locally serves the production build |
| `npm run lint` | Runs ESLint against project files |

### Backend
| Command | Description |
| ------- | ----------- |
| `go run main.go` | Boots the development server |
| `go build -o server` | Compiles a production binary |
| `go test ./...` | Runs the test suite across all internal packages |

---

## UI Design Guidelines (Frontend)

XploitVerse uses a stringent **Cybersecurity Terminal** aesthetic. When contributing to the frontend, abide by the following design system rules:

1. **Colors**: Native components use `bg-gray-950` or `bg-gray-900` for backgrounds. Interactive elements use `green-500` accents. Never use generic Tailwind palettes without consulting `tailwind.config.js`.
2. **Components**: Use global component classes defined in `index.css`:
   - `.card-glass`: Background-blurred layered panels for elevated UI.
   - `.btn-primary`, `.btn-danger`, `.btn-ghost`: Standardized button interactions.
   - `.input-cyber`: Branded inputs that glow green on focus.
3. **Typography**: Always rely on the `Inter` stack for layout, and the `JetBrains Mono` or `Fira Code` stack for terminal outputs and raw data visualization.

---

## Troubleshooting

### `Connection refused` (MongoDB or Redis)
- **Cause**: The docker containers are either not running or failed to expose ports.
- **Fix**: Run `docker compose up -d` in the root directory. Use `docker logs xv-mongo` to diagnose boot failures.

### Frontend `CORS Error` on Login
- **Cause**: The backend's `CLIENT_URL` doesn't match the Vite address.
- **Fix**: Open `backend/.env` and ensure `CLIENT_URL=http://localhost:5173`. Restart the Go server.

### State Lost on Refresh
- **Cause**: The browser isn't sending the JWT cookie.
- **Fix**: Ensure your Axios configurations uniformly set `withCredentials: true`.

### WebSocket Disconnects
- **Cause**: Container networking gap, or the Gin router closed the WS handshake due to invalid origins.
- **Fix**: Ensure the Gorilla WebSocket `CheckOrigin` configuration permits traffic from `http://localhost:5173`.
