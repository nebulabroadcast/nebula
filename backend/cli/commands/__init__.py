"""Built-in commands of `python -m cli`.

Each module holds `CLIPlugin` classes, written exactly as a site's CLI
plugins are (see cli.app). A new one is added to `BUILTIN_PLUGINS`.
"""

from cli.commands.adduser import AddUser
from cli.commands.version import Version
from nebula.plugins import CLIPlugin

BUILTIN_PLUGINS: list[type[CLIPlugin]] = [AddUser, Version]
