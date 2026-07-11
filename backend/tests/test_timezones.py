"""Day-bucketing correctness, including DST transition days (the hotspot)."""

from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from app.services.timezones import (
    is_valid_timezone,
    local_day_bounds,
    local_range_bounds,
    resolve_timezone,
)

WARSAW = ZoneInfo("Europe/Warsaw")


def test_utc_day_is_24h() -> None:
    start, end = local_day_bounds(date(2026, 7, 9), ZoneInfo("UTC"))
    assert start == datetime(2026, 7, 9, 0, 0, tzinfo=UTC)
    assert end == datetime(2026, 7, 10, 0, 0, tzinfo=UTC)
    assert end - start == timedelta(hours=24)


def test_dst_spring_forward_is_23h() -> None:
    # 2026-03-29: Warsaw jumps CET(+1)→CEST(+2) at 02:00, a 23-hour local day.
    start, end = local_day_bounds(date(2026, 3, 29), WARSAW)
    assert start == datetime(2026, 3, 28, 23, 0, tzinfo=UTC)
    assert end == datetime(2026, 3, 29, 22, 0, tzinfo=UTC)
    assert end - start == timedelta(hours=23)


def test_dst_fall_back_is_25h() -> None:
    # 2026-10-25: Warsaw falls CEST(+2)→CET(+1) at 03:00, a 25-hour local day.
    start, end = local_day_bounds(date(2026, 10, 25), WARSAW)
    assert start == datetime(2026, 10, 24, 22, 0, tzinfo=UTC)
    assert end == datetime(2026, 10, 25, 23, 0, tzinfo=UTC)
    assert end - start == timedelta(hours=25)


def test_range_bounds_span_inclusive_local_days() -> None:
    start, end = local_range_bounds(date(2026, 7, 1), date(2026, 7, 3), WARSAW)
    # 2026-07 Warsaw is CEST (+2): local midnight = UTC 22:00 the prior day.
    assert start == datetime(2026, 6, 30, 22, 0, tzinfo=UTC)
    assert end == datetime(2026, 7, 3, 22, 0, tzinfo=UTC)


def test_resolve_and_validate_timezone() -> None:
    assert resolve_timezone("Europe/Warsaw") == WARSAW
    assert is_valid_timezone("America/New_York")
    assert not is_valid_timezone("Mars/Phobos")
    with pytest.raises(ValueError, match="Unknown timezone"):
        resolve_timezone("Not/AZone")
