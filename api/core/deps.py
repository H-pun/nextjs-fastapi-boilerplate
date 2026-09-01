import boto3
from mypy_boto3_s3.client import S3Client
from collections.abc import Generator
from functools import lru_cache
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, SecurityScopes
from sqlalchemy.orm import Session

from api.core.security import decode_access_token, TokenPayload
from api.core.db import engine
from api.core.config import settings
from api.database import User

bearer_scheme = HTTPBearer(
    description="Please insert JWT with Bearer into field",
    auto_error=False
)


def get_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        try:
            yield session
        finally:
            session.close()


@lru_cache()
def get_s3_client():
    client: S3Client = boto3.client(
        's3',
        endpoint_url=settings.MINIO_URL,
        aws_access_key_id=settings.MINIO_ROOT_USER,
        aws_secret_access_key=settings.MINIO_ROOT_PASSWORD,
    )
    try:
        client.create_bucket(Bucket=settings.S3_BUCKET)
    except client.exceptions.BucketAlreadyOwnedByYou:
        pass
    return client


def get_token(token: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> TokenPayload:
    if not token:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return decode_access_token(token.credentials)


SessionDep = Annotated[Session, Depends(get_db)]
TokenDep = Annotated[TokenPayload, Depends(get_token)]
S3ClientDep = Annotated[S3Client, Depends(get_s3_client)]


def get_current_user(
    security_scopes: SecurityScopes,
    session: SessionDep,
    token: TokenDep,
) -> User:
    """Resolve the caller and check they hold every required scope.

    Scopes come from the database, not from the token. Loading the user already
    pulls roles and scopes in the same round trip (`lazy="selectin"`), so this
    costs nothing extra and makes a revoked permission take effect immediately
    rather than whenever the token happens to expire.
    """
    # `sub` is a string so that an external provider's subject can be carried
    # unchanged; locally issued tokens hold this app's own user id.
    try:
        user_id = UUID(token.sub) if token.sub else None
    except ValueError:
        user_id = None

    user = session.get(User, user_id) if user_id else None
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if security_scopes.scopes:
        held = user.scope_keys
        missing = [s for s in security_scopes.scopes if s not in held]
        if missing:
            raise HTTPException(
                status_code=403,
                detail=f"Forbidden: missing scope {', '.join(missing)}",
                headers={"WWW-Authenticate": f'Bearer scope="{security_scopes.scope_str}"'},
            )

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
