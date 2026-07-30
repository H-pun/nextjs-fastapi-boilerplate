# Boilerplate

A role-based dashboard app boilerplate (user / admin). Built as a **monorepo** with a Next.js frontend and a FastAPI backend in a single repository.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js (App Router, TypeScript) |
| Backend | FastAPI (Python) |
| Database | PostgreSQL 16 (SQLAlchemy + Alembic) |
| File Storage | S3-compatible (MinIO / AWS S3) |

## Prerequisites

| Requirement | Minimum Version | Used For |
| --- | --- | --- |
| Node.js | 20+ (LTS recommended) | Frontend (Next.js) |
| Python | 3.10+ | Backend (FastAPI) |
| PostgreSQL | 16+ | Database |
| S3-compatible storage | MinIO / AWS S3 | File storage |

> The app **requires both a database (PostgreSQL) and an S3-compatible object storage**. The backend will not run correctly without them. See [Required Services](#required-services) below for how to provision them.

## Required Services

This app needs a **PostgreSQL database** and an **S3-compatible bucket**. Pick whichever setup fits you:

### Option A: Managed / third-party services

- **Database:** a managed PostgreSQL provider such as [Neon](https://neon.tech) or [Supabase](https://supabase.com). Copy the host, port, user, password, and database name into the `POSTGRES_*` variables.
- **S3 storage:** [AWS S3](https://aws.amazon.com/s3/), Supabase Storage, or any S3-compatible service. Point `MINIO_URL` and the access keys at it.

### Option B: Manual install

Install both services natively on your machine:
- [PostgreSQL 16](https://www.postgresql.org/download/): create a database (see `POSTGRES_DB` in `.env.example`).
- [MinIO](https://min.io/download): run it locally and note the access keys.

Then fill in the matching `.env` values.

## Installation

### 1. Clone the repository

```sh
git clone <your-fork-url>
cd boilerplate
```

### 2. Set up environment variables

Create a single `.env` file from the template `.env.example`. This one file is used by both the backend (FastAPI) and the frontend (Next.js):

```sh
copy .env.example .env          # Windows
# cp .env.example .env          # macOS/Linux
```

Then edit `.env`. See [Environment Variables](#environment-variables) for the full reference.

### 3. Set up the backend (Python)

```sh
# create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# install backend dependencies (note: requirements live in api/)
pip install -r api/requirements-dev.txt
```

### 4. Install frontend dependencies

```sh
npm install
```

### 5. Prepare the database

Make sure PostgreSQL is running (Option A/B above), then apply migrations and seed initial data:

```sh
# create all tables
alembic upgrade head

# seed initial data (admin account, navigation, etc.)
python -m api.seeder
```

## Running the App

The backend and frontend run as **separate processes** (run each in its own terminal):

```sh
# Terminal 1: backend (FastAPI), runs on port 8080
npm run fastapi

# Terminal 2: frontend (Next.js), runs on port 3030
npm run dev
```

Then open `http://localhost:3030` in your browser.

### Port reference

| Service | URL |
| --- | --- |
| Frontend | http://localhost:3030 |
| Backend (API) | http://localhost:8080 |
| API docs (Swagger) | http://localhost:8080/api/docs |
| MinIO console | http://localhost:9001 |

## Environment Variables

All variables below go in the single `.env` file. Example values are for **local development**, adjust for your setup.

### Application

| Variable | Example | Notes |
| --- | --- | --- |
| `PROJECT_NAME` | `Boilerplate API` | Project name shown in Swagger |
| `API_V1_STR` | `/api` | API route prefix |
| `SECRET_KEY` | `your-secret-key` | JWT signing key |
| `ENVIRONMENT` | `development` | `development`, `production`, or `test` |
| `DOMAIN` | `localhost:3030` | Server domain |

### Frontend / Auth

| Variable | Example | Notes |
| --- | --- | --- |
| `NEXTAUTH_URL` | `http://localhost:3030` | Frontend URL (port 3030) |
| `SECRET_KEY` | `your-secret-key` | Also used as NextAuth's session encryption key (`src/lib/auth.ts`) — no separate `NEXTAUTH_SECRET` needed |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8080` | Backend URL (port 8080) |

### Database (PostgreSQL)

| Variable | Example | Notes |
| --- | --- | --- |
| `POSTGRES_HOST` | `localhost` | DB host |
| `POSTGRES_PORT` | `5432` | DB port |
| `POSTGRES_USER` | `postgres` | DB username |
| `POSTGRES_PASSWORD` | `your-db-password` | DB password |
| `POSTGRES_DB` | `boilerplate` | Database name |
| `POSTGRES_SCHEMA` | `public` | Database schema |

### S3 Storage (MinIO)

| Variable | Example | Notes |
| --- | --- | --- |
| `MINIO_URL` | `http://localhost:9000` | S3 endpoint |
| `MINIO_ROOT_USER` | `minioadmin` | Access key |
| `MINIO_ROOT_PASSWORD` | `minioadmin` | Secret key (min. 8 chars) |
| `S3_BUCKET` | `app` | Bucket name (auto-created on startup) |

### Misc

| Variable | Example | Notes |
| --- | --- | --- |
| `BACKEND_CORS_ORIGINS` | `http://localhost:3030` | Allowed CORS origins (comma-separated, `*` for all) |
| `SENTRY_DSN` | *(empty)* | Sentry DSN for error monitoring (production only) |

## Notes

- **Windows / PowerShell:** if `npm` or venv activation fails with *"running scripts is disabled"*, allow scripts for your user once:
```sh
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
- The `.env` file is **not** committed to the repo. Always create it from `.env.example`.
