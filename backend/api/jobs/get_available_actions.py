from pydantic import Field

import nebula
from nebula.enum import *  # noqa
from nx.utils import xml
from server import APIModel, APIRequest
from server.dependencies import CurrentUser


class GetAvailableActionsRequest(APIModel):
    ids: list[int] = Field(
        ...,
        title="Asset IDs",
        description="List of asset IDs for which to get available actions",
        examples=[[1, 2, 3]],
    )


class ActionItemModel(APIModel):
    id: int = Field(..., title="Action ID", examples=[1])
    name: str = Field(..., title="Action name", examples=["proxy"])


class GetaAvailableActionsResponse(APIModel):
    actions: list[ActionItemModel] = Field(
        default_factory=list,
        title="Actions",
        description="List of available actions",
    )


class GetAvailableActions(APIRequest):
    """Get available actions for given list of assets

    Every action is evaluated for each asset using the `allow_if` condition
    in the action settings and only returned if the condition is true for all assets.

    This allows to start jobs on multiple assets at once.
    """

    name = "actions"
    title = "Get available actions"
    category = "Jobs"

    async def handle(
        self,
        request: GetAvailableActionsRequest,
        user: CurrentUser,
    ) -> GetaAvailableActionsResponse:
        result = []

        query = """
            SELECT id, service_type, title, settings
            FROM actions
            ORDER BY title ASC
        """

        async for row in nebula.db.iterate(query):
            if not user.can("job_control", row["id"]):
                continue

            action_settings = xml(row["settings"])
            if action_settings is None:
                continue

            if allow_if_elm := action_settings.findall("allow_if"):
                allow_if_cond = allow_if_elm[0].text
                if not allow_if_cond:
                    continue

                for id_asset in request.ids:
                    asset = await nebula.Asset.load(id_asset)
                    assert asset
                    if not eval(allow_if_cond):
                        break
                else:
                    result.append(
                        ActionItemModel(
                            id=row["id"],
                            name=row["title"],
                        )
                    )
        nebula.log.trace(f"Actions for assets {request.ids} are {result}")
        return GetaAvailableActionsResponse(actions=result)
