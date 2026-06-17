# Agent Configuration: OpenClaw Tiket Booking

## Overview

This document describes the OpenClaw agent configuration for automated ticket booking on tiket.com.

## Agent Details

- **Platform**: OpenClaw (self-hosted)
- **LLM Backend**: AWS Bedrock - Claude Haiku 4.5
- **Model ID**: `anthropic.claude-haiku-4-5-20251001-v1:0`
- **Region**: `ap-southeast-3` (Jakarta)
- **Browser**: Playwright (headless Chromium)
- **Max Concurrent**: 3 instances

## Skill: tiket-booking

### Purpose
Automate flight ticket search and booking on tiket.com.

### Capabilities
1. Navigate to tiket.com flight search
2. Input search parameters (origin, destination, date, passengers)
3. Parse and filter search results
4. Select optimal flight based on user preferences
5. Fill passenger information forms
6. Pause for user payment confirmation
7. Complete booking process
8. Capture confirmation screenshots

### Input Schema
```json
{
  "origin": "CGK",
  "destination": "DPS",
  "departure_date": "2026-07-15",
  "return_date": null,
  "passengers": [
    {
      "name": "John Doe",
      "id_number": "1234567890",
      "type": "adult"
    }
  ],
  "preferences": {
    "sort_by": "price",
    "airline_pref": null,
    "time_range": "morning",
    "class": "economy"
  }
}
```

### Output Schema
```json
{
  "status": "completed",
  "booking_code": "ABCDEF",
  "flight_details": {
    "airline": "Garuda Indonesia",
    "flight_number": "GA-401",
    "departure": "2026-07-15T08:00:00+07:00",
    "arrival": "2026-07-15T09:45:00+08:00",
    "class": "economy"
  },
  "total_price": 1250000,
  "currency": "IDR",
  "screenshot_url": "/screenshots/booking-abc123.png"
}
```

### Workflow States
```
IDLE → SEARCHING → SELECTING → FILLING → AWAITING_CONFIRMATION → COMPLETING → DONE
                                                                             → FAILED
```

### Error Handling
- **Site unavailable**: Retry 3x with 5s delay, then fail
- **No results**: Return empty with message, no retry
- **Form validation error**: Retry with corrected input
- **Payment page timeout**: Pause, notify user, wait 5 min
- **Session expired**: Restart from search

### Safety Rules
1. NEVER auto-confirm payment without explicit user approval
2. NEVER store payment credentials (credit card, bank details)
3. ALWAYS capture screenshot before and after payment
4. ALWAYS respect 10-minute timeout per session
5. ALWAYS log every action for audit trail

## Bedrock Configuration

```yaml
provider: bedrock
model: anthropic.claude-haiku-4-5-20251001-v1:0
region: ap-southeast-3
max_tokens: 4096
temperature: 0.3  # Low for deterministic task execution
top_p: 0.9
```

### Why Haiku 4.5?
- **Speed**: ~200ms first token latency — critical for interactive booking
- **Cost**: ~$0.25/M input, $1.25/M output — efficient for high-volume
- **Capability**: Strong enough for structured web navigation tasks
- **Availability**: Active in Jakarta region, low latency to EC2

## Container Health Check

Each OpenClaw container exposes:
```
GET /health → {"status": "ok", "slot": 1, "busy": false}
GET /status → {"current_task": null, "uptime": "2h34m", "tasks_completed": 12}
```

## Resource Limits per Container

```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 2G
    reservations:
      cpus: '0.25'
      memory: 1G
```
