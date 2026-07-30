@AGENTS.md

# Boilerplate — Project Instructions

## How to Work`

> Panduan ini bias ke arah hati-hati daripada cepat. Untuk task trivial, gunakan judgment.`

### 1. Think Before Coding

Jangan assume. Jangan sembunyikan kebingungan. Angkat tradeoff ke permukaan.

Sebelum implementasi:
- Sebutkan asumsi secara eksplisit. Kalau tidak yakin, tanya.
- Kalau ada beberapa interpretasi yang valid, presentasikan semuanya — jangan pilih diam-diam.
- Kalau ada pendekatan yang lebih simpel, katakan. Push back kalau memang perlu.
- Kalau ada yang tidak jelas, berhenti. Sebutkan apa yang membingungkan. Tanya.

### 2. Simplicity First

Minimum code yang menyelesaikan masalah. Tidak ada yang spekulatif.

- Tidak ada fitur di luar yang diminta.
- Tidak ada abstraksi untuk kode yang hanya dipakai sekali.
- Tidak ada "flexibility" atau "configurability" yang tidak diminta.
- Tidak ada error handling untuk skenario yang tidak mungkin terjadi.
- Kalau kamu nulis 200 baris dan bisa jadi 50, tulis ulang jadi 50.

Test: "Apakah senior engineer akan bilang ini overcomplicated?" Kalau ya, sederhanakan.

### 3. Surgical Changes

Sentuh hanya yang harus disentuh. Bersihkan hanya mess yang kamu buat sendiri.

Saat edit kode yang sudah ada:
- Jangan "improve" kode, komentar, atau formatting yang tidak ada hubungannya.
- Jangan refactor hal yang tidak rusak.
- Ikuti style yang sudah ada, meskipun kamu akan melakukannya berbeda.
- Kalau kamu melihat dead code yang tidak relevan, sebut saja — jangan hapus kecuali diminta.

Saat perubahanmu menciptakan orphan:
- Hapus import/variable/function yang jadi unused **karena perubahanmu**.
- Jangan hapus dead code yang sudah ada sebelumnya kecuali diminta.

Test: Setiap baris yang berubah harus bisa dilacak langsung ke permintaan user.

### 4. Goal-Driven Execution

Definisikan kriteria sukses. Loop sampai terverifikasi.

Ubah task menjadi tujuan yang bisa diverifikasi:
- "Tambah validasi" → "Pastikan input invalid menghasilkan error yang benar"
- "Fix bug" → "Identifikasi kondisi yang menyebabkan bug, fix, verifikasi kondisi itu sekarang benar"
- "Refactor X" → "Pastikan behavior sebelum dan sesudah identik"

Untuk task multi-step, sebutkan plan singkat dulu:
1. [Step] → verifikasi: [check]
2. [Step] → verifikasi: [check]

Kriteria sukses yang kuat memungkinkan iterasi mandiri. Kriteria lemah ("biar jalan") butuh klarifikasi terus-menerus.

---

## What This Project Is

This is a boilerplate for role-based dashboard apps. It ships with two roles out of the box:
- **USER** — the default, unprivileged role
- **ADMIN** — the elevated role: manages users, navigation, and any admin-facing features

Everything else (courses, submissions, domain-specific features) is intentionally left out — add your own features on top of the `user`/`navigation` pattern documented below.

---

## Tech Stack

### Backend (`/api`)
- **FastAPI** + **SQLAlchemy** (ORM, not SQLModel) + **PostgreSQL** via psycopg3
- **Alembic** for migrations
- **Pydantic v2** + **pydantic-settings** for config
- **MinIO** (S3-compatible) via boto3 for file storage — bucket name from `S3_BUCKET` (see `api/core/config.py`)
- **JWT** auth (PyJWT + bcrypt), **APScheduler** for scheduled tasks
- **Sentry** in production

### Frontend (`/src`)
- **Next.js 16** (App Router, `src/app/`) — see AGENTS.md warning
- **React 19** + **TypeScript**
- **Tailwind CSS v4** (PostCSS plugin, not v3 config)
- **shadcn/ui** (components in `src/components/ui/`)
- **Highcharts** via `highcharts` + `@highcharts/react` for dashboard charts
- **TanStack Query v5** for server state, **TanStack Table v8** for tables
- **next-auth v4** (Credentials provider, JWT strategy)
- **Axios** (`src/lib/axios.ts`) for API calls
- **Tiptap** for rich text editor
- **React Hook Form** + **Zod v4** for forms
- **Sonner** for toasts

---

## Project Structure

```
api/
  core/         # config, db engine, deps (auth guards), security, pagination
  database.py   # ALL SQLAlchemy models in one file
  routers/      # FastAPI routers (admin/ subdir for admin-only routers)
  schemas/      # Pydantic request/response schemas
  services/     # Business logic, called by routers
  alembic/      # DB migrations
  seeds/        # Seed data scripts
  tests/        # pytest tests

