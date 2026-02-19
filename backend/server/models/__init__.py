__all__ = [
    "APIModel",
    "UserModel",
    "UserPermissionsModel",
    "RequestModel",
    "ResponseModel",
    "ContextPluginResponseModel",
]

from pydantic import BaseModel

from .plugin_models import ContextPluginResponseModel
from .user_models import UserModel, UserPermissionsModel


class APIModel(BaseModel):
    pass


class RequestModel(APIModel):
    """Deprecated: use APIModel instead"""


class ResponseModel(APIModel):
    """Deprecated: use APIModel instead"""
