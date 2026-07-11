"""Fast re-log suggestions: recent (food, quantity) combos, with a portion fallback.

Groups a cat's last 14 days of meals by ``(food_id, quantity)``, ranks them by
frequency then recency, and proposes the top few as one-tap chips — plus the
single most recent combo if it did not already rank. Archived foods are
excluded because logging them would 400. With no usable history, falls back to
the cat's default foods at their portion-suggestion grams.

Suggestions are *proposals* priced at each food's current values (a fresh log
snapshots anew), never historical meal snapshots. The rolling window is 14x24h
from now (UTC): a recency heuristic, not a report boundary, so it deliberately
does not use local-date bucketing.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import CalorieBasis, Cat, Food, Meal
from app.schemas import MealSuggestion
from app.services.calories import derive_kcal, portion_grams

HISTORY_DAYS = 14
TOP_N = 3


@dataclass
class _Combo:
    food: Food
    quantity: float
    count: int
    recency: datetime


def _suggestion(food: Food, quantity: float) -> MealSuggestion:
    return MealSuggestion(
        food_id=food.id,
        food_name=food.name,
        food_type=food.type,
        quantity=quantity,
        basis=food.calorie_basis,
        kcal=derive_kcal(food.calorie_basis, quantity, food.kcal_per_basis),
    )


def build_meal_suggestions(session: Session, cat: Cat, meals_per_day: int) -> list[MealSuggestion]:
    """Ranked re-log chips for a cat, falling back to default-food portions."""

    cutoff = datetime.now(UTC) - timedelta(days=HISTORY_DAYS)
    meals = session.scalars(
        select(Meal)
        .options(joinedload(Meal.food))
        .where(Meal.cat_id == cat.id, Meal.fed_at >= cutoff)
        .order_by(Meal.fed_at.desc())
    ).all()
    # Newest-first; drop meals whose food is archived (they cannot be re-logged)
    # or whose calorie basis changed since the meal was logged — the historical
    # quantity's unit (grams vs. pieces) would otherwise be silently reinterpreted
    # under the food's current basis.
    usable = [
        meal
        for meal in meals
        if meal.food.archived_at is None and meal.basis_snapshot == meal.food.calorie_basis
    ]

    if not usable:
        return _fallback_suggestions(session, cat, meals_per_day)

    # Group by (food, quantity). Iterating newest-first, the first sighting of a
    # key carries its most-recent fed_at.
    combos: dict[tuple[int, float], _Combo] = {}
    for meal in usable:
        key = (meal.food_id, meal.quantity)
        combo = combos.get(key)
        if combo is None:
            combos[key] = _Combo(meal.food, meal.quantity, 1, meal.fed_at)
        else:
            combo.count += 1

    ranked = sorted(combos.values(), key=lambda c: (c.count, c.recency), reverse=True)
    chosen = ranked[:TOP_N]

    # Append the single most recent combo when it did not already rank.
    chosen_keys = {(c.food.id, c.quantity) for c in chosen}
    most_recent = usable[0]
    most_recent_key = (most_recent.food_id, most_recent.quantity)
    if most_recent_key not in chosen_keys:
        chosen.append(combos[most_recent_key])

    return [_suggestion(combo.food, combo.quantity) for combo in chosen]


def _fallback_suggestions(session: Session, cat: Cat, meals_per_day: int) -> list[MealSuggestion]:
    """Default wet/dry foods at their portion-suggestion grams (no usable history)."""

    suggestions: list[MealSuggestion] = []
    for default_id in (cat.default_wet_food_id, cat.default_dry_food_id):
        if default_id is None:
            continue
        food = session.get(Food, default_id)
        if food is None or food.archived_at is not None:
            continue
        if food.calorie_basis is not CalorieBasis.PER_100G:
            continue
        grams = portion_grams(cat.target_kcal, meals_per_day, food.kcal_per_basis)
        suggestions.append(_suggestion(food, grams))
    return suggestions
