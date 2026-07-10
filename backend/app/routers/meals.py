"""Meals: snapshot-on-log, snapshot-on-content-edit, local-date filtering.

- ``POST`` copies ``basis``/``kcal_per_basis`` from the food at log time.
- ``PATCH`` re-copies them only when ``food_id`` or ``quantity`` changes; a
  date/time-only edit keeps the original snapshot (history stays immutable).
- ``GET`` ``start``/``end`` are **local dates** in the household timezone; the
  backend converts them to UTC instants. ``limit`` bounds a newest-first list.
- Responses always carry derived ``kcal`` and the food ``name``.
"""

from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.db import SessionDep
from app.models import Cat, Food, Meal
from app.schemas import MealCreate, MealResponse, MealUpdate
from app.services.calories import derive_kcal
from app.services.settings import get_or_create_settings
from app.services.timezones import local_day_bounds, resolve_timezone

router = APIRouter(tags=["meals"])


def _serialize(meal: Meal) -> MealResponse:
    return MealResponse(
        id=meal.id,
        cat_id=meal.cat_id,
        food_id=meal.food_id,
        food_name=meal.food.name,
        quantity=meal.quantity,
        basis=meal.basis_snapshot,
        kcal_per_basis=meal.kcal_per_basis_snapshot,
        kcal=derive_kcal(meal.basis_snapshot, meal.quantity, meal.kcal_per_basis_snapshot),
        fed_at=meal.fed_at,
    )


def _require_cat(session: Session, cat_id: int) -> None:
    if session.get(Cat, cat_id) is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Cat {cat_id} does not exist")


def _loggable_food(session: Session, food_id: int) -> Food:
    food = session.get(Food, food_id)
    if food is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Food {food_id} does not exist")
    if food.archived_at is not None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"Food {food_id} is archived and cannot be logged"
        )
    return food


def _get_meal_or_404(session: Session, meal_id: int) -> Meal:
    meal = session.get(Meal, meal_id)
    if meal is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Meal {meal_id} not found")
    return meal


@router.get("/meals")
def list_meals(
    session: SessionDep,
    cat_id: Annotated[int | None, Query()] = None,
    start: Annotated[date | None, Query()] = None,
    end: Annotated[date | None, Query()] = None,
    limit: Annotated[int | None, Query(ge=1)] = None,
) -> list[MealResponse]:
    stmt = select(Meal).options(joinedload(Meal.food))

    if cat_id is not None:
        stmt = stmt.where(Meal.cat_id == cat_id)

    if start is not None or end is not None:
        tz = resolve_timezone(get_or_create_settings(session, get_settings().app_timezone).timezone)
        if start is not None:
            start_utc, _ = local_day_bounds(start, tz)
            stmt = stmt.where(Meal.fed_at >= start_utc)
        if end is not None:
            _, end_utc = local_day_bounds(end, tz)
            stmt = stmt.where(Meal.fed_at < end_utc)

    stmt = stmt.order_by(Meal.fed_at.desc(), Meal.id.desc())
    if limit is not None:
        stmt = stmt.limit(limit)

    meals = session.scalars(stmt).all()
    return [_serialize(meal) for meal in meals]


@router.post("/meals", status_code=status.HTTP_201_CREATED)
def create_meal(payload: MealCreate, session: SessionDep) -> MealResponse:
    _require_cat(session, payload.cat_id)
    food = _loggable_food(session, payload.food_id)

    meal = Meal(
        cat_id=payload.cat_id,
        food_id=payload.food_id,
        quantity=payload.quantity,
        basis_snapshot=food.calorie_basis,
        kcal_per_basis_snapshot=food.kcal_per_basis,
        fed_at=payload.fed_at or datetime.now(UTC),
    )
    session.add(meal)
    session.commit()
    session.refresh(meal)
    return _serialize(meal)


@router.patch("/meals/{meal_id}")
def update_meal(meal_id: int, payload: MealUpdate, session: SessionDep) -> MealResponse:
    meal = _get_meal_or_404(session, meal_id)
    changes = payload.model_dump(exclude_unset=True)

    if changes.get("cat_id") is not None:
        _require_cat(session, changes["cat_id"])
        meal.cat_id = changes["cat_id"]

    food_changed = "food_id" in changes and changes["food_id"] != meal.food_id
    quantity_changed = "quantity" in changes and changes["quantity"] != meal.quantity

    if food_changed or quantity_changed:
        # Re-snapshot from the food at its current values (the plan's snapshot rule).
        if food_changed:
            food = _loggable_food(session, changes["food_id"])
            meal.food_id = food.id
        else:
            food = meal.food
        if quantity_changed:
            meal.quantity = changes["quantity"]
        meal.basis_snapshot = food.calorie_basis
        meal.kcal_per_basis_snapshot = food.kcal_per_basis

    if changes.get("fed_at") is not None:
        meal.fed_at = changes["fed_at"]

    session.commit()
    session.refresh(meal)
    return _serialize(meal)


@router.delete("/meals/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal(meal_id: int, session: SessionDep) -> Response:
    meal = _get_meal_or_404(session, meal_id)
    session.delete(meal)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
