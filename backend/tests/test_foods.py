"""Foods: creation, type immutability, archive-on-delete, defaults clearing."""

from typing import TYPE_CHECKING

from tests.helpers import create_cat, create_food, create_meal

if TYPE_CHECKING:
    from fastapi.testclient import TestClient


def test_create_and_list_excludes_archived_by_default(client: TestClient) -> None:
    active = create_food(client, name="Active")
    # Archive a food by referencing it with a meal, then deleting it.
    archived = create_food(client, name="ToArchive")
    cat = create_cat(client)
    create_meal(client, cat_id=cat["id"], food_id=archived["id"])
    assert client.delete(f"/api/foods/{archived['id']}").json()["archived"] is True

    default_ids = {f["id"] for f in client.get("/api/foods").json()}
    assert default_ids == {active["id"]}

    all_ids = {f["id"] for f in client.get("/api/foods?include_archived=true").json()}
    assert all_ids == {active["id"], archived["id"]}


def test_type_is_immutable(client: TestClient) -> None:
    food = create_food(client, type="WET")
    response = client.patch(f"/api/foods/{food['id']}", json={"type": "TREAT"})
    assert response.status_code == 400
    # Same type is a no-op, not an error.
    assert client.patch(f"/api/foods/{food['id']}", json={"type": "WET"}).status_code == 200


def test_calorie_fields_are_editable(client: TestClient) -> None:
    food = create_food(client, kcal_per_basis=80.0, calorie_basis="PER_100G")
    response = client.patch(
        f"/api/foods/{food['id']}",
        json={"kcal_per_basis": 95.0, "calorie_basis": "PER_100G", "name": "Renamed"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["kcal_per_basis"] == 95.0
    assert body["name"] == "Renamed"


def test_delete_hard_deletes_when_unreferenced(client: TestClient) -> None:
    food = create_food(client)
    result = client.delete(f"/api/foods/{food['id']}")
    assert result.status_code == 200
    assert result.json() == {"archived": False, "food": None, "cleared_default_for_cat_ids": []}
    # Gone entirely, even from the archived view.
    assert client.get("/api/foods?include_archived=true").json() == []


def test_delete_archives_when_referenced_by_meal(client: TestClient) -> None:
    food = create_food(client)
    cat = create_cat(client)
    create_meal(client, cat_id=cat["id"], food_id=food["id"])

    result = client.delete(f"/api/foods/{food['id']}").json()
    assert result["archived"] is True
    assert result["food"]["archived_at"] is not None


def test_archiving_clears_cat_defaults_and_reports_affected_cats(client: TestClient) -> None:
    wet = create_food(client, type="WET")
    cat = create_cat(client, default_wet_food_id=wet["id"])
    create_meal(client, cat_id=cat["id"], food_id=wet["id"])

    result = client.delete(f"/api/foods/{wet['id']}").json()
    assert result["archived"] is True
    assert result["cleared_default_for_cat_ids"] == [cat["id"]]
    assert client.get(f"/api/cats/{cat['id']}").json()["default_wet_food_id"] is None


def test_patch_rejects_explicit_null_name(client: TestClient) -> None:
    food = create_food(client)
    response = client.patch(f"/api/foods/{food['id']}", json={"name": None})
    assert response.status_code == 422


def test_patch_rejects_explicit_null_calorie_basis(client: TestClient) -> None:
    food = create_food(client)
    response = client.patch(f"/api/foods/{food['id']}", json={"calorie_basis": None})
    assert response.status_code == 422


def test_patch_rejects_explicit_null_kcal_per_basis(client: TestClient) -> None:
    food = create_food(client)
    response = client.patch(f"/api/foods/{food['id']}", json={"kcal_per_basis": None})
    assert response.status_code == 422


def test_cannot_log_archived_food(client: TestClient) -> None:
    food = create_food(client)
    cat = create_cat(client)
    create_meal(client, cat_id=cat["id"], food_id=food["id"])
    client.delete(f"/api/foods/{food['id']}")  # archives it

    response = client.post(
        "/api/meals", json={"cat_id": cat["id"], "food_id": food["id"], "quantity": 10.0}
    )
    assert response.status_code == 400
