from uuid import UUID
from fastapi import Query
from pydantic import BaseModel, ConfigDict, Field, field_validator

from api.schemas.user import UserRole


class Navigation(BaseModel):
    id: UUID
    title: str
    url: str | None = None
    icon: str | None = None
    order: int
    external: bool
    model_config = ConfigDict(
        from_attributes=True
    )


class GetNavigationResponse(Navigation):
    children: list[Navigation] = []


class SaveNavigationRequest(BaseModel):
    role: UserRole = Field(...)
    navigations: list[GetNavigationResponse] = Field(...)
