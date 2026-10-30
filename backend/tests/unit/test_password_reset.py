"""Password reset email: where the link points. No database, no mail."""

from typing import Any

import pytest
from starlette.requests import Request

import nebula
from api.auth import password_reset
from api.auth.password_reset import PasswordReset
from nebula.helpers.tokens import ShortLivedToken

EVIL = b"https://evil.example/"

pytestmark = pytest.mark.asyncio


@pytest.fixture
def sent(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    links: list[str] = []

    async def fetchrow(*_: Any) -> dict[str, Any]:
        return {"meta": {"id": 1, "login": "admin", "email": "admin@example.com"}}

    async def create_token(*_: Any, **__: Any) -> ShortLivedToken:
        return ShortLivedToken("TOKEN", "password-reset", {}, 0, 0)

    async def render(*_: Any, reset_link: str, **__: Any) -> str:
        links.append(reset_link)
        return ""

    async def send_mail(*_: Any) -> None:
        pass

    monkeypatch.setattr(nebula.db, "fetchrow", fetchrow)
    monkeypatch.setattr(password_reset.TokenManager, "create", create_token)
    monkeypatch.setattr(password_reset, "render_email_template", render)
    monkeypatch.setattr(password_reset, "send_mail", send_mail)
    return links


async def request_reset() -> None:
    # An anonymous client controls every header
    headers = [(b"referer", EVIL), (b"x-forwarded-host", b"evil.example")]
    request = Request({"type": "http", "client": ("8.8.8.8", 1), "headers": headers})
    await PasswordReset().request_password_reset("admin@example.com", request)


async def test_link_uses_server_url(
    sent: list[str], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(nebula.config._config, "server_url", "https://nebula.tv/")  # noqa: SLF001
    await request_reset()
    assert sent == ["https://nebula.tv?rp=TOKEN"]


async def test_no_email_without_server_url(
    sent: list[str], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(nebula.config._config, "server_url", None)  # noqa: SLF001
    await request_reset()
    assert sent == []
