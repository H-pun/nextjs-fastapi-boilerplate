import logging
import os
import subprocess
import sys

import sqlalchemy as sa
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from api.database import Navigation, Role, Scope, User
from api.seeder import seed_all
from api.seeds.users import ADMIN_USER_ID, MOCK_MEMBER_PASSWORD, MOCK_USERS


def _run_alembic(database: str, revision: str) -> None:
    env = os.environ.copy()
    env["POSTGRES_DB"] = database
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", revision],
        check=True,
        env=env,
        capture_output=True,
        text=True,
    )


def test_fresh_database_migrates_and_full_seed_is_idempotent(
    disposable_database, caplog,
) -> None:
    database, database_url = disposable_database("bootstrap")
    _run_alembic(database, "head")
    engine = create_engine(database_url)

    with caplog.at_level(logging.INFO):
        seed_all(engine)
        seed_all(engine)

    inspector = sa.inspect(engine)
    columns = {column["name"]: column for column in inspector.get_columns("users")}
    assert columns["identifier"]["nullable"] is True
    assert columns["username"]["nullable"] is True
    assert columns["email"]["nullable"] is False

    with Session(engine) as session:
        assert session.scalar(select(func.count()).select_from(Scope)) == 4
        assert session.scalar(select(func.count()).select_from(Role)) == 5
        assert session.scalar(select(func.count()).select_from(Navigation)) == 5
        assert session.scalar(select(func.count()).select_from(User)) == 1 + len(MOCK_USERS)
        emails = list(session.scalars(select(User.email)))
        assert len(emails) == len(set(emails))
        assert all(email.endswith("@example.com") or email.endswith("@acme.io") for email in emails)

    assert MOCK_MEMBER_PASSWORD not in caplog.text
    engine.dispose()


def test_minimal_seed_excludes_members_and_is_idempotent(
    disposable_database, caplog,
) -> None:
    database, database_url = disposable_database("minimal")
    _run_alembic(database, "head")
    engine = create_engine(database_url)

    with caplog.at_level(logging.INFO):
        seed_all(engine, minimal=True)
        seed_all(engine, minimal=True)

    with Session(engine) as session:
        users = list(session.scalars(select(User)))
        assert [user.id for user in users] == [ADMIN_USER_ID]
        assert session.scalar(select(func.count()).select_from(Scope)) == 4
        assert session.scalar(select(func.count()).select_from(Role)) == 5
        assert session.scalar(select(func.count()).select_from(Navigation)) == 5

    assert MOCK_MEMBER_PASSWORD not in caplog.text
    engine.dispose()


def test_legacy_objects_are_cleaned_up(disposable_database) -> None:
    database, database_url = disposable_database("legacy")
    _run_alembic(database, "0c7086b6f17d")
    engine = create_engine(database_url)
    with engine.begin() as connection:
        connection.execute(sa.text("ALTER TABLE users ADD COLUMN phone VARCHAR"))
        connection.execute(sa.text("ALTER TABLE users ADD COLUMN cohort INTEGER"))
        connection.execute(sa.text("ALTER TABLE users ADD CONSTRAINT users_phone_key UNIQUE (phone)"))
        connection.execute(
            sa.text(
                "CREATE TABLE activity_logs ("
                "id UUID PRIMARY KEY, id_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE"
                ")"
            )
        )
    engine.dispose()

    _run_alembic(database, "head")
    engine = create_engine(database_url)
    inspector = sa.inspect(engine)
    assert not inspector.has_table("activity_logs")
    assert "phone" not in {column["name"] for column in inspector.get_columns("users")}
    assert "cohort" not in {column["name"] for column in inspector.get_columns("users")}
    assert "users_phone_key" not in {
        constraint["name"] for constraint in inspector.get_unique_constraints("users")
    }
    engine.dispose()
