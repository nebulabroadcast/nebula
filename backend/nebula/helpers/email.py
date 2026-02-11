import asyncio
import json
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import jinja2

import nebula

try:
    import mistune  # noqa

    has_mistune = True
except ModuleNotFoundError:
    has_mistune = False


def html2email(html: str) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    text = "no plaitext version available"
    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")

    msg.attach(part1)
    msg.attach(part2)

    return msg


def markdown2email(text: str) -> MIMEMultipart | MIMEText:
    if has_mistune:
        msg = MIMEMultipart("alternative")
        html = mistune.html(text)
        part1 = MIMEText(text, "plain")
        if isinstance(html, str):  # mistune hack
            part2 = MIMEText(html, "html")
        msg.attach(part1)
        msg.attach(part2)
        return msg
    else:
        return MIMEText(text, "plain")


async def render_email_template(template_name: str, **kwargs) -> MIMEMultipart:
    env = jinja2.Environment(
        loader=jinja2.FileSystemLoader("assets/email"),
        autoescape=jinja2.select_autoescape(["html", "xml"]),
    )
    template = env.get_template(f"{template_name}.jinja2")

    rendered_html = template.render(**kwargs).strip()
    rendered_plain = template.render(__plain__=True, **kwargs).strip()
    msg = MIMEMultipart("alternative")
    part1 = MIMEText(rendered_plain, "plain")
    part2 = MIMEText(rendered_html, "html")
    msg.attach(part1)
    msg.attach(part2)
    return msg


def _send_mail(
    to: str | list[str],
    subject: str,
    body: str | MIMEText | MIMEMultipart,
    reply_address: str | None = None,
) -> None:
    try:
        addresses: list[str] = []
        if isinstance(to, str):
            addresses.append(to)
        else:
            addresses.extend(to)

        if reply_address is None:
            reply_address = nebula.settings.system.mail_from or "nebula@localhost"

        smtp_host = nebula.settings.system.smtp_host
        smtp_port = nebula.settings.system.smtp_port
        smtp_user = nebula.settings.system.smtp_user
        smtp_pass = nebula.settings.system.smtp_pass
        smtp_tls  = nebula.settings.system.smtp_tls

        if not (smtp_host and smtp_port):
            nebula.log.error("SMTP host is not configured, cannot send email")
            return

        msg: MIMEText | MIMEMultipart
        msg = MIMEText(body) if isinstance(body, str) else body

        msg["Subject"] = subject
        msg["From"] = reply_address
        msg["To"] = ",".join(addresses)

        nebula.log.trace(
            f"Connecting to SMTP server {smtp_host}:{smtp_port}"
        )
        with smtplib.SMTP(smtp_host, smtp_port) as smtp:

            if smtp_tls:
                context = ssl.create_default_context()
                smtp.starttls(context=context)

            if smtp_user and smtp_pass:
                nebula.log.trace("Logging in to SMTP server")
                smtp.login(smtp_user, smtp_pass)

            nebula.log.trace(f"Sending email to {','.join(addresses)}")
            smtp.sendmail(reply_address, addresses, msg.as_string())

    except Exception as e:
        nebula.log.error(f"Error sending email to {to}: {e}")


async def send_mail(
    to: str | list[str],
    subject: str,
    body: str | MIMEText | MIMEMultipart,
    reply_address: str | None = None,
) -> None:
    await asyncio.to_thread(_send_mail, to, subject, body, reply_address)
