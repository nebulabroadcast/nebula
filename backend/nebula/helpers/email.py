import smtplib
import nebula

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

try:
    import mistune  # noqa

    has_mistune = True
except ModuleNotFoundError:
    has_mistune = False


def html2email(html) -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    text = "no plaitext version available"
    part1 = MIMEText(text, "plain")
    part2 = MIMEText(html, "html")

    msg.attach(part1)
    msg.attach(part2)

    return msg


def markdown2email(text) -> MIMEMultipart | MIMEText:
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


def send_mail(to: str, subject: str, body: str | MIMEText | MIMEMultipart, **kwargs):
    if type(to) == str:
        to = [to]
    reply_address = kwargs.get("from", nebula.settings.system.mail_from)

    if isinstance(body, MIMEMultipart):
        msg = body
    else:
        msg = MIMEText(body)

    msg["Subject"] = subject
    msg["From"] = reply_address
    msg["To"] = ",".join(to)
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
    s.sendmail(reply_address, [to], msg.as_string())
