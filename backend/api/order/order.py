import nebula
from nebula.exceptions import NotFoundException
from nebula.helpers.scheduling import can_append

from .models import OrderRequestModel, OrderResponseModel


async def set_rundown_order(
    request: OrderRequestModel,
    user: nebula.User,
) -> OrderResponseModel:
    if (channel := nebula.settings.get_playout_channel(request.id_channel)) is None:
        raise NotFoundException(f"Channel ID {request.id_channel} not found")

    id_bin = request.id_bin
    order = request.order

    affected_bins: list[int] = [id_bin]
    pos = 1

    pool = await nebula.db.pool()
    async with pool.acquire() as conn, conn.transaction():
        for obj in order:
            item: nebula.Item | None = None

            if obj.type == "item":
                if not obj.id:
                    # Adding a virtual item (such as placeholder)
                    item = nebula.Item.from_meta(
                        obj.meta,
                        connection=conn,
                        username=user.name,
                    )

                    assert isinstance(item, nebula.Item)  # mypy

                    # Empty event may not have id_bin set,
                    # but we know, where we are putting it.
                    item["id_bin"] = id_bin
                else:
                    # Moving an existing item
                    item = await nebula.Item.load(
                        obj.id, connection=conn, username=user.name
                    )
                    assert item is not None

                    if not item["id_bin"]:
                        nebula.log.error(
                            f"Attempted data insert TYPE: {obj.type} ID: {obj.id}"
                            f"META: {obj.meta} to item. This should never happen.",
                            user=user.name,
                        )
                        continue

                    if not item:
                        nebula.log.trace(f"Skipping {item}", user=user.name)
                        continue

                # Shut-up mypy
                assert item is not None, "Item should not be None at this point"
                assert item["id_bin"] is not None, "Item w/o bin. Shouldn't happen."

                if item["id_bin"] and (item["id_bin"] not in affected_bins):
                    affected_bins.append(item["id_bin"])

            elif obj.type == "asset":
                assert (
                    obj.id is not None
                ), "Asset ID must not be None when inserting asset to rundown"
                asset = await nebula.Asset.load(
                    obj.id,
                    connection=conn,
                    username=user.name,
                )
                if not asset:
                    nebula.log.error(
                        f"Unable to append {obj.type} ID {obj.id}. " f"Asset not found",
                        user=user.name,
                    )
                    continue

                if not can_append(asset, channel.rundown_accepts):
                    nebula.log.error(
                        f"Unable to append {obj.type} ID {obj.id}. "
                        f"Asset not allowed",
                        user=user.name,
                    )
                    continue

                item_meta = {**obj.meta}
                for key in ["id", "id_bin", "id_channel", "id_asset", "pos"]:
                    item_meta.pop(key, None)
                item = nebula.Item.from_meta(
                    item_meta,
                    connection=conn,
                    username=user.name,
                )
                assert item is not None, "Item should not be None at this point"
                item["id_asset"] = asset.id

            else:
                # Unsupported object type. This should never happen,
                # since the request is validated by pydantic.
                continue

            if (item is None) or item["position"] != pos or item["id_bin"] != id_bin:
                item["position"] = pos
                item["id_bin"] = id_bin

                # save item, but don't send a notification just yet.
                # we'll send one notification for all items in the bin
                item["updated_by"] = user.id
                await item.save(notify=False)
            pos += 1

    return OrderResponseModel(affected_bins=affected_bins)
