from sqlalchemy.orm import Session
from api.core.security import hash_password
from api.database import User, Role, Scope
from api.core.logger import get_logger

logger = get_logger(__name__)

def seed_users(db: Session) -> None:
    # Seed Scopes
    scopes_data = [
        {"key": "user:read", "label": "User Read", "description": "Read users list"},
        {"key": "user:manage", "label": "User Manage", "description": "Create, update, delete users"},
        {"key": "navigation:read", "label": "Navigation Read", "description": "Read navigation"},
        {"key": "navigation:manage", "label": "Navigation Manage", "description": "Manage navigations"},
    ]
    
    scopes = []
    if db.query(Scope).count() == 0:
        logger.info("Seeding scopes...")
        for data in scopes_data:
            scope = Scope(**data)
            db.add(scope)
            scopes.append(scope)
        db.flush()
    else:
        scopes = db.query(Scope).all()
        
    # Seed Roles
    admin_role = db.query(Role).filter_by(code="admin").first()
    if not admin_role:
        logger.info("Seeding roles...")
        admin_role = Role(name="Administrator", code="admin")
        admin_role.scopes = scopes # Admin has all scopes
        db.add(admin_role)
        
        user_role = Role(name="Team Member", code="user")
        # Base user only has basic read access
        user_role.scopes = [s for s in scopes if s.key in ["user:read", "navigation:read"]]
        db.add(user_role)
        
        db.flush()

    # Seed Admin User
    if db.query(User).count() == 0:
        logger.info("Seeding initial admin user...")
        user = User(
            name="Super Administrator",
            identifier="0000000000",
            username="admin",
            password=hash_password("Admin123!"),
            role_id=admin_role.id,
        )
        db.add(user)
        db.flush()
