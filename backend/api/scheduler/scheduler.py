import nebula
from nebula.helpers.scheduling import parse_rundown_date
from nebula.settings.models import PlayoutChannelSettings

from .models import EventData, SchedulerRequestModel, SchedulerResponseModel
from .utils import delete_events, get_event_at_time, get_events_in_range


async def create_new_event(
    channel: PlayoutChannelSettings,
    event_data: EventData,
):
    """Create a new event from the given data."""

    pool = await nebula.db.pool()
    async with pool.acquire() as conn:
        async with conn.transaction():

            new_bin = nebula.Bin(connection=conn)
            new_event = nebula.Event(connection=conn)

            await new_bin.save()

            new_event["id_magic"] = new_bin.id
            new_event["id_channel"] = channel.id
            new_event["start"] = event_data.start

            asset_meta = {}
            if event_data.id_asset:

                asset = await nebula.Asset.load(event_data.id_asset, connection=conn)

                new_event["id_asset"] = event_data.id_asset

                new_item = nebula.Item(connection=conn)
                new_item["id_asset"] = event_data.id_asset
                new_item["id_bin"] = new_bin.id
                new_item["position"] = 0
                new_item["mark_in"] = asset["mark_in"]
                new_item["mark_out"] = asset["mark_out"]

                await new_item.save()
                new_bin["duration"] = asset.duration
                asset_meta = asset.meta

            for field in channel.fields:
                if (value := asset_meta.get(field.name)) is not None:
                    new_event[field.name] = value

                if event_data.meta is not None:
                    if (value := event_data.meta.get(field.name)) is not None:
                        new_event[field.name] = value

            try:
                await new_event.save()
                await new_bin.save()
            except Exception:
                raise nebula.ConflictException()


async def scheduler(
    request: SchedulerRequestModel,
    editable: bool = True,
) -> SchedulerResponseModel:
    """Modify and display channel schedule"""

    if not (channel := nebula.settings.get_playout_channel(request.id_channel)):
        raise nebula.BadRequestException(f"No such channel {request.id_channel}")

    if request.date:
        start_time = parse_rundown_date(request.date, channel)
        end_time = start_time + (request.days * 86400)
    else:
        start_time = end_time = None

    changed_event_ids = []

    #
    # Delete events
    #

    if request.delete and editable:
        deleted_event_ids = await delete_events(request.delete)
        changed_event_ids.extend(deleted_event_ids)
    #
    # Create / update events
    #

    for event_data in request.events:
        if not editable:
            # weird syntax, but keeps indentation level low
            break

        event_at_position = await get_event_at_time(channel.id, event_data.start)

        if event_at_position and event_at_position.id != event_data.id:
            # Replace event at position

            if event_data.asset_id:
                # Replace event with another asset.
                # This should be supported, but is not yet.

                if event_data.asset_id == event_at_position["id_asset"]:
                    # Replace event with itself. This is a no-op.
                    continue

                raise nebula.NotImplementedException("Replacing events not supported")
                asset = await nebula.Asset.load(event_data.asset_id)

                assert asset
                # TODO: Implement replacing events

            else:
                # Replace event with an event without an asset.
                # This does not make sense so it is not supported
                raise nebula.BadRequestException("Replacing events is not supported")

        elif event_data.id:
            # Update existing event
            event = await nebula.Event.load(event_data.id)
            event["start"] = event_data.start
            for field in channel.fields:
                if event_data.meta and (field.name in event_data.meta):
                    event[field.name] = event_data.meta[field.name]
            await event.save()

        else:
            # create new event
            await create_new_event(channel, event_data)

    # Return existing events

    if start_time is not None:
        events = await get_events_in_range(channel.id, start_time, end_time)
    else:
        events = []
    return SchedulerResponseModel(
        events=[e.meta for e in events],
        affected_events=changed_event_ids,
    )
