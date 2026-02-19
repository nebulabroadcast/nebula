from typing import Annotated

import jinja2
from fastapi import Query
from fastapi.responses import HTMLResponse, Response

from server.request import APIRequest


class TestEmailTemplate(APIRequest):
    name = "test-email-template"
    title = "Test email template"
    methods = ["GET"]

    async def handle(
        self, plain: Annotated[bool, Query(alias="plain")] = False
    ) -> Response:
        env = jinja2.Environment(
            loader=jinja2.FileSystemLoader("assets/email"),
            autoescape=jinja2.select_autoescape(["html", "xml"]),
        )

        template = env.get_template("password-reset.jinja2")

        rendered_template = template.render(
            site_name="Example Site",
            full_name="foo bar",
            email="foo.bar@post.cz",
            reset_link="https://example.com/reset?token=abc123",
            __plain__=plain,
        ).strip()

        if plain:
            return Response(content=rendered_template, media_type="text/plain")
        else:
            return HTMLResponse(content=rendered_template)
