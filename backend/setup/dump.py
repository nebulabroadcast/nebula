from pydantic import BaseModel

from nebula.settings import get_server_settings


def dump_data(filename: str, data: BaseModel) -> None:
    with open(filename, "w") as f:
        f.write(data.model_dump_json(exclude_unset=True, exclude_none=True))


async def dump_settings() -> None:
    settings = await get_server_settings()
    dump_data("/settings/server.json", settings)
