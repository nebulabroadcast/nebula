import asyncio
import sys

import aiofiles
import asyncpg

from nebula.db import DB, DatabaseConnection
from nebula.log import log
from nebula.objects.user import User
from setup.dump import dump_settings
from setup.settings import setup_settings

log.user = "setup"


async def create_schema(db: DatabaseConnection) -> None:
    log.info("Creating database schema")
    async with aiofiles.open("schema/schema.sql") as f:
        schema = await f.read()
        await db.execute(schema)


async def create_default_user(db: DatabaseConnection) -> None:
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

    user = User(meta=meta, connection=db)
    user.set_password("nebula")
    await user.save()


async def main() -> None:
    db = DB()

    while True:
        try:
            await db.connect()
        except ConnectionRefusedError:
            log.info("Waiting for the database")
        except asyncpg.exceptions.CannotConnectNowError:
            log.info("Database is starting")
        except Exception:
            log.traceback()
        else:
            break
        await asyncio.sleep(1)
    log.success("Connected to the database")

    # Check wether we have database deployed

    if "--dump" in sys.argv:
        await dump_settings()
        return

    else:
        await create_schema(db)
        await create_default_user(db)

        pool = await db.pool()
        async with pool.acquire() as conn, conn.transaction():
            await setup_settings(conn)


if __name__ == "__main__":
    # We cannot use nebula.run here, because DB and settings may not be initialized yet
    asyncio.run(main())
