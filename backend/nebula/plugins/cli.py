class CLIPlugin:
    name: str = "cli_plugin"

    def __repr__(self) -> str:
        return f"<Nebula CLI plugin: {self.name}>"
