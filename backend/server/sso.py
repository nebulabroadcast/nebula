import json
from authlib.integrations.starlette_client import OAuth

CONF_URL = "https://accounts.google.com/.well-known/openid-configuration"


class NebulaSSOConfig:
    data: dict[str, str] | None = None

    def get(self, key: str, default: str = None) -> str:
        if self.data is None:
            self.data = {}
            with open("/mnt/nebula_01/googleauth.json") as f:
                data = json.load(f)
                self.data["GOOGLE_CLIENT_ID"] = data["web"]["client_id"]
                self.data["GOOGLE_CLIENT_SECRET"] = data
        assert self.data is not None, "SSO config is not initialized"
        return self.data.get(key, default)


class NebulaSSO:
    _oauth: OAuth | None = None

    @classmethod
    def create_oauth(cls) -> OAuth:
        ssoconfig = NebulaSSOConfig()
        cls._oauth = OAuth(ssoconfig)
        assert cls._oauth is not None, "OAuth is not initialized"
        cls._oauth.register(
            name="google",
            server_metadata_url=CONF_URL,
            client_kwargs={
                "scope": "openid email profile"
            }
        )

    @classmethod
    def get_oauth(cls) -> OAuth:
        if cls._oauth is None:
            cls.create_oauth()
        assert cls._oauth is not None, "OAuth is not initialized 2"
        return cls._oauth

    @classmethod
    def client(cls):
        return cls.get_oauth().google
