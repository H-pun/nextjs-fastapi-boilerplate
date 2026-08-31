from sqlalchemy.orm import Session
from api.database import Navigation, Scope
from api.core.logger import get_logger

logger = get_logger(__name__)

# Menu untuk Admin (akan diproteksi dengan scope "user:manage" dan "navigation:manage")
navigation_admin = [
    Navigation(title="User Management", url="/dashboard/user", icon="users"),
    Navigation(title="Access Control", url="/dashboard/admin/profile-feature", icon="shield"),
    Navigation(title="Menu Management", url="/dashboard/admin/navigation", icon="signpost"),
    Navigation(title="API Docs", url="/dashboard/admin/docs", icon="file-code"),
]

# Menu default yang terlihat oleh semua orang (bisa diakses tanpa scope khusus)
navigation_user = [
    Navigation(title="Home", url="/dashboard", icon="home"),
]

def seed_navigation(db: Session) -> None:
    if db.query(Navigation).count() == 0:
        logger.info("Seeding navigation...")
        
        # Cari scopes yang sudah dibuat oleh seed_users
        scope_user_manage = db.query(Scope).filter_by(key="user:manage").first()
        scope_nav_manage = db.query(Scope).filter_by(key="navigation:manage").first()
        
        # Assign scopes jika ketemu
        if scope_user_manage:
            navigation_admin[0].id_scope = scope_user_manage.id
        if scope_nav_manage:
            navigation_admin[1].id_scope = scope_nav_manage.id
            navigation_admin[2].id_scope = scope_nav_manage.id

        # Set index order
        for root_order, root in enumerate(navigation_user + navigation_admin):
            root.order = root_order
            if root.children:
                for child_order, child in enumerate(root.children):
                    child.order = child_order

        db.add_all(navigation_user + navigation_admin)
        db.flush()
