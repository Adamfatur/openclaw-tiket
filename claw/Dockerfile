FROM ghcr.io/openclaw/openclaw:latest

# Set environment for Bedrock via EC2 instance role
ENV AWS_PROFILE=default
ENV AWS_REGION=ap-southeast-3
ENV OPENCLAW_DISABLE_BONJOUR=1

# Copy our custom skill
COPY skills/ /app/skills/

# Copy openclaw config for Bedrock
COPY openclaw.json /root/.openclaw/openclaw.json

EXPOSE 18789
