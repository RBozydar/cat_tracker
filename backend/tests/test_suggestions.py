"""Fast re-log suggestions: ranking, most-recent append, archive exclusion, fallback.

The 14-day window is relative to *now*, so meal timestamps are built from the
current instant rather than fixed dates. Suggestions are priced at each food's
current values, so a PER_100G food at 80 kcal/100 g gives quantity × 0.8 kcal.
"""

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from tests.helpers import create_cat, create_food, create_meal

WET_KCAL_PER_100G = 80.0


def _hours_ago(hours: int) -> str:
    return (datetime.now(UTC) - timedelta(hours=hours)).isoformat()


def test_ranked_by_count_then_recency_with_most_recent_appended(client: TestClient) -> None:
    food = create_food(client, kcal_per_basis=WET_KCAL_PER_100G)
    cat = create_cat(client, target_kcal=200.0)

    # A (50 g) ×3, oldest cluster; B (40 g) ×3, newer; C (30 g) ×2; D (20 g) ×1, newest.
    for hours in (10, 9, 8):
        create_meal(
            client, cat_id=cat["id"], food_id=food["id"], quantity=50.0, fed_at=_hours_ago(hours)
        )
    for hours in (7, 6, 5):
        create_meal(
            client, cat_id=cat["id"], food_id=food["id"], quantity=40.0, fed_at=_hours_ago(hours)
        )
    for hours in (4, 3):
        create_meal(
            client, cat_id=cat["id"], food_id=food["id"], quantity=30.0, fed_at=_hours_ago(hours)
        )
    create_meal(client, cat_id=cat["id"], food_id=food["id"], quantity=20.0, fed_at=_hours_ago(1))

    suggestions = client.get(f"/api/meals/suggestions?cat_id={cat['id']}").json()

    # B and A tie on count (3); B is more recent → first. C is next (count 2).
    # D (count 1) is the single most recent meal, appended as the 4th chip.
    assert [(s["quantity"], s["kcal"]) for s in suggestions] == [
        (40.0, 32.0),
        (50.0, 40.0),
        (30.0, 24.0),
        (20.0, 16.0),
    ]


def test_most_recent_not_duplicated_when_already_ranked(client: TestClient) -> None:
    food = create_food(client, kcal_per_basis=WET_KCAL_PER_100G)
    cat = create_cat(client, target_kcal=200.0)
    # Only two distinct combos; the most recent meal is the 50 g combo already ranked.
    for hours in (5, 1):
        create_meal(
            client, cat_id=cat["id"], food_id=food["id"], quantity=50.0, fed_at=_hours_ago(hours)
        )
    create_meal(client, cat_id=cat["id"], food_id=food["id"], quantity=30.0, fed_at=_hours_ago(3))

    suggestions = client.get(f"/api/meals/suggestions?cat_id={cat['id']}").json()

    assert [s["quantity"] for s in suggestions] == [50.0, 30.0]


def test_archived_food_meals_excluded_then_falls_back(client: TestClient) -> None:
    logged = create_food(client, name="Old Wet", kcal_per_basis=WET_KCAL_PER_100G)
    default_wet = create_food(client, name="New Wet", kcal_per_basis=90.0)
    cat = create_cat(client, target_kcal=200.0, default_wet_food_id=default_wet["id"])
    # History exists only for a food we then archive (delete-while-referenced).
    create_meal(client, cat_id=cat["id"], food_id=logged["id"], quantity=50.0, fed_at=_hours_ago(2))
    assert client.delete(f"/api/foods/{logged['id']}").json()["archived"] is True

    suggestions = client.get(f"/api/meals/suggestions?cat_id={cat['id']}").json()

    # No usable history → fallback to the default wet at its portion grams.
    # (200 / 2) / (90/100) = 111.111… g.
    assert len(suggestions) == 1
    assert suggestions[0]["food_id"] == default_wet["id"]
    assert suggestions[0]["quantity"] == 100.0 / 0.9


def test_fallback_to_defaults_when_no_history(client: TestClient) -> None:
    wet = create_food(client, name="Wet", kcal_per_basis=WET_KCAL_PER_100G)
    dry = create_food(client, name="Dry", type="DRY", kcal_per_basis=400.0)
    cat = create_cat(
        client, target_kcal=200.0, default_wet_food_id=wet["id"], default_dry_food_id=dry["id"]
    )

    suggestions = client.get(f"/api/meals/suggestions?cat_id={cat['id']}").json()

    # One chip per default: (200/2)/(kcal/100) grams.
    by_food = {s["food_id"]: s for s in suggestions}
    assert by_food[wet["id"]]["quantity"] == 100.0 / (WET_KCAL_PER_100G / 100)
    assert by_food[dry["id"]]["quantity"] == 100.0 / (400.0 / 100)


def test_basis_changed_meals_excluded_then_falls_back(client: TestClient) -> None:
    food = create_food(client, name="Chicken", kcal_per_basis=WET_KCAL_PER_100G)
    default_wet = create_food(client, name="Backup Wet", kcal_per_basis=90.0)
    cat = create_cat(client, target_kcal=200.0, default_wet_food_id=default_wet["id"])
    create_meal(client, cat_id=cat["id"], food_id=food["id"], quantity=50.0, fed_at=_hours_ago(2))

    # The food's calorie basis changes after the meal was logged (50 g no
    # longer means anything once the food is priced per piece).
    response = client.patch(
        f"/api/foods/{food['id']}", json={"calorie_basis": "PER_PIECE", "kcal_per_basis": 5.0}
    )
    assert response.status_code == 200

    suggestions = client.get(f"/api/meals/suggestions?cat_id={cat['id']}").json()

    # The stale-basis combo is excluded → falls back to the default wet food.
    assert len(suggestions) == 1
    assert suggestions[0]["food_id"] == default_wet["id"]


def test_no_history_and_no_defaults_is_empty(client: TestClient) -> None:
    cat = create_cat(client, target_kcal=200.0)
    assert client.get(f"/api/meals/suggestions?cat_id={cat['id']}").json() == []


def test_suggestions_unknown_cat_404(client: TestClient) -> None:
    assert client.get("/api/meals/suggestions?cat_id=999").status_code == 404
