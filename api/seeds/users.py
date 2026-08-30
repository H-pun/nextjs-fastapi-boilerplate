from sqlalchemy.orm import Session
from api.core.security import hash_password
from api.database import User, Role, Scope
from api.core.logger import get_logger

logger = get_logger(__name__)

def seed_users(db: Session) -> None:
    # Seed Scopes
    scopes_data = [
        {"name": "user:read", "description": "Read users list"},
        {"name": "user:manage", "description": "Create, update, delete users"},
        {"name": "navigation:read", "description": "Read navigation"},
        {"name": "navigation:manage", "description": "Manage navigations"},
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
    admin_role = db.query(Role).filter_by(slug="admin").first()
    if not admin_role:
        logger.info("Seeding roles...")
        admin_role = Role(name="Admin", slug="admin")
        admin_role.scopes = scopes # Admin has all scopes
        db.add(admin_role)
        
        user_role = Role(name="User", slug="user")
        # Base user only has read access to their own things, maybe basic read
        user_role.scopes = [s for s in scopes if s.name in ["user:read", "navigation:read"]]
        db.add(user_role)
        
        db.flush()

    if db.query(User).count() == 0:
        logger.info("Seeding users...")
        user = User(
            name="Admin",
            identifier="0000000000",
            username="admin",
            password=hash_password("Admin123!"),
            role_id=admin_role.id,
        )
        db.add(user)
