import os
from typing import Literal

import dotenv
from pydantic import BaseModel, Field


class NebulaConfig(BaseModel):
    site_name: str = Field(
        "nebula",
        description="",
    )

    motd: str = Field(
        "",
        description="Message of the day",
    )

    postgres: str = Field(
        "postgres://nebula:nebula@postgres/nebula",
        description="PostgreSQL connection string",
    )

    redis: str = Field(
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

    max_failed_login_attempts: int = Field(
        10,
        description="Maximum number of failed login attempts before the IP is banned",
    )

    failed_login_ban_time: int = Field(
        1800,
        description="Time in seconds for which the IP is banned "
        "after too many failed login attempts",
    )

    log_level: Literal[
        "trace", "debug", "info", "success", "warning", "error", "critical"
    ] = Field(
        "debug",
        description="Logging level",
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
