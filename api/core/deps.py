import boto3
from mypy_boto3_s3.client import S3Client

from collections.abc import Generator
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from api.core.security import decode_access_token, TokenPayload
from api.core.db import engine
from api.core.config import settings
from api.database import User
from api.schemas.user import UserRole

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


def get_current_user(session: SessionDep, token: TokenDep) -> User:
    return session.query(User).filter(User.id == token.sub).one()


def only_admin(user: User) -> User:
    if user.role != UserRole.ADMIN and settings.ENVIRONMENT != "development":
        raise HTTPException(status_code=403, detail="Forbidden: Only admins can perform this action")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
