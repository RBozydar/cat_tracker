"""Household settings singleton access.

The single ``household_settings`` row (id = 1) is created lazily on first access
so a fresh database needs no seeding to serve requests. The default timezone
comes from the ``APP_TIMEZONE`` environment value (fallback ``UTC`` if unset or
not a valid IANA name).
"""

from typing import TYPE_CHECKING

from sqlalchemy.exc import IntegrityError

from app.models import HouseholdSettings
from app.services.timezones import is_valid_timezone

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

SETTINGS_ID = 1


def get_or_create_settings(session: Session, default_timezone: str) -> HouseholdSettings:
    """Fetch the settings singleton, creating it with defaults on first access.

    Two concurrent first requests can both see no row and both try to create
    it; the loser's insert violates the primary key, caught here inside a
    savepoint so it can re-read the winner's row instead of surfacing a 500.
    """

    settings = session.get(HouseholdSettings, SETTINGS_ID)
    if settings is not None:
        return settings

    timezone = default_timezone if is_valid_timezone(default_timezone) else "UTC"
    try:
        with session.begin_nested():
            settings = HouseholdSettings(
                id=SETTINGS_ID,
                timezone=timezone,
                portion_suggestions_enabled=False,
                meals_per_day=2,
            )
            session.add(settings)
            session.flush()
    except IntegrityError:
        settings = session.get(HouseholdSettings, SETTINGS_ID)
        if settings is None:
            raise
    return settings
