from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class ScopeResponse(BaseModel):
    id: UUID
    key: str
    label: str
    description: str | None = None
    order: int
    model_config = ConfigDict(from_attributes=True)

class RoleResponse(BaseModel):
    id: UUID
    code: str
    name: str
    description: str | None = None
    isSystem: bool = Field(alias="is_system")
    isActive: bool = Field(alias="is_active")
    scopes: list[ScopeResponse] = []
    order: int
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class CreateRoleRequest(BaseModel):
    name: str = Field(..., min_length=1)
    code: str = Field(..., min_length=1)
    description: str | None = None

class UpdateRoleRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    isActive: bool | None = Field(default=None, alias="is_active")

class SetRoleScopesRequest(BaseModel):
    scope_ids: list[UUID] = Field(...)
