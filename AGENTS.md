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

## Working Rules

- Make the smallest change that satisfies the request; do not refactor adjacent
  code without a concrete reason.
- Preserve existing user changes and inspect `git status` before editing.
- Keep API authorization server-side. Hiding a navigation item or button is a
  usability decision, never the security boundary.
- Use SQLAlchemy 2 Core-style `select`, `update`, and `delete`; do not introduce
  legacy `session.query()` code.
- Add or update focused tests for reusable infrastructure changes.

## Architecture

- `api/core/`: configuration, dependencies, security, and pagination engine.
- `api/database.py`: shared SQLAlchemy models.
- `api/schemas/`, `api/services/`, `api/routers/`: request/response contracts,
  business logic, and HTTP routing.
- `src/app/`: Next.js App Router pages and layouts.
- `src/components/data-table/`: canonical advanced table components.
- `src/hooks/use-data-table.ts`: canonical URL-driven TanStack Table hook.
- `src/hooks/use-server-data-table.ts`: compatibility hook for the existing
  User screen; prefer the canonical hook for new pages.

## Data Tables

Use `src/components/data-table/` with `useDataTable`. Table state lives in the
URL through nuqs. A page should have one owner for each query key: controls
write the URL, while data fetching reads that resulting URL state.

Backend endpoints must pass explicit `sort_map` and `filter_map` whitelists to
`paginate_select()`. Frontend column ids are the contract keys. Unknown ids
must fail with `400`; silently ignoring them can return more data than requested.

## UI Conventions

- Use `PageHeader`; pass `back` for child-page navigation.
- The dashboard layout owns page padding. Page containers use
  `mx-auto w-full max-w-7xl space-y-6` without a second padding layer.
- Use skeletons for data loading and `Spinner` inside pending action buttons.
- Every icon-only button needs both an accessible name and a visible tooltip.
- Every destructive action requires an `AlertDialog` confirmation.
- Every `DialogContent` includes a `DialogDescription`, visible or `sr-only`.

## Verification

```sh
npm run typecheck
npm run lint
npm run build
pytest api/tests_unit/test_pagination_core.py
pytest api/tests/  # requires PostgreSQL configured through .env
```
