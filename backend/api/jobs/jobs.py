import time
from typing import Literal

from fastapi import Depends, Response
from nxtools import slugify
from pydantic import Field

import nebula
from nebula.objects.user import User
from server.dependencies import current_user
from server.models import RequestModel, ResponseModel
from server.request import APIRequest

#
# Jobs
#

VIEW_FIELD_DESCRIPTION = """Defines, what jobs should be returned.
When set to none, 204 response is returned instead of list of jobs"""


class JobsRequestModel(ResponseModel):
    view: Literal["all", "active", "finished", "failed"] | None = Field(
        None,
        title="View",
        description=VIEW_FIELD_DESCRIPTION,
    )
    ids: list[int] | None = Field(
        None,
        title="Job IDs",
        description="Return only the jobs with the given IDs",
        example=42,
    )
    asset_ids: list[int] | None = Field(
        None,
        title="Asset IDs",
        description="Return jobs of asset with the given IDs",
        example=69,
    )
    search_query: str | None = Field(
        None,
        title="Search query",
        description="Search for jobs with given string in title",
    )
    abort: int | None = Field(
        None,
        title="Abort",
        description="Abort job with given id",
    )
    restart: int | None = Field(
        None,
        title="Restart",
        description="Restart job with given id",
    )


class JobsItemModel(RequestModel):
    id: int
    status: int
    progress: int
    id_action: int
    id_service: int | None
    id_asset: int
    id_user: int | None
    message: str
    ctime: int | None
    stime: int | None
    etime: int | None
    asset_name: str | None
    action_name: str | None
    service_name: str | None


class JobsResponseModel(ResponseModel):
    jobs: list[JobsItemModel] = Field(default_factory=list)


async def can_user_control_job(user: User, id_job: int) -> bool:
    if user.is_admin:
        return True
    if user.can("job_control", True):
        return True
    if user.can("job_control", anyval=True):
        res = await nebula.db.fetch("SELECT id_action FROM jobs WHERE id = $1", id_job)
        if not res:
            return False  # Might as well raise not found exception
        return user.can("job_control", res[0]["id_action"])
    if user.is_limited:
        # Limited users can only control jobs of assets they created
        query = """
            SELECT a.id FROM assets a, jobs j
            WHERE j.id = $1 AND j.id_asset = a.id
            AND (
                a.meta->>'created_by'::INTEGER = $2
                OR a.meta->'assignees' @> '[$2]'::JSONB
        """
        res = await nebula.db.fetch(query, id_job, user.id)
        return bool(res)
    return False


async def restart_job(id_job: int, user: nebula.User) -> None:
    if not await can_user_control_job(user, id_job):
        raise nebula.ForbiddenException("You cannot restart this job")
    nebula.log.info(f"Restarting job {id_job}", user=user.name)
    message = f"Restarted by {user.name}"
    query = """
        UPDATE jobs SET
        id_service=NULL,
        start_time=NULL,
        end_time=NULL,
        status=5,
        retries=0,
        progress=0,
        message=$1
        WHERE id = $2
    """
    await nebula.db.execute(query, message, id_job)
    await nebula.msg(
        "job_progress",
        id=id_job,
        progress=0,
        status=5,
        message=message,
    )


async def abort_job(id_job: int, user: nebula.User) -> None:
    if not await can_user_control_job(user, id_job):
        raise nebula.ForbiddenException("You cannot abort this job")
    nebula.log.info(f"Aborting job {id_job}", user=user.name)
    message = f"Aborted by {user.name}"
    query = """
        UPDATE jobs SET
        status = 4,
        message = $1
        WHERE id = $2
    """
    await nebula.db.execute(query, message, id_job)
    await nebula.msg(
        "job_progress",
        id=id_job,
        progress=0,
        status=4,
        message=message,
    )


class JobsRequest(APIRequest):
    """List and control jobs"""

    name: str = "jobs"
    title: str = "Get list of jobs, abort or restart them"
    response_model = JobsResponseModel

    async def handle(
        self,
        request: JobsRequestModel,
        user: User = Depends(current_user),
    ) -> JobsResponseModel:

        if request.abort:
            await abort_job(request.abort, user)

        if request.restart:
            await restart_job(request.restart, user)

        # Return a list of jobs if requested

        conds = []
        if request.search_query:
            for elm in slugify(request.search_query, make_set=True):
                conds.append(f"a.id IN (SELECT id FROM ft WHERE value LIKE '{elm}%')")

        if user.is_limited:
            conds.append(
                f"""
                (a.meta->>'created_by' = '{user.id}'
                OR a.meta->'assignees' @> '[{user.id}]'::JSONB)
                """
            )

        if request.view == "active":
            # Pending, in_progress, restart
            conds.append(f"(j.status IN (0, 1, 5) OR j.end_time > {time.time() - 30})")
        elif request.view == "finished":
            # completed, aborted, skipped
            conds.append("j.status IN (2, 4, 6)")
        elif request.view == "failed":
            # failed
            conds.append("j.status IN (3)")
        elif request.view is None:
            return Response(status_code=204)

        if request.asset_ids is not None:
            ids = ",".join([str(id) for id in request.asset_ids])
            conds.append(f"j.id_asset IN ({ids})")
        if request.ids is not None:
            ids = ",".join([str(id) for id in request.ids])
            conds.append(f"j.id IN ({ids})")

        query = f"""
            SELECT
                j.id,
                j.id_action AS id_action,
                j.id_asset AS id_asset,
                j.id_service AS id_service,
                j.id_user AS id_user,
                j.status AS status,
                j.progress AS progress,
                j.message AS message,
                j.creation_time AS ctime,
                j.start_time AS stime,
                j.end_time as etime,
                a.meta->>'title' AS asset_name,
                s.title AS service_name,
                u.login AS user_name,
                ac.title AS action_name
        FROM jobs as j
        LEFT JOIN assets as a ON a.id = j.id_asset
        LEFT JOIN services as s ON s.id = j.id_service
        LEFT JOIN users as u ON u.id = j.id_user
        LEFT JOIN actions as ac ON ac.id = j.id_action
        {('WHERE ' + (' AND '.join(conds))) if conds else ''}
        ORDER BY
            j.end_time DESC,
            j.start_time DESC,
            j.creation_time DESC
        LIMIT 100
        """

        jobs = []
        async for row in nebula.db.iterate(query):
            jobs.append(JobsItemModel(**row))

        return JobsResponseModel(jobs=jobs)
