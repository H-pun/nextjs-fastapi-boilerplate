<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Boilerplate Project Instructions

## Scope

This repository is a reusable Next.js and FastAPI starting point. Keep changes
domain-neutral: do not add customer-specific branding, business entities,
deployment assumptions, secrets, or demo data that only makes sense for one
downstream product.

## How to Work

These guidelines favor careful execution over speed. For trivial tasks, use
judgment.

### Think Before Coding

Do not assume. Do not hide confusion. Surface tradeoffs.

Before implementing:

- State assumptions explicitly. If unsure, ask.
- When several valid interpretations exist, present them all — do not pick silently.
- If a simpler approach exists, say so. Push back when needed.
- If something is unclear, stop. Name what is confusing. Ask.

### Simplicity First

Write the minimum code that solves the problem. Nothing speculative.

- No features beyond what was requested.
- No abstractions for one-off code.
- No unrequested flexibility or configurability.
- No error handling for impossible scenarios.
- If you wrote 200 lines and 50 would do, rewrite to 50.

Test: would a senior engineer call this overcomplicated? If yes, simplify.

### Surgical Changes

Touch only what must be touched. Clean up only mess you created.

When editing existing code:

- Do not improve unrelated code, comments, or formatting.
- Do not refactor what is not broken.
- Match existing style even if you would do it differently.
- If you notice irrelevant dead code, mention it — do not delete unless asked.

When your change creates orphans:

- Remove imports, variables, or functions made unused **by your change**.
- Do not remove pre-existing dead code unless asked.

Test: every changed line should trace directly to the user's request.

### Goal-Driven Execution

Define success criteria. Loop until verified.

Turn tasks into verifiable goals:

- "Add validation" → invalid input returns the correct error
- "Fix bug" → identify the failing condition, fix it, verify it passes
- "Refactor X" → behavior before and after is identical

For multi-step work, state a short plan first:

1. [Step] → verify: [check]
2. [Step] → verify: [check]

Strong success criteria enable independent iteration. Weak criteria ("make it work")
require constant clarification.

## What This Project Is

This is a boilerplate for role-based dashboard apps. It ships with two roles out
of the box:

- **USER** — the default, unprivileged role
- **ADMIN** — the elevated role: manages users, navigation, and admin-facing features

Everything else is intentionally left out — add your own features on top of the
`user` / `navigation` patterns documented below.

## Tech Stack

### Backend (`/api`)

- **FastAPI** + **SQLAlchemy** (ORM, not SQLModel) + **PostgreSQL** via psycopg3
- **Alembic** for migrations
- **Pydantic v2** + **pydantic-settings** for config
- **MinIO** (S3-compatible) via boto3 — bucket name from `S3_BUCKET` (see `api/core/config.py`)
- **JWT** auth (PyJWT + bcrypt), **APScheduler** for scheduled tasks
- **Sentry** in production

### Frontend (`/src`)

- **Next.js 16** (App Router, `src/app/`) — see the Next.js warning block above
- **React 19** + **TypeScript**
- **Tailwind CSS v4** (PostCSS plugin, not v3 config)
- **shadcn/ui** (components in `src/components/ui/`, style: **radix-nova**)
- **Highcharts** via `highcharts` + `@highcharts/react`
- **TanStack Query v5** for server state, **TanStack Table v8** for tables
- **next-auth v4** (Credentials provider, JWT strategy)
- **Axios** (`src/lib/axios.ts`) for API calls
- **Tiptap** for rich text editor
- **React Hook Form** + **Zod v4** for forms
- **Sonner** for toasts

## Project Structure

