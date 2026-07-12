"""Cats: CRUD, weight entries (upsert/delete), derived current weight & meal count.

Validation rules (plan "Model invariants"):
- A default wet food must be a non-archived ``WET`` food; default dry a
  non-archived ``DRY`` food.
- ``current_weight_kg`` is the latest weight entry (no weight column on the cat).
- Deleting a cat cascades to its meals and weight entries.
"""

from datetime import date, datetime
from typing import TYPE_CHECKING

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import func, select

from app.config import get_settings
from app.db import SessionDep
from app.models import Cat, Food, FoodType, Meal, WeightEntry
from app.schemas import (
    CatCreate,
    CatResponse,
    CatUpdate,
    WeightCreate,
    WeightResponse,
)
from app.services.settings import get_or_create_settings
from app.services.timezones import resolve_timezone

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

router = APIRouter(tags=["cats"])


def _validate_default_food(session: Session, food_id: int, expected_type: FoodType) -> None:
    food = session.get(Food, food_id)
    if food is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Food {food_id} does not exist")
    if food.archived_at is not None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"Food {food_id} is archived and cannot be a default"
        )
    if food.type is not expected_type:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Default {expected_type.value} food must be a {expected_type.value} food",
        )


def _current_weight(session: Session, cat_id: int) -> float | None:
    return session.scalar(
        select(WeightEntry.weight_kg)
        .where(WeightEntry.cat_id == cat_id)
        .order_by(WeightEntry.measured_on.desc(), WeightEntry.id.desc())
        .limit(1)
    )


def _meal_count(session: Session, cat_id: int) -> int:
    count = session.scalar(select(func.count()).select_from(Meal).where(Meal.cat_id == cat_id))
    return count or 0


def _serialize(session: Session, cat: Cat) -> CatResponse:
    return CatResponse(
        id=cat.id,
        name=cat.name,
        target_kcal=cat.target_kcal,
        goal_weight_kg=cat.goal_weight_kg,
        default_wet_food_id=cat.default_wet_food_id,
        default_dry_food_id=cat.default_dry_food_id,
        current_weight_kg=_current_weight(session, cat.id),
        meal_count=_meal_count(session, cat.id),
    )


def _get_cat_or_404(session: Session, cat_id: int) -> Cat:
    cat = session.get(Cat, cat_id)
    if cat is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Cat {cat_id} not found")
    return cat


@router.get("/cats")
def list_cats(session: SessionDep) -> list[CatResponse]:
    cats = session.scalars(select(Cat).order_by(Cat.id)).all()
    return [_serialize(session, cat) for cat in cats]


@router.post("/cats", status_code=status.HTTP_201_CREATED)
def create_cat(payload: CatCreate, session: SessionDep) -> CatResponse:
    if payload.default_wet_food_id is not None:
        _validate_default_food(session, payload.default_wet_food_id, FoodType.WET)
    if payload.default_dry_food_id is not None:
        _validate_default_food(session, payload.default_dry_food_id, FoodType.DRY)

    cat = Cat(
        name=payload.name,
        target_kcal=payload.target_kcal,
        goal_weight_kg=payload.goal_weight_kg,
        default_wet_food_id=payload.default_wet_food_id,
        default_dry_food_id=payload.default_dry_food_id,
    )
    session.add(cat)
    session.flush()

    if payload.initial_weight_kg is not None:
        tz = resolve_timezone(get_or_create_settings(session, get_settings().app_timezone).timezone)
        today = datetime.now(tz).date()
        session.add(
            WeightEntry(cat_id=cat.id, weight_kg=payload.initial_weight_kg, measured_on=today)
        )

    session.commit()
    session.refresh(cat)
    return _serialize(session, cat)


@router.get("/cats/{cat_id}")
def get_cat(cat_id: int, session: SessionDep) -> CatResponse:
    return _serialize(session, _get_cat_or_404(session, cat_id))


@router.patch("/cats/{cat_id}")
def update_cat(cat_id: int, payload: CatUpdate, session: SessionDep) -> CatResponse:
    cat = _get_cat_or_404(session, cat_id)
    changes = payload.model_dump(exclude_unset=True)

    if changes.get("default_wet_food_id") is not None:
        _validate_default_food(session, changes["default_wet_food_id"], FoodType.WET)
    if changes.get("default_dry_food_id") is not None:
        _validate_default_food(session, changes["default_dry_food_id"], FoodType.DRY)

    for field, value in changes.items():
        setattr(cat, field, value)

    session.commit()
    session.refresh(cat)
    return _serialize(session, cat)


@router.delete("/cats/{cat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cat(cat_id: int, session: SessionDep) -> Response:
    cat = _get_cat_or_404(session, cat_id)
    session.delete(cat)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Weight entries --------------------------------------------------------


@router.get("/cats/{cat_id}/weights")
def list_weights(cat_id: int, session: SessionDep) -> list[WeightResponse]:
    _get_cat_or_404(session, cat_id)
    entries = session.scalars(
        select(WeightEntry).where(WeightEntry.cat_id == cat_id).order_by(WeightEntry.measured_on)
    ).all()
    return [WeightResponse.model_validate(entry) for entry in entries]


@router.post("/cats/{cat_id}/weights", status_code=status.HTTP_201_CREATED)
def upsert_weight(cat_id: int, payload: WeightCreate, session: SessionDep) -> WeightResponse:
    _get_cat_or_404(session, cat_id)
    entry = session.scalar(
        select(WeightEntry).where(
            WeightEntry.cat_id == cat_id, WeightEntry.measured_on == payload.measured_on
        )
    )
    if entry is None:
        entry = WeightEntry(
            cat_id=cat_id, weight_kg=payload.weight_kg, measured_on=payload.measured_on
        )
        session.add(entry)
    else:
        entry.weight_kg = payload.weight_kg

    session.commit()
    session.refresh(entry)
    return WeightResponse.model_validate(entry)


@router.delete("/cats/{cat_id}/weights/{measured_on}", status_code=status.HTTP_204_NO_CONTENT)
def delete_weight(cat_id: int, measured_on: date, session: SessionDep) -> Response:
    _get_cat_or_404(session, cat_id)
    entry = session.scalar(
        select(WeightEntry).where(
            WeightEntry.cat_id == cat_id, WeightEntry.measured_on == measured_on
        )
    )
    if entry is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"No weight entry for cat {cat_id} on {measured_on.isoformat()}",
        )
    session.delete(entry)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
