import nebula
from nebula.helpers.create_new_event import create_new_event
from nebula.helpers.scheduling import parse_rundown_date

from .models import SchedulerRequestModel, SchedulerResponseModel
from .utils import delete_events, get_event_at_time, get_events_in_range


async def scheduler(
    request: SchedulerRequestModel,
    editable: bool = True,
    user: nebula.User | None = None,
) -> SchedulerResponseModel:
    """Modify and display channel schedule"""
    start_time: float | None = None
    end_time: float | None = None

    username = user.name if user else None

    if not (channel := nebula.settings.get_playout_channel(request.id_channel)):
        raise nebula.BadRequestException(f"No such channel {request.id_channel}")

    if request.date:
        start_time = parse_rundown_date(request.date, channel)
        end_time = start_time + (request.days * 86400)

    affected_events: list[int] = []
    affected_bins: list[int] = []

    #
    # Delete events
    #

    if request.delete and editable:
        deleted_event_ids = await delete_events(request.delete, user=user)
        affected_events.extend(deleted_event_ids)
    #
    # Create / update events
    #

    for event_data in request.events:
        if not editable:
            # weird syntax, but keeps indentation level low
            break

        event_at_position = await get_event_at_time(channel.id, event_data.start)

        if (event_at_position is not None) and event_at_position.id != event_data.id:
            # Replace event at position

            assert (
                event_at_position.id is not None
            ), "Event at position returned event without ID. This should not happen."
            affected_events.append(event_at_position.id)

            if event_data.id_asset:
                # Replace event with another asset.
                # This should be supported, but is not yet.

                if event_data.id_asset == event_at_position["id_asset"]:
                    # Replace event with itself. This is a no-op.
                    continue

                asset = await nebula.Asset.load(event_data.id_asset, username=username)
                assert asset

                # load the existing bin
                ex_bin = await nebula.Bin.load(
                    event_at_position["id_magic"], username=username
                )
                await ex_bin.get_items()

                for item in ex_bin.items:
                    if item["id_asset"] == event_at_position["id_asset"]:
                        # replace the asset in the bin
                        item["id_asset"] = event_data.id_asset
                        item["mark_in"] = asset["mark_in"]
                        item["mark_out"] = asset["mark_out"]
                        await item.save()
                        break
                else:
                    # no primary asset found, so append it
                    new_item = nebula.Item(username=username)
                    new_item["id_asset"] = event_data.id_asset
                    new_item["id_bin"] = ex_bin.id
                    new_item["position"] = len(ex_bin.items)
                    new_item["mark_in"] = asset["mark_in"]
                    new_item["mark_out"] = asset["mark_out"]
                    await new_item.save()
                    ex_bin.items.append(new_item)
                    assert (
                        ex_bin.id is not None
                    ), "Bin ID should not be None at this point"
                    affected_bins.append(ex_bin.id)

                # update the event
                event_at_position["id_asset"] = event_data.id_asset
                for field in channel.fields:
                    if field.name in ["color", "start", "stop", "promoted"]:
                        continue
                    event_at_position[field.name] = asset[field.name]
                affected_events.append(event_at_position.id)
                await ex_bin.save()
                await event_at_position.save()

                # TODO: Implement replacing events

            else:
                # Replace event with an event without an asset.
                # This does not make sense so it is not supported
                raise nebula.BadRequestException("Replacing events is not supported")

        elif event_data.id:
            # Update existing event
            event = await nebula.Event.load(event_data.id, username=username)
            event["start"] = event_data.start
            for field in channel.fields:
                if event_data.meta and (field.name in event_data.meta):
                    event[field.name] = event_data.meta[field.name]
            affected_events.append(event_data.id)
            await event.save(notify=False)

        else:
            # create new event
            await create_new_event(channel, event_data, user=user)

    # Return existing events

    if (start_time is not None) and (end_time is not None):
        events = await get_events_in_range(channel.id, start_time, end_time, user=user)
    else:
        events = []
    return SchedulerResponseModel(
        events=[e.meta for e in events],
        affected_events=affected_events,
        affected_bins=affected_bins,
    )
