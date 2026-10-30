from typing import Any

import nebula
from nebula.common import SerializableValue, sql_list
from nebula.enum import MetaClass
from nebula.exceptions import NebulaException
from nebula.helpers.fulltext import fulltext_ranges
from nebula.metadata.normalize import normalize_meta
from nebula.objects.asset.access import asset_acl
from nebula.sql import SQL

from ._models import BrowseAssetsRequest, ConditionModel


def sanitize_value(value: SerializableValue) -> str:
    if isinstance(value, str):
        value = value.replace("'", "''")
    return str(value)


def build_conditions(conditions: list[ConditionModel]) -> list[str]:
    cond_list: list[str] = []
    for condition in conditions:
        assert condition.key in nebula.settings.metatypes, (
            f"Invalid meta key {condition.key}"
        )
        condition.value = normalize_meta(condition.key, condition.value)
        if condition.operator in ["IN", "NOT IN"]:
            assert isinstance(condition.value, list), "Value must be a list"
            values = sql_list([sanitize_value(v) for v in condition.value], t="str")
            cond_list.append(
                f"a.meta->>'{condition.key}' {condition.operator} {values}"
            )
        elif condition.operator in ["IS NULL", "IS NOT NULL"]:
            cond_list.append(f"a.meta->>'{condition.key}' {condition.operator}")
        else:
            value = sanitize_value(condition.value)
            assert value, "Value must not be empty"
            # TODO: casting to numbers for <, >, <=, >=
            cond_list.append(
                f"a.meta->>'{condition.key}' {condition.operator} '{value}'"
            )
    return cond_list


def process_inline_conditions(request: BrowseAssetsRequest) -> None:
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
    # The key is inlined into the SQL, so it must be a known column or
    # meta key: anything else (e.g. a client-sent column name) sorts by ctime

    # Database columns are already typed. Casting them would prevent
    # using their index (idx_ctime...).
    if order_by in nebula.Asset.db_columns:
        return order_by

    if order_by not in nebula.settings.metatypes:
        return "ctime"

    # Not a database column: sort by the JSONB key
    order_by_sql = f"a.meta->>'{order_by}'"
    match nebula.settings.metatypes[order_by].metaclass:
        case MetaClass.DATETIME | MetaClass.TIMECODE | MetaClass.NUMERIC:
            return f"COALESCE(CAST({order_by_sql} AS NUMERIC), 0)"
        case MetaClass.INTEGER:
            return f"COALESCE(CAST({order_by_sql} AS INTEGER), 0)"
        case _:
            return order_by_sql


def build_query(  # noqa: C901
    request: BrowseAssetsRequest,
    columns: set[str],
    user: nebula.User,
) -> tuple[str, list[Any]]:
    """The browse query, with the values to bind to its $n placeholders."""
    cond_list: list[str] = []
    params: list[Any] = []

    if request.view is None:
        try:
            request.view = nebula.settings.views[0].id
        except IndexError as e:
            raise NebulaException("No views defined") from e

    # Process views

    if request.view is not None and not request.ignore_view_conditions:
        assert isinstance(request.view, int), "View must be an integer"
        if (view := nebula.settings.get_view(request.view)) is not None:
            if view.folders:
                cond_list.append(f"a.id_folder IN {sql_list(view.folders)}")

            if view.states:
                cond_list.append(f"a.status IN {sql_list(view.states)}")

            if view.conditions:
                cond_list.extend(view.conditions)

    process_inline_conditions(request)

    if request.conditions:
        cond_list.extend(build_conditions(request.conditions))

    # Process full text

    ft_cte = ft_join = ""
    if request.query and (ranges := fulltext_ranges(request.query)):
        # Assets with a token matching every word. Each word is a separate
        # index range lookup (see fulltext_ranges). Words are slugified
        # (letters and digits only), so they can be inlined, and as
        # constants they give the planner real row estimates.
        lookups = "\nUNION ALL\n".join(
            f"""
            SELECT {n} AS n, id FROM ft
            WHERE object_type = 0 AND value ~>=~ '{lo}' AND value ~<~ '{hi}'
            """
            for n, (lo, hi) in enumerate(ranges)
        )
        ft_cte = f"""
            WITH ft_cte AS (
                SELECT id FROM ({lookups}) AS matches
                GROUP BY id
                HAVING COUNT(DISTINCT n) = {len(ranges)}
            )
        """
        ft_join = """JOIN ft_cte ON ft_cte.id = a.id"""

    # Access control

    # The only bound parameters: everything else is inlined
    if (acl := asset_acl(user, "a")) is not None:
        acl_sql, params = SQL.render(acl)
        cond_list.append(acl_sql)

    # Build conditions

    conds = "WHERE " + " AND ".join(cond_list) if cond_list else ""

    # Build order

    if request.order_by in [*list(columns), "ctime"]:
        order_by = request.order_by
    else:
        order_by = "ctime"

    order_by = build_order(order_by)

    # Build query

    query = f"""
        {ft_cte}
        SELECT meta FROM assets a
        {ft_join}
        {conds}
        ORDER BY {order_by} {request.order_dir}, a.id DESC
        LIMIT {request.limit}
        OFFSET {request.offset}
    """
    return query, params
