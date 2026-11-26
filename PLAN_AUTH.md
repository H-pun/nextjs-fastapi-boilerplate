# PLAN: Dual-Mode Auth & Scope-Based RBAC Architecture

## 1. Overview & Objectives
* **Agnostic Resource Server:** Backend FastAPI bertindak murni sebagai OAuth2 Resource Server yang memverifikasi JWT Bearer Token (bisa beralih antara verifikasi lokal `SECRET_KEY` atau OIDC JWKS Keycloak cukup lewat env var).
* **Flexible UI Auth:** Frontend Next.js mendukung login lokal (Standalone via `CredentialsProvider`) dan siap switch ke SSO Korporat (`KeycloakProvider`) tanpa mengubah pemanggilan API.
* **Declarative Scope Guard:** Proteksi endpoint API menggunakan scope checking standar FastAPI (`SecurityScopes`) yang terintegrasi rapi dengan dokumentasi OpenAPI/Swagger.

---

## 2. Arsitektur Komponen

* **Mode Standalone (Default / Dev):**
  - **Auth Provider:** FastAPI (`POST /auth/login`) memvalidasi password via database PostgreSQL lokal.
  - **Token Issuer:** FastAPI menerbitkan JWT bertanda tangan `HS256` (`SECRET_KEY`).
  - **Next.js Client:** `CredentialsProvider` mengirim user/pass ke backend, menyimpan JWT ke NextAuth session.

* **Mode OIDC / Keycloak (Corporate / Production):**
  - **Auth Provider:** Keycloak Server mengelola login, SSO, MFA, dan direktori pengguna.
  - **Token Issuer:** Keycloak menerbitkan JWT bertanda tangan `RS256` (Asymmetric Key).
  - **Next.js Client:** `KeycloakProvider` me-redirect user ke login SSO Keycloak.
  - **FastAPI Backend:** Memvalidasi signature token secara stateless via Keycloak JWKS endpoint (`/.well-known/openid-configuration`).

---

## 3. Standard Token Payload & Scopes

Format klaim token yang disepakati (baik dari lokal maupun Keycloak):

```json
{
  "sub": "harvan.irawan@sigma.co.id",
  "name": "Harvan Irawan",
  "role": "admin",
  "scopes": [
    "timesheet:read",
    "timesheet:write",
    "sidex:read",
    "sidex:write",
    "user:manage"
  ],
  "exp": 1787340000
}
```

Daftar Scopes Awal:
* `timesheet:read` : Melihat daftar dan rekap timesheet.
* `timesheet:write` : Membuat, mengedit, dan submit timesheet.
* `sidex:read` : Melihat course dan materi side-x.
* `sidex:write` : Mengirim progress materi atau submit test side-x.
* `admin` / `user:manage` : Manajemen user, scheduler, dan konfigurasi bot.

---

## 4. Langkah Implementasi (Step-by-Step)

### Phase 1: Backend FastAPI (OAuth2 Resource Server)

1. **Konfigurasi Environment (`api/core/config.py`):**
   - `AUTH_MODE`: `"standalone"` | `"oidc"` (default: `"standalone"`).
   - `SECRET_KEY`: Secret string untuk algoritma `HS256`.
   - `OIDC_ISSUER`: URL realm Keycloak (misal: `https://auth.telkomsigma.co.id/realms/sigma`).
   - `OIDC_JWKS_URL`: URL public cert Keycloak untuk validasi `RS256`.
   - `OIDC_AUDIENCE`: Client ID aplikasi.

2. **Agnostic Token Verifier (`api/core/security.py`):**
   - Implementasikan verifier yang mengecek `AUTH_MODE`:
     - Jika `standalone`: Verifikasi signature via `jwt.decode(..., key=settings.SECRET_KEY, algorithms=["HS256"])`.
     - Jika `oidc`: Ambil signing key via `PyJWKClient(settings.OIDC_JWKS_URL)` dan validasi signature `RS256`.
   - Parsing claims menjadi `TokenPayload` standar (`sub`, `role`, `scopes`).

3. **Scope Guard & Dependency Injection (`api/controllers/deps.py`):**
   - Buat dependency `get_current_user(security_scopes: SecurityScopes, token: HTTPAuthorizationCredentials = Depends(bearer_scheme))`:
     - Decode token via `decode_access_token()`.
     - Periksa apakah seluruh `security_scopes.scopes` terpenuhi oleh `token.scopes` (atau bypass jika role `admin`).
     - Lempar `401 Unauthorized` jika token tidak valid/kadaluarsa.
     - Lempar `403 Forbidden` dengan detail missing scopes jika izin kurang.
   - Contoh pemakaian di endpoint:
     ```python
     @router.post("/timesheets")
     def create_timesheet(
         data: TimesheetCreate,
         user: User = Security(get_current_user, scopes=["timesheet:write"])
     ):
         ...
     ```

4. **Auth Routes Lokal (`api/controllers/routes/auth.py`):**
   - `POST /auth/login`: Terima kredensial `username` & `password`, verifikasi bcrypt hash di DB, terbitkan access token & refresh token.
   - `POST /auth/refresh`: Tukar valid refresh token dengan access token baru.
   - `GET /auth/me`: Mengembalikan info user & scopes aktif.

---

### Phase 2: Database & Model Permissions

1. **Update User Model (`api/database.py`):**
   - Tambah kolom `role` (String / Enum).
   - Tambah kolom `scopes` (JSON / ARRAY of string) untuk granular permission per user.
   - Tambah kolom `password_hash` untuk autentikasi mode standalone.

2. **Alembic Migration & Seeder (`api/alembic/`, `api/seeds/`):**
   - Generate migrasi Alembic untuk kolom baru.
   - Perbarui seeder user awal dengan default role `admin` dan full scopes.

---

### Phase 3: Frontend Next.js & NextAuth

1. **Dual-Provider Configuration (`src/lib/auth.ts`):**
   - Buat config NextAuth dinamis:
     - Jika `NEXT_PUBLIC_AUTH_MODE=standalone`: Aktifkan `CredentialsProvider` yang memanggil `POST /auth/login` FastAPI.
     - Jika `NEXT_PUBLIC_AUTH_MODE=oidc`: Aktifkan `KeycloakProvider` dengan `issuer`, `clientId`, `clientSecret`.

2. **NextAuth Callbacks (JWT & Session):**
   - Simpan `accessToken`, `refreshToken`, `role`, dan `scopes` ke token JWT NextAuth di `jwt()` callback.
   - Teruskan data tersebut ke session client di `session()` callback.

3. **API Client & Interceptor (`src/lib/api.ts`):**
   - Buat helper fetch API yang otomatis melampirkan header `Authorization: Bearer ${session.accessToken}` pada setiap request ke backend FastAPI.
   - Tangani response `401` secara terpusat (auto sign-out / redirect ke login).

---

### Phase 4: Testing & Verifikasi

1. **Automated Unit & Integration Tests:**
   - Test login standalone dengan password benar vs salah.
   - Test proteksi endpoint:
     - Request tanpa token -> `401 Unauthorized`.
     - Request dengan token tapi scope kurang -> `403 Forbidden`.
     - Request dengan token & scope valid -> `200 OK`.
2. **OpenAPI / Swagger Documentation:**
   - Verifikasi bahwa dokumentasi `/docs` Swagger menampilkan ikon gembok dengan list scope yang jelas untuk setiap endpoint.
