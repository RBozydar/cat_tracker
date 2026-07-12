"""Target-calorie calculator — veterinary RER/MER with a full breakdown.

``RER = 70 x weight_kg ** 0.75``. A weight-loss factor of 0.8 is applied to the
**goal** weight when the cat has one; otherwise a neutered-adult maintenance
factor of 1.2 is applied to the **current** weight. The result is always a
suggestion — the router never writes it to the cat's stored target.

Pure and DB-free so the math is unit-tested against hand-computed golden
numbers; the router supplies the cat's goal and current weights and translates
:class:`InsufficientWeightDataError` into a 400.
"""

from app.schemas import TargetBasis, TargetSuggestionResponse

GOAL_WEIGHT_FACTOR = 0.8
MAINTENANCE_FACTOR = 1.2


class InsufficientWeightDataError(ValueError):
    """No goal weight and no weight entry — nothing to compute a target from."""


def _rer_kcal(weight_kg: float) -> float:
    # float ** float is typed Any in typeshed (negative base could go complex);
    # weights are always positive, so the result is a real float.
    return float(70 * weight_kg**0.75)


def compute_target_suggestion(
    cat_id: int | None,
    goal_weight_kg: float | None,
    current_weight_kg: float | None,
) -> TargetSuggestionResponse:
    """Build the calculator payload, preferring the goal weight when present.

    ``cat_id`` is null in the by-weight onboarding mode; there a weight is always
    supplied so the "no weight to compute from" branch is never reached.
    """

    if goal_weight_kg is not None:
        basis = TargetBasis.GOAL_WEIGHT
        basis_weight = goal_weight_kg
        factor = GOAL_WEIGHT_FACTOR
    elif current_weight_kg is not None:
        basis = TargetBasis.CURRENT_WEIGHT
        basis_weight = current_weight_kg
        factor = MAINTENANCE_FACTOR
    else:
        msg = f"Cat {cat_id} has no goal weight and no weight entries to compute a target from"
        raise InsufficientWeightDataError(msg)

    rer = _rer_kcal(basis_weight)
    return TargetSuggestionResponse(
        cat_id=cat_id,
        current_weight_kg=current_weight_kg,
        goal_weight_kg=goal_weight_kg,
        rer_kcal=rer,
        factor=factor,
        basis=basis,
        suggested_target_kcal=rer * factor,
    )
