__all__ = ["api_order"]

from nxtools import logging, log_traceback

from nx.core.common import NebulaResponse, config
from nx.db import DB
from nx.objects import Asset, Item, anonymous
from nx.helpers import bin_refresh

from nx.core.enum import ObjectStatus, ContentType, MediaType, JobState

# Backward compatibiliety
OFFLINE = 0
ONLINE = 1
CREATING = 2  # File exists, but was changed recently.
TRASHED = 3  # File has been moved to trash location.
ARCHIVED = 4  # File has been moved to archive location.
RESET = 5  # Reset metadata action has been invoked.
CORRUPTED = 6
REMOTE = 7
UNKNOWN = 8
AIRED = 9  # Auxiliary value.
ONAIR = 10
RETRIEVING = 11
AUDIO = 1
VIDEO = 2
IMAGE = 3
TEXT = 4
DATABROADCASTING = 5
INTERSTITIAL = 6
EDUCATION = 7
APPLICATION = 8
GAME = 9
PACKAGE = 10
PENDING = 0
IN_PROGRESS = 1
COMPLETED = 2
FAILED = 3
ABORTED = 4
RESTART = 5
SKIPPED = 6
VIRTUAL = 0
FILE = 1
URI = 2


def api_order(**kwargs):
    """
    Changes order of items in bin/rundown, creates new items from assets
    """

    id_channel = kwargs.get("id_channel", 0)
    id_bin = kwargs.get("id_bin", False)
    order = kwargs.get("order", [])
    db = kwargs.get("db", DB())
    user = kwargs.get("user", anonymous)
    initiator = kwargs.get("initiator", None)

    if not user:
        return NebulaResponse(401)

    if not id_channel in config["playout_channels"]:
        return NebulaResponse(400, f"No such channel ID {id_channel}")

    playout_config = config["playout_channels"][id_channel]
    append_cond = playout_config.get("rundown_accepts", "True")

    if id_channel and not user.has_right("rundown_edit", id_channel):
        return NebulaResponse(403, "You are not allowed to edit this rundown")

    if not (id_bin and order):
        return NebulaResponse(
            400, f'Bad "order" request<br>id_bin: {id_bin}<br>order: {order}'
        )

    logging.info(f"{user} executes bin_order method")
    affected_bins = [id_bin]
    pos = 1
    rlen = float(len(order))
    for i, obj in enumerate(order):
        object_type = obj["object_type"]
        id_object = obj["id_object"]
        meta = obj["meta"]

        if object_type == "item":
            if not id_object:
                item = Item(db=db)
                item["id_asset"] = obj.get("id_asset", 0)
                item.meta.update(meta)
            else:
                item = Item(id_object, db=db)
                if not item["id_bin"]:
                    logging.error(
                        f"Attempted asset data insertion ({object_type} ID {id_object} {meta}) to item. This should never happen"
                    )
                    continue

                if not item:
                    logging.debug(f"Skipping {item}")
                    continue

            if not item["id_bin"] in affected_bins:
                if item["id_bin"]:
                    affected_bins.append(item["id_bin"])

        elif object_type == "asset":
            asset = Asset(id_object, db=db)
            if not asset:
                logging.error(
                    f"Unable to append {object_type} ID {id_object}. Asset does not exist"
                )
                continue
            try:
                can_append = eval(append_cond)
            except Exception:
                log_traceback(
                    "Unable to evaluate rundown accept condition: {append_cond}"
                )
                continue
            if not can_append:
                logging.error(f"Unable to append {asset}. Does not match conditions.")
                continue
            item = Item(db=db)
            for key in meta:
                if key in ["id", "id_bin", "id_asset"]:
                    continue
                item[key] = meta[key]
            item["id_asset"] = asset.id
            item.meta.update(meta)
        else:
            logging.error(
                f"Unable to append {object_type} ID {id_object} {meta}. Unexpected object"
            )
            continue

        if not item or item["position"] != pos or item["id_bin"] != id_bin:
            item["position"] = pos
            item["id_bin"] = id_bin
            # bin_refresh called later should be enough to trigger rundown reload
            item.save(notify=False)
        pos += 1

    # Update bin duration
    bin_refresh(affected_bins, db=db, initiator=initiator)

    return NebulaResponse(200)
