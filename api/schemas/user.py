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
    role_ids: list[UUID] = Field(..., min_length=1)

class AuthenticateUserRequest(BaseModel):
    # A username or an email address — provider accounts only have the latter.
    username: str = Field(..., examples=['johndoe'])
    password: str = Field(..., examples=['Admin123!'])

class OidcLoginRequest(BaseModel):
    """The token next-auth received from a provider, handed over to be exchanged
    for one of this app's own. Which provider is in the path."""
    id_token: str = Field(..., examples=['eyJhbGciOiJSUzI1NiIs...'])

from api.schemas.role import RoleResponse

class AuthenticateUserResponse(BaseModel):
    id: UUID
    roles: list[RoleResponse] = []
    # Both null for accounts that arrived through a provider: the person has not
    # picked a username yet, and no admin has assigned an identifier.
    identifier: str | None = None
    name: str
    # Null until the person picks one; the address stands in for it.
    username: str | None = None
    email: EmailStr
    avatar: str | None = None
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

class CreateUserRequest(BaseModel):
    identifier: str | None = Field(None, max_length=50, examples=['EMP-0001'])
    name: str = Field(..., max_length=50, examples=['John Doe'])
    # The address is how every account is reached; a username is a convenience
    # on top of it, and the person can add one later from their profile.
    email: EmailStr = Field(..., examples=['johndoe@example.com'])
    username: str | None = Field(None, max_length=25, pattern=r'^[a-zA-Z0-9]+$', examples=['johndoe'])
    password: str = Field(..., min_length=8, examples=['securepassword'])
    role_ids: list[UUID] = Field(..., min_length=1)

class GetUserRequest(FilterQuery):
    role_id: UUID | None = None
    updated_within: int | None = Field(None, ge=1, description="Filter users updated within the last N days")

GetUserQuery = Annotated[GetUserRequest, Query()]
