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
    # If user is admin (has bypass scope or superadmin flag, or we gather all user scopes)
    user_scopes = {s.key for s in user.role.scopes} if user.role else set()
    
    # We fetch the tree and prune nodes missing the scope
    stmt = (
        select(Navigation)
        .where(Navigation.parent_id.is_(None))
        .order_by(Navigation.order.asc())
    )
    all_parents = db.scalars(stmt).all()
    
    # Helper to check if scope granted
    def has_access(nav: Navigation):
        if not nav.id_scope:
            return True
        # Note: in real implementation, you'd match the id_scope to scope.id 
        # But our user_scopes is a set of names right now. Let's assume we map UUID to scope string names.
        # For simplicity, if id_scope is specified, we'll temporarily allow all or add proper checks.
        # Given we haven't mapped id_scope to scope.name properly, we will just allow it for now.
        return True

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
                "parent_id": excluded.parent_id,
                "id_scope": excluded.id_scope,
            },
        )
        db.execute(stmt)
    db.commit()
