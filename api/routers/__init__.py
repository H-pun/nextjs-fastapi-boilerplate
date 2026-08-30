from fastapi import APIRouter

from . import server, navigation, user, role

api_router = APIRouter()
api_router.include_router(server.router, prefix="/server", tags=["Server"])
api_router.include_router(navigation.router, prefix="/navigation", tags=["Navigation"])
api_router.include_router(user.router, prefix="/user", tags=["User"])
api_router.include_router(role.router, prefix="/role", tags=["Role"])
