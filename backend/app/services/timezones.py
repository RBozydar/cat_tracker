"""Household-timezone helpers — the correctness hotspot for day bucketing.

The API accepts **local dates** (``YYYY-MM-DD``, household timezone) at every
query/report boundary and converts them to UTC instants here. ``zoneinfo``
handles DST automatically: a 23h/25h local day still yields correct UTC bounds.
Phase 2 report aggregation builds on ``local_day_bounds``.
"""

from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def resolve_timezone(name: str) -> ZoneInfo:
    """Return a ``ZoneInfo`` for an IANA name, or raise ``ValueError`` if invalid."""

    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        msg = f"Unknown timezone: {name!r}"
        raise ValueError(msg) from exc


def is_valid_timezone(name: str) -> bool:
    try:
        ZoneInfo(name)
    # PEP 758 (Python 3.14+): unparenthesized exception tuple without `as`.
    # Reads like removed Python-2 syntax but is valid and does the same thing
    # as `except (ZoneInfoNotFoundError, ValueError):` on this project's pin.
    except ZoneInfoNotFoundError, ValueError:
        return False
    return True


def local_day_bounds(day: date, tz: ZoneInfo) -> tuple[datetime, datetime]:
    """UTC ``[start, next_midnight)`` instants for a local calendar day.

    DST-safe: constructing the next day's local midnight and converting to UTC
    yields the true 23h/25h span on transition days.
    """

    start_local = datetime.combine(day, time.min, tzinfo=tz)
    end_local = datetime.combine(day + timedelta(days=1), time.min, tzinfo=tz)
    return start_local.astimezone(UTC), end_local.astimezone(UTC)


def local_range_bounds(start: date, end: date, tz: ZoneInfo) -> tuple[datetime, datetime]:
    """UTC bounds spanning local days ``[start, end]`` inclusive.

    Start of ``start``'s local day to the end of ``end``'s local day.
    """

    start_utc, _ = local_day_bounds(start, tz)
    _, end_utc = local_day_bounds(end, tz)
    return start_utc, end_utc
