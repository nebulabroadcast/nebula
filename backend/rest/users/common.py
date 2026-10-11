from typing import Annotated

from fastapi import Path

PREFIX = "/users"

UserId = Annotated[int, Path(description="User ID", ge=1)]
