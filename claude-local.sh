#!/bin/bash

# Script wrapper para rodar o Claude Code usando o modelo local via LiteLLM

# 1. Inicia o proxy se não estiver rodando
if ! curl -s http://localhost:4000/v1/models > /dev/null; then
    echo "Iniciando LiteLLM Proxy em background..."
    export PATH="$PATH:/Users/mmendes/Library/Python/3.9/bin"
    litellm --config /Users/mmendes/Development/ui-builder/litellm_config.yaml --port 4000 --num_workers 8 > /tmp/litellm.log 2>&1 &
    sleep 2
fi

# 2. Configura as variáveis de ambiente para o Claude Code
export ANTHROPIC_BASE_URL="http://localhost:4000"
export ANTHROPIC_API_KEY="sk-ant-local-123"

# 3. Roda o Claude Code
claude "$@"
