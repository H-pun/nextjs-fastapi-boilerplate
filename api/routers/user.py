from uuid import UUID
from fastapi import APIRouter, File, HTTPException, UploadFile, Security

from api.core.config import settings
from api.core.deps import SessionDep, CurrentUser, S3ClientDep, get_current_user
from api.database import User
from api.schemas.user import (
    AuthenticateUserRequest, AuthenticateUserResponse, UpdateUserRequest,
    UpdatePasswordRequest, AdminResetPasswordRequest, ChangeRoleRequest,
    GetUserQuery, CreateUserRequest, OidcLoginRequest,
)
from api.schemas.pagination import Pagination

import api.services.user as UserService

router = APIRouter()

@router.get("/me")
async def get_me(user: CurrentUser) -> AuthenticateUserResponse:
    return AuthenticateUserResponse.model_validate(user)

@router.post("/login")
async def login(db: SessionDep, data: AuthenticateUserRequest) -> AuthenticateUserResponse:
    return await UserService.authenticate(db, data=data)

@router.get("/auth/providers")
async def auth_providers() -> dict[str, bool]:
    """Which ways in this deployment offers, so a client can show only the
    buttons that would work."""
    return {"credentials": True, **settings.oidc_providers}

@router.post("/login/{provider}")
async def login_oidc(db: SessionDep, provider: str, data: OidcLoginRequest) -> AuthenticateUserResponse:
    """Exchange a provider's token for this app's own.

    One route for every provider: the name in the path is the same one
    `user_identities.provider` stores. Unguarded by design — it is a way in,
    like /login. An unconfigured name answers 404 rather than admitting it
    exists.
    """
    return await UserService.authenticate_oidc(db, provider=provider, data=data)

@router.get("")
async def get_all(db: SessionDep, filters: GetUserQuery, user: User = Security(get_current_user, scopes=["user:manage"])) -> Pagination[AuthenticateUserResponse]:
    return await UserService.get_all_user(db, filters=filters)

@router.post("", status_code=201)
async def create(db: SessionDep, data: CreateUserRequest, user: User = Security(get_current_user, scopes=["user:manage"])):
    await UserService.create_user(db, data=data)
    return {"message": "success"}

@router.put("/{id_user}")
async def update(db: SessionDep, data: UpdateUserRequest, id_user: UUID, user: CurrentUser):
    # Anyone may edit their own profile; editing someone else needs the scope.
    if user.id != id_user and "user:manage" not in user.scope_keys:
        raise HTTPException(status_code=403, detail="Forbidden: missing scope user:manage")
    await UserService.update_user(db, data=data, id_user=id_user)
    return {"message": "success"}

@router.patch("/{id_user}/role")
async def change_role(db: SessionDep, id_user: UUID, data: ChangeRoleRequest, user: User = Security(get_current_user, scopes=["user:manage"])):
    await UserService.change_role(db, id_user=id_user, data=data)
    return {"message": "success"}

@router.patch("/me/avatar")
async def update_avatar(db: SessionDep, s3: S3ClientDep, user: CurrentUser, file: UploadFile = File(...)):
    key = await UserService.update_avatar(db, s3=s3, user=user, file=file)
    return {"avatar": key}

@router.put("/password")
async def update_password(db: SessionDep, data: UpdatePasswordRequest, user: CurrentUser):
    await UserService.update_password(db, data=data, user=user)
    return {"message": "success"}

@router.put("/{id_user}/reset-password")
async def reset_password(db: SessionDep, id_user: UUID, data: AdminResetPasswordRequest, user: User = Security(get_current_user, scopes=["user:manage"])):
    await UserService.admin_reset_password(db, id_user=id_user, data=data)
    return {"message": "success"}

@router.delete("/{id_user}")
async def delete(db: SessionDep, id_user: UUID, user: User = Security(get_current_user, scopes=["user:manage"])):
    await UserService.delete_user(db, id_user=id_user)
    return {"message": "success"}
