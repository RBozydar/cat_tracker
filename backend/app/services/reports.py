"""Report aggregation: today, range, comparison. The backend owns this math.

Meals contribute calories from their *snapshot* fields only
(``basis_snapshot``/``kcal_per_basis_snapshot``) so history stays immutable when
a food's kcal or a cat's defaults change later. Day bucketing runs through the
household timezone via ``app.services.timezones`` (DST-safe: 23h/25h days bucket
correctly). The dataset is tiny (≈3 cats), so each function issues a few reads
and aggregates in Python rather than pushing GROUP BY into SQL.
"""

from collections import defaultdict
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import CalorieBasis, Cat, Food, FoodType, Meal, WeightEntry
from app.schemas import (
    CatComparison,
    CatTodayReport,
    ComparisonReport,
    DailyKcalPoint,
    DefaultFoodGrams,
    PortionHistoryPoint,
    RangeReport,
    TodayReport,
    WeightPoint,
)
from app.services.calories import derive_kcal, portion_grams, remaining_to_grams
from app.services.timezones import local_day_bounds, local_range_bounds


def _meal_kcal(meal: Meal) -> float:
    """Kcal from the meal's immutable snapshot (never the live food)."""

    return derive_kcal(meal.basis_snapshot, meal.quantity, meal.kcal_per_basis_snapshot)


def _grams_default(food: Food | None) -> Food | None:
    """A default food usable for grams math, or ``None``.

    Grams only make sense for a present, non-archived ``PER_100G`` food; a
    per-piece default is skipped.
    """

    if food is None or food.archived_at is not None:
        return None
    if food.calorie_basis is not CalorieBasis.PER_100G:
        return None
    return food


def _grams_row(food: Food, grams: float) -> DefaultFoodGrams:
    return DefaultFoodGrams(food_id=food.id, food_name=food.name, food_type=food.type, grams=grams)


def build_today_report(
    session: Session,
    tz: ZoneInfo,
    *,
    portion_suggestions_enabled: bool,
    meals_per_day: int,
) -> TodayReport:
    """All cats' calorie standing for the current household-local day."""

    today = datetime.now(tz).date()
    start_utc, end_utc = local_day_bounds(today, tz)

    cats = session.scalars(select(Cat).order_by(Cat.id)).all()
    foods = {food.id: food for food in session.scalars(select(Food))}
    meals = session.scalars(
        select(Meal).where(Meal.fed_at >= start_utc, Meal.fed_at < end_utc)
    ).all()

    consumed: dict[int, float] = defaultdict(float)
    for meal in meals:
        consumed[meal.cat_id] += _meal_kcal(meal)

    cat_reports: list[CatTodayReport] = []
    for cat in cats:
        eaten = consumed.get(cat.id, 0.0)
        remaining = cat.target_kcal - eaten

        grams_equivalents: list[DefaultFoodGrams] = []
        portion_suggestions: list[DefaultFoodGrams] = []
        for default_id in (cat.default_wet_food_id, cat.default_dry_food_id):
            if default_id is None:
                continue
            food = _grams_default(foods.get(default_id))
            if food is None:
                continue
            grams_equivalents.append(
                _grams_row(food, remaining_to_grams(remaining, food.kcal_per_basis))
            )
            if portion_suggestions_enabled:
                portion_suggestions.append(
                    _grams_row(
                        food, portion_grams(cat.target_kcal, meals_per_day, food.kcal_per_basis)
                    )
                )

        cat_reports.append(
            CatTodayReport(
                cat_id=cat.id,
                cat_name=cat.name,
                target_kcal=cat.target_kcal,
                consumed_kcal=eaten,
                remaining_kcal=remaining,
                over=remaining < 0,
                grams_equivalents=grams_equivalents,
                portion_suggestions=portion_suggestions,
            )
        )

    return TodayReport(date=today, timezone=tz.key, cats=cat_reports)


def _trend_pct(current_avg: float, prev_avg: float, prev_meal_count: int) -> float | None:
    """Percent change of the current average vs the previous window's average.

    ``None`` when the previous window had no meals, or (defensively — meals
    always carry a positive kcal today) its average is zero: either way the
    percent-change comparison is meaningless and the UI renders "—".
    """

    if prev_meal_count == 0 or prev_avg == 0:
        return None
    return (current_avg - prev_avg) / prev_avg * 100


