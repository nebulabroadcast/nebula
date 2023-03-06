import os
from typing import Literal

import dotenv
from pydantic import BaseModel, Field, PostgresDsn, RedisDsn


class NebulaConfig(BaseModel):
    site_name: str = Field(
        "nebula",
        description="",
    )

    motd: str = Field(
        "Nebula 6",
        description="Message of the day",
    )

    postgres: PostgresDsn = Field(
        "postgres://nebula:nebula@postgres/nebula",
        description="PostgreSQL connection string",
    )

    redis: RedisDsn = Field(
        "redis://redis",
        description="Redis connection string",
    )

    frontend_dir: str = Field(
        "/frontend",
        description="Path to the frontend directory",
    )

    plugin_dir: str = Field(
        "/plugins",
        description="Path to the plugin directory",
    )

    password_hashing: Literal["legacy"] = Field(
        "legacy",
        description="Password hashing method",
    )


def load_config() -> NebulaConfig:
    prefix = "NEBULA_"
    config_data = {}
    dotenv.load_dotenv()
    for key, value in os.environ.items():
        if not key.startswith(prefix):
            continue

        target_key = key.removeprefix(prefix).lower()
        config_data[target_key] = value
    return NebulaConfig(**config_data)


config: NebulaConfig = load_config()
