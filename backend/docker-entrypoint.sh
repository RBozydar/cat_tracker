#!/bin/sh
# Apply migrations, then hand off (exec) to uvicorn as PID 1 for clean signals.
set -e

alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port 3000
