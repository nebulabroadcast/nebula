"""Built-in commands of `python -m cli`.

A module here is one command, named after the module: it has `command`
(a function) or `app` (a `typer.Typer` with sub-commands). Coroutine
commands use `cli.run.run_async`.
"""
