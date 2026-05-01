from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .. import audit
from ..database import get_async_session
from ..deps import current_user
from ..models import WeeklyTask
from ..schemas import (
    CopyWeekRequest,
    WeeklyTaskCreate,
    WeeklyTaskOut,
    WeeklyTaskUpdate,
)
from ..ws import manager

router = APIRouter()


def _monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _to_out(t: WeeklyTask) -> dict:
    d = {c.name: getattr(t, c.name) for c in t.__table__.columns}
    d["owner_name"] = t.owner.name if t.owner else None
    d["big_rock_title"] = t.big_rock.title if t.big_rock else None
    return d


@router.get("", response_model=list[WeeklyTaskOut])
async def list_tasks(
    week_start: Optional[date] = None,
    owner_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = (
        select(WeeklyTask)
        .options(selectinload(WeeklyTask.owner), selectinload(WeeklyTask.big_rock))
        .order_by(WeeklyTask.week_start.desc(), WeeklyTask.priority, WeeklyTask.id)
    )
    if week_start:
        stmt = stmt.where(WeeklyTask.week_start == _monday(week_start))
    if owner_id is not None:
        stmt = stmt.where(WeeklyTask.owner_id == owner_id)
    if status_filter:
        stmt = stmt.where(WeeklyTask.status == status_filter)
    rows = (await session.execute(stmt)).scalars().all()
    return [_to_out(r) for r in rows]


@router.post("", response_model=WeeklyTaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: WeeklyTaskCreate,
    user: str = Depends(current_user),
    session: AsyncSession = Depends(get_async_session),
):
    data = payload.model_dump()
    data["week_start"] = _monday(data["week_start"])
    obj = WeeklyTask(**data)
    session.add(obj)
    # Capture audit data before flush
    audit_data = {k: audit._jsonable(v) for k, v in data.items()}
    await session.flush()
    audit_data["id"] = obj.id
    await audit.log(session, user, "weekly_tasks", obj.id, "create", audit_data)
    await session.commit()
    # Re-fetch with relationships eagerly loaded
    obj = (await session.execute(
        select(WeeklyTask)
        .options(selectinload(WeeklyTask.owner), selectinload(WeeklyTask.big_rock))
        .where(WeeklyTask.id == obj.id)
    )).scalar_one()
    out = _to_out(obj)
    await manager.broadcast({"type": "task_created", "task": out, "sender": user})
    return out


@router.patch("/{task_id}", response_model=WeeklyTaskOut)
async def update_task(
    task_id: int,
    payload: WeeklyTaskUpdate,
    user: str = Depends(current_user),
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(WeeklyTask).where(WeeklyTask.id == task_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Task not found")
    before = audit.model_to_dict(obj)
    updates = payload.model_dump(exclude_unset=True)
    if "week_start" in updates and updates["week_start"]:
        updates["week_start"] = _monday(updates["week_start"])
    for k, v in updates.items():
        setattr(obj, k, v)
    # Build after dict before flush to avoid expired-attribute access
    after = {**before, **{k: audit._jsonable(v) for k, v in updates.items()}}
    await session.flush()
    await audit.log(session, user, "weekly_tasks", obj.id, "update",
                    audit.diff(before, after))
    await session.commit()
    # Re-fetch with relationships eagerly loaded
    obj = (await session.execute(
        select(WeeklyTask)
        .options(selectinload(WeeklyTask.owner), selectinload(WeeklyTask.big_rock))
        .where(WeeklyTask.id == task_id)
    )).scalar_one()
    out = _to_out(obj)
    await manager.broadcast({"type": "task_updated", "task": out, "sender": user})
    return out


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    user: str = Depends(current_user),
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(WeeklyTask).where(WeeklyTask.id == task_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Task not found")
    snap = audit.model_to_dict(obj)
    week_start_str = snap.get("week_start", "")
    if hasattr(week_start_str, 'isoformat'):
        week_start_str = week_start_str.isoformat()
    await session.delete(obj)
    await audit.log(session, user, "weekly_tasks", task_id, "delete", snap)
    await session.commit()
    await manager.broadcast({"type": "task_deleted", "task_id": task_id, "week_start": str(week_start_str), "sender": user})


@router.post("/copy-week", response_model=list[WeeklyTaskOut])
async def copy_week(
    payload: CopyWeekRequest,
    user: str = Depends(current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Clone a person's tasks from one week into another. Status reset to Planned."""
    from_w = _monday(payload.from_week)
    to_w = _monday(payload.to_week)
    src = (
        await session.execute(
            select(WeeklyTask).where(
                WeeklyTask.owner_id == payload.owner_id,
                WeeklyTask.week_start == from_w,
            )
        )
    ).scalars().all()
    new_rows: list[WeeklyTask] = []
    clone_data: list[dict] = []
    for s in src:
        d = dict(
            owner_id=s.owner_id,
            week_start=to_w,
            title=s.title,
            priority=s.priority,
            status="Planned" if s.status != "Done" else "Done",
            big_rock_id=s.big_rock_id,
            notes=s.notes,
        )
        clone = WeeklyTask(**d)
        session.add(clone)
        new_rows.append(clone)
        clone_data.append(d)
    await session.flush()
    for n, d in zip(new_rows, clone_data):
        await audit.log(session, user, "weekly_tasks", n.id, "create",
                        {**{k: audit._jsonable(v) for k, v in d.items()}, "id": n.id, "_copied_from_week": from_w.isoformat()})
    await session.commit()
    # Re-fetch with relationships eagerly loaded
    ids = [n.id for n in new_rows]
    result = await session.execute(
        select(WeeklyTask)
        .options(selectinload(WeeklyTask.owner), selectinload(WeeklyTask.big_rock))
        .where(WeeklyTask.id.in_(ids))
    )
    new_rows = result.scalars().all()
    return [_to_out(n) for n in new_rows]
