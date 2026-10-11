from typing import Any

import pytest
from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel

import nebula
from server.errors import REST_PREFIX, install_error_handlers

PROBLEM_JSON = "application/problem+json"


class Payload(BaseModel):
    name: str
    count: int


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()
    install_error_handlers(app)

    router = APIRouter(prefix="/things")

    @router.get("/missing")
    async def missing() -> None:
        raise nebula.NotFoundException("Thing 1 not found")

    @router.post("")
    async def create(payload: Payload) -> Payload:
        return payload

    @router.get("/crash")
    async def crash() -> None:
        raise RuntimeError("secret internals")

    app.include_router(router, prefix=REST_PREFIX)
    app.include_router(router, prefix="/api")  # stands in for the RPC API
    return TestClient(app, raise_server_exceptions=False)


def problem(response: Any) -> dict[str, Any]:
    assert response.headers["content-type"] == PROBLEM_JSON
    return response.json()  # type: ignore[no-any-return]


def test_nebula_exception(client: TestClient) -> None:
    response = client.get(f"{REST_PREFIX}/things/missing")
    assert response.status_code == 404
    assert problem(response) == {
        "type": "about:blank",
        "title": "Not Found",
        "status": 404,
        "detail": "Thing 1 not found",
        "instance": f"{REST_PREFIX}/things/missing",
    }


def test_validation_error(client: TestClient) -> None:
    response = client.post(f"{REST_PREFIX}/things", json={"name": "x", "count": "a"})
    assert response.status_code == 422
    body = problem(response)
    assert body["status"] == 422
    assert len(body["errors"]) == 1
    assert body["errors"][0]["loc"] == ["body", "count"]
    assert body["detail"] == body["errors"][0]["msg"]


def test_multiple_validation_errors(client: TestClient) -> None:
    response = client.post(f"{REST_PREFIX}/things", json={})
    body = problem(response)
    assert len(body["errors"]) == 2
    assert body["detail"] == "Request validation failed (2 errors)"


def test_unknown_route(client: TestClient) -> None:
    response = client.get(f"{REST_PREFIX}/nothing")
    assert response.status_code == 404
    assert problem(response)["detail"] == "Resource not found"


def test_method_not_allowed(client: TestClient) -> None:
    response = client.delete(f"{REST_PREFIX}/things")
    assert response.status_code == 405
    assert problem(response)["title"] == "Method Not Allowed"
    assert response.headers["allow"] == "POST"


def test_unhandled_exception_hides_details(client: TestClient) -> None:
    response = client.get(f"{REST_PREFIX}/things/crash")
    assert response.status_code == 500
    assert problem(response)["detail"] == "Internal server error"


def test_rpc_api_keeps_its_error_format(client: TestClient) -> None:
    response = client.get("/api/things/missing")
    assert response.status_code == 404
    assert response.headers["content-type"] == "application/json"
    assert response.json() == {
        "code": 404,
        "detail": "Thing 1 not found",
        "path": "/api/things/missing",
        "method": "GET",
    }

    response = client.post("/api/things", json={})
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], list)  # FastAPI's default
