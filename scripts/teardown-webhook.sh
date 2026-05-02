#!/usr/bin/env bash
# created by AI
# Tear down script for Trello webhook
# Usage: npm run webhook:teardown

set -e

echo "Removing Trello webhook..."
npx ts-node src/cli.ts webhook-teardown
echo "Done. Webhook removed."