from uuid import UUID
import bcrypt
from functools import lru_cache
from typing import Any
from datetime import datetime, timedelta, timezone
from jwt import PyJWKClient, encode, decode
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


@lru_cache(maxsize=1)
def _keycloak_jwks() -> PyJWKClient:
    """Keycloak's public keys, fetched once and kept.

    `PyJWKClient` caches per instance and re-fetches when a token names a key
    it has not seen, so a realm rotating its signing key recovers on its own.
    """
    if not settings.keycloak_jwks_url:
        raise RuntimeError("Keycloak is not configured")
    return PyJWKClient(settings.keycloak_jwks_url)


def verify_keycloak_token(token: str) -> dict[str, Any]:
    """Check a Keycloak-issued token and hand back its claims.

    `audience` and `issuer` are not decoration. Without the first, a token
    Keycloak minted for a different client in the same realm would be accepted
    here; without the second, so would one from another realm entirely.

    Verification needs no secret — Keycloak signs with a private key and
    publishes the matching public one, which is why this app never has to hold
    credentials for the realm it trusts.
    """
    key = _keycloak_jwks().get_signing_key_from_jwt(token).key
    return decode(
        token,
        key,
        algorithms=["RS256"],
        audience=settings.KEYCLOAK_CLIENT_ID,
        issuer=settings.KEYCLOAK_ISSUER,
    )


def get_id_from_header(token: dict[str, str]) -> UUID:
    return UUID(decode_access_token(token["Authorization"].split(" ")[1]).sub)


def verify_password(hashed_password: str, plain_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
