#!/usr/bin/env sh

MOCK_PORT="${MOCK_API_PORT:-3001}"
NG_PORT="${NG_PORT:-4200}"

kill_port() {
  port=$1
  label=$2
  pids=$(lsof -ti :"$port" 2>/dev/null || true)

  if [ -z "$pids" ]; then
    echo "  ${label}: nothing on port ${port}"
    return 0
  fi

  echo "  ${label}: stopping port ${port}..."
  echo "$pids" | xargs kill 2>/dev/null || true
  sleep 0.4

  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
}

echo "Stopping dev processes..."
kill_port "$MOCK_PORT" "Mock API"
kill_port "$NG_PORT" "Angular (ng serve)"
echo "Done."
