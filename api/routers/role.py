from uuid import UUID
from fastapi import APIRouter, Security

from api.core.deps import SessionDep, get_current_user
from api.database import User
from api.schemas.role import (
    RoleResponse, ScopeResponse, CreateRoleRequest,
    UpdateRoleRequest, SetRoleScopesRequest,
)

import api.services.role as RoleService

router = APIRouter()


@router.get("")
async def get_all(db: SessionDep, user: User = Security(get_current_user, scopes=["user:manage"])) -> list[RoleResponse]:
    return await RoleService.get_all_roles(db)


# Declared before /{role_id} so "scopes" is not swallowed as a role id.
@router.get("/scopes")
async def get_scopes(db: SessionDep, user: User = Security(get_current_user, scopes=["user:manage"])) -> list[ScopeResponse]:
    return await RoleService.get_all_scopes(db)


@router.post("", status_code=201)
async def create(db: SessionDep, data: CreateRoleRequest, user: User = Security(get_current_user, scopes=["user:manage"])) -> RoleResponse:
    return await RoleService.create_role(db, data=data)


@router.patch("/{role_id}")
async def update(db: SessionDep, role_id: UUID, data: UpdateRoleRequest, user: User = Security(get_current_user, scopes=["user:manage"])) -> RoleResponse:
    return await RoleService.update_role(db, role_id=role_id, data=data)


@router.delete("/{role_id}")
async def delete(db: SessionDep, role_id: UUID, user: User = Security(get_current_user, scopes=["user:manage"])):
    await RoleService.delete_role(db, role_id=role_id)
    return {"message": "success"}


@router.put("/{role_id}/scopes")
async def set_scopes(db: SessionDep, role_id: UUID, data: SetRoleScopesRequest, user: User = Security(get_current_user, scopes=["user:manage"])) -> RoleResponse:
    return await RoleService.set_role_scopes(db, role_id=role_id, data=data)

