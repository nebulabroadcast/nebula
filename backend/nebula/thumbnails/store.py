"""Thumbnails in the database (table `thumbnails`, schema.sql)."""

import time
from dataclasses import dataclass
from typing import Any

import asyncpg
from nx.db import db

from nebula.exceptions import NotFoundException

READY = "ready"
FAILED = "failed"
MIME = "image/webp"


@dataclass(frozen=True)
class Thumbnail:
    hash: str
    data: bytes
    width: int | None
    height: int | None
    mime: str = MIME


@dataclass(frozen=True)
class ThumbnailState:
    """An asset as far as its thumbnail goes, and what is stored for it."""

    meta: dict[str, Any]
    hash: str | None  # the asset's thumbnail_hash; None: it can't have one
    position: float
    stored_hash: str | None
    stored_status: str | None
    # The stored picture, current or not; None when it failed or there is none
    last: Thumbnail | None

    @property
    def current(self) -> bool:
        return self.hash is not None and self.stored_hash == self.hash


async def load_state(id_asset: int) -> ThumbnailState:
    row = await db.fetchrow(
        """
        SELECT a.meta, h.hash, asset_thumbnail_position(a.meta) AS position,
            t.hash AS stored_hash, t.status, t.width, t.height, t.mime,
            CASE WHEN t.status = $2 THEN t.data END AS data
        FROM assets a
        CROSS JOIN LATERAL (SELECT asset_thumbnail_hash(a.meta) AS hash) h
        LEFT JOIN thumbnails t ON t.id_asset = a.id
        WHERE a.id = $1
        """,
        id_asset,
        READY,
    )
    if row is None:
        raise NotFoundException(f"Asset {id_asset} not found")
    last = None
    if row["data"] is not None:
        last = Thumbnail(
            row["stored_hash"], row["data"], row["width"], row["height"], row["mime"]
        )
    return ThumbnailState(
        meta=dict(row["meta"]),
        hash=row["hash"],
        position=row["position"],
        stored_hash=row["stored_hash"],
        stored_status=row["status"],
        last=last,
    )


async def save(
    id_asset: int, state: ThumbnailState, thumbnail: Thumbnail | None
) -> None:
    """Store the thumbnail, or a failed row when it is None."""
    assert state.hash is not None, "The asset can't have a thumbnail"
    try:
        await db.execute(
            """
            INSERT INTO thumbnails
                (
                    id_asset, hash, status, file_mtime,
                    position, mime, width, height, data, ctime
                )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id_asset) DO UPDATE SET
                hash = EXCLUDED.hash,
                status = EXCLUDED.status,
                file_mtime = EXCLUDED.file_mtime,
                position = EXCLUDED.position,
                mime = EXCLUDED.mime,
                width = EXCLUDED.width,
                height = EXCLUDED.height,
                data = EXCLUDED.data,
                ctime = EXCLUDED.ctime
            """,
            id_asset,
            state.hash,
            READY if thumbnail else FAILED,
            float(state.meta["file/mtime"]),
            state.position,
            thumbnail.mime if thumbnail else None,
            thumbnail.width if thumbnail else None,
            thumbnail.height if thumbnail else None,
            thumbnail.data if thumbnail else None,
            time.time(),
        )
    except asyncpg.exceptions.ForeignKeyViolationError as e:
        raise NotFoundException(f"Asset {id_asset} not found") from e
