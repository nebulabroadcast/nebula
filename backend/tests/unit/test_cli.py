"""`python -m cli`: built-in commands and site plugins (spec 012)."""

import asyncio
from collections.abc import Coroutine
from typing import Any

import pytest
import typer
from typer.testing import CliRunner

import nebula
from cli.app import build_app
from cli.legacy import ArgumentError, parse_arguments
from cli.run import run_async
from nebula.plugins import CLIPlugin
from nebula.version import __version__

runner = CliRunner()


@pytest.fixture(autouse=True)
def _no_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    """nebula.run loads settings from the database: just run the coroutine."""

    def run(entrypoint: Coroutine[Any, Any, Any]) -> None:
        asyncio.run(entrypoint)

    monkeypatch.setattr(nebula, "run", run)


#
# Arguments of site plugins without a Typer application
#


async def main(
    limit: int = 5,
    ratio: float = 1.0,
    dry: bool = False,
    title: str = "x",
    target: Any = None,
) -> None:
    _ = limit, ratio, dry, title, target


async def main_any(limit: int = 5, **kwargs: Any) -> None:
    _ = limit, kwargs


def test_key_value_words_become_keyword_arguments() -> None:
    assert parse_arguments(main, ["title=abc", "--target=a=b"]) == {
        "title": "abc",
        "target": "a=b",
    }


def test_values_are_converted_to_the_type_of_the_default() -> None:
    assert parse_arguments(main, ["limit=10", "ratio=2.5", "--dry=true"]) == {
        "limit": 10,
        "ratio": 2.5,
        "dry": True,
    }
    assert parse_arguments(main, ["dry=no"]) == {"dry": False}
    # No default type to go by: stays a string
    assert parse_arguments(main, ["target=10"]) == {"target": "10"}


@pytest.mark.parametrize(
    ("words", "message"),
    [
        (["limit=many"], "'limit' must be int"),
        (["dry=maybe"], "'dry' must be bool"),
        (["nope=1"], "Arguments: limit, ratio, dry, title, target"),
        (["sync"], "Expected key=value"),
        (["--flag"], "Expected key=value"),
    ],
)
def test_invalid_arguments(words: list[str], message: str) -> None:
    with pytest.raises(ArgumentError, match=message):
        parse_arguments(main, words)


def test_main_with_kwargs_accepts_any_key() -> None:
    assert parse_arguments(main_any, ["limit=3", "anything=1"]) == {
        "limit": 3,
        "anything": "1",
    }


#
# The application
#


class Legacy(CLIPlugin):
    """An old style plugin."""

    name = "legacy"
    calls: list[tuple[Any, Any]] = []

    async def main(self, limit: int = 5, dry: bool = False) -> None:
        self.calls.append((limit, dry))


def typer_plugin() -> CLIPlugin:
    app = typer.Typer()

    @app.command()
    @run_async
    async def sync(limit: int = 0, retry_failed: bool = False) -> None:
        typer.echo(f"sync {limit!r} {retry_failed!r}")

    @app.command()
    def status() -> None:
        typer.echo("status")

    class Modern(CLIPlugin):
        """A plugin with sub-commands."""

        name = "modern"

    plugin = Modern()
    plugin.app = app
    return plugin


def test_no_command_lists_built_in_and_site_commands() -> None:
    result = runner.invoke(build_app([Legacy(), typer_plugin()]), [])
    assert "version" in result.output
    assert "legacy" in result.output
    assert "An old style plugin." in result.output
    assert "modern" in result.output


def test_built_in_command() -> None:
    result = runner.invoke(build_app([]), ["version"])
    assert result.exit_code == 0
    assert result.output.strip() == __version__


def test_unknown_command_exits_2() -> None:
    result = runner.invoke(build_app([]), ["nope"])
    assert result.exit_code == 2
    assert "No such command" in result.output


def test_site_plugin_gets_converted_key_value_arguments() -> None:
    Legacy.calls.clear()
    result = runner.invoke(build_app([Legacy()]), ["legacy", "limit=10", "--dry=true"])
    assert result.exit_code == 0, result.output
    assert Legacy.calls == [(10, True)]


def test_site_plugin_unknown_argument_names_the_parameters() -> None:
    Legacy.calls.clear()
    result = runner.invoke(build_app([Legacy()]), ["legacy", "nope=1"])
    assert result.exit_code == 2
    assert "Arguments: limit, dry" in result.output
    assert Legacy.calls == []


def test_site_plugin_help_names_its_arguments() -> None:
    result = runner.invoke(build_app([Legacy()]), ["legacy", "--help"])
    assert result.exit_code == 0
    assert "An old style plugin." in result.output
    assert "limit, dry" in result.output


def test_site_plugin_with_typer_app_is_mounted() -> None:
    app = build_app([typer_plugin()])
    result = runner.invoke(app, ["modern", "sync", "--limit", "3", "--retry-failed"])
    assert result.exit_code == 0, result.output
    assert result.output.strip() == "sync 3 True"
    assert runner.invoke(app, ["modern", "status"]).output.strip() == "status"
    assert runner.invoke(app, ["modern", "sync", "--nope"]).exit_code == 2


def test_site_plugin_shadows_a_built_in_command(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    warnings: list[str] = []
    monkeypatch.setattr(nebula.log, "warning", warnings.append)

    class Version(CLIPlugin):
        name = "version"

        async def main(self) -> None:
            typer.echo("site version")

    result = runner.invoke(build_app([Version()]), ["version"])
    assert result.output.strip() == "site version"
    assert any("shadowed" in warning for warning in warnings)


def test_failing_command_exits_1(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(nebula.log, "traceback", lambda *_: "")

    class Failing(CLIPlugin):
        name = "failing"

        async def main(self) -> None:
            raise RuntimeError("boom")

    result = runner.invoke(build_app([Failing()]), ["failing"])
    assert result.exit_code == 1
