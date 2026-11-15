import typer

from nebula.version import __version__


def command() -> None:
    """Print the Nebula version."""
    typer.echo(__version__)
