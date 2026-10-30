"""User lookups by login or email match the whole value, case-insensitively.
Read-only."""

import pytest

import nebula

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_by_email_is_not_a_pattern() -> None:
    row = await nebula.db.fetchrow(
        "SELECT meta->>'email' AS email FROM users"
        " WHERE meta->>'email' LIKE '%_@_%' ORDER BY id LIMIT 1"
    )
    if row is None:
        pytest.skip("No user with an email")
    email: str = row["email"]

    user = await nebula.User.by_email(email.upper())
    assert user["email"] == email

    # % and _ are LIKE wildcards: they must not match other addresses
    for pattern in ("%", "%@%", "_" * len(email)):
        with pytest.raises(nebula.NotFoundException):
            await nebula.User.by_email(pattern)
