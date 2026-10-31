"""SSO callback failures send the user back to the login page. No provider."""

from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from authlib.integrations.base_client import MismatchingStateError
from starlette.requests import Request

import api.auth.sso
import nebula
from api.auth.sso import SSOLoginCallback
from nebula.helpers import avatars
from server.session import Session
from server.sso import NebulaSSO

pytestmark = pytest.mark.asyncio


class FakeRemote:
    async def authorize_access_token(self, _request: Request) -> Any:
        # As authlib does for a callback URL opened twice, or a forged one
        raise MismatchingStateError


@pytest.fixture(autouse=True)
def remote(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(NebulaSSO, "client", lambda _provider: FakeRemote())


async def callback(query: str) -> str:
    request = Request({"type": "http", "query_string": query.encode(), "headers": []})
    response = await SSOLoginCallback().handle(request, "google")
    return response.headers["location"]


async def test_user_cancels() -> None:
    location = await callback("error=access_denied")
    assert location == "/?error=Invalid%20response%20from%20provider"


async def test_id_token_in_url() -> None:
    # Only the code flow is supported: a bare id_token is not a login
    location = await callback("id_token=x")
    assert location == "/?error=Invalid%20response%20from%20provider"


async def test_provider_error() -> None:
    assert await callback("code=x&state=forged") == "/?error=Login%20failed"


@pytest.mark.parametrize("verified", [False, "false"])
async def test_unverified_email(
    monkeypatch: pytest.MonkeyPatch, verified: bool | str
) -> None:
    # Providers with self-registration let anyone claim any email
    class Remote:
        async def authorize_access_token(self, _request: Request) -> Any:
            return {
                "userinfo": {"email": "admin@example.com", "email_verified": verified}
            }

    monkeypatch.setattr(NebulaSSO, "client", lambda _provider: Remote())
    assert await callback("code=x") == "/?error=Email%20not%20verified"


@pytest.mark.parametrize("has_avatar", [False, True])
async def test_picture_becomes_missing_avatar(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, has_avatar: bool
) -> None:
    user = nebula.User(meta={"id": 2, "login": "alice"})
    fetched: list[str] = []
    if has_avatar:
        (tmp_path / "2.webp").touch()

    class Remote:
        async def authorize_access_token(self, _request: Request) -> Any:
            info = {"email": "alice@example.com", "picture": "https://pic/alice"}
            return {"userinfo": info}

    async def by_email(_cls: Any, _email: str) -> nebula.User:
        return user

    async def create(_cls: Any, *_: Any, **__: Any) -> Any:
        return SimpleNamespace(token="t")  # noqa: S106

    async def fetch(_user: nebula.User, url: str) -> None:
        fetched.append(url)

    monkeypatch.setattr(NebulaSSO, "client", lambda _provider: Remote())
    monkeypatch.setattr(nebula.User, "by_email", classmethod(by_email))
    monkeypatch.setattr(Session, "create", classmethod(create))
    monkeypatch.setattr(api.auth.sso, "fetch_avatar", fetch)
    monkeypatch.setattr(
        api.auth.sso, "avatar_path", lambda u: str(tmp_path / f"{u.id}.webp")
    )
    assert await callback("code=x") == "/?authorize=t"
    assert fetched == ([] if has_avatar else ["https://pic/alice"])


async def test_avatar_url_must_be_https() -> None:
    user = nebula.User(meta={"id": 2, "login": "alice"})
    with pytest.raises(nebula.ValidationException):
        await avatars.fetch_avatar(user, "http://10.0.0.1/admin.png")
