# Cat Tracker

Feeding, calorie, and weight tracker for a two-person, three-cat household. It
records meals (including treats), manages a food library, compares intake
against each cat's daily calorie target, tracks body weight against a goal, and
reviews feeding history over time.

A **FastAPI + SQLite backend** owns the canonical data model and all
calorie/report math; a **Vite + React (shadcn/ui) SPA** renders it. Both ship in
a **single container** that serves the API and the built SPA behind Traefik.

See [`FEATURE_PARITY.md`](FEATURE_PARITY.md) for the product spec and
[`docs/plans/`](docs/plans/) for the rebuild plan.

Two design rules drive the whole model, and exist to fix the two structural
defects of the old app:

- **True UTC everywhere.** Timestamps are stored in UTC; a single household
  timezone in settings drives "today", day bucketing, and report boundaries.
  The frontend never sends a timezone.
- **Immutable history.** Each meal snapshots the food's calorie basis and value
  at log time. Editing a food's kcal or a cat's defaults never rewrites past
  meals.

## Layout

```
backend/    FastAPI app, SQLAlchemy models, Alembic migrations, services/ (all math), uv-managed Python 3.14
frontend/   Vite + React 19 + TypeScript SPA, Tailwind 4, shadcn/ui + Recharts charts (pnpm)
Dockerfile  multi-stage: build the SPA (node), then run the API that serves it (python)
docker-compose.yml   Traefik labels, 2137→3000 port map, cat_db named volume, /api/health healthcheck
.github/workflows/ci.yml   backend (ruff/mypy/pytest) + frontend (tsc/vitest/build) + docker image build
```

## Development

The backend and frontend run as two processes in dev. The Vite dev server
proxies `/api` to the backend, so the SPA talks to it exactly as it will in the
container.

> **Port note:** local dev runs the backend on **`:8137`**, because host port
> `:3000` is taken by an unrelated service on the dev machine. The container
> still serves on `:3000` internally — that path never uses the dev proxy.

### Backend (from `backend/`)

```bash
uv sync                                              # create .venv from uv.lock
uv run uvicorn app.main:app --reload --port 8137     # API at http://localhost:8137
uv run python seed.py                                # optional: 3 cats, 6 foods, 2 weeks of data
```

- Interactive API docs: `http://localhost:8137/docs`. Health:
  `http://localhost:8137/api/health`.
- `seed.py` is idempotent-ish (a no-op once cats exist) and dev-only; production
  starts from an empty database and real data.
- Config comes from the environment / `backend/.env` (see `app/config.py`):
  `DATABASE_URL` (default `sqlite:///./cat_tracker.db`) and `APP_TIMEZONE`
  (default `UTC`, seeds the settings singleton on first run).

Checks (also run in CI):

```bash
uv run ruff check .          # lint
uv run ruff format --check . # formatting
uv run mypy app              # strict type-check
uv run pytest                # 81 tests: services math, snapshot/tz invariants, routers
```

### Frontend (from `frontend/`)

```bash
pnpm install
pnpm dev       # Vite dev server; proxies /api to the backend on :8137
pnpm test      # vitest (30 tests)
pnpm build     # tsc -b && vite build → frontend/dist
```

The dev proxy target lives in `frontend/vite.config.ts` (`server.proxy['/api']`).
Change it there if you run the backend on a different port.

### Regenerating API types (`gen:api`)

The frontend's types come from the backend's OpenAPI schema — the binding
contract. After any change to the backend request/response models, regenerate
and commit `frontend/src/api/types.gen.ts`:

```bash
cd backend && uv sync        # once, so the schema can be imported
cd ../frontend && pnpm gen:api
```

`scripts/gen-api.sh` imports the FastAPI app in-process (no running server
needed), dumps `openapi.json`, and feeds it to `openapi-typescript`. The barrel
in `src/api/types.ts` re-exports the generated `components["schemas"]` under
friendly aliases; app code imports from there, never from `types.gen.ts`
directly. `pnpm gen:api` is idempotent — a clean tree should produce zero diff.

## Container

Build and run the whole app as it ships (single container, SPA + API):

```bash
docker compose up --build
```

The multi-stage `Dockerfile` builds `frontend/dist` with node/pnpm, then copies
it into a `python:3.14-slim` runtime that `uv sync`s the backend. The entrypoint
runs `alembic upgrade head` and then `uvicorn app.main:app --host 0.0.0.0 --port
3000`. FastAPI serves the API under `/api`, the built SPA at `/` with a
client-routing fallback, and returns JSON 404 for unknown `/api/*` paths.

`docker-compose.yml` preserves the deploy contract: container name `cattrack`,
`2137:3000` port map, Traefik labels/router, the `cat_db` named SQLite volume
(`DATABASE_URL=sqlite:////data/cat_tracker.db`), and the `/api/health`
healthcheck. `APP_TIMEZONE` (`Europe/Warsaw` in compose) seeds the household
timezone on first run.

## Deploy

CI (`.github/workflows/ci.yml`) runs the backend and frontend checks on every
PR, builds the Docker image, and pushes it to GHCR
(`ghcr.io/<repo>:latest`) on pushes to `main`. Production cutover on the Traefik
host is `docker compose pull && docker compose up -d` (or `up -d --build`);
rollback is reverting the compose image tag. The database is a fresh file on the
existing `cat_db` volume — the old `dev.db` is left untouched as a cold archive.

## PWA

The SPA is an installable, online-only PWA (no service worker): a
`manifest.webmanifest`, maskable cat icons, and iOS `apple-touch-icon` +
`apple-mobile-web-app-*` meta tags. Add-to-Home-Screen works on iOS; dark/light
follows the system preference with no in-app toggle.
