from datetime import datetime
from typing import Literal
from fastapi import Query
from typing_extensions import Annotated
from uuid import UUID
from enum import IntEnum
from api.schemas.pagination import FilterQuery
from pydantic import BaseModel, ConfigDict, Field, EmailStr, field_serializer


class UserRole(IntEnum):
    USER = 1
    ADMIN = 2

    @classmethod
    def _missing_(cls, v):
        """Dipanggil kalau parsing enum gagal"""
        if isinstance(v, str):
            try:
                return cls[v.upper()]
            except KeyError:
                raise ValueError(f"Invalid role name: {v}")


class UpdatePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=8, examples=['securepassword'])
    new_password: str = Field(..., min_length=8, examples=['newsecurepassword'])


class AdminResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8, examples=['newsecurepassword'])


class ChangeRoleRequest(BaseModel):
    role: UserRole


class AuthenticateUserRequest(BaseModel):
    username: str = Field(..., examples=['johndoe'])
    password: str = Field(..., examples=['Admin123!'])


class AuthenticateUserResponse(BaseModel):
    id: UUID
    role: UserRole
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

    @field_serializer('role')
    def get_enum_name(v) -> str:
        return v.name


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
    role: UserRole = UserRole.USER


class GetUserRequest(FilterQuery):
    role: UserRole | None = None
    updated_within: int | None = Field(None, ge=1, description="Filter users updated within the last N days")


GetUserQuery = Annotated[GetUserRequest, Query()]
