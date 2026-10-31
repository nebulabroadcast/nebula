"""What the published package (nebulabroadcast-core) needs. No database."""

import subprocess
import sys
import tomllib
from pathlib import Path

import pytest

import nebula
from nebula.helpers.email import render_email_template

BACKEND = Path(__file__).parents[2]


def test_version_matches_pyproject() -> None:
    # The package is published with the pyproject version
    with (BACKEND / "pyproject.toml").open("rb") as f:
        assert nebula.__version__ == tomllib.load(f)["project"]["version"]


@pytest.mark.asyncio
async def test_email_templates_outside_backend(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.chdir(tmp_path)  # a service runs from anywhere
    msg = await render_email_template(
        "password-reset", full_name="Alice", reset_link="https://x/reset"
    )
    assert "Alice" in msg.as_string()


def python(*args: str) -> str:
    return subprocess.run(  # noqa: S603 (fixed arguments)
        [sys.executable, *args],
        cwd=BACKEND,
        capture_output=True,
        text=True,
        check=True,
    ).stdout


def test_version_flag() -> None:
    # Importing nebula must not exit a program that has its own --version
    assert python("-c", "import nebula; print('ok')", "--version") == "ok\n"
    assert python("-m", "nebula", "--version") == nebula.__version__
