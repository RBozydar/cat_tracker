"""Pydantic request/response schemas.

Response models carry every number the frontend displays (meal ``kcal`` and
``food_name`` are derived server-side). Update models default all fields to
unset so ``PATCH`` can distinguish "leave unchanged" from "set to null"; routers
apply them with ``model_dump(exclude_unset=True)``.
"""

from datetime import date, datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models import CalorieBasis, FoodType

PositiveFloat = Annotated[float, Field(gt=0)]
OptionalPositiveFloat = Annotated[float | None, Field(gt=0)]
NonEmptyStr = Annotated[str, Field(min_length=1)]


def _reject_explicit_nulls(model: BaseModel, fields: tuple[str, ...]) -> None:
    """Raise for any of ``fields`` sent as JSON ``null`` in a PATCH payload.

    These fields are typed ``X | None`` only so ``model_dump(exclude_unset=True)``
    can tell "omitted" (leave unchanged) from "provided"; the columns behind
    them are NOT NULL, so an explicit ``null`` is a bad request, not a valid
    "clear this field" — left unchecked it reaches SQLAlchemy as an
    IntegrityError (500) instead of a 422.
    """

    nulled = sorted(f for f in fields if f in model.model_fields_set and getattr(model, f) is None)
    if nulled:
        raise ValueError(f"{', '.join(nulled)} must not be null")


# --- Foods -----------------------------------------------------------------


class FoodCreate(BaseModel):
    name: NonEmptyStr
    type: FoodType
    calorie_basis: CalorieBasis
    kcal_per_basis: PositiveFloat


class FoodUpdate(BaseModel):
    name: NonEmptyStr | None = None
    calorie_basis: CalorieBasis | None = None
    kcal_per_basis: OptionalPositiveFloat = None
    # Accepted only to reject changes explicitly (type is immutable → 400).
    type: FoodType | None = None

    @model_validator(mode="after")
    def _no_explicit_nulls(self) -> FoodUpdate:
        _reject_explicit_nulls(self, ("name", "calorie_basis", "kcal_per_basis"))
        return self


class FoodResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: FoodType
    calorie_basis: CalorieBasis
    kcal_per_basis: float
    archived_at: datetime | None


class FoodDeleteResult(BaseModel):
    """Outcome of ``DELETE /foods/{id}``.

    ``archived`` is true when meals referenced the food (soft-deleted, ``food``
    populated); false when it was hard-deleted (``food`` null).
    ``cleared_default_for_cat_ids`` lets the UI warn which cats lost a default.
    """

    archived: bool
    food: FoodResponse | None
    cleared_default_for_cat_ids: list[int]


# --- Weights ---------------------------------------------------------------


class WeightCreate(BaseModel):
    weight_kg: PositiveFloat
    measured_on: date


class WeightResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cat_id: int
    weight_kg: float
    measured_on: date


# --- Cats ------------------------------------------------------------------


class CatCreate(BaseModel):
    name: NonEmptyStr
    target_kcal: PositiveFloat
    goal_weight_kg: OptionalPositiveFloat = None
    default_wet_food_id: int | None = None
    default_dry_food_id: int | None = None
    # Optional first weigh-in, created in the same transaction as the cat.
    initial_weight_kg: OptionalPositiveFloat = None


class CatUpdate(BaseModel):
    name: NonEmptyStr | None = None
    target_kcal: OptionalPositiveFloat = None
    # goal_weight_kg is genuinely nullable (a trim cat has no goal) — explicit
    # null here means "clear the goal", so it's intentionally not rejected.
    goal_weight_kg: OptionalPositiveFloat = None
    default_wet_food_id: int | None = None
    default_dry_food_id: int | None = None

    @model_validator(mode="after")
    def _no_explicit_nulls(self) -> CatUpdate:
        _reject_explicit_nulls(self, ("name", "target_kcal"))
        return self


class CatResponse(BaseModel):
    id: int
    name: str
    target_kcal: float
    goal_weight_kg: float | None
    default_wet_food_id: int | None
    default_dry_food_id: int | None
    current_weight_kg: float | None
    meal_count: int


# --- Meals -----------------------------------------------------------------


class MealCreate(BaseModel):
    cat_id: int
    food_id: int
    quantity: PositiveFloat
    # Optional; defaults to now (UTC). A UTC instant — see the time convention.
    fed_at: datetime | None = None


class MealUpdate(BaseModel):
    cat_id: int | None = None
    food_id: int | None = None
    quantity: OptionalPositiveFloat = None
    fed_at: datetime | None = None

    @model_validator(mode="after")
    def _no_explicit_nulls(self) -> MealUpdate:
        _reject_explicit_nulls(self, ("cat_id", "food_id", "quantity", "fed_at"))
        return self


