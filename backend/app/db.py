"""Database engine, session dependency, and the UTC datetime convention.

**Time convention (the whole point of the rebuild).** Every ``datetime`` stored
by this app is a true UTC instant. SQLite has no native timezone support, so the
:class:`UTCDateTime` column below normalises values to UTC on the way in and
re-attaches ``UTC`` on the way out. Application code therefore always receives
timezone-aware UTC datetimes and never has to guess what a naive value meant —
that ambiguity was the old app's core defect.

Local-date semantics (the household timezone) live entirely at the query/report
boundary (see ``app.services.timezones``); nothing below this line knows about
local time.

The engine runs SQLite in WAL mode with a busy timeout and foreign-key
enforcement enabled (needed for ON DELETE CASCADE on cats and the RESTRICT on
``meal.food_id``). A single uvicorn worker keeps writes serialised.
"""

from collections.abc import Iterator
from datetime import UTC, datetime
from functools import lru_cache
from typing import Annotated, Any

from fastapi import Depends
from sqlalchemy import DateTime, Engine, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session
from sqlalchemy.types import TypeDecorator

from app.config import Settings, get_settings


class Base(DeclarativeBase):
    """Declarative base; ``Base.metadata`` feeds Alembic autogenerate."""


class UTCDateTime(TypeDecorator[datetime]):
    """A ``DateTime`` that stores UTC and always returns tz-aware UTC.

    Bind: an aware value is converted to UTC; a naive value is *assumed* to
    already be UTC (the app only ever constructs UTC), then stored without
    tzinfo because SQLite cannot hold it. Result: the stored instant is
    re-tagged as UTC so callers get an unambiguous aware datetime.
    """

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: Any) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is not None:
            value = value.astimezone(UTC)
        return value.replace(tzinfo=None)

    def process_result_value(self, value: datetime | None, dialect: Any) -> datetime | None:
        if value is None:
            return None
        return value.replace(tzinfo=UTC)


def _configure_sqlite(engine: Engine) -> None:
    """Enable WAL, a busy timeout, and foreign-key enforcement on every connect."""

    @event.listens_for(engine, "connect")
    def _set_pragmas(dbapi_connection: Any, _connection_record: Any) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def create_db_engine(settings: Settings) -> Engine:
    """Build a SQLite engine from settings with the pragmas installed."""

    engine = create_engine(
        settings.database_url,
        # FastAPI serves sync endpoints from a threadpool; SQLite connections
        # must be usable across those threads.
        connect_args={"check_same_thread": False},
    )
    _configure_sqlite(engine)
    return engine


@lru_cache
def get_engine() -> Engine:
    """Process-wide engine, built lazily so importing this module has no side effects."""

    return create_db_engine(get_settings())


def get_session() -> Iterator[Session]:
    """FastAPI dependency yielding a session bound to the process engine."""

    with Session(get_engine()) as session:
        yield session


# Reusable typed dependency — the ``Annotated`` form keeps ``Depends`` out of
# argument defaults (the idiom FastAPI recommends).
SessionDep = Annotated[Session, Depends(get_session)]
