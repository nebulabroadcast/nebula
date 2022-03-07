import sys

from nx.core.common import config
from nx.core.enum import ObjectStatus
from nx.objects import Asset
from nx.api.get import get_objects


def format_status(key, asset):
    colored = "\033[{}m{:<8}\033[0m"
    return {
        ObjectStatus.OFFLINE: colored.format(31, "OFFLINE"),
        ObjectStatus.ONLINE: colored.format(32, "ONLINE"),
        ObjectStatus.CREATING: colored.format(33, "CREATING"),
        ObjectStatus.TRASHED: colored.format(34, "TRASHED"),
        ObjectStatus.ARCHIVED: colored.format(34, "ARCHIVE"),
        ObjectStatus.RESET: colored.format(33, "RESET"),
    }[asset[key]]


def format_title(key, asset):
    return "{:<30}".format(asset[key])


formats = {
    "id": lambda key, asset: f"{asset[key]:<5}",
    "status": format_status,
    "title": format_title,
}


def a(*args):
    args = list(args)
    print()
    cols = ["id", "status", "title", "mtime"]

    if args and args[0].isdigit():
        id_view = int(args[0])
        if id_view in config["views"]:
            cols = config["views"][id_view]["columns"]
        args.pop(0)
    else:
        id_view = False

    if args:
        ft = " ".join(args)
    else:
        ft = False

    for _, asset in get_objects(Asset, order="id DESC", id_view=id_view, fulltext=ft):
        line = ""
        for key in cols:
            line += " " + str(
                formats[key](key, asset) if key in formats else asset.show(key)
            )
        line += "\n"
        line = line.lstrip()
        try:
            sys.stdout.write(line)
            sys.stdout.flush()
        except IOError:
            pass
