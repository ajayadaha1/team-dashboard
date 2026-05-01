from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class TeamMember(Base):
    __tablename__ = "team_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(200), default="", nullable=False)
    github_handle: Mapped[str] = mapped_column(String(80), default="", nullable=False)
    role: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    location: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    manager_id: Mapped[int | None] = mapped_column(
        ForeignKey("team_members.id", ondelete="SET NULL"), nullable=True, index=True
    )
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    custom_fields: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class BigRock(Base):
    __tablename__ = "big_rocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("team_members.id", ondelete="SET NULL"), nullable=True, index=True
    )
    quarter: Mapped[str] = mapped_column(String(10), default="", nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20), default="Not Started", nullable=False, index=True
    )  # Not Started | In Progress | At Risk | Done | Dropped
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    progress_pct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    custom_fields: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    owner = relationship("TeamMember", lazy="joined")


class WeeklyTask(Base):
    __tablename__ = "weekly_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("team_members.id", ondelete="SET NULL"), nullable=True, index=True
    )
    week_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)  # Monday
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    priority: Mapped[str] = mapped_column(String(4), default="P2", nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="Planned", nullable=False, index=True
    )  # Planned | In Progress | Blocked | Done | Dropped
    big_rock_id: Mapped[int | None] = mapped_column(
        ForeignKey("big_rocks.id", ondelete="SET NULL"), nullable=True
    )
    notes: Mapped[str] = mapped_column(Text, default="", nullable=False)
    custom_fields: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    owner = relationship("TeamMember", lazy="joined")
    big_rock = relationship("BigRock", lazy="joined")


class CustomerInterrupt(Base):
    __tablename__ = "customer_interrupts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    owner_id: Mapped[int | None] = mapped_column(
        ForeignKey("team_members.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    severity: Mapped[str] = mapped_column(
        String(8), default="Sev3", nullable=False, index=True
    )  # Sev1 | Sev2 | Sev3 | Sev4
    status: Mapped[str] = mapped_column(
        String(20), default="Open", nullable=False, index=True
    )  # Open | Investigating | Mitigated | Closed
    reported_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    resolved_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    jira_link: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    hours_spent: Mapped[float] = mapped_column(default=0.0, nullable=False)
    custom_fields: Mapped[dict] = mapped_column(JSONB, default=dict, server_default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    owner = relationship("TeamMember", lazy="joined")


class CustomColumn(Base):
    """Metadata for user-defined columns on each table."""
    __tablename__ = "custom_columns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    table_name: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    column_name: Mapped[str] = mapped_column(String(120), nullable=False)
    column_type: Mapped[str] = mapped_column(String(20), default="text", nullable=False)  # text | number | date | boolean
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ActivityLog(Base):
    __tablename__ = "activity_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_name: Mapped[str] = mapped_column(String(120), default="", nullable=False, index=True)
    table_name: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    record_id: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # create|update|delete
    diff_json: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )


class WeeklyNote(Base):
    """Rich text notes tied to a specific week (Monday)."""
    __tablename__ = "weekly_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    week_start: Mapped[date] = mapped_column(Date, nullable=False, unique=True, index=True)
    content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    updated_by: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
