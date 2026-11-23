"""Server restart and settings reload (spec 013)."""

import os
import signal
import time
from pathlib import Path
from typing import Any

import pytest

import nebula
import rest.server
import server.restart
from nebula.context import RequestContext, request_context
from rest.server import reload_settings, restart
from server.restart import restart_replica

ADMIN = nebula.User(meta={"id": 1, "login": "admin", "is_admin": True})
USER = nebula.User(meta={"id": 2, "login": "user"})


@pytest.fixture
def signals(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> list[tuple[int, int]]:
    sent: list[tuple[int, int]] = []
    pid_file = tmp_path / "gunicorn.pid"
    pid_file.write_text("4242\n")
    monkeypatch.setattr(server.restart, "GUNICORN_PID_FILE", str(pid_file))
    monkeypatch.setattr(server.restart, "MARKER_FILE", str(tmp_path / "restart-{id}"))
    monkeypatch.setattr(
        server.restart.os, "kill", lambda pid, sig: sent.append((pid, sig))
    )
    return sent


def test_one_signal_per_restart(signals: list[tuple[int, int]]) -> None:
    restart_replica("abc")
    restart_replica("abc")  # another worker of the same replica
    assert signals == [(4242, signal.SIGHUP)]
    restart_replica("def")  # the next restart
    assert len(signals) == 2


def test_without_gunicorn_nothing_happens(
    signals: list[tuple[int, int]], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(server.restart, "GUNICORN_PID_FILE", "/nonexistent/pid")
    restart_replica("abc")
    assert signals == []


def test_message_id_is_sanitized(signals: list[tuple[int, int]]) -> None:
    restart_replica("../../etc/passwd")
    restart_replica("")
    restart_replica("/")
    assert len(signals) == 1  # only the first had anything left of its id


def test_old_markers_are_pruned(signals: list[tuple[int, int]], tmp_path: Path) -> None:
    restart_replica("old")
    old = tmp_path / "restart-old"
    stale = time.time() - server.restart.MARKER_TTL - 1
    os.utime(old, (stale, stale))
    restart_replica("recent")
    restart_replica("new")
    assert not old.exists()
    assert (tmp_path / "restart-recent").exists()  # still deduplicating
    assert len(signals) == 3


@pytest.fixture
def published(monkeypatch: pytest.MonkeyPatch) -> list[tuple[str, dict[str, Any]]]:
    sent: list[tuple[str, dict[str, Any]]] = []

    async def msg(topic: str, **data: Any) -> None:
        sent.append((topic, data))

    async def reload_everywhere() -> None:
        await msg("server.reload_settings")

    async def client_settings(_request: Any, user: nebula.User) -> str:
        return f"settings for {user.meta['login']}"

    monkeypatch.setattr(nebula, "msg", msg)
    monkeypatch.setattr(rest.server, "reload_settings_everywhere", reload_everywhere)
    monkeypatch.setattr(rest.server, "get_user_client_settings", client_settings)
    return sent


@pytest.mark.asyncio
async def test_endpoints_publish_for_admins(
    published: list[tuple[str, dict[str, Any]]],
) -> None:
    with request_context(RequestContext(user=ADMIN)):
        await restart()
        settings = await reload_settings(None, ADMIN)  # type: ignore[arg-type]
    assert settings == "settings for admin"  # the reloaded settings
    assert [topic for topic, _ in published] == [
        "server.restart",
        "server.reload_settings",
    ]
    assert published[0][1]["id"]


@pytest.mark.asyncio
async def test_endpoints_refuse_other_users(
    published: list[tuple[str, dict[str, Any]]],
) -> None:
    with request_context(RequestContext(user=USER)):
        with pytest.raises(nebula.ForbiddenException):
            await restart()
        with pytest.raises(nebula.ForbiddenException):
            await reload_settings(None, USER)  # type: ignore[arg-type]
    assert published == []
