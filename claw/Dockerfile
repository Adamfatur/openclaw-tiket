FROM ghcr.io/openclaw/openclaw:latest

USER root

# Install Chromium + deps so OpenClaw's browser tool can drive a headless browser
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libcups2 libdrm2 libgbm1 libgtk-3-0 libnspr4 libnss3 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libxkbcommon0 \
    ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*

# Point browser tooling at the installed chromium
ENV CHROME_PATH=/usr/bin/chromium
ENV CHROME_BIN=/usr/bin/chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

ENV OPENCLAW_SKIP_ONBOARDING=1
ENV OPENCLAW_DISABLE_BONJOUR=1
ENV LITELLM_API_KEY=sk-apaaja-pastibisa-2026

# Register the tiket-booking skill in the OpenClaw skills directory
COPY skills/ /home/node/.openclaw/skills/

# Entrypoint configures litellm provider + browser + starts gateway
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && chown -R node:node /home/node/.openclaw

USER node
ENTRYPOINT ["/entrypoint.sh"]
EXPOSE 18789
