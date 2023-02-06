from typing import Literal

from pydantic import BaseModel


class SettingsModel(BaseModel):
    pass


LanguageCode = Literal["en", "cs", "fi"]
