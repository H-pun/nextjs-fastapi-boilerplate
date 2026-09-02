"""Keycloak sign-in.

The realm is stood in for by a key pair made here, so these run with no
Keycloak anywhere — what is being tested is this app's half of the exchange,
not Keycloak's.
"""
import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

import api.core.security as security
from api.core.config import settings
from api.database import Role, User, UserIdentity
from api.seeds.users import MEMBER_ROLE_ID

ISSUER = "https://keycloak.test/realms/boilerplate"
CLIENT_ID = "boilerplate"
base_url = "/user"


@pytest.fixture(scope="module")
def realm():
    """A signing key standing in for the realm's, plus a way to mint tokens."""
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()

    def issue(**claims) -> str:
        payload = {
            "sub": "kc-subject-1",
            "iss": ISSUER,
            "aud": CLIENT_ID,
            "exp": 9999999999,
            "preferred_username": "kcuser",
            "email": "kcuser@test.com",
            "email_verified": True,
            "name": "Keycloak User",
        }
        payload.update(claims)
        return jwt.encode(payload, private_pem, algorithm="RS256")

    return {"public_key": key.public_key(), "issue": issue}


@pytest.fixture(autouse=True)
def keycloak_configured(realm, monkeypatch):
    """Point the app at the stand-in realm and serve its public key."""
    monkeypatch.setattr(settings, "KEYCLOAK_ISSUER", ISSUER)
    monkeypatch.setattr(settings, "KEYCLOAK_CLIENT_ID", CLIENT_ID)

    class SigningKey:
        key = realm["public_key"]

    class JWKS:
        def get_signing_key_from_jwt(self, token):
            return SigningKey()

    monkeypatch.setattr(security, "_keycloak_jwks", lambda: JWKS())


def test_first_sign_in_creates_the_account(
    client: TestClient, db: Session, realm
):
    r = client.post(
        f"{base_url}/login/keycloak", json={"id_token": realm["issue"]()}
    )
    assert r.status_code == 200

    body = r.json()
    # The token handed back is this app's own, not the one Keycloak issued.
    assert body["access_token"] != realm["issue"]()
    assert body["email"] == "kcuser@test.com"

    # Neither is the provider's to give: the person picks a username later, an
    # admin assigns an identifier.
    assert body["username"] is None
    assert body["identifier"] is None

    identity = db.execute(
        select(UserIdentity).where(
            UserIdentity.provider == "keycloak",
            UserIdentity.subject == "kc-subject-1",
        )
    ).scalar_one()

    user = db.get(User, identity.user_id)
    # No local password: this account has no way in that does not go through
    # the provider.
    assert user.password is None
    assert [role.id for role in user.roles] == [MEMBER_ROLE_ID]


def test_second_sign_in_reuses_it(client: TestClient, db: Session, realm):
    first = client.post(
        f"{base_url}/login/keycloak", json={"id_token": realm["issue"]()}
    ).json()
    second = client.post(
        f"{base_url}/login/keycloak", json={"id_token": realm["issue"]()}
    ).json()

    assert first["id"] == second["id"]
    assert (
        db.scalar(
            select(func.count()).select_from(UserIdentity).where(
                UserIdentity.provider == "keycloak",
                UserIdentity.subject == "kc-subject-1",
            )
        )
        == 1
    )


def test_token_answers_for_the_user_it_named(client: TestClient, realm):
    body = client.post(
        f"{base_url}/login/keycloak", json={"id_token": realm["issue"]()}
    ).json()

    r = client.get(
        f"{base_url}/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert r.status_code == 200
    assert r.json()["email"] == "kcuser@test.com"


def test_member_role_carries_no_admin_scope(client: TestClient, realm):
    """Auto-provisioning must not hand out the keys to the place."""
    body = client.post(
        f"{base_url}/login/keycloak", json={"id_token": realm["issue"]()}
    ).json()

    r = client.get(
        base_url, headers={"Authorization": f"Bearer {body['access_token']}"}
    )
    assert r.status_code == 403


@pytest.mark.parametrize(
    "claims",
    [
        pytest.param({"aud": "another-client"}, id="audience"),
        pytest.param({"iss": "https://elsewhere/realms/x"}, id="issuer"),
        pytest.param({"exp": 1}, id="expiry"),
    ],
)
def test_rejects_tokens_that_fail_a_check(client: TestClient, realm, claims):
    r = client.post(
        f"{base_url}/login/keycloak",
        json={"id_token": realm["issue"](**claims)},
    )
    assert r.status_code == 401


def test_rejects_a_token_signed_by_someone_else(client: TestClient):
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    forged = jwt.encode(
        {"sub": "kc-subject-1", "iss": ISSUER, "aud": CLIENT_ID, "exp": 9999999999},
        other.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ).decode(),
        algorithm="RS256",
    )

    r = client.post(f"{base_url}/login/keycloak", json={"id_token": forged})
    assert r.status_code == 401


