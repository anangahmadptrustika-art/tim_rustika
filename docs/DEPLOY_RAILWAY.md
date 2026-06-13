# Deploy to Railway — Rustika PMS

Railway suits this app well because it runs a long-lived Node process — required
for the custom **Socket.IO** server (`server.js`). The repo ships a
[`railway.json`](../railway.json) that builds with Nixpacks, runs
`prisma migrate deploy` on every deploy, and health-checks `/api/health`.

## Prerequisites
- A [Railway](https://railway.app) account (sign in with GitHub).
- The Railway GitHub App authorized for `anangahmadptrustika-art/tim_rustika`.

## Step 1 — Create the project from this repo
1. Railway dashboard → **New Project** → **Deploy from GitHub repo**.
2. Pick **`tim_rustika`**.
3. When asked for the branch, choose **`claude/keen-pasteur-jr5df2`**
   (or merge it to `main` first and deploy `main`).

Railway detects `railway.json` automatically.

## Step 2 — Add a PostgreSQL database
1. In the project canvas → **New** → **Database** → **Add PostgreSQL**.
2. Railway provisions it and exposes a `DATABASE_URL` variable.

## Step 3 — Set environment variables
Open the **app service** → **Variables** and add:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{ Postgres.DATABASE_URL }}` (reference the Postgres service) |
| `AUTH_SECRET` | output of `openssl rand -base64 32` |
| `NEXTAUTH_URL` | your public URL, e.g. `https://tim-rustika-production.up.railway.app` |
| `NODE_ENV` | `production` |

> `PORT` is injected by Railway automatically — `server.js` already reads it.
> First set a temporary `NEXTAUTH_URL`, then update it once Railway assigns the
> public domain (Step 5), and redeploy.

## Step 4 — Deploy
Railway builds and deploys automatically on every push to the selected branch.
The build runs `npm run build` (`prisma generate` + `next build`); the release
runs `npx prisma migrate deploy` then `node server.js`.

Watch **Deployments → Logs** for:
```
> Rustika PMS ready on http://0.0.0.0:<port>
> Socket.IO listening on path /api/socket
```

## Step 5 — Generate a public domain
App service → **Settings → Networking → Generate Domain**. Copy the URL into
`NEXTAUTH_URL` and redeploy so auth callbacks resolve correctly.

## Step 6 — Seed demo data (one time)
The seed isn't run automatically. From your machine with the Railway CLI:
```bash
npm i -g @railway/cli
railway login
railway link        # select the project
railway run npm run db:seed
```
Or temporarily set the start command to
`npx prisma migrate deploy && npx tsx prisma/seed.ts && node server.js`,
deploy once, then revert.

Login after seeding: `admin@rustika.co.id` / `Password123!`.

## Migrations
`railway.json` runs `prisma migrate deploy` on each release, applying the
committed migrations in `prisma/migrations`. An initial migration
(`prisma/migrations/0_init`) covering the full schema is **already committed**,
so a fresh Railway Postgres is provisioned automatically on first deploy. Add
further migrations locally with `npm run prisma:migrate` and commit them.

## Troubleshooting
| Symptom | Fix |
| --- | --- |
| Build fails on `npm ci` | Ensure `package-lock.json` is committed (it is) |
| `migrate deploy` finds no migrations | Ensure `prisma/migrations` is committed (it is — `0_init`) |
| WebSocket/Socket.IO not connecting | Railway supports WS natively; confirm client uses same origin + `/api/socket` |
| Auth redirect loops | `NEXTAUTH_URL` must equal the public HTTPS domain |
| 503 on `/api/health` | DB not reachable — check `DATABASE_URL` reference |

## Alternative: Vercel
Vercel is serverless and does **not** run the persistent `server.js`, so
Socket.IO won't work out of the box. To use Vercel you'd move realtime to a
separate service (e.g. Pusher/Ably or a standalone Socket.IO server) and deploy
the Next app as functions. **Railway/Render/Fly.io are recommended** for the
single-process architecture shipped here.
