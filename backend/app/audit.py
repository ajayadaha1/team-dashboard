"""Audit-log helper. Writes one row to activity_log per mutation."""
from __future__ import annotations

import json
from datetime import date, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from .models import ActivityLog


def _jsonable(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def model_to_dict(obj) -> dict:
    if obj is None:
        return {}
    return {
        c.name: _jsonable(getattr(obj, c.name))
        for c in obj.__table__.columns
    }


def diff(before: dict, after: dict) -> dict:
    keys = set(before) | set(after)
    out = {}
    for k in keys:
        b, a = before.get(k), after.get(k)
        if b != a:
            out[k] = {"before": b, "after": a}
    return out


async def log(
    session: AsyncSession,
    user: str,
    table_name: str,
    record_id: int,
    action: str,
    diff_data: dict | None = None,
) -> None:
    row = ActivityLog(
        user_name=user,
        table_name=table_name,
        record_id=record_id,
        action=action,
        diff_json=json.dumps(diff_data or {}, default=str),
    )
    session.add(row)
