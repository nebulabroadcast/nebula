__all__ = ["NebulaConfigModel", "config"]

import os
from typing import Literal, cast

import dotenv
from nx.config import ConfigModel, ConfigProxy
from pydantic import Field, PostgresDsn


class NebulaConfigModel(ConfigModel):
    # nx.config.ConfigModel defaults to postgresql://nx:nx@postgres:5432/nx,
    # which doesn't match Nebula's conventional default credentials/database
    # name used in dev and testing deployments. Override it to keep those
    # working without requiring an explicit NEBULA_POSTGRES(_URL) override.
    postgres_url: PostgresDsn = PostgresDsn(
        "postgresql://nebula:nebula@postgres:5432/nebula"
    )

    # nx.config.ConfigModel's log_level doesn't include "SUCCESS", which
    # nebula's own LogLevel enum has (and which older deployments may set
    # NEBULA_LOG_LEVEL to). Widen it back.
    log_level: Literal[
        "TRACE", "DEBUG", "INFO", "SUCCESS", "WARNING", "ERROR", "CRITICAL"
    ] = "DEBUG"  # type: ignore[assignment]

    site_name: str = Field(
        "nebula",
        description="",
    )

    motd: str = Field(
        "",
        description="Message of the day",
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

    session_secret: str = Field(
        default_factory=lambda: os.urandom(32).hex(),
        description="Session secret. MUST be set when the server is scaled",
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

    geoip_db_path: str | None = Field(
        None,
        description=(
            "Path to the GeoIP database file. "
            "If not set, geolocation features will be disabled"
        ),
    )

    enable_experimental: bool = Field(
        False,
        description="Enable experimental features",
    )

    @property
    def postgres(self) -> str:
        """Deprecated alias for postgres_url."""
        return str(self.postgres_url)

    @property
    def redis(self) -> str:
        """Deprecated alias for redis_url."""
        return str(self.redis_url)


# Older Nebula deployments set NEBULA_POSTGRES / NEBULA_REDIS as bare
# connection strings. nx.config.ConfigModel expects NEBULA_POSTGRES_URL /
# NEBULA_REDIS_URL instead, so alias the old names to keep existing
# .env files and deployments working unmodified.
_ENV_ALIASES = {
    "NEBULA_POSTGRES": "NEBULA_POSTGRES_URL",
    "NEBULA_REDIS": "NEBULA_REDIS_URL",
}


def _load_config() -> NebulaConfigModel:
    dotenv.load_dotenv()
    for old, new in _ENV_ALIASES.items():
        if old in os.environ and new not in os.environ:
            os.environ[new] = os.environ[old]

    proxy = ConfigProxy[NebulaConfigModel]()
    proxy.initialize(NebulaConfigModel, "NEBULA")
    return cast("NebulaConfigModel", proxy)


config = _load_config()
