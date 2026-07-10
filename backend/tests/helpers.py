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


def add_weight(
    client: TestClient, cat_id: int, weight_kg: float, measured_on: str
) -> dict[str, Any]:
    response = client.post(
        f"/api/cats/{cat_id}/weights",
        json={"weight_kg": weight_kg, "measured_on": measured_on},
    )
    assert response.status_code == 201, response.text
    return response.json()


def set_settings(
    client: TestClient,
    *,
    timezone: str = "UTC",
    portion_suggestions_enabled: bool = False,
    meals_per_day: int = 2,
) -> None:
    response = client.put(
        "/api/settings",
        json={
            "timezone": timezone,
            "portion_suggestions_enabled": portion_suggestions_enabled,
            "meals_per_day": meals_per_day,
        },
    )
    assert response.status_code == 200, response.text


def set_timezone(client: TestClient, timezone: str) -> None:
    set_settings(client, timezone=timezone)
