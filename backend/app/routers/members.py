from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import audit
from ..database import get_async_session
from ..deps import current_user
from ..models import TeamMember
from ..schemas import MemberCreate, MemberOut, MemberUpdate

router = APIRouter()


@router.get("", response_model=list[MemberOut])
async def list_members(
    include_inactive: bool = False,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(TeamMember).order_by(TeamMember.name)
    if not include_inactive:
        stmt = stmt.where(TeamMember.active.is_(True))
    rows = (await session.execute(stmt)).scalars().all()
    return rows


@router.post("", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
async def create_member(
    payload: MemberCreate,
    user: str = Depends(current_user),
    session: AsyncSession = Depends(get_async_session),
):
    data = payload.model_dump()
    obj = TeamMember(**data)
    session.add(obj)
    audit_data = {k: audit._jsonable(v) for k, v in data.items()}
    await session.flush()
    audit_data["id"] = obj.id
    await audit.log(session, user, "team_members", obj.id, "create", audit_data)
    await session.commit()
    obj = (await session.execute(
        select(TeamMember).where(TeamMember.id == obj.id)
    )).scalar_one()
    return obj


@router.patch("/{member_id}", response_model=MemberOut)
async def update_member(
    member_id: int,
    payload: MemberUpdate,
    user: str = Depends(current_user),
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(TeamMember).where(TeamMember.id == member_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Member not found")
    before = audit.model_to_dict(obj)
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(obj, k, v)
    after = {**before, **{k: audit._jsonable(v) for k, v in updates.items()}}
    await session.flush()
    await audit.log(session, user, "team_members", obj.id, "update",
                    audit.diff(before, after))
    await session.commit()
    obj = (await session.execute(
        select(TeamMember).where(TeamMember.id == member_id)
    )).scalar_one()
    return obj


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(
    member_id: int,
    user: str = Depends(current_user),
    session: AsyncSession = Depends(get_async_session),
):
    result = await session.execute(
        select(TeamMember).where(TeamMember.id == member_id)
    )
    obj = result.scalar_one_or_none()
    if not obj:
        raise HTTPException(404, "Member not found")
    snapshot = audit.model_to_dict(obj)
    await session.delete(obj)
    await audit.log(session, user, "team_members", member_id, "delete", snapshot)
    await session.commit()


async def seed_members(session_factory, names: list[str]) -> None:
    """Insert default members if table is empty."""
    async with session_factory() as session:
        existing = (await session.execute(select(TeamMember.id).limit(1))).first()
        if existing:
            return
        for n in names:
            n = n.strip()
            if n:
                session.add(TeamMember(name=n))
        await session.commit()
