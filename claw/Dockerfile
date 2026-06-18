FROM ghcr.io/openclaw/openclaw:latest

ENV OPENCLAW_SKIP_ONBOARDING=1
ENV OPENCLAW_DISABLE_BONJOUR=1
ENV LITELLM_API_KEY=sk-apaaja-pastibisa-2026

# Custom skill for tiket.com booking
COPY skills/ /home/node/.openclaw/skills/

# Entrypoint configures litellm provider + starts gateway
COPY entrypoint.sh /entrypoint.sh
USER root
RUN chmod +x /entrypoint.sh
USER node

ENTRYPOINT ["/entrypoint.sh"]
EXPOSE 18789
