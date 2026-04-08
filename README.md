# XploitVerse (express_server)

XploitVerse is a cybersecurity learning platform with hands-on labs, scoring, and real-time terminal sessions.
This branch uses the Node.js + Express backend in the `server` folder.

## Current Status

- Active branch architecture: Express API + React client
- Service extraction completed for auth, subscription, lab, leaderboard, and flag domains
- Docker-backed terminal sessions are live via Socket.io
- Redis is integrated for cache, leaderboard, flag controls, and lab TTL tracking
- Test baseline is passing: 3 suites, 11 tests (as of 2026-04-07)

## Repository Layout

- `server/`: active backend (Node.js + Express)
- `client/`: frontend (React + Vite)
- `challenges/`: lab images and challenge apps
- `backend/`: legacy Go backend implementation retained in repo history

## Tech Stack

### Backend

- Node.js
- Express
- MongoDB + Mongoose
- Redis + ioredis
- JWT auth + HttpOnly cookies
- Socket.io
- Razorpay payments
- Nodemailer email flows
- Pino structured logging

### Frontend

- React 18
- Vite 5
- React Router
- Axios
- Tailwind CSS

## Prerequisites

- Node.js 18+
- npm 9+
- Docker + Docker Compose
- Git

## Quick Start

1. Clone repository

```bash
git clone https://github.com/XploitMonk0x01/XploitVerse.git
cd XploitVerse
```

2. Start local infrastructure (MongoDB + Redis)

```bash
docker compose up -d
```

3. Configure and run backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

PowerShell alternative for env file copy:

```powershell
Copy-Item .env.example .env
```

Backend default URL: http://localhost:5000

4. Run frontend

```bash
cd ../client
npm install
npm run dev
```

Frontend default URL: http://localhost:5173

## Environment Variables

See `server/.env.example` for the full template.

Minimum required for backend startup:

- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL`

Common optional variables:

- `REDIS_URL`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`

## Backend API Groups

- `/health`
- `/api`
- `/api/auth`
- `/api/users`
- `/api/labs`
- `/api/lab-sessions`
- `/api/courses`
- `/api/modules`
- `/api/tasks`
- `/api/flags`
- `/api/leaderboard`
- `/api/subscriptions`
- `/api/chat`
- `/api/admin`

## Scripts

### Backend (`server/`)

- `npm run dev`: start with nodemon
- `npm start`: start with node
- `npm test`: run Jest test suites

### Frontend (`client/`)

- `npm run dev`
- `npm run build`
- `npm run preview`

## Testing

Run backend tests:

```bash
cd server
npm test
```

Current implemented suites include:

- payment service scenarios
- subscription route integration scenarios
- flag service unit scenarios

## Branch Notes

- Active runtime branch: `express_server`
- Go backend branch: `go_backend`

Switch to the Go backend branch:

```bash
git checkout go_backend
```
