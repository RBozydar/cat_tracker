"""Target-calorie calculator endpoint (``GET /api/target-suggestion``).

Two mutually exclusive modes, exactly one of which must be requested:

- **By cat** (``?cat_id=``): loads the cat's goal weight and current weight
  (latest weigh-in) and returns the RER/MER breakdown. Unknown cat → 404; a cat
  with neither a goal weight nor any weight entry has nothing to compute from →
  400.
- **By weight** (``?weight_kg=`` with optional ``&goal_weight_kg=``): computes
  from explicit weights for onboarding a cat that does not exist yet. ``cat_id``
  is null in the response.

Supplying neither or both modes (or ``goal_weight_kg`` alongside ``cat_id``) is a
malformed request → 422.
"""

from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.db import SessionDep
from app.models import Cat, WeightEntry
from app.schemas import TargetSuggestionResponse
from app.services.target import InsufficientWeightDataError, compute_target_suggestion

router = APIRouter(tags=["target"])


@router.get("/target-suggestion")
def target_suggestion(
    session: SessionDep,
    cat_id: Annotated[int | None, Query()] = None,
    weight_kg: Annotated[float | None, Query(gt=0)] = None,
    goal_weight_kg: Annotated[float | None, Query(gt=0)] = None,
) -> TargetSuggestionResponse:
    if (cat_id is None) == (weight_kg is None):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Provide exactly one of cat_id or weight_kg",
        )

    if weight_kg is not None:
        # By-weight onboarding mode: the supplied weight is treated as the
        # current weight; goal_weight_kg (if any) still takes precedence in the math.
        return compute_target_suggestion(None, goal_weight_kg, weight_kg)

    if goal_weight_kg is not None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "goal_weight_kg applies only to the by-weight mode, not with cat_id",
        )

    cat = session.get(Cat, cat_id)
    if cat is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Cat {cat_id} not found")

    current_weight_kg = session.scalar(
        select(WeightEntry.weight_kg)
        .where(WeightEntry.cat_id == cat_id)
        .order_by(WeightEntry.measured_on.desc(), WeightEntry.id.desc())
        .limit(1)
    )
    try:
        return compute_target_suggestion(cat.id, cat.goal_weight_kg, current_weight_kg)
    except InsufficientWeightDataError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
