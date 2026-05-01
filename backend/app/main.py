from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import create_tables, dispose_engine, init_engine
from .routers import (
    activity,
    big_rocks,
    custom_columns,
    export,
    interrupts,
    members,
    stats,
    weekly_tasks,
    weekly_notes,
)
from .ws import manager

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"{settings.APP_NAME} v{settings.APP_VERSION} starting...")
    init_engine(settings.DATABASE_URL)
    from . import models  # noqa: F401  -- ensure models registered with Base
    from .database import async_session_factory, engine
    await create_tables()

    # Lightweight migration: add columns introduced after initial deploy.
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE team_members "
            "ADD COLUMN IF NOT EXISTS location VARCHAR(120) DEFAULT '' NOT NULL"
        ))
        await conn.execute(text(
            "ALTER TABLE team_members "
            "ADD COLUMN IF NOT EXISTS manager_id INTEGER "
            "REFERENCES team_members(id) ON DELETE SET NULL"
        ))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_team_members_manager_id "
            "ON team_members(manager_id)"
        ))
        # Add custom_fields JSONB columns to all main tables
        for tbl in ("big_rocks", "weekly_tasks", "customer_interrupts", "team_members"):
            await conn.execute(text(
                f"ALTER TABLE {tbl} "
                "ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}' NOT NULL"
            ))

    seed_names = [n.strip() for n in settings.SEED_MEMBERS.split(",") if n.strip()]
    if seed_names:
        await members.seed_members(async_session_factory, seed_names)
    print("DB ready.")
    yield
    await dispose_engine()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(members.router, prefix="/api/members", tags=["members"])
app.include_router(big_rocks.router, prefix="/api/big-rocks", tags=["big-rocks"])
app.include_router(weekly_tasks.router, prefix="/api/weekly-tasks", tags=["weekly-tasks"])
app.include_router(interrupts.router, prefix="/api/interrupts", tags=["interrupts"])
app.include_router(activity.router, prefix="/api/activity", tags=["activity"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(custom_columns.router, prefix="/api/custom-columns", tags=["custom-columns"])
app.include_router(weekly_notes.router, prefix="/api/weekly-notes", tags=["weekly-notes"])


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, user_name: str = ""):
    await manager.connect(websocket, user_name)
    try:
        while True:
            data = await websocket.receive_text()
            # Clients can send JSON to update their identity
            try:
                msg = __import__("json").loads(data)
                if msg.get("type") == "identify" and msg.get("user_name"):
                    manager.active_connections[websocket] = msg["user_name"]
                    await manager._broadcast_presence()
            except Exception:
                pass
    except WebSocketDisconnect:
        await manager.disconnect(websocket)


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
