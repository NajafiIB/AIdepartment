from __future__ import annotations

import json
import re
from email.message import EmailMessage
from pathlib import Path
from typing import Any

import local_store
from connectors.smtp_email import send_smtp_email, smtp_config


APP_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = APP_DIR.parent
OUTBOX_DIR = ROOT_DIR / "outbox"


LOCAL_ACTIONS = {
    "getAiStaffDashboard",
    "getEmailQueueStatus",
    "appendAiStaffTask",
    "appendAiStaffThread",
    "appendAiStaffThreadMessage",
    "appendAiStaffSkillUpdate",
    "approveAiStaffSkillUpdate",
    "appendAiStaffDecision",
    "appendAiStaffKpi",
    "appendAiStaffReport",
    "appendAiStaffRunLog",
    "markAiStaffThreadLearningCandidate",
    "completeAiStaffFollowUp",
    "updateAiStaffEntityStatus",
    "validateEmailContentSafety",
    "verifyQueueAttachments",
    "verifyConfiguredQueueAttachments",
    "processQueueRow",
    "syncSent",
    "syncInbound",
    "reconcileInboundReplies",
    "auditAiStaffProcessHealth",
    "runAiStaffTaskRunner",
    "runLocalTaskRunner",
}


def compact(value: Any) -> str:
    return " ".join(str(value or "").split())


def row_value(row: dict[str, Any] | None, *keys: str) -> str:
    if not isinstance(row, dict):
        return ""
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            return str(value)
    return ""


def split_recipients(value: Any) -> list[str]:
    text = str(value or "").replace(";", ",")
    recipients = []
    for part in text.split(","):
        item = part.strip()
        if item and " " not in item and "@" in item:
            recipients.append(item)
    return recipients


def queue_row(queue_id: str) -> dict[str, Any] | None:
    return local_store.queue_row_from_snapshot(queue_id)


def attachment_values(row: dict[str, Any]) -> list[str]:
    raw = row_value(row, "attachmentDriveUrls", "Attachment Drive URLs", "attachments", "Attachments", "attachmentPaths")
    values = []
    for part in re.split(r"[\n;,]+", raw):
        item = part.strip().strip('"')
        if item:
            values.append(item)
    return values


def local_attachment_path(value: str) -> Path | None:
    text = str(value or "").strip()
    if not text:
        return None
    if text.lower().startswith("file://"):
        text = text[7:]
    path = Path(text.strip('"'))
    if not path.is_absolute():
        path = (ROOT_DIR / path).resolve()
    return path if path.exists() and path.is_file() else None


def attachment_verification(queue_id: str) -> dict[str, Any]:
    row = queue_row(queue_id)
    if not row:
        return {"ok": False, "queueId": queue_id, "error": f"Queue ID not found locally: {queue_id}"}
    values = attachment_values(row)
    if not values:
        text = " ".join(
            row_value(row, key)
            for key in ["notes", "Notes", "body", "Body", "sendMode", "Send Mode", "subject", "Subject"]
        ).lower()
        no_attachment_allowed = any(term in text for term in ["fit inquiry", "no attachment required", "no attachments"])
        return {
            "ok": no_attachment_allowed,
            "queueId": queue_id,
            "attachments": [],
            "message": "No attachment URLs listed." if no_attachment_allowed else "No local attachments listed.",
            "error": "" if no_attachment_allowed else "External supervisor/university email needs local attachments or explicit Fit Inquiry / No Attachment Required.",
        }
    files: list[str] = []
    blocked: list[str] = []
    for value in values:
        path = local_attachment_path(value)
        if path:
            files.append(str(path))
            continue
        if "docs.google.com" in value or "drive.google.com" in value:
            blocked.append(f"{value} (Google Drive/Docs URL is not a local attachment)")
        else:
            blocked.append(f"{value} (file not found)")
    return {
        "ok": not blocked,
        "queueId": queue_id,
        "attachments": files,
        "blocked": blocked,
        "message": f"Attachment check passed for {len(files)} local file(s)." if not blocked else "Attachment check failed.",
        "error": "; ".join(blocked),
    }


