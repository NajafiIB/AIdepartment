from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage
from pathlib import Path
from typing import Any


ROOT_DIR = Path(__file__).resolve().parents[2]
LOCAL_ENV_PATH = ROOT_DIR / ".env.local"


def local_env_value(name: str, fallback: str = "") -> str:
    value = os.environ.get(name)
    if value:
        return value.strip().strip('"').strip("'")
    if not LOCAL_ENV_PATH.exists():
        return fallback
    try:
        for raw_line in LOCAL_ENV_PATH.read_text(encoding="utf-8-sig").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key.strip() == name:
                return value.strip().strip('"').strip("'")
    except OSError:
        return fallback
    return fallback


def smtp_config() -> dict[str, Any]:
    host = local_env_value("SWISS_PLANNER_SMTP_HOST")
    port = int(local_env_value("SWISS_PLANNER_SMTP_PORT", "587") or "587")
    user = local_env_value("SWISS_PLANNER_SMTP_USER")
    password = local_env_value("SWISS_PLANNER_SMTP_PASSWORD")
    sender = local_env_value("SWISS_PLANNER_SMTP_FROM", user)
    use_tls = local_env_value("SWISS_PLANNER_SMTP_USE_TLS", "true").strip().lower() not in {"0", "false", "no"}
    return {
        "configured": bool(host and sender),
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "sender": sender,
        "useTls": use_tls,
    }


def send_smtp_email(
    *,
    to: list[str],
    cc: list[str] | None = None,
    bcc: list[str] | None = None,
    subject: str,
    body: str,
    attachments: list[Path] | None = None,
) -> dict[str, Any]:
    config = smtp_config()
    if not config["configured"]:
        return {"ok": False, "error": "SMTP is not configured.", "smtpConfigured": False}

    message = EmailMessage()
    message["From"] = config["sender"]
    message["To"] = ", ".join(to)
    if cc:
        message["Cc"] = ", ".join(cc)
    message["Subject"] = subject
    message.set_content(body or "")

    for path in attachments or []:
        data = path.read_bytes()
        message.add_attachment(
            data,
            maintype="application",
            subtype="octet-stream",
            filename=path.name,
        )

    recipients = list(to or []) + list(cc or []) + list(bcc or [])
    with smtplib.SMTP(config["host"], config["port"], timeout=60) as smtp:
        if config["useTls"]:
            smtp.starttls()
        if config["user"]:
            smtp.login(config["user"], config["password"])
        smtp.send_message(message, from_addr=config["sender"], to_addrs=recipients)

    return {"ok": True, "smtpConfigured": True, "recipients": recipients}
