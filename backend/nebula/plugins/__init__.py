__all__ = ["SolverPlugin", "CLIPlugin"]

from .common import modules_root
from .solver import SolverPlugin

assert modules_root


class CLIPlugin:
    name: str = "cli_plugin"
