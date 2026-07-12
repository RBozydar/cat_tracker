# syntax=docker/dockerfile:1

# ---- Stage 1: build the SPA (frontend/dist) ----
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
RUN npm install -g pnpm@11.11.0
# Install deps first for layer caching, then build.
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

# ---- Stage 2: Python runtime (API + built SPA) ----
FROM python:3.14-slim AS runtime
COPY --from=ghcr.io/astral-sh/uv:0.9.8 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/backend/.venv \
    PATH="/app/backend/.venv/bin:$PATH"

# curl backs the /api/health healthcheck (compose + HEALTHCHECK below).
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Sync runtime deps first (cache layer keyed on the lockfile only).
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

COPY backend/ ./
# The app serves the SPA from <repo>/frontend/dist, which resolves to
# /app/frontend/dist given the /app/backend working tree (see app/config.py).
COPY --from=frontend /app/frontend/dist /app/frontend/dist

RUN chmod +x docker-entrypoint.sh && mkdir -p /data

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

ENTRYPOINT ["/app/backend/docker-entrypoint.sh"]
