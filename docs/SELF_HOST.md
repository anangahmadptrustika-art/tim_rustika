# Self-Hosting Guide — Rustika PMS (Proxmox · Ubuntu Server · CasaOS)

This app ships a `Dockerfile` and `docker-compose.yml` (Postgres + auto-migrate +
app), so it self-hosts cleanly on your mini-PC. CasaOS already includes Docker,
so there's nothing extra to install.

> Recommended over a cloud trial: no credit limits, the database runs locally,
> and everything is one `docker compose up`.

## 0. Requirements
- Proxmox VM/LXC running **Ubuntu Server** with **CasaOS** (you have this).
- **Docker + Docker Compose v2** (CasaOS bundles Docker; verify with
  `docker --version` and `docker compose version`).
- `git` (`sudo apt install -y git`).
- ~2 GB RAM free for the first build; ~1 GB to run.
- The server's LAN IP (e.g. `192.168.1.50`) — find it with `ip a`.

## 1. Quickest path — SSH + Docker Compose

SSH into the Ubuntu server (or use CasaOS → Terminal) and run:

```bash
# 1. Get the code
git clone -b main https://github.com/anangahmadptrustika-art/tim_rustika.git
cd tim_rustika

# 2. Create the env file (replace the IP with YOUR server IP)
cat > .env <<'EOF'
AUTH_SECRET=ganti-dengan-string-acak-minimal-32-karakter
NEXTAUTH_URL=http://192.168.1.50:3000
EOF

# 3. Build & start (Postgres + migrate + seed + app)
docker compose up -d --build
```

First run takes a few minutes (Docker build). The `migrate` service creates all
tables and seeds demo data, then the `app` starts.

Open **http://192.168.1.50:3000** and sign in:

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `admin@rustika.co.id` | `Password123!` |
| Manager | `manager@rustika.co.id` | `Password123!` |
| Employee | `employee1@rustika.co.id` | `Password123!` |

> **Important:** `NEXTAUTH_URL` must match exactly how you open the app
> (the server's IP/host + port), otherwise login will redirect-loop. Generate a
> strong secret with `openssl rand -base64 32`.

### Useful commands
```bash
docker compose ps                 # status
docker compose logs -f app        # app logs
docker compose logs -f migrate    # migration/seed logs
docker compose down               # stop (keep data)
docker compose down -v            # stop + wipe database
docker compose up -d --build      # rebuild after pulling updates
```

## 2. Show it on the CasaOS dashboard
The container is managed by Docker, so it already runs. To get a tile on the
CasaOS home screen:

- **Option A (link tile):** CasaOS → **+** → **Add External Link / Custom App**
  → URL `http://192.168.1.50:3000`, give it an icon & name.
- **Option B (Portainer stack, GUI):**
  1. Install **Portainer** from the CasaOS App Store.
  2. Portainer → **Stacks → Add stack → Repository**.
  3. Repository URL: `https://github.com/anangahmadptrustika-art/tim_rustika`,
     reference `refs/heads/main`, compose path `docker-compose.yml`.
  4. Add env vars `AUTH_SECRET` and `NEXTAUTH_URL`, then **Deploy**.

## 3. Updating to the latest code
```bash
cd tim_rustika
git pull origin main
docker compose up -d --build      # migrate re-runs (idempotent), app restarts
```

## 4. Access from outside your LAN (optional)
- **Easiest & safest:** install **Tailscale** (CasaOS app) on the server and your
  phone/laptop — reach `http://<tailscale-ip>:3000` from anywhere, no port
  forwarding. Set `NEXTAUTH_URL` to the Tailscale URL.
- **Public domain + HTTPS:** put **Nginx Proxy Manager** (CasaOS app) in front,
  point a domain at your home IP, issue a Let's Encrypt cert, and proxy to
  `app:3000`. Then set `NEXTAUTH_URL=https://your-domain`.
  - Make sure the proxy forwards WebSocket upgrade headers (for Socket.IO):
    ```
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    ```

## 5. Backups
All state lives in the `postgres-data` Docker volume. Back it up regularly:
```bash
# dump
docker exec rustika-db pg_dump -U rustika rustika > rustika-$(date +%F).sql
# restore
cat rustika-2026-06-13.sql | docker exec -i rustika-db psql -U rustika rustika
```
On Proxmox you can also snapshot the whole VM/LXC.

## 6. Production hardening (optional)
- Change the default DB password in `docker-compose.yml` (`POSTGRES_PASSWORD`)
  **and** the matching `DATABASE_URL`.
- Remove the `db` service's `ports: 5432:5432` mapping so Postgres isn't exposed
  on the LAN (the app reaches it over the internal Docker network regardless).
- Run behind a reverse proxy with HTTPS (section 4).
- Set a strong, unique `AUTH_SECRET`.

## Troubleshooting
| Symptom | Fix |
| --- | --- |
| `docker: command not found` | CasaOS Docker not on PATH — use full path or `sudo systemctl status docker` |
| Build runs out of memory | Give the VM ≥2 GB RAM, or build once then it's cached |
| Login redirect loop | `NEXTAUTH_URL` must equal the exact URL you browse to |
| App up but no demo users | Check `docker compose logs migrate` — seed must have run |
| Port 3000 busy | Change app `ports` to e.g. `8080:3000` and update `NEXTAUTH_URL` |
| ARM mini-PC (e.g. Pi) | Image is multi-arch via node:20-alpine; Prisma targets glibc/musl — build on the device works |
