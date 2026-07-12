"""SQLAlchemy models — the canonical domain (small app → one module).

Invariants that the DB enforces here (the rest live in the service/router layer,
see the plan's "Model invariants"):

- ``weight_entry`` is unique per ``(cat_id, measured_on)`` — one weigh-in per day.
- ``meal.food_id`` is ``RESTRICT``: a food referenced by any meal cannot be
  hard-deleted (the foods router archives it instead).
- Deleting a cat cascades to its meals and weight entries.
- ``household_settings`` is a singleton pinned to ``id = 1``.

``fed_at`` and ``archived_at`` use :class:`app.db.UTCDateTime`; they are always
UTC instants (see the time convention in ``app.db``).
"""

from datetime import date, datetime
from enum import StrEnum

from sqlalchemy import (
    CheckConstraint,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, UTCDateTime


class FoodType(StrEnum):
    WET = "WET"
    DRY = "DRY"
    TREAT = "TREAT"


class CalorieBasis(StrEnum):
    PER_100G = "PER_100G"
    PER_PIECE = "PER_PIECE"


class Food(Base):
    __tablename__ = "food"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    type: Mapped[FoodType] = mapped_column(
        Enum(FoodType, name="food_type", create_constraint=True), nullable=False
    )
    calorie_basis: Mapped[CalorieBasis] = mapped_column(
        Enum(CalorieBasis, name="calorie_basis", create_constraint=True), nullable=False
    )
    # kcal per 100 g (PER_100G) or per piece (PER_PIECE).
    kcal_per_basis: Mapped[float] = mapped_column(Float, nullable=False)
    # Set when the food is retired (referenced by meals so it cannot be deleted).
    archived_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)


class Cat(Base):
    __tablename__ = "cat"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    target_kcal: Mapped[float] = mapped_column(Float, nullable=False)
    # Optional: a trim cat has no goal.
    goal_weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Nullable defaults avoid the old app's chicken-and-egg FK on a fresh DB.
    # Type validity (WET/DRY, not archived) is enforced in the service layer.
    default_wet_food_id: Mapped[int | None] = mapped_column(ForeignKey("food.id"), nullable=True)
    default_dry_food_id: Mapped[int | None] = mapped_column(ForeignKey("food.id"), nullable=True)

    meals: Mapped[list[Meal]] = relationship(
        back_populates="cat", cascade="all, delete-orphan", passive_deletes=True
    )
    weight_entries: Mapped[list[WeightEntry]] = relationship(
        back_populates="cat", cascade="all, delete-orphan", passive_deletes=True
    )


class WeightEntry(Base):
    __tablename__ = "weight_entry"
    __table_args__ = (UniqueConstraint("cat_id", "measured_on", name="uq_weight_entry_cat_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cat_id: Mapped[int] = mapped_column(ForeignKey("cat.id", ondelete="CASCADE"), nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    measured_on: Mapped[date] = mapped_column(nullable=False)

    cat: Mapped[Cat] = relationship(back_populates="weight_entries")


class Meal(Base):
    __tablename__ = "meal"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cat_id: Mapped[int] = mapped_column(ForeignKey("cat.id", ondelete="CASCADE"), nullable=False)
    # RESTRICT: a referenced food is archived, never hard-deleted.
    food_id: Mapped[int] = mapped_column(ForeignKey("food.id", ondelete="RESTRICT"), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    # Calorie snapshot taken at log time — makes history immutable.
    basis_snapshot: Mapped[CalorieBasis] = mapped_column(
        Enum(CalorieBasis, name="calorie_basis", create_constraint=True), nullable=False
    )
    kcal_per_basis_snapshot: Mapped[float] = mapped_column(Float, nullable=False)
    fed_at: Mapped[datetime] = mapped_column(UTCDateTime, nullable=False)

    cat: Mapped[Cat] = relationship(back_populates="meals")
    food: Mapped[Food] = relationship()


class HouseholdSettings(Base):
    __tablename__ = "household_settings"
    __table_args__ = (CheckConstraint("id = 1", name="ck_household_settings_singleton"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # IANA timezone name driving all local-day bucketing.
    timezone: Mapped[str] = mapped_column(String, nullable=False)
    portion_suggestions_enabled: Mapped[bool] = mapped_column(nullable=False)
    meals_per_day: Mapped[int] = mapped_column(Integer, nullable=False)
