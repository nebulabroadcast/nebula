__all__ = ["DB", "DatabaseConnection", "db"]

from nx.db import DB, db

# Deprecated alias. Historically this was a union of DB and the raw
# asyncpg connection proxy, back when connections had to be threaded
# through function calls manually. nx.DB tracks the current connection
# (and transaction) internally via a contextvar, so `db` itself is now
# always the right thing to pass around.
DatabaseConnection = DB
