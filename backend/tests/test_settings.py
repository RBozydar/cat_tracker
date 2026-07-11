"""Settings singleton: auto-create, defaults, PUT, timezone validation."""

from unittest.mock import patch

from app.services.settings import SETTINGS_ID, get_or_create_settings
from fastapi.testclient import TestClient
from sqlalchemy import Engine
from sqlalchemy.orm import Session


def test_get_auto_creates_singleton_with_defaults(client: TestClient) -> None:
    response = client.get("/api/settings")
    assert response.status_code == 200
    assert response.json() == {
        "timezone": "UTC",
        "portion_suggestions_enabled": False,
        "meals_per_day": 2,
    }


def test_put_updates_all_fields(client: TestClient) -> None:
    response = client.put(
        "/api/settings",
        json={
            "timezone": "Europe/Warsaw",
            "portion_suggestions_enabled": True,
            "meals_per_day": 3,
        },
    )
    assert response.status_code == 200
    assert response.json() == {
        "timezone": "Europe/Warsaw",
        "portion_suggestions_enabled": True,
        "meals_per_day": 3,
    }
    # Persisted, not just echoed.
    assert client.get("/api/settings").json()["timezone"] == "Europe/Warsaw"


def test_put_rejects_invalid_timezone(client: TestClient) -> None:
    response = client.put(
        "/api/settings",
        json={
            "timezone": "Mars/Phobos",
            "portion_suggestions_enabled": False,
            "meals_per_day": 2,
        },
    )
    assert response.status_code == 400


def test_put_rejects_zero_meals_per_day(client: TestClient) -> None:
    response = client.put(
        "/api/settings",
        json={
            "timezone": "UTC",
            "portion_suggestions_enabled": False,
            "meals_per_day": 0,
        },
    )
    assert response.status_code == 422


def test_get_or_create_settings_falls_back_to_utc_for_invalid_app_timezone(
    engine: Engine,
) -> None:
    with Session(engine) as session:
        settings = get_or_create_settings(session, "Not/AZone")
    assert settings.timezone == "UTC"


def test_get_or_create_settings_recovers_from_concurrent_creation_race(engine: Engine) -> None:
    """Two sessions racing the singleton's first creation: the loser recovers
    instead of surfacing the second insert's IntegrityError as a 500."""

    with Session(engine) as session_a:
        winner_id = get_or_create_settings(session_a, "UTC").id
        session_a.commit()

    with Session(engine) as session_b:
        original_get = Session.get
        calls = {"n": 0}

        def racy_get(self: Session, *args: object, **kwargs: object) -> object:
            calls["n"] += 1
            # First call simulates session_b racing before session_a's commit
            # was visible to it, forcing get_or_create_settings into the
            # insert path even though the row already exists.
            if calls["n"] == 1:
                return None
            return original_get(self, *args, **kwargs)

        with patch.object(Session, "get", racy_get):
            settings = get_or_create_settings(session_b, "UTC")

    assert settings.id == winner_id == SETTINGS_ID
    assert settings.timezone == "UTC"
