"""Asset resource models (see rest/README.md §4.1).

Responses are flat: asset metatypes by their keys, with the core ones
typed, plus `__` keys for server data that isn't a field (`__aux`).
Which keys a client may write is checked by nebula.Asset.check_changes.
"""

from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field

from nebula.enum import ContentType, MediaType, ObjectStatus
from nebula.transcription import Transcription
from server.models import APIModel
from server.query import QueryResponse


class Asset(APIModel):
    """An asset. With `fields`, only the requested fields are present."""

    model_config = ConfigDict(extra="allow", populate_by_name=True)

    id: Annotated[int, Field(description="Asset ID", examples=[42])]
    id_folder: Annotated[int | None, Field(description="Folder ID")] = None
    status: ObjectStatus | None = None
    content_type: ContentType | None = None
    media_type: MediaType | None = None
    ctime: Annotated[float | None, Field(description="Creation time")] = None
    mtime: Annotated[float | None, Field(description="Last modification time")] = None
    title: str | None = None
    has_aired: Annotated[
        bool | None,
        Field(description="Whether any item of the asset has aired (computed)"),
    ] = None
    aux_keys: Annotated[
        list[str] | None,
        Field(
            alias="__aux",
            description="Keys of the asset's aux data (computed)",
            examples=[["nebula:transcription"]],
        ),
    ] = None


class AssetList(QueryResponse[Asset]):
    """A page of assets."""


class AssetPatch(APIModel):
    """Fields to change. Omitted fields stay as they are, null removes one.

    Any asset metatype can be set. Read-only (`id`, `ctime`, `mtime`,
    `created_by`, `updated_by`), computed (namespace `v`) and unknown keys
    are rejected.
    """

    model_config = ConfigDict(extra="allow")

    id_folder: int | None = None
    status: ObjectStatus | None = None
    content_type: ContentType | None = None
    media_type: MediaType | None = None
    title: str | None = None
    subtitle: str | None = None

    def to_meta_changes(self) -> dict[str, Any]:
        """Changes as meta keys, for nebula.helpers.assets.save_asset_changes."""
        return self.model_dump(exclude_unset=True)


class AssetCreate(AssetPatch):
    """A new asset. `id_folder` is required, unless the validator sets it."""


#
# Aux data with a known structure. PUT validates them, other keys take
# any JSON value.
#


AUX_MODELS: dict[str, type[BaseModel]] = {
    "nebula:transcription": Transcription,
    "openai:transcription": Transcription,
}
