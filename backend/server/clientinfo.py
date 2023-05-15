import contextlib
import ipaddress
import os

import geoip2
import geoip2.database
import user_agents
from fastapi import Request
from pydantic import BaseModel, Field


class LocationInfo(BaseModel):
    country: str = Field(None, title="Country")
    subdivision: str = Field(None, title="Subdivision")
    city: str = Field(None, title="City")


class AgentInfo(BaseModel):
    platform: str = Field(None, title="Platform")
    client: str = Field(None, title="Client")
    device: str = Field(None, title="Device")


class ClientInfo(BaseModel):
    ip: str
    languages: list[str] = Field(default_factory=list)
    location: LocationInfo | None = Field(None)
    agent: AgentInfo | None = Field(None)


def get_real_ip(request: Request) -> str:
    return request.headers.get("x-forwarded-for", request.client.host)


def geo_lookup(ip: str):
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
    return None


def is_internal_ip(ip: str) -> bool:
    with contextlib.suppress(ValueError):
        if ipaddress.IPv4Address(ip).is_private:
            return True

    with contextlib.suppress(ValueError):
        if ipaddress.IPv6Address(ip).is_private:
            return True
    return False


def get_ua_data(request) -> AgentInfo | None:
    if ua_string := request.headers.get("user-agent"):
        ua = user_agents.parse(ua_string)
        if "mac" in ua_string.lower():
            platform = "darwin"
        elif "windows" in ua_string.lower():
            platform = "windows"
        elif "linux" in ua_string.lower():
            platform = "linux"
        else:
            platform = ua_string.lower()
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
