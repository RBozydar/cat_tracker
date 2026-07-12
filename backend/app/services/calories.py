"""Pure calorie math — no ORM, no I/O, exhaustively unit-tested.

The frontend renders numbers; every one of them is computed here or in the
report services that build on these functions. All quantities are metric:
grams for ``PER_100G`` foods, pieces for ``PER_PIECE`` foods, kcal for energy.
"""

from app.models import CalorieBasis


def derive_kcal(basis: CalorieBasis, quantity: float, kcal_per_basis: float) -> float:
    """Kcal for a quantity of food under a calorie basis.

    ``PER_100G`` → ``quantity / 100 * kcal_per_basis`` (quantity in grams);
    ``PER_PIECE`` → ``quantity * kcal_per_basis`` (quantity in pieces).

    Meals always pass their *snapshot* basis and kcal, never the live food, so
    editing a food never changes historical meal calories.
    """

    if basis == CalorieBasis.PER_100G:
        return quantity / 100 * kcal_per_basis
    return quantity * kcal_per_basis


def remaining_to_grams(remaining_kcal: float, kcal_per_100g: float) -> float:
    """Grams of a ``PER_100G`` food equivalent to the remaining kcal.

    Clamped at 0: an over-target cat has no positive grams-equivalent. Only
    meaningful for ``PER_100G`` foods (grams); callers must not pass a per-piece
    food here.
    """

    if remaining_kcal <= 0:
        return 0.0
    return remaining_kcal / (kcal_per_100g / 100)


def portion_grams(target_kcal: float, meals_per_day: int, kcal_per_100g: float) -> float:
    """Suggested grams of a ``PER_100G`` food for one meal.

    ``(target_kcal / meals_per_day)`` kcal per meal, converted to grams.
    """

    per_meal_kcal = target_kcal / meals_per_day
    return per_meal_kcal / (kcal_per_100g / 100)
