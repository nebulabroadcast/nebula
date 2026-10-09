"""Simple queries from a GET query string.

    ?fields=id,title&sort=-ctime,title&limit=50&q=news&id_folder=1&id_folder=2

Any parameter that isn't a query option is an equality filter. Repeating
it means `in`. Values are parsed according to the field's kind.
"""

from collections.abc import Callable
from typing import Annotated, Any

from fastapi import Query, Request
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from starlette.datastructures import QueryParams

from server.query.models import FilterAnd, FilterCondition, QueryRequest
from server.query.schema import FieldKind, QueryField, QuerySchema, QueryValidationError

QUERY_OPTIONS = {"fields", "sort", "q", "limit", "cursor", "include_total"}

# Consumed by the authentication middleware, never filters
AUTH_PARAMS = {"token", "api_key"}

TRUE_VALUES = {"true", "1"}
FALSE_VALUES = {"false", "0"}


def parse_value(field: QueryField, raw: str) -> Any:
    try:
        if field.kind == FieldKind.INTEGER:
            return int(raw)
        if field.kind == FieldKind.NUMBER:
            return float(raw)
    except ValueError as e:
        raise QueryValidationError(
            f"Field '{field.key}' expects a {field.kind} value"
        ) from e

    if field.kind == FieldKind.BOOLEAN:
        if raw.lower() in TRUE_VALUES:
            return True
        if raw.lower() in FALSE_VALUES:
            return False
        raise QueryValidationError(f"Field '{field.key}' expects true or false")

    if field.kind == FieldKind.STRING:
        return raw

    raise QueryValidationError(
        f"Field '{field.key}' can't be filtered in the query string. Use QUERY"
    )


def split_list(value: str | None) -> list[str] | None:
    if value is None:
        return None
    return [item.strip() for item in value.split(",") if item.strip()]


def query_from_params(params: QueryParams, schema: QuerySchema) -> QueryRequest:
    conditions = []
    for key in dict.fromkeys(params.keys()):
        if key in QUERY_OPTIONS or key in AUTH_PARAMS:
            continue
        field = schema.get(key)
        values = [parse_value(field, raw) for raw in params.getlist(key)]
        if len(values) == 1:
            conditions.append(FilterCondition(key=key, op="eq", value=values[0]))
        else:
            conditions.append(FilterCondition(key=key, op="in", value=values))

    data: dict[str, Any] = {
        "fields": split_list(params.get("fields")),
        "sort": split_list(params.get("sort")),
        "q": params.get("q"),
        "cursor": params.get("cursor"),
    }
    if (limit := params.get("limit")) is not None:
        data["limit"] = limit
    if (include_total := params.get("include_total")) is not None:
        data["include_total"] = include_total
    if conditions:
        data["filter"] = FilterAnd(and_=conditions)

    try:
        return QueryRequest.model_validate(data)
    except ValidationError as e:
        # Report it like any other request validation error (422)
        errors = [{**error, "loc": ("query", *error["loc"])} for error in e.errors()]
        raise RequestValidationError(errors) from e


def query_params_dependency(
    schema_factory: Callable[[], QuerySchema],
) -> Callable[..., QueryRequest]:
    """FastAPI dependency parsing a GET list query for one resource.

    The standard options are declared so they show up in OpenAPI. They are
    parsed, together with the filters, by `query_from_params`.
    """

    def dependency(  # noqa: PLR0913
        request: Request,
        fields: Annotated[
            str | None, Query(description="Comma-separated fields to return")
        ] = None,
        sort: Annotated[
            str | None,
            Query(description="Comma-separated sort keys, '-' for descending"),
        ] = None,
        q: Annotated[str | None, Query(description="Search")] = None,
        limit: Annotated[int, Query(ge=1, le=1000)] = 100,
        cursor: Annotated[
            str | None, Query(description="`next_cursor` of the previous page")
        ] = None,
        include_total: Annotated[
            bool, Query(description="Count all matching objects")
        ] = False,
    ) -> QueryRequest:
        del fields, sort, q, limit, cursor, include_total
        return query_from_params(request.query_params, schema_factory())

    return dependency
