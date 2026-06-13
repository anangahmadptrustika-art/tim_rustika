# UI Wireframes & Dashboard Designs — Rustika PMS

Low-fidelity ASCII wireframes describing layout, components, and data per
screen. Visual system: ShadCN "new-york" style, indigo primary (`243 75% 59%`),
rounded-xl cards, Inter font, light/dark themes, fully mobile-responsive
(sidebar collapses to a bottom/hamburger nav < `lg`).

## Design System

| Token | Value |
| --- | --- |
| Primary | Indigo `#6366f1` |
| Success / Warning / Destructive | Emerald / Amber / Red |
| Radius | `0.65rem` (`rounded-xl` cards) |
| Typography | Inter; 2xl bold headings, sm muted labels |
| Spacing | 6-unit page padding, 4–6 gap grids |
| Breakpoints | `sm` 640 · `lg` 1024 (sidebar) · `2xl` 1400 (container) |

## Global Shell

```
┌──────────┬───────────────────────────────────────────────────────────┐
│ ░ R PMS  │  Welcome back                       🔔(3)   ◯ Maya  [⎋]    │  ← Topbar
│──────────│───────────────────────────────────────────────────────────│
│ ▣ Dash   │                                                           │
│ ☑ Tasks  │                                                           │
│ ⧖ Approv │                  << page content >>                       │
│ 🏆 Board │                                                           │
│ 🪙 Reward│                                                           │
│ 📊 Analyt│                                                           │
│ 👥 Team  │                                                           │
│ ⚙ Setting│                                                           │
└──────────┴───────────────────────────────────────────────────────────┘
  Sidebar (role-filtered nav)        Main (scroll)
```

## 1. Login

```
            ┌───────────────────────────┐
            │          ( ░ R )          │
            │        Rustika PMS        │
            │  Sign in to your dashboard│
            │  Email    [____________]  │
            │  Password [____________]  │
            │  [      Sign in       ]   │
            │  Demo: admin@… / Pass…    │
            └───────────────────────────┘
       Gradient backdrop (primary → background)
```

## 2. Executive Dashboard (Super Admin)

```
Executive Overview                                  2026-06
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│☑ Active 12 │ │✓ Done 88   │ │⏰ Late 7   │ │👥 Emp 24   │   ← StatCards
│            │ │  success   │ │ 92% ontime │ │            │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
┌───────────────────────────────────┐ ┌──────────────────────┐
│ Productivity Trend (12 mo)        │ │ 🏆 Top Performers     │
│   ╱╲      ╱╲___                    │ │ ① Adi      1240 pts   │
│  ╱  ╲___╱      ╲   (area: points) │ │ ② Citra     980 pts   │
│ ╱               ╲  (line: done)   │ │ ③ Budi      870 pts   │
└───────────────────────────────────┘ └──────────────────────┘
┌───────────────────────────────────┐ ┌──────────────────────┐
│ Department Ranking (bar)          │ │ Completion Heatmap    │
│ Engineering ████████ 8200         │ │ M T W T F S S         │
│ Sales       █████ 5100            │ │ ▢▣▣▢▣▢▢  (12 weeks)  │
└───────────────────────────────────┘ └──────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ Bonus Analytics  ·  Point Analytics  ·  Forecast (next mo ↑)│
└──────────────────────────────────────────────────────────────┘
```

## 3. Manager Dashboard

```
Team Performance — Engineering
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Team Tasks │ │ Pending ✅ │ │ Team Pts   │ │ Late Rate  │
│    34      │ │   5 approv │ │   6,400    │ │    8%      │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
┌───────────────────────────────────┐ ┌──────────────────────┐
│ ⧖ Approval Queue                  │ │ Live Team Activity 🟢 │
│ ▸ "API refactor" — Adi  [✓][✗]   │ │ • Budi submitted …    │
│ ▸ "Q2 deck"      — Citra[✓][✗]   │ │ • Adi completed … +245│
│ ▸ "Bugfix #221"  — Budi [✓][✗]   │ │ (Socket.IO stream)    │
└───────────────────────────────────┘ └──────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│ Member table: Name | Active | Done | Late | Points | Trend    │
└──────────────────────────────────────────────────────────────┘
```

