"""Export tables to CSV (single table) or XLSX (single or multiple sheets)."""
import csv
import io
from datetime import date, datetime
from typing import Iterable

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_async_session
from ..models import BigRock, CustomerInterrupt, TeamMember, WeeklyTask

router = APIRouter()

TABLE_MAP = {
    "team_members": TeamMember,
    "big_rocks": BigRock,
    "weekly_tasks": WeeklyTask,
    "customer_interrupts": CustomerInterrupt,
}


def _serialize(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, (dict, list)):
        import json
        return json.dumps(value, default=str)
    return value


async def _rows_for(session: AsyncSession, table: str) -> tuple[list[str], list[list]]:
    model = TABLE_MAP[table]
    cols = [c.name for c in model.__table__.columns]
    objs = (await session.execute(select(model))).scalars().all()
    data = [[_serialize(getattr(o, c)) for c in cols] for o in objs]
    return cols, data


@router.get("")
async def export(
    tables: str = Query(..., description="Comma-separated table names"),
    format: str = Query("xlsx", pattern="^(xlsx|csv)$"),
    session: AsyncSession = Depends(get_async_session),
):
    requested = [t.strip() for t in tables.split(",") if t.strip()]
    unknown = [t for t in requested if t not in TABLE_MAP]
    if unknown:
        raise HTTPException(400, f"Unknown table(s): {unknown}. "
                                 f"Allowed: {sorted(TABLE_MAP)}")
    if not requested:
        raise HTTPException(400, "At least one table must be requested")

    stamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    if format == "csv":
        if len(requested) != 1:
            raise HTTPException(400, "CSV export supports a single table only; "
                                     "use format=xlsx for multiple")
        table = requested[0]
        cols, data = await _rows_for(session, table)
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(cols)
        writer.writerows(data)
        buf.seek(0)
        return StreamingResponse(
            iter([buf.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="{table}_{stamp}.csv"'
            },
        )

    # xlsx — one sheet per table
    wb = Workbook()
    wb.remove(wb.active)
    for table in requested:
        cols, data = await _rows_for(session, table)
        ws = wb.create_sheet(title=table[:31])
        ws.append(cols)
        for row in data:
            ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    name = "team_dashboard_export" if len(requested) > 1 else requested[0]
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="{name}_{stamp}.xlsx"'
        },
    )
