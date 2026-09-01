from uuid import UUID
from fastapi import APIRouter, Security, HTTPException

from api.core.deps import CurrentUser, SessionDep, get_current_user
from api.database import User
from api.schemas.navigation import GetNavigationResponse, SaveNavigationRequest
import api.services.navigation as NavigationService

router = APIRouter()

@router.get("")
async def list_navigation(db: SessionDep, user: User = Security(get_current_user, scopes=["navigation:manage"])) -> list[GetNavigationResponse]:
    # Returns all navigations (Admin Editor)
    return await NavigationService.get_all_navigation(db)

@router.get("/me")
async def my_navigation(db: SessionDep, user: CurrentUser) -> list[GetNavigationResponse]:
    # Scope gated navigation for standard user UI
    return await NavigationService.get_navigation_for_user(db, user)

@router.post("")
async def save_navigation(db: SessionDep, request: SaveNavigationRequest, user: User = Security(get_current_user, scopes=["navigation:manage"])) -> None:
    await NavigationService.save_navigation(db, request)
