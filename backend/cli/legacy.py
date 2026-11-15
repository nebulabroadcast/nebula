"""Arguments of site CLI plugins that aren't Typer applications.

Such a plugin has `async def main(self, ...)` and is called with
`key=value` (or `--key=value`) words, as before the CLI used Typer.
"""

import inspect
from collections.abc import Callable
from typing import Any

BOOL_VALUES = {
    "true": True,
    "1": True,
    "yes": True,
    "false": False,
    "0": False,
    "no": False,
}


class ArgumentError(Exception):
    pass


def describe_parameters(main: Callable[..., Any]) -> str:
    names = [
        name
        for name, parameter in inspect.signature(main).parameters.items()
        if parameter.kind is not inspect.Parameter.VAR_KEYWORD
    ]
    return ", ".join(names) if names else "none"


def convert(key: str, value: str, default: Any) -> Any:
    """`value` as the type of the parameter's default, when that is simple."""
    try:
        # bool first: it is an int too
        if isinstance(default, bool):
            return BOOL_VALUES[value.lower()]
        if isinstance(default, int):
            return int(value)
        if isinstance(default, float):
            return float(value)
    except (KeyError, ValueError) as e:
        expected = type(default).__name__
        raise ArgumentError(f"'{key}' must be {expected}, got '{value}'") from e
    return value


def parse_arguments(main: Callable[..., Any], words: list[str]) -> dict[str, Any]:
    """Keyword arguments for a plugin's `main` from command line words."""
    parameters = inspect.signature(main).parameters
    accepts_any = any(
        parameter.kind is inspect.Parameter.VAR_KEYWORD
        for parameter in parameters.values()
    )

    kwargs: dict[str, Any] = {}
    for word in words:
        if "=" not in word:
            raise ArgumentError(f"Expected key=value, got '{word}'")
        key, value = word.split("=", 1)
        key = key.lstrip("-")
        parameter = parameters.get(key)
        if parameter is None or parameter.kind is inspect.Parameter.VAR_KEYWORD:
            if not accepts_any:
                raise ArgumentError(
                    f"Unknown argument '{key}'. Arguments: {describe_parameters(main)}"
                )
            kwargs[key] = value
        else:
            kwargs[key] = convert(key, value, parameter.default)
    return kwargs