class MealResponse(BaseModel):
    id: int
    cat_id: int
    food_id: int
    food_name: str
    quantity: float
    basis: CalorieBasis
    kcal_per_basis: float
    kcal: float
    fed_at: datetime


# --- Settings --------------------------------------------------------------


class SettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    timezone: str
    portion_suggestions_enabled: bool
    meals_per_day: int


class SettingsUpdate(BaseModel):
    timezone: NonEmptyStr
    portion_suggestions_enabled: bool
    meals_per_day: Annotated[int, Field(ge=1)]


# --- Reports: today --------------------------------------------------------


class DefaultFoodGrams(BaseModel):
    """A grams figure tied to one of a cat's default foods.

    Used for both the remaining-kcal grams-equivalent and the per-meal portion
    suggestion. Only produced for non-archived ``PER_100G`` default foods
    (grams are meaningless for per-piece foods). ``food_type`` is ``WET`` or
    ``DRY`` — it says which default the figure belongs to.
    """

    food_id: int
    food_name: str
    food_type: FoodType
    grams: float


class CatTodayReport(BaseModel):
    """One cat's calorie standing for the current household-local day."""

    cat_id: int
    cat_name: str
    target_kcal: float
    consumed_kcal: float
    # target − consumed; negative when the cat is over target.
    remaining_kcal: float
    over: bool
    # Grams of each default food equal to ``max(remaining, 0)`` kcal (clamped).
    grams_equivalents: list[DefaultFoodGrams]
    # Per-meal portion in grams; empty unless portion suggestions are enabled.
    portion_suggestions: list[DefaultFoodGrams]


class TodayReport(BaseModel):
    # The household-local calendar day these figures cover.
    date: date
    timezone: str
    cats: list[CatTodayReport]


# --- Reports: range --------------------------------------------------------


class DailyKcalPoint(BaseModel):
    """Consumed kcal for one household-local day (zero-filled across the range)."""

    date: date
    kcal: float


class PortionHistoryPoint(BaseModel):
    """A single grams-measured meal for the portion-history chart.

    Only ``PER_100G`` ``WET``/``DRY`` meals appear here; treats and per-piece
    meals are excluded (pieces are not grams) though they still count in all
    kcal totals.
    """

    fed_at: datetime
    grams: float
    food_type: FoodType


class WeightPoint(BaseModel):
    measured_on: date
    weight_kg: float


class RangeReport(BaseModel):
    """Everything the History page needs for one cat in one round trip."""

    cat_id: int
    cat_name: str
    start: date
    end: date
    timezone: str
    target_kcal: float
    daily_kcal: list[DailyKcalPoint]
    avg_kcal_per_day: float
    # Percent change of this window's average vs the immediately preceding
    # window of equal length; null when that previous window has no meals.
    trend_pct: float | None
    # 7×24 meal-count matrix indexed [weekday][hour]; weekday 0 = Monday
    # (Python ``date.weekday()``), hour 0–23 in household-local time.
    timing_pattern: list[list[int]]
    portion_history: list[PortionHistoryPoint]
    weight_series: list[WeightPoint]
    goal_weight_kg: float | None


# --- Reports: comparison ---------------------------------------------------


class CatComparison(BaseModel):
    cat_id: int
    cat_name: str
    avg_kcal_per_day: float
    target_kcal: float
    # avg_kcal_per_day / target_kcal × 100; exceeds 100 when over target.
    adherence_pct: float


class ComparisonReport(BaseModel):
    start: date
    end: date
    timezone: str
    cats: list[CatComparison]


# --- Target-calorie calculator ---------------------------------------------


class TargetBasis(StrEnum):
    """Which weight the RER is computed from."""

    GOAL_WEIGHT = "GOAL_WEIGHT"
    CURRENT_WEIGHT = "CURRENT_WEIGHT"


class TargetSuggestionResponse(BaseModel):
    """RER/MER breakdown for the calculator dialog (always a suggestion).

    ``rer_kcal = 70 × basis_weight ** 0.75`` where the basis weight is the goal
    weight (factor 0.8, weight loss) when a goal is set, otherwise the current
    weight (factor 1.2, neutered-adult maintenance).
    ``suggested_target_kcal = rer_kcal × factor``.
    """

    cat_id: int
    current_weight_kg: float | None
    goal_weight_kg: float | None
    rer_kcal: float
    factor: float
    basis: TargetBasis
    suggested_target_kcal: float


# --- Fast re-log suggestions -----------------------------------------------


class MealSuggestion(BaseModel):
    """A proposed one-tap meal to re-log.

    ``kcal`` is derived at the food's *current* values (a proposal, not a
    historical snapshot); logging it creates a fresh snapshot.
    """

    food_id: int
    food_name: str
    food_type: FoodType
    quantity: float
    basis: CalorieBasis
    kcal: float
