__all__ = ["meta_types", "MetaType", "ClassificationScheme"]

import copy

from .common import config
from .enum import MetaClass
from .meta_validate import validators
from .meta_format import humanizers
from .meta_utils import filter_match, CachedObject


default_meta_type = {"ns": "", "class": -1, "fulltext": 0, "editable": 0, "aliases": {}}


defaults = {
    -1: None,
    MetaClass.STRING: "",
    MetaClass.TEXT: "",
    MetaClass.INTEGER: 0,
    MetaClass.NUMERIC: 0,
    MetaClass.BOOLEAN: False,
    MetaClass.DATETIME: 0,
    MetaClass.TIMECODE: 0,
    MetaClass.OBJECT: [],
    MetaClass.FRACTION: "1/1",
    MetaClass.SELECT: "",
    MetaClass.LIST: [],
    MetaClass.COLOR: 0x006FD5,
}


class ClassificationScheme(metaclass=CachedObject):
    def __init__(self, urn, filter=None):
        self.urn = urn
        self.csdata = dict(config["cs"].get(urn, []))
        if filter:
            self.data = [r for r in self.csdata if filter_match(filter, r)]
        else:
            self.data = list(self.csdata.keys())

    def __getitem__(self, value):
        return self.csdata.get(value, {})

    def __repr__(self):
        return f"<ClassificationScheme: {self.urn} ({len(self.data)} items)>"

    def _lang(self, key, value, lang):
        langs = self[value].get(key, {})
        return langs.get(lang, langs.get("en", value))

    def alias(self, value, lang):
        return self._lang("aliases", value, lang)

    def aliases(self, lang):
        return [self.alias(value, lang) for value in self["aliases"]]

    def description(self, value, lang):
        return self._lang("aliases", value, lang)

    def role(self, value):
        return self[value].get("role", "option")


class MetaType(object):
    def __init__(self, key, settings):
        self.key = key
        self.settings = settings or default_meta_type
        self.validator = validators[self["class"]]
        self.humanizer = humanizers[self["class"]]

    def __getitem__(self, key):
        return self.settings[key]

    def __setitem__(self, key, value):
        self.settings[key] = value

    def __repr__(self):
        return "<MetaType: {}>".format(self.key)

    def get(self, value, default=None):
        return self.settings.get(value, default)

    @property
    def default(self):
        if "default" in self.settings:
            return self["default"]
        return defaults[self["class"]]

    @property
    def default_alias(self):
        return self.key.split("/")[-1].replace("_", " ").capitalize()

    def alias(self, lang=False):
        lang = lang or config.get("language", "en")
        if lang in self.settings["aliases"]:
            return self.settings["aliases"][lang][0]
        return self.default_alias

    def header(self, lang=False):
        lang = lang or config.get("language", "en")
        if lang in self.settings["aliases"]:
            return self.settings["aliases"][lang][1]
        return self.default_alias

    def description(self, lang=False):
        lang = lang or config.get("language", "en")
        if lang in self.settings["aliases"]:
            return self.settings["aliases"][lang][2]
        return self.default_alias

    def validate(self, value):
        if self.validator:
            return self.validator(self, value)
        return value

    def show(self, value, **kwargs):
        if not self.humanizer:
            return value
        return self.humanizer(self, value, **kwargs)

    @property
    def cs(self):
        cs = self.settings.get("cs", "urn:special-nonexistent-cs")
        _filter = self.settings.get("filter")
        if type(_filter) == list:
            _filter = tuple(_filter)
        return ClassificationScheme(cs, _filter)


def _folder_metaset(id_folder):
    return config["folders"].get(id_folder, {}).get("meta_set", [])


class MetaTypes(metaclass=CachedObject):
    def __init__(self, id_folder=None):
        self.id_folder = id_folder
        self._meta_types = None

    @property
    def meta_types(self):
        if not self._meta_types:
            self._meta_types = config["meta_types"]
            if self.id_folder:
                self._meta_types = copy.deepcopy(self._meta_types)
                for key, settings in _folder_metaset(self.id_folder):
                    self._meta_types[key].update(settings)
        return self._meta_types

    def __getitem__(self, key):
        return MetaType(key, self.meta_types.get(key, None))

    def __setitem__(self, key, value):
        if type(value) == MetaType:
            data = value.settings
        elif type(value) == dict:
            data = value
        else:
            return
        self.meta_types[key] = data

    def __iter__(self):
        return self.meta_types.__iter__()


meta_types = MetaTypes()


def clear_cs_cache():
    MetaTypes.clear_cache()
    ClassificationScheme.clear_cache()
