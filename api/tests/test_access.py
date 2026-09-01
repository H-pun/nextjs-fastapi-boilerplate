"""Scope enforcement and the lockout guard.

The checks the rest of the suite assumes but never proves: that a missing
scope is actually refused, and that the application cannot be left with
nobody able to administer it.
"""

from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from api.core.security import create_access_token, hash_password
from api.database import Role, Scope, User
from api.seeds.users import ADMIN_ROLE_ID, ADMIN_USER_ID, MEMBER_ROLE_ID

MEMBER_USER_ID = UUID("11111111-1111-1111-1111-1111111110a1")


@pytest.fixture(scope="module")
def member_token(db: Session) -> dict[str, str]:
    """A signed-in user holding only the member role — no `user:manage`."""
    user = User(
        id=MEMBER_USER_ID,
        name="Plain Member",
        username="plainmember",
        password=hash_password("Member123!"),
        identifier="1000000001",
    )
    user.roles = [db.get(Role, MEMBER_ROLE_ID)]
    db.add(user)
    db.commit()

    return {"Authorization": f"Bearer {create_access_token(subject=user.id)}"}


def test_no_token_is_unauthorized(client: TestClient):
    assert client.get("/user").status_code == 401


def test_missing_scope_is_forbidden(client: TestClient, member_token: dict[str, str]):
    r = client.get("/user", headers=member_token)
    assert r.status_code == 403
    # register_exception_handlers wraps HTTPException.detail as errors.message.
    assert "user:manage" in r.json()["errors"]["message"]


def test_scope_held_is_allowed(client: TestClient, user_token: dict[str, str]):
    assert client.get("/user", headers=user_token).status_code == 200


def test_scopes_come_from_the_database_not_the_token(
    client: TestClient, db: Session, member_token: dict[str, str]
):
    """Granting a role takes effect on the next request, without re-issuing the
    token — the whole point of reading permissions from the database."""
    subject = db.get(User, MEMBER_USER_ID)

    assert client.get("/user", headers=member_token).status_code == 403

    subject.roles = [db.get(Role, ADMIN_ROLE_ID)]
    db.commit()

    # Same token as before, now accepted.
    assert client.get("/user", headers=member_token).status_code == 200

    subject.roles = [db.get(Role, MEMBER_ROLE_ID)]
    db.commit()
    assert client.get("/user", headers=member_token).status_code == 403


def test_cannot_strip_the_last_admin(
    client: TestClient, db: Session, user_token: dict[str, str]
):
    """Leaving nobody with `user:manage` is refused: no one would be able to
    reach the pages that grant it back."""
    r = client.patch(
        f"/user/{ADMIN_USER_ID}/role",
        json={"role_ids": [str(MEMBER_ROLE_ID)]},
        headers=user_token,
    )
    assert r.status_code == 409

    db.expire_all()
    assert ADMIN_ROLE_ID in {role.id for role in db.get(User, ADMIN_USER_ID).roles}


def test_cannot_delete_the_last_admin_role(
    client: TestClient, db: Session, user_token: dict[str, str]
):
    r = client.delete(f"/role/{ADMIN_ROLE_ID}", headers=user_token)
    assert r.status_code == 409

    db.expire_all()
    assert db.get(Role, ADMIN_ROLE_ID) is not None


def test_cannot_revoke_admin_scope_from_the_last_admin_role(
    client: TestClient, db: Session, user_token: dict[str, str]
):
    r = client.put(
        f"/role/{ADMIN_ROLE_ID}/scopes",
        json={"scope_ids": []},
        headers=user_token,
    )
    assert r.status_code == 409

    db.expire_all()
    assert "user:manage" in {s.key for s in db.get(Role, ADMIN_ROLE_ID).scopes}


@pytest.mark.parametrize("bad_key", ["BadKey", "user.manage", "user:manage2", "user"])
def test_scope_key_format_is_enforced(db: Session, bad_key: str):
    """A malformed key would sit in the table protecting nothing, since scopes
    are matched by name. The database refuses it outright."""
    db.add(Scope(key=bad_key))
    with pytest.raises(IntegrityError):
        db.flush()
    db.rollback()


def test_scopes_are_listed_in_key_order(client: TestClient, user_token: dict[str, str]):
    """Ordered by the query, not by the client: without ORDER BY the rows come
    back in whatever order the heap holds them."""
    keys = [s["key"] for s in client.get("/role/scopes", headers=user_token).json()]
    assert keys == sorted(keys)
