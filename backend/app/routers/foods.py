"""Foods: CRUD with type immutability and archive-on-delete.

- ``type`` is immutable after creation (changing it would corrupt default-food
  semantics) → 400 on any attempt. ``calorie_basis``/``kcal_per_basis`` are
  editable; meal snapshots protect history.
- ``DELETE`` hard-deletes a food only if no meal references it; otherwise it is
  archived. Either way the food is cleared from any cat defaults referencing it.
"""

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.db import SessionDep
from app.models import Cat, Food, FoodType, Meal
from app.schemas import (
    FoodCreate,
    FoodDeleteResult,
    FoodMutationResult,
    FoodResponse,
    FoodUpdate,
)

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

router = APIRouter(tags=["foods"])


def _get_food_or_404(session: Session, food_id: int) -> Food:
    food = session.get(Food, food_id)
    if food is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Food {food_id} not found")
    return food


def ensure_food_not_archived(food: Food) -> None:
    """Shared 400 guard: an archived food can never become a cat's default.

    Used here and by ``cats._validate_default_food`` so the bulk (set-for-all)
    and per-cat default paths can't drift out of sync on this rule.
    """

    if food.archived_at is not None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Food {food.id} is archived and cannot be a default",
        )


def _apply_default_for_all_cats(session: Session, food: Food) -> int:
    """Point every cat's matching (wet/dry) default at ``food``; return the count.

    Only valid for a non-archived WET/DRY food — mirrors the per-cat default
    validation (``cats._validate_default_food``); a TREAT or archived food → 400.
    Existing meals are untouched: their calories come from the snapshot taken at
    log time, so re-pointing a default never rewrites history.
    """

    if food.type is FoodType.TREAT:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "A treat cannot be set as a default wet/dry food",
        )
    ensure_food_not_archived(food)

    cats = session.scalars(select(Cat)).all()
    for cat in cats:
        if food.type is FoodType.WET:
            cat.default_wet_food_id = food.id
        else:
            cat.default_dry_food_id = food.id
    return len(cats)


def _clear_from_defaults(session: Session, food_id: int) -> list[int]:
    """Null out this food from every cat default that references it; return cat ids."""

    cats = session.scalars(
        select(Cat).where(
            (Cat.default_wet_food_id == food_id) | (Cat.default_dry_food_id == food_id)
        )
    ).all()
    for cat in cats:
        if cat.default_wet_food_id == food_id:
            cat.default_wet_food_id = None
        if cat.default_dry_food_id == food_id:
            cat.default_dry_food_id = None
    return [cat.id for cat in cats]


@router.get("/foods")
def list_foods(
    session: SessionDep,
    include_archived: Annotated[bool, Query()] = False,
) -> list[FoodResponse]:
    stmt = select(Food).order_by(Food.id)
    if not include_archived:
        stmt = stmt.where(Food.archived_at.is_(None))
    foods = session.scalars(stmt).all()
    return [FoodResponse.model_validate(food) for food in foods]


@router.post("/foods", status_code=status.HTTP_201_CREATED)
def create_food(payload: FoodCreate, session: SessionDep) -> FoodMutationResult:
    food = Food(
        name=payload.name,
        type=payload.type,
        calorie_basis=payload.calorie_basis,
        kcal_per_basis=payload.kcal_per_basis,
    )
    session.add(food)
    session.flush()  # assign food.id before it can be pointed at from cat defaults

    defaulted = (
        _apply_default_for_all_cats(session, food) if payload.set_default_for_all_cats else 0
    )

    session.commit()
    session.refresh(food)
    return FoodMutationResult(
        food=FoodResponse.model_validate(food), defaulted_for_cat_count=defaulted
    )


@router.patch("/foods/{food_id}")
def update_food(food_id: int, payload: FoodUpdate, session: SessionDep) -> FoodMutationResult:
    food = _get_food_or_404(session, food_id)

    if payload.type is not None and payload.type is not food.type:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Food type is immutable and cannot be changed after creation",
        )

    changes = payload.model_dump(exclude_unset=True, exclude={"type", "set_default_for_all_cats"})
    for field, value in changes.items():
        setattr(food, field, value)

    defaulted = (
        _apply_default_for_all_cats(session, food) if payload.set_default_for_all_cats else 0
    )

    session.commit()
    session.refresh(food)
    return FoodMutationResult(
        food=FoodResponse.model_validate(food), defaulted_for_cat_count=defaulted
    )


@router.delete("/foods/{food_id}")
def delete_food(food_id: int, session: SessionDep) -> FoodDeleteResult:
    food = _get_food_or_404(session, food_id)
    cleared = _clear_from_defaults(session, food_id)

    referenced = session.scalar(
        select(func.count()).select_from(Meal).where(Meal.food_id == food_id)
    )
    if referenced:
        food.archived_at = datetime.now(UTC)
        session.commit()
        session.refresh(food)
        return FoodDeleteResult(
            archived=True,
            food=FoodResponse.model_validate(food),
            cleared_default_for_cat_ids=cleared,
        )

    session.delete(food)
    session.commit()
    return FoodDeleteResult(archived=False, food=None, cleared_default_for_cat_ids=cleared)
