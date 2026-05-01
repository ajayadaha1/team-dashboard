from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_async_session
from ..deps import current_user
from ..models import CustomColumn

router = APIRouter()

ALLOWED_TABLES = {"big_rocks", "weekly_tasks", "customer_interrupts", "team_members"}
ALLOWED_TYPES = {"text", "number", "date", "boolean"}


class CustomColumnCreate(BaseModel):
    table_name: str
    column_name: str
    column_type: str = "text"


class CustomColumnOut(BaseModel):
    id: int
    table_name: str
    column_name: str
    column_type: str

    class Config:
        from_attributes = True


@router.get("", response_model=list[CustomColumnOut])
async def list_custom_columns(
    table_name: str | None = None,
    session: AsyncSession = Depends(get_async_session),
):
    stmt = select(CustomColumn).order_by(CustomColumn.table_name, CustomColumn.column_name)
    if table_name:
        stmt = stmt.where(CustomColumn.table_name == table_name)
    rows = (await session.execute(stmt)).scalars().all()
    return rows


@router.post("", response_model=CustomColumnOut, status_code=status.HTTP_201_CREATED)
async def add_custom_column(
    payload: CustomColumnCreate,
    user: str = Depends(current_user),
    session: AsyncSession = Depends(get_async_session),
):
    if payload.table_name not in ALLOWED_TABLES:
        raise HTTPException(400, f"Table must be one of: {', '.join(sorted(ALLOWED_TABLES))}")
    if payload.column_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Type must be one of: {', '.join(sorted(ALLOWED_TYPES))}")
    if not payload.column_name.strip():
        raise HTTPException(400, "Column name cannot be empty")

    # Check duplicate
    exists = (
        await session.execute(
            select(CustomColumn).where(
                CustomColumn.table_name == payload.table_name,
                CustomColumn.column_name == payload.column_name.strip(),
            )
        )
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(409, "Column already exists for this table")

    obj = CustomColumn(
        table_name=payload.table_name,
        column_name=payload.column_name.strip(),
        column_type=payload.column_type,
    )
    session.add(obj)
    await session.commit()
    await session.refresh(obj)
    return obj


@router.delete("/{col_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_custom_column(
    col_id: int,
    user: str = Depends(current_user),
    session: AsyncSession = Depends(get_async_session),
):
    obj = await session.get(CustomColumn, col_id)
    if not obj:
        raise HTTPException(404, "Custom column not found")
    await session.execute(delete(CustomColumn).where(CustomColumn.id == col_id))
    await session.commit()
