.PHONY: up down build logs restart migrate seed dev test clean

# Production
up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

restart:
	docker compose restart

# Database
migrate:
	docker compose exec api /app/migrate up

seed:
	docker compose exec api /app/seed

# Development
dev-backend:
	cd backend && go run ./cmd/server

dev-frontend:
	cd frontend && npm run dev

# Testing
test-backend:
	cd backend && go test ./...

test-frontend:
	cd frontend && npm run test

# Utilities
clean:
	docker compose down -v
	docker system prune -f

status:
	docker compose ps
	@echo ""
	@echo "Pool Status:"
	@curl -s http://localhost:8080/api/pool/status | jq .

health:
	@curl -s http://localhost:8080/api/health | jq .
