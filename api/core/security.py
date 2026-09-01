from uuid import UUID
import bcrypt
from typing import Any
from datetime import datetime, timedelta, timezone
from jwt import PyJWTError, encode, decode
from pydantic import BaseModel

from api.core.config import settings


class TokenPayload(BaseModel):
    """Claims this app relies on.

    `sub` is a plain string, not a UUID: an external provider issues whatever
    subject it likes — an email for Keycloak, a numeric id for Google — and
    typing it as UUID would reject those tokens before any logic runs.

    Permissions are deliberately absent. They are read from the database on
    each request (see `get_current_user`), so a token carrying stale scopes
    cannot grant anything.
    """

    sub: str | None = None
    exp: int | None = None
    iat: int | None = None


ALGORITHM = "HS256"


def create_access_token(subject: str | Any, *, payload: dict | None = None, expires_delta: timedelta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)) -> str:
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "iat": datetime.now(timezone.utc),
        **(payload or {})
    }
    encoded_jwt = encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> TokenPayload:
    payload = decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    return TokenPayload(**payload)


def get_id_from_header(token: dict[str, str]) -> UUID:
    return UUID(decode_access_token(token["Authorization"].split(" ")[1]).sub)


def verify_password(hashed_password: str, plain_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
