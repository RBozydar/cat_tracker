# Cat Tracker

Feeding, calorie, and weight tracker for a two-person, three-cat household.

A FastAPI + SQLite backend owns the canonical data model and all calorie/report
math; a Vite + React (shadcn/ui) SPA renders it. Both ship in a single container
that serves the API and the built SPA. See
[`FEATURE_PARITY.md`](FEATURE_PARITY.md) for the product spec and
[`docs/plans/`](docs/plans/) for the rebuild plan.

> Ground-up rebuild in progress. This is the Phase 0 skeleton (app shell +
> `/api/health` only); domain features land in later phases.

## Layout

```
backend/    FastAPI app, Alembic migrations, uv-managed Python 3.14
frontend/   Vite + React 19 + TypeScript SPA (pnpm)
Dockerfile  multi-stage: build the SPA, then run the API that serves it
```

## Development

Backend (from `backend/`):

```bash
uv sync
uv run uvicorn app.main:app --reload --port 3000
uv run pytest          # ruff / mypy / pytest also available via uv run
```

Frontend (from `frontend/`):

```bash
pnpm install
pnpm dev               # Vite dev server; proxies /api to the backend on :3000
pnpm test              # vitest
pnpm build             # type-check + build to frontend/dist
```

## Container

```bash
docker compose up --build
```

Serves on port 3000 inside the container (mapped to `2137` by compose, behind
Traefik). The entrypoint runs `alembic upgrade head` before starting uvicorn.
