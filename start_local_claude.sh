#!/bin/bash

# Adiciona o diretório do LiteLLM ao PATH se necessário
export PATH="$PATH:/Users/mmendes/Library/Python/3.9/bin"

echo "Iniciando LiteLLM Proxy com Ollama (qwen3-coder:30b)..."
# Inicia o litellm em background
litellm --config ./litellm_config.yaml --port 4000 --num_workers 8 &
LITELLM_PID=$!

echo "LiteLLM iniciado com PID $LITELLM_PID"
echo "Para usar o Claude Code localmente, execute:"
echo "export ANTHROPIC_BASE_URL='http://localhost:4000'"
echo "export ANTHROPIC_API_KEY='sk-ant-123'"
echo "claude"

# Mantém o script rodando para manter o proxy ativo
wait $LITELLM_PID
