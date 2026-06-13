# API Reference — Rustika PMS

All endpoints are Next.js Route Handlers under `src/app/api`. Responses use a
consistent envelope:

```jsonc
// success
{ "ok": true, "data": { /* ... */ } }
// error
{ "ok": false, "error": "message", "issues": { /* zod flatten (422) */ } }
```

Auth: session cookie (NextAuth JWT). Mutating endpoints validate with Zod and
enforce RBAC via `assertCan()`. Errors map to `401 / 403 / 422 / 409 / 500`.

## Authentication

| Method | Path | Notes |
| --- | --- | --- |
| `GET/POST` | `/api/auth/[...nextauth]` | NextAuth handlers (sign-in, callback, session, sign-out) |

Sign in (credentials) is performed client-side via `signIn('credentials', …)`.

## Tasks

| Method | Path | Role | Body / Query | Description |
| --- | --- | --- | --- | --- |
| `GET` | `/api/tasks?status=` | any | query `status?` | List tasks (employees see own; managers/admins see all) |
| `POST` | `/api/tasks` | manager+ | `createTaskSchema` | Create & assign; notifies assignee |
| `GET` | `/api/tasks/:id` | owner/manager+ | — | Full task detail (attachments, history, approvals, compensation, points) |
| `PATCH` | `/api/tasks/:id` | assignee | `{ progress }` | Update progress; auto `TODO→IN_PROGRESS` |
| `POST` | `/api/tasks/:id/submit` | assignee | — | Submit for review (`→ SUBMITTED`) |
| `POST` | `/api/tasks/:id/approve` | manager+ | `{ decision, note? }` | Approve (runs scoring) or reject (`→ IN_PROGRESS`) |

### `createTaskSchema`
```ts
{
  title: string(3..200),
  description?: string(<=5000),
  assigneeId: cuid,
  departmentId?: cuid,
  difficulty: 'TRIVIAL'|'EASY'|'MEDIUM'|'HARD'|'CRITICAL' = 'MEDIUM',
  weight: number(0.1..10) = 1,
  basePoints: int(0..10000) = 100,
  startDate: date,
  deadline: date,   // must be > startDate
}
```

### Approve response (excerpt)
```jsonc
{
  "ok": true,
  "data": {
    "task": { "id": "…", "status": "COMPLETED", "awardedPoints": 245 },
    "breakdown": {
      "adjustedBase": 225, "earlyBonus": 20, "latePenalty": 0,
      "netPoints": 245, "wasLate": false,
      "compensationRequired": false, "requiredWorkdays": 0
    }
  }
}
```

## Compensation

| Method | Path | Role | Body | Description |
| --- | --- | --- | --- | --- |
| `POST` | `/api/compensation/workday` | employee (owner) | `compensationWorkdaySchema` | Log a weekend/holiday make-up day |
| `POST` | `/api/compensation/:id/verify` | manager+ | — | Verify obligation; restores `pointsToRestore` |

`compensationWorkdaySchema`: `{ compensationId, workDate, hours(0..24)=8, note?, proofUrl? }`.
Workdays **must** fall on a weekend or registered `Holiday`, else `400`.

## Points, Conversion & Bonus

| Method | Path | Role | Body | Description |
| --- | --- | --- | --- | --- |
| `POST` | `/api/bonus/publish` | manager+ | `{ year, month }` | Recompute then publish bonuses; notifies employees |

(Scoring & conversion configuration endpoints — `PUT /api/admin/scoring-config`,
`POST /api/admin/conversion-rate` — are admin-only; see roadmap Phase 2.)

## Analytics

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/api/analytics/executive` | admin | KPIs + employee ranking + department ranking + 12-mo trend + heatmap |

### Executive payload
```jsonc
{
  "kpis": { "activeTasks": 12, "completedTasks": 88, "lateTasks": 7,
            "employees": 24, "totalPoints": 18450, "onTimeRate": 92 },
  "employees": [ { "rank":1, "name":"…", "department":"…", "points":1240 } ],
  "departments": [ { "id":"…", "name":"Engineering", "points":8200 } ],
  "trend": [ { "period":"2026-06", "completed":18, "points":2100 } ],
  "heatmap": { "2026-06-12": 4 },
  "period": { "year":2026, "month":6 }
}
```

## Notifications

| Method | Path | Role | Description |
| --- | --- | --- | --- |
| `GET` | `/api/notifications?unread=true` | self | List + unread count |
| `PATCH` | `/api/notifications` | self | Mark all (or `{ id }`) read |

## Platform

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness + DB readiness (`200` ok / `503` degraded) |

## Realtime (Socket.IO)

Path `/api/socket`. Handshake `auth: { userId }` joins `user:<id>`.

| Event | Payload | Direction |
| --- | --- | --- |
| `notification:new` | `Notification` | server → client |
| `task:completed` | `{ taskId, points }` | server → client (department room) |
| `leaderboard:update` | ranking snapshot | server → client (broadcast) |
| `join:department` | `departmentId` | client → server |

## Reports (planned, Phase 4)

| Method | Path | Output |
| --- | --- | --- |
| `GET` | `/api/reports/monthly?year=&month=&format=pdf\|xlsx` | PDF (pdfkit) / Excel (exceljs) |
| `GET` | `/api/reports/annual?year=&format=` | Annual summary |

## Error Codes

| Status | Meaning |
| --- | --- |
| `401` | Not authenticated |
| `403` | Authenticated but missing permission |
| `409` | Invalid state transition (e.g. submit from `COMPLETED`) |
| `422` | Zod validation failed (see `issues`) |
| `500` | Unhandled server error (logged) |
