import nebula
from nebula.common import SerializableValue, sql_list
from nebula.enum import MetaClass
from nebula.exceptions import NebulaException
from nebula.metadata.normalize import normalize_meta
from nx.utils import slugify

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
            # TODO casting to numbers for <, >, <=, >=
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
        order_by = f"a.meta->>'{order_by}'"

    if cast_order_by:
        order_by = f"COALESCE(CAST({order_by} AS {cast_order_by}), 0)"

    return order_by


def build_query(
    request: BrowseAssetsRequest,
    columns: set[str],
    user: nebula.User,
) -> str:
    cond_list: list[str] = []

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
    if request.query:
        # use slugify to generate search terms
        like_tokens = [
            f"'{f}%'"
            for f in slugify(
                request.query,
                make_set=True,
                min_length=3,
            )
        ]

        if like_tokens:
            ft_cte = f"""

            WITH ft_cte AS (
                SELECT ft.id
                FROM ft
                CROSS JOIN unnest(ARRAY[{",".join(like_tokens)}]) AS q(token)
                WHERE ft.object_type = 0
                AND ft.value LIKE q.token
                GROUP BY ft.id
                HAVING COUNT(DISTINCT q.token) = {len(like_tokens)}
            )

            """
            ft_join = """JOIN ft_cte ON ft_cte.id = a.id"""

    # Access control

    if user.is_limited:
        c1 = f"a.meta->>'created_by' = '{user.id}'"
        c2 = f"a.meta->'assignees' @> '[{user.id}]'::JSONB"
        cond_list.append(f"({c1} OR {c2})")

    if (can_view := user["can/asset_view"]) and isinstance(can_view, list):
        cond_list.append(f"a.id_folder IN {sql_list(can_view)}")

    # Build conditions

    conds = "WHERE " + " AND ".join(cond_list) if cond_list else ""

    # Build order

    if request.order_by in [*list(columns), "ctime"]:
        order_by = request.order_by
    else:
        order_by = "ctime"

    order_by = build_order(order_by)

    # Build query

    return f"""
        {ft_cte}
        SELECT meta FROM assets a
        {ft_join}
        {conds}
        ORDER BY {order_by} {request.order_dir}, a.id DESC
        LIMIT {request.limit}
        OFFSET {request.offset}
    """
