"""Activity feed of assets: changes, QC and status changes, uploads, comments.

One row per kind a save touches (spec 010). Each kind has a summary model
(what the feed lists and renders) and only `changed` has a detail (the full
old and new values). Rows are written by `Asset.save()` and by comments;
they are deleted with the asset (foreign key cascade).
"""

import hashlib
import time
from string.templatelib import Template
from typing import Annotated, Any, Literal

from nx.db import db
from pydantic import BaseModel, Field

from nebula.common import json_dumps
from nebula.context import current_user, require_access
from nebula.exceptions import (
    ForbiddenException,
    NotFoundException,
    ValidationException,
)
from nebula.messaging import msg
from nebula.query.cursor import decode_cursor, encode_cursor
from nebula.sql import SQL


def _sql(query: Template) -> list[Any]:
    """The query and its parameters, to unpack into a db call."""
    sql, params = SQL.render(query)
    return [sql, *params]


#
# Summary models, one per kind
#


class CreatedSummary(BaseModel):
    pass


class ChangedSummary(BaseModel):
    keys: Annotated[list[str], Field(description="Changed metadata keys")]


class StateSummary(BaseModel):
    old: int | None = None
    new: int | None = None


class UploadedSummary(BaseModel):
    size: Annotated[int, Field(description="File size in bytes")]
    extension: str


class CommentSummary(BaseModel):
    text: str | None = None
    edited: Annotated[float | None, Field(description="Time of the last edit")] = None
    deleted: Annotated[float | None, Field(description="Time of deletion")] = None


class ChangedDetail(BaseModel):
    changes: Annotated[
        dict[str, tuple[Any, Any]],
        Field(description="Old and new value of each changed key (null: missing)"),
    ]


SUMMARY_MODELS: dict[str, type[BaseModel]] = {
    "created": CreatedSummary,
    "changed": ChangedSummary,
    "qc": StateSummary,
    "status": StateSummary,
    "uploaded": UploadedSummary,
    "comment": CommentSummary,
}
KINDS = list(SUMMARY_MODELS)

#
# Rows, a union discriminated by kind
#


class ActivityBase(BaseModel):
    id: int
    id_user: Annotated[int | None, Field(description="Author, null: system")]
    ctime: float


class CreatedActivity(ActivityBase):
    kind: Literal["created"]
    summary: CreatedSummary


class ChangedActivity(ActivityBase):
    kind: Literal["changed"]
    summary: ChangedSummary
    detail: Annotated[
        ChangedDetail | None, Field(description="Only when reading a single row")
    ] = None


class QcActivity(ActivityBase):
    kind: Literal["qc"]
    summary: StateSummary


class StatusActivity(ActivityBase):
    kind: Literal["status"]
    summary: StateSummary


class UploadedActivity(ActivityBase):
    kind: Literal["uploaded"]
    summary: UploadedSummary


class CommentActivity(ActivityBase):
    kind: Literal["comment"]
    summary: CommentSummary


Activity = Annotated[
    CreatedActivity
    | ChangedActivity
    | QcActivity
    | StatusActivity
    | UploadedActivity
    | CommentActivity,
    Field(discriminator="kind"),
]

#
# Writing rows
#

# Keys with a kind of their own; the other tracked keys are `changed`
KEYS_WITH_OWN_KIND = {"qc/state": "qc", "status": "status"}
UNTRACKED_KEYS = {"id", "mtime", "ctime", "updated_by"}

ActivityRow = tuple[str, dict[str, Any], dict[str, Any] | None]


def is_tracked_key(key: str) -> bool:
    return key not in UNTRACKED_KEYS and not key.startswith("__")


def activities_from_changes(changes: dict[str, tuple[Any, Any]]) -> list[ActivityRow]:
    """Activity rows (kind, summary, detail) for the changes of one save."""
    tracked = {k: v for k, v in changes.items() if is_tracked_key(k)}
    special = {k: tracked.pop(k) for k in KEYS_WITH_OWN_KIND if k in tracked}
    rows: list[ActivityRow] = []
    if tracked:
        rows.append(
            (
                "changed",
                {"keys": sorted(tracked)},
                {"changes": {k: list(v) for k, v in tracked.items()}},
            )
        )
    for key, (old, new) in special.items():
        rows.append((KEYS_WITH_OWN_KIND[key], {"old": old, "new": new}, None))
    return rows


async def add_activity(
    id_asset: int,
    kind: str,
    summary: dict[str, Any] | None = None,
    detail: dict[str, Any] | None = None,
    *,
    ctime: float | None = None,
) -> int:
    """Insert an activity row by the current user and tell clients after commit."""
    model = SUMMARY_MODELS[kind]
    summary = model.model_validate(summary or {}).model_dump(exclude_unset=True)
    user = current_user()
    id_user = user.id if user else None
    now = time.time() if ctime is None else ctime
    query = t"""
        INSERT INTO activity (id_asset, kind, id_user, ctime, summary, detail)
        VALUES ({id_asset}, {kind}, {id_user}, {now}, {summary}, {detail})
        RETURNING id
    """
    row = await db.fetchrow(*_sql(query))
    assert row is not None
    id_activity: int = row["id"]
    await msg("activity", id_asset=id_asset, id=id_activity, kind=kind)
    return id_activity