class TestLinkingBySharedEmail:
    """One person, two providers, one account — but only when the address is
    worth acting on. Everything here turns on that judgement."""

    def _existing(self, db: Session, *, email: str, verified: bool) -> User:
        """An account already holding the address, reached some other way."""
        user = User(
            name="Already Here",
            email=email,
            email_verified=verified,
            password=None,
        )
        user.roles = [db.get(Role, MEMBER_ROLE_ID)]
        # (provider, subject) is unique, so derive it from the address rather
        # than reusing one string across tests.
        user.identities = [UserIdentity(provider="google", subject=f"g-{email}")]
        db.add(user)
        db.commit()
        return user

    def test_links_when_the_provider_is_trusted(
        self, client: TestClient, db: Session, realm, monkeypatch
    ):
        monkeypatch.setattr(settings, "EMAIL_TRUSTED_PROVIDERS", ["keycloak"])
        existing = self._existing(db, email="shared@test.com", verified=True)

        body = client.post(
            f"{base_url}/login/keycloak",
            json={"id_token": realm["issue"](sub="kc-9", email="shared@test.com")},
        ).json()

        # Same account, now reachable both ways.
        assert body["id"] == str(existing.id)
        db.refresh(existing)
        assert {i.provider for i in existing.identities} == {"google", "keycloak"}

    def test_refuses_when_the_provider_is_not_trusted(
        self, client: TestClient, db: Session, realm, monkeypatch
    ):
        """The whole point of the list. An untrusted provider asserting an
        address must not reach an account built through a stricter one.

        With every account required to have an address, refusing to link also
        means refusing to sign in: a second row cannot hold the same one. That
        is the safer failure — two accounts claiming one address is the thing
        worth avoiding, and an admin can link them deliberately.
        """
        monkeypatch.setattr(settings, "EMAIL_TRUSTED_PROVIDERS", [])
        self._existing(db, email="untrusted@test.com", verified=True)

        r = client.post(
            f"{base_url}/login/keycloak",
            json={
                "id_token": realm["issue"](sub="kc-8", email="untrusted@test.com")
            },
        )

        assert r.status_code == 409

    def test_refuses_when_the_provider_has_not_verified_it(
        self, client: TestClient, db: Session, realm, monkeypatch
    ):
        monkeypatch.setattr(settings, "EMAIL_TRUSTED_PROVIDERS", ["keycloak"])
        self._existing(db, email="unverified@test.com", verified=True)

        r = client.post(
            f"{base_url}/login/keycloak",
            json={
                "id_token": realm["issue"](
                    sub="kc-7",
                    email="unverified@test.com",
                    email_verified=False,
                )
            },
        )

        assert r.status_code == 409

    def test_refuses_when_the_held_address_is_itself_unverified(
        self, client: TestClient, db: Session, realm, monkeypatch
    ):
        """Both sides have to be verified. An account holding an address nobody
        ever checked is not evidence of anything."""
        monkeypatch.setattr(settings, "EMAIL_TRUSTED_PROVIDERS", ["keycloak"])
        self._existing(db, email="halfway@test.com", verified=False)

        r = client.post(
            f"{base_url}/login/keycloak",
            json={"id_token": realm["issue"](sub="kc-6", email="halfway@test.com")},
        )

        assert r.status_code == 409

    def test_refuses_a_token_carrying_no_address(
        self, client: TestClient, realm
    ):
        """Keycloak makes email optional per user; this app does not. Better to
        say so than to create a row nobody could ever sign into."""
        r = client.post(
            f"{base_url}/login/keycloak",
            json={"id_token": realm["issue"](sub="kc-5", email=None)},
        )

        assert r.status_code == 400


def test_an_unknown_provider_is_a_404(client: TestClient, realm):
    """One route serves every provider, so a name this build has never heard of
    reaches the same handler. It must not be distinguishable from one that is
    merely unconfigured — telling them apart would say which providers exist."""
    r = client.post(
        f"{base_url}/login/nonesuch", json={"id_token": realm["issue"]()}
    )
    assert r.status_code == 404


def test_providers_endpoint_lists_what_is_offered(client: TestClient):
    r = client.get(f"{base_url}/auth/providers")
    assert r.status_code == 200

    body = r.json()
    # Always present; the rest depend on configuration.
    assert body["credentials"] is True
    assert "keycloak" in body


def test_turned_off_when_unconfigured(client: TestClient, realm, monkeypatch):
    monkeypatch.setattr(settings, "KEYCLOAK_ISSUER", None)
    r = client.post(
        f"{base_url}/login/keycloak", json={"id_token": realm["issue"]()}
    )
    assert r.status_code == 404
