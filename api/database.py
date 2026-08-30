from uuid import UUID, uuid4
from typing import Dict, Any, List
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, func, String, Table, Column
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB

class Base(DeclarativeBase):
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4, sort_order=-1)

role_scopes = Table(
    "role_scopes",
    Base.metadata,
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("scope_id", ForeignKey("scopes.id", ondelete="CASCADE"), primary_key=True),
)

class Scope(Base):
    __tablename__ = "scopes"
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    description: Mapped[str] = mapped_column(String, nullable=True)

class Role(Base):
    __tablename__ = "roles"
    name: Mapped[str] = mapped_column(String, unique=True)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    
    scopes: Mapped[List[Scope]] = relationship(secondary=role_scopes, lazy="selectin")
    users: Mapped[List["User"]] = relationship(back_populates="role")
    navigations: Mapped[List["Navigation"]] = relationship(back_populates="role_rel")

class User(Base):
    __tablename__ = 'users'
    identifier: Mapped[str] = mapped_column(unique=True)
    name: Mapped[str] = mapped_column()
    username: Mapped[str] = mapped_column(unique=True)
    password: Mapped[str] = mapped_column()
    email: Mapped[str] = mapped_column(unique=True, nullable=True)
    
    role_id: Mapped[UUID] = mapped_column(ForeignKey("roles.id"))
    role: Mapped[Role] = relationship(back_populates="users", lazy="selectin")
    
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
    
    role_id: Mapped[UUID] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"))
    role_rel: Mapped[Role] = relationship(back_populates="navigations", lazy="selectin")

    parent: Mapped["Navigation"] = relationship(
        back_populates="children",
        remote_side="Navigation.id",
    )
    children: Mapped[list["Navigation"]] = relationship(
        back_populates="parent",
        cascade="all, delete-orphan",
        order_by="Navigation.order",
        passive_deletes=True,
    )
