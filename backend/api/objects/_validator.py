import os
from typing import TYPE_CHECKING, Any

import nebula
from nebula.common import import_module
from nebula.enum import ObjectType

if TYPE_CHECKING:
    pass

class Validator:
    validators: dict[str, Any] | None = None

    @classmethod
    def for_object(cls, object_type: ObjectType) -> Any:
        if cls.validators is None:
            cls.load_validators()
        if not cls.validators:
            return None
        return cls.validators.get(object_type.name)

    @classmethod
    def load_validators(cls) -> None:
        nebula.log.trace("Loading validators")
        cls.validators = {}

        if nebula.config.plugin_dir is None:
            return

        for object_type in ObjectType:
            validator_path = os.path.join(
                nebula.config.plugin_dir,
                "validator",
                object_type.value.lower() + ".py",
            )
            if not os.path.exists(validator_path):
                continue

            validator_name = f"{object_type.value.lower()}_validator"
            validator = import_module(validator_name, validator_path)

            if not hasattr(validator, "validate"):
                nebula.log.error(f"Validator {validator_name} has no validate method")
                continue

            nebula.log.debug(f"Loaded validator {validator_name}")
            cls.validators[object_type.name] = validator.validate

