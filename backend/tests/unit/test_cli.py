"""`python -m cli`: built-in commands and site plugins (spec 012)."""

import asyncio
from collections.abc import Coroutine
from typing import Any

import pytest
import typer
from typer.testing import CliRunner

import nebula
from cli.app import build_app
from nebula.plugins import CLIPlugin
from nebula.version import __version__

runner = CliRunner()


@pytest.fixture(autouse=True)
def _no_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    """nebula.run loads settings from the database: just run the coroutine."""

    def run(entrypoint: Coroutine[Any, Any, Any]) -> None:
        asyncio.run(entrypoint)

    monkeypatch.setattr(nebula, "run", run)


class Typed(CLIPlugin):
    """A plugin with type hints."""

    name = "typed"
    calls: list[tuple[Any, ...]] = []

    async def main(self, folder: int, limit: int = 5, dry: bool = False) -> None:
        self.calls.append((folder, limit, dry))


class Group(CLIPlugin):
    """A plugin with sub-commands."""

    name = "group"
    calls: list[tuple[Any, ...]] = []

    async def sync(self, limit: int = 0, retry_failed: bool = False) -> None:
        """Make what is missing."""
        self.calls.append(("sync", limit, retry_failed))

    async def status(self) -> None:
        self.calls.append(("status",))

    async def _helper(self) -> None:
        raise AssertionError

    def not_a_command(self) -> None:
        raise AssertionError


@pytest.fixture(autouse=True)
def _clear_calls() -> None:
    for plugin in (Typed, Group):
        plugin.calls.clear()


def invoke(plugins: list[CLIPlugin], *words: str, **kwargs: Any) -> Any:
    return runner.invoke(build_app(plugins), list(words), **kwargs)


#
# The application
#


def test_no_command_lists_built_in_and_site_commands() -> None:
    result = invoke([Typed(), Group()])
    for expected in (
        "version",
        "adduser",
        "typed",
        "A plugin with type hints.",
        "group",
        "A plugin with sub-commands.",
    ):
        assert expected in result.output


def test_built_in_command() -> None:
    result = invoke([], "version")
    assert result.exit_code == 0
    assert result.output.strip() == __version__


def test_unknown_command_exits_2() -> None:
    result = invoke([], "nope")
    assert result.exit_code == 2
    assert "No such command" in result.output


def test_site_plugin_shadows_a_built_in_command(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    warnings: list[str] = []
    monkeypatch.setattr(nebula.log, "warning", warnings.append)

    class Version(CLIPlugin):
        name = "version"

        async def main(self) -> None:
            typer.echo("site version")

    assert invoke([Version()], "version").output.strip() == "site version"
    assert any("More than one" in warning for warning in warnings)


def test_first_site_plugin_of_a_name_wins(monkeypatch: pytest.MonkeyPatch) -> None:
    warnings: list[str] = []
    monkeypatch.setattr(nebula.log, "warning", warnings.append)

    def plugin(output: str) -> CLIPlugin:
        class Same(CLIPlugin):
            name = "same"

            async def main(self) -> None:
                typer.echo(output)

        return Same()

    assert invoke([plugin("first"), plugin("second")], "same").output.strip() == "first"
    assert any("More than one" in warning for warning in warnings)


def test_failing_command_exits_1(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(nebula.log, "traceback", lambda *_: "")

    class Failing(CLIPlugin):
        name = "failing"

        async def main(self) -> None:
            raise RuntimeError("boom")

    assert invoke([Failing()], "failing").exit_code == 1


def test_aborted_prompt_is_a_message_not_a_traceback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tracebacks: list[str] = []
    monkeypatch.setattr(nebula.log, "traceback", tracebacks.append)

    class Asking(CLIPlugin):
        name = "asking"

        async def main(self) -> None:
            raise typer.Abort  # what a prompt raises on Ctrl+C

    result = invoke([Asking()], "asking")
    assert result.exit_code == 1
    assert "Aborted" in result.output
    assert tracebacks == []


#
# Arguments
#


def test_type_hints_make_arguments_and_options() -> None:
    result = invoke([Typed()], "typed", "3", "--limit", "10", "--dry")
    assert result.exit_code == 0, result.output
    assert Typed.calls == [(3, 10, True)]


def test_parameter_without_default_is_required() -> None:
    result = invoke([Typed()], "typed")
    assert result.exit_code == 2
    assert "Missing argument" in result.output


@pytest.mark.parametrize("words", [["--limit", "many"], ["--nope"], ["stray"]])
def test_invalid_arguments_exit_2(words: list[str]) -> None:
    result = invoke([Typed()], "typed", "3", *words)
    assert result.exit_code == 2
    assert Typed.calls == []


def test_help_lists_the_options() -> None:
    result = invoke([Typed()], "typed", "--help")
    assert result.exit_code == 0
    assert "A plugin with type hints." in result.output
    assert "--limit" in result.output
    assert "--dry" in result.output


#
# A plugin without `main`: its methods are sub-commands
#


def test_methods_are_sub_commands() -> None:
    plugins = [Group()]
    result = invoke(plugins, "group", "sync", "--limit", "3", "--retry-failed")
    assert result.exit_code == 0, result.output
    assert invoke(plugins, "group", "status").exit_code == 0
    assert Group.calls == [("sync", 3, True), ("status",)]


def test_sub_command_list() -> None:
    result = invoke([Group()], "group")
    assert "sync" in result.output
    assert "Make what is missing." in result.output
    assert "status" in result.output
    assert "helper" not in result.output
    assert "not-a-command" not in result.output
    assert invoke([Group()], "group", "nope").exit_code == 2


#
# adduser
#


@pytest.fixture
def saved_users(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, Any]]:
    saved: list[dict[str, Any]] = []

    async def save(self: nebula.User, **_: Any) -> None:
        if self.meta["login"] == "taken":
            raise nebula.ConflictException("Login 'taken' is taken")
        self.meta["id"] = 7
        saved.append(dict(self.meta))

    monkeypatch.setattr(nebula.User, "save", save)
    return saved


def test_adduser_with_arguments(saved_users: list[dict[str, Any]]) -> None:
    result = invoke(
        [],
        "adduser",
        "jane",
        "--email",
        "jane@example.test",
        "--admin",
        input="secret-password\nsecret-password\n",
    )
    assert result.exit_code == 0, result.output
    assert "Created administrator 'jane' (id 7)" in result.output
    [meta] = saved_users
    assert meta["login"] == "jane"
    assert meta["email"] == "jane@example.test"
    assert meta["is_admin"] is True
    assert meta["password"].startswith("scrypt$")
    assert "secret-password" not in result.output


def test_adduser_asks_for_what_is_missing(saved_users: list[dict[str, Any]]) -> None:
    result = invoke([], "adduser", input="joe\n\nn\nsecret-password\nsecret-password\n")
    assert result.exit_code == 0, result.output
    [meta] = saved_users
    assert meta["login"] == "joe"
    assert "email" not in meta
    assert "is_admin" not in meta


@pytest.mark.parametrize(
    ("args", "message"),
    [
        (["jane", "--no-admin", "--password", "short"], "at least 8"),
        (["taken", "--no-admin", "--password", "long-enough"], "is taken"),
    ],
)
def test_adduser_errors_are_messages(
    saved_users: list[dict[str, Any]], args: list[str], message: str
) -> None:
    result = invoke([], "adduser", *args)
    assert result.exit_code == 1
    assert message in result.output
    assert saved_users == []
