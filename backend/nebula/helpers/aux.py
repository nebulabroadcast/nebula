"""Aux data: JSON documents attached to an object, one per key.

Stored in the `aux` table, not in the object's meta: they can be large
(transcriptions) and aren't metadata. Callers check access to the object.
"""

from typing import Any

from nx.db import db

from nebula.enum import ObjectTypeId


async def get_aux(object_type: ObjectTypeId, id_object: int, key: str) -> Any:
    """The document, or None if the object has none under that key."""
    row = await db.fetchrow(
        """
        SELECT data FROM aux
        WHERE object_type = $1 AND id_object = $2 AND key = $3
        """,
        object_type.value,
        id_object,
        key,
    )
    return None if row is None else row["data"]


async def put_aux(
    object_type: ObjectTypeId, id_object: int, key: str, data: Any
) -> None:
    """Store the document under the key, replacing the previous one."""
    await db.execute(
        """
        INSERT INTO aux (key, object_type, id_object, data)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (key, object_type, id_object) DO UPDATE
        SET data = EXCLUDED.data
        """,
        key,
        object_type.value,
        id_object,
        data,
    )


async def delete_aux(
    object_type: ObjectTypeId, id_object: int, key: str | None = None
) -> None:
    """Delete one document, or all of the object's documents (key=None)."""
    if key is None:
        await db.execute(
            "DELETE FROM aux WHERE object_type = $1 AND id_object = $2",
            object_type.value,
            id_object,
        )
        return
    await db.execute(
        "DELETE FROM aux WHERE object_type = $1 AND id_object = $2 AND key = $3",
        object_type.value,
        id_object,
        key,
    )
