from typing import Any


class CLIPlugin:
    """A command of `python -m cli <name>`.

    Either `async def main(self, ...)`, called with `key=value` arguments,
    or `app`: a `typer.Typer` application mounted under `name`.
    """

    name: str = "cli_plugin"
    # typer.Typer; untyped, so this package doesn't need Typer
    app: Any = None

    def __repr__(self) -> str:
        return f"<Nebula CLI plugin: {self.name}>"
