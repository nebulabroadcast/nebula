# nebulabroadcast-core

The async domain library of [Nebula](https://nebulabroadcast.com), the open
source broadcast automation system: assets, rundown objects, users,
settings, queries, messaging, database and redis access. It is the
`nebula` package the Nebula server is built on, published so that
stand-alone services can work with a Nebula site the same way the server
does.

```
pip install nebulabroadcast-core==6.1.6
```

Use the version of the server your site runs: the package is released
with every server release and they share the version number.

## Example

```python
import nebula


async def main() -> None:
    async for asset in nebula.Asset.iterate(
        filter={"key": "id_folder", "op": "in", "value": [1]},
        sort=["title"],
    ):
        print(asset.id, asset["title"])


nebula.run(main())
```

`nebula.run()` loads the site settings from the database and runs the
coroutine. Code run this way acts as the system: no user, no access
restrictions.

## Configuration

The same environment variables as the server (a `.env` file is read too):

| Variable | Default |
|---|---|
| `NEBULA_POSTGRES_URL` | `postgresql://nebula:nebula@postgres:5432/nebula` |
| `NEBULA_REDIS_URL` | `redis://redis:6379/0` |
| `NEBULA_SITE_NAME` | `nebula` |
| `NEBULA_LOG_LEVEL` | `DEBUG` |

## Supported API

The names exported by `nebula` itself (`nebula.Asset`, `nebula.User`,
`nebula.Item`, `nebula.Bin`, `nebula.Event`, `nebula.settings`,
`nebula.db`, `nebula.redis`, `nebula.msg`, `nebula.run`, the exceptions...)
and `nebula.query`. Everything else (`nebula.helpers`, submodules) is
internal and may change in any release.

This is not the synchronous `nebula` package of
[nebula-worker](https://github.com/nebulabroadcast/nebula-worker). Both
are imported as `nebula`, so they can't be installed in the same
environment.

## License

GPL-3.0-or-later
