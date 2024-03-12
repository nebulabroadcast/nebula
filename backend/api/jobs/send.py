import time
from typing import Any

from pydantic import Field

import nebula
from server.dependencies import CurrentUser
from server.models import RequestModel, ResponseModel
from server.request import APIRequest


class SendRequestModel(RequestModel):
    ids: list[int] = Field(
        default_factory=list,
        title="Asset IDs",
        description="List of asset ids",
    )
    id_action: int = Field(
        ...,
        title="Action ID",
        description="Action ID",
    )
    restart_existing: bool = Field(
        True,
        title="Restart existing jobs",
    )
    restart_running: bool = Field(
        True,
        title="Restart running jobs",
    )
    params: dict[str, Any] = Field(
        default_factory=dict,
        title="Additional job parameters (action specific)",
        examples=[{"bitrate": "4000k"}],
    )
    priority: int = Field(3, title="Job priority")


class SendResponseModel(ResponseModel):
    ids: list[int | None] = Field(
        default_factory=list,
        title="Job IDs",
        description="List of job ids created/restarted.",
    )


async def send_to(
    id_asset: int,
    id_action: int,
    params: dict[str, Any],
    user: nebula.User,
    priority: int = 3,
    restart_existing: bool = True,
    restart_running: bool = False,
) -> int | None:
    """Create or restart a job for a given asset and action ID.

    Returns ID of the job created/restarted or None if no job was created.
    """
    res = await nebula.db.fetch("SELECT id FROM actions WHERE id = $1", id_action)
    if not res:
        raise nebula.NotFoundException("No such action")

    query = "SELECT id FROM jobs WHERE id_asset=$1 AND id_action=$2 AND settings=$3"
    res = await nebula.db.fetch(query, id_asset, id_action, params)
    if res:
        # job exists
        if not restart_existing:
            # job exists, but not restarting
            nebula.log.trace(
                f"{user} requested sending {id_asset} to {id_action} "
                " but the job already exists. skipping"
            )
            return None

        conds = "0,5"
        if not restart_running:
            conds += ",1"

        query = f"""
            UPDATE jobs SET
                id_user=$1,
                id_service=NULL,
                message='Restart requested',
                status=5,
                retries=0,
                creation_time=$2,
                start_time=NULL,
                end_time=NULL
            WHERE id=$3
                AND status NOT IN ({conds})
            RETURNING id
        """

        result = await nebula.db.fetch(query, user.id, time.time(), res[0]["id"])

        id_job: int | None = None

        if result:
            id_job = result[0]["id"]
            await nebula.msg(
                "job_progress",
                id=id_job,
                id_asset=id_asset,
                id_action=id_action,
                progress=0,
            )
            nebula.log.info(f"{user} restarted job {id_job}")
            return id_job

        nebula.log.warning(f"Unable to restart job {id_job}")
        return id_job

    query = """
        INSERT INTO jobs (
            id_asset,
            id_action,
            id_user,
            settings,
            priority,
            message,
            creation_time
        ) VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            'Pending',
            $6
        )
        RETURNING id
    """

    res = await nebula.db.fetch(
        query, id_asset, id_action, user.id, params, priority, time.time()
    )

    if res:
        id_job = res[0]["id"]
        await nebula.msg(
            "job_progress",
            id=id_job,
            id_asset=id_asset,
            id_action=id_action,
            progress=0,
            message="Job created",
        )
        nebula.log.info(f"{user} created a new job {id_job}")
        return id_job
    return None


class SendRequest(APIRequest):
    """Create jobs for a given list of assets."""

    name: str = "send"
    title: str = "Send to"
    response_model = SendResponseModel

    async def handle(
        self,
        request: SendRequestModel,
        user: CurrentUser,
    ) -> SendResponseModel:
        if not user.can("job_control", request.id_action):
            raise nebula.ForbiddenException()

        nebula.log.info(
            f"Starting action {request.id_action} "
            f"for assets {', '.join([str(id) for id in request.ids])}"
        )

        result: list[int | None] = []
        for id_asset in request.ids:
            id_job = await send_to(
                id_asset=id_asset,
                id_action=request.id_action,
                params=request.params,
                user=user,
                priority=request.priority,
                restart_existing=request.restart_existing,
                restart_running=request.restart_running,
            )
            result.append(id_job)

        return SendResponseModel(ids=result)