### Approval Modal
```
┌─────────────────────────────────────────┐
│ Review: "API refactor"            ✕      │
│ Assignee Adi · HARD · weight 1.5         │
│ Deadline Jun 10 · Submitted Jun 9 (1d ↑) │
│ Predicted score:  +245 pts               │
│   base 225 · early +20 · late 0          │
│ Attachments: pr-link.pdf                 │
│ Note [______________________________]    │
│            [ Reject ]   [ Approve +245 ] │
└─────────────────────────────────────────┘
```

## 4. Employee Dashboard

```
My Performance                                       2026-06
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ Active 4   │ │ Points 320 │ │ Est. Bonus │ │ Compensat. │
│            │ │  success   │ │ Rp 320.000 │ │  1 open ⚠  │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
┌──────────────────────────────────────────────────────────────┐
│ My Tasks                                                     │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ API refactor                              [SUBMITTED] ⚠   │ │
│ │ Due Jun 10 · HARD · weight 1.5                           │ │
│ │ ▓▓▓▓▓▓▓▓▓▓ 100%                          [ Submit ]      │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Write tests                               [IN_PROGRESS]  │ │
│ │ Due Jun 14 · MEDIUM · weight 1.0                         │ │
│ │ ▓▓▓▓▓░░░░░ 50%    [── progress ──]      [ Submit ]      │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Compensation Screen
```
Compensation Obligation — "Deploy script" (3 days late)
Required: 3 weekend workdays · Served: 1 · Restore: 45 pts
┌──────────────────────────────────────────────────────────────┐
│ Log workday:  Date [Sat 14 Jun ▾]  Hours [8]  Proof [upload] │
│               Note [_______________]            [ + Log day ] │
│ Logged: Sat 7 Jun · 8h · ✓ pending verification              │
└──────────────────────────────────────────────────────────────┘
Status: IN_PROGRESS → submit when served ≥ required → manager verifies
```

## 5. Task Detail

```
TSK-00012 · API refactor                         [COMPLETED]
Assignee Adi · Creator Maya · Engineering · HARD · weight 1.5
Timeline: Start Jun 1 ─────●───── Deadline Jun 10 · Done Jun 9
Score: +245  (base 225 · early +20 · penalty 0)
┌─ Tabs: Details │ Attachments(2) │ Comments(3) │ History │ Points ─┐
│ History: TODO→IN_PROGRESS→SUBMITTED→COMPLETED (with actors/times)  │
│ Points : BASE +225 · EARLY_BONUS +20                              │
└────────────────────────────────────────────────────────────────────┘
```

## 6. Leaderboard / Gamification

```
🏆 Leaderboard — June 2026          [ Month ▾ ] [ Dept: All ▾ ]
① Adi Pratama   Engineering  ▓▓▓▓▓▓▓▓ 1240   🥇 +badges
② Citra Dewi    Sales        ▓▓▓▓▓▓   980    🥈
③ Budi Santoso  Engineering  ▓▓▓▓▓    870    🥉
…
My Badges: [Early Bird]  [Centurion]  [Flawless 🔒]
```

## 7. Admin Settings

```
Settings
├─ Scoring Config: difficulty multipliers, early/late rates & caps,
│   compensation threshold & days-per-late-day      [ Save ]
├─ Conversion Rate: Rp [1000] / point  (effective from [date]) [ Add ]
├─ Departments: CRUD + assign head
├─ Users: invite, role, activate/deactivate, manager assignment
└─ Holidays: calendar of non-working days
```

## Responsive Behavior

- **< lg:** sidebar → hamburger drawer; StatCards stack 1-col → 2-col.
- Tables become stacked cards on mobile; charts keep `ResponsiveContainer`.
- Topbar condenses (avatar + bell only); name hidden < `sm`.
