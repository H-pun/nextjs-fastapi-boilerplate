# Adding an OAuth / OIDC provider

Keycloak ships wired up. This walks through how it works and what to change to
sign in with something else — Google, Auth0, Okta, Authentik, Azure AD, GitHub.

## The shape of it

An external provider answers one question: **who is this person?** It says
nothing about what they may do inside this app. Roles and scopes stay here, in
this database, which is why the flow ends by trading the provider's token for
one of this app's own:

```
browser ──────────► provider           sign in there
        ◄────────── provider           id_token (signed, RS256)
NextAuth ─────────► POST /api/user/login/<provider>
                    ├── verify the signature against the provider's public keys
                    ├── check `aud` and `iss`
                    ├── match (provider, subject) in user_identities
                    ├── first time? create the user, grant Team Member
                    └── issue this app's own HS256 token
        ◄────────── UserData { ..., accessToken }
```

After that last step nothing else in the app knows a provider exists.
`get_current_user` and every `Security(..., scopes=[...])` guard keep seeing a
single kind of token. That is the point of the exchange: one code path to reason
about, not two.

**No secret is needed to verify.** The provider signs with a private key and
publishes the matching public one at a JWKS endpoint. `KEYCLOAK_CLIENT_SECRET`
belongs to NextAuth alone, for the authorization code exchange — the API never
reads it.

## Files involved

| File | Holds |
| --- | --- |
| `src/lib/auth-providers.ts` | **The registry.** One entry per provider: id, label, icon, env, exchange path |
| `src/lib/auth.ts` | Builds NextAuth's list from it, and trades the token |
| `src/app/login/_components/login-form.tsx` | Renders a button per entry — knows no provider by name |
| `api/core/config.py` | Settings, and `oidc_providers` naming what is configured |
| `api/core/security.py` | `verify_keycloak_token()` |
| `api/services/user.py` | `_verify()` dispatches; `authenticate_oidc()` matches, provisions, issues |
| `api/routers/user.py` | `POST /user/login/{provider}` — one route for all of them |
| `api/tests/test_keycloak.py` | The flow, and every way it should refuse |

Nothing outside the registry and `_verify` knows a provider by name. Adding one
is an entry on each side, not a new page, route, or flag.

---

## Two kinds of provider

Which one you have decides how much work this is.

### OIDC — issues an `id_token`

Keycloak, Google, Auth0, Okta, Cognito, Azure AD B2C. They publish
`/.well-known/openid-configuration`, sign tokens with RS256, and expose a JWKS
endpoint. The backend can verify a token on its own, without ever calling the
provider back.

**This is the pattern already implemented.** Adding one is mostly copying.

Do not go by reputation — check. Fourteen of the bundled providers set
`idToken: true`, and the list is not the one you would guess. Plain `azure-ad`
does not; `azure-ad-b2c` does. `authentik` is OIDC but leaves the flag off, so
its `id_token` has to be asked for explicitly.

```sh
grep -l 'idToken: true' node_modules/next-auth/providers/*.js
```

### Plain OAuth2 — no `id_token`

GitHub, Twitter, Discord, and most social providers. They hand back an opaque
`access_token` that means nothing on its own — the only way to learn who it
belongs to is to call the provider's userinfo endpoint with it.

That changes the backend's half:

- Nothing to verify cryptographically. The token is a bearer string, not a
  signed statement.
- The backend makes an outbound HTTP call per sign-in, so it now depends on the
  provider being up and reachable.
- The token is not tied to your client. It is worth confirming the one you were
  handed was actually issued to you.

