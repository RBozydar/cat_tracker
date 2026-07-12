"""core domain schema

Creates all five tables for the rebuild: food, cat, meal, weight_entry, and the
household_settings singleton. Enums render as VARCHAR + CHECK on SQLite; the
foreign-key ON DELETE behaviors (cat cascade, meal→food RESTRICT) require
``PRAGMA foreign_keys=ON``, which the app engine sets on connect.

Revision ID: d1a5825ab05a
Revises: 2ea7c8a6e3bc
Create Date: 2026-07-10 09:37:51.699029

"""

from collections.abc import Sequence

import app.db
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d1a5825ab05a"
down_revision: str | Sequence[str] | None = "2ea7c8a6e3bc"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "food",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column(
            "type",
            sa.Enum("WET", "DRY", "TREAT", name="food_type", create_constraint=True),
            nullable=False,
        ),
        sa.Column(
            "calorie_basis",
            sa.Enum("PER_100G", "PER_PIECE", name="calorie_basis", create_constraint=True),
            nullable=False,
        ),
        sa.Column("kcal_per_basis", sa.Float(), nullable=False),
        sa.Column("archived_at", app.db.UTCDateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "household_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("timezone", sa.String(), nullable=False),
        sa.Column("portion_suggestions_enabled", sa.Boolean(), nullable=False),
        sa.Column("meals_per_day", sa.Integer(), nullable=False),
        sa.CheckConstraint("id = 1", name="ck_household_settings_singleton"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "cat",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("target_kcal", sa.Float(), nullable=False),
        sa.Column("goal_weight_kg", sa.Float(), nullable=True),
        sa.Column("default_wet_food_id", sa.Integer(), nullable=True),
        sa.Column("default_dry_food_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["default_dry_food_id"], ["food.id"]),
        sa.ForeignKeyConstraint(["default_wet_food_id"], ["food.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "meal",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cat_id", sa.Integer(), nullable=False),
        sa.Column("food_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column(
            "basis_snapshot",
            sa.Enum("PER_100G", "PER_PIECE", name="calorie_basis", create_constraint=True),
            nullable=False,
        ),
        sa.Column("kcal_per_basis_snapshot", sa.Float(), nullable=False),
        sa.Column("fed_at", app.db.UTCDateTime(), nullable=False),
        sa.ForeignKeyConstraint(["cat_id"], ["cat.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["food_id"], ["food.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "weight_entry",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("cat_id", sa.Integer(), nullable=False),
        sa.Column("weight_kg", sa.Float(), nullable=False),
        sa.Column("measured_on", sa.Date(), nullable=False),
        sa.ForeignKeyConstraint(["cat_id"], ["cat.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cat_id", "measured_on", name="uq_weight_entry_cat_date"),
    )


def downgrade() -> None:
    op.drop_table("weight_entry")
    op.drop_table("meal")
    op.drop_table("cat")
    op.drop_table("household_settings")
    op.drop_table("food")
