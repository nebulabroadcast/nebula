import os
from typing import Any

import aiofiles

from nebula import db, log
from nebula.common import json_loads
from nebula.sql import SQL

# Postgres cuts identifiers to this many bytes (NAMEDATALEN - 1)
MAX_IDENTIFIER_BYTES = 63


def index_name(key: str) -> str:
    """Name of the index of a metatype, as Postgres stores it.

    A key may have 127 characters. Postgres cuts a longer name itself, so
    the same cut is made here: the name has to match when it is looked up.
    """
    name = "idx_" + key.replace("/", "_")
    return name.encode()[:MAX_IDENTIFIER_BYTES].decode(errors="ignore")


async def index_states(names: list[str]) -> dict[str, bool]:
    """Indexes of `names` that exist, with whether they are valid."""
    rows = await db.fetch(
        """
        SELECT c.relname AS name, i.indisvalid AS valid
        FROM pg_index i
        JOIN pg_class c ON c.oid = i.indexrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = current_schema() AND c.relname = ANY($1::text[])
        """,
        names,
    )
    return {row["name"]: row["valid"] for row in rows}


async def build_indexes(keys: list[str]) -> None:
    """Create the missing `meta->>'key'` indexes on assets.

    Built concurrently, so writes to assets aren't blocked meanwhile. That
    can't run in a transaction block: setup calls this after its commit.
    """
    states = await index_states([index_name(key) for key in keys])
    for key in keys:
        name = index_name(key)
        if states.get(name):
            continue
        try:
            if name in states:
                # Left behind by a concurrent build that failed. It is never
                # used, and IF NOT EXISTS would skip it forever.
                log.warning(f"Dropping invalid index {name}")
                query, _ = SQL.render(t"DROP INDEX CONCURRENTLY {name:ident}")
                await db.execute(query)
            log.info(f"Creating index {name}")
            query, _ = SQL.render(
                t"""
                CREATE INDEX CONCURRENTLY IF NOT EXISTS {name:ident}
                ON assets((meta->>{key:literal}))
                """
            )
            await db.execute(query)
        except Exception:
            # Reported by check_indexes: the other indexes are still built
            log.traceback(f"Unable to create index {name}")


async def check_indexes(keys: list[str]) -> list[str]:
    """Names of the indexes of `keys` that are missing or invalid."""
    names = [index_name(key) for key in keys]
    states = await index_states(names)
    return [name for name in names if not states.get(name)]


async def setup_metatypes(meta_types: dict[str, Any], **kwargs: Any) -> list[str]:
    """Save the metatypes. Returns the keys that have `index` set.

    Their indexes are built after the current transaction commits (at once
    when there is none); check_indexes tells whether that worked.
    """
    # Accepts and ignores a legacy `db`/`connection` keyword argument for
    # backward compatibility: nebula.db tracks the current
    # connection/transaction internally.
    _ = kwargs
    languages = ["en", "cs"]

    aliases: dict[str, dict[str, Any]] = {}
    for lang in languages:
        aliases[lang] = {}
        trans_table_fname = os.path.join("schema", f"meta-aliases-{lang}.json")

        async with aiofiles.open(trans_table_fname) as f:
            adata = json_loads(await f.read())

        for key, alias, header, description in adata:
            _header = header if header is not None else alias
            aliases[lang][key] = [alias, _header, description]

    for key, data in meta_types.items():
        if key.startswith("__"):
            # `__` keys in responses are server data that isn't a field
            raise ValueError(f"Metatype '{key}' can't start with '__'")
        meta_type = {}
        meta_type["ns"] = data["ns"]
        meta_type["editable"] = True
        meta_type["class"] = data["type"].value
        meta_type["aliases"] = {}

        for opt in ["cs", "fulltext", "mode", "format", "default"]:
            if opt in data:
                meta_type[opt] = data[opt]

        for lang in languages:
            try:
                meta_type["aliases"][lang] = aliases[lang][key]
            except KeyError:
                meta_type["aliases"][lang] = [
                    data.get("title", key.capitalize()),
                    None,
                    "",
                ]

        await db.execute(
            """
            INSERT INTO meta_types (key, settings) VALUES ($1, $2)
            ON CONFLICT (key) DO UPDATE SET settings=$2
            """,
            key,
            meta_type,
        )

    indexed = [key for key, data in meta_types.items() if data.get("index", False)]
    if indexed:
        await db.on_commit(lambda: build_indexes(indexed))
    return indexed
