# Cat Tracker

Feeding, calorie, and weight tracker for a two-person, three-cat household.
FastAPI + SQLite backend owns the data model and all calorie/report math; a
Vite + React (shadcn/ui) SPA renders it. Both ship in one container behind
Traefik. **No auth, by design** — it's a LAN/household app, not multi-tenant;
don't add users, sessions, or login.

## Orient yourself

- [`FEATURE_PARITY.md`](FEATURE_PARITY.md) — the product spec of record.
  Locked decisions and the **Out of Scope** list are binding.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — how the app works today:
  data model, invariants, backend/frontend layout, strictness profiles, deploy.
- [`docs/plans/`](docs/plans/) — historical build plans; not updated as the
  app evolves, useful for rationale.

## Commands

Backend (from `backend/`):

```bash
uv sync                                          # install deps
uv run alembic upgrade head                      # apply migrations (needed before first run)
uv run uvicorn app.main:app --reload --port 8137  # :3000 is taken on the dev box
uv run ruff check . && uv run ruff format --check .
uv run mypy app
uv run pytest
```

Frontend (from `frontend/`):

```bash
pnpm dev         # Vite dev server, proxies /api to :8137
pnpm test        # vitest
pnpm lint        # oxlint
pnpm build       # tsc -b && vite build
pnpm gen:api     # regenerate frontend/src/api/types.gen.ts from the backend's OpenAPI schema
```

## Rules that must not be violated

1. **True UTC + household-timezone bucketing.** All stored timestamps are
   UTC. The household's one IANA timezone drives "today" and day bucketing,
   applied only at the query/report boundary (`backend/app/services/timezones.py`).
   **The frontend never sends a timezone to the API** — it converts for
   display/editing client-side (`frontend/src/lib/format.ts`).
2. **Meal history is immutable.** A meal snapshots its food's calorie basis
   and value at log time (`basis_snapshot`, `kcal_per_basis_snapshot`).
   Editing a food's kcal or a cat's defaults must never change a past meal's
   calories. Only a `PATCH` that changes `food_id` or `quantity` re-snapshots.
3. **Regenerate `types.gen.ts` after any backend schema change** (`pnpm gen:api`
   from `frontend/`, backend venv synced first). A clean tree should produce
   zero diff — if it doesn't, the frontend types are stale.
4. **Theme is a three-way toggle — light / dark / system, defaulting to
   system.** Class-strategy with a system fallback (`frontend/src/lib/theme.ts`):
   a `data-theme` attribute on `<html>` for an explicit light/dark choice,
   *absent* for system, where the `prefers-color-scheme` media query drives the
   flip. Dark tokens live under **both** `[data-theme="dark"]` and that media
   query scoped to `:root:not([data-theme])`; light under
   `:root, [data-theme="light"]` (`frontend/src/index.css`). No third-party theme
   library (no `next-themes`). This deliberately **reverses** the earlier
   media-only, no-toggle decision — the product owner changed it after living
   with the app; do not "fix" the toggle away.
5. **Metric only.** kg, grams/pieces, kcal. No lbs, no unit conversion layer.
6. **The Out of Scope list in `FEATURE_PARITY.md` is binding**: no auth, no
   per-cat meals-per-day, no offline/sync, no notifications/photos, no
   migration of old data. If a task seems to need one of these, stop and
   re-read the spec rather than building it.
