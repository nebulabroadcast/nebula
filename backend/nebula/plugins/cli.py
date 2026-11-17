class CLIPlugin:
    """A command of `python -m cli <name>`.

    `async def main(self, ...)` is the command; its parameters are the
    command's arguments. A plugin without `main` is a group of commands:
    its public `async def` methods, `python -m cli <name> <method>`.
    """

    name: str = "cli_plugin"

    def __repr__(self) -> str:
        return f"<Nebula CLI plugin: {self.name}>"
