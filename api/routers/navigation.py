from uuid import UUID
from fastapi import APIRouter, HTTPException

from api.core.deps import CurrentUser, SessionDep, only_admin
from api.schemas.navigation import GetNavigationResponse, SaveNavigationRequest
from api.schemas.user import UserRole
import api.services.navigation as NavigationService


router = APIRouter()


@router.get("")
async def list_navigation(db: SessionDep, user: CurrentUser, role: UserRole) -> list[GetNavigationResponse]:
    return await NavigationService.get_all_navigation(db, user.role if user.role == UserRole.USER else role)


@router.post("")
async def save_navigation(db: SessionDep, user: CurrentUser, request: SaveNavigationRequest) -> None:
    only_admin(user)
    await NavigationService.save_navigation(db, request)
