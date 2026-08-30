from pathlib import Path
from uuid import UUID
from fastapi import HTTPException, UploadFile
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, update, insert
from sqlalchemy.orm import Session
from mypy_boto3_s3.client import S3Client

from api.database import User
from api.core.pagination import paginate_select
from api.core.security import hash_password, verify_password, create_access_token
from api.core.config import settings
from api.schemas.user import (
    GetUserRequest, UpdateUserRequest, AuthenticateUserRequest,
    AuthenticateUserResponse, UpdatePasswordRequest, AdminResetPasswordRequest,
    CreateUserRequest, ChangeRoleRequest,
)
from api.schemas.pagination import Pagination

async def authenticate(db: Session, *, data: AuthenticateUserRequest) -> AuthenticateUserResponse:
    stmt = select(User).where(User.username == data.username)
    user = db.execute(stmt).scalars().one_or_none()
    if not user or not verify_password(user.password, data.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    response = AuthenticateUserResponse.model_validate(user)
    
    # Pack role and scopes into token
    role_slug = user.role.slug if user.role else ""
    scopes = [s.name for s in user.role.scopes] if user.role else []
    
    response.access_token = create_access_token(
        subject=user.id,
        payload={"role": role_slug, "scopes": scopes}
    )
    return response

async def update_user(db: Session, *, data: UpdateUserRequest, id_user: UUID):
    update_data = data.model_dump(exclude_defaults=True, exclude_unset=True)
    if update_data:
        db.execute(update(User).where(User.id == id_user).values(**update_data))
    db.commit()

async def change_role(db: Session, *, id_user: UUID, data: ChangeRoleRequest):
    db.execute(update(User).where(User.id == id_user).values(role_id=data.role_id))
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
        stmt = stmt.filter(User.role_id == filters.role_id)
    if filters.updated_within:
        since = datetime.now(timezone.utc) - timedelta(days=filters.updated_within)
        stmt = stmt.filter(User.updated_at >= since)

    searchable = [User.name, User.identifier, User.email, User.username, User.phone]
    sort_map = {
        "identifier": User.identifier,
        "name": User.name,
        "email": User.email,
        "username": User.username,
        "role_id": User.role_id,
        "phone": User.phone,
        "created_at": User.created_at,
        "updated_at": User.updated_at,
    }

    return paginate_select(
        db,
        stmt,
        filters=filters,
        searchable=searchable,
        sort_map=sort_map,
        default_sort=User.identifier,
    )

async def delete_user(db: Session, *, id_user: UUID):
    stmt = delete(User).where(User.id == id_user)
    db.execute(stmt)
    db.commit()

async def create_user(db: Session, *, data: CreateUserRequest):
    stmt = insert(User).values({
        **data.model_dump(exclude={"name", "password"}),
        "name": data.name.title(),
        "password": hash_password(data.password),
    })
    db.execute(stmt)
    db.commit()
