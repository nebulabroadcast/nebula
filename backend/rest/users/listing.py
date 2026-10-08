from typing import Annotated, Any

from fastapi import APIRouter, Depends

import nebula
from rest.users.common import PREFIX, resolve_fields, serialize_user, users_query_schema
from rest.users.models import UserModel
from server.query import (
    QueryRequest,
    QueryResponse,
    compile_query,
    query_params_dependency,
    run_query,
)

router = APIRouter(prefix=PREFIX)


async def query_users(query: QueryRequest) -> QueryResponse[UserModel]:
    nebula.User.ensure_can_list()
    fields = resolve_fields(query.fields)
    compiled = compile_query(users_query_schema(), query, select="u.meta")
    result = await run_query(compiled)

    response: dict[str, Any] = {
        "items": [serialize_user(row["meta"], fields) for row in result.rows],
        "next_cursor": result.next_cursor,
        "has_more": result.has_more,
    }
    if result.total is not None:
        response["total"] = result.total
    return QueryResponse[UserModel].model_validate(response)


@router.get(
    "",
    operation_id="users_list",
    summary="List users",
    response_model_exclude_unset=True,
)
async def list_users(
    query: Annotated[
        QueryRequest, Depends(query_params_dependency(users_query_schema))
    ],
) -> QueryResponse[UserModel]:
    """List users. Query parameters other than the options are equality
    filters (`?is_admin=true`); repeat one to match any of the values.

    Admins only.
    """
    return await query_users(query)


@router.api_route(
    "",
    methods=["QUERY"],
    operation_id="users_query",
    summary="Query users",
    response_model_exclude_unset=True,
)
async def query_users_query(query: QueryRequest) -> QueryResponse[UserModel]:
    """Query users with the full query model (filter tree, search, sort).

    Admins only.
    """
    return await query_users(query)


@router.post(
    "/query",
    operation_id="users_query_post",
    summary="Query users (POST)",
    response_model_exclude_unset=True,
)
async def query_users_post(query: QueryRequest) -> QueryResponse[UserModel]:
    """Same as `QUERY /users`, for clients that can't send the QUERY method."""
    return await query_users(query)
