from nebula.settings import get_server_settings


def dump_data(filename, data):
    with open(filename, "w") as f:
        f.write(data.json(exclude_unset=True, exclude_none=True))


async def dump_settings(db) -> None:
    settings = await get_server_settings()
    dump_data("/settings/server.json", settings)