```
api/
  core/         # config, db engine, deps (auth guards), security, pagination
  database.py   # ALL SQLAlchemy models in one file
  routers/      # FastAPI routers — scope-guarded per endpoint
  schemas/      # Pydantic request/response schemas
  services/     # Business logic, called by routers
  alembic/      # DB migrations
  seeds/        # Seed data scripts
  tests/        # pytest tests

src/
  app/          # Next.js App Router pages
    dashboard/
      admin/    # Admin-facing pages
      user/     # User-facing pages
    api/auth/   # next-auth route handler
    login/
  components/
    data-table/ # Canonical advanced table components
    ui/         # shadcn/ui components
  lib/
    api/        # Axios fetch functions per feature
    types/      # TypeScript types per feature
    auth.ts     # next-auth authOptions
    axios.ts    # Axios instance
  hooks/
    use-data-table.ts         # Canonical URL-driven TanStack Table hook
```

## Architecture

- `api/core/`: configuration, dependencies, security, and pagination engine.
- `api/database.py`: shared SQLAlchemy models.
- `api/schemas/`, `api/services/`, `api/routers/`: request/response contracts,
  business logic, and HTTP routing.
- `src/app/`: Next.js App Router pages and layouts.
- `src/components/data-table/`: canonical advanced table components.
- `src/hooks/use-data-table.ts`: canonical URL-driven TanStack Table hook.

## Working Rules

- Make the smallest change that satisfies the request; do not refactor adjacent
  code without a concrete reason.
- Preserve existing user changes and inspect `git status` before editing.
- Keep API authorization server-side. Hiding a navigation item or button is a
  usability decision, never the security boundary.
- Use SQLAlchemy 2 Core-style `select`, `update`, and `delete`; do not introduce
  legacy `session.query()` code.
- Add or update focused tests for reusable infrastructure changes.

---

## Backend

### Adding a Backend Feature

Follow this pattern (see `navigation` as the canonical example):

1. **Model** — add to `api/database.py`
2. **Migration** — `npm run migration:generate` then review and apply with `npm run migrate`
3. **Schema** — create `api/schemas/<feature>.py` with Pydantic request/response models
4. **Service** — create `api/services/<feature>.py` with the business logic
5. **Router** — create `api/routers/<feature>.py`; guard endpoints with scopes via `Security(...)`
6. **Register** — add `include_router(...)` in `api/routers/__init__.py`

### SQLAlchemy v2 — use Core-style statements

Always use SQLAlchemy v2 syntax. Never use `session.query()` (legacy v1).

```python
from sqlalchemy import select, update, delete

# Fetch single — scalar_one_or_none(), not .query().filter().first()
obj = db.execute(select(Foo).where(Foo.id == id)).scalar_one_or_none()

# Fetch list with eager load
objs = db.execute(select(Foo).options(joinedload(Foo.bar))).scalars().all()

# Update — use update() statement, not setattr one-by-one
update_data = data.model_dump(exclude_unset=True, exclude={"file_field"})
if update_data:
    db.execute(update(Foo).where(Foo.id == id).values(**update_data))

# Delete
db.execute(delete(Foo).where(Foo.id == id))

db.commit()
```

When an update needs the old value (e.g. delete an old S3 file before uploading a
new one), fetch first with `scalar_one_or_none()`, read the value, then run
`update()` — do not use `setattr`.

`exclude_unset=True` only helps when the frontend **does not send** unchanged
fields. If optional fields are omitted when empty (e.g.
`if (data.publishAt) form.append(...)`), they stay out of `model_fields_set` →
safe to exclude → DB value unchanged. No special `""` → `None` validator needed —
just omit empty fields from the frontend payload.

### Auth guards (always use these)

Authorisation is scope-based. Declare the scope on the endpoint with
`Security(...)` — never check a role name, since roles are renameable from the
Access Control page.

```python
from fastapi import Security
from api.core.deps import CurrentUser, get_current_user, SessionDep, S3ClientDep
from api.database import User

# Needs a scope: 401 without a token, 403 when the scope is missing.
@router.get("")
async def get_all(db: SessionDep, user: User = Security(get_current_user, scopes=["user:manage"])):
    ...

# Any signed-in user.
@router.get("/me")
async def get_me(user: CurrentUser):
    ...
```

Scopes are read from the database on every request (`user.scope_keys`), not
from the token, so revoking one takes effect immediately. Seeded scopes live in
`api/seeds/users.py`; keys must read `resource:action`, enforced by a CHECK
constraint on `scopes.key`.

