from uuid import UUID
from fastapi import APIRouter, Security, HTTPException
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from api.core.deps import SessionDep, get_current_user
from api.database import Role, Scope, User
from api.schemas.role import (
    RoleResponse, ScopeResponse, CreateRoleRequest, 
    UpdateRoleRequest, SetRoleScopesRequest
)

router = APIRouter()

@router.get("", response_model=list[RoleResponse])
async def list_roles(db: SessionDep, user: User = Security(get_current_user, scopes=["user:manage"])):
    roles = db.scalars(select(Role)).all()
    return roles

@router.post("", response_model=RoleResponse, status_code=201)
async def create_role(db: SessionDep, data: CreateRoleRequest, user: User = Security(get_current_user, scopes=["user:manage"])):
    role = Role(name=data.name, code=data.code, description=data.description)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role

@router.patch("/{role_id}", response_model=RoleResponse)
async def update_role(db: SessionDep, role_id: UUID, data: UpdateRoleRequest, user: User = Security(get_current_user, scopes=["user:manage"])):
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    if role.is_system and data.isActive is False:
        raise HTTPException(400, "Cannot deactivate system role")
    
    if data.name:
        role.name = data.name
    if data.description is not None:
        role.description = data.description
    if data.isActive is not None:
        role.is_active = data.isActive
        
    db.commit()
    db.refresh(role)
    return role

@router.delete("/{role_id}")
async def delete_role(db: SessionDep, role_id: UUID, user: User = Security(get_current_user, scopes=["user:manage"])):
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    if role.is_system:
        raise HTTPException(400, "Cannot delete system role")
    db.delete(role)
    db.commit()
    return {"message": "success"}

@router.get("/scopes", response_model=list[ScopeResponse])
async def list_scopes(db: SessionDep, user: User = Security(get_current_user, scopes=["user:manage"])):
    scopes = db.scalars(select(Scope)).all()
    return scopes

@router.put("/{role_id}/scopes", response_model=RoleResponse)
async def set_role_scopes(db: SessionDep, role_id: UUID, data: SetRoleScopesRequest, user: User = Security(get_current_user, scopes=["user:manage"])):
    role = db.get(Role, role_id)
    if not role:
        raise HTTPException(404, "Role not found")
    
    scopes = db.scalars(select(Scope).where(Scope.id.in_(data.scope_ids))).all()
    role.scopes = scopes
    db.commit()
    db.refresh(role)
    return role
