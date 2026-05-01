# Team Dashboard

Lightweight internal app for our ~10-person team to track:

1. **Big Rocks** — quarterly objectives
2. **Weekly Tasks & Priorities** — what each person is doing this week
3. **Customer Interrupts** — unplanned customer issues

Lives at `https://failsafe.amd.com/team-dashboard`.

See [PLAN.md](PLAN.md) for the full design.

## Stack

- **Backend** — FastAPI + SQLAlchemy async + Postgres 16 (port `5437`, container `8005`)
- **Frontend** — React 18 + TypeScript + Vite + MUI + DataGrid (port `5177`)
- **Reverse proxy** — failsafe nginx (`/team-dashboard/` and `/team-dashboard-api/`)
- **Auth** — light: pick-your-name dropdown stored in localStorage, sent as `X-User-Name`

## Run (with the rest of FailSafe)

From the workspace root:

```bash
docker compose up -d teamdash_db teamdash_backend teamdash_frontend nginx
```

First start auto-creates schema and seeds the team-member table from
`TEAMDASH_SEED_MEMBERS` in `.env`. Edit names later via the **Team** page.

## Endpoints

```
GET    /api/members
POST   /api/members
PATCH  /api/members/{id}
DELETE /api/members/{id}

GET    /api/big-rocks?quarter=&owner_id=&status=
POST   /api/big-rocks
PATCH  /api/big-rocks/{id}
DELETE /api/big-rocks/{id}

GET    /api/weekly-tasks?week_start=&owner_id=&status=
POST   /api/weekly-tasks
PATCH  /api/weekly-tasks/{id}
DELETE /api/weekly-tasks/{id}
POST   /api/weekly-tasks/copy-week     {owner_id, from_week, to_week}

GET    /api/interrupts?status=&owner_id=&customer=
POST   /api/interrupts
PATCH  /api/interrupts/{id}
DELETE /api/interrupts/{id}

GET    /api/activity?limit=100
GET    /api/stats
GET    /api/export?tables=big_rocks,weekly_tasks,...&format=xlsx|csv
```

## Project layout

```
team-dashboard/
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             FastAPI app + lifespan
│       ├── config.py           env-driven settings (DATABASE_URL, CORS, SEED_MEMBERS)
│       ├── database.py         async engine + session
│       ├── models.py           SQLAlchemy ORM (5 tables)
│       ├── schemas.py          Pydantic schemas
│       ├── deps.py             X-User-Name header dep
│       ├── audit.py            diff + activity_log writer
│       └── routers/
│           ├── members.py
│           ├── big_rocks.py
│           ├── weekly_tasks.py    (incl. /copy-week)
│           ├── interrupts.py
│           ├── activity.py
│           ├── stats.py           (KPI numbers for Home)
│           └── export.py          (xlsx multi-sheet, csv single)
└── frontend/
    ├── Dockerfile.dev
    ├── package.json
    ├── vite.config.ts          base=/team-dashboard, proxies /team-dashboard-api
    └── src/
        ├── main.tsx, App.tsx, theme.ts, types.ts, api.ts, store.ts
        ├── components/
        │   ├── Layout.tsx
        │   ├── UserPicker.tsx
        │   ├── ExportDialog.tsx
        │   └── ActivityDrawer.tsx
        └── pages/
            ├── Home.tsx        KPIs + this-week-by-person + rocks list
            ├── BigRocks.tsx    inline-editable DataGrid
            ├── Weekly.tsx      week picker + copy-last-week + grid
            ├── Interrupts.tsx  inline-editable grid
            ├── Team.tsx        manage roster
            └── Export.tsx      pick tables + format
```

## Audit log

Every create / update / delete to `team_members`, `big_rocks`, `weekly_tasks`,
`customer_interrupts` writes a row to `activity_log` with the user (from
`X-User-Name`), action, table, record id, and a JSON diff. Browse in the UI via
the clock icon in the top bar.

## Export

`GET /api/export?tables=big_rocks,weekly_tasks&format=xlsx` returns a single
workbook with one sheet per table. CSV is supported only for a single table.
