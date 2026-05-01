from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------- Team Members ----------
class MemberBase(BaseModel):
    name: str
    email: str = ""
    github_handle: str = ""
    role: str = ""
    location: str = ""
    manager_id: Optional[int] = None
    active: bool = True
    custom_fields: dict = Field(default_factory=dict)


class MemberCreate(MemberBase):
    pass


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    github_handle: Optional[str] = None
    role: Optional[str] = None
    location: Optional[str] = None
    manager_id: Optional[int] = None
    active: Optional[bool] = None
    custom_fields: Optional[dict] = None


class MemberOut(MemberBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


# ---------- Big Rocks ----------
class BigRockBase(BaseModel):
    title: str
    description: str = ""
    owner_id: Optional[int] = None
    quarter: str = ""
    status: str = "Not Started"
    target_date: Optional[date] = None
    progress_pct: int = Field(0, ge=0, le=100)
    notes: str = ""
    custom_fields: dict = Field(default_factory=dict)


class BigRockCreate(BigRockBase):
    pass


class BigRockUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    owner_id: Optional[int] = None
    quarter: Optional[str] = None
    status: Optional[str] = None
    target_date: Optional[date] = None
    progress_pct: Optional[int] = Field(None, ge=0, le=100)
    notes: Optional[str] = None
    custom_fields: Optional[dict] = None


class BigRockOut(BigRockBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    owner_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------- Weekly Tasks ----------
class WeeklyTaskBase(BaseModel):
    owner_id: Optional[int] = None
    week_start: date
    title: str
    priority: str = "P2"
    status: str = "Planned"
    big_rock_id: Optional[int] = None
    notes: str = ""
    custom_fields: dict = Field(default_factory=dict)


class WeeklyTaskCreate(WeeklyTaskBase):
    pass


class WeeklyTaskUpdate(BaseModel):
    owner_id: Optional[int] = None
    week_start: Optional[date] = None
    title: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    big_rock_id: Optional[int] = None
    notes: Optional[str] = None
    custom_fields: Optional[dict] = None


class WeeklyTaskOut(WeeklyTaskBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    owner_name: Optional[str] = None
    big_rock_title: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class CopyWeekRequest(BaseModel):
    from_week: date
    to_week: date


# ---------- Customer Interrupts ----------
class InterruptBase(BaseModel):
    customer: str
    owner_id: Optional[int] = None
    title: str
    description: str = ""
    severity: str = "Sev3"
    status: str = "Open"
    reported_date: Optional[date] = None
    resolved_date: Optional[date] = None
    jira_link: str = ""
    hours_spent: float = 0.0
    custom_fields: dict = Field(default_factory=dict)


class InterruptCreate(InterruptBase):
    pass


class InterruptUpdate(BaseModel):
    customer: Optional[str] = None
    owner_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    reported_date: Optional[date] = None
    resolved_date: Optional[date] = None
    jira_link: Optional[str] = None
    hours_spent: Optional[float] = None
    custom_fields: Optional[dict] = None


class InterruptOut(InterruptBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    owner_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------- Activity ----------
class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_name: str
    table_name: str
    record_id: int
    action: str
    diff_json: str
    created_at: datetime


# ---------- Stats ----------
class Stats(BaseModel):
    members_active: int
    big_rocks_total: int
    big_rocks_at_risk: int
    big_rocks_done: int
    tasks_this_week: int
    tasks_blocked: int
    interrupts_open: int
    interrupts_sev1_or_2_open: int
