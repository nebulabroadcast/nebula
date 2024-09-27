import os

import geoip2
import geoip2.database
import user_agents
from fastapi import Request
from pydantic import BaseModel, Field

from server.utils import is_internal_ip


class LocationInfo(BaseModel):
    country: str | None = Field(None, title="Country")
    subdivision: str | None = Field(None, title="Subdivision")
    city: str | None = Field(None, title="City")


class AgentInfo(BaseModel):
    platform: str | None = Field(None, title="Platform")
    client: str | None = Field(None, title="Client")
    device: str | None = Field(None, title="Device")


class ClientInfo(BaseModel):
    ip: str
    languages: list[str] = Field(default_factory=list)
    location: LocationInfo | None = Field(None)
    agent: AgentInfo | None = Field(None)


def get_real_ip(request: Request) -> str:
    host_ip = request.client.host if request.client else "127.0.0.1"
    xff = request.headers.get("x-forwarded-for", host_ip)
    return xff.split(",")[0].strip()


def geo_lookup(ip: str) -> LocationInfo | None:
    geoip_db_path = None  # TODO

    if geoip_db_path is None:
        return None

    if not os.path.exists(geoip_db_path):
        return None

    with geoip2.database.Reader(geoip_db_path) as reader:
        try:
            response = reader.city(ip)
        except geoip2.errors.AddressNotFoundError:
            return None

    return LocationInfo(
        country=response.country.name,
        subdivision=response.subdivisions.most_specific.name,
        city=response.city.name,
    )


def get_ua_data(request: Request) -> AgentInfo | None:
    if ua_string := request.headers.get("user-agent"):
        if ua_string.startswith("firefly"):
            firefly_version = ua_string.split("/")[1]
            return AgentInfo(
                platform="Nebula",
                client=f"Firefly {firefly_version}",
                device="Desktop",
            )

        ua = user_agents.parse(ua_string)
        if "mac" in ua_string.lower():
            platform = "MacOS"
        elif "windows" in ua_string.lower():
            platform = "Windows"
        elif "linux" in ua_string.lower():
            platform = "Linux"
        else:
            platform = ua_string.capitalize()
        return AgentInfo(
            platform=platform,
            client=ua.browser.family,
            device=ua.device.family,
        )
    return None


def get_prefed_languages(request: Request) -> list[str]:
    languages = []
    if accept_language := request.headers.get("Accept-Language"):
        try:
            for lngk in accept_language.split(";"):
                lang = lngk.split(",")[-1]
                if len(lang) == 2:
                    languages.append(lang)
        except Exception:
            return ["en"]
    else:
        languages = ["en"]
    return languages


def get_client_info(request: Request) -> ClientInfo:
    ip = get_real_ip(request)
    location = None if is_internal_ip(ip) else geo_lookup(ip)
    return ClientInfo(
        ip=ip,
        agent=get_ua_data(request),
        location=location,
        languages=get_prefed_languages(request),
    )
