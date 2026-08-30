from uuid import UUID
from sqlalchemy import select, delete
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from api.database import Navigation
from api.schemas.navigation import GetNavigationResponse, SaveNavigationRequest


async def get_all_navigation(db: Session, role_id: UUID) -> list[GetNavigationResponse]:
    stmt = (
        select(Navigation)
        .where(Navigation.role_id == role_id, Navigation.parent_id.is_(None))
        .order_by(Navigation.order.asc())
    )
    parents = db.scalars(stmt).all()
    return [GetNavigationResponse.model_validate(parent) for parent in parents]

async def save_navigation(db: Session, req: SaveNavigationRequest) -> None:
    role_id = req.role_id

    # 1) Collect parent & child IDs from payload (1 level deep)
    parent_ids: set[str] = {str(p.id) for p in req.navigations}
    all_child_ids: set[str] = set()
    rows: list[dict] = []

    for p in req.navigations:
        rows.append({
            **p.model_dump(exclude={"children"}),
            "role_id": role_id,
            "parent_id": None,
        })
        for c in (p.children or []):
            all_child_ids.add(str(c.id))
            rows.append({
                **c.model_dump(exclude={"children"}),
                "role_id": role_id,
                "parent_id": p.id,
            })

    # 2) DELETE those not in payload for this role
    if parent_ids:
        db.execute(
            delete(Navigation).where(
                Navigation.role_id == role_id,
                Navigation.parent_id.is_(None),
                ~Navigation.id.in_(parent_ids),
            )
        )
    else:
        db.execute(
            delete(Navigation).where(
                Navigation.role_id == role_id,
                Navigation.parent_id.is_(None),
            )
        )

    if parent_ids:
        db.execute(
            delete(Navigation).where(
                Navigation.role_id == role_id,
                Navigation.parent_id.in_(parent_ids),
                ~Navigation.id.in_(all_child_ids),
            )
        )

    # 3) BULK UPSERT
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
                "role_id": excluded.role_id,
                "external": excluded.external,
                "parent_id": excluded.parent_id,
            },
        )
        db.execute(stmt)
    db.commit()