def content_safety(queue_id: str) -> dict[str, Any]:
    row = queue_row(queue_id)
    if not row:
        return {"ok": False, "queueId": queue_id, "error": f"Queue ID not found locally: {queue_id}"}
    body = row_value(row, "body", "Body", "emailBody", "Email Body")
    subject = row_value(row, "subject", "Subject")
    text = f"{subject}\n{body}".lower()
    blocked_phrases = [
        "test only",
        "do not reuse",
        "do not send",
        "not successful",
        "i was not successful",
        "package folder has not yet been finalized",
        "once the package is generated",
        "prepared-package archive",
        "apps script",
        "codex sandbox",
        "blocked in codex",
        "manual review required",
    ]
    hits = [phrase for phrase in blocked_phrases if phrase in text]
    if hits:
        return {
            "ok": False,
            "queueId": queue_id,
            "status": "Blocked - Content Safety",
            "error": "Email body contains internal/process wording: " + "; ".join(hits),
            "hits": hits,
        }
    return {"ok": True, "queueId": queue_id, "message": "Local email content safety passed."}


def create_eml_draft(row: dict[str, Any], attachments: list[Path] | None = None) -> Path:
    OUTBOX_DIR.mkdir(parents=True, exist_ok=True)
    queue_id = row_value(row, "queueId", "Queue ID", "sourceQueueId") or "email_" + local_store.safe_task_part(local_store.iso_like())
    message = EmailMessage()
    sender = smtp_config().get("sender") or "iman.najafi86@gmail.com"
    message["From"] = sender
    message["To"] = row_value(row, "to", "To")
    cc = row_value(row, "cc", "CC")
    if cc:
        message["Cc"] = cc
    message["Subject"] = row_value(row, "subject", "Subject")
    message.set_content(row_value(row, "body", "Body", "emailBody", "Email Body"))
    for path in attachments or []:
        message.add_attachment(path.read_bytes(), maintype="application", subtype="octet-stream", filename=path.name)
    target = OUTBOX_DIR / f"{local_store.safe_task_part(queue_id)}.eml"
    target.write_bytes(bytes(message))
    return target


def process_queue_row(queue_id: str) -> dict[str, Any]:
    row = queue_row(queue_id)
    if not row:
        return {"ok": False, "queueId": queue_id, "error": f"Queue ID not found locally: {queue_id}"}
    approval = row_value(row, "approvalStatus", "Approval Status").lower()
    if approval and approval != "approved":
        result = {
            "ok": False,
            "queueId": queue_id,
            "status": "Blocked - Not Approved",
            "error": "Queue row is not approved.",
        }
        local_store.update_snapshot_queue_row(queue_id, {"sendStatus": result["status"], "Send Status": result["status"], "lastError": result["error"], "Last Error": result["error"]})
        return result

    quality = local_store.preflight_queue_document_quality(queue_id)
    if not quality.get("ok"):
        local_store.update_snapshot_queue_row(queue_id, {"sendStatus": quality.get("status") or "Blocked - Document Style QA", "Send Status": quality.get("status") or "Blocked - Document Style QA", "lastError": quality.get("error"), "Last Error": quality.get("error")})
        return quality

    safety = content_safety(queue_id)
    if not safety.get("ok"):
        local_store.update_snapshot_queue_row(queue_id, {"sendStatus": safety.get("status") or "Blocked - Content Safety", "Send Status": safety.get("status") or "Blocked - Content Safety", "lastError": safety.get("error"), "Last Error": safety.get("error")})
        return safety

    attachments = attachment_verification(queue_id)
    if not attachments.get("ok"):
        local_store.update_snapshot_queue_row(queue_id, {"sendStatus": "Blocked - Attachment Verification Failed", "Send Status": "Blocked - Attachment Verification Failed", "lastError": attachments.get("error"), "Last Error": attachments.get("error")})
        return attachments

    paths = [Path(path) for path in attachments.get("attachments") or []]
    send_mode = row_value(row, "sendMode", "Send Mode").upper()
    smtp = smtp_config()
    if send_mode == "SEND_NOW" and smtp.get("configured"):
        sent = send_smtp_email(
            to=split_recipients(row_value(row, "to", "To")),
            cc=split_recipients(row_value(row, "cc", "CC")),
            bcc=split_recipients(row_value(row, "bcc", "BCC")),
            subject=row_value(row, "subject", "Subject"),
            body=row_value(row, "body", "Body", "emailBody", "Email Body"),
            attachments=paths,
        )
        if sent.get("ok"):
            local_store.update_snapshot_queue_row(
                queue_id,
                {
                    "sendStatus": "Sent",
                    "Send Status": "Sent",
                    "sentAt": local_store.iso_like(),
                    "Sent At": local_store.iso_like(),
                    "lastError": "",
                    "Last Error": "",
                    "notes": "Sent locally through SMTP.",
                },
            )
        return sent | {"queueId": queue_id, "localEmail": True}

    draft_path = create_eml_draft(row, paths)
    status = "Draft Created - Needs Manual Send" if send_mode != "SEND_NOW" else "Needs SMTP Config - Local EML Draft Created"
    local_store.update_snapshot_queue_row(
        queue_id,
        {
            "sendStatus": status,
            "Send Status": status,
            "lastError": "" if send_mode != "SEND_NOW" else "SMTP is not configured.",
            "Last Error": "" if send_mode != "SEND_NOW" else "SMTP is not configured.",
            "notes": f"Local EML draft: {draft_path}",
            "Notes": f"Local EML draft: {draft_path}",
        },
    )
    return {
        "ok": send_mode != "SEND_NOW",
        "queueId": queue_id,
        "localEmail": True,
        "smtpConfigured": False,
        "status": status,
        "draftPath": str(draft_path),
        "message": "Created a local .eml draft. Configure SMTP to send automatically.",
    }


