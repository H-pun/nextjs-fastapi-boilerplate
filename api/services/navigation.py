from uuid import UUID
from fastapi import HTTPException
from sqlalchemy import select, delete
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert

from api.database import Navigation
from api.schemas.navigation import GetNavigationResponse, SaveNavigationRequest
from api.schemas.user import UserRole


async def get_all_navigation(db: Session, role: UserRole) -> list[GetNavigationResponse]:
    stmt = (
        select(Navigation)
        .where(Navigation.role == role, Navigation.parent_id.is_(None))
        .order_by(Navigation.order.asc())
    )
    parents = db.scalars(stmt).all()

    return [GetNavigationResponse.model_validate(parent)for parent in parents]


async def save_navigation(db: Session, req: SaveNavigationRequest) -> None:
    role = req.role

    # ---- 1) Kumpulkan ID parent & child dari payload (1 level) ----
    parent_ids: set[str] = {str(p.id) for p in req.navigations}
    all_child_ids: set[str] = set()
    rows: list[dict] = []

    # Parent rows
    for p in req.navigations:
        rows.append({
            **p.model_dump(exclude={"children"}),
            "role": role,
            "parent_id": None,
        })
        # Child rows
        for c in (p.children or []):
            all_child_ids.add(str(c.id))
            rows.append({
                **c.model_dump(exclude={"children"}),
                "role": role,
                "parent_id": p.id,
            })

    # ---- 2) DELETE yang tidak ada di payload ----
    # 2a. Hapus parent yang tak dikirim untuk role ini (anak ikut terhapus via ON DELETE CASCADE)
    if parent_ids:
        db.execute(
            delete(Navigation).where(
                Navigation.role == role,
                Navigation.parent_id.is_(None),
                ~Navigation.id.in_(parent_ids),
            )
        )
    else:
        # Jika payload kosong → hapus semua parent (dan otomatis semua anak) untuk role ini
        db.execute(
            delete(Navigation).where(
                Navigation.role == role,
                Navigation.parent_id.is_(None),
            )
        )

    # 2b. Pangkas child yang tak dikirim, di bawah parent yang tetap ada
    if parent_ids:
        # Anak di bawah parent yang keep tetapi id‑nya tidak ada di payload
        db.execute(
            delete(Navigation).where(
                Navigation.role == role,
                Navigation.parent_id.in_(parent_ids),
                ~Navigation.id.in_(all_child_ids),
            )
        )
    # Catatan: anak di bawah parent yang dihapus sudah ikut terhapus pada langkah 2a (CASCADE)

    # ---- 3) BULK UPSERT (insert + ON CONFLICT UPDATE) ----
    if rows:
        stmt = insert(Navigation).values(rows)
        excluded = stmt.excluded  # referensi kolom dari baris yang "conflict"
        # Conflict target = PK id (UUID dari FE)

        stmt = stmt.on_conflict_do_update(
            index_elements=[Navigation.id],
            set_={
                "title": excluded.title,
                "url": excluded.url,
                "icon": excluded.icon,
                "order": excluded.order,
                "role": excluded.role,
                "external": excluded.external,
                "parent_id": excluded.parent_id,
            },
        )
        db.execute(stmt)
    db.commit()
