import pytest
import nebula


@pytest.mark.asyncio
async def test_supernova():
    res = await nebula.db.fetch("SELECT meta FROM users")
    assert res, "No users found"

    user = nebula.User.from_meta(res[0]["meta"])
    assert user.name


