"""Dev-only bulk user generator for table load / virtualization testing.

Not wired into `seed_all` — run on demand when you need many rows:

    npm run users:bulk -- 500
    npm run users:bulk -- --delete

Requires roles from `npm run seed` first.
"""

from __future__ import annotations

import argparse
import sys

from sqlalchemy import delete, func, insert, select
from sqlalchemy.orm import Session

from api.core.config import settings
from api.core.db import engine
from api.core.security import hash_password
from api.database import Role, User, UserIdentity, user_roles

DEFAULT_PASSWORD = "Member123!"
DEFAULT_PREFIX = "loadtest"
BATCH_SIZE = 200


def _guard_dev() -> None:
    if settings.ENVIRONMENT == "production":
        print("Refusing to run in production.", file=sys.stderr)
        sys.exit(1)


def _load_roles(db: Session) -> list[Role]:
    roles = list(db.scalars(select(Role).order_by(Role.name)).all())
    if not roles:
        print("No roles found. Run `npm run seed` first.", file=sys.stderr)
        sys.exit(1)
    return roles


def _next_start_index(db: Session, prefix: str) -> int:
    return (
        db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.username.like(f"{prefix}.%"))
        )
        or 0
    )


def generate_users(
    *,
    count: int,
    prefix: str = DEFAULT_PREFIX,
    password: str = DEFAULT_PASSWORD,
) -> None:
    _guard_dev()
    if count < 1:
        print("Count must be at least 1.", file=sys.stderr)
        sys.exit(1)

    password_hash = hash_password(password)

    with Session(engine) as db:
        roles = _load_roles(db)
        start_index = _next_start_index(db, prefix)
        created = 0

        for batch_offset in range(0, count, BATCH_SIZE):
            batch_size = min(BATCH_SIZE, count - batch_offset)
            users: list[User] = []

            for offset in range(batch_size):
                n = start_index + batch_offset + offset
                suffix = f"{n:06d}"
                users.append(
                    User(
                        identifier=f"{prefix.upper()}-{suffix}",
                        name=f"Load Test {suffix}",
                        username=f"{prefix}.{suffix}",
                        email=f"{prefix}.{suffix}@example.com",
                        password=password_hash,
                    )
                )

            db.add_all(users)
            db.flush()

            db.add_all(
                UserIdentity(user_id=user.id, provider="local", subject=str(user.id))
                for user in users
            )

            role_rows: list[dict[str, object]] = []
            for index, user in enumerate(users):
                primary = roles[index % len(roles)]
                role_rows.append({"user_id": user.id, "role_id": primary.id})
                # Every fifth user gets a second role to exercise grouped tables.
                if index % 5 == 0 and len(roles) > 1:
                    secondary = roles[(index + 1) % len(roles)]
                    if secondary.id != primary.id:
                        role_rows.append({"user_id": user.id, "role_id": secondary.id})

            db.execute(insert(user_roles), role_rows)
            db.commit()
            created += batch_size
            print(f"Created {created}/{count} users…")

    print(
        f"Done. {created} users added with prefix `{prefix}` "
        f"(password: {password})."
    )


def delete_users(*, prefix: str = DEFAULT_PREFIX) -> None:
    _guard_dev()

    with Session(engine) as db:
        ids = list(
            db.scalars(select(User.id).where(User.username.like(f"{prefix}.%"))).all()
        )
        if not ids:
            print(f"No users matched prefix `{prefix}`.")
            return

        db.execute(delete(User).where(User.id.in_(ids)))
        db.commit()
        print(f"Deleted {len(ids)} users with prefix `{prefix}`.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate or remove bulk dev users for table testing."
    )
    parser.add_argument(
        "count",
        nargs="?",
        type=int,
        default=100,
        help="How many users to create (default: 100)",
    )
    parser.add_argument(
        "--prefix",
        default=DEFAULT_PREFIX,
        help=f"Username / identifier prefix (default: {DEFAULT_PREFIX})",
    )
    parser.add_argument(
        "--password",
        default=DEFAULT_PASSWORD,
        help=f"Shared local password (default: {DEFAULT_PASSWORD})",
    )
    parser.add_argument(
        "--delete",
        action="store_true",
        help="Delete users whose username starts with `<prefix>.`",
    )
    args = parser.parse_args()

    if args.delete:
        delete_users(prefix=args.prefix)
    else:
        generate_users(count=args.count, prefix=args.prefix, password=args.password)


if __name__ == "__main__":
    main()
