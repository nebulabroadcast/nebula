from nebula.enum import ObjectType
from nebula.objects.asset import Asset
from nebula.objects.base import BaseObject
from nebula.objects.bin import Bin
from nebula.objects.event import Event
from nebula.objects.item import Item
from nebula.objects.user import User

object_types = {
    ObjectType.ASSET: Asset,
    ObjectType.EVENT: Event,
    ObjectType.BIN: Bin,
    ObjectType.ITEM: Item,
    ObjectType.USER: User,
}


def get_object_class_by_name(name: ObjectType) -> type[BaseObject]:
    if name not in object_types:
        raise KeyError(f"Unknown object type: {name}")
    return object_types[name]
