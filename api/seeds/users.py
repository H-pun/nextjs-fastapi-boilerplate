from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import select
from api.core.security import hash_password
from api.database import User, UserIdentity, Role, Scope
from api.core.logger import get_logger

logger = get_logger(__name__)

# Seeded rows are addressed by fixed id, never by name — an admin renaming
# "Administrator" through the UI must not make the next seeder run create a
# second one. Same trick the navigation seed uses.
ADMIN_ROLE_ID = UUID("11111111-1111-1111-1111-111111111001")
MEMBER_ROLE_ID = UUID("11111111-1111-1111-1111-111111111002")
ADMIN_USER_ID = UUID("11111111-1111-1111-1111-111111111011")

# Referenced by name in Security(..., scopes=[...]); deleting one would leave
# those endpoints permanently 403, which is why there is no delete endpoint.
SCOPES = [
    ("user:read", "Read users list"),
    ("user:manage", "Create, update, delete users, roles, and scopes"),
    ("navigation:read", "Read navigation"),
    ("navigation:manage", "Manage navigations"),
]

# What a plain member gets. Everything else is admin-only.
MEMBER_SCOPES = {"user:read", "navigation:read"}


def seed_users(db: Session) -> None:
    logger.info("Seeding scopes, roles, and admin user...")

    scopes: dict[str, Scope] = {}
    for key, description in SCOPES:
        scope = db.execute(select(Scope).where(Scope.key == key)).scalar_one_or_none()
        if not scope:
            scope = Scope(key=key, description=description)
            db.add(scope)
        scopes[key] = scope
    db.flush()

    admin_role = db.get(Role, ADMIN_ROLE_ID)
    if not admin_role:
        admin_role = Role(
            id=ADMIN_ROLE_ID,
            name="Administrator",
            description="Full access to every part of the application.",
        )
        admin_role.scopes = list(scopes.values())
        db.add(admin_role)

    member_role = db.get(Role, MEMBER_ROLE_ID)
    if not member_role:
        member_role = Role(
            id=MEMBER_ROLE_ID,
            name="Team Member",
            description="Read-only access to shared data.",
        )
        member_role.scopes = [scopes[k] for k in MEMBER_SCOPES]
        db.add(member_role)

    db.flush()

    if not db.get(User, ADMIN_USER_ID):
        logger.info("Seeding initial admin user...")
        user = User(
            id=ADMIN_USER_ID,
            name="Super Administrator",
            identifier="0000000000",
            username="admin",
            # Every account is reached by its address. This one is a placeholder
            # for a seeded account that nobody will email — change it, along with
            # the password, before this reaches anywhere real.
            email="admin@example.com",
            password=hash_password("Admin123!"),
        )
        user.roles = [admin_role]
        # Marks how this account signs in. Unused while standalone is the only
        # mode, and the row an external provider would be matched against later.
        user.identities = [
            UserIdentity(provider="local", subject=str(ADMIN_USER_ID))
        ]
        db.add(user)
        db.flush()

