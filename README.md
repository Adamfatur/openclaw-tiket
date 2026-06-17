# OpenClaw Tiket

Multi-user platform for automated ticket booking on tiket.com using OpenClaw AI agent.

## Overview

- **3 concurrent booking sessions** via OpenClaw containers
- **RBAC** (admin + member roles)
- **Real-time updates** via WebSocket
- **AWS Bedrock** Claude Haiku 4.5 (ap-southeast-3 Jakarta)
- **PostgreSQL** for persistent storage
- **Go backend** + **React frontend**

## Architecture

```
User → Web Dashboard → Go API → OpenClaw Pool (3 slots) → tiket.com
                                      ↓
                               AWS Bedrock (Haiku 4.5)
```

## Quick Start

### Prerequisites
- Docker & Docker Compose v2
- AWS credentials with Bedrock access (ap-southeast-3)

### Setup

```bash
# Clone
git clone https://github.com/Adamfatur/openclaw-tiket.git
cd openclaw-tiket

# Configure environment
cp .env.example .env
# Edit .env with your values

# Run
make up

# Access
open http://localhost
```

### Default Admin
- Email: `admin@openclaw-tiket.local`
- Password: `changeme123`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://claw:claw@db:5432/clawtiket` |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |
| `JWT_SECRET` | Secret for JWT signing | (required) |
| `AWS_REGION` | AWS region for Bedrock | `ap-southeast-3` |
| `BEDROCK_MODEL` | Bedrock model ID | `anthropic.claude-haiku-4-5-20251001-v1:0` |
| `MAX_CLAW_SLOTS` | Max concurrent sessions | `3` |
| `BOOKING_TIMEOUT` | Max seconds per booking | `600` |

## Project Structure

```
openclaw-tiket/
├── backend/          # Go API server
├── frontend/         # React SPA
├── claw/             # OpenClaw container + skills
├── docker-compose.yml
├── Caddyfile
├── Makefile
└── .env.example
```

## Tech Stack

- **Backend**: Go 1.23, chi router, pgx, sqlc, gorilla/websocket
- **Frontend**: React 18, TypeScript, Vite, shadcn/ui, Tailwind, Zustand
- **Database**: PostgreSQL 16, Redis 7
- **AI**: AWS Bedrock Claude Haiku 4.5
- **Agent**: OpenClaw + Playwright
- **Infra**: Docker Compose, Caddy, EC2 t3.large (Jakarta)

## API Endpoints

See [design spec](.kiro/specs/openclaw-tiket/design.md) for full API documentation.

## License

Private - Internal Use Only
