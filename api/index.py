import sentry_sdk
from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware

# from contextlib import asynccontextmanager

from api.core.config import settings
from api.core.deps import CurrentUser, only_admin
from api.core.exception import register_exception_handlers
# from api.core.logger import logger
from api.routers import api_router
from api.middleware import LoggingMiddleware
# from api.scheduler import start_scheduler

is_prod = settings.ENVIRONMENT == "production"


def custom_generate_unique_id(route: APIRoute) -> str:
    s = f"{route.tags[0]}-{route.name}"
    return "".join(ch if (ch.isalnum() or ch in "_-") else "_" for ch in s)

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     scheduler = start_scheduler()
#     scheduler.start()
#     logger.info("✅ Scheduler started.")
#     yield
#     scheduler.shutdown()
#     logger.info("❌ Scheduler stopped.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    root_path=settings.API_V1_STR,
    # swagger_ui_parameters={"operationsSorter": "method"},
    generate_unique_id_function=custom_generate_unique_id,
    # lifespan=lifespan,
    docs_url="/docs" if not is_prod else None,
    redoc_url="/redoc" if not is_prod else None,
    openapi_url="/openapi.json" if not is_prod else None,
)

register_exception_handlers(app)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            str(origin).strip("/") for origin in settings.BACKEND_CORS_ORIGINS
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# broke one error response
# app.add_middleware(LoggingMiddleware)

app.include_router(api_router)


@app.get("/openapi.json", tags=["Documentation"])
async def get_open_api_endpoint(user: CurrentUser):
    only_admin(user)
    schema = get_openapi(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        openapi_version="3.0.0",
        routes=app.routes,
        servers=[{"url": settings.API_V1_STR}]
    )
    return schema


if settings.SENTRY_DSN and is_prod:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        enable_tracing=True,
        send_default_pii=True,
    )
