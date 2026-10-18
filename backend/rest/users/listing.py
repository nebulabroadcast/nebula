from string.templatelib import Template
from typing import Annotated

from fastapi import APIRouter, Depends

import nebula
from nebula.query import (
    QueryRequest,
    SubstringSearch,
    fetch_page,
)
from rest.users.common import PREFIX
from rest.users.fields import response_keys, user_query_fields, user_response
from rest.users.models import UserList
from server.query.params import query_params_dependency

router = APIRouter(prefix=PREFIX)

SEARCH = SubstringSearch(("login", "full_name", "email"))


def users_base() -> Template:
    """Every user. fetch_page adds filters, search, sorting and paging."""
    return t"SELECT id, login, meta FROM users"


async def query_users(request: QueryRequest) -> UserList:
    nebula.User.ensure_can_list()
    keys = response_keys(request.fields)
    page = await fetch_page(request, user_query_fields(), users_base(), SEARCH)
    items = [user_response(nebula.User.from_row(row), keys) for row in page.rows]
    return UserList.model_validate(page.response(items))


@router.get(
    "",
    operation_id="users_list",
    summary="List users",
    response_model_exclude_unset=True,
)
async def list_users(
    query: Annotated[QueryRequest, Depends(query_params_dependency(user_query_fields))],
) -> UserList:
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
async def query_users_query(query: QueryRequest) -> UserList:
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
async def query_users_post(query: QueryRequest) -> UserList:
    """Same as `QUERY /users`, for clients that can't send the QUERY method."""
    return await query_users(query)
