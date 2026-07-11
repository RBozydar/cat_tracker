"""Shared pytest fixtures: a fresh SQLite file per test wired into the app.

Each test gets its own temp database with all tables created and foreign-key
enforcement on (via ``create_db_engine``'s connect pragmas), so cascade/RESTRICT
behavior is exercised for real. The ``get_session`` dependency is overridden to
bind to that engine.
"""

from typing import TYPE_CHECKING

import pytest
from app.config import Settings
from app.db import Base, create_db_engine, get_session
from app.main import create_app
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

if TYPE_CHECKING:
    from collections.abc import Iterator
    from pathlib import Path

    from sqlalchemy import Engine


@pytest.fixture
def engine(tmp_path: Path) -> Iterator[Engine]:
    settings = Settings(database_url=f"sqlite:///{tmp_path / 'test.db'}", app_timezone="UTC")
    engine = create_db_engine(settings)
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def client(engine: Engine) -> Iterator[TestClient]:
    def override_get_session() -> Iterator[Session]:
        with Session(engine) as session:
            yield session

    app = create_app()
    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