Guard against lockout when a write could remove the last administrator — call
`guard_last_admin(db)` from `api/services/role.py` after `flush()` and before
`commit()`. It refuses with 409 if nobody would be left holding `user:manage`.

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
# routers/foo.py
from api.schemas.foo import FooQuery

@router.get("")
def list(db: SessionDep, filters: FooQuery) -> Pagination[FooResponse]:
    return FooService.get_all(db, filters=filters)
```

Then pass `filters` to `paginate_select()` with explicit whitelists:

```python
# services/foo.py
result = paginate_select(
    db, stmt,
    filters=filters,
    searchable=[Foo.name, Foo.description],
    sort_map={"name": Foo.name, "created_at": Foo.created_at},
    filter_map={"name": Foo.name, "isActive": Foo.is_active},
    default_sort=Foo.created_at,
)
```

Backend endpoints must pass explicit `sort_map` and `filter_map` whitelists to
`paginate_select()`. Frontend column ids are the contract keys. Unknown ids
must fail with `400`; silently ignoring them can return more data than requested.

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
    image: UploadFile | None = None
```

**Router** — wrap with `Annotated[..., Form()]` (not `Body()`):

```python
# routers/foo.py
from fastapi import Form
from typing import Annotated

@router.post("", status_code=201)
async def create(
    db: SessionDep,
    s3: S3ClientDep,
    data: Annotated[CreateFooRequest, Form()],
    user: User = Security(get_current_user, scopes=["foo:manage"]),
) -> FooResponse:
    return await FooService.create(db, s3=s3, data=data)
```

**Important**: FastAPI passes an `UploadFile` object even when no file is sent. Always guard with `if data.image and data.image.filename` before reading or uploading the file.

For **PATCH/PUT** requests where `null` and "not provided" are different (e.g., clearing a field vs. not touching it), check `model_fields_set`:

```python
# services/foo.py
if "image" in data.model_fields_set:
    # field was explicitly sent (even as null) → act on it
    foo.image = ...
```

### Response schemas with relations — `AliasPath`

All response schemas built from ORM objects **must** have `from_attributes=True`. Fields from related models are flattened using `validation_alias=AliasPath(...)`.

```python
from pydantic import AliasPath, BaseModel, ConfigDict, Field

class FooResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    ...
```

**One-hop** — field from a direct relation:

```python
# ORM: Foo.author.name
author_name: str | None = Field(None, validation_alias=AliasPath("author", "name"))
```

**Multi-hop**:

```python
# ORM: Order.customer.user.email
email: str = Field(..., validation_alias=AliasPath("customer", "user", "email"))
```

**List index** — first item from a list relation (`None` if empty):

```python
latest_submission: Submission | None = Field(
    None, validation_alias=AliasPath("submissions", 0)
)
```

**`@property` on model** — `from_attributes=True` calls `getattr`, so `@property`
fields work like columns:

```python
foo_name: str = Field(..., validation_alias=AliasPath("foo", "display_name"))
```

`validation_alias` only affects input (ORM → schema). The serialized JSON key is
still the field name unless you also set `alias` or `serialization_alias`.

Use `joinedload()` / `selectinload()` for every relation accessed via
`AliasPath`, or SQLAlchemy will raise a lazy-loading error.

---

## Frontend

### Adding a Frontend Feature

1. **Types** — `src/lib/types/<feature>.ts`
2. **API functions** — `src/lib/api/<feature>.ts` (use the Axios instance from `@/lib/axios`)
3. **Page** — `src/app/dashboard/admin/<feature>/page.tsx` or `.../user/<feature>/page.tsx`
4. **Table pages** — use `useDataTable` from `@/hooks/use-data-table`

All API calls go through the Next.js proxy (configured in `next.config.ts`
rewrites) — use relative paths like `/api/v1/...`, never hardcode the backend URL
on the client side.

### Axios — automatic case conversion

The Axios instance (`src/lib/axios.ts`) has interceptors that handle case conversion:

