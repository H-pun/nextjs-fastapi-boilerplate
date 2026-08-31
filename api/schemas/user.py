from datetime import datetime
from typing import Literal
from fastapi import Query
from typing_extensions import Annotated
from uuid import UUID
from api.schemas.pagination import FilterQuery
from pydantic import BaseModel, ConfigDict, Field, EmailStr

class UpdatePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=8, examples=['securepassword'])
    new_password: str = Field(..., min_length=8, examples=['newsecurepassword'])

class AdminResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8, examples=['newsecurepassword'])

class ChangeRoleRequest(BaseModel):
    role_id: UUID

class AuthenticateUserRequest(BaseModel):
    username: str = Field(..., examples=['johndoe'])
    password: str = Field(..., examples=['Admin123!'])

from api.schemas.role import RoleResponse

class AuthenticateUserResponse(BaseModel):
    id: UUID
    role: RoleResponse
    identifier: str
    name: str
    username: str
    email: EmailStr | None = None
    phone: str | None = None
    avatar: str | None = None
    cohort: int | None = None
    access_token: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(
        from_attributes=True,
    )

class UpdateUserRequest(BaseModel):
    identifier: str | None = Field("", min_length=1, max_length=50, examples=['EMP-0001'])
    name: str | None = Field("", max_length=50, examples=['John Doe'])
    email: EmailStr | Literal[""] = Field("", examples=['johndoe@example.com'])
    username: str | None = Field("", max_length=25, pattern=r'^[a-zA-Z0-9]+$', examples=['johndoe'])
    phone: str | None = Field("", max_length=15, examples=['+6281234567890'])
    cohort: int | None = Field(None, ge=1900, le=2100, examples=[2022])

class CreateUserRequest(BaseModel):
    identifier: str = Field(..., min_length=1, max_length=50, examples=['EMP-0001'])
    name: str = Field(..., max_length=50, examples=['John Doe'])
    username: str = Field(..., max_length=25, pattern=r'^[a-zA-Z0-9]+$', examples=['johndoe'])
    email: EmailStr | Literal[""] = Field("", examples=['johndoe@example.com'])
    password: str = Field(..., min_length=8, examples=['securepassword'])
    phone: str | None = Field("", max_length=15, examples=['+6281234567890'])
    role_id: UUID

class GetUserRequest(FilterQuery):
    role_id: UUID | None = None
    updated_within: int | None = Field(None, ge=1, description="Filter users updated within the last N days")

GetUserQuery = Annotated[GetUserRequest, Query()]
