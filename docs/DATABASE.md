# Database Schema & ERD — Rustika PMS

PostgreSQL 16 · Prisma 6. Full source: [`prisma/schema.prisma`](../prisma/schema.prisma).

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    User ||--o{ Task : "assigned (assignee)"
    User ||--o{ Task : "created (creator)"
    User ||--o{ PointTransaction : earns
    User ||--o{ MonthlyBonus : receives
    User ||--o{ Compensation : owes
    User ||--o{ UserBadge : holds
    User ||--o{ Achievement : unlocks
    User ||--o{ Notification : receives
    User ||--o{ TaskComment : writes
    User ||--o{ TaskApproval : reviews
    User ||--o{ AuditLog : performs
    User }o--|| Department : "member of"
    User |o--o{ User : "manages (manager→reports)"
    Department |o--|| User : "headed by"

    Task ||--o{ TaskAttachment : has
    Task ||--o{ TaskComment : has
    Task ||--o{ TaskApproval : has
    Task ||--o{ TaskStatusHistory : has
    Task ||--o{ PointTransaction : generates
    Task |o--|| Compensation : "may trigger"
    Task }o--|| Department : "belongs to"

    Compensation ||--o{ CompensationWorkday : "served by"
    Badge ||--o{ UserBadge : awarded
    ConversionRate ||..|| MonthlyBonus : "rate snapshot"
    ScoringConfig ||..|| Task : "scores (via engine)"

    User {
        string id PK
        string email UK
        string name
        string passwordHash
        string phone
        enum   role
        string departmentId FK
        string managerId FK
        bool   isActive
    }
    Department {
        string id PK
        string name UK
        string headId FK
        string colorHex
    }
    Task {
        string id PK
        string code UK
        string title
        enum   status
        enum   difficulty
        float  weight
        int    basePoints
        datetime startDate
        datetime deadline
        datetime completedAt
        int    progress
        int    awardedPoints
        bool   wasLate
        int    daysLate
        string assigneeId FK
        string creatorId FK
        string departmentId FK
    }
    PointTransaction {
        string id PK
        string userId FK
        string taskId FK
        enum   type
        int    points
        int    periodYear
        int    periodMonth
    }
    ScoringConfig {
        string id PK
        string departmentId UK
        float  multMedium
        int    earlyBonusPerDay
        int    latePenaltyPerDay
        int    compensationThresholdDays
    }
    ConversionRate {
        string id PK
        int    rupiahPerPoint
        bool   isActive
        datetime effectiveFrom
    }
    MonthlyBonus {
        string id PK
        string userId FK
        int    periodYear
        int    periodMonth
        int    totalPoints
        int    netAmount
        bool   isPublished
    }
    Compensation {
        string id PK
        string taskId UK
        string userId FK
        enum   status
        int    daysLate
        float  requiredWorkdays
        float  servedWorkdays
        int    pointsToRestore
    }
    CompensationWorkday {
        string id PK
        string compensationId FK
        datetime workDate
        float  hours
        bool   verified
    }
    Notification {
        string id PK
        string userId FK
        enum   type
        enum   channel
        bool   isRead
    }
    Badge {
        string id PK
        string key UK
        enum   tier
        json   criteria
    }
    AuditLog {
        string id PK
        string actorId FK
        string action
        string entity
        json   metadata
    }
```

## 2. Domains & Tables

### Identity & Organization
| Model | Purpose |
| --- | --- |
| `User` | People + auth + role + org links (department, manager→reports self-relation) |
| `Department` | Org unit; optional `head` (a User); members & tasks |
| `Account` / `Session` / `VerificationToken` | NextAuth adapter tables |

### Task Management
| Model | Purpose |
| --- | --- |
| `Task` | Core work item. Lifecycle in `status`; scoring inputs (`basePoints`, `difficulty`, `weight`); denormalized results (`awardedPoints`, `wasLate`, `daysLate`) |
| `TaskAttachment` | Uploaded files (S3 URL + metadata) |
| `TaskComment` | Threaded discussion |
| `TaskApproval` | Reviewer decision record |
| `TaskStatusHistory` | Immutable audit of every status transition |

### Points & Money
| Model | Purpose |
| --- | --- |
| `PointTransaction` | Append-only ledger; one row per scoring component; bucketed by `(periodYear, periodMonth)` |
| `ScoringConfig` | Tunable multipliers, bonus/penalty rates & caps, compensation rules (global or per-department) |
| `ConversionRate` | Effective-dated `rupiahPerPoint` |
| `MonthlyBonus` | Per-user, per-period computed bonus with published lock |

### Compensation
| Model | Purpose |
| --- | --- |
| `Compensation` | Obligation opened when a task is late beyond threshold |
| `CompensationWorkday` | Logged weekend/holiday make-up days, with proof & verification |

### Gamification / Notifications / Platform
| Model | Purpose |
| --- | --- |
| `Badge` / `UserBadge` / `Achievement` | Gamification |
| `Notification` | Multi-channel (`IN_APP`/`EMAIL`/`WHATSAPP`) with delivery tracking |
| `AuditLog` | Security/compliance trail |
| `SystemSetting` | Arbitrary JSON config |
| `Holiday` | Non-working days for SLA & compensation date math |

## 3. Enums

- `Role` — `SUPER_ADMIN | MANAGER | EMPLOYEE`
- `TaskStatus` — `DRAFT → PENDING_APPROVAL → TODO → IN_PROGRESS → SUBMITTED → APPROVED/REJECTED → COMPLETED | CANCELLED`
- `Difficulty` — `TRIVIAL | EASY | MEDIUM | HARD | CRITICAL`
- `PointType` — `BASE | EARLY_BONUS | LATE_PENALTY | … | COMPENSATION_CREDIT`
- `CompensationStatus` — `OPEN | IN_PROGRESS | SUBMITTED | VERIFIED | WAIVED`
- `NotificationType` / `NotificationChannel` / `BadgeTier` / `ApprovalDecision`

## 4. Task Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> TODO: create & assign
    TODO --> IN_PROGRESS: progress > 0
    IN_PROGRESS --> SUBMITTED: employee submits
    SUBMITTED --> COMPLETED: manager approves (scoring runs)
    SUBMITTED --> IN_PROGRESS: manager rejects
    IN_PROGRESS --> CANCELLED
    COMPLETED --> [*]
    CANCELLED --> [*]
```

## 5. Indexing Strategy

| Index | Why |
| --- | --- |
| `PointTransaction(userId, periodYear, periodMonth)` | O(log n) monthly point aggregation per user |
| `Task(status)`, `Task(deadline)`, `Task(assigneeId)` | Dashboard & reminder queries |
| `Notification(userId, isRead)` | Unread badge counts |
| `MonthlyBonus(userId, periodYear, periodMonth)` UK | Idempotent upsert per period |
| `Compensation(userId)`, `Compensation(status)` | Obligation lookups |
| `AuditLog(entity, entityId)`, `AuditLog(createdAt)` | Compliance search |

## 6. Data Integrity Rules

- Point awards are **append-only** — corrections add reversing rows, never edits.
- All scoring writes occur in a **single transaction** with the task transition.
- `Compensation` is 1:1 with `Task` (`taskId UK`); `pointsToRestore` is credited
  back via a `COMPENSATION_CREDIT` transaction only on `VERIFIED`.
- `MonthlyBonus` `update` is skipped once `isPublished = true` (amount lock).
- Cascade deletes: child rows (`TaskAttachment`, `CompensationWorkday`, …) follow
  their parent; org references (`departmentId`, `managerId`) use `SetNull`.

## 7. Migrations

```bash
npm run prisma:migrate     # dev: create + apply a named migration
npm run prisma:deploy      # prod: apply committed migrations
npm run prisma:studio      # visual data browser
```
