#!/usr/bin/env bash
#
# Regenerate frontend/src/api/types.gen.ts from the backend's live OpenAPI schema.
#
# Requires the backend virtualenv. From the repo root:
#     (cd backend && uv sync)
# then, from frontend/:
#     pnpm gen:api
#
# The FastAPI app is imported in-process (no server needed): `python -c` puts the
# current working directory on sys.path, so `app` resolves when we cd into
# backend/ first. The JSON is written to a temp file and fed to openapi-typescript.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
frontend_dir="$(dirname "$here")"
backend_dir="$(cd "$frontend_dir/../backend" && pwd)"
out="$frontend_dir/src/api/types.gen.ts"

schema_file="$(mktemp)"
trap 'rm -f "$schema_file"' EXIT

(cd "$backend_dir" && uv run python -c \
  'import json; from app.main import create_app; print(json.dumps(create_app().openapi()))') \
  >"$schema_file"

pnpm exec openapi-typescript "$schema_file" --output "$out"
echo "Wrote ${out#"$frontend_dir/"}"
