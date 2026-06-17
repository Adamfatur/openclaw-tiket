FROM python:3.12-slim

# Install Chromium for Playwright
RUN apt-get update && apt-get install -y \
    wget curl gnupg \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir playwright httpx uvicorn fastapi
RUN playwright install chromium --with-deps

WORKDIR /app
COPY . .

# Placeholder health server until OpenClaw is configured
RUN echo 'from fastapi import FastAPI\nimport os\napp = FastAPI()\n\n@app.get("/health")\ndef health():\n    return {"status":"ok","slot":int(os.environ.get("SLOT_NUMBER",0)),"busy":False}\n\n@app.get("/status")\ndef status():\n    return {"current_task":None,"uptime":"0s","tasks_completed":0}' > server.py

EXPOSE 3000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "3000"]
