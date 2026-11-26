from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ScopeResponse(BaseModel):
    id: UUID
    key: str
    description: str | None = None
    model_config = ConfigDict(from_attributes=True)


class RoleResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    scopes: list[ScopeResponse] = []
    model_config = ConfigDict(from_attributes=True)


class CreateRoleRequest(BaseModel):
    name: str = Field(..., min_length=1)
    description: str | None = None


class UpdateRoleRequest(BaseModel):
    name: str | None = None
    description: str | None = None


class SetRoleScopesRequest(BaseModel):
    scope_ids: list[UUID] = Field(...)

