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
EDITOR_ROLE_ID = UUID("11111111-1111-1111-1111-111111111003")
USER_MANAGER_ROLE_ID = UUID("11111111-1111-1111-1111-111111111004")
OBSERVER_ROLE_ID = UUID("11111111-1111-1111-1111-111111111005")
ADMIN_USER_ID = UUID("11111111-1111-1111-1111-111111111011")

# Default password for seeded member accounts (dev / demo only).
MOCK_MEMBER_PASSWORD = "Member123!"

# (id, name, description, scope keys)
MOCK_ROLES = [
    (
        ADMIN_ROLE_ID,
        "Administrator",
        "Full access to every part of the application.",
        ("user:read", "user:manage", "navigation:read", "navigation:manage"),
    ),
    (
        MEMBER_ROLE_ID,
        "Team Member",
        "Read-only access to shared data.",
        ("user:read", "navigation:read"),
    ),
    (
        EDITOR_ROLE_ID,
        "Editor",
        "Can manage navigation and read user data.",
        ("user:read", "navigation:read", "navigation:manage"),
    ),
    (
        USER_MANAGER_ROLE_ID,
        "User Manager",
        "Can manage user accounts and read navigation.",
        ("user:read", "user:manage", "navigation:read"),
    ),
    (
        OBSERVER_ROLE_ID,
        "Observer",
        "Read-only access to navigation.",
        ("navigation:read",),
    ),
]

# (id, name, identifier, username, email, role_ids)
MOCK_USERS = [
    (
        UUID("11111111-1111-1111-1111-111111111012"),
        "Alice Chen",
        "1000000001",
        "alice.chen",
        "alice@example.com",
        [EDITOR_ROLE_ID],
    ),
    (
        UUID("11111111-1111-1111-1111-111111111013"),
        "Alice Walker",
        "1000000002",
        "alice.walker",
        None,
        [MEMBER_ROLE_ID],
    ),
    (
        UUID("11111111-1111-1111-1111-111111111014"),
        "Bob Martinez",
        "1000000003",
        "bob.martinez",
        "bob@example.com",
        [EDITOR_ROLE_ID],
    ),
    (
        UUID("11111111-1111-1111-1111-111111111015"),
        "Bob Nguyen",
        "1000000004",
        "bob.nguyen",
        "bob@acme.io",
        [MEMBER_ROLE_ID],
    ),
    (
        UUID("11111111-1111-1111-1111-111111111016"),
        "Carol Davis",
        "1000000005",
        "carol.davis",
        "carol@example.com",
        [USER_MANAGER_ROLE_ID],
    ),
    (
        UUID("11111111-1111-1111-1111-111111111017"),
        "Carol Kim",
        "1000000006",
        "carol.kim",
        None,
        [USER_MANAGER_ROLE_ID],
    ),
    (
        UUID("11111111-1111-1111-1111-111111111018"),
        "David Lee",
        "1000000007",
        "david.lee",
        "david@acme.io",
        [USER_MANAGER_ROLE_ID],
    ),
    (
        UUID("11111111-1111-1111-1111-111111111019"),
        "Emma Wilson",
        "1000000008",
        "emma.wilson",
        "emma@example.com",
        [OBSERVER_ROLE_ID],
    ),
    (
        UUID("11111111-1111-1111-1111-11111111101a"),
        "Frank Torres",
        "1000000009",
        "frank.torres",
        "frank@acme.io",
        [OBSERVER_ROLE_ID],
    ),
    (
        UUID("11111111-1111-1111-1111-11111111101b"),
        "Grace Park",
        "1000000010",
        "grace.park",
        "grace@example.com",
        [MEMBER_ROLE_ID],
    ),
    (
        UUID("11111111-1111-1111-1111-11111111101c"),
        "Henry Brown",
        "1000000011",
        "henry.brown",
        None,
        [MEMBER_ROLE_ID],
    ),
    (
        UUID("11111111-1111-1111-1111-11111111101d"),
        "Ivy Chen",
        "1000000012",
        "ivy.chen",
        "ivy@example.com",
        [MEMBER_ROLE_ID],
    ),
    (
        UUID("11111111-1111-1111-1111-11111111101e"),
        "Jack Miller",
        "1000000013",
        "jack.miller",
        "jack@acme.io",
        [OBSERVER_ROLE_ID],
    ),
    (
        UUID("11111111-1111-1111-1111-11111111101f"),
        "Kate Johnson",
        "1000000014",
        "kate.johnson",
        "kate@example.com",
        [MEMBER_ROLE_ID, EDITOR_ROLE_ID],
    ),
    (
        UUID("11111111-1111-1111-1111-111111111020"),
        "Liam O'Brien",
        "1000000015",
        "liam.obrien",
        "liam@example.com",
        [MEMBER_ROLE_ID],
    ),
]

# Referenced by name in Security(..., scopes=[...]); deleting one would leave
# those endpoints permanently 403, which is why there is no delete endpoint.
SCOPES = [
    ("user:read", "Read users list"),
    ("user:manage", "Create, update, delete users, roles, and scopes"),
    ("navigation:read", "Read navigation"),
    ("navigation:manage", "Manage navigations"),
]

def _seed_local_user(
    db: Session,
    *,
    user_id: UUID,
    name: str,
    identifier: str,
    username: str,
    password: str,
    roles: list[Role],
    email: str | None = None,
) -> bool:
    if db.get(User, user_id):
        return False

    user = User(
        id=user_id,
        name=name,
        identifier=identifier,
        username=username,
        email=email,
        password=hash_password(password),
    )
    user.roles = roles
    user.identities = [UserIdentity(provider="local", subject=str(user_id))]
    db.add(user)
    return True


def _assign_roles(user: User, roles: list[Role]) -> None:
    user.roles = roles


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

    roles_by_id: dict[UUID, Role] = {}
    created_roles = 0
    for role_id, name, description, scope_keys in MOCK_ROLES:
        role = db.get(Role, role_id)
        if not role:
            role = Role(id=role_id, name=name, description=description)
            role.scopes = [scopes[key] for key in scope_keys]
            db.add(role)
            created_roles += 1
        roles_by_id[role_id] = role

    db.flush()
    if created_roles:
        logger.info("Seeded %s role(s).", created_roles)

    admin_role = roles_by_id[ADMIN_ROLE_ID]

    if _seed_local_user(
        db,
        user_id=ADMIN_USER_ID,
        name="Super Administrator",
        identifier="0000000000",
        username="admin",
        # Placeholder for a seeded account — change before this reaches prod.
        email="admin@example.com",
        password="Admin123!",
        roles=[admin_role],
    ):
        logger.info("Seeded initial admin user.")

    created_members = 0
    for user_id, name, identifier, username, email, role_ids in MOCK_USERS:
        roles = [roles_by_id[role_id] for role_id in role_ids]
        if _seed_local_user(
            db,
            user_id=user_id,
            name=name,
            identifier=identifier,
            username=username,
            email=email,
            password=MOCK_MEMBER_PASSWORD,
            roles=roles,
        ):
            created_members += 1
        else:
            user = db.get(User, user_id)
            if user:
                _assign_roles(user, roles)

    db.flush()
    if created_members:
        logger.info(
            "Seeded %s mock member user(s) (password: %s).",
            created_members,
            MOCK_MEMBER_PASSWORD,
        )
