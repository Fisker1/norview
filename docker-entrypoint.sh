#!/bin/sh

# Start the Express API proxy server (port 3001) in the background
node server/index.js &
SERVER_PID=$!

# Wait for API server to be ready
sleep 2

# Start the production static + proxy server on port 3000
node docker-serve.js
