import asyncio
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

import jinja2

import nebula
from nebula.context import require_access

try:
    import mistune

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
    return MIMEText(text, "plain")


async def render_email_template(template_name: str, **kwargs: Any) -> MIMEMultipart:
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
    system = nebula.settings.system
    if not (system.smtp_host and system.smtp_port):
        raise nebula.BadGatewayException("Email is not configured (no SMTP host)")

    addresses = [to] if isinstance(to, str) else list(to)
    sender = reply_address or system.mail_from or "nebula@localhost"
    msg = MIMEText(body) if isinstance(body, str) else body
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = ",".join(addresses)

    context = ssl.create_default_context() if system.smtp_tls else None
    implicit_tls = system.smtp_tls and system.smtp_port == 465
    smtp: smtplib.SMTP
    try:
        if implicit_tls:
            smtp = smtplib.SMTP_SSL(system.smtp_host, system.smtp_port, context=context)
        else:
            smtp = smtplib.SMTP(system.smtp_host, system.smtp_port)
        with smtp:
            if system.smtp_tls and not implicit_tls:
                smtp.starttls(context=context)
            if system.smtp_user and system.smtp_pass:
                smtp.login(system.smtp_user, system.smtp_pass)
            nebula.log.debug(f"Sending email to {addresses}")
            smtp.sendmail(sender, addresses, msg.as_string())
    except OSError as e:  # smtplib errors are OSErrors too
        raise nebula.BadGatewayException(f"Unable to send email: {e}") from e


async def send_mail(
    to: str | list[str],
    subject: str,
    body: str | MIMEText | MIMEMultipart,
    reply_address: str | None = None,
) -> None:
    """Send an email. Raises BadGatewayException (502) if it can't be sent."""
    await asyncio.to_thread(_send_mail, to, subject, body, reply_address)


async def send_invitation_email(user: nebula.User, server_url: str) -> None:
    """Email the user an invitation to log in at server_url. Admins only."""
    require_access(lambda u: u.is_admin, "Only admins can send invitation emails")
    if not user.get("email"):
        raise nebula.BadRequestException("User does not have an email address")

    body = await render_email_template(
        "user-invite",
        email=user["email"],
        login_name=user.name,
        full_name=user.display_name,
        site_name=nebula.config.site_name,
        url=server_url,
    )
    subject = f"Invitation to {nebula.config.site_name.upper()}"
    await send_mail(user["email"], subject, body)
