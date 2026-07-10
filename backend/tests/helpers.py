"""Small API helpers to keep integration tests readable."""

from typing import Any

from fastapi.testclient import TestClient


def create_food(client: TestClient, **overrides: Any) -> dict[str, Any]:
    payload = {
        "name": "Chicken Pate",
        "type": "WET",
        "calorie_basis": "PER_100G",
        "kcal_per_basis": 80.0,
    }
    payload.update(overrides)
    response = client.post("/api/foods", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def create_cat(client: TestClient, **overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {"name": "Whiskers", "target_kcal": 200.0}
    payload.update(overrides)
    response = client.post("/api/cats", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def create_meal(client: TestClient, **overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {"quantity": 50.0}
    payload.update(overrides)
    response = client.post("/api/meals", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def set_timezone(client: TestClient, timezone: str) -> None:
    response = client.put(
        "/api/settings",
        json={
            "timezone": timezone,
            "portion_suggestions_enabled": False,
            "meals_per_day": 2,
        },
    )
    assert response.status_code == 200, response.text
