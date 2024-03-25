from nxtools import format_time

import nebula


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

    async for record in nebula.db.iterate(query, id_channel, timestamp):
        return nebula.Event.from_meta(record["meta"])
    return None


async def delete_events(ids: list[int], user: nebula.User | None = None) -> list[int]:
    """Delete events from the database.

    It also deletes the associated bins and items. Events with
    already broadcasted items are not deleted since they are
    needed for statistics.

    Returns a list of event IDs that were deleted.
    """

    username = user.name if user else None

    deleted_event_ids = []
    pool = await nebula.db.pool()
    async with pool.acquire() as conn, conn.transaction():
        for id_event in ids:
            event = await nebula.Event.load(id_event, username=username)
            id_bin = event["id_magic"]

            try:
                await nebula.db.execute(
                    "DELETE FROM items WHERE id_bin = $1",
                    id_bin,
                )
            except Exception:
                nebula.log.error(f"Failed to delete items of {event}")
                continue

            await nebula.db.execute("DELETE FROM bins WHERE id = $1", id_bin)
            await nebula.db.execute("DELETE FROM events WHERE id = $1", id_event)

            deleted_event_ids.append(id_event)
    return deleted_event_ids


async def get_events_in_range(
    id_channel: int,
    start_time: float,
    end_time: float,
    user: nebula.User | None = None,
) -> list[nebula.Event]:
    """Return a list of events in the given time range"""
    username = user.name if user else None
    result: list[nebula.Event] = []

    if not (start_time and end_time):
        # TODO raise bad request?
        return []

    nebula.log.trace(
        f"Requested events of channel {id_channel} "
        f"from {format_time(int(start_time))} to {format_time(int(end_time))}",
        user=username,
    )

    result = []

    # Last event before start_time
    async for row in nebula.db.iterate(
        """
        SELECT e.meta as emeta, o.meta as ometa FROM events AS e, bins AS o
        WHERE
            e.id_channel=$1
            AND e.start < $2
            AND e.id_magic = o.id
        ORDER BY start DESC LIMIT 1
        """,
        id_channel,
        start_time,
    ):
        rec = row["emeta"]
        rec["duration"] = row["ometa"].get("duration")
        result.append(nebula.Event.from_meta(rec))

    # Events between start_time and end_time
    async for row in nebula.db.iterate(
        """
        SELECT e.meta as emeta, o.meta as ometa FROM events AS e, bins AS o
        WHERE
            e.id_channel=$1
            AND e.start >= $2
            AND e.start < $3
            AND e.id_magic = o.id
        ORDER BY start ASC
        """,
        id_channel,
        start_time,
        end_time,
    ):
        rec = row["emeta"]
        rec["duration"] = row["ometa"].get("duration")
        result.append(nebula.Event.from_meta(rec))

    return result
