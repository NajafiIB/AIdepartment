from __future__ import annotations

import json
import mimetypes
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
try:
    import winreg
except ImportError:  # pragma: no cover - Windows-only fallback.
    winreg = None

import local_store


APP_DIR = Path(__file__).resolve().parent
ROOT_DIR = APP_DIR.parent
RUNNER_FILE = ROOT_DIR / "run_swiss_planner_bridge.cmd"
HOST = "127.0.0.1"
PORT = 8765
BRIDGE_CALL_LOCK = threading.Lock()
BRIDGE_HTTP_TIMEOUT_SECONDS = 240
LOCAL_FIRST_ACTIONS = {
    "appendAiStaffTask",
    "appendAiStaffThread",
    "appendAiStaffThreadMessage",
    "appendAiStaffSkillUpdate",
    "approveAiStaffSkillUpdate",
    "appendAiStaffDecision",
    "appendAiStaffKpi",
}

LOCAL_UNTIL_THREAD_CLOSED_ACTIONS = {
    "appendAiStaffTask",
    "appendAiStaffThread",
    "appendAiStaffThreadMessage",
}

POST_ONLY_ACTIONS = {
    "processQueue",
    "queueEmail",
    "uploadPackageFile",
    "setDefaultSendMode",
    "setAutoProcessApprovedQueue",
    "setAutoApproveQueueRows",
    "autoApproveQueueRows",
    "appendAiStaffRunLog",
    "appendAiStaffReport",
    "appendAiStaffDecision",
    "appendAiStaffTask",
    "appendAiStaffThread",
    "appendAiStaffThreadMessage",
    "appendAiStaffSkillUpdate",
    "approveAiStaffSkillUpdate",
    "markAiStaffThreadLearningCandidate",
    "appendAiStaffKpi",
    "setupAiStaffProcessSchema",
    "upsertAiStaffEntity",
    "updateAiStaffEntityStatus",
    "appendAiStaffFollowUp",
    "completeAiStaffTask",
    "completeAiStaffFollowUp",
    "reassignAiStaffTask",
    "snoozeAiStaffTask",
    "snoozeAiStaffFollowUp",
    "closeAiStaffEntity",
    "updateEmailQueueApproval",
    "auditAiStaffProcessHealth",
    "resetStaleAiStaffRunningWork",
    "runAiStaffTaskRunner",
    "processQueueRow",
}


def read_env_or_user_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if value:
        return value
    if winreg is not None:
        try:
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as key:
                registry_value = str(winreg.QueryValueEx(key, name)[0]).strip()
                if registry_value:
                    return registry_value
        except OSError:
            pass
    return local_store.local_env_value(name, "")


def expand_percent_env(value: str, label: str) -> str:
    value = value.strip()
    if value.startswith("%") and value.endswith("%") and value.count("%") == 2:
        env_name = value.strip("%")
        env_value = read_env_or_user_env(env_name)
        if not env_value:
            raise RuntimeError(f"Bridge {label} is configured as %{env_name}%, but the environment variable is not set.")
        return env_value
    return value


def get_bridge_config() -> tuple[str, str] | None:
    webhook = read_env_or_user_env("SWISS_PLANNER_WEBHOOK_URL")
    token = read_env_or_user_env("SWISS_PLANNER_WEBHOOK_TOKEN")

    if not webhook or not token:
        if not RUNNER_FILE.exists():
            return None
        text = RUNNER_FILE.read_text(encoding="utf-8", errors="ignore")
        webhook_match = re.search(r'set\s+"WEBHOOK=([^"]+)"', text, re.IGNORECASE)
        token_match = re.search(r'set\s+"TOKEN=([^"]+)"', text, re.IGNORECASE)
        if not webhook and webhook_match:
            webhook = webhook_match.group(1).strip()
        if not token and token_match:
            token = token_match.group(1).strip()

    if not webhook or not token:
        return None

    webhook = expand_percent_env(webhook, "webhook URL")
    token = expand_percent_env(token, "token")
    if "bridge-not-configured" in webhook or "127.0.0.1:9" in webhook:
        return None
    return webhook, token


