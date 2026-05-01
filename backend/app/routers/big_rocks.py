from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .. import audit
from ..database import get_async_session
from ..deps import current_user
from ..models import BigRock
from ..schemas import BigRockCreate, BigRockOut, BigRockUpdate
from ..ws import manager

router = APIRouter()


def _to_out(rock: BigRock) -> dict:
    d = {c.name: getattr(rock, c.name) for c in rock.__table__.columns}
    d["owner_name"] = rock.owner.name if rock.owner else None
    return d


@router.get("", response_model=list[BigRockOut])
async def list_rocks(
    quarter: Optional[str] = None,
    owner_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = (
        select(BigRock)
        .options(selectinload(BigRock.owner))
        .order_by(BigRock.target_date.is_(None), BigRock.target_date)
    )
    if quarter:
        stmt = stmt.where(BigRock.quarter == quarter)
    if owner_id is not None:
        stmt = stmt.where(BigRock.owner_id == owner_id)
    if status_filter:
        stmt = stmt.where(BigRock.status == status_filter)
    rows = (await session.execute(stmt)).scalars().all()
    return [_to_out(r) for r in rows]


@router.post("", response_model=BigRockOut, status_code=status.HTTP_201_CREATED)
async def create_rock(
    payload: BigRockCreate,
    user: str = Depends(current_user),
    session: AsyncSession = Depends(get_async_session),
):
    data = payload.model_dump()
    obj = BigRock(**data)
    session.add(obj)
    audit_data = {k: audit._jsonable(v) for k, v in data.items()}
    await session.flush()
    audit_data["id"] = obj.id
    await audit.log(session, user, "big_rocks", obj.id, "create", audit_data)
    await session.commit()
    obj = (await session.execute(
        select(BigRock).options(selectinload(BigRock.owner)).where(BigRock.id == obj.id)
    )).scalar_one()
    out = _to_out(obj)
    await manager.broadcast({"type": "rock_created", "rock": out, "sender": user})
    return out


@router.patch("/{rock_id}", response_model=BigRockOut)
async def update_rock(
    rock_id: int,
    payload: BigRockUpdate,
    user: str = Depends(current_user),
    session: AsyncSession = Depends(get_async_session),
):
    obj = (await session.execute(
        select(BigRock).where(BigRock.id == rock_id)
    )).scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Big rock not found")
    before = audit.model_to_dict(obj)
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(obj, k, v)
    after = {**before, **{k: audit._jsonable(v) for k, v in updates.items()}}
    await session.flush()
    await audit.log(session, user, "big_rocks", obj.id, "update",
                    audit.diff(before, after))
    await session.commit()
    obj = (await session.execute(
        select(BigRock).options(selectinload(BigRock.owner)).where(BigRock.id == rock_id)
    )).scalar_one()
    out = _to_out(obj)
    await manager.broadcast({"type": "rock_updated", "rock": out, "sender": user})
    return out


@router.delete("/{rock_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rock(
    rock_id: int,
    user: str = Depends(current_user),
    session: AsyncSession = Depends(get_async_session),
):
    obj = (await session.execute(
        select(BigRock).where(BigRock.id == rock_id)
    )).scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Big rock not found")
    snap = audit.model_to_dict(obj)
    await session.delete(obj)
    await audit.log(session, user, "big_rocks", rock_id, "delete", snap)
    await session.commit()
    await manager.broadcast({"type": "rock_deleted", "rock_id": rock_id, "sender": user})
