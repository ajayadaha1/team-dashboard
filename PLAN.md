# Team Dashboard — Plan

A lightweight internal web app for our ~10-person team to track:

1. **Big Rocks** — quarterly objectives (the long-horizon stuff)
2. **Weekly Tasks & Priorities** — what each person is doing this week
3. **Customer Interrupts** — unplanned customer issues that derailed planned work

Hosted at `https://failsafe.amd.com/team-dashboard`.

---

## Why these three views

| Track            | Question it answers                                                       | Cadence  |
|------------------|---------------------------------------------------------------------------|----------|
| Big Rocks        | What are our quarterly objectives, who owns each, are we on track?        | Quarterly, updated weekly |
| Weekly Tasks     | What is each person doing this week, at what priority, blocked on what?   | Weekly   |
| Customer Interrupts | What unplanned customer work hit us, who's on it, how much time is it eating? | Ad-hoc |

Big Rocks ↔ Weekly Tasks are linkable so a task can roll up to a rock. Interrupts are
intentionally **not** linked to rocks — they're the visibility for *unplanned* work that
explains why rocks slip.

---

## Stack (matches existing FailSafe services)

- **Backend:** FastAPI 0.109 + SQLAlchemy 2 async + asyncpg + Pydantic v2
- **DB:** Postgres 16 (dedicated `teamdash_db` container, port 5437)
- **Frontend:** React 18 + TypeScript + Vite + MUI v5 (dark theme matching TicketTracker)
- **Reverse proxy:** existing failsafe nginx, paths `/team-dashboard/` and `/team-dashboard-api/`
- **Export:** `openpyxl` for `.xlsx`, stdlib `csv` for CSV
- **Auth:** light — user picks their name once (stored in localStorage), passed as
  `X-User-Name` header. Backend trusts it for audit-log attribution. Behind corporate
  network already; OAuth can be bolted on later if needed.

---

## Data model

```
team_members        big_rocks                weekly_tasks            customer_interrupts
─────────────       ───────────────          ───────────────         ─────────────────────
id PK               id PK                    id PK                   id PK
name                title                    owner_id FK members     customer
email               description              week_start (Mon date)   owner_id FK members
github_handle       owner_id FK members      title                   title
role                quarter (e.g. 2026Q2)    priority (P0-P3)        severity (Sev1-4)
active bool         status                   status                  status
                    target_date              big_rock_id? FK         reported_date
                    progress_pct (0-100)     notes                   resolved_date?
                    notes                    created/updated_at      jira_link
                    created/updated_at                               hours_spent
                                                                     description
                                                                     created/updated_at

activity_log
─────────────
id PK
user_name
table_name
record_id
action (create|update|delete)
diff_json
created_at
```

All tables have `created_at` / `updated_at` timestamps. `activity_log` is append-only.

---

## Endpoints

```
GET    /api/members                              POST  /api/members
PATCH  /api/members/{id}                         DELETE /api/members/{id}

GET    /api/big-rocks         ?quarter=&owner_id=&status=
POST   /api/big-rocks
PATCH  /api/big-rocks/{id}
DELETE /api/big-rocks/{id}

GET    /api/weekly-tasks      ?week_start=&owner_id=&status=
POST   /api/weekly-tasks
PATCH  /api/weekly-tasks/{id}
DELETE /api/weekly-tasks/{id}
POST   /api/weekly-tasks/copy-week     body: {owner_id, from_week, to_week}

GET    /api/interrupts        ?status=&owner_id=&customer=
POST   /api/interrupts
PATCH  /api/interrupts/{id}
DELETE /api/interrupts/{id}

GET    /api/activity?limit=100
GET    /api/export?tables=big_rocks,weekly_tasks,interrupts&format=xlsx|csv
GET    /api/stats             (KPI numbers for Home page)
```

---

## Pages

- **Home (`/`)** — KPI tiles (open interrupts, at-risk rocks, blocked tasks),
  this-week task list grouped by person, big-rocks status table.
- **Big Rocks (`/big-rocks`)** — sortable/filterable table, inline edit, add row.
- **Weekly (`/weekly`)** — week-picker at top, table grouped by owner. **"Copy last
  week's tasks"** button per person.
- **Interrupts (`/interrupts`)** — table, filterable by customer/status/severity.
- **Team (`/team`)** — manage roster.
- **Export (`/export`)** — pick tables + format, download.

---

## Files

```
team-dashboard/
├── README.md
├── PLAN.md                          (this file)
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models.py
│       ├── schemas.py
│       ├── deps.py                  # current-user header dep
│       ├── audit.py                 # diff + activity_log writer
│       └── routers/
│           ├── __init__.py
│           ├── members.py
│           ├── big_rocks.py
│           ├── weekly_tasks.py
│           ├── interrupts.py
│           ├── activity.py
│           ├── export.py
│           └── stats.py
└── frontend/
    ├── Dockerfile.dev
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── theme.ts
        ├── api.ts                   # axios + X-User-Name header
        ├── store.ts                 # zustand: currentUser, members cache
        ├── types.ts
        ├── components/
        │   ├── Layout.tsx
        │   ├── UserPicker.tsx
        │   ├── ExportDialog.tsx
        │   └── ActivityDrawer.tsx
        └── pages/
            ├── Home.tsx
            ├── BigRocks.tsx
            ├── Weekly.tsx
            ├── Interrupts.tsx
            ├── Team.tsx
            └── Export.tsx
```

Infra changes (top-level):
- `nginx.conf`              — add 2 location blocks
- `docker-compose.yml`      — add 3 services + 1 volume + nginx depends_on
- `.env`                    — add TEAMDASH_POSTGRES_* + TEAMDASH_SECRET_KEY
- `index.html`              — add tool card

---

## Future (not v1)

- Slack notifier for new Sev-1/2 interrupts
- Jira sync for interrupts (we already have Atlassian creds in TicketTracker)
- Per-person weekly markdown export for status-report copy-paste
- OAuth via the same GitHub Enterprise client used by L3_Debug
