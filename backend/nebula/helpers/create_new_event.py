from pydantic import BaseModel, Field

import nebula
from nebula.db import DatabaseConnection
from nebula.settings.models import PlayoutChannelSettings

Serializable = int | str | float | list[str] | bool | None


class EventData(BaseModel):
    id: int | None = Field(
        None,
        title="Event ID",
        description="Event ID. None for new events.",
        examples=[320],
    )

    start: int = Field(
        ...,
        title="Start time",
        examples=[1620000000],
    )

    id_asset: int | None = Field(
        None,
        title="Asset ID",
        description="ID of the asset to be used as a primary asset for this event.",
        examples=[123],
    )

    items: list[dict[str, Serializable]] | None = Field(default_factory=lambda: [])

    meta: dict[str, Serializable] | None = Field(
        default=None,
        title="Event metadata",
        description="Metadata for the event.",
        examples=[
            {
                "title": "My event",
                "subtitle": "My event subtitle",
                "genre": "My genre",
            }
        ],
    )


async def _create_new_event(
    channel: PlayoutChannelSettings,
    event_data: EventData,
    user: nebula.User | None,
    conn: DatabaseConnection,
) -> None:
    """Create a new event from the given data."""

    username = user.name if user else None

    new_bin = nebula.Bin(connection=conn, username=username)
    new_event = nebula.Event(connection=conn, username=username)

    await new_bin.save()

    new_event["id_magic"] = new_bin.id
    new_event["id_channel"] = channel.id
    new_event["start"] = event_data.start

    asset_meta = {}
    position = 0
    if event_data.id_asset:
        asset = await nebula.Asset.load(
            event_data.id_asset, connection=conn, username=username
        )

        new_event["id_asset"] = event_data.id_asset

        new_item = nebula.Item(connection=conn, username=username)
        new_item["id_asset"] = event_data.id_asset
        new_item["id_bin"] = new_bin.id
        new_item["position"] = position
        new_item["mark_in"] = asset["mark_in"]
        new_item["mark_out"] = asset["mark_out"]

        await new_item.save()
        new_bin["duration"] = asset.duration
        asset_meta = asset.meta
        position += 1

    if event_data.items:
        for item_data in event_data.items:
            if item_data.get("id"):
                assert isinstance(item_data["id"], int), "Invalid item ID"
                item = await nebula.Item.load(
                    item_data["id"], connection=conn, username=username
                )
            else:
                item = nebula.Item(connection=conn, username=username)
            item.update(item_data)
            item["id_bin"] = new_bin.id
            item["position"] = position
            await item.save()
            position += 1

    for field in channel.fields:
        if (value := asset_meta.get(field.name)) is not None:
            new_event[field.name] = value

        if event_data.meta is not None:
            value = event_data.meta.get(field.name)
            if value is not None:
                new_event[field.name] = value

    try:
        await new_event.save()
        await new_bin.save()
    except Exception as e:
        raise nebula.ConflictException() from e


async def create_new_event(
    channel: PlayoutChannelSettings,
    event_data: EventData,
    user: nebula.User | None = None,
    conn: DatabaseConnection | None = None,
) -> None:
    """Create a new event from the given data."""

    if conn:
        return await _create_new_event(channel, event_data, user, conn)

    pool = await nebula.db.pool()
    async with pool.acquire() as conn, conn.transaction():
        return await _create_new_event(channel, event_data, user, conn)