- **Request** (`params` and `data`): camelCase → snake_case before sending
- **Response** (`data`): snake_case → camelCase after receiving

Always write frontend code in camelCase — never manually convert to snake_case:

```ts
// correct — Axios converts fooId → foo_id automatically
axios.get("/admin/foo", { params: { fooId, month, year } });

// wrong — manual conversion is redundant and breaks the convention
axios.get("/admin/foo", { params: { foo_id: fooId, month, year } });
```

TypeScript types in `src/lib/types/` should use camelCase to match what the
interceptor delivers.

### Create/Edit page routing — `[[...slug]]` pattern

Form pages that handle both create and edit use optional catch-all route
`[[...slug]]`:

- `/feature/create` → `slug = ["create"]`
- `/feature/edit/{id}` → `slug = ["edit", "{id}"]`

```tsx
const { slug } = useParams<{ slug?: string[] }>();
const [mode, id] = slug ?? [];
```

Use `mode === "edit"` directly — do not create an `isEdit` variable. Query only
when editing:

```tsx
const { data } = useQuery({
  queryKey: ["feature", id],
  queryFn: () => getFeature(id!),
  enabled: mode === "edit" && !!id,
});
```

Link from table to edit:

```tsx
<Link href={`/dashboard/admin/feature/edit/${row.original.id}`}>Edit</Link>
```

Create from list page:

```tsx
router.push("/dashboard/admin/feature/create");
```

### Data tables

Use `src/components/data-table/` with `useDataTable`. Table state lives in the
URL through nuqs.
A page should have one owner for each query key: controls write the URL, while
data fetching reads that resulting URL state.

**Fetching pattern (infinite scroll)** — default for table pages. `useDataTable`
owns nuqs writes; the page reads URL state with `useTableUrlState()` and loads
data through `useInfiniteTableQuery`. Chunk size is fixed at
`dataTableConfig.infiniteTableChunkSize` (50) — not shown in the UI. Server-side
**group by** works in infinite mode via Settings → Group. Do not mount a second
nuqs owner for the same keys.

```tsx
import { useInfiniteTableQuery } from "@/hooks/use-infinite-table-query";
import {
  toInfiniteQueryParams,
  useTableUrlState,
} from "@/hooks/use-table-url-state";

const tableState = useTableUrlState();

const {
  rows,
  totalItems,
  groupSummaries,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isFetching,
  refetch,
} = useInfiniteTableQuery({
  queryKey: ["users", tableState.search, tableState.groupBy, /* … */],
  queryFn: (page) => getUsers(toInfiniteQueryParams(tableState, page)),
});

const { table } = useDataTable({
  data: rows,
  pageCount: -1,
  rowCount: totalItems,
  paginationMode: "infinite",
  enableAdvancedFilter: true,
});

<DataTable
  table={table}
  groupSummaries={groupSummaries}
  infinite={{
    onLoadMore: () => void fetchNextPage(),
    hasNextPage: Boolean(hasNextPage),
    isFetchingNextPage,
    totalItems,
    loadedCount: rows.length,
  }}
/>
```

The infinite footer only shows a spinner while the next chunk loads — no page
buttons or load-size selector.

**Page-button pagination** — use `paginationMode: "pages"` (default) with
`useQuery` for small tables or when you prefer explicit page navigation:

```tsx
const { data, isFetching, refetch } = useQuery({
  queryKey: ["users", tableState],
  queryFn: () => getUsers(toQueryParams(tableState)),
});

const { table } = useDataTable({
  data: data?.items ?? [],
  pageCount: data?.totalPages ?? -1,
  rowCount: data?.totalItems ?? 0,
  enableAdvancedFilter: true,
});
```

Table pages use `DataTableAdvancedToolbar` with `DataTableSearch` and the
property bar — see `src/app/dashboard/admin/user/page.tsx` as the reference
implementation.

### shadcn/ui preset

The project uses the **Nova** preset (`radix-nova` in `components.json`) — compact
spacing tuned for data-heavy dashboards. Re-apply with:

```bash
npx shadcn@latest apply b0 -y
```

