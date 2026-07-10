"""Settings singleton: auto-create, defaults, PUT, timezone validation."""

from fastapi.testclient import TestClient


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
