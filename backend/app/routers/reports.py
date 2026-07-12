"""Report endpoints: today (all cats), range (one cat), comparison (all cats).

Query date params are **household-local dates** (``YYYY-MM-DD``); the services
convert them to UTC instants. The household timezone comes from the settings
singleton, created lazily on first access (hence the commit — a GET may be the
first request against a fresh DB).
"""

from datetime import date

from fastapi import APIRouter, HTTPException, status

from app.config import get_settings
from app.db import SessionDep
from app.models import Cat
from app.schemas import ComparisonReport, RangeReport, TodayReport
from app.services.reports import (
    build_comparison_report,
    build_range_report,
    build_today_report,
)
from app.services.settings import get_or_create_settings
from app.services.timezones import resolve_timezone

router = APIRouter(prefix="/reports", tags=["reports"])


def _require_start_before_end(start: date, end: date) -> None:
    if end < start:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "end must be on or after start")


@router.get("/today")
def today(session: SessionDep) -> TodayReport:
    settings = get_or_create_settings(session, get_settings().app_timezone)
    tz = resolve_timezone(settings.timezone)
    report = build_today_report(
        session,
        tz,
        portion_suggestions_enabled=settings.portion_suggestions_enabled,
        meals_per_day=settings.meals_per_day,
    )
    session.commit()
    return report


@router.get("/range")
def range_report(session: SessionDep, cat_id: int, start: date, end: date) -> RangeReport:
    _require_start_before_end(start, end)
    cat = session.get(Cat, cat_id)
    if cat is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Cat {cat_id} not found")

    settings = get_or_create_settings(session, get_settings().app_timezone)
    tz = resolve_timezone(settings.timezone)
    report = build_range_report(session, cat, start, end, tz)
    session.commit()
    return report


@router.get("/comparison")
def comparison(session: SessionDep, start: date, end: date) -> ComparisonReport:
    _require_start_before_end(start, end)
    settings = get_or_create_settings(session, get_settings().app_timezone)
    tz = resolve_timezone(settings.timezone)
    report = build_comparison_report(session, start, end, tz)
    session.commit()
    return report
