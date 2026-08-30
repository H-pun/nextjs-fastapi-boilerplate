from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import Session

from api.core.deps import SessionDep
from api.database import Role
from api.schemas.user import RoleResponse

router = APIRouter()

@router.get("")
async def list_roles(db: SessionDep) -> list[RoleResponse]:
    roles = db.scalars(select(Role)).all()
    return [RoleResponse.model_validate(role) for role in roles]
