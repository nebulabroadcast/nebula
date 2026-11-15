from typing import Annotated

import typer

import nebula
from cli.run import run


async def create_user(
    login: str,
    password: str,
    *,
    email: str | None,
    full_name: str | None,
    admin: bool,
) -> nebula.User:
    user = nebula.User()
    user.apply_changes(
        {
            "login": login,
            "email": email or None,
            "full_name": full_name or None,
            "is_admin": True if admin else None,
        }
    )
    await user.change_password(password)
    await user.save()
    return user


async def add_user(
    login: str,
    password: str,
    *,
    email: str | None,
    full_name: str | None,
    admin: bool,
) -> None:
    try:
        user = await create_user(
            login, password, email=email, full_name=full_name, admin=admin
        )
    except nebula.NebulaException as e:
        # A taken login, a short password...: a message, not a traceback
        typer.echo(f"Error: {e.detail}", err=True)
        raise typer.Exit(1) from e
    role = "administrator" if admin else "user"
    typer.echo(f"Created {role} '{login}' (id {user.id})")


def command(
    login: Annotated[
        str | None, typer.Argument(help="Login name. Asked for when not given.")
    ] = None,
    email: Annotated[str | None, typer.Option(help="E-mail address.")] = None,
    full_name: Annotated[str | None, typer.Option(help="Full name.")] = None,
    admin: Annotated[
        bool | None,
        typer.Option(
            "--admin/--no-admin",
            help="Administrator rights. Asked for when not given.",
        ),
    ] = None,
    password: Annotated[
        str | None,
        typer.Option(help="Password. Asked for (hidden) when not given."),
    ] = None,
) -> None:
    """Create a user."""
    if login is None:
        login = typer.prompt("Login")
        if email is None:
            email = typer.prompt("E-mail (optional)", default="", show_default=False)
    login = login.strip()
    if not login:
        typer.echo("Error: Login can't be empty", err=True)
        raise typer.Exit(2)
    if admin is None:
        admin = typer.confirm("Administrator?", default=False)
    if password is None:
        password = typer.prompt("Password", hide_input=True, confirmation_prompt=True)

    run(
        add_user(
            login,
            password,
            email=email,
            full_name=full_name,
            admin=admin,
        )
    )
