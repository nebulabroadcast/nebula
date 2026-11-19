"""Restarting the server's workers (spec 013).

`POST /api/v2/server/restart` sends `server.restart`; every worker of every
replica gets it. One worker per replica sends SIGHUP to its gunicorn
master, which starts new workers and stops the old ones gracefully.
"""

import os
import signal

import nebula

# Written by `gunicorn --pid` (`manage serve`)
GUNICORN_PID_FILE = "/tmp/nebula-gunicorn.pid"  # noqa: S108
# One per restart: whoever creates it signals. /tmp belongs to the
# container, so that is one worker per replica.
MARKER_FILE = "/tmp/nebula-restart-{id}"  # noqa: S108


def gunicorn_pid() -> int | None:
    try:
        with open(GUNICORN_PID_FILE) as f:
            return int(f.read().strip())
    except OSError, ValueError:
        return None


def restart_replica(restart_id: str) -> None:
    """Make this replica's gunicorn reload its workers, once per restart."""
    if (pid := gunicorn_pid()) is None:
        nebula.log.warning(
            "Restart requested, but the server isn't running under gunicorn:"
            " restart it yourself"
        )
        return
    # Ids come from the server (token_hex), but the name comes from a message
    if not (safe_id := "".join(c for c in restart_id if c.isalnum())):
        nebula.log.warning("Restart message without an id ignored")
        return
    name = MARKER_FILE.format(id=safe_id)
    try:
        os.close(os.open(name, os.O_CREAT | os.O_EXCL | os.O_WRONLY))
    except FileExistsError:
        return  # another worker of this replica signals
    nebula.log.info("Restarting the server")
    os.kill(pid, signal.SIGHUP)
