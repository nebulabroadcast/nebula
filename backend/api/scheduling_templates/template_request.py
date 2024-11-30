import nebula
from nebula.helpers.create_new_event import create_new_event
from server.dependencies import CurrentUser, RequestInitiator
from server.request import APIRequest

from .models import (
    ApplyTemplateRequestModel,
    ListTemplatesResponseModel,
    TemplateItemModel,
)
from .template_importer import TemplateImporter
from .utils import list_templates, load_template


class ListTemplatesRequest(APIRequest):
    """Retrieve or update the schedule for a channel

    This endpoint handles chanel macro-scheduling,
    including the creation, modification, and deletion of playout events.

    Schedule is represented as a list of events, typically for one week.
    """

    name = "list-scheduling-templates"
    title = "List scheduling templates"
    response_model = ListTemplatesResponseModel

    async def handle(
        self,
        #        user: CurrentUser,
        initiator: RequestInitiator,
    ) -> ListTemplatesResponseModel:
        template_names = list_templates()

        return ListTemplatesResponseModel(
            templates=[
                TemplateItemModel(name=name, title=name.capitalize())
                for name in template_names
            ]
        )


class ApplyTemplateRequest(APIRequest):
    """Apply a template to a channel"""

    name = "apply-scheduling-template"
    title = "Apply scheduling template"

    async def handle(
        self,
        user: CurrentUser,
        request: ApplyTemplateRequestModel,
        initiator: RequestInitiator,
    ) -> None:
        if not (channel := nebula.settings.get_playout_channel(request.id_channel)):
            raise nebula.BadRequestException(f"No such channel {request.id_channel}")

        template = load_template(request.template_name)
        hh, mm = channel.day_start

        importer = TemplateImporter(template.get("schedule", {}), hh, mm)
        edata = importer.build_for_week(request.date)

        if not edata:
            nebula.log.warn("No events found in template")
            return

        first_ts = min(edata.keys())
        last_ts = max(edata.keys())

        pool = await nebula.db.pool()
        async with pool.acquire() as conn, conn.transaction():
            if request.clear:
                # Clear mode
                query = """
                    DELETE FROM events
                    WHERE start >= $1 AND start <= $2 AND id_channel = $3
                """
                await conn.execute(query, first_ts, last_ts, request.id_channel)

            else:
                # Merge mode
                query = """
                    SELECT start FROM events
                    WHERE start >= $1 AND start <= $2 AND id_channel = $3
                """
                existing_times = []
                async for row in nebula.db.iterate(
                    query, first_ts, last_ts, request.id_channel
                ):
                    existing_times.append(row["start"])

                MINIMUM_GAP_SECONDS = 5 * 60
                for new_ts in list(edata.keys()):
                    if any(
                        abs(new_ts - existing_ts) < MINIMUM_GAP_SECONDS
                        for existing_ts in existing_times
                    ):
                        nebula.log.warn(
                            f"Skipping event at {new_ts}: too close to existing event"
                        )
                        edata.pop(new_ts)

            for _, event_data in edata.items():
                await create_new_event(channel, event_data, user, conn)
