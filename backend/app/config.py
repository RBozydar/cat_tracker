"""Application configuration via pydantic-settings.

Only the settings needed by the Phase 0 skeleton live here. The plan adds more
(e.g. the settings singleton's runtime timezone) in later phases; these are the
process-level values read from the environment / ``.env``.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root is two levels up from this file: <repo>/backend/app/config.py.
_REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # SQLAlchemy URL. Four slashes = absolute path (matches docker-compose:
    # sqlite:////data/cat_tracker.db). The default is a dev-local file.
    database_url: str = "sqlite:///./cat_tracker.db"

    # IANA timezone used to seed the household settings singleton on first run.
    # Falls back to UTC when the environment does not provide one.
    app_timezone: str = "UTC"

    # Directory holding the built SPA (frontend/dist). Overridable in the
    # container, where the layout differs from the dev checkout.
    frontend_dist: Path = _REPO_ROOT / "frontend" / "dist"


@lru_cache
def get_settings() -> Settings:
    return Settings()
