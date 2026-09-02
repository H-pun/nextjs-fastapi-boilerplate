from uuid import UUID, uuid4
from typing import List
from datetime import datetime
from sqlalchemy import (
    CheckConstraint, DateTime, ForeignKey, func, String, Table, Column,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4, sort_order=-1)


role_scopes = Table(
    "role_scopes",
    Base.metadata,
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("scope_id", ForeignKey("scopes.id", ondelete="CASCADE"), primary_key=True),
)


user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    # Granting permission is the most audit-worthy write in the system.
    Column("granted_at", DateTime(timezone=True), server_default=func.now()),
    Column("granted_by", ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
)


class Scope(Base):
    """A single permission, e.g. `user:manage`.

    Rows are defined by the seeder and referenced by name in
    `Security(..., scopes=[...])`, so there is deliberately no create/delete
    endpoint: removing one would leave those endpoints permanently 403.

    `key` must read `resource:action`, enforced by a CHECK constraint so a
    typo cannot reach the table and silently protect nothing.
    """

    __tablename__ = "scopes"
    key: Mapped[str] = mapped_column(String, unique=True, index=True)
    description: Mapped[str] = mapped_column(String, nullable=True)

    __table_args__ = (
        CheckConstraint(r"key ~ '^[a-z_]+:[a-z_]+$'", name="ck_scope_key_format"),
    )


class Role(Base):
    """A named bundle of scopes. Carries no authority of its own — every check
    resolves to scopes, so roles can be renamed or restructured freely."""

    __tablename__ = "roles"
    name: Mapped[str] = mapped_column(String, unique=True)
    description: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    scopes: Mapped[List[Scope]] = relationship(secondary=role_scopes, lazy="selectin")
    # user_roles carries two foreign keys to users (the member and whoever
    # granted the role), so the association column has to be named explicitly.
    users: Mapped[List["User"]] = relationship(
        secondary=user_roles,
        back_populates="roles",
        primaryjoin=lambda: Role.id == user_roles.c.role_id,
        secondaryjoin=lambda: User.id == user_roles.c.user_id,
    )


class User(Base):
    """Who someone is in this app — one row per person, whatever they log in with.

    `password` is null for users who only sign in through an external provider;
    `authenticate()` rejects those explicitly rather than comparing against a
    placeholder hash.
    """

    __tablename__ = 'users'
    identifier: Mapped[str] = mapped_column(unique=True)
    name: Mapped[str] = mapped_column()
    username: Mapped[str] = mapped_column(unique=True)
    password: Mapped[str] = mapped_column(nullable=True)
    email: Mapped[str] = mapped_column(unique=True, nullable=True)
    email_verified: Mapped[bool] = mapped_column(default=False)
    avatar: Mapped[str] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    roles: Mapped[List[Role]] = relationship(
        secondary=user_roles,
        back_populates="users",
        lazy="selectin",
        # Both sides of user_roles point at users; name the join column so
        # SQLAlchemy does not try to resolve granted_by as the association.
        primaryjoin=lambda: User.id == user_roles.c.user_id,
        secondaryjoin=lambda: Role.id == user_roles.c.role_id,
    )
    identities: Mapped[List["UserIdentity"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    @property
    def scope_keys(self) -> set[str]:
        """Every scope this user holds, across all roles. Read straight from
        the database on each request, so revoking access takes effect at once
        instead of waiting for the token to expire."""
        return {scope.key for role in self.roles for scope in role.scopes}


class UserIdentity(Base):
    """How a user proves who they are. One user may hold several — Keycloak at
    the office, Google from home — all resolving to the same `users` row, and
    therefore to one set of roles.

    Match on (provider, subject) only. Matching on email would hand the account
    to anyone who can register that address with the provider; link by email
    only when the provider reports it as verified.
    """

    __tablename__ = "user_identities"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    provider: Mapped[str] = mapped_column(String)  # "local" | "keycloak" | "google"
    subject: Mapped[str] = mapped_column(String)   # `sub` from the provider
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="identities")

    __table_args__ = (
        UniqueConstraint("provider", "subject", name="uq_identity_provider_subject"),
    )


class Navigation(Base):
    """A sidebar entry.

    `scope_id` decides who *sees* the menu, not who may use what it points at —
    that is enforced by `Security(..., scopes=[...])` on the endpoint itself.
    Hiding a menu is presentation, never protection.
    """

    __tablename__ = "navigations"
    parent_id: Mapped[UUID] = mapped_column(ForeignKey("navigations.id", ondelete="CASCADE"), nullable=True)
    title: Mapped[str] = mapped_column()
    url: Mapped[str] = mapped_column()
    icon: Mapped[str] = mapped_column(nullable=True)
    order: Mapped[int] = mapped_column()
    external: Mapped[bool] = mapped_column(default=False)
    group: Mapped[str] = mapped_column(nullable=True)

    # Null means everyone sees it.
    scope_id: Mapped[UUID] = mapped_column(ForeignKey("scopes.id", ondelete="SET NULL"), nullable=True)

    parent: Mapped["Navigation"] = relationship(back_populates="children", remote_side="Navigation.id")
    children: Mapped[list["Navigation"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan", order_by="Navigation.order", passive_deletes=True
    )
