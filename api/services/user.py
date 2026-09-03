from pathlib import Path
from uuid import UUID
from fastapi import HTTPException, UploadFile
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, insert, or_, select, update
from sqlalchemy.orm import Session, selectinload
from mypy_boto3_s3.client import S3Client

from api.database import Role, User, UserIdentity, user_roles
from api.core.pagination import EMPTY_GROUP_KEY, paginate_select
from api.core.security import (
    hash_password, verify_password, create_access_token, verify_keycloak_token,
)
from api.core.config import settings
from api.services.role import guard_last_admin
from api.seeds.users import MEMBER_ROLE_ID
from api.schemas.user import (
    GetUserRequest, UpdateUserRequest, AuthenticateUserRequest,
    AuthenticateUserResponse, UpdatePasswordRequest, AdminResetPasswordRequest,
    CreateUserRequest, ChangeRoleRequest, OidcLoginRequest,
)
from api.schemas.pagination import Pagination


def _primary_role_name():
    """First role alphabetically — used when grouping users with many roles."""
    return (
        select(func.min(Role.name))
        .select_from(user_roles.join(Role, user_roles.c.role_id == Role.id))
        .where(user_roles.c.user_id == User.id)
        .correlate(User)
        .scalar_subquery()
    )


def _resolve_roles(db: Session, role_ids: list[UUID]) -> list[Role]:
    """Load the given roles, refusing ids that do not exist rather than
    silently handing back a user with fewer roles than was asked for."""
    roles = list(db.scalars(select(Role).where(Role.id.in_(role_ids))).all())
    if len(roles) != len(set(role_ids)):
        raise HTTPException(status_code=400, detail="One or more roles not found")
    return roles


