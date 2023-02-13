from pydantic import BaseModel, Field


class ScopedEndpoint(BaseModel):
    endpoint: str
    title: str
    scopes: list[str]


class ServerContext(BaseModel):
    scoped_endpoints: list[ScopedEndpoint] = Field(default_factory=list)


server_context = ServerContext()
