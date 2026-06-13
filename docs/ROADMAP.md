# Development Roadmap — Rustika PMS

A phased plan from foundation to enterprise scale. Each phase ships independently
deployable value. ✅ = scaffolded in this repository, ◻ = planned.

## Phase 0 — Foundation ✅ (this repository)
- ✅ Project scaffold: Next.js 15, TypeScript, Tailwind, ShadCN
- ✅ Prisma schema (all domains) + seed
- ✅ NextAuth (credentials + JWT) + RBAC matrix + middleware
- ✅ Scoring engine (pure) + service layer (task/bonus/compensation/analytics)
- ✅ Core API routes + role-aware dashboards
- ✅ Socket.IO custom server + emitter bridge
- ✅ Docker multi-stage + compose + health probe
- ✅ Architecture / DB / API / Wireframe / Deployment docs

## Phase 1 — Task Management (Weeks 1–3)
- ◻ Task CRUD UI: create/edit drawer, filters, board (Kanban) & list views
- ◻ File attachments to S3-compatible storage (presigned uploads)
- ◻ Comments UI + mentions
- ◻ Full approval workflow UI (queue, modal, predicted-score preview)
- ◻ Optimistic updates via React Query; realtime board sync
- **Exit:** a task can flow create → submit → approve with files & comments.

## Phase 2 — Points, Conversion & Compensation (Weeks 3–5)
- ◻ Admin Scoring Config editor (validated) + per-department overrides
- ◻ Conversion Rate management (effective-dated) UI
- ◻ Points ledger view per employee; correction (reversing) entries
- ◻ Compensation flow UI: obligation list, log workday, proof upload, verify
- ◻ Holiday calendar management
- **Exit:** late task auto-creates compensation; verification restores points.

## Phase 3 — Dashboards & Analytics (Weeks 5–7)
- ◻ Executive: department bar ranking, bonus & point analytics, **forecasting**
  (linear/seasonal projection of next-month points)
- ◻ Heatmap component (calendar contribution grid)
- ◻ Manager: live team activity feed (Socket.IO), productivity reports
- ◻ Drill-downs & date-range filters; CSV quick-export
- **Exit:** executives can answer "who/what/trend/forecast" without SQL.

## Phase 4 — Notifications & Reports (Weeks 7–9)
- ◻ Email provider (Resend/SMTP via nodemailer) with templates
- ◻ WhatsApp Cloud API templated messages + delivery webhooks
- ◻ In-app notification center (mark read, deep links, realtime badge)
- ◻ PDF reports (pdfkit) + Excel (exceljs): monthly & annual, per-user & company
- ◻ Scheduled jobs: deadline reminders, monthly bonus generation, badge eval
- **Exit:** stakeholders receive multi-channel, branded notifications & reports.

## Phase 5 — Gamification (Weeks 9–10)
- ◻ Badge evaluation engine (criteria JSON → nightly award + realtime toast)
- ◻ Achievements timeline, leaderboard filters (period/department)
- ◻ Streaks, seasons, team challenges
- **Exit:** engagement loop live with badges & leaderboards.

## Phase 6 — Hardening & Scale (Weeks 10–12)
- ◻ Redis: Socket.IO adapter (multi-pod), rate limiting, analytics cache
- ◻ Background worker (BullMQ) separated from web tier
- ◻ Observability: structured logs → Loki, metrics → Prometheus, tracing (OTel)
- ◻ Test suite: Vitest (engine/services), Playwright (E2E), CI gates
- ◻ Security: pen-test pass, CSP, secrets rotation, 2FA, SSO (OIDC/SAML)
- ◻ k8s manifests / Helm chart; blue-green deploy; automated DB backups
- **Exit:** horizontally scalable, observable, secured production system.

## Phase 7 — Extensions (Backlog)
- ◻ Native mobile (Expo) consuming the same API
- ◻ OKR / quarterly targets linked to tasks
- ◻ Payroll/HRIS integration for bonus disbursement
- ◻ AI assist: task estimation, anomaly detection, performance summaries
- ◻ Multi-tenant / multi-company support

## Milestone Summary

| Milestone | Phase | Target |
| --- | --- | --- |
| MVP (tasks + scoring + dashboards) | 0–2 | Week 5 |
| Beta (analytics + notifications + reports) | 3–4 | Week 9 |
| GA (gamification + hardening) | 5–6 | Week 12 |

## Team & Effort (indicative)

| Role | Allocation |
| --- | --- |
| Tech Lead / Full-stack | 1.0 |
| Full-stack engineers | 2.0 |
| Frontend/UI engineer | 1.0 |
| QA | 0.5 |
| Product/Design | 0.5 |

## Quality Gates (every phase)
- `npm run typecheck && npm run lint` clean
- Unit tests for new engine/service logic
- Migration reviewed; seed updated
- Docs updated (API/DB) for any contract change
