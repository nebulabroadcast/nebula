import asyncio
import sys

import aiofiles
import asyncpg

from nebula import db, log
from nebula.config import config
from nebula.objects.user import User
from setup.dump import dump_settings
from setup.settings import setup_settings

log.user = "setup"


async def wait_for_database() -> None:
    while True:
        try:
            conn = await asyncpg.connect(str(config.postgres_url))
        except ConnectionRefusedError:
            log.info("Waiting for the database")
        except asyncpg.exceptions.CannotConnectNowError:
            log.info("Database is starting")
        except Exception:
            log.traceback()
        else:
            await conn.close()
            return
        await asyncio.sleep(1)


async def create_schema() -> None:
    log.info("Creating database schema")
    async with aiofiles.open("schema/schema.sql") as f:
        schema = await f.read()
        await db.execute(schema)


async def create_default_user() -> None:
    has_user = False
    try:
        result = await db.fetch("SELECT * FROM users")
    except asyncpg.exceptions.UndefinedTableError:
        pass
    else:
        if result:
            has_user = True

    if has_user:
        return

    log.info("Creating default user")

    meta = {
        "login": "admin",
        "is_admin": True,
    }

    user = User(meta=meta)
    user.set_password("nebula")
    await user.save()


async def main() -> None:
    await wait_for_database()
    log.success("Connected to the database")

    # Check wether we have database deployed

    if "--dump" in sys.argv:
        await dump_settings()
        return

    await create_schema()
    await create_default_user()

    async with db.transaction():
        await setup_settings()


if __name__ == "__main__":
    # We cannot use nebula.run here, because DB and settings may not be initialized yet
    asyncio.run(main())
