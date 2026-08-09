#!/bin/bash

# Exit on error for initial setup commands
set -e

echo "🚀 Starting XploitVerse Stack..."

# 1. Start Docker containers
echo "📦 Starting Docker containers (Postgres, Redis)..."
docker compose up -d

# 2. Start Go Backend
echo "⚙️ Setting up backend..."
cd backend
if [ ! -f .env ]; then
    echo "Creating backend/.env from .env.example..."
    cp .env.example .env
fi
go mod download
echo "🟢 Starting Go Backend in the background..."
go run cmd/server/main.go &
BACKEND_PID=$!
cd ..

# 3. Start React Frontend
echo "⚙️ Setting up frontend..."
cd client
if [ ! -d node_modules ]; then
    echo "Installing frontend dependencies (this might take a minute)..."
    npm install
fi
echo "🔵 Starting Vite Frontend..."
npm run dev &
FRONTEND_PID=$!
cd ..

# 4. Handle Cleanup on Exit
# This traps Ctrl+C (SIGINT) or termination (SIGTERM) and kills the backend/frontend processes
trap "echo -e '\n🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

echo ""
echo "✅ All services are starting up!"
echo "➡️  Backend running at: http://localhost:5000"
echo "➡️  Frontend running at: http://localhost:5173"
echo "⚠️  Press Ctrl+C to stop both servers."
echo ""

# Wait for processes to finish (or until user hits Ctrl+C)
wait $BACKEND_PID $FRONTEND_PID
