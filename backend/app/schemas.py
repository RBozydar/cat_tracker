"""Pydantic request/response schemas.

Response models carry every number the frontend displays (meal ``kcal`` and
``food_name`` are derived server-side). Update models default all fields to
unset so ``PATCH`` can distinguish "leave unchanged" from "set to null"; routers
apply them with ``model_dump(exclude_unset=True)``.
"""

from datetime import date, datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

from app.models import CalorieBasis, FoodType

PositiveFloat = Annotated[float, Field(gt=0)]
OptionalPositiveFloat = Annotated[float | None, Field(gt=0)]
NonEmptyStr = Annotated[str, Field(min_length=1)]


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
    goal_weight_kg: OptionalPositiveFloat = None
    default_wet_food_id: int | None = None
    default_dry_food_id: int | None = None


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