src/
  app/          # Next.js App Router pages
    dashboard/
      admin/       # Pages only ADMIN can access
      user/        # Pages only USER can access
    api/auth/    # next-auth route handler
    login/
  components/
    ui/          # shadcn/ui components
  lib/
    api/         # Axios fetch functions per feature
    types/       # TypeScript types per feature
    auth.ts      # next-auth authOptions
    axios.ts     # Axios instance
  hooks/
    use-data-table.ts   # Reusable table hook (TanStack Query + TanStack Table)
```

---

## Adding a Backend Feature

Follow this pattern (see `navigation` as the canonical example):

1. **Model** — add to `api/database.py`
2. **Migration** — `alembic revision --autogenerate -m "description"` then review and apply
3. **Schema** — create `api/schemas/<feature>.py` with Pydantic request/response models
4. **Service** — create `api/services/<feature>.py` with the business logic
5. **Router** — create `api/routers/admin/<feature>.py` for admin-only routers, or `api/routers/<feature>.py` directly for routers usable by any authenticated role
6. **Register** — add `include_router(...)` in `api/routers/__init__.py`

### SQLAlchemy v2 — gunakan Core-style statements

Selalu pakai SQLAlchemy v2 syntax. Jangan pakai `session.query()` (legacy v1).

```python
from sqlalchemy import select, update, delete

# Fetch single — scalar_one_or_none(), bukan .query().filter().first()
obj = db.execute(select(Foo).where(Foo.id == id)).scalar_one_or_none()

# Fetch list dengan eager load
objs = db.execute(select(Foo).options(joinedload(Foo.bar))).scalars().all()

# Update — jangan setattr satu-satu, pakai update() statement
update_data = data.model_dump(exclude_unset=True, exclude={"file_field"})
if update_data:
    db.execute(update(Foo).where(Foo.id == id).values(**update_data))

# Delete
db.execute(delete(Foo).where(Foo.id == id))

db.commit()
```

Untuk update yang juga butuh nilai lama (misalnya hapus file S3 lama sebelum upload baru), fetch dulu dengan `scalar_one_or_none()`, ambil nilainya, lalu jalankan `update()` statement — jangan pakai `setattr`.

`exclude_unset=True` hanya berguna kalau frontend memang **tidak mengirim** field yang tidak diubah. Kalau field opsional tidak dikirim saat kosong (misalnya `if (data.publishAt) form.append(...)`), maka field itu tidak masuk `model_fields_set` → aman di-exclude → nilai DB tetap. Ini berarti **tidak perlu validator khusus** untuk konversi `""` → `None` — cukup jangan kirim field-nya dari frontend kalau kosong.

### Auth guards (always use these)
```python
from api.core.deps import CurrentUser, only_admin, SessionDep, S3ClientDep

@router.get("/")
def list(user: CurrentUser, db: SessionDep):
    only_admin(user)   # raises 403 if not ADMIN (except in development)
    ...
```

### Query params — inherit from `FilterQuery`

`FilterQuery` (from `api/schemas/pagination.py`) is `Annotated[FilterParams, Query()]`. It already includes `page`, `page_size`, `search`, `order_by`, and `order_direction`.

To add custom query params, inherit from `FilterQuery` (not `FilterParams`), then wrap the result in `Annotated[..., Query()]`:

```python
# schemas/foo.py
from fastapi import Query
from typing import Annotated
from api.schemas.pagination import FilterQuery

class GetFooRequest(FilterQuery):
    is_active: bool = True
    category: str | None = None

FooQuery = Annotated[GetFooRequest, Query()]
```

Use in router:
```python
# routers/admin/foo.py
from api.schemas.foo import FooQuery

@router.get("")
def list(db: SessionDep, filters: FooQuery) -> Pagination[FooResponse]:
    return FooService.get_all(db, filters=filters)
