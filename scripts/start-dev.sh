#!/usr/bin/env sh
set -e

PORT="${MOCK_API_PORT:-3001}"
HEALTH_URL="http://localhost:${PORT}/api/health"

if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
  echo "Mock API already running at :${PORT}"
else
  echo "Starting mock API on :${PORT}..."
  node mock-api/server.mjs &
  sleep 0.5
  if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    echo "Mock API ready."
  else
    echo "Warning: mock API did not respond at ${HEALTH_URL}"
    echo "Dropdowns will fall back to /catalog/*.json"
  fi
fi

exec ng serve
