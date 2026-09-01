from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from api.database import Navigation, Scope
from api.core.logger import get_logger

logger = get_logger(__name__)

# Fixed ids so a re-run updates the seeded menu instead of duplicating it.
# Not RFC 9562 shaped on purpose — see the note in src/lib/types/navigation.ts.
NAV_HOME = UUID("11111111-1111-1111-1111-111111111101")
NAV_USER = UUID("11111111-1111-1111-1111-111111111102")
NAV_ACCESS = UUID("11111111-1111-1111-1111-111111111103")
NAV_MENU = UUID("11111111-1111-1111-1111-111111111104")
NAV_DOCS = UUID("11111111-1111-1111-1111-111111111105")

# (id, title, url, icon, group, scope key or None for everyone)
MENU = [
    (NAV_HOME, "Home", "/dashboard", "home", "Overview", None),
    (NAV_USER, "User Management", "/dashboard/admin/user", "users", "Administration", "user:manage"),
    (NAV_ACCESS, "Access Control", "/dashboard/admin/profile-feature", "shield", "Administration", "user:manage"),
    (NAV_MENU, "Menu Management", "/dashboard/admin/navigation", "signpost", "Administration", "navigation:manage"),
    (NAV_DOCS, "API Docs", "/dashboard/admin/docs", "file-code", "Administration", "user:manage"),
]


def seed_navigation(db: Session) -> None:
    logger.info("Seeding navigation...")

    scope_ids = {
        scope.key: scope.id for scope in db.scalars(select(Scope)).all()
    }

    for order, (nav_id, title, url, icon, group, scope_key) in enumerate(MENU):
        nav = db.get(Navigation, nav_id)
        if nav:
            continue
        db.add(Navigation(
            id=nav_id,
            title=title,
            url=url,
            icon=icon,
            group=group,
            order=order,
            scope_id=scope_ids.get(scope_key) if scope_key else None,
        ))

    db.flush()

