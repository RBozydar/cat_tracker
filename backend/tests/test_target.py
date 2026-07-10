"""Target-calorie calculator: RER/MER math (golden numbers) and the endpoint.

Golden RER values are hand-computed as ``70 × kg ** 0.75``:
- 4.0 kg → 4 ** 0.75 = 2 ** 1.5 = 2.8284271247461903 → RER 197.98989873223333
- 5.0 kg → 5 ** 0.75 = 3.3437015248821105 → RER 234.05910674174773
"""

import pytest
from app.schemas import TargetBasis
from app.services.target import InsufficientWeightData, compute_target_suggestion
from fastapi.testclient import TestClient

from tests.helpers import add_weight, create_cat

RER_4KG = 197.98989873223333
RER_5KG = 234.05910674174773


def test_goal_weight_branch_uses_goal_and_0_8_factor() -> None:
    result = compute_target_suggestion(cat_id=1, goal_weight_kg=4.0, current_weight_kg=5.0)

    assert result.basis is TargetBasis.GOAL_WEIGHT
    assert result.factor == 0.8
    # RER is computed on the GOAL weight (4 kg), not the current weight.
    assert result.rer_kcal == pytest.approx(RER_4KG)
    assert result.suggested_target_kcal == pytest.approx(RER_4KG * 0.8)
    # Both inputs are echoed regardless of which drove the calculation.
    assert result.goal_weight_kg == 4.0
    assert result.current_weight_kg == 5.0


def test_current_weight_branch_uses_current_and_1_2_factor() -> None:
    result = compute_target_suggestion(cat_id=1, goal_weight_kg=None, current_weight_kg=5.0)

    assert result.basis is TargetBasis.CURRENT_WEIGHT
    assert result.factor == 1.2
    assert result.rer_kcal == pytest.approx(RER_5KG)
    assert result.suggested_target_kcal == pytest.approx(RER_5KG * 1.2)
    assert result.goal_weight_kg is None


def test_goal_weight_wins_even_without_a_weigh_in() -> None:
    result = compute_target_suggestion(cat_id=1, goal_weight_kg=4.0, current_weight_kg=None)

    assert result.basis is TargetBasis.GOAL_WEIGHT
    assert result.rer_kcal == pytest.approx(RER_4KG)


def test_neither_goal_nor_current_raises() -> None:
    with pytest.raises(InsufficientWeightData):
        compute_target_suggestion(cat_id=1, goal_weight_kg=None, current_weight_kg=None)


def test_endpoint_goal_basis(client: TestClient) -> None:
    cat = create_cat(client, target_kcal=200.0, goal_weight_kg=4.0)

    body = client.get(f"/api/target-suggestion?cat_id={cat['id']}").json()

    assert body["basis"] == "GOAL_WEIGHT"
    assert body["factor"] == 0.8
    assert body["rer_kcal"] == pytest.approx(RER_4KG)
    assert body["suggested_target_kcal"] == pytest.approx(RER_4KG * 0.8)
    assert body["goal_weight_kg"] == 4.0
    assert body["current_weight_kg"] is None


def test_endpoint_current_basis(client: TestClient) -> None:
    cat = create_cat(client, target_kcal=200.0)  # no goal weight
    add_weight(client, cat["id"], 5.0, "2026-07-01")

    body = client.get(f"/api/target-suggestion?cat_id={cat['id']}").json()

    assert body["basis"] == "CURRENT_WEIGHT"
    assert body["current_weight_kg"] == 5.0
    assert body["rer_kcal"] == pytest.approx(RER_5KG)
    assert body["suggested_target_kcal"] == pytest.approx(RER_5KG * 1.2)


def test_endpoint_uses_latest_weigh_in(client: TestClient) -> None:
    cat = create_cat(client, target_kcal=200.0)
    add_weight(client, cat["id"], 6.0, "2026-06-01")
    add_weight(client, cat["id"], 5.0, "2026-07-01")  # latest

    body = client.get(f"/api/target-suggestion?cat_id={cat['id']}").json()

    assert body["current_weight_kg"] == 5.0
    assert body["rer_kcal"] == pytest.approx(RER_5KG)


def test_endpoint_unknown_cat_404(client: TestClient) -> None:
    assert client.get("/api/target-suggestion?cat_id=999").status_code == 404


def test_endpoint_no_goal_no_weight_400(client: TestClient) -> None:
    cat = create_cat(client, target_kcal=200.0)  # no goal, no weigh-in
    assert client.get(f"/api/target-suggestion?cat_id={cat['id']}").status_code == 400
