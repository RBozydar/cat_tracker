"""Idempotent-ish dev seed: 3 cats, 6 foods, two weeks of meals and weigh-ins.

Run against the configured ``DATABASE_URL`` (creating tables if missing) with:

    uv run python seed.py

Re-running is a no-op once cats exist, so it is safe to call repeatedly in dev.
Production uses ``alembic upgrade head`` and real data — never this script.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.config import get_settings
from app.db import Base, get_engine
from app.models import CalorieBasis, Cat, Food, FoodType, Meal, WeightEntry
from app.services.settings import get_or_create_settings
from sqlalchemy import func, select
from sqlalchemy.orm import Session

DAYS = 14


def _add_meal(session: Session, cat: Cat, food: Food, quantity: float, fed_at: datetime) -> None:
    session.add(
        Meal(
            cat_id=cat.id,
            food_id=food.id,
            quantity=quantity,
            basis_snapshot=food.calorie_basis,
            kcal_per_basis_snapshot=food.kcal_per_basis,
            fed_at=fed_at,
        )
    )


def seed(session: Session) -> None:
    if session.scalar(select(func.count()).select_from(Cat)):
        print("Database already has cats; skipping seed.")
        return

    get_or_create_settings(session, get_settings().app_timezone)

    wet_chicken = Food(
        name="Chicken Pâté",
        type=FoodType.WET,
        calorie_basis=CalorieBasis.PER_100G,
        kcal_per_basis=80.0,
    )
    wet_salmon = Food(
        name="Salmon Mousse",
        type=FoodType.WET,
        calorie_basis=CalorieBasis.PER_100G,
        kcal_per_basis=90.0,
    )
    dry_adult = Food(
        name="Adult Chicken Kibble",
        type=FoodType.DRY,
        calorie_basis=CalorieBasis.PER_100G,
        kcal_per_basis=350.0,
    )
    dry_light = Food(
        name="Weight Care Kibble",
        type=FoodType.DRY,
        calorie_basis=CalorieBasis.PER_100G,
        kcal_per_basis=320.0,
    )
    treat_stick = Food(
        name="Dental Stick",
        type=FoodType.TREAT,
        calorie_basis=CalorieBasis.PER_PIECE,
        kcal_per_basis=5.0,
    )
    treat_crunch = Food(
        name="Crunchy Treats",
        type=FoodType.TREAT,
        calorie_basis=CalorieBasis.PER_100G,
        kcal_per_basis=350.0,
    )
    foods = [wet_chicken, wet_salmon, dry_adult, dry_light, treat_stick, treat_crunch]
    session.add_all(foods)
    session.flush()

    cats = [
        Cat(
            name="Whiskers",
            target_kcal=200.0,
            goal_weight_kg=4.0,
            default_wet_food_id=wet_chicken.id,
            default_dry_food_id=dry_light.id,
        ),
        Cat(
            name="Mittens",
            target_kcal=250.0,
            goal_weight_kg=None,
            default_wet_food_id=wet_salmon.id,
            default_dry_food_id=dry_adult.id,
        ),
        Cat(
            name="Shadow",
            target_kcal=180.0,
            goal_weight_kg=3.5,
            default_wet_food_id=wet_chicken.id,
            default_dry_food_id=dry_light.id,
        ),
    ]
    session.add_all(cats)
    session.flush()

    start_weights = {"Whiskers": 4.6, "Mittens": 5.2, "Shadow": 3.9}
    today = datetime.now(UTC).date()

    for cat in cats:
        wet = wet_chicken if cat.default_wet_food_id == wet_chicken.id else wet_salmon
        dry = dry_light if cat.default_dry_food_id == dry_light.id else dry_adult

        for day_offset in range(DAYS, 0, -1):
            midnight = datetime.now(UTC).replace(
                hour=0, minute=0, second=0, microsecond=0
            ) - timedelta(days=day_offset)
            _add_meal(session, cat, wet, quantity=60.0, fed_at=midnight + timedelta(hours=8))
            _add_meal(session, cat, dry, quantity=30.0, fed_at=midnight + timedelta(hours=19))
            if day_offset % 3 == 0:
                _add_meal(
                    session, cat, treat_stick, quantity=1.0, fed_at=midnight + timedelta(hours=14)
                )

        # A weigh-in every 3 days, trending gently downward toward goal.
        for i, day_offset in enumerate(range(DAYS, -1, -3)):
            weight = round(start_weights[cat.name] - i * 0.05, 2)
            session.add(
                WeightEntry(
                    cat_id=cat.id, weight_kg=weight, measured_on=today - timedelta(days=day_offset)
                )
            )

    session.commit()
    print(f"Seeded {len(cats)} cats, {len(foods)} foods, and {DAYS} days of meals.")


def main() -> None:
    engine = get_engine()
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        seed(session)


if __name__ == "__main__":
    main()
