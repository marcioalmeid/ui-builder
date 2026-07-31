#!/usr/bin/env sh
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

sh scripts/stop-dev.sh
echo ""
echo "Starting dev mode (mock API + ng serve)..."
exec sh scripts/start-dev.sh
