FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM alpine:3.20
# Output is static files in /app/dist — mounted by Caddy
COPY --from=builder /app/dist /srv/web
