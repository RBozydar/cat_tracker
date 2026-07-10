"""Target-calorie calculator endpoint (``GET /api/target-suggestion``).

Loads the cat's goal weight and current weight (latest weigh-in) and returns the
RER/MER breakdown. Unknown cat → 404; a cat with neither a goal weight nor any
weight entry has nothing to compute from → 400.
"""

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.db import SessionDep
from app.models import Cat, WeightEntry
from app.schemas import TargetSuggestionResponse
from app.services.target import InsufficientWeightData, compute_target_suggestion

router = APIRouter(tags=["target"])


@router.get("/target-suggestion")
def target_suggestion(session: SessionDep, cat_id: int) -> TargetSuggestionResponse:
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
    except InsufficientWeightData as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
