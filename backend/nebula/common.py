import hashlib
import importlib.util
import inspect
import json
import random
import sys
import time
from types import ModuleType
from typing import Any, Literal, TypeVar

T = TypeVar("T", bound=type)

SerializableValue = int | float | str | bool | dict[str, Any] | list[Any] | None


def json_loads(data: str | bytes) -> Any:
    """Load JSON data."""
    return json.loads(data)


def json_dumps(data: SerializableValue) -> str:
    """Dump JSON data."""
    return json.dumps(data)


def hash_data(data: SerializableValue) -> str:
    """Create a SHA-256 hash from arbitrary (json-serializable) data."""
    if not isinstance(data, str):
        data = json_dumps(data)
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


def create_hash() -> str:
    """Create a pseudo-random hash (used as and access token)."""
    return hash_data([time.time(), random.random()])


def sql_list(lst: list[Any], t: Literal["int", "str"] = "int") -> str:
    flist = [f"{val}" for val in lst] if t == "int" else [f"'{val}'" for val in lst]
    return f"({','.join(flist)})"


def import_module(name: str, path: str) -> ModuleType:
    if (spec := importlib.util.spec_from_file_location(name, path)) is None:
        raise ModuleNotFoundError(f"Module {name} not found")
    if (module := importlib.util.module_from_spec(spec)) is None:
        raise ImportError(f"Module {name} cannot be imported")
    if spec.loader is None:
        raise ImportError(f"Module {name} cannot be imported. No loader found.")
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def classes_from_module(superclass: T, module: ModuleType) -> list[T]:
    classes = []
    for name in dir(module):
        # It could be anything at this point
        obj = getattr(module, name)
        if not inspect.isclass(obj) or obj is superclass:
            continue
        if issubclass(obj, superclass):
            classes.append(obj)
    return classes  # type: ignore
