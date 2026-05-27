#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 300000}'

PROJECT="${CLAUDE_PROJECT_DIR:-/home/user/jse-portfolio-optimizer}"

# Install backend Python dependencies
echo "[startup] Installing backend dependencies..."
pip install -r "$PROJECT/backend/requirements.txt" -q

# Install frontend npm dependencies
echo "[startup] Installing frontend dependencies..."
cd "$PROJECT/frontend" && npm install --silent

# Start backend server if not already running
if ! pgrep -f "uvicorn main:app" > /dev/null 2>&1; then
  echo "[startup] Starting backend server on port 8000..."
  cd "$PROJECT/backend" && uvicorn main:app --host 0.0.0.0 --port 8000 >> /tmp/uvicorn.log 2>&1 &
  sleep 3
  echo "[startup] Backend started (PID $!)"
else
  echo "[startup] Backend already running"
fi

# Start frontend dev server if not already running
if ! pgrep -f "vite" > /dev/null 2>&1; then
  echo "[startup] Starting frontend dev server on port 5173..."
  cd "$PROJECT/frontend" && npm run dev -- --host 0.0.0.0 >> /tmp/vite.log 2>&1 &
  echo "[startup] Frontend started (PID $!)"
else
  echo "[startup] Frontend already running"
fi

echo "[startup] Done"
