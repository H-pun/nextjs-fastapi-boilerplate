from uuid import UUID
from fastapi import APIRouter, File, UploadFile

from api.core.deps import SessionDep, CurrentUser, S3ClientDep, only_admin
from api.schemas.user import (
    AuthenticateUserRequest, AuthenticateUserResponse, UpdateUserRequest,
    UpdatePasswordRequest, AdminResetPasswordRequest, ChangeRoleRequest,
    GetUserQuery, CreateUserRequest,
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


@router.get("")
async def get_all(db: SessionDep, user: CurrentUser, filters: GetUserQuery) -> Pagination[AuthenticateUserResponse]:
    only_admin(user)
    return await UserService.get_all_user(db, filters=filters)


@router.post("", status_code=201)
async def create(db: SessionDep, user: CurrentUser, data: CreateUserRequest):
    only_admin(user)
    await UserService.create_user(db, data=data)
    return {"message": "success"}


@router.put("/{id_user}")
async def update(db: SessionDep, user: CurrentUser, data: UpdateUserRequest, id_user: UUID):
    if user.id != id_user:
        only_admin(user)
    await UserService.update_user(db, data=data, id_user=id_user)
    return {"message": "success"}


@router.patch("/{id_user}/role")
async def change_role(db: SessionDep, user: CurrentUser, id_user: UUID, data: ChangeRoleRequest):
    only_admin(user)
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
async def reset_password(db: SessionDep, user: CurrentUser, id_user: UUID, data: AdminResetPasswordRequest):
    only_admin(user)
    await UserService.admin_reset_password(db, id_user=id_user, data=data)
    return {"message": "success"}


@router.delete("/{id_user}")
async def delete(db: SessionDep, user: CurrentUser, id_user: UUID):
    only_admin(user)
    await UserService.delete_user(db, id_user=id_user)
    return {"message": "success"}
