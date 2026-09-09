from typing import Any

import asyncpg

import nebula
from nebula.utils import format_time


async def get_event_at_time(id_channel: int, timestamp: int) -> nebula.Event | None:
    """Return an event at the given timestamp on the given channel.

    If there is no event at the given timestamp, return None.
    Note: This function looks for the EXACT start timestamp, not for the closest event,
    or an ongoing event. This is used in scheduler for replacing existing events.
    """
    query = """
        SELECT meta FROM events
        WHERE id_channel = $1 AND start = $2
        LIMIT 1
    """

    record = await nebula.db.fetchrow(query, id_channel, timestamp)
    if record:
        return nebula.Event.from_meta(record["meta"])
    return None


async def delete_events(ids: list[int], **kwargs: Any) -> list[int]:
    """Delete events from the database.

    It also deletes the associated bins and items. Events with
    already broadcasted items are not deleted since they are
    needed for statistics.

    Returns a list of event IDs that were deleted.
    """
    # **kwargs absorbs a legacy `user` argument, kept for backward
    # compatibility. Who's acting is read ambiently where it's needed.
    _ = kwargs

    deleted_event_ids = []
    async with nebula.db.transaction():
        for id_event in ids:
            event = await nebula.Event.load(id_event)
            id_bin = event["id_magic"]

            try:
                await nebula.db.execute(
                    "DELETE FROM items WHERE id_bin = $1",
                    id_bin,
                )
            except asyncpg.exceptions.ForeignKeyViolationError as e:
                raise nebula.ConflictException(
                    "Cannot delete event containing aired items"
                ) from e
            except Exception:
                nebula.log.traceback(f"Failed to delete items of {event}")
                continue

            await nebula.db.execute("DELETE FROM bins WHERE id = $1", id_bin)
            await nebula.db.execute("DELETE FROM events WHERE id = $1", id_event)

            deleted_event_ids.append(id_event)
    return deleted_event_ids


async def get_events_in_range(
    id_channel: int,
    start_time: float,
    end_time: float,
    **kwargs: Any,
) -> list[nebula.Event]:
    """Return a list of events in the given time range"""
    # **kwargs absorbs a legacy `user` argument, kept for backward
    # compatibility. Who's acting is read ambiently where it's needed.
    _ = kwargs
    result: list[nebula.Event] = []

    if not (start_time and end_time):
        # TODO: raise bad request?
        return []

    nebula.log.trace(
        f"Requested events of channel {id_channel} "
        f"from {format_time(int(start_time))} to {format_time(int(end_time))}"
    )
    result = []

    # Events between start_time and end_time
    # and the last event before end_time

    query = """
        (
            SELECT
                e.meta AS emeta,
                o.meta AS ometa,
                e.start
            FROM events AS e, bins AS o
            WHERE
                e.id_channel = $1
            AND e.start < $2
            AND e.id_magic = o.id
            ORDER BY e.start DESC
            LIMIT 1
        )
        UNION ALL
        (
            SELECT
                e.meta AS emeta,
                o.meta AS ometa,
                e.start
            FROM events AS e, bins AS o
            WHERE
                e.id_channel = $1
            AND e.start >= $2
            AND e.start < $3
            AND e.id_magic = o.id
        )
        ORDER BY start ASC
        """
    for row in await nebula.db.fetch(
        query,
        id_channel,
        start_time,
        end_time,
    ):
        rec = row["emeta"]
        rec["duration"] = row["ometa"].get("duration")
        result.append(nebula.Event.from_meta(rec))

    return result