See [Plain OAuth2](#plain-oauth2-no-id_token) below.

---

## Adding an OIDC provider

Google is used as the example. The steps are the same for Auth0, Okta, and
Cognito.

### 1. Environment variables

`.env.example`, then `.env`:

```sh
GOOGLE_ISSUER=https://accounts.google.com
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
```

`GOOGLE_ISSUER` must match the token's `iss` claim **exactly**. Not a redirect
of it, not the same host with a trailing slash — the string itself. Read it off
the provider's discovery document:

```sh
curl -s https://accounts.google.com/.well-known/openid-configuration | jq .issuer
```

### 2. Backend config — `api/core/config.py`

```python
GOOGLE_ISSUER: str | None = None
GOOGLE_CLIENT_ID: str | None = None
GOOGLE_CLIENT_SECRET: str | None = None   # NextAuth's; declared for scripts only

@computed_field  # type: ignore[misc]
@property
def google_enabled(self) -> bool:
    return bool(self.GOOGLE_ISSUER and self.GOOGLE_CLIENT_ID)
```

All optional, so a deployment that does not want Google leaves them blank and
nothing changes.

### 3. Verification — `api/core/security.py`

`verify_keycloak_token` generalises to any OIDC provider. Either copy it or
widen it:

```python
@lru_cache(maxsize=8)
def _jwks(url: str) -> PyJWKClient:
    return PyJWKClient(url)


def verify_oidc_token(token: str, *, jwks_url: str, audience: str, issuer: str) -> dict[str, Any]:
    key = _jwks(jwks_url).get_signing_key_from_jwt(token).key
    return decode(
        token, key,
        algorithms=["RS256"],
        audience=audience,
        issuer=issuer,
    )
```

`audience` and `issuer` are not optional extras:

- Without `audience`, a token the provider minted for **a different client** is
  accepted here. On a shared Google project or a shared Keycloak realm, that is
  every other app on it.
- Without `issuer`, a token from another tenant or realm gets in.

Some providers need more. Google's discovery document lists several possible
issuer strings; Azure AD's `iss` contains the tenant id, so a multi-tenant app
cannot pin one value and has to check `tid` instead. Read the discovery document
rather than assuming.

### 4. Provisioning — `api/services/user.py`

`authenticate_keycloak()` is the template. Copy it and change the provider
string:

```python
identity = db.execute(
    select(UserIdentity).where(
        UserIdentity.provider == "google",     # ← the only structural change
        UserIdentity.subject == subject,
    )
).scalar_one_or_none()
```

**Match on `(provider, subject)` only. Never on email.**

An email address is a claim about the world; `sub` is the provider's own
identifier for an account. Matching on email hands the account to anyone who can
get the provider to assert that address — and providers differ wildly in how
carefully they check.

### What the provider does not get to decide

`username` and `identifier` are left null for accounts arriving this way.

A provider's idea of a username is unique inside its own realm, not inside this
table. Taking it means inventing a suffixed near-miss the moment two collide —
`admin2`, a name meaning nothing to the person carrying it. Both columns belong
to this app: the person picks a username later from their profile, an admin
assigns an identifier if the deployment uses them.

So sign-in accepts either name:

```python
stmt = select(User).where(
    or_(User.username == data.username, User.email == data.username)
)
```

That leaves `email` as the only thing a new account arrives with, which is why
it is only kept when no other row holds it.

### Linking one person's second provider

Matching on `(provider, subject)` has one cost: the same person arriving through
a second provider looks like a stranger and gets a second account, with separate
roles.

`_link_by_email` closes that, under two conditions that both have to hold:

```python
if not verified or provider not in settings.EMAIL_TRUSTED_PROVIDERS:
    return None
return db.execute(
    select(User).where(User.email == email, User.email_verified.is_(True))
).scalar_one_or_none()
```

The second condition is the one that matters. **Any provider can claim
`email_verified: true`** — the list records which of them actually checks first.
Without it, a provider that hands out addresses freely becomes a way onto an
account created through a stricter one.

Set it in `.env`, comma-separated. Blank means never link automatically:

```sh
EMAIL_TRUSTED_PROVIDERS=keycloak,google
```

Both sides must be verified — an account holding an address nobody ever checked
is not evidence of anything. A provider left off the list still works; its users
link the second identity from a signed-in session, where they have already
proved who they are.

`password` stays `None`. `authenticate()` rejects those explicitly rather than
comparing against a placeholder hash, so an OIDC-only account has no local way
in — which is what you want.

### 5. Dispatch — `api/services/user.py`

No new route: `POST /user/login/{provider}` already serves every provider. Add a
branch to `_verify`:

```python
if provider == "google" and settings.google_enabled:
    return verify_oidc_token(
        id_token,
        jwks_url="https://www.googleapis.com/oauth2/v3/certs",
        audience=settings.GOOGLE_CLIENT_ID,
        issuer=("accounts.google.com", "https://accounts.google.com"),
    )
```

A branch rather than a table because issuers, audiences and JWKS URLs differ
enough between providers that a table would hide the differences rather than
remove them — Google publishes two valid issuer strings, Azure AD puts the
tenant id inside `iss`.

Anything unconfigured, or a name this build has never heard of, falls through to
`404`. Both answer the same way on purpose: telling them apart would reveal
which providers exist.

Then name it in `settings.oidc_providers`, which is what
`GET /user/auth/providers` reports.

### 6. The frontend registry — `src/lib/auth-providers.ts`

One entry, and the login page picks it up:

```ts
import GoogleProvider from "next-auth/providers/google";

const CANDIDATES = [
    // ...keycloak
    {
        id: "google",              // NextAuth's provider id, and the URL segment
        label: "Google",
        icon: "mail",              // any lucide name
        exchangePath: "/api/user/login/google",
        env: [
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
        ],
        build: () =>
            GoogleProvider({
                clientId: process.env.GOOGLE_CLIENT_ID!,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            }),
    },
];
```

That is the whole frontend change. `auth.ts` builds NextAuth's provider list
from entries whose `env` is complete, and the `jwt` callback looks the exchange
path up by `account.provider` — no branch per provider. `login-form.tsx`
renders a button for each, so the button appears on its own.

`env` is listed separately from `build` so "is this available" can be answered
without constructing anything.

Note `idToken`, camelCase, in the exchange. The Axios interceptor in
`src/lib/axios.ts` converts it to `id_token` on the way out and converts the
reply back on the way in — write camelCase on the frontend and let it do that.

### 7. Redirect URI

Register this with the provider:

```
http://localhost:3030/api/auth/callback/<provider-id>
```

`<provider-id>` is the `id` field in the NextAuth provider — `keycloak`,
`google`, `github`. Check it if unsure:

```sh
grep -m1 'id:' node_modules/next-auth/providers/google.js
```

This is the one setting that cannot be checked over HTTP. A typo here fails only
at the moment someone tries to sign in, with an error from the provider rather
than from this app.

---

## Plain OAuth2 (no `id_token`)

GitHub is the common case. There is no signed token to verify, so identity has
to be fetched:

```python
async def authenticate_github(db: Session, *, data: GithubLoginRequest):
    async with httpx.AsyncClient(timeout=10) as http:
        r = await http.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {data.access_token}"},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid provider token")

    profile = r.json()
    subject = str(profile["id"])   # numeric and immutable; `login` is neither
    ...
```

Four things to weigh before choosing this over OIDC:

1. **The token is not proof.** Anyone holding it can present it. Confirm it was
   issued to *your* client — GitHub answers that on
   `GET /applications/{client_id}/token`.
2. **Sign-in now depends on the provider being reachable.** An outbound call per
   login, with the timeout and failure mode that implies.
3. **`sub` may not be called `sub`.** GitHub's stable identifier is the numeric
   `id`. The `login` name is user-changeable — key on it and a rename silently
   creates a second account, or worse, hands the first one to whoever claims the
   freed name.
4. **Email is often absent.** GitHub omits it unless public; a second call to
   `/user/emails` is needed, and even then it may be unverified.

`httpx` is already a dependency (`api/requirements.txt`).

---

## When it does not work

Sign-in failures nearly all look the same from the login page — the button is
pressed and the page comes back. The useful signals are elsewhere:

| Where | What it tells you |
| --- | --- |
| `next dev` output | `?error=Callback` means the provider was reached and the failure came after, in the exchange |
| Backend log | Whether the exchange arrived at all, and what it answered |
| DevTools console | Whether the click reached `signIn` in the first place |

Two settings cannot be checked by any amount of code and account for most
first-time failures:

- **`ISSUER` must equal the `iss` claim exactly.** Compare against
  `{ISSUER}/.well-known/openid-configuration`. A trailing slash is a mismatch.
- **The redirect URI must match character for character**, and is only ever
  validated by the provider, at the moment someone signs in.

One thing worth checking before blaming the config: settings are read once at
startup, so a backend running from before you edited `.env` has never seen the
provider and will answer `404` to every exchange.

---

## Tests

`api/tests/test_keycloak.py` stands the realm in with a key pair generated in
the test, so it runs with no provider anywhere. What it covers is worth
repeating for a new provider:

| Test | Guards against |
| --- | --- |
| First sign-in creates the account | Provisioning silently failing |
| Second sign-in reuses it | A duplicate user per login |
| Token answers for the user it named | The exchange returning the wrong identity |
| Team Member carries no admin scope | Auto-provisioning handing out the keys |
| Wrong `aud` / `iss` / expiry rejected | The three checks quietly not running |
| Token signed by another key rejected | Signature verification not happening at all |
| `404` when unconfigured | A half-configured deployment accepting anything |
| Links only for a trusted provider | An untrusted one reaching an existing account |
| Refuses when either side is unverified | Acting on an address nobody checked |

```sh
pytest api/tests/test_keycloak.py
```

---

## Things worth deciding on purpose

**Auto-provisioning is a policy, not a default.** As written, anyone who can
sign in to the provider gets an account here with the Team Member role. That is
right for a realm whose members are all meant to have access, and wrong for a
shared or public one. The alternative — refuse until an admin creates the
account — is a smaller change than it sounds:

```python
if not user:
    raise HTTPException(status_code=403, detail="No account here for this identity")
```

**One user, many identities.** `user_identities` is a separate table precisely
so one person can hold several — Keycloak at the office, Google from home — all
resolving to the same `users` row and therefore the same roles. Automatic
linking is limited to `EMAIL_TRUSTED_PROVIDERS` for the reason above; anything
else links from an authenticated session, where the user has already proven who
they are here.

**Roles never come from the provider.** A provider's groups or roles claim
describes its world, not this one. Scopes are read from this database on every
request (`api/core/deps.py`), which is what makes revoking one take effect
immediately instead of whenever a token happens to expire. Mapping provider
groups onto roles is possible, but it moves authority outside the app — decide
that deliberately, not by accident.

**Do not put scopes in the token.** The token carries identity only
(`api/core/security.py`). A token holding permissions is a permission that
cannot be revoked until it expires.

---

## Reference

- [NextAuth v4 providers](https://next-auth.js.org/providers/) — 60+ built in
- [`OAuthConfig`](https://next-auth.js.org/configuration/providers/oauth#using-a-custom-provider) — for a provider with no built-in
- [PyJWT `PyJWKClient`](https://pyjwt.readthedocs.io/en/stable/usage.html#retrieve-rsa-signing-keys-from-a-jwks-endpoint)
- [OpenID Connect Core — ID Token validation](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)
