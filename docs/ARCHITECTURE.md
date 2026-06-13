# System Architecture — Rustika PMS

## 1. Overview

Rustika PMS is a modular monolith built on **Next.js 15 (App Router)**. A single
deployable serves the UI (React Server Components), the REST API (route
handlers), realtime (Socket.IO over the same HTTP server), and background
orchestration (services). This keeps operational complexity low while preserving
clean internal boundaries so any domain can later be extracted into a service.

```
┌──────────────────────────────────────────────────────────────────────┐
│                            Clients                                     │
│   Web (desktop)        Mobile-responsive web        (future) PWA       │
└───────────────┬──────────────────────────────────────┬────────────────┘
                │ HTTPS (REST + RSC)                     │ WSS (Socket.IO)
┌───────────────▼──────────────────────────────────────▼────────────────┐
│                     Next.js 15 (standalone, Node 20)                   │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────────────────┐   │
│  │  App Router  │  │ Route Handlers │  │  Socket.IO Server          │   │
│  │  (RSC + UI)  │  │   (/api/*)     │  │  (server.js, /api/socket)  │   │
│  └──────┬───────┘  └───────┬───────┘  └──────────────┬─────────────┘   │
│         │   Middleware (auth + RBAC redirects)        │                 │
│  ┌──────▼──────────────────▼───────────────────────────▼────────────┐  │
│  │                       Service Layer                               │  │
│  │  task · bonus · compensation · analytics · notification · audit   │  │
│  └──────────────────────────┬────────────────────────────────────────┘ │
│  ┌──────────────────────────▼─────────────────────────────────────────┐│
│  │   Domain libs: scoring-engine · rbac · validations · datetime      ││
│  └──────────────────────────┬─────────────────────────────────────────┘│
└─────────────────────────────┼──────────────────────────────────────────┘
                              │ Prisma Client
                    ┌─────────▼──────────┐     ┌───────────────────────┐
                    │   PostgreSQL 16    │     │  External Providers   │
                    │  (primary store)   │     │  SMTP · WhatsApp Cloud │
                    └────────────────────┘     │  S3 (attachments)      │
                                               └───────────────────────┘
```

## 2. Layered Design

| Layer | Location | Responsibility |
| --- | --- | --- |
| **Presentation** | `src/app`, `src/components` | RSC pages, ShadCN UI, charts |
| **API / Transport** | `src/app/api/**/route.ts` | HTTP contracts, auth, validation, error envelopes |
| **Service / Orchestration** | `src/server/services` | Multi-step business transactions, notifications, audit |
| **Domain (pure)** | `src/lib` | Scoring engine, RBAC matrix, Zod schemas, date math |
| **Data Access** | `src/lib/prisma.ts` + Prisma | Type-safe persistence |
| **Realtime** | `server.js`, `src/server/realtime` | Socket.IO rooms & emitter bridge |

**Dependency rule:** layers depend downward only. The scoring engine and RBAC
are *pure* (no I/O) → unit-testable and reusable across API, cron, and seed.

## 3. Request Lifecycle (task approval example)

```
Manager clicks "Approve"
  → POST /api/tasks/:id/approve
    → requireUser()             (NextAuth session)
    → assertCan(role,'task.approve')   (RBAC)
    → approvalSchema.parse(body)        (Zod)
    → task.service.approveTaskCompletion()
        ├─ load active ScoringConfig (dept → global fallback)
        ├─ computeScore()  [pure engine]
        └─ prisma.$transaction:
             ├─ Task → COMPLETED (+ denormalized score fields)
             ├─ TaskStatusHistory + TaskApproval rows
             ├─ PointTransaction rows (BASE / EARLY_BONUS / LATE_PENALTY)
             └─ Compensation (if late ≥ threshold)
        → notify() ×N  (in-app + email + WhatsApp, best-effort)
        → emitToDepartment('task:completed')  (Socket.IO)
        → writeAudit('task.approve')
```

