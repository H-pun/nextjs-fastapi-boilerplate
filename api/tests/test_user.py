from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from sqlalchemy import select
from uuid import uuid4

from api.database import User, Role
from api.core.security import verify_password, get_id_from_header
from api.seeds.users import MEMBER_ROLE_ID

base_url = "/user"


def test_auth_success(client: TestClient, user_token: dict[str, str]):
    r = client.get(f"{base_url}/me", headers=user_token)
    assert r.status_code == 200

    current_user = r.json()
    assert current_user["username"] == "admin"
    assert "id" in current_user
    assert "access_token" in current_user
    assert "password" not in current_user


def test_sign_in_with_an_email_address(client: TestClient, db: Session):
    """Accounts created through a provider have no username until the person
    picks one, so the address has to work in its place."""
    user = db.scalar(select(User).where(User.username == "admin"))
    user.email = "admin@test.com"
    db.commit()

    r = client.post(
        f"{base_url}/login",
        json={"username": "admin@test.com", "password": "Admin123!"},
    )
    assert r.status_code == 200
    assert r.json()["id"] == str(user.id)


def test_listing_survives_a_placeholder_address(
    client: TestClient, db: Session, user_token: dict[str, str]
):
    """The migration fills in an address for rows that predate the rule, and
    `AuthenticateUserResponse.email` is an `EmailStr` — so a placeholder that
    fails validation takes the whole listing down with it, not just its own row.
    """
    user = User(
        name="Placeholder Address",
        email=f"user-{uuid4()}@example.com",
        password=None,
    )
    user.roles = [db.get(Role, MEMBER_ROLE_ID)]
    db.add(user)
    db.commit()

    r = client.get(base_url, headers=user_token)
    assert r.status_code == 200


def test_auth_fail(client: TestClient):
    r = client.get(f"{base_url}/me")
    assert r.status_code == 401


def test_create_user(client: TestClient, db: Session, user_token: dict[str, str]):
    data = {
        "identifier": "1234567890",
        "name": "New User",
        "email": "user@test.com",
        "username": "newuser",
        "password": "newpassword",
        "role_ids": [str(MEMBER_ROLE_ID)],
    }
    r = client.post(base_url, json=data, headers=user_token)
    assert r.status_code == 201

    user_db = db.execute(select(User).where(User.username == data["username"])).scalar_one_or_none()
    assert user_db
    assert user_db.email == data["email"]
    assert verify_password(user_db.password, data["password"])
    assert [role.id for role in user_db.roles] == [MEMBER_ROLE_ID]
    # Local sign-in is recorded as an identity, ready for a provider to join it.
    assert [i.provider for i in user_db.identities] == ["local"]


def test_update_user(client: TestClient, db: Session, user_token: dict[str, str]):
    new_data = {
        "email": "updateduser@test.com",
        "username": "updateduser",
    }
    user_id = get_id_from_header(user_token)
    r = client.put(f"{base_url}/{user_id}", json=new_data, headers=user_token)
    assert r.status_code == 200
    assert r.json()["message"] == "success"

    updated_user = db.get(User, user_id)
    assert updated_user.email == new_data["email"]
    assert updated_user.username == new_data["username"]


def test_delete_user(client: TestClient, db: Session, user_token: dict[str, str]):
    member = db.get(Role, MEMBER_ROLE_ID)
    # Setup: create dummy user
    user = User(
        id=uuid4(),
        name="To Be Deleted",
        username="tobedeleted",
        email="tobedeleted@test.com",
        password="temporary",
        identifier="9999999999",
    )
    user.roles = [member]
    db.add(user)
    db.commit()
    db.refresh(user)

    # Act
    r = client.delete(f"{base_url}/{user.id}", headers=user_token)
    assert r.status_code == 200
    assert r.json()["message"] == "success"

    # Assert: check user is gone
    assert db.get(User, user.id) is None
