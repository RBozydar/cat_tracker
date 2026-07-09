"""baseline

Empty baseline for the ground-up rebuild. The first real schema (all five
tables) lands in Phase 1; this revision exists so ``alembic upgrade head``
establishes the version table against a fresh database.

Revision ID: 2ea7c8a6e3bc
Revises:
Create Date: 2026-07-10 01:07:18.475191

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "2ea7c8a6e3bc"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
