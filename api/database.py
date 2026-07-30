from uuid import UUID, uuid4
from typing import Dict, Any
from datetime import datetime
from sqlalchemy import DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from api.schemas.user import UserRole


class Base(DeclarativeBase):
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4, sort_order=-1)


class User(Base):
    __tablename__ = 'users'

    identifier: Mapped[str] = mapped_column(unique=True)
    name: Mapped[str] = mapped_column()
    username: Mapped[str] = mapped_column(unique=True)
    password: Mapped[str] = mapped_column()
    email: Mapped[str] = mapped_column(unique=True, nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.USER)
    email_verified: Mapped[bool] = mapped_column(default=False)
    phone: Mapped[str] = mapped_column(unique=True, nullable=True)
    avatar: Mapped[str] = mapped_column(nullable=True)
    cohort: Mapped[int] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id_user: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    ip_address: Mapped[str] = mapped_column()
    user_agent: Mapped[str] = mapped_column()
    path: Mapped[str] = mapped_column()
    method: Mapped[str] = mapped_column()
    status_code: Mapped[int] = mapped_column()
    duration: Mapped[float] = mapped_column()  # in seconds
    payload: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=True)
    response: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Navigation(Base):
    __tablename__ = "navigations"

    parent_id: Mapped[UUID] = mapped_column(ForeignKey("navigations.id", ondelete="CASCADE"), nullable=True)
    title: Mapped[str] = mapped_column()
    url: Mapped[str] = mapped_column()
    icon: Mapped[str] = mapped_column(nullable=True)
    order: Mapped[int] = mapped_column()
    external: Mapped[bool] = mapped_column(default=False)
    role: Mapped[UserRole] = mapped_column()

    parent: Mapped["Navigation"] = relationship(
        back_populates="children",
        remote_side="Navigation.id",
    )

    children: Mapped[list["Navigation"]] = relationship(
        back_populates="parent",
        cascade="all, delete-orphan",
        order_by="Navigation.order",
        # lazy="selectin",
        passive_deletes=True,
    )
