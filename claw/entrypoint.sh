#!/bin/sh
set -e

# Model selectable via env. Maps to a model_name in litellm-config.yaml.
# Options: claude-haiku-4-5 | claude-sonnet-4-5 | claude-opus-4-5 | deepseek-v3
CLAW_MODEL="${CLAW_MODEL:-claude-haiku-4-5}"
LITELLM_URL="${LITELLM_URL:-http://litellm:4000}"

echo "[entrypoint] Configuring OpenClaw -> LiteLLM ($LITELLM_URL) model: $CLAW_MODEL"

CONFIG_DIR="/home/node/.openclaw"
mkdir -p "$CONFIG_DIR"

# Config matches the litellm provider plugin schema (api: openai-completions).
cat > "$CONFIG_DIR/openclaw.json" <<EOF
{
  "gateway": {
    "mode": "local",
    "http": {
      "endpoints": {
        "responses": { "enabled": true },
        "chatCompletions": { "enabled": true }
      }
    }
  },
  "browser": {
    "enabled": true,
    "headless": true
  },
  "models": {
    "providers": {
      "litellm": {
        "api": "openai-completions",
        "baseUrl": "${LITELLM_URL}",
        "models": [
          { "id": "claude-haiku-4-5", "name": "Claude Haiku 4.5 (Bedrock)", "reasoning": false, "input": ["text","image"], "cost": {"input":0,"output":0,"cacheRead":0,"cacheWrite":0}, "contextWindow": 200000, "maxTokens": 8192 },
          { "id": "claude-sonnet-4-5", "name": "Claude Sonnet 4.5 (Bedrock)", "reasoning": false, "input": ["text","image"], "cost": {"input":0,"output":0,"cacheRead":0,"cacheWrite":0}, "contextWindow": 200000, "maxTokens": 8192 },
          { "id": "claude-opus-4-5", "name": "Claude Opus 4.5 (Bedrock)", "reasoning": false, "input": ["text","image"], "cost": {"input":0,"output":0,"cacheRead":0,"cacheWrite":0}, "contextWindow": 200000, "maxTokens": 8192 },
          { "id": "deepseek-v3", "name": "DeepSeek V3.1 (Bedrock)", "reasoning": false, "input": ["text"], "cost": {"input":0,"output":0,"cacheRead":0,"cacheWrite":0}, "contextWindow": 128000, "maxTokens": 8192 }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": { "primary": "litellm/${CLAW_MODEL}" }
    }
  }
}
EOF

echo "[entrypoint] Starting gateway with model litellm/${CLAW_MODEL}..."
exec node openclaw.mjs gateway --allow-unconfigured
