"""SQL written as template strings."""

from collections.abc import Iterable
from string.templatelib import Interpolation, Template
from typing import Any, LiteralString


class SQL:
    """Helpers for SQL written as template strings.

        folders = [1, 2]
        acl = t"AND id_folder = ANY({folders})"
        SQL.render(t"SELECT meta FROM assets WHERE status = {status} {acl}")
        # ("SELECT meta FROM assets WHERE status = $1 AND id_folder = ANY($2)",
        #  [status, folders])

    An interpolated value becomes a bound parameter and an interpolated
    template is inlined. Two format specs put a value into the SQL text
    itself, where a parameter can't be used:

        {name:ident}     quoted identifier: "name"
        {value:literal}  string literal: 'value'
    """

    @classmethod
    def render(cls, query: Template) -> tuple[str, list[Any]]:
        """SQL text with $n placeholders, and the values to bind to them."""
        params: list[Any] = []

        def walk(template: Template) -> str:
            sql = ""
            for item in template:
                if isinstance(item, str):
                    sql += item
                elif isinstance(item.value, Template):
                    sql += walk(item.value)
                elif item.format_spec == "ident":
                    sql += cls.quote(item.value, '"')
                elif item.format_spec == "literal":
                    sql += cls.quote(item.value, "'")
                elif item.format_spec:
                    raise ValueError(f"Unknown SQL format '{item.format_spec}'")
                else:
                    params.append(item.value)
                    sql += f"${len(params)}"
            return sql

        return walk(query), params

    @classmethod
    def join(cls, parts: Iterable[Template], separator: LiteralString) -> Template:
        """Templates joined with a separator: SQL.join(conditions, " AND ")."""
        items: list[str | Interpolation[Any]] = []
        for i, part in enumerate(parts):
            if i:
                items.append(separator)
            items.append(Interpolation(part, "part"))
        return Template(*items)

    @classmethod
    def quote(cls, value: Any, quote: str) -> str:
        # Doubling the quote is all the escaping identifiers and string
        # literals need (standard_conforming_strings is on by default).
        if not isinstance(value, str) or "\x00" in value:
            raise ValueError(f"Can't put {value!r} into SQL")
        return quote + value.replace(quote, quote * 2) + quote
