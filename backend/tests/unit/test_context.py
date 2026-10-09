import asyncio
from collections.abc import Iterator

import pytest

import nebula
from nebula.context import (
    RequestContext,
    get_request_context,
    is_system,
    request_context,
    set_default_system,
    system_context,
)
from server.background import BackgroundTask


@pytest.fixture(autouse=True)
def restore_default_system() -> Iterator[None]:
    default = is_system()
    yield
    set_default_system(default)


def test_trusted_by_default() -> None:
    # CLI tools and services never set a context
    assert is_system()


def test_server_default_is_untrusted() -> None:
    set_default_system(False)
    assert not is_system()
    assert get_request_context() == RequestContext(system=False)


def test_request_context_is_never_system() -> None:
    # Even in a trusted process, a request's context doesn't inherit trust
    user = nebula.User(meta={"id": 1, "login": "user"})
    with request_context(RequestContext(user=user)):
        assert not is_system()


def test_system_context_keeps_user_and_restores() -> None:
    set_default_system(False)
    user = nebula.User(meta={"id": 1, "login": "user"})
    with request_context(RequestContext(user=user, initiator="client")):
        with system_context():
            context = get_request_context()
            assert context.system
            assert context.user is user
            assert context.initiator == "client"
        assert not is_system()
    assert not is_system()


@pytest.mark.asyncio
async def test_tasks_inherit_request_context() -> None:
    set_default_system(False)
    user = nebula.User(meta={"id": 1, "login": "user"})

    async def check() -> tuple[bool, nebula.User | None]:
        return is_system(), nebula.context.current_user()

    with request_context(RequestContext(user=user)):
        task = asyncio.create_task(check())
    assert await task == (False, user)


@pytest.mark.asyncio
async def test_background_task_runs_as_system() -> None:
    set_default_system(False)
    seen: list[bool] = []

    class Job(BackgroundTask):
        async def run(self) -> None:
            seen.append(is_system())
            self.shutting_down = True

    job = Job()
    job.start()
    assert job.task is not None
    await job.task
    assert seen == [True]
