from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .. import audit
from ..database import get_async_session
from ..deps import current_user
from ..models import CustomerInterrupt
from ..schemas import InterruptCreate, InterruptOut, InterruptUpdate
from ..ws import manager

router = APIRouter()


def _to_out(i: CustomerInterrupt) -> dict:
    d = {c.name: getattr(i, c.name) for c in i.__table__.columns}
    d["owner_name"] = i.owner.name if i.owner else None
    return d


@router.get("", response_model=list[InterruptOut])
async def list_interrupts(
    status_filter: Optional[str] = None,
    owner_id: Optional[int] = None,
    customer: Optional[str] = None,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = (
        select(CustomerInterrupt)
        .options(selectinload(CustomerInterrupt.owner))
        .order_by(
            CustomerInterrupt.reported_date.is_(None),
            CustomerInterrupt.reported_date.desc(),
            CustomerInterrupt.id.desc(),
        )
    )
    if status_filter:
        stmt = stmt.where(CustomerInterrupt.status == status_filter)
    if owner_id is not None:
        stmt = stmt.where(CustomerInterrupt.owner_id == owner_id)
    if customer:
        stmt = stmt.where(CustomerInterrupt.customer.ilike(f"%{customer}%"))
    rows = (await session.execute(stmt)).scalars().all()
    return [_to_out(r) for r in rows]


@router.post("", response_model=InterruptOut, status_code=status.HTTP_201_CREATED)
async def create_interrupt(
    payload: InterruptCreate,
    user: str = Depends(current_user),
    session: AsyncSession = Depends(get_async_session),
):
    data = payload.model_dump()
    obj = CustomerInterrupt(**data)
    session.add(obj)
    audit_data = {k: audit._jsonable(v) for k, v in data.items()}
    await session.flush()
    audit_data["id"] = obj.id
    await audit.log(session, user, "customer_interrupts", obj.id, "create", audit_data)
    await session.commit()
    obj = (await session.execute(
        select(CustomerInterrupt).options(selectinload(CustomerInterrupt.owner)).where(CustomerInterrupt.id == obj.id)
    )).scalar_one()
    out = _to_out(obj)
    await manager.broadcast({"type": "interrupt_created", "interrupt": out, "sender": user})
    return out


@router.patch("/{interrupt_id}", response_model=InterruptOut)
async def update_interrupt(
    interrupt_id: int,
    payload: InterruptUpdate,
    user: str = Depends(current_user),
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(CustomerInterrupt).where(CustomerInterrupt.id == interrupt_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Interrupt not found")
    before = audit.model_to_dict(obj)
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(obj, k, v)
    after = {**before, **{k: audit._jsonable(v) for k, v in updates.items()}}
    await session.flush()
    await audit.log(session, user, "customer_interrupts", obj.id, "update",
                    audit.diff(before, after))
    await session.commit()
    obj = (await session.execute(
        select(CustomerInterrupt).options(selectinload(CustomerInterrupt.owner)).where(CustomerInterrupt.id == interrupt_id)
    )).scalar_one()
    out = _to_out(obj)
    await manager.broadcast({"type": "interrupt_updated", "interrupt": out, "sender": user})
    return out


@router.delete("/{interrupt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interrupt(
    interrupt_id: int,
    user: str = Depends(current_user),
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(CustomerInterrupt).where(CustomerInterrupt.id == interrupt_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Interrupt not found")
    snap = audit.model_to_dict(obj)
    await session.delete(obj)
    await audit.log(session, user, "customer_interrupts", interrupt_id, "delete", snap)
    await session.commit()
    await manager.broadcast({"type": "interrupt_deleted", "interrupt_id": interrupt_id, "sender": user})