def read_bridge_config() -> tuple[str, str]:
    config = get_bridge_config()
    if config is None:
        raise RuntimeError(
            "Could not read bridge settings. Set SWISS_PLANNER_WEBHOOK_URL and "
            "SWISS_PLANNER_WEBHOOK_TOKEN, or check run_swiss_planner_bridge.cmd."
        )
    return config


def bridge_enabled() -> bool:
    return get_bridge_config() is not None


def bridge_disabled_response(action: str | None = None) -> dict:
    return {
        "ok": False,
        "bridgeDisabled": True,
        "action": action or "",
        "error": "Google Apps Script / CRM sync is disabled. The command center is running in local-only mode.",
    }


def local_dashboard_or_empty(message: str = "") -> dict:
    snapshot = local_store.load_dashboard_snapshot()
    if not snapshot:
        snapshot = local_store.empty_dashboard(message or "No local dashboard snapshot yet.")
    snapshot.setdefault("localSync", {})
    snapshot["localSync"]["crmSyncEnabled"] = bridge_enabled()
    snapshot["localSync"]["crmSyncStatus"] = "enabled" if bridge_enabled() else "disabled"
    if not bridge_enabled():
        snapshot["localSync"]["lastSyncError"] = ""
    return snapshot


def bridge_request(action: str | None = None, payload: dict | None = None, method: str = "POST") -> dict:
    if not bridge_enabled():
        return bridge_disabled_response(action)
    retry_delays = [0, 8, 18, 32]
    with BRIDGE_CALL_LOCK:
        result = {"ok": False, "error": "Bridge request was not attempted."}
        for attempt, delay in enumerate(retry_delays, start=1):
            if delay:
                time.sleep(delay)
            result = bridge_request_once(action, payload, method)
            if not is_bridge_lock_timeout_(result):
                if attempt > 1 and isinstance(result, dict):
                    result["retryAttempts"] = attempt
                return result
            print(f"Bridge is busy; retrying action {action or 'bridge-info'} after lock timeout ({attempt}/{len(retry_delays)}).")
        if isinstance(result, dict):
            result["error"] = "Apps Script is still busy after several retries. Wait one minute and run the action again."
            result["lastLockError"] = True
        return result


def bridge_request_once(action: str | None = None, payload: dict | None = None, method: str = "POST") -> dict:
    webhook, token = read_bridge_config()
    data = dict(payload or {})
    data["token"] = token
    if action:
        data["action"] = action

    if method.upper() == "GET":
        query = urllib.parse.urlencode(data)
        request = urllib.request.Request(f"{webhook}?{query}", method="GET")
    else:
        raw = json.dumps(data).encode("utf-8")
        request = urllib.request.Request(
            webhook,
            data=raw,
            method="POST",
            headers={"Content-Type": "application/json"},
        )
    try:
        with urllib.request.urlopen(request, timeout=BRIDGE_HTTP_TIMEOUT_SECONDS) as response:
            content = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        content = exc.read().decode("utf-8", errors="replace")
        return {"ok": False, "error": f"Bridge HTTP {exc.code}", "details": content[:1000]}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}

    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {"ok": False, "error": "Bridge returned non-JSON response.", "details": content[:1000]}


def is_bridge_lock_timeout_(result: dict) -> bool:
    text = " ".join(str(result.get(key, "")) for key in ["error", "details", "message"]).lower()
    return (
        "lock" in text and "timeout" in text
    ) or "przekroczenie limitu czasu blokady" in text or "blokował zasób" in text


def bridge_nested_ok(result: dict) -> bool:
    if not isinstance(result, dict) or result.get("ok") is False:
        return False
    nested = result.get("result")
    if isinstance(nested, dict) and nested.get("ok") is False:
        return False
    return True