```

Then pass `filters` to `paginate_select()`:
```python
# services/foo.py
result = paginate_select(
    db, stmt,
    filters=filters,
    searchable=[Foo.name, Foo.description],
    sort_map={"name": Foo.name, "created_at": Foo.created_at},
    default_sort=Foo.created_at,
)
```

### Form payload with file uploads

When a request body mixes regular fields **and** file uploads, use `UploadFile` in the schema and `Form()` in the router — this sends the request as `multipart/form-data`.

**Schema** — must set `arbitrary_types_allowed=True` because `UploadFile` is not a native Pydantic type:

```python
# schemas/foo.py
from fastapi import UploadFile
from pydantic import BaseModel, ConfigDict

class CreateFooRequest(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    name: str
    description: str | None = None
    image: UploadFile | None = None      # optional file upload
```

**Router** — wrap with `Annotated[..., Form()]` (not `Body()`):

```python
# routers/admin/foo.py
from fastapi import Form
from typing import Annotated

@router.post("", status_code=201)
async def create(
    db: SessionDep,
    s3: S3ClientDep,
    user: CurrentUser,
    data: Annotated[CreateFooRequest, Form()],
) -> FooResponse:
    only_admin(user)
    return await FooService.create(db, s3=s3, data=data)
```

**Important**: FastAPI passes an `UploadFile` object even when no file is sent. Always guard with `if data.image and data.image.filename` before reading or uploading the file.

For **PATCH/PUT** requests where `null` and "not provided" are different (e.g., clearing a field vs. not touching it), check `model_fields_set`:

```python
# services/foo.py
if 'image' in data.model_fields_set:
    # field was explicitly sent (even as null) → act on it
    foo.image = ...
```

### Response schemas with relations — `AliasPath`

All response schemas that are built from ORM objects **must** have `from_attributes=True`. Fields that come from a related model are flattened using `validation_alias=AliasPath(...)`.

**Prerequisite**: always add `from_attributes=True` to response schemas.

```python
from pydantic import AliasPath, BaseModel, ConfigDict, Field

class FooResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    ...
```

**One-hop** — field from a direct relation (illustrative — adapt to your own models):

```python
# ORM: Foo.author.name  (author is a relationship on Foo)
author_name: str | None = Field(None, validation_alias=AliasPath('author', 'name'))
```

**Multi-hop** — field buried 3+ levels deep (illustrative — e.g. order → customer → user):

```python
# ORM: Order.customer.user.email
email: str = Field(..., validation_alias=AliasPath('customer', 'user', 'email'))
name: str = Field(..., validation_alias=AliasPath('customer', 'user', 'name'))
```

**List index** — take the first item from a list relation (returns `None` if list is empty, illustrative):

```python
# ORM: Foo.submissions[0]
latest_submission: Submission | None = Field(
    None, validation_alias=AliasPath('submissions', 0)
)
```

**`@property` on model** — Pydantic `from_attributes=True` calls `getattr`, so SQLAlchemy `@property` fields are reachable just like regular columns:

```python
# database.py — Foo has: @property def display_name(self) -> str: ...
# ORM: Bar.foo.display_name
foo_name: str = Field(..., validation_alias=AliasPath('foo', 'display_name'))
```

**Important**: `validation_alias` only affects input (ORM → schema). The serialized JSON key is still the field name (e.g. `author_name`, `module_name`). If you need the JSON key to also differ, use `alias` (sets both) or pair `validation_alias` with `serialization_alias`.

Make sure the query in the service uses `joinedload()` / `selectinload()` for every relation accessed via `AliasPath`, or SQLAlchemy will raise a lazy-loading error:

```python
# services/foo.py
stmt = select(Order).options(
    joinedload(Order.customer).joinedload(Customer.user),
)
```

---

## UI/UX Guidelines

Design reference: **Google Classroom** (clear role-based layout, structured task flow) + **Linear** (clean hierarchy, purposeful density). Avoid decorative elements — every visual element should carry meaning.

### Page layout — always consistent

Every dashboard page uses the same shell:

```tsx
<div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
  {/* header */}
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">Page Title</h1>
      <p className="text-sm text-muted-foreground">One-line description of what this page does.</p>
    </div>
    <Button>Primary Action</Button>   {/* only if there is one */}
  </div>

  <Separator />

  {/* content */}
</div>
```

- `max-w-5xl` for list/table pages, `max-w-4xl` for form/detail pages
- Always include the subtitle — it reduces confusion for first-time users
- One primary action button maximum per page, top-right

### Status badges — semantic, dark-mode safe

Never use raw color classes (`bg-green-600 text-white`) on badges. Use CSS variables via `cn()`:

```tsx
const statusVariant: Record<string, string> = {
  submitted:    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  pending:      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  not_opened:   "bg-muted text-muted-foreground",
  graded:       "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

<Badge variant="secondary" className={cn(statusVariant[status])}>
  {label}
</Badge>
```

### Empty states — always use `<Empty>`

Use the `Empty` component from `@/components/ui/empty`. Never write custom dashed-border empty containers. Always give context and a next step — never just "No data."

```tsx
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";

{data?.length === 0 && !isFetching && (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <Icon />
      </EmptyMedia>
      <EmptyTitle>No submissions yet</EmptyTitle>
      <EmptyDescription>Students haven't submitted anything for this module.</EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <Button onClick={...}>Primary Action</Button>
    </EmptyContent>
  </Empty>
)}
```

- `EmptyMedia variant="icon"` — wraps the icon in a rounded muted box (use for lucide icons)
- `EmptyMedia` (default) — for illustrations or larger media
- `EmptyContent` — optional, for action buttons below the header
- Skip `EmptyContent` if there's no action to take

### Loading states

- **Data fetching** → skeleton loaders, not spinners (users can see the layout before data loads)
- **Action buttons** (submit, save, delete) → inline `<Spinner>` inside the button + `disabled`

Use `<Spinner>` from `@/components/ui/spinner`. Never write `<Loader2 className="animate-spin" />` manually.

```tsx
import { Spinner } from "@/components/ui/spinner";

{/* Data: skeleton */}
{isFetching && <Skeleton className="h-10 w-full" />}

{/* Action button */}
<Button disabled={isPending}>
  {isPending && <Spinner />}
  Save Changes
</Button>
```

### Forms — inline validation, not just toasts

Use `Field` / `FieldLabel` / `FieldError` from `@/components/ui/field`. Error messages appear inline below the input — toasts are only for async success/failure:

```tsx
<Field data-invalid={!!errors.title}>
  <FieldLabel>Title</FieldLabel>
  <Input placeholder="..." {...register("title")} />
  <FieldError errors={[errors.title]} />
</Field>
```

### Dialog accessibility — always describe dialog content

Every `DialogContent` must include a `DialogDescription` inside `DialogHeader`.

If there is no visible supporting text, use:

```tsx
<DialogDescription className="sr-only">...</DialogDescription>
```

Do not leave `DialogContent` without description, because it will trigger:
`Warning: Missing Description or aria-describedby={undefined} for {DialogContent}`.

### Destructive actions — always confirm

All deletes and irreversible actions must go through `AlertDialog`, never a direct `onClick`:

```tsx
<AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete {target?.name}?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => doDelete(target!.id)}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Table pages — standard toolbar

All table pages follow this exact toolbar order: search → column visibility → extra filters → refresh.

```tsx
<div className="flex items-center gap-2">
  <Input placeholder="Search..." value={filter} onChange={(e) => setFilter(e.target.value)} className="max-w-xs" />
  <ColumnVisibilityToggle table={table} />
  {/* optional extra filters */}
  <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
    <RotateCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
  </Button>
</div>
```

### Dates — always use date-fns

`date-fns` is already installed. Always prefer its functions over manual `Date` operations:

```ts
import { format, isPast, isFuture, formatDistanceToNow, parseISO } from "date-fns";

format(new Date(x), "d MMM yyyy HH:mm")   // instead of toLocaleDateString etc.
isPast(new Date(x))                        // instead of new Date(x) <= new Date()
isFuture(new Date(x))                      // instead of new Date(x) > new Date()
formatDistanceToNow(new Date(x), { addSuffix: true })  // "3 hours ago"
```

If there's a date-fns function for it, use it — don't write the logic manually.

### Language

All UI text is in **English**. No mixed Indonesian/English in the same page.

---

### Create/Edit page routing — `[[...slug]]` pattern

Form pages yang handle create dan edit sekaligus menggunakan optional catch-all route `[[...slug]]` dengan konvensi:

- `/feature/create` → `slug = ["create"]`
- `/feature/edit/{id}` → `slug = ["edit", "{id}"]`

Destructuring di page:

```tsx
const { slug } = useParams<{ slug?: string[] }>();
const [mode, id] = slug ?? [];
```

Gunakan `mode === "edit"` langsung — jangan buat variabel `isEdit` atau sejenisnya. Query hanya dijalankan saat edit:

```tsx
const { data } = useQuery({
  queryKey: ["feature", id],
  queryFn: () => getFeature(id!),
  enabled: mode === "edit" && !!id,
});
```

Link dari tabel ke halaman edit:

```tsx
<Link href={`/dashboard/admin/feature/edit/${row.original.id}`}>Edit</Link>
```

Tombol new/create dari list page:

```tsx
router.push("/dashboard/admin/feature/create")
```

---

## Adding a Frontend Feature

1. **Types** — `src/lib/types/<feature>.ts`
2. **API functions** — `src/lib/api/<feature>.ts` (use the Axios instance from `@/lib/axios`)
3. **Page** — `src/app/dashboard/admin/<feature>/page.tsx` or `.../user/<feature>/page.tsx`
4. **Table pages** — use `useDataTable` hook from `@/hooks/use-data-table`

All API calls go through the Next.js proxy (configured in `next.config.ts` rewrites) — use relative paths like `/api/v1/...`, never hardcode the backend URL on the client side.

### Axios — automatic case conversion

The Axios instance (`src/lib/axios.ts`) has interceptors that handle case conversion automatically:

- **Request** (`params` and `data`): camelCase → snake_case before sending
- **Response** (`data`): snake_case → camelCase after receiving

Always write frontend code in camelCase — never manually convert to snake_case:

```ts
// correct — Axios converts fooId → foo_id automatically
axios.get("/admin/foo", { params: { fooId, month, year } });

// wrong — manual conversion is redundant and breaks the convention
axios.get("/admin/foo", { params: { foo_id: fooId, month, year } });
```

TypeScript types in `src/lib/types/` should use camelCase to match what the interceptor delivers.

### Highcharts usage

- Use `Chart` and `HighchartsOptionsType` from `@highcharts/react`.
- Keep chart config inside `useMemo` so options are stable across renders.
- Always disable default credits (`credits.enabled = false`) unless explicitly needed.
- Match theme tokens for axes and grid (`var(--border)`, transparent backgrounds) so charts stay readable in light/dark mode.

---

## Dev Commands

```bash
# Backend (FastAPI, port 8080)
npm run fastapi         # fastapi dev --port 8080 api/index.py

# Frontend (Next.js, port 3030)
npm run dev             # next dev -p 3030

# DB migrations
alembic revision --autogenerate -m "description"
alembic upgrade head

# Seed data — always use the seeder, never insert data manually
py -m api.seeder        # seeds everything: users, navigation

# Run individual seeders (e.g. when seed_all fails due to schema mismatch):
py -c "
from sqlalchemy.orm import Session
from api.core.db import engine
from api.seeds import seed_users, seed_navigation  # import only what's needed

with Session(engine) as db:
    seed_users(db)
    seed_navigation(db)
    db.commit()
"

# Tests (pytest)
pytest api/tests/
```

Python virtualenv is at `.venv/`. Activate with `source .venv/bin/activate`.

---

## Key Conventions & Gotchas

- **One models file**: All SQLAlchemy models live in `api/database.py` — do not split into separate files.
- **UUID primary keys**: All models inherit from `Base` which provides `id: UUID` automatically.
- **Pagination**: Use `paginate_select()` from `api/core/pagination.py` — returns `Pagination[T]`.
- **File storage**: Always store only the S3 key (not full URL) in the DB. The bucket name comes from `S3_BUCKET`.
- **Role check in dev**: `only_admin()` skips the check in `ENVIRONMENT=development` — don't rely on it in tests.
- **Tailwind v4**: No `tailwind.config.js` — config is done via CSS variables and PostCSS. Do not create a tailwind config file.
- **React Compiler**: Only annotate components with `"use memo"` if needed — `compilationMode: "annotation"` means opt-in only.
- **next-auth session shape**: `session.user` is `UserData` (see `src/lib/types/user.ts`), not the default next-auth User.
- **OpenAPI endpoint**: Protected — only accessible by ADMIN role. Available at `/api/v1/docs` in non-production.
- **Adding env vars to frontend**: Setiap env var baru di `next.config.ts` harus didaftarkan di dua tempat di `src/Dockerfile` dan `src/docker-entrypoint.sh`. Di Dockerfile tambah `ENV VAR_NAME=http://VAR_NAME_PLACEHOLDER` di builder stage. Di entrypoint tambah `_replace_var "VAR_NAME" "${VAR_NAME:-}"`. Tanpa ini, build akan gagal dengan error `destination does not start with /` atau env var tidak terganti saat runtime.
