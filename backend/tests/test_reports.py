"""Report endpoints: today, range, comparison — golden-number aggregation tests.

All amounts trace to a single PER_100G food at 80 kcal/100 g unless noted, so
``quantity`` grams → ``quantity * 0.8`` kcal (e.g. 50 g → 40 kcal). The default
household timezone in tests is UTC, so local days equal UTC days except where a
test sets Europe/Warsaw to exercise DST bucketing.
"""

from datetime import date
from typing import TYPE_CHECKING, Any

from app.services.reports import _trend_pct

from tests.helpers import add_weight, create_cat, create_food, create_meal, set_settings

if TYPE_CHECKING:
    from fastapi.testclient import TestClient

WET_KCAL_PER_100G = 80.0


def test_trend_pct_is_none_when_previous_average_is_zero() -> None:
    # Model invariants (positive quantity, positive kcal_per_basis) make a
    # zero prev_avg with meals present unreachable via the API today, but the
    # function stays defensive rather than dividing by zero if that ever changes.
    assert _trend_pct(current_avg=40.0, prev_avg=0.0, prev_meal_count=3) is None


def _today_for(client: TestClient, cat_id: int) -> dict[str, Any]:
    payload = client.get("/api/reports/today").json()
    return next(c for c in payload["cats"] if c["cat_id"] == cat_id)


# --- today -----------------------------------------------------------------


def test_today_consumed_remaining_and_grams_equivalent(client: TestClient) -> None:
    food = create_food(client, kcal_per_basis=WET_KCAL_PER_100G)
    cat = create_cat(client, target_kcal=200.0, default_wet_food_id=food["id"])
    create_meal(client, cat_id=cat["id"], food_id=food["id"], quantity=50.0)  # 40 kcal

    report = _today_for(client, cat["id"])

    assert report["consumed_kcal"] == 40.0
    assert report["remaining_kcal"] == 160.0
    assert report["over"] is False
    # 160 kcal / (80/100) = 200 g of the default wet food.
    assert report["grams_equivalents"] == [
        {"food_id": food["id"], "food_name": food["name"], "food_type": "WET", "grams": 200.0}
    ]
    # Portion suggestions are off by default.
    assert report["portion_suggestions"] == []


def test_today_over_target_clamps_grams_to_zero(client: TestClient) -> None:
    food = create_food(client, kcal_per_basis=WET_KCAL_PER_100G)
    cat = create_cat(client, target_kcal=200.0, default_wet_food_id=food["id"])
    create_meal(client, cat_id=cat["id"], food_id=food["id"], quantity=300.0)  # 240 kcal

    report = _today_for(client, cat["id"])

    assert report["consumed_kcal"] == 240.0
    assert report["remaining_kcal"] == -40.0
    assert report["over"] is True
    assert report["grams_equivalents"][0]["grams"] == 0.0


def test_today_treats_count_toward_consumed(client: TestClient) -> None:
    wet = create_food(client, kcal_per_basis=WET_KCAL_PER_100G)
    treat = create_food(client, type="TREAT", calorie_basis="PER_PIECE", kcal_per_basis=5.0)
    cat = create_cat(client, target_kcal=200.0, default_wet_food_id=wet["id"])
    create_meal(client, cat_id=cat["id"], food_id=wet["id"], quantity=50.0)  # 40 kcal
    create_meal(client, cat_id=cat["id"], food_id=treat["id"], quantity=2.0)  # 10 kcal

    report = _today_for(client, cat["id"])

    assert report["consumed_kcal"] == 50.0
    assert report["remaining_kcal"] == 150.0


def test_today_portion_suggestion_when_enabled(client: TestClient) -> None:
    food = create_food(client, kcal_per_basis=WET_KCAL_PER_100G)
    cat = create_cat(client, target_kcal=200.0, default_wet_food_id=food["id"])
    set_settings(client, portion_suggestions_enabled=True, meals_per_day=2)

    report = _today_for(client, cat["id"])

    # (200 / 2) kcal per meal / (80/100) = 125 g.
    assert report["portion_suggestions"] == [
        {"food_id": food["id"], "food_name": food["name"], "food_type": "WET", "grams": 125.0}
    ]


def test_today_missing_default_omits_that_type(client: TestClient) -> None:
    dry = create_food(client, name="Kibble", type="DRY", kcal_per_basis=400.0)
    # Only a dry default; no wet default set.
    cat = create_cat(client, target_kcal=200.0, default_dry_food_id=dry["id"])

    report = _today_for(client, cat["id"])

    assert [row["food_type"] for row in report["grams_equivalents"]] == ["DRY"]


