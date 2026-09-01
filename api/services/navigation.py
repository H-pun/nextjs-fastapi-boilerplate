from uuid import UUID
from sqlalchemy import select, delete
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from api.database import Navigation, User
from api.schemas.navigation import GetNavigationResponse, SaveNavigationRequest


async def get_all_navigation(db: Session) -> list[GetNavigationResponse]:
    stmt = (
        select(Navigation)
        .where(Navigation.parent_id.is_(None))
        .order_by(Navigation.order.asc())
    )
    parents = db.scalars(stmt).all()
    return [GetNavigationResponse.model_validate(parent) for parent in parents]


async def get_navigation_for_user(db: Session, user: User) -> list[GetNavigationResponse]:
    """The menu as this user should see it.

    Hiding a row is presentation only — the endpoint behind it is guarded by
    its own `Security(..., scopes=[...])`.
    """
    held_scope_ids = {
        scope.id for role in user.roles for scope in role.scopes
    } if user else set()

    # We fetch the tree and prune nodes missing the scope
    stmt = (
        select(Navigation)
        .where(Navigation.parent_id.is_(None))
        .order_by(Navigation.order.asc())
    )
    all_parents = db.scalars(stmt).all()

    def has_access(nav: Navigation) -> bool:
        if not nav.scope_id:
            return True
        return nav.scope_id in held_scope_ids

    allowed_parents = []
    for p in all_parents:
        if has_access(p):
            p.children = [c for c in p.children if has_access(c)]
            allowed_parents.append(p)

    return [GetNavigationResponse.model_validate(parent) for parent in allowed_parents]


async def save_navigation(db: Session, req: SaveNavigationRequest) -> None:
    parent_ids: set[str] = {str(p.id) for p in req.navigations}
    all_child_ids: set[str] = set()
    rows: list[dict] = []

    for p in req.navigations:
        rows.append({
            **p.model_dump(exclude={"children"}),
            "parent_id": None,
        })
        for c in (p.children or []):
            all_child_ids.add(str(c.id))
            rows.append({
                **c.model_dump(exclude={"children"}),
                "parent_id": p.id,
            })

    # DELETE
    if parent_ids:
        db.execute(
            delete(Navigation).where(
                Navigation.parent_id.is_(None),
                ~Navigation.id.in_(parent_ids),
            )
        )
    else:
        db.execute(
            delete(Navigation).where(
                Navigation.parent_id.is_(None),
            )
        )

    if parent_ids:
        db.execute(
            delete(Navigation).where(
                Navigation.parent_id.in_(parent_ids),
                ~Navigation.id.in_(all_child_ids),
            )
        )

    # BULK UPSERT
    if rows:
        stmt = insert(Navigation).values(rows)
        excluded = stmt.excluded
        stmt = stmt.on_conflict_do_update(
            index_elements=[Navigation.id],
            set_={
                "title": excluded.title,
                "url": excluded.url,
                "icon": excluded.icon,
                "order": excluded.order,
                "external": excluded.external,
                "group": excluded.group,
                "parent_id": excluded.parent_id,
                "scope_id": excluded.scope_id,
            },
        )
        db.execute(stmt)
    db.commit()
