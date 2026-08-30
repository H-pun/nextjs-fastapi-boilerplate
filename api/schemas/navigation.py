from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

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
    role_id: UUID = Field(...)
    navigations: list[GetNavigationResponse] = Field(...)
