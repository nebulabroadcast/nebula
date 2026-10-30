"""Applying a scheduling template needs scheduler edit rights. No database."""

from pathlib import Path

import pytest

import nebula
from api.scheduling_templates import _utils
from api.scheduling_templates._models import ApplySchedulingTemplateRequest
from api.scheduling_templates._utils import load_template
from api.scheduling_templates.scheduling_templates import ApplySchedulingTemplate

VIEWER = nebula.User(meta={"id": 2, "login": "viewer", "can/scheduler_view": True})
OTHER_CHANNEL = nebula.User(meta={"id": 3, "login": "c2", "can/scheduler_edit": [2]})


@pytest.mark.asyncio
@pytest.mark.parametrize("user", [VIEWER, OTHER_CHANNEL])
async def test_apply_needs_edit_rights(user: nebula.User) -> None:
    request = ApplySchedulingTemplateRequest(
        id_channel=1, template_name="week", date="2026-11-02", clear=True
    )
    with pytest.raises(nebula.ForbiddenException):
        await ApplySchedulingTemplate().handle(user, request)


def test_load_only_listed_templates(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    templates = tmp_path / "templates"
    templates.mkdir()
    (templates / "week.json").write_text('{"schedule": {}}')
    (tmp_path / "secret.json").write_text('{"password": "x"}')
    monkeypatch.setattr(_utils, "get_templates_dir", lambda: str(templates))

    assert load_template("week") == {"schedule": {}}
    for name in ("../secret", f"{templates}/../secret", "missing"):
        with pytest.raises(nebula.NotFoundException):
            load_template(name)
