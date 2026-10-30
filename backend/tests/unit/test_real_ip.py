"""server.utils.get_real_ip: which X-Forwarded-For entry to trust."""

import pytest
from starlette.requests import Request

import nebula
from server.utils import get_real_ip

PROXY = "172.18.0.5"  # e.g. a reverse proxy container
CLIENT = "8.8.8.8"


def request(peer: str, xff: str | None = None) -> Request:
    headers = [(b"x-forwarded-for", xff.encode())] if xff is not None else []
    return Request(
        {"type": "http", "client": (peer, 1234), "headers": headers},
    )


def test_one_proxy() -> None:
    assert get_real_ip(request(PROXY, CLIENT)) == CLIENT
    # Entries before the proxy's own are written by the client
    assert get_real_ip(request(PROXY, f"10.0.0.1, {CLIENT}")) == CLIENT


def test_no_proxy() -> None:
    assert get_real_ip(request(CLIENT)) == CLIENT
    # Straight from the internet: the header is the client's own claim
    assert get_real_ip(request(CLIENT, "10.0.0.1")) == CLIENT


def test_more_proxies(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(nebula.config._config, "trusted_proxies", 2)  # noqa: SLF001
    xff = f"10.0.0.1, {CLIENT}, 198.51.100.1"
    assert get_real_ip(request(PROXY, xff)) == CLIENT


def test_proxies_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(nebula.config._config, "trusted_proxies", 0)  # noqa: SLF001
    assert get_real_ip(request(PROXY, CLIENT)) == PROXY
