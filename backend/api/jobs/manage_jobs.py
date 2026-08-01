import time

import nebula
from nx.utils import slugify
from server import APIRequest
from server.dependencies import CurrentUser

from ._models import JobListItem, ManageJobsRequest, ManageJobsResponse


async def can_user_control_job(user: nebula.User, id_job: int) -> bool:
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
        message=$1,
        creation_time=$2
        WHERE id = $3
    """
    await nebula.db.execute(query, message, int(time.time()), id_job)
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


async def set_priority(id_job: int, priority: int, user: nebula.User) -> None:
    """Set the priority of a job if the user has the necessary permissions"""
    if not await can_user_control_job(user, id_job):
        raise nebula.ForbiddenException("You cannot set priority of this job")
    nebula.log.info(f"Setting priority of job {id_job} to {priority}", user=user.name)
    query = "UPDATE jobs SET priority = $1 WHERE id = $2"
    await nebula.db.execute(query, priority, id_job)


class ManageJobs(APIRequest):
    """Get list of jobs, abort or restart them"""

    name = "jobs"
    title = "Manage jobs"
    category = "Jobs"

    async def handle(  # noqa: C901, PLR0912
        self,
        request: ManageJobsRequest,
        user: CurrentUser,
    ) -> ManageJobsResponse:
        if request.abort:
            await abort_job(request.abort, user)

        if request.restart:
            await restart_job(request.restart, user)

        if request.priority is not None:
            await set_priority(request.priority[0], request.priority[1], user)

        # Return a list of jobs if requested

        conds = []
        if request.search_query:
            for elm in slugify(request.search_query, make_set=True):
                assert elm, "Empty search element"
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
            return ManageJobsResponse()

        if request.asset_ids is not None:
            ids = ",".join([str(_id) for _id in request.asset_ids])
            conds.append(f"j.id_asset IN ({ids})")
        if request.ids is not None:
            ids = ",".join([str(_id) for _id in request.ids])
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
                j.priority AS priority,
                j.message AS message,
                j.creation_time AS ctime,
                j.start_time AS stime,
                j.end_time as etime,
                a.meta->>'title' AS asset_title,
                a.meta->>'subtitle' AS asset_subtitle,
                a.meta->>'id/main' AS idec,
                s.title AS service_name,
                u.login AS user_name,
                ac.title AS action_name,
                ac.service_type as service_type
        FROM jobs as j
        LEFT JOIN assets as a ON a.id = j.id_asset
        LEFT JOIN services as s ON s.id = j.id_service
        LEFT JOIN users as u ON u.id = j.id_user
        LEFT JOIN actions as ac ON ac.id = j.id_action
        {("WHERE " + (" AND ".join(conds))) if conds else ""}
        ORDER BY
            j.creation_time DESC,
            j.end_time DESC
        LIMIT 100
        """

        jobs = []
        async for row in nebula.db.iterate(query):
            asset_name = row["asset_title"]
            if subtitle := row["asset_subtitle"]:
                separator = nebula.settings.system.subtitle_separator
                asset_name = f"{asset_name}{separator}{subtitle}"
            jobs.append(JobListItem(asset_name=asset_name, **row))

        return ManageJobsResponse(jobs=jobs)
