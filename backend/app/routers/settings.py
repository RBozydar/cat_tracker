"""Household settings singleton: GET/PUT only.

The row is auto-created on first access with the ``APP_TIMEZONE`` default. PUT
replaces all three fields and validates the timezone against ``zoneinfo``.
"""

from fastapi import APIRouter, HTTPException, status

from app.config import get_settings
from app.db import SessionDep
from app.schemas import SettingsResponse, SettingsUpdate
from app.services.settings import get_or_create_settings
from app.services.timezones import is_valid_timezone

router = APIRouter(tags=["settings"])


@router.get("/settings")
def read_settings(session: SessionDep) -> SettingsResponse:
    settings = get_or_create_settings(session, get_settings().app_timezone)
    session.commit()
    return SettingsResponse.model_validate(settings)


@router.put("/settings")
def update_settings(payload: SettingsUpdate, session: SessionDep) -> SettingsResponse:
    if not is_valid_timezone(payload.timezone):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown timezone: {payload.timezone!r}")

    settings = get_or_create_settings(session, get_settings().app_timezone)
    settings.timezone = payload.timezone
    settings.portion_suggestions_enabled = payload.portion_suggestions_enabled
    settings.meals_per_day = payload.meals_per_day
    session.commit()
    session.refresh(settings)
    return SettingsResponse.model_validate(settings)
