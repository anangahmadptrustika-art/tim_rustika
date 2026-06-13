# Deployment Guide — Rustika PMS

The app builds to a **standalone** Next.js bundle and runs via a custom server
(`server.js`) that hosts both Next and Socket.IO on one port (3000).

## 1. Prerequisites

- Docker 24+ and Docker Compose v2
- A PostgreSQL 16 database (the compose file provisions one)
- `AUTH_SECRET` — generate with `openssl rand -base64 32`

## 2. One-command stack (Docker Compose)

```bash
cp .env.example .env
# set AUTH_SECRET and (for real URLs) NEXTAUTH_URL
docker compose up --build -d
```

Compose starts three services:

| Service | Role | Notes |
| --- | --- | --- |
| `db` | PostgreSQL 16 | persistent volume `postgres-data`, healthcheck |
| `migrate` | one-shot | runs `prisma migrate deploy` + `tsx prisma/seed.ts`, then exits |
| `app` | web + realtime | depends on healthy `db`; `/api/health` healthcheck |

```bash
docker compose logs -f app      # follow logs
docker compose ps               # status
docker compose down             # stop (keep data)
docker compose down -v          # stop + wipe DB volume
```

App → http://localhost:3000.

## 3. Environment Variables

| Var | Required | Description |
| --- | :---: | --- |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | NextAuth signing secret |
| `NEXTAUTH_URL` | ✅ (prod) | Public base URL (e.g. `https://pms.rustika.co.id`) |
| `PORT` | — | default `3000` |
| `SMTP_*` | — | Email delivery (mock-logged if unset) |
| `WHATSAPP_API_TOKEN`, `WHATSAPP_PHONE_ID` | — | WhatsApp Cloud API |
| `S3_*` | — | Attachment storage |

## 4. Dockerfile Stages

```
base   → node:20-alpine + openssl/libc6-compat
deps   → npm ci (cached layer)
builder→ prisma generate + next build (standalone)
runner → minimal: standalone server + static + prisma engine, non-root user
```

The `runner` runs as uid `1001` (`nextjs`) and starts `node server.js`.

## 5. Database Migrations in Production

The `migrate` service applies committed migrations automatically. To run
manually against an external DB:

```bash
docker compose run --rm migrate sh -c "npx prisma migrate deploy"
# seed (first deploy only)
docker compose run --rm migrate sh -c "npx tsx prisma/seed.ts"
```

> Generate migrations during development with `npm run prisma:migrate` and commit
> the `prisma/migrations` folder. Production never auto-generates schema changes.

## 6. Reverse Proxy / TLS

Terminate TLS at a proxy (Nginx/Traefik/Caddy) and forward to `app:3000`.
**Socket.IO requires WebSocket upgrade headers** to be passed through:

```nginx
location / {
    proxy_pass http://app:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Set `NEXTAUTH_URL=https://your-domain` so auth callbacks and CORS are correct.

## 7. Health, Liveness & Readiness

- `GET /api/health` → `200 {status:"ok"}` when DB reachable, `503` otherwise.
- Compose healthcheck wired; for Kubernetes use it as both liveness & readiness
  probe (readiness with a short `initialDelaySeconds`).

## 8. Scaling Out

For more than one `app` replica:

1. Add **Redis** and the Socket.IO Redis adapter so realtime rooms span pods.
2. Put `app` behind a load balancer with **sticky sessions** (or rely on the
   Redis adapter + polling fallback).
3. Move scheduled jobs into a dedicated **worker** deployment (BullMQ) so they
   run once, not per-replica.
4. Use **PgBouncer** / Prisma Accelerate for connection pooling.

```
        ┌── app (N replicas) ──┐
LB ─────┤                      ├── PostgreSQL (primary + read replicas)
        └── worker (jobs) ─────┘
                 │
               Redis (pub/sub + queues + cache)
```

## 9. Backups & DR

- Schedule `pg_dump` (or managed snapshots) of the database; store off-site.
- Test restores regularly. The app tier is stateless — only the DB (and S3
  attachments) hold state.

## 10. Kubernetes (sketch)

- `Deployment` for `app` (HPA on CPU/RPS), `Deployment` for `worker`.
- `CronJob`s for reminders / monthly bonus generation / badge evaluation.
- `Secret` for `DATABASE_URL`, `AUTH_SECRET`, provider keys.
- `Service` + `Ingress` (WebSocket-enabled) + cert-manager TLS.
- Managed PostgreSQL (Cloud SQL / RDS) + managed Redis.

## 11. CI/CD (recommended)

```
push → lint + typecheck + unit tests → build image →
       scan (Trivy) → push registry → migrate deploy → rolling deploy → smoke /api/health
```