async def authenticate(db: Session, *, data: AuthenticateUserRequest) -> AuthenticateUserResponse:
    # Either name works. Accounts created through a provider have no username
    # until the person picks one, so the address is all they could type.
    stmt = select(User).where(
        or_(User.username == data.username, User.email == data.username)
    )
    user = db.execute(stmt).scalars().one_or_none()
    # A null password means the account signs in through an external provider
    # only; reject it here rather than letting verify_password see a None.
    if not user or user.password is None or not verify_password(user.password, data.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    response = AuthenticateUserResponse.model_validate(user)
    # The token carries identity only. Permissions are read from the database
    # per request, so revoking one takes effect without waiting for expiry.
    response.access_token = create_access_token(subject=user.id)
    return response


def _link_by_email(db: Session, *, provider: str, email: str, verified: bool) -> User | None:
    """The account this address already belongs to, when it is safe to say so.

    One person with two providers should land on one account, not two. The only
    thing tying those sign-ins together is the email address — and an address is
    a claim about the world, not proof of anything, so acting on it needs both
    of these to hold:

    - the provider marks the address verified, and
    - the provider is named in EMAIL_TRUSTED_PROVIDERS.

    The second is the one that matters. Any provider can assert
    `email_verified: true`; what the list records is which of them actually
    checks before doing so. Without it, a provider that hands out addresses
    freely becomes a way onto an account created through a stricter one.

    Returns None whenever the answer is uncertain, which leaves the caller to
    create a separate account. Linking then happens from a signed-in session,
    where the person has already proved who they are.
    """
    if not verified or provider not in settings.EMAIL_TRUSTED_PROVIDERS:
        return None
    return db.execute(
        select(User).where(User.email == email, User.email_verified.is_(True))
    ).scalar_one_or_none()


def _verify(provider: str, id_token: str) -> dict:
    """Check a provider's token and hand back its claims.

    The one place that knows how each provider is verified. Adding another means
    adding a branch here — issuers, audiences and JWKS URLs differ enough that
    a table would only hide the differences rather than remove them.
    """
    if provider == "keycloak" and settings.keycloak_enabled:
        return verify_keycloak_token(id_token)

    # Not configured, or a name this build has never heard of. Both are a 404:
    # naming the difference would say which providers exist.
    raise HTTPException(status_code=404, detail="Sign-in with this provider is not configured")


async def authenticate_oidc(db: Session, *, provider: str, data: OidcLoginRequest) -> AuthenticateUserResponse:
    """Trade a verified provider token for one of this app's own.

    Everything downstream — `get_current_user`, every `Security(...)` guard —
    keeps seeing a single kind of token, so nothing else has to know any
    provider exists.
    """
    claims = _verify(provider, data.id_token)
    subject = claims.get("sub")
    if not subject:
        raise HTTPException(status_code=401, detail="Token carries no subject")

    # Who someone is here is decided by (provider, subject) and nothing else.
    # An address can be re-registered; this pair cannot.
    identity = db.execute(
        select(UserIdentity).where(
            UserIdentity.provider == provider,
            UserIdentity.subject == subject,
        )
    ).scalar_one_or_none()

    user = db.get(User, identity.user_id) if identity else None

    if not user:
        email = claims.get("email")
        verified = bool(claims.get("email_verified"))

        # Every account here is reached by its address, so one that arrives
        # without it could not be signed into or matched against a second
        # provider later. Keycloak treats email as optional per user; this app
        # does not, and says so rather than creating a row nobody can use.
        if not email:
            raise HTTPException(
                status_code=400,
                detail="Your account has no email address. Add one with your identity provider and sign in again.",
            )

        # Same person, second provider: attach the new identity rather than
        # opening a second account beside the first.
        user = _link_by_email(db, provider=provider, email=email, verified=verified)

        if user:
            user.identities.append(UserIdentity(provider=provider, subject=subject))
        else:
            member_role = db.get(Role, MEMBER_ROLE_ID)
            if not member_role:
                # Without the seeder having run there is no role to grant, and
                # an account with no roles holds no scopes — better to say so
                # than to create someone who cannot do anything.
                raise HTTPException(status_code=503, detail="Default role missing; run the seeder")

            # Someone else already answers to this address, and nothing here
            # says the two are the same person — either the provider has not
            # verified it, or it is not one this deployment trusts to check.
            # Two accounts must never claim one address, so refuse and let an
            # admin decide.
            if db.scalar(select(User.id).where(User.email == email)):
                raise HTTPException(
                    status_code=409,
                    detail="Another account already uses this email address.",
                )

            # `username` and `identifier` are left null on purpose. Both belong
            # to this app, and a provider has no say in either — the person
            # picks a username later, an admin fills in the identifier.
            user = User(
                name=(claims.get("name") or email).title(),
                email=email,
                email_verified=verified,
                # Null password: this account has no local way in.
                # `authenticate()` rejects those explicitly rather than
                # comparing against a placeholder hash.
                password=None,
            )
            user.roles = [member_role]
            user.identities = [UserIdentity(provider=provider, subject=subject)]
            db.add(user)

        db.commit()
        db.refresh(user)

    response = AuthenticateUserResponse.model_validate(user)
    response.access_token = create_access_token(subject=user.id)
    return response


async def update_user(
    db: Session,
    *,
    data: UpdateUserRequest,
    id_user: UUID,
    allow_role_change: bool = False,
):
    update_data = data.model_dump(
        exclude_defaults=True,
        exclude_unset=True,
        exclude={"role_ids"},
    )
    if update_data:
        db.execute(update(User).where(User.id == id_user).values(**update_data))

    if "role_ids" in data.model_fields_set:
        if not allow_role_change:
            raise HTTPException(
                status_code=403, detail="Forbidden: missing scope user:manage"
            )
        if data.role_ids is None or len(data.role_ids) < 1:
            raise HTTPException(status_code=400, detail="Pick at least one role")

        user = db.get(User, id_user)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.roles = _resolve_roles(db, data.role_ids)
        guard_last_admin(db)

    db.commit()


async def change_role(db: Session, *, id_user: UUID, data: ChangeRoleRequest):
    user = db.get(User, id_user)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.roles = _resolve_roles(db, data.role_ids)
    # Stripping the last admin's roles would lock everyone out just as surely
    # as deleting the role itself.
    guard_last_admin(db)
    db.commit()


async def update_avatar(db: Session, *, s3: S3Client, user: User, file: UploadFile) -> str:
    ext = Path(file.filename).suffix.lstrip(".")
    if ext not in {"jpg", "jpeg", "png", "webp"}:
        raise HTTPException(status_code=400, detail="Only jpg, jpeg, png, and webp are supported")
    key = f"avatars/{user.id}/{int(datetime.now(timezone.utc).timestamp())}.{ext}"
    contents = await file.read()
    s3.put_object(Bucket=settings.S3_BUCKET, Key=key, Body=contents, ContentType=file.content_type or f"image/{ext}")
    stmt = update(User).where(User.id == user.id).values(avatar=key)
    db.execute(stmt)
    db.commit()
    return key


async def update_password(db: Session, *, data: UpdatePasswordRequest, user: User):
    if not user or not verify_password(user.password, data.old_password):
        raise HTTPException(status_code=400, detail="Invalid old password")
    user.password = hash_password(data.new_password)
    db.commit()


async def admin_reset_password(db: Session, *, id_user: UUID, data: AdminResetPasswordRequest):
    stmt = update(User).where(User.id == id_user).values(password=hash_password(data.new_password))
    db.execute(stmt)
    db.commit()


def _users_by_role_membership_stmt():
    """One row per (user, role) — users with many roles appear in every bucket."""
    return (
        select(User)
        .options(selectinload(User.roles))
        .outerjoin(user_roles, User.id == user_roles.c.user_id)
        .outerjoin(Role, user_roles.c.role_id == Role.id)
    )


async def get_all_user(db: Session, *, filters: GetUserRequest) -> Pagination[AuthenticateUserResponse]:
    group_by_roles = filters.group_by == "roles"
    stmt = _users_by_role_membership_stmt() if group_by_roles else select(User).options(selectinload(User.roles))

    if filters.role_id:
        stmt = stmt.where(
            User.id.in_(
                select(user_roles.c.user_id).where(user_roles.c.role_id == filters.role_id)
            )
        )
    if filters.updated_within:
        since = datetime.now(timezone.utc) - timedelta(days=filters.updated_within)
        stmt = stmt.filter(User.updated_at >= since)

    searchable = [User.name, User.identifier, User.email, User.username]
    primary_role = _primary_role_name()
    roles_sort_col = Role.name if group_by_roles else primary_role
    sort_map = {
        "identifier": User.identifier,
        "name": User.name,
        "email": User.email,
        "username": User.username,
        "roles": roles_sort_col,
        "created_at": User.created_at,
        "updated_at": User.updated_at,
        "createdAt": User.created_at,
        "updatedAt": User.updated_at,
    }
    filter_map = {
        "identifier": User.identifier,
        "name": User.name,
        "email": User.email,
        "username": User.username,
        "createdAt": User.created_at,
        "updatedAt": User.updated_at,
    }

    group_map = {
        "identifier": User.identifier,
        "name": User.name,
        "email": User.email,
        "username": User.username,
        "roles": roles_sort_col,
    }

    page = paginate_select(
        db,
        stmt,
        filters=filters,
        searchable=searchable,
        sort_map=sort_map,
        filter_map=filter_map,
        group_map=group_map,
        default_sort=User.identifier,
    )

    keys = page.item_group_keys
    items: list[AuthenticateUserResponse] = []
    for index, user in enumerate(page.items):
        item = AuthenticateUserResponse.model_validate(user)
        if keys is not None:
            raw_key = keys[index]
            item = item.model_copy(
                update={
                    "group_key": None if raw_key == EMPTY_GROUP_KEY else raw_key
                }
            )
        items.append(item)

    return Pagination[AuthenticateUserResponse](
        total_items=page.total_items,
        total_pages=page.total_pages,
        page_size=page.page_size,
        page=page.page,
        items=items,
        group_by=page.group_by,
        groups=page.groups,
    )


async def delete_user(db: Session, *, id_user: UUID):
    db.execute(delete(User).where(User.id == id_user))
    # Deleting the only admin locks the application just as effectively as
    # stripping their roles.
    guard_last_admin(db)
    db.commit()


async def create_user(db: Session, *, data: CreateUserRequest):
    roles = _resolve_roles(db, data.role_ids)

    user = User(
        **data.model_dump(exclude={"name", "password", "role_ids"}),
        name=data.name.title(),
        password=hash_password(data.password),
    )
    user.roles = roles
    db.add(user)
    db.flush()
    # Records that this account signs in with a local password. External
    # providers add their own row here instead of a second user.
    db.add(UserIdentity(user_id=user.id, provider="local", subject=str(user.id)))
    db.commit()
