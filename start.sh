#!/bin/bash
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║       NORVIEW — Arctic OSINT Command         ║"
echo "║       Starting all services...               ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Resolve project root (where this script lives)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure deps are installed
if [ ! -d "node_modules" ]; then
  echo "[0/2] Installing frontend dependencies..."
  npm install
fi
if [ ! -d "server/node_modules" ]; then
  echo "[0/2] Installing server dependencies..."
  cd server && npm install && cd ..
fi

# Start API proxy server
echo "[1/2] Starting API proxy server on port 3001..."
node server/index.js &
SERVER_PID=$!

# Wait for server to be ready
sleep 2

# Start Vite dev server using LOCAL binary (not npx which pulls wrong version)
echo "[2/2] Starting Vite dev server on port 3000..."
./node_modules/.bin/vite --host &
VITE_PID=$!

sleep 2
echo ""
echo "================================================"
echo "  NORVIEW is running!"
echo "  Open: http://localhost:3000"
echo "================================================"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup on exit
trap "kill $SERVER_PID $VITE_PID 2>/dev/null; exit" EXIT INT TERM
wait
