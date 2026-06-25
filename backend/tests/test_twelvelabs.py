"""Tests for the opt-in TwelveLabs (Pegasus) analysis endpoint.

The default tests are fully offline: they patch the TwelveLabs SDK and assert
the upload -> wait-for-ready -> analyze wiring. A second, opt-in test runs a
real Pegasus analysis and is skipped unless ``TWELVELABS_API_KEY`` is set.
"""

import os
import tempfile
import types
import urllib.request
from unittest import mock

import pytest

import nebula
from api.analyze_twelvelabs import analyze_twelvelabs as mod


def _patch_sdk(monkeypatch, *, status="ready"):
    """Patch the SDK symbols imported into the module. Returns recorded calls."""
    calls: dict = {}

    class FakeAssets:
        def create(self, *, method, file):
            calls["create"] = {"method": method, "file": file}
            return types.SimpleNamespace(id="asset123")

        def retrieve(self, asset_id):
            calls["retrieve"] = asset_id
            return types.SimpleNamespace(status=status)

    class FakeClient:
        def __init__(self, *, api_key):
            calls["api_key"] = api_key
            self.assets = FakeAssets()

        def analyze(self, *, model_name, video, prompt, max_tokens):
            calls["analyze"] = {
                "model_name": model_name,
                "asset_id": video.asset_id,
                "prompt": prompt,
                "max_tokens": max_tokens,
            }
            return types.SimpleNamespace(data="  A test description.  ")

    class FakeVideoContext:
        def __init__(self, *, asset_id):
            self.asset_id = asset_id

    monkeypatch.setattr(mod, "TwelveLabs", FakeClient)
    monkeypatch.setattr(mod, "VideoContext_AssetId", FakeVideoContext)
    return calls


def test_analyze_media_wiring(tmp_path, monkeypatch):
    calls = _patch_sdk(monkeypatch)
    monkeypatch.setattr(nebula.config, "twelvelabs_api_key", "secret-key")

    video = tmp_path / "proxy.mp4"
    video.write_bytes(b"fake")

    text = mod.analyze_media(str(video), "describe it", 512, "pegasus1.5")

    assert text == "A test description."  # stripped
    assert calls["create"]["method"] == "direct"
    assert calls["retrieve"] == "asset123"
    assert calls["analyze"] == {
        "model_name": "pegasus1.5",
        "asset_id": "asset123",
        "prompt": "describe it",
        "max_tokens": 512,
    }
    # The configured key is forwarded to the client, never hard-coded.
    assert calls["api_key"] == "secret-key"


def test_analyze_media_failed_status(tmp_path, monkeypatch):
    _patch_sdk(monkeypatch, status="failed")
    monkeypatch.setattr(nebula.config, "twelvelabs_api_key", "secret-key")

    video = tmp_path / "proxy.mp4"
    video.write_bytes(b"fake")

    with pytest.raises(RuntimeError):
        mod.analyze_media(str(video), "describe it", 512, "pegasus1.5")


@pytest.mark.asyncio
async def test_endpoint_requires_configuration(monkeypatch):
    monkeypatch.setattr(nebula.config, "twelvelabs_api_key", None)

    endpoint = mod.AnalyzeTwelveLabs()
    user = mock.MagicMock()
    with pytest.raises(nebula.NotImplementedException):
        await endpoint.handle(mod.AnalyzeTwelveLabsRequest(id_asset=1), user)


@pytest.mark.skipif(
    not os.environ.get("TWELVELABS_API_KEY"),
    reason="TWELVELABS_API_KEY not set",
)
def test_real_pegasus_analysis(monkeypatch):
    """Smoke test against the real API. Skipped unless a key is present."""
    monkeypatch.setattr(
        nebula.config, "twelvelabs_api_key", os.environ["TWELVELABS_API_KEY"]
    )

    url = "https://download.samplelib.com/mp4/sample-5s.mp4"
    with tempfile.NamedTemporaryFile(suffix=".mp4") as tmp:
        urllib.request.urlretrieve(url, tmp.name)  # noqa: S310
        text = mod.analyze_media(
            tmp.name, "Describe this video in one sentence.", 512, "pegasus1.5"
        )
    assert isinstance(text, str)
    assert text
