from typing import Annotated

import typer

import nebula
from nebula.plugins import CLIPlugin
from server.session import Session


class Passwd(CLIPlugin):
    """Set a new password of a user and log them out everywhere."""

    name = "passwd"

    async def main(
        self,
        login: Annotated[
            str | None, typer.Argument(help="Login name. Asked for when not given.")
        ] = None,
        password: Annotated[
            str | None,
            typer.Option(help="New password. Asked for (hidden) when not given."),
        ] = None,
    ) -> None:
        if login is None:
            login = typer.prompt("Login")
        try:
            user = await nebula.User.by_login(login.strip())
            if password is None:
                password = typer.prompt(
                    "New password", hide_input=True, confirmation_prompt=True
                )
            await user.change_password(password)
            await user.save()
        except nebula.NebulaException as e:
            # An unknown login, a short password...: a message, not a traceback
            typer.echo(f"Error: {e.detail}", err=True)
            raise typer.Exit(1) from e

        await Session.revoke_user(user.id)
        typer.echo(f"Password of '{user['login']}' changed")
