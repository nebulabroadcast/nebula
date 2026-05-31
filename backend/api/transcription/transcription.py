from typing import Annotated, Any

from pydantic import Field

import nebula
from server.dependencies import CurrentUser
from server.models import RequestModel
from server.request import APIRequest


class GetTranscriptionRequest(RequestModel):
    id_asset: int = Field(..., description="Asset ID")


class TranscriptionSegment(RequestModel):
    start: float
    end: float
    text: str


class GetTranscriptionResponse(RequestModel):
    language: Annotated[
        str | None,
        Field(description="Language of the transcription"),
    ] = None

    segments: Annotated[
        list[TranscriptionSegment] | None,
        Field(
            description="List of transcription segments",
        ),
    ] = None


def parse_transcription(transcription_data: dict[str, Any]) -> GetTranscriptionResponse:
    segments_data: list[dict[str, Any]] = transcription_data.get("segments", [])
    segments = [
        TranscriptionSegment(
            start=seg["start"],
            end=seg["end"],
            text=seg["text"],
        )
        for seg in segments_data
    ]
    return GetTranscriptionResponse(
        language=transcription_data.get("language"),
        segments=segments,
    )


async def get_fallback_transcription(id_asset: int) -> GetTranscriptionResponse:
    query = """
            SELECT data FROM aux
            WHERE
                key = 'openai:transcription'
            AND id_object = $1
        """

    res = await nebula.db.fetchrow(query, id_asset)
    if not res:
        raise nebula.NotFoundException("Transcription not found")
    return parse_transcription(res["data"])


async def get_primary_transcription(id_asset: int) -> GetTranscriptionResponse:
    query = """
        SELECT data FROM aux
        WHERE key = 'nebula:transcription'
        AND id_object = $1
    """
    res = await nebula.db.fetchrow(query, id_asset)
    if not res:
        raise nebula.NotFoundException("Transcription not found")
    return parse_transcription(res["data"])


class GetTranscription(APIRequest):
    """Return a transcription of an asset"""

    name: str = "get_transcription"
    title: str = "Transcription"
    category = "Asset management"

    async def handle(
        self,
        payload: GetTranscriptionRequest,
        user: CurrentUser,
    ) -> GetTranscriptionResponse:

        q = "SELECT id_folder FROM assets WHERE id = $1"
        res = await nebula.db.fetchrow(q, payload.id_asset)
        if not res:
            raise nebula.NotFoundException("Asset not found")
        id_folder = res["id_folder"]

        if not user.is_admin:
            acl = user.get("can/asset_view", False)
            if not acl:
                raise nebula.ForbiddenException("You are not allowed to view assets")
            if isinstance(acl, list) and id_folder not in acl:
                raise nebula.ForbiddenException(
                    "You are not allowed to view assets in this folder"
                )

        try:
            return await get_primary_transcription(payload.id_asset)
        except nebula.NotFoundException:
            pass

        try:
            return await get_fallback_transcription(payload.id_asset)
        except nebula.NotFoundException:
            pass

        return GetTranscriptionResponse()


class SaveTranscriptionRequest(RequestModel):
    id_asset: int = Field(..., description="Asset ID")
    segments: Annotated[
        list[TranscriptionSegment],
        Field(description="List of transcription segments"),
    ]


class SaveTranscription(APIRequest):
    """Save a transcription for an asset"""

    name: str = "save_transcription"
    title: str = "Save transcription"
    category = "Asset management"

    async def handle(
        self,
        payload: SaveTranscriptionRequest,
        user: CurrentUser,
    ) -> None:

        q = "SELECT id_folder FROM assets WHERE id = $1"
        res = await nebula.db.fetchrow(q, payload.id_asset)
        if not res:
            raise nebula.NotFoundException("Asset not found")
        id_folder = res["id_folder"]

        if not user.is_admin:
            acl = user.get("can/asset_edit", False)
            if not acl:
                raise nebula.ForbiddenException("You are not allowed to edit assets")
            if isinstance(acl, list) and id_folder not in acl:
                raise nebula.ForbiddenException(
                    "You are not allowed to edit assets in this folder"
                )

        data = {
            "language": None,
            "segments": [
                {
                    "start": seg.start,
                    "end": seg.end,
                    "text": seg.text,
                }
                for seg in payload.segments
            ],
        }

        query = """
            INSERT INTO aux (key, object_type, id_object, data)
            VALUES ('nebula:transcription', 0, $1, $2)
            ON CONFLICT (key, object_type, id_object) DO UPDATE
            SET data = EXCLUDED.data
        """

        await nebula.db.execute(query, payload.id_asset, data)
