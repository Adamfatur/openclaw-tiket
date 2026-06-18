FROM ghcr.io/openclaw/openclaw:latest

# Skip interactive onboarding
ENV OPENCLAW_SKIP_ONBOARDING=1
ENV OPENCLAW_DISABLE_BONJOUR=1
ENV AWS_PROFILE=default
ENV AWS_REGION=ap-southeast-3

# Copy config to both possible locations
COPY openclaw.json /root/.openclaw/openclaw.json
COPY openclaw.json /home/node/.openclaw/openclaw.json

# Copy custom skill
COPY skills/ /root/.openclaw/skills/
COPY skills/ /home/node/.openclaw/skills/

# Pre-configure gateway mode via entrypoint override
RUN mkdir -p /app/data && \
    echo '{"gateway":{"mode":"local","bind":"lan"},"models":{"bedrockDiscovery":{"enabled":true,"region":"ap-southeast-3","providerFilter":["anthropic"]}}}' > /app/data/config.json || true

EXPOSE 18789
