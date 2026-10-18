from typing import Annotated

from fastapi import Path

PREFIX = "/assets"

AssetId = Annotated[int, Path(description="Asset ID", ge=1)]
AuxKey = Annotated[
    str,
    Path(
        description="Aux data key",
        pattern=r"^[a-z0-9_.:-]+$",
        max_length=255,
        examples=["nebula:transcription"],
    ),
]
