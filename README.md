# XploitVerse (Express Backend Branch)

This branch uses the Node.js + Express backend implementation.

## Branch Info

- Current branch: express_server
- Express API: server/
- Frontend: client/
- Go implementation is maintained separately in branch: go_backend

## Tech Stack

### Backend (Express)

- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- Socket.IO
- Nodemailer

### Frontend

- React 18
- Vite 5
- React Router
- Axios
- Tailwind CSS

## Prerequisites

- Node.js 18+
- npm 9+
- Docker + Docker Compose (for MongoDB/Redis local infra)
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

3. Configure and run Express backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

The API runs on http://localhost:5000 by default.

4. Run frontend

```bash
cd ../client
npm install
npm run dev
```

Frontend runs on http://localhost:5173.

## Main API Groups

- /api/auth
- /api/users
- /api/labs
- /api/lab-sessions
- /api/courses
- /api/modules
- /api/tasks
- /api/flags
- /api/leaderboard
- /api/admin

## Environment Notes

Set these at minimum for local development:

- PORT
- NODE_ENV
- MONGODB_URI
- JWT_SECRET
- CLIENT_URL
- SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM (for OTP/password email)

## Scripts

### Backend (server)

- npm run dev
- npm start
- npm test

### Frontend (client)

- npm run dev
- npm run build
- npm run preview

## Branch Switching

To switch to the Go backend branch:

```bash
git checkout go_backend
```
