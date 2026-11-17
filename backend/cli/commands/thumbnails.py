from typing import Annotated

import typer

from nebula.plugins import CLIPlugin
from nebula.thumbnails import maintenance


class Thumbnails(CLIPlugin):
    """Asset thumbnails: counts, backfill and cleanup."""

    name = "thumbnails"

    async def status(self) -> None:
        """Count the thumbnails by state."""
        for state, count in (await maintenance.status()).items():
            typer.echo(f"{state:<9} {count}")

    async def sync(
        self,
        limit: Annotated[
            int, typer.Option(help="Stop after this many (0: no limit).")
        ] = 0,
        retry_failed: Annotated[
            bool, typer.Option(help="Try the ones that failed again.")
        ] = False,
    ) -> None:
        """Make the missing and stale thumbnails of online assets."""
        made = failed = 0
        async for id_asset, error in maintenance.sync(
            limit=limit, retry_failed=retry_failed
        ):
            if error is None:
                made += 1
            else:
                failed += 1
                typer.echo(f"Asset {id_asset}: {error}", err=True)
        typer.echo(f"Made {made}, failed {failed}")

    async def prune(self) -> None:
        """Delete thumbnails of assets that can't have one any more."""
        typer.echo(f"Deleted {await maintenance.prune()}")