**After `apply`, restore project-specific files if overwritten:**

- `src/lib/utils.ts` — keep helpers like `getInitials`, `renderBytes`, and Axios case converters
- `src/hooks/use-mobile.ts` — keep the `useSyncExternalStore` version (the CLI template fails lint)

Custom CSS in `globals.css` (`.tiptap-image`, `@utility bg-grid`, `@utility bg-login`)
and non-registry components (`dropzone`, `text-editor`, etc.) are not managed by
the CLI — verify they remain after apply.

### Highcharts usage

- Use `Chart` and `HighchartsOptionsType` from `@highcharts/react`.
- Keep chart config inside `useMemo` so options are stable across renders.
- Always disable default credits (`credits.enabled = false`) unless explicitly needed.
- Match theme tokens for axes and grid (`var(--border)`, transparent backgrounds) so charts stay readable in light/dark mode.

---

## UI Conventions

Design reference: **Google Classroom** (clear role-based layout) + **Linear**
(clean hierarchy, purposeful density). Avoid decorative elements — every visual
element should carry meaning.

All UI text is in **English**. No mixed languages on the same page.

### Page layout

The dashboard layout owns page padding. Page containers use
`mx-auto w-full max-w-7xl space-y-6` without a second padding layer.

Use `PageHeader` from `@/components/page-header` for every **dashboard** page
title and description. Public pages (landing, login) and error pages (forbidden)
may use their own layout. Pass `action` for a top-right primary control and
`back` for child-page navigation:

```tsx
<PageHeader
  title="Users"
  description="Manage accounts and roles."
  action={<Button onClick={...}>Add user</Button>}
/>
```

- Always include the description — it reduces confusion for first-time users
- One primary action button maximum per page, top-right

### Status badges — semantic, dark-mode safe

Never use raw color classes (`bg-green-600 text-white`) on badges. Use CSS
variables via `cn()`:

```tsx
const statusVariant: Record<string, string> = {
  submitted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  not_opened: "bg-muted text-muted-foreground",
  graded: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

<Badge variant="secondary" className={cn(statusVariant[status])}>
  {label}
</Badge>
```

### Empty states — always use `<Empty>`

Use the `Empty` component from `@/components/ui/empty`. Never write custom
dashed-border empty containers. Always give context and a next step — never
just "No data."

```tsx
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";

{data?.length === 0 && !isFetching && (
  <Empty>
    <EmptyHeader>
      <EmptyMedia variant="icon">
        <Icon />
      </EmptyMedia>
      <EmptyTitle>No items yet</EmptyTitle>
      <EmptyDescription>Add the first item to get started.</EmptyDescription>
    </EmptyHeader>
    <EmptyContent>
      <Button onClick={...}>Add item</Button>
    </EmptyContent>
  </Empty>
)}
```

- `EmptyMedia variant="icon"` — wraps the icon in a rounded muted box (use for lucide icons)
- `EmptyContent` — optional, for action buttons below the header
- Skip `EmptyContent` if there is no action to take

### Loading states

- **Data fetching** → skeleton loaders, not spinners (users see the layout before data loads)
- **Action buttons** (submit, save, delete) → inline `<Spinner>` inside the button + `disabled`

Use `<Spinner>` from `@/components/ui/spinner`. Never write
`<Loader2 className="animate-spin" />` manually.

```tsx
import { Spinner } from "@/components/ui/spinner";

{isFetching && <Skeleton className="h-10 w-full" />}

<Button disabled={isPending}>
  {isPending && <Spinner />}
  Save Changes
</Button>
```

Use `flex` with `gap-*` for horizontal spacing in new UI — avoid `space-x-*`.

### Forms — inline validation, not just toasts

Use `Field` / `FieldLabel` / `FieldError` from `@/components/ui/field`. Error
messages appear inline below the input — toasts are only for async
success/failure:

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

Do not leave `DialogContent` without description — it triggers an accessibility
warning in the console.

### Destructive actions — always confirm

All deletes and irreversible actions must go through `AlertDialog`, never a
direct `onClick`:

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

