"""Which assets a channel accepts (scheduler_accepts, rundown_accepts)."""

import pytest

import nebula
from nebula.enum import ContentType, MediaType
from nebula.helpers.scheduling import can_append, ensure_can_schedule, rejection
from nebula.settings.models import AcceptModel, PlayoutChannelSettings


def asset(**meta: object) -> nebula.Asset:
    return nebula.Asset(
        meta={
            "id": 1,
            "title": "Clip",
            "id_folder": 1,
            "media_type": MediaType.FILE,
            "content_type": ContentType.VIDEO,
            **meta,
        }
    )


@pytest.mark.parametrize(
    ("meta", "conditions", "reason"),
    [
        ({}, AcceptModel(), None),
        ({"content_type": ContentType.AUDIO}, AcceptModel(), "audio assets"),
        ({"media_type": MediaType.VIRTUAL}, AcceptModel(), "virtual assets"),
        ({"id_folder": 2}, AcceptModel(folders=[1]), "folder"),
        ({"id_folder": 2}, AcceptModel(folders=None), None),
    ],
)
def test_rejection(
    meta: dict[str, object], conditions: AcceptModel, reason: str | None
) -> None:
    found = rejection(asset(**meta), conditions)
    if reason is None:
        assert found is None
    else:
        assert found is not None
        assert reason in found
    assert can_append(asset(**meta), conditions) is (reason is None)


def test_ensure_can_schedule() -> None:
    channel = PlayoutChannelSettings.model_construct(scheduler_accepts=AcceptModel())
    ensure_can_schedule(asset(), channel)
    with pytest.raises(nebula.ValidationException, match="audio assets"):
        ensure_can_schedule(asset(content_type=ContentType.AUDIO), channel)
