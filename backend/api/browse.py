from typing import Any, Literal

from fastapi import Depends
from nxtools import slugify
from pydantic import Field

import nebula
from nebula.common import sql_list
from nebula.enum import MetaClass
from nebula.exceptions import NebulaException
from nebula.metadata.normalize import normalize_meta
from server.dependencies import current_user
from server.models import RequestModel, ResponseModel
from server.request import APIRequest

# The following columns will be appended to the result
# regardless the view configuration (needed for UI)

REQUIRED_COLUMNS = [
    "id",
    "id_folder",
    "status",
    "content_type",
    "media_type",
    "ctime",
]

#
# Models
#

OrderDirection = Literal["asc", "desc"]
ConditionOperator = Literal[
    "=", "LIKE", "ILIKE", "IN", "NOT IN", "IS NULL", "IS NOT NULL", ">", ">=", "<", "<="
]


class ConditionModel(RequestModel):
    key: str = Field(..., example="status")
    value: Any = Field(None, example=1)
    operator: str = Field("=", example="=")


class BrowseRequestModel(RequestModel):
    view: int | None = Field(
        None,
        title="View ID",
        example=1,
    )
    query: str | None = Field(
        None,
        title="Search query",
        example="star trek",
    )
    conditions: list[ConditionModel] | None = Field(
        default_factory=list,
        title="Conditions",
        description="List of additional conditions",
        example=[
            {"key": "id_folder", "value": 1, "operator": "="},
        ],
    )
    columns: list[str] | None = Field(
        None,
        title="Columns",
        description="Override the view columns."
        "Note that several columns are always included.",
        example=["title", "subtitle", "id_folder"],
    )
    ignore_view_conditions: bool = Field(False, title="Ignore view conditions")
    limit: int = Field(500, title="Limit", description="Maximum number of items")
    offset: int = Field(0, title="Offset", description="Offset")
    order_by: str | None = Field("ctime", title="Order by")
    order_dir: OrderDirection = Field("desc", title="Order direction")


class BrowseResponseModel(ResponseModel):
    columns: list[str] = Field(default_factory=list)
    data: list[dict[str, Any]] = Field(
        default_factory=list,
        example=[
            {
                "id": 1,
                "title": "Star Trek IV",
                "subtitle": "The Voyage Home",
                "id_folder": 1,
                "status": 1,
                "duration": 6124.3,
            }
        ],
    )
    order_by: str | None = Field(None)
    order_dir: OrderDirection = Field(None)


#
# Request
#


def sanitize_value(value: Any) -> Any:
    if type(value) is str:
        value = value.replace("'", "''")
        return f"'{value}'"
    return value


def build_conditions(conditions: list[ConditionModel]) -> list[str]:
    cond_list: list[str] = []
    for condition in conditions:
        assert condition.key in nebula.settings.metatypes
        condition.value = normalize_meta(condition.key, condition.value)
        if condition.operator in ["IN", "NOT IN"]:
            assert type(condition.value) is list
            values = [sanitize_value(v) for v in condition.value]
            cond_list.append(f"{condition.key} {condition.operator} {sql_list(values)}")
        elif condition.operator in ["IS NULL", "IS NOT NULL"]:
            cond_list.append(f"meta->>'{condition.key}' {condition.operator}")
        else:
            value = sanitize_value(condition.value)
            assert value
            cond_list.append(f"meta->>'{condition.key}' {condition.operator} {value}")
    return cond_list


def process_inline_conditions(request: BrowseRequestModel):
    if request.query:
        query_elements = request.query.split(" ")
        reduced_query = []
        for element in query_elements:
            if ":" in element:
                key, value = element.split(":", 1)
                if key and value:
                    if request.conditions is None:
                        request.conditions = []
                    request.conditions.append(
                        ConditionModel(key=key, value=value, operator="LIKE")
                    )
            else:
                reduced_query.append(element)
        request.query = " ".join(reduced_query)


def build_order(order_by: str) -> str:
    # Select the key to order by
    # Ensure the key is in the columns list
    # This effectively prevents SQL injections

    cast_order_by = None
    if order_by_type := nebula.settings.metatypes.get(order_by):
        match order_by_type.metaclass:
            case MetaClass.DATETIME | MetaClass.TIMECODE | MetaClass.NUMERIC:
                cast_order_by = "NUMERIC"
            case MetaClass.INTEGER:
                cast_order_by = "INTEGER"
            case _:
                cast_order_by = None

    # By default try to sort by database columns,
    # since they are indexed and faster. It the user
    # wants to sort by a key which is not a database
    # column, we need to sort by the JSONB key

    if order_by not in nebula.Asset.db_columns:
        order_by = f"meta->>'{order_by}'"

    if cast_order_by:
        order_by = f"CAST({order_by} AS {cast_order_by})"

    return order_by


def build_query(
    request: BrowseRequestModel,
    columns: set[str],
    user: nebula.User,
) -> str:
    cond_list: list[str] = []

    if request.view is None:
        try:
            request.view = nebula.settings.views[0]
        except IndexError:
            raise NebulaException("No views defined")

    # Process views

    if request.view is not None and not request.ignore_view_conditions:
        assert type(request.view) is int
        if (view := nebula.settings.get_view(request.view)) is not None:
            if view.folders:
                cond_list.append(f"id_folder IN {sql_list(view.folders)}")

            if view.states:
                cond_list.append(f"status IN {sql_list(view.states)}")

            if view.conditions:
                cond_list.extend(view.conditions)

    process_inline_conditions(request)

    if request.conditions:
        cond_list.extend(build_conditions(request.conditions))

    # Process full text

    if request.query:
        for elm in slugify(request.query, make_set=True):
            # no need to sanitize this. slugified strings are safe
            cond_list.append(f"id IN (SELECT id FROM ft WHERE value LIKE '{elm}%')")

    # Access control

    if user.is_limited:
        cond_list.append(f"meta->>'created_by' = '{user.id}'")

    # Build conditions

    if cond_list:
        conds = "WHERE " + " AND ".join(cond_list)
    else:
        conds = ""

    # Build order

    if request.order_by in list(columns) + ["ctime"]:
        order_by = request.order_by
    else:
        order_by = "ctime"

    order_by = build_order(order_by)

    # Build query

    query = f"""
        SELECT meta FROM assets {conds}
        ORDER BY {order_by} {request.order_dir}
        LIMIT {request.limit}
        OFFSET {request.offset}
    """
    # print(query)
    return query


class Request(APIRequest):
    """Browse the assets database."""

    name: str = "browse"
    response_model = BrowseResponseModel

    async def handle(
        self,
        request: BrowseRequestModel,
        user: nebula.User = Depends(current_user),
    ) -> BrowseResponseModel:

        columns = ["title", "duration"]
        if request.view is not None and not request.columns:
            assert type(request.view) is int
            if (view := nebula.settings.get_view(request.view)) is not None:
                columns = view.columns
        elif request.columns:
            columns = request.columns

        all_columns = set(REQUIRED_COLUMNS + columns)
        if "duration" in all_columns:
            all_columns.add("mark_in")
            all_columns.add("mark_out")

        query = build_query(request, all_columns, user)

        records = []
        async for record in nebula.db.iterate(query):
            row = {}
            for column in all_columns:
                if column in record["meta"]:
                    row[column] = record["meta"][column]
            records.append(row)
        return BrowseResponseModel(
            columns=columns,
            data=records,
            order_by=request.order_by,
            order_dir=request.order_dir,
        )
