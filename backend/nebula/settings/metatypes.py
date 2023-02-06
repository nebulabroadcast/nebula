from typing import Any

from pydantic import Field

from nebula.enum import MetaClass
from nebula.settings.common import LanguageCode, SettingsModel

DEFAULT_VALUES = {
    MetaClass.STRING: "",
    MetaClass.TEXT: "",
    MetaClass.INTEGER: 0,
    MetaClass.NUMERIC: 0,
    MetaClass.BOOLEAN: False,
    MetaClass.DATETIME: 0,
    MetaClass.TIMECODE: 0,
    MetaClass.OBJECT: {},
    MetaClass.FRACTION: "1/1",
    MetaClass.SELECT: "",
    MetaClass.LIST: [],
    MetaClass.COLOR: 0,
}


class MetaAlias(SettingsModel):
    title: str
    header: str | None
    description: str | None


class MetaType(SettingsModel):
    ns: str = Field("m")
    metaclass: MetaClass = Field(MetaClass.STRING)
    editable: bool = Field(
        False,
        description="Indicates a user-editable field",
    )
    fulltext: int = Field(
        False,
        description="Weight of the field in fulltext search",
    )
    aliases: dict[LanguageCode, MetaAlias] = Field(
        default_factory=dict,
        description="Title, description and header for each language",
    )
    cs: str | None = Field(
        None,
        description="Classification scheme URN",
    )
    default: Any | None = Field(None, description="Default value")
    mode: str | None = None
    format: str | None = None
    order: str | None = None
    filter: str | None = None
    hide_null: bool = False

    @classmethod
    def from_settings(cls, settings: dict[str, Any]) -> "MetaType":
        aliases = {}
        for lang, items in settings["aliases"].items():
            t, h, d = items
            aliases[lang] = MetaAlias(
                title=t,
                header=h if h is not None else t,
                description=d or None,
            )

        return cls(
            ns=settings["ns"],
            metaclass=settings["class"],
            editable=settings.get("editable", False),
            fulltext=settings.get("fulltext", False),
            aliases=aliases,
            cs=settings.get("cs"),
            mode=settings.get("mode"),
            format=settings.get("format"),
            order=settings.get("order"),
            filter=settings.get("filter"),
            default=settings.get("default", DEFAULT_VALUES[settings["class"]]),
        )
