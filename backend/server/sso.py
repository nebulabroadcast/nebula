from typing import Any

from authlib.integrations.httpx_client import AsyncOAuth2Client
from authlib.integrations.starlette_client import OAuth

import nebula
from server.models import ResponseModel

PROFILES = {
    "github": {
        "api_base_url": "https://api.github.com/",
        "access_token_url": "https://github.com/login/oauth/access_token",
        "authorize_url": "https://github.com/login/oauth/authorize",
        "client_kwargs": {"scope": "user:email"},
        "userinfo_endpoint": "https://api.github.com/user",
    },
    "google": {
        "api_base_url": "https://www.googleapis.com/",
        "server_metadata_url": "https://accounts.google.com/.well-known/openid-configuration",
        "client_kwargs": {"scope": "openid email profile"},
    },
}


class SSOOption(ResponseModel):
    name: str
    title: str


class NebulaSSOConfig:
    _data: dict[str, str] | None = None

    @property
    def data(self) -> dict[str, str]:
        if self._data is None:
            data = {}
            for provider in nebula.settings.system.sso_providers:
                provider_prefix = provider.name.upper()
                data[f"{provider_prefix}_CLIENT_ID"] = provider.client_id
                data[f"{provider_prefix}_CLIENT_SECRET"] = provider.client_secret
            self._data = data
        return self._data

    def get(self, key: str, default: str | None = None) -> str | None:
        return self.data.get(key, default)


class NebulaSSO:
    _oauth: OAuth | None = None

    @classmethod
    def create_oauth(cls) -> OAuth:
        ssoconfig = NebulaSSOConfig()
        cls._oauth = OAuth(ssoconfig)
        assert cls._oauth is not None, "OAuth is not initialized"
        for provider in nebula.settings.system.sso_providers:
            kw: dict[str, Any]
            if provider.profile:
                kw = PROFILES[provider.profile]
            else:
                kw = {
                    "server_metadata_url": provider.entrypoint,
                    "client_kwargs": {"scope": "openid email profile"},
                }
            cls._oauth.register(name=provider.name, **kw)
        return cls._oauth

    @classmethod
    def get_oauth(cls) -> OAuth:
        if cls._oauth is None:
            cls.create_oauth()
        assert cls._oauth is not None, "OAuth is not initialized 2"
        return cls._oauth

    @classmethod
    def client(cls, provider: str) -> AsyncOAuth2Client:
        return cls.get_oauth().create_client(provider)

    @classmethod
    async def options(cls) -> list[SSOOption]:
        result = []
        for provider in nebula.settings.system.sso_providers:
            result.append(
                SSOOption(
                    name=provider.name,
                    title=provider.title or provider.name.capitalize(),
                )
            )
        return result