def process_queue_row_with_preflight(queue_id: str) -> dict:
    quality = local_store.preflight_queue_document_quality(queue_id)
    if not quality.get("ok"):
        return quality
    steps = []
    for action in ["validateEmailContentSafety", "verifyQueueAttachments"]:
        step = bridge_request(action, {"queueId": queue_id}, "POST")
        steps.append({"action": action, "response": step})
        if not bridge_nested_ok(step):
            return {
                "ok": False,
                "queueId": queue_id,
                "error": f"{action} failed before send.",
                "steps": steps,
                "documentQualityGate": quality,
            }
    result = bridge_request("processQueueRow", {"queueId": queue_id}, "POST")
    return {
        "ok": bridge_nested_ok(result),
        "queueId": queue_id,
        "preflight": steps,
        "documentQualityGate": quality,
        "process": result,
    }


def json_response(handler: BaseHTTPRequestHandler, payload: dict, status: int = 200) -> None:
    raw = json.dumps(payload, default=str).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Cache-Control", "no-store")
    handler.send_header("Content-Length", str(len(raw)))
    handler.end_headers()
    handler.wfile.write(raw)


def read_json_body(handler: BaseHTTPRequestHandler) -> dict:
    length = int(handler.headers.get("Content-Length") or "0")
    if length <= 0:
        return {}
    raw = handler.rfile.read(length).decode("utf-8", errors="replace")
    return json.loads(raw or "{}")


