from uuid import UUID
from fastapi import APIRouter, Security

from api.core.deps import CurrentUser, SessionDep, get_current_user
from api.database import User
from api.schemas.navigation import GetNavigationResponse, SaveNavigationRequest
import api.services.navigation as NavigationService

router = APIRouter()

@router.get("")
async def list_navigation(db: SessionDep, user: CurrentUser, role_id: UUID | None = None) -> list[GetNavigationResponse]:
    # if role_id is not provided, fetch for the current user's role
    target_role = role_id if role_id else user.role_id
    
    # if a regular user tries to fetch someone else's navigation, deny or just give their own. 
    # For now, if role_id is provided and it's not the user's role, require navigation:manage
    if target_role != user.role_id:
        if "navigation:manage" not in (s.name for s in user.role.scopes):
            raise HTTPException(status_code=403, detail="Forbidden: Missing scope 'navigation:manage'")

    return await NavigationService.get_all_navigation(db, target_role)

@router.post("")
async def save_navigation(db: SessionDep, request: SaveNavigationRequest, user: User = Security(get_current_user, scopes=["navigation:manage"])) -> None:
    await NavigationService.save_navigation(db, request)
