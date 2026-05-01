from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_async_session
from ..deps import current_user
from ..models import WeeklyNote
from ..ws import manager

router = APIRouter()


def _monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


class NotePayload(BaseModel):
    week_start: date
    content: str = ""


@router.get("")
async def get_note(
    week_start: date,
    session: AsyncSession = Depends(get_async_session),
):
    monday = _monday(week_start)
    result = await session.execute(
        select(WeeklyNote).where(WeeklyNote.week_start == monday)
    )
    note = result.scalar_one_or_none()
    if note:
        return {"week_start": note.week_start.isoformat(), "content": note.content, "updated_by": note.updated_by}
    return {"week_start": monday.isoformat(), "content": "", "updated_by": ""}


@router.put("")
async def save_note(
    payload: NotePayload,
    user: str = Depends(current_user),
    session: AsyncSession = Depends(get_async_session),
):
    monday = _monday(payload.week_start)
    result = await session.execute(
        select(WeeklyNote).where(WeeklyNote.week_start == monday)
    )
    note = result.scalar_one_or_none()
    if note:
        note.content = payload.content
        note.updated_by = user
    else:
        note = WeeklyNote(week_start=monday, content=payload.content, updated_by=user)
        session.add(note)
    await session.commit()
    await session.refresh(note)

    # Broadcast to all connected clients
    await manager.broadcast({
        "type": "weekly_note_update",
        "week_start": monday.isoformat(),
        "content": payload.content,
        "updated_by": user,
    })

    return {"week_start": note.week_start.isoformat(), "content": note.content, "updated_by": note.updated_by}
