"""Golden-number tests for the pure calorie math."""

import pytest
from app.models import CalorieBasis
from app.services.calories import derive_kcal, portion_grams, remaining_to_grams


@pytest.mark.parametrize(
    ("basis", "quantity", "kcal_per_basis", "expected"),
    [
        # PER_100G: 50 g of an 80 kcal/100g food = 40 kcal.
        (CalorieBasis.PER_100G, 50.0, 80.0, 40.0),
        # PER_100G: 125 g of a 352 kcal/100g dry food = 440 kcal.
        (CalorieBasis.PER_100G, 125.0, 352.0, 440.0),
        # PER_PIECE: 3 pieces at 2 kcal each = 6 kcal.
        (CalorieBasis.PER_PIECE, 3.0, 2.0, 6.0),
        (CalorieBasis.PER_PIECE, 1.0, 5.0, 5.0),
    ],
)
def test_derive_kcal(
    basis: CalorieBasis, quantity: float, kcal_per_basis: float, expected: float
) -> None:
    assert derive_kcal(basis, quantity, kcal_per_basis) == expected


def test_remaining_to_grams_positive() -> None:
    # 100 kcal remaining of an 80 kcal/100g food = 125 g.
    assert remaining_to_grams(100.0, 80.0) == 125.0


@pytest.mark.parametrize("remaining", [0.0, -20.0, -1.0])
def test_remaining_to_grams_clamps_at_zero(remaining: float) -> None:
    assert remaining_to_grams(remaining, 80.0) == 0.0


@pytest.mark.parametrize(
    ("target", "meals_per_day", "kcal_per_100g", "expected"),
    [
        # 200 kcal/day over 2 meals = 100 kcal/meal = 125 g of an 80 kcal/100g food.
        (200.0, 2, 80.0, 125.0),
        (300.0, 3, 100.0, 100.0),
    ],
)
def test_portion_grams(
    target: float, meals_per_day: int, kcal_per_100g: float, expected: float
) -> None:
    assert portion_grams(target, meals_per_day, kcal_per_100g) == expected
