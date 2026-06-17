FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# System deps for Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl gnupg ca-certificates fonts-liberation \
    libasound2 libatk-bridge2.0-0 libdrm2 libgbm1 \
    libgtk-3-0 libnspr4 libnss3 libxss1 xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Python deps
RUN pip install --no-cache-dir \
    playwright==1.49.0 \
    httpx==0.28.0 \
    uvicorn==0.34.0 \
    fastapi==0.115.0

# Install Chromium for Playwright
RUN playwright install chromium

WORKDIR /app
COPY . .

# Health + task server
COPY server.py /app/server.py

EXPOSE 3000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "3000"]
