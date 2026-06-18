FROM ghcr.io/openclaw/openclaw:latest

ENV OPENCLAW_SKIP_ONBOARDING=1
ENV OPENCLAW_DISABLE_BONJOUR=1
ENV AWS_PROFILE=default
ENV AWS_REGION=ap-southeast-3

# OpenClaw config — bedrock provider + local gateway mode
COPY openclaw.json /home/node/.openclaw/openclaw.json

# Custom skill for tiket.com booking
COPY skills/ /home/node/.openclaw/skills/

EXPOSE 18789
