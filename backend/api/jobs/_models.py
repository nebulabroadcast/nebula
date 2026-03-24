import time
from typing import Annotated, Literal

from pydantic import Field

from nebula.enum import JobState
from server import APIModel

TS_EXAMPLE = f"{int(time.time())}"


class ManageJobsRequest(APIModel):
    view: Annotated[
        Literal["all", "active", "finished", "failed"] | None,
        Field(
            None,
            title="View",
            description=(
                "Defines, what jobs should be returned. "
                "When set to none, no jobs will be returned, "
                "but abort/restart/priority "
                "actions will still work"
            ),
        ),
    ]

    ids: Annotated[
        list[int] | None,
        Field(
            title="Job IDs",
            description="Return only the jobs with the given IDs",
            examples=[[42]],
        ),
    ] = None

    asset_ids: Annotated[
        list[int] | None,
        Field(
            title="Asset IDs",
            description="Return jobs of asset with the given IDs",
            examples=[[69]],
        ),
    ] = None

    search_query: Annotated[
        str | None,
        Field(
            title="Search query",
            description="Search for jobs with given string in title",
        ),
    ] = None

    abort: Annotated[
        int | None,
        Field(
            title="Abort",
            description="Abort job with given id",
        ),
    ] = None

    restart: Annotated[
        int | None,
        Field(
            title="Restart",
            description="Restart job with given id",
        ),
    ] = None

    priority: Annotated[
        tuple[int, int] | None,
        Field(
            title="Priority",
            description="Set priority of job with given id. "
            "First value is the job id, second is the priority",
            examples=[[42, 3]],
        ),
    ] = None


class JobListItem(APIModel):
    id: Annotated[
        int,
        Field(
            title="Job ID",
        ),
    ]

    status: Annotated[
        JobState,
        Field(
            title="Job status",
        ),
    ]

    progress: Annotated[
        float,
        Field(
            title="Progress",
            description="Progress of the job in percentage",
            ge=0,
            le=100,
            examples=[24],
        ),
    ]

    id_action: Annotated[
        int,
        Field(
            title="Action ID",
            description="ID of the action this job is running",
            gt=0,
            examples=[1],
        ),
    ]

    id_service: Annotated[
        int | None,
        Field(
            title="Service ID",
            description=(
                "ID of the service this job is running on. "
                "Can be null if the job has not started yet"
            ),
            ge=0,
            examples=[3],
        ),
    ] = None

    id_asset: Annotated[
        int,
        Field(
            title="Asset ID",
            description="ID of the asset this job is processing",
            gt=0,
            examples=[69],
        ),
    ]

    id_user: Annotated[
        int | None,
        Field(
            title="User ID",
            description="ID of the user who started the job",
        ),
    ] = None

    priority: Annotated[
        int,
        Field(
            title="Priority",
            examples=[3],
        ),
    ] = 3

    message: Annotated[
        str,
        Field(
            title="Status description",
            description="Additional information about the job status",
            examples=["Encoding 24%"],
        ),
    ] = ""

    ctime: Annotated[
        float | None,
        Field(
            title="Created at",
            description="Timestamp when the job was created",
            examples=[TS_EXAMPLE],
        ),
    ] = None

    stime: Annotated[
        float | None,
        Field(
            title="Started at",
            description=(
                "Timestamp when the job was started. "
                "Can be null if the job has not started yet"
            ),
            examples=[TS_EXAMPLE],
        ),
    ] = None

    etime: Annotated[
        float | None,
        Field(
            title="Ended at",
            examples=[TS_EXAMPLE],
        ),
    ] = None

    asset_name: Annotated[
        str | None,
        Field(
            title="Asset name",
            description="Asset full title (title + subtitle)",
            examples=["Star Trek IV: The voyage home"],
        ),
    ] = None

    idec: Annotated[
        str | None,
        Field(
            title="Primary identifier",
            examples=["A123456"],
        ),
    ] = None

    action_name: Annotated[
        str | None,
        Field(
            examples=["proxy"],
        ),
    ] = None

    service_name: Annotated[
        str | None,
        Field(
            examples=["conv01"],
        ),
    ] = None

    service_type: Annotated[
        str | None,
        Field(
            examples=["conv"],
        ),
    ] = None


class ManageJobsResponse(APIModel):
    jobs: Annotated[
        list[JobListItem] | None,
        Field(
            title="Jobs",
        ),
    ] = None
