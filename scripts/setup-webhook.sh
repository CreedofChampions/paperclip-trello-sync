#!/usr/bin/env bash
# created by AI
# Setup script for Trello webhook using localtunnel
# Usage: npm run webhook:setup
#
# This script:
# 1. Starts the webhook server in the background
# 2. Creates a localtunnel to expose it publicly
# 3. Registers the webhook with Trello
# 4. Waits for Ctrl+C to tear down

set -e

PORT="${WEBHOOK_PORT:-3101}"

echo "=== Paperclip-Trello Webhook Setup ==="
echo ""
echo "Step 1: Starting webhook server on port $PORT..."
echo ""

# Start the webhook server in background
npx ts-node src/index.ts &
SERVER_PID=$!

# Give server time to start
sleep 3

echo ""
echo "Step 2: Creating localtunnel to port $PORT..."
echo ""

# Create localtunnel
LT_URL=$(npx lt --port "$PORT" 2>&1 | grep -oP 'https://[^ ]+\.loca\.lt' | head -1)

if [ -z "$LT_URL" ]; then
  echo "ERROR: Failed to create localtunnel. Trying alternative method..."
  # Fallback: just use the configured base URL
  LT_URL="${WEBHOOK_BASE_URL:-http://localhost:$PORT}"
fi

echo "Public URL: $LT_URL"
echo ""
echo "Step 3: Registering webhook with Trello..."
echo ""

# Set the webhook base URL and register
WEBHOOK_BASE_URL="$LT_URL" npx ts-node src/cli.ts webhook-setup

echo ""
echo "=== Webhook is live ==="
echo "Public URL: $LT_URL/trello/webhook"
echo "Server PID: $SERVER_PID"
echo ""
echo "Press Ctrl+C to stop the server and tunnel..."
echo ""

# Wait for Ctrl+C
trap "echo 'Shutting down...'; kill $SERVER_PID 2>/dev/null; exit 0" INT TERM

wait $SERVER_PID