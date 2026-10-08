"""Query model shared by all REST list endpoints (see rest/README.md §7)."""

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

FilterOperator = Literal[
    "eq",
    "ne",
    "lt",
    "lte",
    "gt",
    "gte",
    "in",
    "nin",
    "like",
    "ilike",
    "exists",
    "contains",
]


class FilterModel(BaseModel):
    # Forbidding extra keys is what lets pydantic tell the node types apart
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class FilterCondition(FilterModel):
    key: Annotated[str, Field(description="Field to compare", examples=["title"])]
    op: Annotated[FilterOperator, Field(description="Comparison operator")] = "eq"
    value: Annotated[Any, Field(description="Value to compare with")] = None


class FilterAnd(FilterModel):
    and_: Annotated[list["FilterNode"], Field(alias="and", min_length=1)]


class FilterOr(FilterModel):
    or_: Annotated[list["FilterNode"], Field(alias="or", min_length=1)]


class FilterNot(FilterModel):
    not_: Annotated["FilterNode", Field(alias="not")]


FilterNode = FilterCondition | FilterAnd | FilterOr | FilterNot


class QueryRequest(BaseModel):
    """Query for a list of objects (QUERY /{resource}, POST /{resource}/query)."""

    model_config = ConfigDict(extra="forbid")

    fields: Annotated[
        list[str] | None,
        Field(description="Fields to return. Resource default when omitted"),
    ] = None

    filter: Annotated[
        FilterNode | None,
        Field(
            description="Filter tree",
            examples=[{"and": [{"key": "is_admin", "op": "eq", "value": True}]}],
        ),
    ] = None

    q: Annotated[str | None, Field(description="Fulltext search")] = None

    sort: Annotated[
        list[str] | None,
        Field(
            description="Sort keys, '-' prefix for descending. "
            "Defaults to relevance when searching, '-id' otherwise",
            examples=[["-ctime", "title"]],
        ),
    ] = None

    limit: Annotated[int, Field(ge=1, le=1000)] = 100

    cursor: Annotated[
        str | None,
        Field(description="Value of `next_cursor` from the previous page"),
    ] = None

    include_total: Annotated[
        bool,
        Field(description="Count all matching objects (costs an extra query)"),
    ] = False


class QueryResponse[T](BaseModel):
    items: list[T]
    next_cursor: Annotated[
        str | None,
        Field(description="Pass as `cursor` to get the next page"),
    ] = None
    has_more: bool = False
    total: Annotated[
        int | None,
        Field(description="Number of matching objects, if requested"),
    ] = None
