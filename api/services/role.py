from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from api.database import Role, Scope, User, user_roles
from api.schemas.role import CreateRoleRequest, UpdateRoleRequest, SetRoleScopesRequest

# The scope that gates user, role, and scope management. Losing every holder of
# it locks the application permanently: no one can reach the pages that would
# grant it back, and the seeder will not help because the rows already exist.
ADMIN_SCOPE = "user:manage"


def _admins_remain(db: Session) -> bool:
    """Is there still at least one user who can administer the system?

    Call after flush and before commit, so the check sees the pending change.
    """
    stmt = (
        select(func.count())
        .select_from(User)
        .join(user_roles, User.id == user_roles.c.user_id)
        .join(Role, Role.id == user_roles.c.role_id)
        .join(Role.scopes)
        .where(Scope.key == ADMIN_SCOPE)
    )
    return (db.scalar(stmt) or 0) > 0


def guard_last_admin(db: Session) -> None:
    """Roll back and refuse if the pending change would lock everyone out."""
    db.flush()
    if not _admins_remain(db):
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail=f"Blocked: this would leave no user holding '{ADMIN_SCOPE}'.",
        )


async def get_all_roles(db: Session) -> list[Role]:
    # Ordered in the query, not the client: without ORDER BY, Postgres is free
    # to return rows in whatever order the heap happens to hold them.
    return list(db.scalars(select(Role).order_by(Role.name)).all())


async def get_all_scopes(db: Session) -> list[Scope]:
    # By key, so the `resource:action` prefix keeps each group together —
    # which is exactly how the UI buckets them.
    return list(db.scalars(select(Scope).order_by(Scope.key)).all())


async def create_role(db: Session, *, data: CreateRoleRequest) -> Role:
    role = Role(name=data.name, description=data.description)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


async def update_role(db: Session, *, role_id: UUID, data: UpdateRoleRequest) -> Role:
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    update_data = data.model_dump(exclude_unset=True)
    if update_data:
        db.execute(update(Role).where(Role.id == role_id).values(**update_data))
        db.commit()
        db.refresh(role)

    return role


async def delete_role(db: Session, *, role_id: UUID) -> None:
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    db.delete(role)
    guard_last_admin(db)
    db.commit()


async def set_role_scopes(db: Session, *, role_id: UUID, data: SetRoleScopesRequest) -> Role:
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    role.scopes = list(db.scalars(select(Scope).where(Scope.id.in_(data.scope_ids))).all())
    guard_last_admin(db)
    db.commit()
    db.refresh(role)
    return role
