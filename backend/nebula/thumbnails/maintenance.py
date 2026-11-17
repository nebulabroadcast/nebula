"""Counting and backfilling thumbnails (`python -m cli thumbnails`)."""

from collections.abc import AsyncIterator

from nx.db import db

from nebula.enum import ObjectStatus
from nebula.exceptions import NotFoundException
from nebula.thumbnails.store import FAILED, READY

# Every asset with its current hash (h.hash) and its stored thumbnail (t).
# OFFSET 0 computes the hash once per row: inlined, every use of h.hash
# computes it again (status: 18 s instead of 5 s at 500k assets).
ASSETS = """
    FROM assets a
    CROSS JOIN LATERAL (SELECT asset_thumbnail_hash(a.meta) AS hash OFFSET 0) h
    LEFT JOIN thumbnails t ON t.id_asset = a.id
"""


async def status() -> dict[str, int]:
    """How many assets can have a thumbnail, and in what state theirs is."""
    row = await db.fetchrow(
        f"""
        SELECT
            count(*) FILTER (WHERE h.hash IS NOT NULL) AS assets,
            count(*) FILTER (WHERE t.hash = h.hash AND t.status = $1) AS ready,
            count(*) FILTER (WHERE t.hash = h.hash AND t.status = $2) AS failed,
            count(*) FILTER (WHERE t.hash <> h.hash) AS stale,
            count(*) FILTER (WHERE h.hash IS NOT NULL AND t.hash IS NULL) AS missing
        {ASSETS}
        """,
        READY,
        FAILED,
    )
    assert row is not None
    return dict(row)


async def sync(
    *, limit: int = 0, retry_failed: bool = False
) -> AsyncIterator[tuple[int, str | None]]:
    """Make the missing and stale thumbnails of online assets, newest first.

    Yields each asset id with the reason it has no thumbnail, or None.
    `limit` stops after that many (0: all); `retry_failed` also tries
    again the ones that failed for the current hash.
    """
    from nebula.thumbnails import make_thumbnail  # noqa: PLC0415

    rows = await db.fetch(
        f"""
        SELECT a.id {ASSETS}
        WHERE h.hash IS NOT NULL AND a.status = $1
          AND (t.hash IS DISTINCT FROM h.hash OR ($2 AND t.status = $3))
        ORDER BY a.id DESC
        LIMIT $4
        """,  # noqa: S608
        ObjectStatus.ONLINE,
        retry_failed,
        FAILED,
        limit or None,  # LIMIT NULL: no limit
    )
    for row in rows:
        try:
            await make_thumbnail(row["id"], retry_failed=retry_failed)
        except NotFoundException as e:
            yield row["id"], e.detail
        else:
            yield row["id"], None
