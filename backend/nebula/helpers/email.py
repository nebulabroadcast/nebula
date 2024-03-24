import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

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
        part2 = MIMEText(html, "html")
        msg.attach(part1)
        msg.attach(part2)
        return msg
    else:
        return MIMEText(text, "plain")


def send_mail(
    to: str | list[str],
    subject: str,
    body: str | MIMEText | MIMEMultipart,
    reply_address: str | None = None,
) -> None:
    addresses: list[str] = []
    if isinstance(to, str):
        addresses.append(to)
    else:
        addresses.extend(to)

    if reply_address is None:
        reply_address = nebula.settings.system.mail_from or "nebula@localhost"

    msg: MIMEText | MIMEMultipart
    msg = MIMEText(body) if isinstance(body, str) else body

    msg["Subject"] = subject
    msg["From"] = reply_address
    msg["To"] = ",".join(to)

    try:
        assert nebula.settings.system.smtp_host is not None, "SMTP host not set"
        assert nebula.settings.system.smtp_port is not None, "SMTP port not set"
    except AssertionError as e:
        nebula.log.error(f"Unable to send email: {e}")
        return

    if nebula.settings.system.smtp_port == 25:
        s = smtplib.SMTP(nebula.settings.system.smtp_host, port=25)
    else:
        s = smtplib.SMTP_SSL(
            nebula.settings.system.smtp_host, port=nebula.settings.system.smtp_port
        )

    user = nebula.settings.system.smtp_user
    password = nebula.settings.system.smtp_pass

    if user:
        assert password is not None, "SMTP user set but no password"

    if user and password:
        s.login(user, password)
    s.sendmail(reply_address, addresses, msg.as_string())
