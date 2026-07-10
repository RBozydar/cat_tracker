"""Meals: snapshot rules, kcal derivation, local-date filtering, ordering."""

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from tests.helpers import create_cat, create_food, create_meal, set_timezone


def test_per_100g_kcal_derivation(client: TestClient) -> None:
    food = create_food(client, calorie_basis="PER_100G", kcal_per_basis=80.0)
    cat = create_cat(client)
    meal = create_meal(client, cat_id=cat["id"], food_id=food["id"], quantity=50.0)
    assert meal["kcal"] == 40.0
    assert meal["basis"] == "PER_100G"
    assert meal["food_name"] == food["name"]


def test_per_piece_kcal_derivation(client: TestClient) -> None:
    treat = create_food(client, type="TREAT", calorie_basis="PER_PIECE", kcal_per_basis=2.0)
    cat = create_cat(client)
    meal = create_meal(client, cat_id=cat["id"], food_id=treat["id"], quantity=3.0)
    assert meal["kcal"] == 6.0
    assert meal["basis"] == "PER_PIECE"


def test_editing_food_kcal_does_not_change_existing_meal(client: TestClient) -> None:
    food = create_food(client, calorie_basis="PER_100G", kcal_per_basis=80.0)
    cat = create_cat(client)
    create_meal(client, cat_id=cat["id"], food_id=food["id"], quantity=50.0)

    client.patch(f"/api/foods/{food['id']}", json={"kcal_per_basis": 200.0})

    listed = client.get("/api/meals").json()[0]
    assert listed["kcal"] == 40.0
    assert listed["kcal_per_basis"] == 80.0


def test_editing_quantity_resnapshots_at_current_food_values(client: TestClient) -> None:
    food = create_food(client, calorie_basis="PER_100G", kcal_per_basis=80.0)
    cat = create_cat(client)
    meal = create_meal(client, cat_id=cat["id"], food_id=food["id"], quantity=50.0)
    client.patch(f"/api/foods/{food['id']}", json={"kcal_per_basis": 200.0})

    updated = client.patch(f"/api/meals/{meal['id']}", json={"quantity": 100.0}).json()
    # Re-snapshot pulls the food's *current* kcal (200): 100 g → 200 kcal.
    assert updated["kcal_per_basis"] == 200.0
    assert updated["kcal"] == 200.0


def test_editing_time_only_keeps_old_snapshot(client: TestClient) -> None:
    food = create_food(client, calorie_basis="PER_100G", kcal_per_basis=80.0)
    cat = create_cat(client)
    meal = create_meal(
        client, cat_id=cat["id"], food_id=food["id"], quantity=50.0, fed_at="2026-07-01T12:00:00Z"
    )
    client.patch(f"/api/foods/{food['id']}", json={"kcal_per_basis": 200.0})

    updated = client.patch(
        f"/api/meals/{meal['id']}", json={"fed_at": "2026-07-02T09:00:00Z"}
    ).json()
    # Date/time-only edit does not re-snapshot.
    assert updated["kcal_per_basis"] == 80.0
    assert updated["kcal"] == 40.0


def test_changing_food_resnapshots_from_new_food(client: TestClient) -> None:
    wet = create_food(client, name="Wet", calorie_basis="PER_100G", kcal_per_basis=80.0)
    treat = create_food(
        client, name="Treat", type="TREAT", calorie_basis="PER_PIECE", kcal_per_basis=5.0
    )
    cat = create_cat(client)
    meal = create_meal(client, cat_id=cat["id"], food_id=wet["id"], quantity=50.0)

    updated = client.patch(
        f"/api/meals/{meal['id']}", json={"food_id": treat["id"], "quantity": 2.0}
    ).json()
    assert updated["basis"] == "PER_PIECE"
    assert updated["kcal"] == 10.0
    assert updated["food_name"] == "Treat"


def test_default_fed_at_is_now_utc(client: TestClient) -> None:
    food = create_food(client)
    cat = create_cat(client)
    meal = create_meal(client, cat_id=cat["id"], food_id=food["id"])
    fed_at = datetime.fromisoformat(meal["fed_at"])
    assert fed_at.tzinfo is not None
    assert abs(datetime.now(UTC) - fed_at) < timedelta(minutes=1)


def test_limit_returns_newest_first(client: TestClient) -> None:
    food = create_food(client)
    cat = create_cat(client)
    for day in ("2026-07-01", "2026-07-02", "2026-07-03"):
        create_meal(client, cat_id=cat["id"], food_id=food["id"], fed_at=f"{day}T12:00:00Z")
    meals = client.get("/api/meals?limit=2").json()
    assert [m["fed_at"][:10] for m in meals] == ["2026-07-03", "2026-07-02"]


def test_local_date_filter_buckets_by_household_tz_across_dst(client: TestClient) -> None:
    set_timezone(client, "Europe/Warsaw")
    food = create_food(client)
    cat = create_cat(client)
    # 2026-03-29 is Warsaw's spring-forward (23h) day.
    # 22:30Z = 23:30 CET on the 28th (local day 2026-03-28).
    before = create_meal(
        client, cat_id=cat["id"], food_id=food["id"], fed_at="2026-03-28T22:30:00Z"
    )
    # 23:30Z = 00:30 CET on the 29th (local day 2026-03-29).
    after = create_meal(client, cat_id=cat["id"], food_id=food["id"], fed_at="2026-03-28T23:30:00Z")

    day28 = client.get(f"/api/meals?cat_id={cat['id']}&start=2026-03-28&end=2026-03-28").json()
    day29 = client.get(f"/api/meals?cat_id={cat['id']}&start=2026-03-29&end=2026-03-29").json()
    assert [m["id"] for m in day28] == [before["id"]]
    assert [m["id"] for m in day29] == [after["id"]]


def test_delete_meal(client: TestClient) -> None:
    food = create_food(client)
    cat = create_cat(client)
    meal = create_meal(client, cat_id=cat["id"], food_id=food["id"])
    assert client.delete(f"/api/meals/{meal['id']}").status_code == 204
    assert client.get("/api/meals").json() == []
