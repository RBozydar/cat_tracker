"""Household settings singleton access.

The single ``household_settings`` row (id = 1) is created lazily on first access
so a fresh database needs no seeding to serve requests. The default timezone
comes from the ``APP_TIMEZONE`` environment value (fallback ``UTC``).
"""

from sqlalchemy.orm import Session

from app.models import HouseholdSettings

SETTINGS_ID = 1


def get_or_create_settings(session: Session, default_timezone: str) -> HouseholdSettings:
    """Fetch the settings singleton, creating it with defaults on first access."""

    settings = session.get(HouseholdSettings, SETTINGS_ID)
    if settings is not None:
        return settings

    settings = HouseholdSettings(
        id=SETTINGS_ID,
        timezone=default_timezone,
        portion_suggestions_enabled=False,
        meals_per_day=2,
    )
    session.add(settings)
    session.flush()
    return settings