### Other UI rules

- Every icon-only button needs both an accessible name and a visible tooltip.
- Sidebar items with `external: true` show an `ArrowUpRight` indicator and open in a new tab.
- Use `date-fns` for all date formatting and comparisons — do not use manual `Date` logic or `toLocaleDateString`.

```ts
import { format, isPast, isFuture, formatDistanceToNow } from "date-fns";

format(new Date(x), "d MMM yyyy HH:mm");
isPast(new Date(x));
formatDistanceToNow(new Date(x), { addSuffix: true });
```

---

## Dev Commands

```bash
# Backend (FastAPI, port 8080)
npm run fastapi

# Frontend (Next.js, port 3030)
npm run dev

# DB migrations
npm run migration:generate   # autogenerate revision
npm run migrate              # alembic upgrade head

# Seed data — always use the seeder, never insert data manually
npm run seed

# Run individual seeders (e.g. when seed_all fails due to schema mismatch):
node scripts/python.mjs -c "
from sqlalchemy.orm import Session
from api.core.db import engine
from api.seeds import seed_users, seed_navigation

with Session(engine) as db:
    seed_users(db)
    seed_navigation(db)
    db.commit()
"

# Tests (pytest)
pytest api/tests_unit/test_pagination_core.py
pytest api/tests/   # requires PostgreSQL configured through .env
```

Python virtualenv is at `.venv/`. Activate with `source .venv/bin/activate`.

### Git commits

Use [Conventional Commits](https://www.conventionalcommits.org/). Check `git log` before
committing — match the repo's established style.

- Prefix by change type: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Subject is **lowercase** after the prefix; imperative mood, no trailing period
- Optional body: 1–2 sentences when the "why" is not obvious from the subject

```
feat: apply shadcn Nova preset (b0)
chore: remove unused use-server-data-table hook
docs: expand AGENTS.md data-table fetch pattern
```

## Verification

```sh
npm run typecheck
npm run lint
npm run build
pytest api/tests_unit/test_pagination_core.py
pytest api/tests/  # requires PostgreSQL configured through .env
```

## Key Conventions & Gotchas

- **One models file**: All SQLAlchemy models live in `api/database.py` — do not split into separate files.
- **UUID primary keys**: All models inherit from `Base` which provides `id: UUID` automatically.
- **Pagination**: Use `paginate_select()` from `api/core/pagination.py` — returns `Pagination[T]`.
- **File storage**: Always store only the S3 key (not full URL) in the DB. The bucket name comes from `S3_BUCKET`.
- **Authorisation**: scope-based, via `Security(get_current_user, scopes=[...])`. Scopes come from the database each request, never from the token, and there is no development bypass — a missing scope is 403 everywhere.
- **Roles**: a user holds many (`user_roles`), and a role holds many scopes (`role_scopes`). Roles carry no authority of their own; every check resolves to scopes.
- **Identity vs authorisation**: `users` is who someone is, `user_identities` is how they sign in (`local`, and later `keycloak`/`google`). Match on `(provider, subject)` only — never on email alone, or anyone who can register that address with the provider takes the account.
- **Tailwind v4**: No `tailwind.config.js` — config is done via CSS variables and PostCSS. Do not create a tailwind config file.
- **React Compiler**: Only annotate components with `"use memo"` if needed — `compilationMode: "annotation"` means opt-in only.
- **next-auth session shape**: `session.user` is `UserData` (see `src/lib/types/user.ts`), not the default next-auth User.
- **OpenAPI endpoint**: Protected — requires the `user:manage` scope. Available at `/api/v1/docs` in non-production.
- **Adding env vars to frontend**: Every new env var in `next.config.ts` must also be registered in `src/Dockerfile` (builder stage: `ENV VAR_NAME=http://VAR_NAME_PLACEHOLDER`) and `src/docker-entrypoint.sh` (`_replace_var "VAR_NAME" "${VAR_NAME:-}"`). Without this, the build fails with `destination does not start with /` or the var is not replaced at runtime.
