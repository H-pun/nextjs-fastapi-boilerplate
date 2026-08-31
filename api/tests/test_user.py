from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4

from api.database import User, Role
from api.core.security import verify_password, get_id_from_header

base_url = "/user"


def test_auth_success(client: TestClient, user_token: dict[str, str]):
    r = client.get(f"{base_url}/me", headers=user_token)
    assert r.status_code == 200

    current_user = r.json()
    assert current_user["username"] == "admin"
    assert "id" in current_user
    assert "access_token" in current_user
    assert "password" not in current_user


def test_auth_fail(client: TestClient):
    r = client.get(f"{base_url}/me")
    assert r.status_code == 401


def test_create_user(client: TestClient, db: Session, user_token: dict[str, str]):
    # Need to fetch a valid role ID first
    role = db.query(Role).filter_by(code="user").first()
    
    data = {
        "identifier": "1234567890",
        "name": "New User",
        "email": "user@test.com",
        "username": "newuser",
        "password": "newpassword",
        "role_id": str(role.id)
    }
    r = client.post(base_url, json=data, headers=user_token)
    assert r.status_code == 201

    user_db = db.query(User).filter_by(username=data["username"]).first()
    assert user_db
    assert user_db.email == data["email"]
    assert verify_password(user_db.password, data["password"])


def test_update_user(client: TestClient, db: Session, user_token: dict[str, str]):
    new_data = {
        "email": "updateduser@test.com",
        "username": "updateduser",
    }
    user_id = get_id_from_header(user_token)
    r = client.put(f"{base_url}/{user_id}", json=new_data, headers=user_token)
    assert r.status_code == 200
    assert r.json()["message"] == "success"

    updated_user = db.query(User).filter_by(id=user_id).first()
    assert updated_user.email == new_data["email"]
    assert updated_user.username == new_data["username"]


def test_delete_user(client: TestClient, db: Session, user_token: dict[str, str]):
    role = db.query(Role).filter_by(code="user").first()
    # Setup: create dummy user
    user = User(
        id=uuid4(),
        name="To Be Deleted",
        username="tobedeleted",
        password="temporary",
        identifier="9999999999",
        role_id=role.id
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Act
    r = client.delete(f"{base_url}/{user.id}", headers=user_token)
    assert r.status_code == 200
    assert r.json()["message"] == "success"

    # Assert: check user is gone
    assert db.query(User).filter_by(id=user.id).first() is None
