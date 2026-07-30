from sqlalchemy.orm import Session
from api.database import Navigation, UserRole
from api.core.logger import get_logger

logger = get_logger(__name__)


navigation_admin = [
    Navigation(title="Home", url="/dashboard", icon="home"),
    Navigation(title="User", url="/dashboard/admin/user", icon="user"),
    Navigation(title="Docs", url="/dashboard/admin/docs", icon="file-code"),
    Navigation(title="Navigation", url="/dashboard/admin/navigation", icon="signpost"),
]

navigation_user = [
    Navigation(title="Home", url="/dashboard", icon="home"),
]


def seed_navigation(db: Session) -> None:
    if db.query(Navigation).count() == 0:
        logger.info("Seeding navigation...")

        def set_order(nav_root: list[Navigation], role: UserRole) -> None:
            for root_order, root in enumerate(nav_root):
                root.order = root_order
                root.role = role
                if root.children:
                    for child_order, child in enumerate(root.children):
                        child.order = child_order
                        child.role = role

        set_order(navigation_admin, UserRole.ADMIN)
        set_order(navigation_user, UserRole.USER)

        db.add_all(navigation_admin + navigation_user)
