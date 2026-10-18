"""Transcription aux documents (`nebula:transcription`, `openai:transcription`).

The models check the fields Nebula uses and keep any others (a Whisper
result has `text`, per-segment `words`...), so storing a document through
them never drops data.
"""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class TranscriptionSegment(BaseModel):
    model_config = ConfigDict(extra="allow")

    start: Annotated[float, Field(description="Start time in seconds")]
    end: Annotated[float, Field(description="End time in seconds")]
    text: str


class Transcription(BaseModel):
    """Aux data `nebula:transcription` (and `openai:transcription`)."""

    model_config = ConfigDict(extra="allow")

    language: str | None = None
    segments: list[TranscriptionSegment] = []
