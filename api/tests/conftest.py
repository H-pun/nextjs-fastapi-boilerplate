from collections.abc import Generator

import pytest
import sqlalchemy as sa
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine

from api.index import app
from api.database import Base
from api.core.config import settings
from api.core.deps import get_db
from api.seeder import seed_all

# Tests run on Postgres, like production. SQLite cannot express JSONB or a
# regex CHECK, so testing on it would mean weakening the schema to suit the
# tests — and would never have caught the constraint on `scopes.key`.
TEST_DB = f"{settings.POSTGRES_DB}_test"

_admin_url = str(settings.SQLALCHEMY_DATABASE_URI).replace(
    f"/{settings.POSTGRES_DB}?", "/postgres?"
)
SQLALCHEMY_DATABASE_URL = str(settings.SQLALCHEMY_DATABASE_URI).replace(
    f"/{settings.POSTGRES_DB}?", f"/{TEST_DB}?"
)


@pytest.fixture(scope="session", autouse=True)
def db() -> Generator[Session, None, None]:
    # Dropped and recreated per run, so a failed run cannot leave rows behind
    # for the next one to trip over.
    admin = create_engine(_admin_url, isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(sa.text(f'DROP DATABASE IF EXISTS "{TEST_DB}"'))
        conn.execute(sa.text(f'CREATE DATABASE "{TEST_DB}"'))
    admin.dispose()

    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    seed_all(engine, minimal=True)

    session_factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    with session_factory() as session:
        yield session

    engine.dispose()
    admin = create_engine(_admin_url, isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(sa.text(f'DROP DATABASE IF EXISTS "{TEST_DB}"'))
    admin.dispose()


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
