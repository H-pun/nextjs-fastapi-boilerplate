from pathlib import Path
from uuid import UUID
from fastapi import HTTPException, UploadFile
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, update, insert
from sqlalchemy.orm import Session
from mypy_boto3_s3.client import S3Client

from api.database import Role, User, UserIdentity, user_roles
from api.core.pagination import paginate_select
from api.core.security import hash_password, verify_password, create_access_token
from api.core.config import settings
from api.services.role import guard_last_admin
from api.schemas.user import (
    GetUserRequest, UpdateUserRequest, AuthenticateUserRequest,
    AuthenticateUserResponse, UpdatePasswordRequest, AdminResetPasswordRequest,
    CreateUserRequest, ChangeRoleRequest,
)
from api.schemas.pagination import Pagination


def _resolve_roles(db: Session, role_ids: list[UUID]) -> list[Role]:
    """Load the given roles, refusing ids that do not exist rather than
    silently handing back a user with fewer roles than was asked for."""
    roles = list(db.scalars(select(Role).where(Role.id.in_(role_ids))).all())
    if len(roles) != len(set(role_ids)):
        raise HTTPException(status_code=400, detail="One or more roles not found")
    return roles


async def authenticate(db: Session, *, data: AuthenticateUserRequest) -> AuthenticateUserResponse:
    stmt = select(User).where(User.username == data.username)
    user = db.execute(stmt).scalars().one_or_none()
    # A null password means the account signs in through an external provider
    # only; reject it here rather than letting verify_password see a None.
    if not user or user.password is None or not verify_password(user.password, data.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    response = AuthenticateUserResponse.model_validate(user)
    # The token carries identity only. Permissions are read from the database
    # per request, so revoking one takes effect without waiting for expiry.
    response.access_token = create_access_token(subject=user.id)
    return response


async def update_user(db: Session, *, data: UpdateUserRequest, id_user: UUID):
    update_data = data.model_dump(exclude_defaults=True, exclude_unset=True)
    if update_data:
        db.execute(update(User).where(User.id == id_user).values(**update_data))
    db.commit()


async def change_role(db: Session, *, id_user: UUID, data: ChangeRoleRequest):
    user = db.get(User, id_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.roles = _resolve_roles(db, data.role_ids)
    # Stripping the last admin's roles would lock everyone out just as surely
    # as deleting the role itself.
    guard_last_admin(db)
    db.commit()


async def update_avatar(db: Session, *, s3: S3Client, user: User, file: UploadFile) -> str:
    ext = Path(file.filename).suffix.lstrip(".")
    if ext not in {"jpg", "jpeg", "png", "webp"}:
        raise HTTPException(status_code=400, detail="Only jpg, jpeg, png, and webp are supported")
    key = f"avatars/{user.id}/{int(datetime.now(timezone.utc).timestamp())}.{ext}"
    contents = await file.read()
    s3.put_object(Bucket=settings.S3_BUCKET, Key=key, Body=contents, ContentType=file.content_type or f"image/{ext}")
    stmt = update(User).where(User.id == user.id).values(avatar=key)
    db.execute(stmt)
    db.commit()
    return key


async def update_password(db: Session, *, data: UpdatePasswordRequest, user: User):
    if not user or not verify_password(user.password, data.old_password):
        raise HTTPException(status_code=400, detail="Invalid old password")
    user.password = hash_password(data.new_password)
    db.commit()


async def admin_reset_password(db: Session, *, id_user: UUID, data: AdminResetPasswordRequest):
    stmt = update(User).where(User.id == id_user).values(password=hash_password(data.new_password))
    db.execute(stmt)
    db.commit()


async def get_all_user(db: Session, *, filters: GetUserRequest) -> Pagination[AuthenticateUserResponse]:
    stmt = select(User)

    if filters.role_id:
        stmt = stmt.where(
            User.id.in_(
                select(user_roles.c.user_id).where(user_roles.c.role_id == filters.role_id)
            )
        )
    if filters.updated_within:
        since = datetime.now(timezone.utc) - timedelta(days=filters.updated_within)
        stmt = stmt.filter(User.updated_at >= since)

    searchable = [User.name, User.identifier, User.email, User.username, User.phone]
    sort_map = {
        "identifier": User.identifier,
        "name": User.name,
        "email": User.email,
        "username": User.username,
        "phone": User.phone,
        "created_at": User.created_at,
        "updated_at": User.updated_at,
        "createdAt": User.created_at,
        "updatedAt": User.updated_at,
    }
    filter_map = {
        "identifier": User.identifier,
        "name": User.name,
        "email": User.email,
        "username": User.username,
        "phone": User.phone,
        "createdAt": User.created_at,
        "updatedAt": User.updated_at,
    }

    return paginate_select(
        db,
        stmt,
        filters=filters,
        searchable=searchable,
        sort_map=sort_map,
        filter_map=filter_map,
        default_sort=User.identifier,
    )


async def delete_user(db: Session, *, id_user: UUID):
    db.execute(delete(User).where(User.id == id_user))
    # Deleting the only admin locks the application just as effectively as
    # stripping their roles.
    guard_last_admin(db)
    db.commit()


async def create_user(db: Session, *, data: CreateUserRequest):
    roles = _resolve_roles(db, data.role_ids)

    user = User(
        **data.model_dump(exclude={"name", "password", "role_ids"}),
        name=data.name.title(),
        password=hash_password(data.password),
    )
    user.roles = roles
    db.add(user)
    db.flush()
    # Records that this account signs in with a local password. External
    # providers add their own row here instead of a second user.
    db.add(UserIdentity(user_id=user.id, provider="local", subject=str(user.id)))
    db.commit()
