"""asset_thumbnail_position and asset_thumbnail_hash (schema.sql, spec 011)."""

from typing import Any

import pytest

import nebula
from nebula.thumbnails.maintenance import status

pytestmark = pytest.mark.asyncio(loop_scope="session")

VIDEO = {
    "media_type": 1,
    "content_type": 2,
    "file/mtime": 1700000000.0,
    "duration": 100.0,
}


async def thumbnail(meta: dict[str, Any]) -> tuple[float, str | None]:
    row = await nebula.db.fetchrow(
        "SELECT asset_thumbnail_position($1::jsonb) AS position,"
        " asset_thumbnail_hash($1::jsonb) AS hash",
        meta,
    )
    assert row is not None
    return row["position"], row["hash"]


@pytest.mark.parametrize(
    ("changes", "position"),
    [
        ({}, 15.0),
        ({"mark_in": 10.0}, 10.0 + 0.15 * 90),
        ({"mark_in": 10.0, "mark_out": 50.0}, 10.0 + 0.15 * 40),
        ({"poster_frame": 42.0, "mark_in": 10.0}, 42.0),
        ({"content_type": 3, "poster_frame": 42.0}, 0.0),  # an image
    ],
)
async def test_position(changes: dict[str, Any], position: float) -> None:
    assert (await thumbnail(VIDEO | changes))[0] == pytest.approx(position)


@pytest.mark.parametrize(
    "changes",
    [
        {"content_type": 1},  # audio
        {"media_type": 0},  # virtual
        {"file/mtime": None},
    ],
)
async def test_no_hash(changes: dict[str, Any]) -> None:
    meta = {k: v for k, v in (VIDEO | changes).items() if v is not None}
    assert (await thumbnail(meta))[1] is None


async def test_image_has_a_hash() -> None:
    assert (await thumbnail(VIDEO | {"content_type": 3}))[1] is not None


@pytest.mark.parametrize(
    ("changes", "changes_hash"),
    [
        ({"file/mtime": 1700000001.0}, True),
        ({"poster_frame": 3.0}, True),
        ({"mark_in": 3.0}, True),
        ({"mark_out": 50.0}, True),
        ({"title": "Another title"}, False),
        ({"status": 0}, False),
    ],
)
async def test_what_changes_the_hash(
    changes: dict[str, Any], *, changes_hash: bool
) -> None:
    before = (await thumbnail(VIDEO))[1]
    after = (await thumbnail(VIDEO | changes))[1]
    assert (after != before) is changes_hash


async def test_status_adds_up() -> None:
    counts = await status()
    in_a_state = counts["ready"] + counts["failed"] + counts["stale"]
    assert counts["assets"] == in_a_state + counts["missing"]