class CommandCenterHandler(BaseHTTPRequestHandler):
    server_version = "SwissPlannerCommandCenter/1.0"

    def log_message(self, fmt: str, *args: object) -> None:
        sys.stdout.write("%s - %s\n" % (self.log_date_time_string(), fmt % args))

    def do_GET(self) -> None:
        path, _, query = self.path.partition("?")
        params = dict(urllib.parse.parse_qsl(query, keep_blank_values=True))

        if path == "/api/bridge-info":
            if not bridge_enabled():
                json_response(self, bridge_disabled_response())
                return
            json_response(self, bridge_request(method="GET"))
            return

        if path == "/api/dashboard":
            run_audit = params.get("runAudit", "false").lower() == "true"
            force_sync = params.get("sync", "false").lower() == "true"
            if bridge_enabled() and (run_audit or force_sync):
                local_store.sync_from_sheet(bridge_request, run_audit=run_audit)
            snapshot = local_dashboard_or_empty("CRM sync is disabled; using the local dashboard only.")
            if not local_store.load_dashboard_snapshot() and bridge_enabled():
                sync_result = local_store.sync_from_sheet(bridge_request, run_audit=False)
                snapshot = local_dashboard_or_empty(sync_result.get("error", "No local dashboard snapshot yet."))
            json_response(self, snapshot)
            return

        if path == "/api/capability-fabric":
            json_response(self, {"ok": True, "capabilityFabric": local_store.load_capability_fabric()})
            return

        if path == "/api/department-config":
            json_response(self, local_store.department_config())
            return

        if path == "/api/department-versions":
            json_response(self, local_store.list_department_versions(int(params.get("limit") or 80)))
            return

        if path == "/api/backups":
            json_response(self, local_store.list_backups(int(params.get("limit") or 50)))
            return

        if path == "/api/fabric-note":
            json_response(self, local_store.read_fabric_note(params.get("section", "")))
            return

        if path == "/api/skill-file":
            json_response(
                self,
                local_store.read_skill_file(
                    scope=params.get("scope", "staff"),
                    staff_id=params.get("staffId", ""),
                ),
            )
            return

        if path == "/api/local-status":
            json_response(self, {"ok": True, "localSync": local_store.local_status()})
            return

        if path == "/api/autopilot-status":
            json_response(self, {"ok": True, "autopilot": local_store.autopilot_status()})
            return

        if path == "/api/queue-status":
            if not bridge_enabled():
                json_response(self, {"ok": True, "bridgeDisabled": True, "queue": [], "blocked": [], "queued": [], "sent": [], "errors": []})
                return
            json_response(self, bridge_request("getEmailQueueStatus", {"limit": params.get("limit", 20)}))
            return

        if path == "/api/threads":
            json_response(
                self,
                local_store.list_threads(
                    staff=params.get("staff", ""),
                    status=params.get("status", "open"),
                ),
            )
            return

        if path == "/api/thread":
            thread_id = params.get("threadId", "")
            if not thread_id:
                json_response(self, {"ok": False, "error": "Missing threadId."}, 400)
                return
            json_response(self, local_store.get_thread(thread_id))
            return

        if path == "/api/skill-updates":
            json_response(self, local_store.list_skill_updates(params.get("status", "Pending")))
            return

        if path == "/api/codex-work-items":
            json_response(
                self,
                local_store.list_codex_work_items(
                    status=params.get("status", "open"),
                    staff=params.get("staff", ""),
                    limit=int(params.get("limit") or 100),
                ),
            )
            return

        if path == "/api/codex-work-item":
            work_item_id = params.get("id", "") or params.get("workItemId", "")
            if not work_item_id:
                json_response(self, {"ok": False, "error": "Missing workItemId."}, 400)
                return
            json_response(self, local_store.get_codex_work_item(work_item_id))
            return

        if path == "/api/staff-wakeups":
            json_response(
                self,
                local_store.list_staff_wakeups(
                    staff=params.get("staff", ""),
                    status=params.get("status", "queued"),
                ),
            )
            return

        if path == "/api/enforce-manager-human-gate":
            json_response(self, local_store.enforce_manager_human_gate())
            return

        if path == "/":
            self.serve_file(APP_DIR / "index.html")
            return

        candidate = (APP_DIR / path.lstrip("/")).resolve()
        if APP_DIR not in candidate.parents and candidate != APP_DIR:
            self.send_error(403)
            return
        if not candidate.exists() or not candidate.is_file():
            self.send_error(404)
            return
        self.serve_file(candidate)

    def do_POST(self) -> None:
        path = self.path.split("?", 1)[0]
        try:
            body = read_json_body(self)
        except Exception as exc:
            json_response(self, {"ok": False, "error": f"Invalid JSON body: {exc}"}, 400)
            return

        if path == "/api/action":
            action = str(body.get("action") or "").strip()
            payload = body.get("payload") or {}
            if not action:
                json_response(self, {"ok": False, "error": "Missing action."}, 400)
                return
            if action == "processQueue":
                json_response(self, {"ok": False, "error": "Use processQueueRow for one selected row, not broad processQueue."}, 400)
                return
            if action == "processQueueRow" and not (payload.get("queueId") or payload.get("id")):
                json_response(self, {"ok": False, "error": "processQueueRow requires queueId."}, 400)
                return
            if action == "processQueueRow":
                if not bridge_enabled():
                    json_response(self, bridge_disabled_response(action))
                    return
                json_response(self, process_queue_row_with_preflight(str(payload.get("queueId") or payload.get("id") or "")))
                return
            method = "POST" if action in POST_ONLY_ACTIONS else "GET"
            if action in LOCAL_FIRST_ACTIONS:
                sync_online = bridge_enabled() and (bool(payload.get("syncOnline")) if action in LOCAL_UNTIL_THREAD_CLOSED_ACTIONS else True)
                json_response(self, local_store.queue_action(action, payload, method=method, sync_online=sync_online))
                return
            if not bridge_enabled():
                json_response(self, bridge_disabled_response(action))
                return
            json_response(self, bridge_request(action, payload, method=method))
            return

        if path == "/api/sync-now":
            run_audit = bool(body.get("runAudit"))
            if not bridge_enabled():
                snapshot = local_dashboard_or_empty("CRM sync is disabled; local-only dashboard is active.")
                json_response(
                    self,
                    {
                        "ok": True,
                        "bridgeDisabled": True,
                        "sync": {
                            "ok": True,
                            "bridgeDisabled": True,
                            "message": "CRM sync is disabled; no Google Apps Script call was made.",
                        },
                        "dashboard": snapshot,
                    },
                )
                return
            result = local_store.sync_from_sheet(bridge_request, run_audit=run_audit)
            snapshot = local_dashboard_or_empty(result.get("error", "Sync did not return a dashboard snapshot."))
            json_response(self, {"ok": bool(result.get("ok")), "sync": result, "dashboard": snapshot})
            return

        if path == "/api/autopilot-control":
            action = str(body.get("action") or "").strip().lower()
            if action == "start":
                json_response(self, {"ok": True, "autopilot": local_store.set_autopilot_enabled(True)})
                return
            if action == "pause":
                json_response(self, {"ok": True, "autopilot": local_store.set_autopilot_enabled(False)})
                return
            if action == "run-now":
                if not bridge_enabled():
                    snapshot = local_dashboard_or_empty("CRM sync is disabled; KPI cycle cannot call the CRM task runner.")
                    json_response(
                        self,
                        {
                            "ok": True,
                            "bridgeDisabled": True,
                            "autopilot": local_store.autopilot_status(),
                            "cycle": {
                                "ok": True,
                                "state": "Local Only",
                                "reason": "CRM sync is disabled; local tasks and threads are available, but Google Script runner actions are skipped.",
                            },
                            "dashboard": snapshot,
                        },
                    )
                    return
                result = local_store.run_autopilot_until_blocked(bridge_request, max_steps=int(body.get("maxSteps") or 8))
                snapshot = local_dashboard_or_empty(result.get("error", "Autopilot cycle did not return a dashboard snapshot."))
                json_response(self, {"ok": bool(result.get("ok")), "autopilot": local_store.autopilot_status(), "cycle": result, "dashboard": snapshot})
                return
            json_response(self, {"ok": False, "error": "Unknown autopilot action."}, 400)
            return

        if path == "/api/run-health":
            if not bridge_enabled():
                json_response(self, bridge_disabled_response("run-health"))
                return
            steps = []
            for action in ["syncSent", "syncInbound", "reconcileInboundReplies", "auditAiStaffProcessHealth"]:
                steps.append({"action": action, "response": bridge_request(action, {})})
            local_store.sync_from_sheet(bridge_request, run_audit=False)
            json_response(self, {"ok": all(step["response"].get("ok") for step in steps), "steps": steps})
            return

        if path == "/api/run-one":
            staff = str(body.get("staff") or "")
            local_wakeup = local_store.next_staff_wakeup(staff)
            if local_wakeup:
                json_response(
                    self,
                    {
                        "ok": True,
                        "localActivation": True,
                        "wakeup": local_wakeup,
                        "message": f"{local_wakeup['staffLabel']} has been activated locally for task {local_wakeup['taskId']}. Codex should process the task thread before any CRM upload.",
                    },
                )
                return
            payload = {"maxItems": body.get("maxItems") or 1}
            if staff:
                payload["staff"] = staff
            if not bridge_enabled():
                json_response(
                    self,
                    {
                        "ok": True,
                        "bridgeDisabled": True,
                        "message": "No local staff wake-up is queued. CRM task runner is disabled because Google Apps Script is not configured.",
                    },
                )
                return
            result = bridge_request("runAiStaffTaskRunner", payload)
            if result.get("ok"):
                try:
                    local_store.sync_from_sheet(bridge_request, run_audit=False)
                except Exception:
                    pass
            json_response(self, result)
            return

        if path == "/api/thread-message":
            json_response(self, local_store.add_thread_message(body))
            return

        if path == "/api/manager-request":
            json_response(self, local_store.create_manager_request(body))
            return

        if path == "/api/manager-replies":
            json_response(
                self,
                local_store.process_manager_auto_replies(
                    limit=int(body.get("limit") or 10),
                    thread_id=str(body.get("threadId") or ""),
                ),
            )
            return

        if path == "/api/alex-resolve-issues":
            json_response(self, local_store.resolve_alex_open_issues())
            return

        if path == "/api/codex-work-item/create-from-task":
            thread_id = str(body.get("threadId") or "").strip()
            task_id = str(body.get("taskId") or "").strip()
            if not thread_id and task_id:
                thread_id = local_store.thread_id_for_task(task_id)
            if not thread_id:
                json_response(self, {"ok": False, "error": "Missing threadId or taskId."}, 400)
                return
            json_response(self, local_store.create_codex_work_item_from_thread(thread_id))
            return

        if path == "/api/codex-work-item/mark":
            json_response(self, local_store.mark_codex_work_item(body))
            return

        if path == "/api/codex-work-item/submit-result":
            json_response(self, local_store.submit_codex_work_result(body))
            return

        if path == "/api/thread-close":
            thread_id = str(body.get("threadId") or "")
            if not thread_id:
                json_response(self, {"ok": False, "error": "Missing threadId."}, 400)
                return
            json_response(
                self,
                local_store.close_thread(
                    thread_id,
                    body.get("closedBy") or "Human_Iman",
                    body.get("reason") or "Closed from Command Center.",
                    bool(body.get("createLearning")),
                    body.get("proposedRule") or "",
                    body.get("staffId") or "",
                ),
            )
            return

        if path == "/api/thread-archive":
            thread_id = str(body.get("threadId") or "")
            if not thread_id:
                json_response(self, {"ok": False, "error": "Missing threadId."}, 400)
                return
            json_response(self, local_store.archive_thread(thread_id, bool(body.get("archived", True))))
            return

        if path == "/api/skill-update":
            json_response(self, local_store.create_skill_update_candidate(body))
            return

        if path == "/api/skill-update-approve":
            json_response(self, local_store.approve_skill_update(body))
            return

        if path == "/api/skill-file":
            json_response(self, local_store.write_skill_file(body))
            return

        if path == "/api/fabric-note":
            json_response(self, local_store.write_fabric_note(body))
            return

        if path == "/api/fabric-object":
            json_response(self, local_store.upsert_fabric_object(body))
            return

        if path == "/api/fabric-object/archive":
            json_response(self, local_store.archive_fabric_object(body))
            return

        if path == "/api/department-version/rollback":
            json_response(self, local_store.rollback_department_version(body))
            return

        if path == "/api/backup/create":
            json_response(self, local_store.create_config_backup(body))
            return

        if path == "/api/backup/restore":
            json_response(self, local_store.restore_config_backup(body))
            return

        json_response(self, {"ok": False, "error": "Unknown local endpoint."}, 404)

    def serve_file(self, path: Path) -> None:
        content_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        raw = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


def main() -> None:
    local_store.init_db()
    crm_sync_enabled = bridge_enabled()
    local_store.set_meta("crm_sync_enabled", "true" if crm_sync_enabled else "false")
    local_store.set_meta("crm_sync_status", "enabled" if crm_sync_enabled else "disabled")
    if not crm_sync_enabled:
        local_store.set_autopilot_enabled(False)

    url = f"http://{HOST}:{PORT}/"
    try:
        server = ThreadingHTTPServer((HOST, PORT), CommandCenterHandler)
    except OSError as exc:
        print(f"Command Center could not start on {url}: {exc}")
        print("If the dashboard is already open and working, another Command Center server is probably running.")
        webbrowser.open(url)
        sys.exit(3)
    print("GCC lab AI department")
    print(f"Open: {url}")
    print("Mode: local-only dashboard." if not crm_sync_enabled else "Mode: local-first dashboard, hourly Google Sheet sync.")
    print("Close this window to stop the dashboard.")
    if crm_sync_enabled:
        local_store.start_hourly_sync(bridge_request)
        local_store.start_autopilot_loop(bridge_request)
    webbrowser.open(url)
    server.serve_forever()


if __name__ == "__main__":
    main()