async def add_save_activities(
    id_asset: int,
    changes: dict[str, tuple[Any, Any]],
    *,
    is_new: bool,
    kind: str | None = None,
    summary: dict[str, Any] | None = None,
) -> None:
    """Write the activity rows of one asset save, inside its transaction.

    A caller-named kind (`uploaded`) is one row that takes every change
    with it. Otherwise a new asset gets `created`, a saved one a row per
    kind its changes touch, or none.
    """
    if kind:
        rows: list[ActivityRow] = [(kind, summary or {}, None)]
    elif is_new:
        rows = [("created", {}, None)]
    else:
        rows = activities_from_changes(changes)
    now = time.time()
    for row_kind, row_summary, row_detail in rows:
        await add_activity(id_asset, row_kind, row_summary, row_detail, ctime=now)


#
# Reading
#


def _kinds_hash(kinds: list[str] | None) -> str:
    data = json_dumps(sorted(kinds or []))
    return hashlib.sha256(data.encode()).hexdigest()[:16]


async def list_activities(
    id_asset: int,
    *,
    kinds: list[str] | None = None,
    limit: int = 50,
    cursor: str | None = None,
) -> tuple[list[dict[str, Any]], str | None]:
    """A page of the asset's activity rows, newest first, without details."""
    if unknown := set(kinds or []) - set(KINDS):
        raise ValidationException(f"Unknown kind: {', '.join(sorted(unknown))}")
    qhash = _kinds_hash(kinds)
    conds = [t"id_asset = {id_asset}"]
    if kinds:
        conds.append(t"kind = ANY({kinds})")
    if cursor:
        [after] = decode_cursor(cursor, qhash, 1)
        conds.append(t"id < {int(after)}")
    query = t"""
        SELECT id, kind, id_user, ctime, summary FROM activity
        WHERE {SQL.join(conds, " AND ")}
        ORDER BY id DESC LIMIT {limit + 1}
    """
    rows = [dict(row) for row in await db.fetch(*_sql(query))]
    next_cursor = None
    if len(rows) > limit:
        rows = rows[:limit]
        next_cursor = encode_cursor([rows[-1]["id"]], qhash)
    return rows, next_cursor


async def get_activity(id_asset: int, id_activity: int) -> dict[str, Any]:
    """One activity row with its detail (the `detail` key only if there is one)."""
    query = t"""
        SELECT id, kind, id_user, ctime, summary, detail FROM activity
        WHERE id = {id_activity} AND id_asset = {id_asset}
    """
    row = await db.fetchrow(*_sql(query))
    if row is None:
        raise NotFoundException(f"Activity {id_activity} not found")
    result = dict(row)
    if result["detail"] is None:
        del result["detail"]
    return result


#
# Comments
#


async def add_comment(id_asset: int, text: str) -> dict[str, Any]:
    id_activity = await add_activity(id_asset, "comment", {"text": text})
    return await get_activity(id_asset, id_activity)


async def _get_comment(id_asset: int, id_activity: int) -> dict[str, Any]:
    row = await get_activity(id_asset, id_activity)
    if row["kind"] != "comment":
        # also for system code: other kinds are immutable
        raise ForbiddenException("Only comments can be changed")
    return row


async def _save_comment(id_asset: int, row: dict[str, Any]) -> None:
    query = t"UPDATE activity SET summary = {row['summary']} WHERE id = {row['id']}"
    await db.execute(*_sql(query))
    await msg("activity", id_asset=id_asset, id=row["id"], kind="comment")


async def edit_comment(id_asset: int, id_activity: int, text: str) -> dict[str, Any]:
    """Only the author edits a comment (a deleted one can't be)."""
    row = await _get_comment(id_asset, id_activity)
    require_access(
        lambda u: u.id == row["id_user"] and "deleted" not in row["summary"],
        "You can edit only your own comments",
    )
    row["summary"] = {**row["summary"], "text": text, "edited": time.time()}
    await _save_comment(id_asset, row)
    return row


async def delete_comment(id_asset: int, id_activity: int) -> None:
    """The author or an admin deletes a comment: the row stays, without text."""
    row = await _get_comment(id_asset, id_activity)
    require_access(
        lambda u: u.is_admin or u.id == row["id_user"],
        "You can delete only your own comments",
    )
    if "deleted" in row["summary"]:
        return
    row["summary"] = {"deleted": time.time()}
    await _save_comment(id_asset, row)
