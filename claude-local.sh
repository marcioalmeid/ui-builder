#!/usr/bin/env bash
# Wrapper — delega para o script canónico no repo root
exec "$(cd "$(dirname "$0")/.." && pwd)/claude-local.sh" "$@"