def test_today_per_piece_default_has_no_grams_equivalent(client: TestClient) -> None:
    # A per-piece wet default cannot yield grams — it is skipped.
    per_piece_wet = create_food(client, calorie_basis="PER_PIECE", kcal_per_basis=30.0)
    cat = create_cat(client, target_kcal=200.0, default_wet_food_id=per_piece_wet["id"])

    report = _today_for(client, cat["id"])

    assert report["grams_equivalents"] == []


# --- range -----------------------------------------------------------------


def test_range_series_average_and_trend(client: TestClient) -> None:
    food = create_food(client, kcal_per_basis=WET_KCAL_PER_100G)
    cat = create_cat(client, target_kcal=200.0, default_wet_food_id=food["id"])

    # Previous window 2026-07-01..07-07: one 20 kcal meal/day → avg 20.
    for day in range(1, 8):
        create_meal(
            client,
            cat_id=cat["id"],
            food_id=food["id"],
            quantity=25.0,
            fed_at=f"2026-07-{day:02d}T08:00:00Z",
        )
    # Current window 2026-07-08..07-14: one 40 kcal meal/day → avg 40.
    for day in range(8, 15):
        create_meal(
            client,
            cat_id=cat["id"],
            food_id=food["id"],
            quantity=50.0,
            fed_at=f"2026-07-{day:02d}T08:00:00Z",
        )

    body = client.get(
        f"/api/reports/range?cat_id={cat['id']}&start=2026-07-08&end=2026-07-14"
    ).json()

    assert body["target_kcal"] == 200.0
    assert body["avg_kcal_per_day"] == 40.0
    # (40 - 20) / 20 x 100 = 100 %.
    assert body["trend_pct"] == 100.0
    assert [p["date"] for p in body["daily_kcal"]] == [f"2026-07-{d:02d}" for d in range(8, 15)]
    assert all(p["kcal"] == 40.0 for p in body["daily_kcal"])
    # All 7 current meals are 50 g PER_100G wet → portion history.
    assert len(body["portion_history"]) == 7
    assert all(p["grams"] == 50.0 and p["food_type"] == "WET" for p in body["portion_history"])
    # 7 meals, all at 08:00 local.
    matrix = body["timing_pattern"]
    assert sum(sum(row) for row in matrix) == 7
    assert matrix[date(2026, 7, 8).weekday()][8] == 1
    assert body["weight_series"] == []
    assert body["goal_weight_kg"] is None


def test_range_empty_has_zero_series_and_null_trend(client: TestClient) -> None:
    cat = create_cat(client, target_kcal=200.0)

    body = client.get(
        f"/api/reports/range?cat_id={cat['id']}&start=2026-07-01&end=2026-07-03"
    ).json()

    assert body["avg_kcal_per_day"] == 0.0
    assert body["trend_pct"] is None
    assert [p["kcal"] for p in body["daily_kcal"]] == [0.0, 0.0, 0.0]
    assert body["portion_history"] == []
    assert sum(sum(row) for row in body["timing_pattern"]) == 0


def test_range_trend_null_when_no_previous_meals(client: TestClient) -> None:
    food = create_food(client, kcal_per_basis=WET_KCAL_PER_100G)
    cat = create_cat(client, target_kcal=200.0)
    # Meals only in the current window; the preceding week is empty.
    for day in range(8, 15):
        create_meal(
            client,
            cat_id=cat["id"],
            food_id=food["id"],
            quantity=50.0,
            fed_at=f"2026-07-{day:02d}T08:00:00Z",
        )

    body = client.get(
        f"/api/reports/range?cat_id={cat['id']}&start=2026-07-08&end=2026-07-14"
    ).json()

    assert body["avg_kcal_per_day"] == 40.0
    assert body["trend_pct"] is None


def test_range_treats_count_in_kcal_but_not_portion_history(client: TestClient) -> None:
    wet = create_food(client, kcal_per_basis=WET_KCAL_PER_100G)
    treat_piece = create_food(client, type="TREAT", calorie_basis="PER_PIECE", kcal_per_basis=5.0)
    treat_grams = create_food(
        client, name="Crunch", type="TREAT", calorie_basis="PER_100G", kcal_per_basis=350.0
    )
    cat = create_cat(client, target_kcal=200.0)

    create_meal(
        client, cat_id=cat["id"], food_id=wet["id"], quantity=50.0, fed_at="2026-07-02T08:00:00Z"
    )  # 40 kcal, grams chart
    create_meal(
        client,
        cat_id=cat["id"],
        food_id=treat_piece["id"],
        quantity=3.0,
        fed_at="2026-07-02T12:00:00Z",
    )  # 15 kcal, no grams chart
    create_meal(
        client,
        cat_id=cat["id"],
        food_id=treat_grams["id"],
        quantity=10.0,
        fed_at="2026-07-02T18:00:00Z",
    )  # 35 kcal, treat excluded from grams chart

    body = client.get(
        f"/api/reports/range?cat_id={cat['id']}&start=2026-07-01&end=2026-07-03"
    ).json()

    # 40 + 15 + 35 = 90 kcal all counted on 2026-07-02.
    day_two = next(p for p in body["daily_kcal"] if p["date"] == "2026-07-02")
    assert day_two["kcal"] == 90.0
    # Only the wet PER_100G meal appears in portion history.
    assert body["portion_history"] == [
        {"fed_at": "2026-07-02T08:00:00Z", "grams": 50.0, "food_type": "WET"}
    ]
    # But all three meals count in the timing heatmap.
    assert sum(sum(row) for row in body["timing_pattern"]) == 3


