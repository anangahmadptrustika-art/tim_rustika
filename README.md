# Rustika Performance Management System (Rustika PMS)

> Enterprise-grade work tracking, target management, employee performance
> monitoring, reward & compensation platform.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)](https://www.postgresql.org)

Rustika PMS turns day-to-day task execution into a measurable, gamified, and
financially-rewarded performance system. Employees earn **points** for completed
work (adjusted by difficulty, weight, and timeliness); points convert to
**rupiah bonuses**; lateness triggers an automatic **weekend compensation**
obligation; and managers/executives get **real-time analytics**.

---

## ✨ Features

| Domain | Highlights |
| --- | --- |
| **Task Management** | Create, assign, schedule, weight, difficulty, file attachments, approval workflow |
| **Point System** | Base + early-bonus − late-penalty engine, monthly accumulation, full ledger |
| **Money Conversion** | Configurable `Rp/point` rate, monthly bonus reports |
| **Compensation** | Auto-obligation on lateness, weekend make-up workday tracking & verification |
| **Dashboards** | Executive / Manager / Employee views with KPIs, rankings, trends, heatmaps |
| **Notifications** | In-app (realtime via Socket.IO), Email, WhatsApp |
| **Gamification** | Badges, achievements, leaderboards |
| **Reports** | PDF & Excel export, monthly & annual reports |
| **Platform** | RBAC, audit logging, health probes, Docker deployment |

## 🧱 Tech Stack

- **Next.js 15** (App Router, RSC, Server Actions) + **TypeScript**
- **Tailwind CSS** + **ShadCN UI** (Radix primitives)
- **PostgreSQL 16** + **Prisma 6** ORM
- **NextAuth (Auth.js v5)** — credentials + JWT sessions, RBAC
- **Recharts** for analytics, **Socket.IO** for realtime
- **Docker** multi-stage build, standalone output

## 📚 Documentation

| Doc | Description |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture, layers, data flow, scoring engine |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Schema reference + **ERD diagram** |
| [`docs/API.md`](docs/API.md) | REST API surface & contracts |
| [`docs/WIREFRAMES.md`](docs/WIREFRAMES.md) | UI wireframes & dashboard designs |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phased development roadmap |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Docker deployment guide |
| [`docs/SELF_HOST.md`](docs/SELF_HOST.md) | Self-hosting on Proxmox / Ubuntu / CasaOS |
| [`docs/DEPLOY_RAILWAY.md`](docs/DEPLOY_RAILWAY.md) | One-click-ish Railway deployment |

## 🚀 Quick Start (local)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# edit DATABASE_URL and AUTH_SECRET (openssl rand -base64 32)

# 3. Start PostgreSQL (or use docker compose up db -d)
docker compose up db -d

# 4. Apply schema & seed demo data
npm run prisma:migrate
npm run db:seed

# 5. Run the dev server
npm run dev
```

Open http://localhost:3000 and sign in:

| Role | Email | Password |
| --- | --- | --- |
| Super Admin | `admin@rustika.co.id` | `Password123!` |
| Manager | `manager@rustika.co.id` | `Password123!` |
| Employee | `employee1@rustika.co.id` | `Password123!` |

## 🐳 Quick Start (Docker)

```bash
cp .env.example .env            # set AUTH_SECRET
docker compose up --build       # db + migrate + app
```

App available at http://localhost:3000. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## 🗂️ Project Structure

```
.
├── prisma/
│   ├── schema.prisma          # full data model (15+ models)
│   └── seed.ts                # demo data
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (dashboard)/       # authenticated shell + dashboards
│   │   ├── api/               # route handlers (tasks, analytics, bonus…)
│   │   └── login/
│   ├── components/
│   │   ├── ui/                # ShadCN primitives
│   │   └── dashboard/         # app-specific components
│   ├── lib/                   # prisma, auth, rbac, scoring-engine, utils
│   ├── server/
│   │   ├── services/          # task / bonus / compensation / analytics …
│   │   └── realtime/          # Socket.IO emitter bridge
│   ├── hooks/
│   └── types/
├── server.js                  # custom Next + Socket.IO server
├── Dockerfile
└── docker-compose.yml
```

## 🧮 The Scoring Engine (core IP)

```
adjustedBase = round(basePoints × difficultyMultiplier × weight)
earlyBonus   = min(daysEarly × earlyBonusPerDay,  earlyBonusCap)
latePenalty  = min(daysLate  × latePenaltyPerDay, latePenaltyCap)
netPoints    = adjustedBase + earlyBonus − latePenalty

if daysLate ≥ compensationThresholdDays:
    open Compensation(requiredWorkdays = ceil(daysLate × daysPerLateDay))
    latePenalty becomes recoverable once compensation is VERIFIED
```

All multipliers, caps, and thresholds are configurable per department via
`ScoringConfig`. See [`src/lib/scoring-engine.ts`](src/lib/scoring-engine.ts).

## 📜 Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Prisma generate + Next build |
| `npm start` | Production server (Next + Socket.IO) |
| `npm run prisma:migrate` | Create & apply dev migration |
| `npm run prisma:deploy` | Apply migrations (prod) |
| `npm run db:seed` | Seed demo data |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |

## 🔐 Security

- Role-based access control (`SUPER_ADMIN`, `MANAGER`, `EMPLOYEE`) enforced in
  middleware, API handlers, and UI.
- Password hashing with bcrypt; JWT sessions.
- Security headers (CSP-friendly), audit log on every privileged action.
- Input validation with Zod on every mutating endpoint.

## 📄 License

Proprietary — © Rustika. All rights reserved.
