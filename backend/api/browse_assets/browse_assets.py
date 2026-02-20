import nebula
from server import APIRequest
from server.dependencies import CurrentUser

from ._models import BrowseAssetsRequest, BrowseAssetsResponse
from ._query import build_query

# The following columns will be appended to the result
# regardless the view configuration (needed for UI)

REQUIRED_COLUMNS = [
    "id",
    "id_folder",
    "title",
    "subtitle",
    "status",
    "content_type",
    "media_type",
    "ctime",
    "mtime",
    "video/fps_f",
    "subclips",
]

class Request(APIRequest):
    """Browse the assets database."""

    name = "browse"
    title = "Browse assets"
    category = "Asset management"

    async def handle(
        self,
        request: BrowseAssetsRequest,
        user: CurrentUser,
    ) -> BrowseAssetsResponse:
        columns: list[str] = ["title", "duration"]
        if request.view is not None and not request.columns:
            assert isinstance(request.view, int), "View must be an integer"
            view = nebula.settings.get_view(request.view)
            if (view is not None) and (view.columns is not None):
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
        return BrowseAssetsResponse(
            columns=columns,
            data=records,
            order_by=request.order_by,
            order_dir=request.order_dir,
        )