def local_task_runner(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = payload or {}
    staff = str(payload.get("staff") or "").strip()
    max_items = max(1, int(payload.get("maxItems") or 1))
    processed: list[dict[str, Any]] = []
    for _ in range(max_items):
        wakeup = local_store.next_staff_wakeup(staff)
        task = None
        if wakeup:
            task_id = wakeup.get("taskId") or ""
            thread_id = wakeup.get("threadId") or local_store.thread_id_for_task(task_id)
            staff_id = wakeup.get("staffId") or staff
        else:
            task = local_store.next_due_local_task(staff)
            if not task:
                break
            task_id = row_value(task, "taskId", "Task ID")
            thread_id = row_value(task, "threadId", "ThreadID") or local_store.thread_id_for_task(task_id)
            staff_id = row_value(task, "assignedTo", "Assigned To")

        staff_id = local_store.normalized_staff_id(staff_id, "AIstaff_Manager")
        if staff_id == "AIstaff_Manager":
            reply = local_store.process_manager_auto_replies(limit=1, thread_id=thread_id)
            result = {"mode": "manager", "threadId": thread_id, "reply": reply}
            if task_id and int((reply or {}).get("processed") or 0) == 0:
                local_store.update_snapshot_task_status(
                    task_id,
                    "Done",
                    "Manager wake-up checked locally; no human reply or new action was needed.",
                )
        else:
            result = local_store.create_codex_work_item_from_thread(thread_id)
            if result.get("ok"):
                local_store.update_snapshot_task_status(task_id, "Codex Work Queued", "Local runner created a Codex work item for this task.")
        if wakeup:
            local_store.complete_staff_wakeup(wakeup.get("wakeupId") or "", "Activated by local task runner.")
        processed.append({"taskId": task_id, "threadId": thread_id, "staffId": staff_id, "result": result})
    return {"ok": True, "localOnly": True, "processed": len(processed), "items": processed}


def complete_followup(payload: dict[str, Any]) -> dict[str, Any]:
    follow_up_id = str(payload.get("followUpId") or payload.get("id") or "").strip()
    if not follow_up_id:
        return {"ok": False, "error": "Missing followUpId."}
    snapshot = local_store.load_dashboard_snapshot() or local_store.empty_dashboard()
    changed = False
    for row in snapshot.get("followUps", []) or []:
        if not isinstance(row, dict):
            continue
        if str(row.get("followUpId") or row.get("FollowUpID") or "").strip() != follow_up_id:
            continue
        row["status"] = payload.get("status") or "Done"
        row["active"] = False
        row["completedAt"] = local_store.iso_like()
        row["result"] = payload.get("result") or row.get("result") or "Completed locally."
        if payload.get("evidenceLink"):
            row["evidenceLink"] = payload.get("evidenceLink")
        changed = True
    if changed:
        local_store.save_dashboard_snapshot(snapshot, source="local-followup")
    return {
        "ok": True,
        "localOnly": True,
        "followUpId": follow_up_id,
        "missingLocalRow": not changed,
        "message": "Follow-up completed locally." if changed else "Follow-up row was not present locally; completion archived as already reconciled.",
    }


def update_entity_status(payload: dict[str, Any]) -> dict[str, Any]:
    entity_id = str(payload.get("entityId") or payload.get("EntityID") or "").strip()
    if not entity_id:
        return {"ok": False, "error": "Missing entityId."}
    snapshot = local_store.load_dashboard_snapshot() or local_store.empty_dashboard()
    changed = False
    for row in snapshot.get("applications", []) or []:
        if not isinstance(row, dict):
            continue
        if str(row.get("entityId") or row.get("EntityID") or "").strip() != entity_id:
            continue
        if payload.get("stage") or payload.get("currentStage"):
            row["currentStage"] = payload.get("stage") or payload.get("currentStage")
        if payload.get("status") or payload.get("currentStatus"):
            row["currentStatus"] = payload.get("status") or payload.get("currentStatus")
        if payload.get("responsibleStaff"):
            row["responsibleStaff"] = payload.get("responsibleStaff")
        if payload.get("notes"):
            row["notes"] = payload.get("notes")
        row["lastUpdated"] = local_store.iso_like()
        changed = True
    if changed:
        local_store.save_dashboard_snapshot(snapshot, source="local-entity")
    return {"ok": changed, "localOnly": True, "entityId": entity_id, "message": "Entity updated locally." if changed else "Entity ID not found locally."}


def local_health_cycle() -> dict[str, Any]:
    pending = local_store.sync_pending_actions(local_bridge_call, max_actions=500)
    snapshot = local_store.load_dashboard_snapshot() or local_store.empty_dashboard()
    continuity = local_store.ensure_pipeline_continuity(snapshot)
    quality = local_store.queue_document_quality_fix_tasks(limit=3)
    manager = local_store.process_manager_auto_replies(limit=5)
    snapshot = local_store.load_dashboard_snapshot() or snapshot
    local_store.save_dashboard_snapshot(snapshot, source="local-health")
    return {
        "ok": True,
        "localOnly": True,
        "steps": [
            {"action": "localPendingArchiveDrain", "response": pending},
            {"action": "localPipelineContinuity", "response": continuity},
            {"action": "localDocumentQuality", "response": quality},
            {"action": "localManagerReplies", "response": manager},
        ],
    }


def local_bridge_call(action: str | None = None, payload: dict | None = None, method: str = "POST") -> dict[str, Any]:
    payload = payload or {}
    action = action or "getAiStaffDashboard"
    if action == "getAiStaffDashboard":
        snapshot = local_store.load_dashboard_snapshot() or local_store.empty_dashboard()
        snapshot["ok"] = True
        snapshot.setdefault("localSync", {})
        snapshot["localSync"]["crmSyncStatus"] = "local-runtime"
        snapshot["localSync"]["crmSyncEnabled"] = False
        return {"ok": True, "result": snapshot}
    if action == "getEmailQueueStatus":
        return local_store.local_email_queue_status(int(payload.get("limit") or 80))
    if action in {
        "appendAiStaffTask",
        "appendAiStaffThread",
        "appendAiStaffThreadMessage",
        "appendAiStaffSkillUpdate",
        "approveAiStaffSkillUpdate",
        "appendAiStaffDecision",
        "appendAiStaffKpi",
        "appendAiStaffReport",
        "appendAiStaffRunLog",
        "markAiStaffThreadLearningCandidate",
    }:
        return {
            "ok": True,
            "localOnly": True,
            "action": action,
            "message": "Local runtime accepted this CRM archive/sync action without using Apps Script.",
        }
    if action == "completeAiStaffFollowUp":
        return complete_followup(payload)
    if action == "updateAiStaffEntityStatus":
        return update_entity_status(payload)
    if action == "validateEmailContentSafety":
        return content_safety(str(payload.get("queueId") or payload.get("id") or ""))
    if action == "verifyQueueAttachments":
        return attachment_verification(str(payload.get("queueId") or payload.get("id") or ""))
    if action == "verifyConfiguredQueueAttachments":
        rows = local_store.flatten_email_queue((local_store.load_dashboard_snapshot() or {}).get("emailQueue"))
        checked = [attachment_verification(row_value(row, "queueId", "Queue ID")) for row in rows if row_value(row, "queueId", "Queue ID")]
        return {"ok": all(item.get("ok") for item in checked), "result": {"checked": len(checked), "items": checked}}
    if action == "processQueueRow":
        return process_queue_row(str(payload.get("queueId") or payload.get("id") or ""))
    if action in {"syncSent", "syncInbound", "reconcileInboundReplies"}:
        local_store.set_meta("last_local_mail_sync", local_store.iso_like())
        return {"ok": True, "localOnly": True, "action": action, "message": "Local mail sync is enabled as a no-op until Gmail API/IMAP credentials are configured."}
    if action == "auditAiStaffProcessHealth":
        return local_health_cycle()
    if action in {"runAiStaffTaskRunner", "runLocalTaskRunner"}:
        return local_task_runner(payload)
    return {"ok": False, "localOnly": True, "error": f"Local runtime does not implement action: {action}", "action": action}
