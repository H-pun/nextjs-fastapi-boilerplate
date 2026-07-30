from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine

from api.index import app
from api.database import Base
from api.core.deps import get_db
from api.seeder import seed_all

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[Session, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_all(engine, minimal=True)
    with TestingSessionLocal() as session:
        yield session


@pytest.fixture(scope="module")
def client(db: Session) -> Generator[TestClient, None, None]:
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as client:
        yield client


@pytest.fixture(scope="module")
def user_token(client: TestClient) -> dict[str, str]:
    data = {"username": "admin", "password": "Admin123!"}
    r = client.post("/user/login", json=data)
    assert r.status_code == 200

    response = r.json()
    assert "access_token" in response
    auth_token = response["access_token"]
    return {"Authorization": f"Bearer {auth_token}"}
