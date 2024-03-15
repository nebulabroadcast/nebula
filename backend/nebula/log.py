import enum
import logging
import sys
import traceback
from typing import Any


def indent(text: str, level: int = 4) -> str:
    return text.replace("\n", f"\n{' '*level}")


class LogLevel(enum.IntEnum):
    """Log level."""

    TRACE = 0
    DEBUG = 1
    INFO = 2
    SUCCESS = 2
    WARNING = 3
    ERROR = 4
    CRITICAL = 5


class Logger:
    user: str = "nebula"
    level = LogLevel.DEBUG
    user_max_length: int = 16

    def __call__(
        self,
        level: LogLevel,
        *args: Any,
        user: str | None = None,
    ) -> None:
        if level < self.level:
            return

        lvl = level.name.upper()
        usr = user or self.user
        usr = usr[: self.user_max_length].ljust(self.user_max_length)
        msg = " ".join([str(arg) for arg in args])

        print(
            f"{lvl:<8} {usr} {msg}",
            file=sys.stderr,
            flush=True,
        )

    def trace(self, *args: Any, user: str | None = None) -> None:
        self(LogLevel.TRACE, *args, user=user)

    def debug(self, *args: Any, user: str | None = None) -> None:
        self(LogLevel.DEBUG, *args, user=user)

    def info(self, *args: Any, user: str | None = None) -> None:
        self(LogLevel.INFO, *args, user=user)

    def success(self, *args: Any, user: str | None = None) -> None:
        self(LogLevel.SUCCESS, *args, user=user)

    def warn(self, *args: Any, user: str | None = None) -> None:
        self(LogLevel.WARNING, *args, user=user)

    def warning(self, *args: Any, user: str | None = None) -> None:
        self(LogLevel.WARNING, *args, user=user)

    def error(self, *args: Any, user: str | None = None) -> None:
        self(LogLevel.ERROR, *args, user=user)

    def traceback(self, *args: Any, user: str | None = None) -> str:
        msg = " ".join([str(arg) for arg in args])
        tb = traceback.format_exc()
        msg = f"{msg}\n\n{indent(tb)}"
        self(LogLevel.ERROR, msg, user=user)
        return msg

    def critical(self, *args: Any, user: str | None = None) -> None:
        self(LogLevel.CRITICAL, *args, user=user)


log = Logger()

# Add custom logging handler to standard logging module
# This allows us to use the standard logging module with
# the same format, log level and consumers as the primary
# Nebula logger. This is useful for 3rd party libraries.


class CustomHandler(logging.Handler):
    def emit(self, record: Any) -> None:
        log_message = self.format(record)
        name = record.name
        log(LogLevel(record.levelno // 10), log_message, user=name)


root_logger = logging.getLogger()
root_logger.setLevel(log.level * 10)

custom_handler = CustomHandler()
root_logger.addHandler(custom_handler)
