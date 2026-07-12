"""Cats: creation, defaults validation, weights upsert/delete, cascade delete."""

from typing import TYPE_CHECKING

from tests.helpers import create_cat, create_food, create_meal

if TYPE_CHECKING:
    from fastapi.testclient import TestClient


def test_create_without_weight_has_null_current_weight(client: TestClient) -> None:
    cat = create_cat(client)
    assert cat["current_weight_kg"] is None
    assert cat["meal_count"] == 0


def test_create_with_initial_weight_creates_first_entry(client: TestClient) -> None:
    cat = create_cat(client, initial_weight_kg=4.2)
    assert cat["current_weight_kg"] == 4.2
    weights = client.get(f"/api/cats/{cat['id']}/weights").json()
    assert len(weights) == 1
    assert weights[0]["weight_kg"] == 4.2


def test_create_with_default_foods(client: TestClient) -> None:
    wet = create_food(client, type="WET")
    dry = create_food(client, type="DRY", calorie_basis="PER_100G")
    cat = create_cat(client, default_wet_food_id=wet["id"], default_dry_food_id=dry["id"])
    assert cat["default_wet_food_id"] == wet["id"]
    assert cat["default_dry_food_id"] == dry["id"]


def test_default_food_must_exist(client: TestClient) -> None:
    response = client.post(
        "/api/cats", json={"name": "X", "target_kcal": 200.0, "default_wet_food_id": 999}
    )
    assert response.status_code == 400


def test_default_wet_food_must_be_wet_type(client: TestClient) -> None:
    dry = create_food(client, type="DRY", calorie_basis="PER_100G")
    response = client.post(
        "/api/cats",
        json={"name": "X", "target_kcal": 200.0, "default_wet_food_id": dry["id"]},
    )
    assert response.status_code == 400


def test_default_food_cannot_be_archived(client: TestClient) -> None:
    wet = create_food(client, type="WET")
    cat = create_cat(client)
    create_meal(client, cat_id=cat["id"], food_id=wet["id"])
    client.delete(f"/api/foods/{wet['id']}")  # archives (referenced by a meal)

    response = client.post(
        "/api/cats",
        json={"name": "X", "target_kcal": 200.0, "default_wet_food_id": wet["id"]},
    )
    assert response.status_code == 400


def test_patch_can_clear_goal_weight(client: TestClient) -> None:
    cat = create_cat(client, goal_weight_kg=4.0)
    assert cat["goal_weight_kg"] == 4.0
    updated = client.patch(f"/api/cats/{cat['id']}", json={"goal_weight_kg": None})
    assert updated.status_code == 200
    assert updated.json()["goal_weight_kg"] is None


def test_patch_rejects_explicit_null_name(client: TestClient) -> None:
    cat = create_cat(client)
    response = client.patch(f"/api/cats/{cat['id']}", json={"name": None})
    assert response.status_code == 422


def test_patch_rejects_explicit_null_target_kcal(client: TestClient) -> None:
    cat = create_cat(client)
    response = client.patch(f"/api/cats/{cat['id']}", json={"target_kcal": None})
    assert response.status_code == 422


def test_weight_upsert_replaces_same_day(client: TestClient) -> None:
    cat = create_cat(client)
    first = client.post(
        f"/api/cats/{cat['id']}/weights",
        json={"weight_kg": 5.0, "measured_on": "2026-07-01"},
    )
    assert first.status_code == 201
    second = client.post(
        f"/api/cats/{cat['id']}/weights",
        json={"weight_kg": 4.8, "measured_on": "2026-07-01"},
    )
    assert second.status_code == 201

    weights = client.get(f"/api/cats/{cat['id']}/weights").json()
    assert len(weights) == 1
    assert weights[0]["weight_kg"] == 4.8


def test_current_weight_is_latest_by_date(client: TestClient) -> None:
    cat = create_cat(client)
    client.post(
        f"/api/cats/{cat['id']}/weights", json={"weight_kg": 5.0, "measured_on": "2026-07-01"}
    )
    client.post(
        f"/api/cats/{cat['id']}/weights", json={"weight_kg": 4.5, "measured_on": "2026-07-08"}
    )
    assert client.get(f"/api/cats/{cat['id']}").json()["current_weight_kg"] == 4.5


def test_delete_weight_entry_by_date(client: TestClient) -> None:
    cat = create_cat(client)
    client.post(
        f"/api/cats/{cat['id']}/weights", json={"weight_kg": 5.0, "measured_on": "2026-07-01"}
    )
    response = client.delete(f"/api/cats/{cat['id']}/weights/2026-07-01")
    assert response.status_code == 204
    assert client.get(f"/api/cats/{cat['id']}/weights").json() == []


def test_delete_missing_weight_entry_404(client: TestClient) -> None:
    cat = create_cat(client)
    assert client.delete(f"/api/cats/{cat['id']}/weights/2026-07-01").status_code == 404


def test_meal_count_reflects_logged_meals(client: TestClient) -> None:
    food = create_food(client)
    cat = create_cat(client)
    create_meal(client, cat_id=cat["id"], food_id=food["id"])
    create_meal(client, cat_id=cat["id"], food_id=food["id"])
    assert client.get(f"/api/cats/{cat['id']}").json()["meal_count"] == 2


def test_delete_cat_cascades_meals_and_weights(client: TestClient) -> None:
    food = create_food(client)
    cat = create_cat(client, initial_weight_kg=4.0)
    create_meal(client, cat_id=cat["id"], food_id=food["id"])
    create_meal(client, cat_id=cat["id"], food_id=food["id"])

    assert client.delete(f"/api/cats/{cat['id']}").status_code == 204
    assert client.get(f"/api/cats/{cat['id']}").status_code == 404
    # Meals and weight entries are gone with the cat.
    assert client.get("/api/meals").json() == []
    assert client.get(f"/api/cats/{cat['id']}/weights").status_code == 404
