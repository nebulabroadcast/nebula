import nebula
from nebula.helpers.create_new_event import create_new_event
from server.dependencies import CurrentUser
from server.request import APIRequest

from ._models import (
    ApplySchedulingTemplateRequest,
    ListSchedulingTemplatesResponse,
    SchedulingTemplateItemModel,
)
from ._template_importer import TemplateImporter
from ._utils import list_templates, load_template

MINIMUM_GAP_SECONDS = 5 * 60


class ListSchedulingTemplates(APIRequest):
    """List available scheduling templates"""

    name = "list-scheduling-templates"
    title = "List scheduling templates"
    category = "Scheduling"

    async def handle(self, user: CurrentUser) -> ListSchedulingTemplatesResponse:
        _ = user  # Currently not used, but may be used in the future for permissions
        template_names = list_templates()

        return ListSchedulingTemplatesResponse(
            templates=[
                SchedulingTemplateItemModel(name=name, title=name.capitalize())
                for name in template_names
            ]
        )


class ApplySchedulingTemplate(APIRequest):
    """Apply a template to a channel"""

    name = "apply-scheduling-template"
    title = "Apply scheduling template"
    category = "Scheduling"

    async def handle(
        self,
        user: CurrentUser,
        request: ApplySchedulingTemplateRequest,
    ) -> None:
        _ = user  # Required to gate this endpoint behind authentication
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

        async with nebula.db.transaction():
            if request.clear:
                # Clear mode
                query = """
                    DELETE FROM events
                    WHERE start >= $1 AND start <= $2 AND id_channel = $3
                """
                await nebula.db.execute(query, first_ts, last_ts, request.id_channel)

            else:
                # Merge mode
                query = """
                    SELECT start FROM events
                    WHERE start >= $1 AND start <= $2 AND id_channel = $3
                """
                existing_times = [
                    row["start"]
                    for row in await nebula.db.fetch(
                        query, first_ts, last_ts, request.id_channel
                    )
                ]

                for new_ts in list(edata.keys()):
                    if any(
                        abs(new_ts - existing_ts) < MINIMUM_GAP_SECONDS
                        for existing_ts in existing_times
                    ):
                        nebula.log.warn(
                            f"Skipping event at {new_ts}: too close to existing event"
                        )
                        edata.pop(new_ts)

            for event_data in edata.values():
                await create_new_event(channel, event_data)
