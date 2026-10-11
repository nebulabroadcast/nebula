"""nebula.sql: SQL from template strings."""

import pytest

from nebula.sql import SQL


def test_values_become_parameters() -> None:
    status, title = 1, "x'; DROP TABLE assets; --"
    sql, params = SQL.render(
        t"SELECT meta FROM assets WHERE status = {status} AND t = {title}"
    )
    assert sql == "SELECT meta FROM assets WHERE status = $1 AND t = $2"
    assert params == [1, title]


def test_nested_templates_are_renumbered() -> None:
    folders = [1, 2]
    acl = t"AND id_folder = ANY({folders})"
    sql, params = SQL.render(t"SELECT 1 WHERE a = {'x'} {acl} AND b = {5}")
    assert sql == "SELECT 1 WHERE a = $1 AND id_folder = ANY($2) AND b = $3"
    assert params == ["x", [1, 2], 5]


def test_join() -> None:
    sql, params = SQL.render(SQL.join([t"a = {1}", t"b = {2}", t"c"], " AND "))
    assert sql == "a = $1 AND b = $2 AND c"
    assert params == [1, 2]


def test_inline_values_are_quoted() -> None:
    sql, params = SQL.render(
        t"SELECT {'qc/state':ident} FROM t WHERE {'a"b':ident} = {"it's":literal}"
    )
    assert sql == """SELECT "qc/state" FROM t WHERE "a""b" = 'it''s'"""
    assert params == []


@pytest.mark.parametrize("query", [t"{5:literal}", t"{'a\x00':ident}", t"{1:sql}"])
def test_invalid_inline_values(query: object) -> None:
    with pytest.raises(ValueError):  # noqa: PT011
        SQL.render(query)  # type: ignore[arg-type]
