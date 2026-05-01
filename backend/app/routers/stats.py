from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_async_session
from ..models import BigRock, CustomerInterrupt, TeamMember, WeeklyTask
from ..schemas import Stats

router = APIRouter()


def _monday(d: date) -> date:
    return d - timedelta(days=d.weekday())


@router.get("", response_model=Stats)
async def get_stats(session: AsyncSession = Depends(get_async_session)):
    today = date.today()
    week = _monday(today)

    members_active = (
        await session.execute(
            select(func.count(TeamMember.id)).where(TeamMember.active.is_(True))
        )
    ).scalar_one()

    big_rocks_total = (
        await session.execute(select(func.count(BigRock.id)))
    ).scalar_one()
    big_rocks_at_risk = (
        await session.execute(
            select(func.count(BigRock.id)).where(BigRock.status == "At Risk")
        )
    ).scalar_one()
    big_rocks_done = (
        await session.execute(
            select(func.count(BigRock.id)).where(BigRock.status == "Done")
        )
    ).scalar_one()

    tasks_this_week = (
        await session.execute(
            select(func.count(WeeklyTask.id)).where(WeeklyTask.week_start == week)
        )
    ).scalar_one()
    tasks_blocked = (
        await session.execute(
            select(func.count(WeeklyTask.id)).where(
                WeeklyTask.week_start == week, WeeklyTask.status == "Blocked"
            )
        )
    ).scalar_one()

    interrupts_open = (
        await session.execute(
            select(func.count(CustomerInterrupt.id)).where(
                CustomerInterrupt.status.in_(("Open", "Investigating"))
            )
        )
    ).scalar_one()
    interrupts_sev1_or_2_open = (
        await session.execute(
            select(func.count(CustomerInterrupt.id)).where(
                CustomerInterrupt.status.in_(("Open", "Investigating")),
                CustomerInterrupt.severity.in_(("Sev1", "Sev2")),
            )
        )
    ).scalar_one()

    return Stats(
        members_active=members_active,
        big_rocks_total=big_rocks_total,
        big_rocks_at_risk=big_rocks_at_risk,
        big_rocks_done=big_rocks_done,
        tasks_this_week=tasks_this_week,
        tasks_blocked=tasks_blocked,
        interrupts_open=interrupts_open,
        interrupts_sev1_or_2_open=interrupts_sev1_or_2_open,
    )