def test_range_weight_series_within_range_plus_goal(client: TestClient) -> None:
    cat = create_cat(client, target_kcal=200.0, goal_weight_kg=4.0)
    add_weight(client, cat["id"], 5.0, "2026-06-30")  # before range
    add_weight(client, cat["id"], 4.8, "2026-07-02")  # in range
    add_weight(client, cat["id"], 4.6, "2026-07-05")  # in range
    add_weight(client, cat["id"], 4.4, "2026-07-20")  # after range

    body = client.get(
        f"/api/reports/range?cat_id={cat['id']}&start=2026-07-01&end=2026-07-07"
    ).json()

    assert body["weight_series"] == [
        {"measured_on": "2026-07-02", "weight_kg": 4.8},
        {"measured_on": "2026-07-05", "weight_kg": 4.6},
    ]
    assert body["goal_weight_kg"] == 4.0


def test_range_buckets_by_household_tz_across_dst(client: TestClient) -> None:
    set_settings(client, timezone="Europe/Warsaw")
    food = create_food(client, kcal_per_basis=WET_KCAL_PER_100G)
    cat = create_cat(client, target_kcal=200.0)
    # 22:30Z on 03-28 = 23:30 CET → local day 2026-03-28.
    create_meal(
        client, cat_id=cat["id"], food_id=food["id"], quantity=50.0, fed_at="2026-03-28T22:30:00Z"
    )
    # 23:30Z on 03-28 = 00:30 CET → local day 2026-03-29 (spring-forward day).
    create_meal(
        client, cat_id=cat["id"], food_id=food["id"], quantity=25.0, fed_at="2026-03-28T23:30:00Z"
    )

    body = client.get(
        f"/api/reports/range?cat_id={cat['id']}&start=2026-03-28&end=2026-03-29"
    ).json()

    by_date = {p["date"]: p["kcal"] for p in body["daily_kcal"]}
    assert by_date == {"2026-03-28": 40.0, "2026-03-29": 20.0}


def test_range_unknown_cat_404(client: TestClient) -> None:
    assert (
        client.get("/api/reports/range?cat_id=999&start=2026-07-01&end=2026-07-07").status_code
        == 404
    )


def test_range_end_before_start_400(client: TestClient) -> None:
    cat = create_cat(client)
    resp = client.get(f"/api/reports/range?cat_id={cat['id']}&start=2026-07-07&end=2026-07-01")
    assert resp.status_code == 400


# --- comparison ------------------------------------------------------------


def test_comparison_avg_and_adherence(client: TestClient) -> None:
    food = create_food(client, kcal_per_basis=WET_KCAL_PER_100G)
    under = create_cat(client, name="Under", target_kcal=200.0)
    over = create_cat(client, name="Over", target_kcal=100.0)

    # Under: 100 kcal/day over 2 days → avg 100, adherence 50 %.
    for day in ("2026-07-01", "2026-07-02"):
        create_meal(
            client,
            cat_id=under["id"],
            food_id=food["id"],
            quantity=125.0,
            fed_at=f"{day}T08:00:00Z",
        )
    # Over: 300 kcal across 2 days → avg 150, adherence 150 %.
    for stamp in ("2026-07-01T08:00:00Z", "2026-07-01T18:00:00Z", "2026-07-02T08:00:00Z"):
        create_meal(client, cat_id=over["id"], food_id=food["id"], quantity=125.0, fed_at=stamp)

    body = client.get("/api/reports/comparison?start=2026-07-01&end=2026-07-02").json()
    by_id = {c["cat_id"]: c for c in body["cats"]}

    assert by_id[under["id"]]["avg_kcal_per_day"] == 100.0
    assert by_id[under["id"]]["adherence_pct"] == 50.0
    assert by_id[over["id"]]["avg_kcal_per_day"] == 150.0
    assert by_id[over["id"]]["adherence_pct"] == 150.0


def test_comparison_end_before_start_400(client: TestClient) -> None:
    assert client.get("/api/reports/comparison?start=2026-07-02&end=2026-07-01").status_code == 400
