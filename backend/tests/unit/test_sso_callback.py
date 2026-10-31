"""SSO callback failures send the user back to the login page. No provider."""

from typing import Any

import pytest
from authlib.integrations.base_client import MismatchingStateError
from starlette.requests import Request

from api.auth.sso import SSOLoginCallback
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
