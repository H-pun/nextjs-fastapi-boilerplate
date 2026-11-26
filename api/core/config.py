import secrets
import warnings
from typing import Annotated, Literal

from pydantic import (
    AnyHttpUrl,
    BeforeValidator,
    PostgresDsn,
    computed_field,
    model_validator,
)
from pydantic_core import MultiHostUrl
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict
from typing_extensions import Self


def parse_cors(v: str | list[str]) -> list[str] | str:
    """Comma-separated env value to a list.

    A list arrives untouched — a field left at its default never went through
    the environment, and calling `.split()` on it is how this failed before.
    """
    if isinstance(v, list) or v == "*":
        return v
    return [i.strip() for i in v.split(",") if i.strip()]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_ignore_empty=True, extra="ignore"
    )
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = secrets.token_urlsafe(32)
    # 60 minutes * 24 hours * 8 days = 8 days
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 3
    DOMAIN: str = "localhost"
    ENVIRONMENT: Literal["development", "production", "test"] = "development"

    @computed_field  # type: ignore[misc]
    @property
    def server_host(self) -> str:
        # HTTPS for anything but local development. "development", not "local":
        # ENVIRONMENT cannot hold "local", so that comparison was never true and
        # every environment got https://.
        if self.ENVIRONMENT == "development":
            return f"http://{self.DOMAIN}"
        return f"https://{self.DOMAIN}"

    BACKEND_CORS_ORIGINS: Annotated[
        list[AnyHttpUrl] | Literal["*"], BeforeValidator(parse_cors)
    ] = []

    MINIO_URL: str
    MINIO_ROOT_USER: str
    MINIO_ROOT_PASSWORD: str
    S3_BUCKET: str = "app"

    # Blank means username/password is the only way in. The backend holds no
    # secret with Keycloak — it verifies tokens against the realm's published
    # public keys, so the issuer and the client id are all it needs.
    #
    # KEYCLOAK_CLIENT_SECRET is deliberately absent: it belongs to NextAuth, for
    # the authorization code exchange. `extra="ignore"` lets it sit in .env
    # unread rather than being handed to a process with no use for it.
    KEYCLOAK_ISSUER: str | None = None
    KEYCLOAK_CLIENT_ID: str | None = None

    @computed_field  # type: ignore[misc]
    @property
    def keycloak_enabled(self) -> bool:
        return bool(self.KEYCLOAK_ISSUER and self.KEYCLOAK_CLIENT_ID)

    @computed_field  # type: ignore[misc]
    @property
    def oidc_providers(self) -> dict[str, bool]:
        """Which external providers this deployment is configured for.

        Keyed by the same name `user_identities.provider` stores and the login
        route takes, so adding one is adding an entry here and a branch in
        `authenticate_oidc` — not a new endpoint.
        """
        return {"keycloak": self.keycloak_enabled}

    @computed_field  # type: ignore[misc]
    @property
    def keycloak_jwks_url(self) -> str | None:
        if not self.KEYCLOAK_ISSUER:
            return None
        return f"{self.KEYCLOAK_ISSUER.rstrip('/')}/protocol/openid-connect/certs"

    # Providers whose `email_verified` claim is worth acting on, so that one
    # person arriving through a second provider lands on the account they
    # already have instead of a duplicate.
    #
    # Read this as a list of providers trusted *to check email ownership*, not
    # merely trusted to sign tokens. A provider that lets anyone register any
    # address, or that has an admin who can set one by hand, does not belong
    # here: it would let whoever holds that address take over the account. Left
    # out, a provider still works — its users just have to link the second
    # identity from a signed-in session, where they have already proved who
    # they are.
    #
    # Comma-separated. `NoDecode` is what makes that possible: pydantic-settings
    # otherwise reads any `list[str]` as JSON at the source layer, before a
    # validator ever runs, so `keycloak` in .env would fail at startup and only
    # `["keycloak"]` would work.
    #
    # There is deliberately no `*`. Trusting every provider to vouch for email
    # ownership is the thing this list exists to prevent.
    EMAIL_TRUSTED_PROVIDERS: Annotated[
        list[str], NoDecode, BeforeValidator(parse_cors)
    ] = []

    SENTRY_DSN: AnyHttpUrl | None = None

    PROJECT_NAME: str
    POSTGRES_HOST: str
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str
    POSTGRES_SCHEMA: str = "public"

    @computed_field  # type: ignore[misc]
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> PostgresDsn:
        return MultiHostUrl.build(
            scheme="postgresql+psycopg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_HOST,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_DB,
            query=f"options=-csearch_path={self.POSTGRES_SCHEMA}"
        )

    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    SMTP_PORT: int = 587
    SMTP_HOST: str | None = None
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    # TODO: update type to EmailStr when sqlmodel supports it
    EMAILS_FROM_EMAIL: str | None = None
    EMAILS_FROM_NAME: str | None = None

    @model_validator(mode="after")
    def _set_default_emails_from(self) -> Self:
        if not self.EMAILS_FROM_NAME:
            self.EMAILS_FROM_NAME = self.PROJECT_NAME
        return self

    EMAIL_RESET_TOKEN_EXPIRE_HOURS: int = 48

    @computed_field  # type: ignore[misc]
    @property
    def emails_enabled(self) -> bool:
        return bool(self.SMTP_HOST and self.EMAILS_FROM_EMAIL)

    def _check_default_secret(self, var_name: str, value: str | None) -> None:
        if value == "changethis":
            message = (
                f'The value of {var_name} is "changethis", '
                "for security, please change it, at least for deployments."
            )
            if self.ENVIRONMENT == "development":
                warnings.warn(message, stacklevel=1)
            else:
                raise ValueError(message)

    @model_validator(mode="after")
    def _enforce_non_default_secrets(self) -> Self:
        self._check_default_secret("SECRET_KEY", self.SECRET_KEY)
        self._check_default_secret("POSTGRES_PASSWORD", self.POSTGRES_PASSWORD)

        return self


settings = Settings()  # type: ignore
