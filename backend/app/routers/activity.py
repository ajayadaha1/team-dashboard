from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_async_session
from ..models import ActivityLog
from ..schemas import ActivityOut

router = APIRouter()


@router.get("", response_model=list[ActivityOut])
async def list_activity(
    limit: int = 100,
    session: AsyncSession = Depends(get_async_session),
):
    limit = max(1, min(limit, 1000))
    stmt = select(ActivityLog).order_by(ActivityLog.id.desc()).limit(limit)
    rows = (await session.execute(stmt)).scalars().all()
    return rows
