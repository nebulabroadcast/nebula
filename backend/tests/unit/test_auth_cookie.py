"""Cookie authentication: precedence, CSRF and cookie lifecycle.

Sessions and API keys are faked, so these tests need no database.
"""

from types import SimpleNamespace
from typing import Any

import pytest
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

import nebula
from api.auth.logout import Logout
from server.auth_cookie import AUTH_COOKIE_NAME, set_auth_cookie
from server.dependencies import CurrentUserOptional
from server.middleware.context import RequestContextMiddleware
from server.session import Session

COOKIE_TOKEN = "c" * 64
BEARER_TOKEN = "b" * 64
INVALID_TOKEN = "x" * 64
API_KEY = "valid-api-key"

SESSIONS = {
    COOKIE_TOKEN: {"id": 1, "login": "cookie_user"},
    BEARER_TOKEN: {"id": 2, "login": "bearer_user"},
}


pytestmark = pytest.mark.usefixtures("deleted_sessions")


@pytest.fixture
def deleted_sessions(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    deleted: list[str] = []

    async def check(token: str, _request: Any, _transient: bool = False) -> Any:
        if token in SESSIONS:
            return SimpleNamespace(user=SESSIONS[token])
        return None

    async def delete(token: str) -> None:
        deleted.append(token)

    async def by_api_key(api_key: str) -> nebula.User:
        if api_key == API_KEY:
            return nebula.User(meta={"id": 3, "login": "api_key_user"})
        raise nebula.NotFoundException

    monkeypatch.setattr(Session, "check", check)
    monkeypatch.setattr(Session, "delete", delete)
    monkeypatch.setattr(nebula.User, "by_api_key", by_api_key)
    return deleted


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()
    app.add_middleware(RequestContextMiddleware)

    @app.exception_handler(nebula.NebulaException)
    async def handler(_request: Request, exc: nebula.NebulaException) -> JSONResponse:
        return JSONResponse(status_code=exc.status, content={"detail": exc.detail})

    @app.api_route("/whoami", methods=["GET", "POST", "QUERY"])
    async def whoami(request: Request, user: CurrentUserOptional) -> dict[str, Any]:
        return {
            "user": user.name if user else None,
            "reason": request.state.unauthorized_reason,
        }

    @app.post("/login")
    async def login(request: Request) -> None:
        set_auth_cookie(request, COOKIE_TOKEN)

    app.add_api_route("/logout", Logout().handle, methods=["POST"])
    return TestClient(app)


def whoami(client: TestClient, method: str = "GET", **kwargs: Any) -> Any:
    return client.request(method, "/whoami", **kwargs).json()


def test_cookie_authenticates(client: TestClient) -> None:
    client.cookies.set(AUTH_COOKIE_NAME, COOKIE_TOKEN)
    assert whoami(client)["user"] == "cookie_user"


def test_no_credentials(client: TestClient) -> None:
    assert whoami(client) == {"user": None, "reason": "No access token provided"}


@pytest.mark.parametrize(
    ("kwargs", "expected"),
    [
        ({"headers": {"Authorization": f"Bearer {BEARER_TOKEN}"}}, "bearer_user"),
        ({"params": {"token": BEARER_TOKEN}}, "bearer_user"),
        ({"headers": {"x-api-key": API_KEY}}, "api_key_user"),
    ],
)
def test_explicit_credentials_win_over_cookie(
    client: TestClient, kwargs: dict[str, Any], expected: str
) -> None:
    client.cookies.set(AUTH_COOKIE_NAME, COOKIE_TOKEN)
    assert whoami(client, **kwargs)["user"] == expected


@pytest.mark.parametrize(
    "kwargs",
    [
        {"headers": {"Authorization": f"Bearer {INVALID_TOKEN}"}},
        {"params": {"token": INVALID_TOKEN}},
        {"headers": {"x-api-key": "wrong"}},
    ],
)
def test_invalid_explicit_credential_does_not_fall_back(
    client: TestClient, kwargs: dict[str, Any]
) -> None:
    client.cookies.set(AUTH_COOKIE_NAME, COOKIE_TOKEN)
    assert whoami(client, **kwargs)["user"] is None


def test_malformed_authorization_header_is_ignored(client: TestClient) -> None:
    # The frontend sends "Bearer null" when it has no token in local storage
    client.cookies.set(AUTH_COOKIE_NAME, COOKIE_TOKEN)
    headers = {"Authorization": "Bearer null"}
    assert whoami(client, headers=headers)["user"] == "cookie_user"


@pytest.mark.parametrize("site", ["same-origin", "same-site", "none", None])
def test_unsafe_method_allowed_unless_cross_site(
    client: TestClient, site: str | None
) -> None:
    client.cookies.set(AUTH_COOKIE_NAME, COOKIE_TOKEN)
    headers = {"Sec-Fetch-Site": site} if site else {}
    assert whoami(client, "POST", headers=headers)["user"] == "cookie_user"


def test_cross_site_unsafe_method_rejected(client: TestClient) -> None:
    client.cookies.set(AUTH_COOKIE_NAME, COOKIE_TOKEN)
    result = whoami(client, "POST", headers={"Sec-Fetch-Site": "cross-site"})
    assert result == {"user": None, "reason": "Cross-site request rejected"}


@pytest.mark.parametrize("method", ["GET", "QUERY"])
def test_cross_site_safe_method_allowed(client: TestClient, method: str) -> None:
    client.cookies.set(AUTH_COOKIE_NAME, COOKIE_TOKEN)
    result = whoami(client, method, headers={"Sec-Fetch-Site": "cross-site"})
    assert result["user"] == "cookie_user"


def test_cross_site_check_does_not_apply_to_explicit_credentials(
    client: TestClient,
) -> None:
    headers = {
        "Sec-Fetch-Site": "cross-site",
        "Authorization": f"Bearer {BEARER_TOKEN}",
    }
    assert whoami(client, "POST", headers=headers)["user"] == "bearer_user"


@pytest.mark.parametrize(
    ("forwarded_proto", "secure"), [(None, False), ("https", True)]
)
def test_login_sets_cookie(
    client: TestClient, forwarded_proto: str | None, secure: bool
) -> None:
    headers = {"X-Forwarded-Proto": forwarded_proto} if forwarded_proto else {}
    response = client.post("/login", headers=headers)
    set_cookie = response.headers["set-cookie"]
    assert set_cookie.startswith(f"{AUTH_COOKIE_NAME}={COOKIE_TOKEN};")
    assert "HttpOnly" in set_cookie
    assert "SameSite=lax" in set_cookie
    assert "Path=/" in set_cookie
    assert ("Secure" in set_cookie) is secure


def test_logout_deletes_sessions_and_clears_cookie(
    client: TestClient, deleted_sessions: list[str]
) -> None:
    client.cookies.set(AUTH_COOKIE_NAME, COOKIE_TOKEN)
    response = client.post(
        "/logout", headers={"Authorization": f"Bearer {BEARER_TOKEN}"}
    )
    assert response.status_code == 401
    assert response.json() == {"detail": "Logged out"}
    assert sorted(deleted_sessions) == sorted([COOKIE_TOKEN, BEARER_TOKEN])
    set_cookie = response.headers["set-cookie"]
    assert set_cookie.startswith(f'{AUTH_COOKIE_NAME}="";')
    assert "Max-Age=0" in set_cookie


def test_cross_site_logout_is_rejected(
    client: TestClient, deleted_sessions: list[str]
) -> None:
    client.cookies.set(AUTH_COOKIE_NAME, COOKIE_TOKEN)
    response = client.post("/logout", headers={"Sec-Fetch-Site": "cross-site"})
    assert response.status_code == 401
    assert deleted_sessions == []
    assert "set-cookie" not in response.headers