def build_range_report(
    session: Session, cat: Cat, start: date, end: date, tz: ZoneInfo
) -> RangeReport:
    """One cat's full History payload for the local-date window ``[start, end]``."""

    num_days = (end - start).days + 1
    prev_start = start - timedelta(days=num_days)
    prev_end = start - timedelta(days=1)

    range_start_utc, range_end_utc = local_range_bounds(start, end, tz)
    prev_start_utc, _ = local_day_bounds(prev_start, tz)

    # One fetch covers both the current and preceding windows (contiguous in UTC).
    meals = session.scalars(
        select(Meal)
        .options(joinedload(Meal.food))
        .where(
            Meal.cat_id == cat.id,
            Meal.fed_at >= prev_start_utc,
            Meal.fed_at < range_end_utc,
        )
        .order_by(Meal.fed_at)
    ).all()

    daily: dict[date, float] = {start + timedelta(days=i): 0.0 for i in range(num_days)}
    timing = [[0] * 24 for _ in range(7)]
    portion_history: list[PortionHistoryPoint] = []
    current_total = 0.0
    prev_total = 0.0
    prev_meal_count = 0

    for meal in meals:
        local_dt = meal.fed_at.astimezone(tz)
        local_date = local_dt.date()
        kcal = _meal_kcal(meal)

        if start <= local_date <= end:
            daily[local_date] += kcal
            current_total += kcal
            timing[local_dt.weekday()][local_dt.hour] += 1
            if meal.basis_snapshot is CalorieBasis.PER_100G and meal.food.type in (
                FoodType.WET,
                FoodType.DRY,
            ):
                portion_history.append(
                    PortionHistoryPoint(
                        fed_at=meal.fed_at, grams=meal.quantity, food_type=meal.food.type
                    )
                )
        elif prev_start <= local_date <= prev_end:  # the fetch admits nothing else
            prev_total += kcal
            prev_meal_count += 1

    avg = current_total / num_days
    trend = _trend_pct(avg, prev_total / num_days, prev_meal_count)

    weights = session.scalars(
        select(WeightEntry)
        .where(
            WeightEntry.cat_id == cat.id,
            WeightEntry.measured_on >= start,
            WeightEntry.measured_on <= end,
        )
        .order_by(WeightEntry.measured_on)
    ).all()

    return RangeReport(
        cat_id=cat.id,
        cat_name=cat.name,
        start=start,
        end=end,
        timezone=tz.key,
        target_kcal=cat.target_kcal,
        daily_kcal=[DailyKcalPoint(date=day, kcal=kcal) for day, kcal in sorted(daily.items())],
        avg_kcal_per_day=avg,
        trend_pct=trend,
        timing_pattern=timing,
        portion_history=portion_history,
        weight_series=[
            WeightPoint(measured_on=w.measured_on, weight_kg=w.weight_kg) for w in weights
        ],
        goal_weight_kg=cat.goal_weight_kg,
    )


def build_comparison_report(
    session: Session, start: date, end: date, tz: ZoneInfo
) -> ComparisonReport:
    """Per-cat average intake vs target over a shared local-date window."""

    num_days = (end - start).days + 1
    start_utc, end_utc = local_range_bounds(start, end, tz)

    cats = session.scalars(select(Cat).order_by(Cat.id)).all()
    meals = session.scalars(
        select(Meal).where(Meal.fed_at >= start_utc, Meal.fed_at < end_utc)
    ).all()

    totals: dict[int, float] = defaultdict(float)
    for meal in meals:
        totals[meal.cat_id] += _meal_kcal(meal)

    comparisons: list[CatComparison] = []
    for cat in cats:
        avg = totals.get(cat.id, 0.0) / num_days
        comparisons.append(
            CatComparison(
                cat_id=cat.id,
                cat_name=cat.name,
                avg_kcal_per_day=avg,
                target_kcal=cat.target_kcal,
                adherence_pct=avg / cat.target_kcal * 100,
            )
        )
    return ComparisonReport(start=start, end=end, timezone=tz.key, cats=comparisons)
