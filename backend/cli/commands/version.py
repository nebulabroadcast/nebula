import typer

from nebula.plugins import CLIPlugin
from nebula.version import __version__


class Version(CLIPlugin):
    """Print the Nebula version."""

    name = "version"

    async def main(self) -> None:
        typer.echo(__version__)
