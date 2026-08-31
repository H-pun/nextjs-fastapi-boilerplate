from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field

class Navigation(BaseModel):
    id: UUID
    title: str
    url: str | None = None
    icon: str | None = None
    order: int
    external: bool
    id_scope: UUID | None = None
    model_config = ConfigDict(
        from_attributes=True
    )

class GetNavigationResponse(Navigation):
    children: list[Navigation] = []

class SaveNavigationRequest(BaseModel):
    navigations: list[GetNavigationResponse] = Field(...)
