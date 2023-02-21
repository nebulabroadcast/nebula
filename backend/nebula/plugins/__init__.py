__all__ = ["SolverPlugin", "CLIPlugin"]

from .solver import SolverPlugin


class CLIPlugin:
    name: str = "cli_plugin"