All point mutations happen **inside one DB transaction** → no partial scoring.
Side-effects (notifications, realtime, audit) run *after* commit so a failed
WhatsApp call never rolls back the award.

## 4. Authentication & Authorization

- **NextAuth (Auth.js v5)** with the Credentials provider + Prisma adapter.
- **JWT session strategy** — `role` and `id` are embedded in the token
  (`callbacks.jwt`) and surfaced on `session.user` (`callbacks.session`).
- **Middleware** (`src/middleware.ts`) gates every non-public route and redirects
  unauthenticated users to `/login`.
- **RBAC** (`src/lib/rbac.ts`) — a capability matrix maps each `Role` to a set of
  `Permission`s; `can()`/`assertCan()` are used in handlers and UI.

| Capability | SUPER_ADMIN | MANAGER | EMPLOYEE |
| --- | :---: | :---: | :---: |
| task.create / assign / approve | ✅ | ✅ | — |
| task.viewAll | ✅ | ✅ | (own only) |
| compensation.verify | ✅ | ✅ | — |
| bonus.publish | ✅ | ✅ | — |
| scoring/conversion.configure | ✅ | — | — |
| user/department.manage | ✅ | — | — |
| analytics.executive | ✅ | — | — |
| audit.view | ✅ | — | — |

## 5. Realtime

`server.js` boots Next and a Socket.IO server on the **same HTTP server** at
`/api/socket`. On connect, a socket joins `user:<id>` (and optionally
`department:<id>`). Services emit through `src/server/realtime/emitter.ts`, which
resolves the live `io` instance from `globalThis` (set by the custom server) —
avoiding a circular import between the runtime and the server entrypoint.

Events: `notification:new`, `task:completed`, `leaderboard:update`.

For multi-instance horizontal scaling, attach the **Socket.IO Redis adapter** so
rooms span pods (see Roadmap, Phase 6).

## 6. Background Jobs (scheduled)

Cron-triggered endpoints / workers (deployed as a sidecar or platform scheduler):

| Job | Cadence | Action |
| --- | --- | --- |
| Deadline reminders | hourly | `TASK_DUE_SOON` / `TASK_OVERDUE` notifications |
| Monthly bonus generation | 1st of month | `generateMonthlyBonuses()` |
| Badge evaluation | nightly | gamification engine vs. `Badge.criteria` |
| Leaderboard snapshot | nightly | cache rankings, emit `leaderboard:update` |

## 7. Scalability & Performance

- **Stateless app tier** (JWT sessions) → scale horizontally behind a load balancer.
- **Denormalized scoring fields** on `Task` (`awardedPoints`, `wasLate`,
  `daysLate`) and **period-bucketed** `PointTransaction (periodYear, periodMonth)`
  with composite indexes → fast monthly aggregation without scanning history.
- **React Server Components** stream dashboards; heavy aggregates computed in
  `analytics.service` with `Promise.all` fan-out.
- Add **Redis** for: Socket.IO adapter, rate limiting, and analytics caching.
- **Connection pooling** via PgBouncer / Prisma Accelerate for serverless.

## 8. Observability

- `/api/health` — liveness + DB readiness (used by Docker/K8s probes).
- Structured `console`/logger output; pluggable into Loki/Datadog.
- `AuditLog` table records actor, action, entity, metadata, IP, user-agent.

## 9. Technology Decisions

| Decision | Rationale |
| --- | --- |
| Modular monolith | Faster delivery, single deploy; clean seams for later extraction |
| JWT sessions | Stateless scaling; role travels with the token |
| Pure scoring engine | Deterministic, unit-testable, reusable |
| Per-component PointTransactions | Full auditability of every point earned/lost |
| Socket.IO on same server | One port, simpler ops; Redis adapter when scaling out |
| Prisma | Type-safe schema-first modeling, migrations, great DX |
