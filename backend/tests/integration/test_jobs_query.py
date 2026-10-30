"""The jobs list query runs on a real database. Read-only."""

import pytest

import nebula
from api.jobs._models import ManageJobsRequest
from api.jobs.manage_jobs import ManageJobs

pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest.mark.parametrize("view", ["all", "active", "finished", "failed"])
async def test_jobs_query(view: str) -> None:
    # Every condition at once: types of the bound values must match the columns
    user = nebula.User(meta={"id": 1, "login": "x", "is_limited": True})
    request = ManageJobsRequest(
        view=view, asset_ids=[], ids=[1, 2], search_query="news"
    )
    response = await ManageJobs().handle(request, user)
    assert response.jobs == []
