from __future__ import annotations

import json
import os
import re
import shutil
import sqlite3
import threading
import time
import urllib.error
import urllib.request
import uuid
import zipfile
from pathlib import Path
from typing import Any, Callable


Dashboard = dict[str, Any]
BridgeCall = Callable[[str | None, dict | None, str], dict]


DB_PATH = Path(__file__).resolve().parent / "swiss_planner_local.db"
ROOT_DIR = Path(__file__).resolve().parent.parent
CAPABILITY_FABRIC_PATH = Path(__file__).resolve().parent / "capability_fabric.json"
STAFF_SKILL_DIR = Path(r"C:\Users\sonse\.codex\skills\swiss-planner-staff")
LOCAL_ENV_PATH = ROOT_DIR / ".env.local"
BACKUP_DIR = ROOT_DIR / "backups"

FABRIC_NOTE_SECTIONS = {
    "workMap": "Work Map",
    "lanesTools": "Lanes & Tools",
    "qualityGates": "Quality Gates",
    "dataConnectors": "Data & Connectors",
    "aiBrain": "AI Brain",
    "outputTemplates": "Output Templates",
    "learningLibrary": "Learning Library",
}

TASK_CATEGORIES = {
    "human": "Human Decision",
    "manager": "Manager Guidance",
    "audit": "System Audit",
    "technical": "Technical Bug",
    "email": "Email Safety",
    "application": "Application Work",
    "research": "Research Work",
}

DEFAULT_STAFF_ALIASES = {
    "AIstaff_Manager": "Alex",
    "AIstaff_OpportunityHunter": "Ava",
    "AIstaff_FitAnalyst": "Leo",
    "AIstaff_ProfessorResearchAnalyst": "Nadia",
    "AIstaff_ApplicationPackMaker": "Maya",
    "AIstaff_ApplicationPackSender": "Omar",
    "AIstaff_FollowUpController": "Lina",
    "AIstaff_CRMController": "Noah",
}

FABRIC_COLLECTION_LABELS = {
    "solutionModules": "Department Solutions",
    "workspaces": "Workspaces",
    "departments": "Departments",
    "departmentTemplates": "Department Templates",
    "workspaceOverrides": "Workspace Overrides",
    "staffProfiles": "Staff Profiles",
    "capabilities": "Capabilities",
    "recipes": "Playbooks",
    "lanes": "Tool Lanes",
    "connections": "Connected Apps",
    "databases": "Knowledge / Data Sources",
    "aiSupport": "AI Brain",
    "qualityGates": "QA Gates",
    "outputTemplates": "Output Templates",
    "kpis": "KPIs",
    "reportDefinitions": "Report Definitions",
}

EDITABLE_FABRIC_COLLECTIONS = set(FABRIC_COLLECTION_LABELS)

APPLICATION_PACKAGES_DIR = ROOT_DIR / "Application Packages"
APPROVED_STYLE_QA_STATUSES = {
    "approved for external send",
    "style qa approved",
    "template qa passed",
    "approved",
    "passed",
}


def utc_ts() -> float:
    return time.time()


def iso_like(ts: float | None = None) -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(ts or utc_ts()))


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(
            """
            PRAGMA journal_mode = WAL;
            CREATE TABLE IF NOT EXISTS dashboard_snapshot (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              payload TEXT NOT NULL,
              updated_at REAL NOT NULL,
              source TEXT NOT NULL,
              error TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS pending_actions (
              id TEXT PRIMARY KEY,
              action TEXT NOT NULL,
              payload TEXT NOT NULL,
              method TEXT NOT NULL,
              status TEXT NOT NULL,
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL,
              attempts INTEGER NOT NULL DEFAULT 0,
              last_error TEXT NOT NULL DEFAULT '',
              result TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS meta (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL,
              updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS worker_runs (
              id TEXT PRIMARY KEY,
              run_at REAL NOT NULL,
              mode TEXT NOT NULL,
              status TEXT NOT NULL,
              action TEXT NOT NULL,
              result TEXT NOT NULL,
              notes TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS task_threads (
              thread_id TEXT PRIMARY KEY,
              task_id TEXT NOT NULL,
              entity_id TEXT NOT NULL DEFAULT '',
              application_id TEXT NOT NULL DEFAULT '',
              opportunity_id TEXT NOT NULL DEFAULT '',
              started_by TEXT NOT NULL DEFAULT '',
              responsible TEXT NOT NULL DEFAULT '',
              source_staff TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT 'Open',
              archived INTEGER NOT NULL DEFAULT 0,
              created_at REAL NOT NULL,
              closed_at REAL,
              last_message_at REAL NOT NULL,
              last_message_preview TEXT NOT NULL DEFAULT '',
              unread_for TEXT NOT NULL DEFAULT 'Human',
              source_payload TEXT NOT NULL DEFAULT '{}'
            );
            CREATE TABLE IF NOT EXISTS thread_messages (
              message_id TEXT PRIMARY KEY,
              thread_id TEXT NOT NULL,
              task_id TEXT NOT NULL,
              sender_type TEXT NOT NULL,
              sender_id TEXT NOT NULL,
              sender_label TEXT NOT NULL,
              body TEXT NOT NULL,
              language TEXT NOT NULL DEFAULT 'natural',
              created_at REAL NOT NULL,
              read_by_human INTEGER NOT NULL DEFAULT 0,
              read_by_staff INTEGER NOT NULL DEFAULT 0,
              evidence_link TEXT NOT NULL DEFAULT '',
              metadata TEXT NOT NULL DEFAULT '{}'
            );
            CREATE TABLE IF NOT EXISTS skill_updates (
              learning_id TEXT PRIMARY KEY,
              source_thread_id TEXT NOT NULL DEFAULT '',
              staff_id TEXT NOT NULL DEFAULT '',
              proposed_rule TEXT NOT NULL DEFAULT '',
              reason TEXT NOT NULL DEFAULT '',
              evidence TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT 'Pending',
              approved_by TEXT NOT NULL DEFAULT '',
              applied_at REAL,
              target_skill_file TEXT NOT NULL DEFAULT '',
              created_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS staff_wakeups (
              wakeup_id TEXT PRIMARY KEY,
              staff_id TEXT NOT NULL,
              thread_id TEXT NOT NULL DEFAULT '',
              task_id TEXT NOT NULL DEFAULT '',
              reason TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT 'Queued',
              run_after REAL NOT NULL,
              created_at REAL NOT NULL,
              last_presented_at REAL,
              completed_at REAL,
              result TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS department_versions (
              version_id TEXT PRIMARY KEY,
              object_type TEXT NOT NULL,
              object_id TEXT NOT NULL,
              action TEXT NOT NULL,
              before_payload TEXT NOT NULL DEFAULT '',
              after_payload TEXT NOT NULL DEFAULT '',
              created_at REAL NOT NULL,
              created_by TEXT NOT NULL DEFAULT 'Human_Iman',
              reason TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS backup_runs (
              backup_id TEXT PRIMARY KEY,
              created_at REAL NOT NULL,
              status TEXT NOT NULL,
              path TEXT NOT NULL DEFAULT '',
              included TEXT NOT NULL DEFAULT '',
              error TEXT NOT NULL DEFAULT '',
              notes TEXT NOT NULL DEFAULT ''
            );
            CREATE INDEX IF NOT EXISTS idx_task_threads_responsible
              ON task_threads (responsible, status, archived, last_message_at);
            CREATE INDEX IF NOT EXISTS idx_task_threads_task
              ON task_threads (task_id);
            CREATE INDEX IF NOT EXISTS idx_thread_messages_thread
              ON thread_messages (thread_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_skill_updates_status
              ON skill_updates (status, staff_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_staff_wakeups_staff
              ON staff_wakeups (staff_id, status, run_after);
            CREATE INDEX IF NOT EXISTS idx_department_versions_object
              ON department_versions (object_type, object_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_backup_runs_created
              ON backup_runs (created_at);
            """
        )
    if not get_meta("autopilot_enabled"):
        set_meta("autopilot_enabled", "TRUE")
    if not get_meta("autopilot_interval_seconds"):
        set_meta("autopilot_interval_seconds", "600")


def set_meta(key: str, value: Any) -> None:
    raw = value if isinstance(value, str) else json.dumps(value, default=str)
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO meta (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at
            """,
            (key, raw, utc_ts()),
        )


def get_meta(key: str, default: str = "") -> str:
    with connect() as conn:
        row = conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
    return str(row["value"]) if row else default


def local_status() -> dict[str, Any]:
    with connect() as conn:
        pending = conn.execute("SELECT COUNT(*) AS c FROM pending_actions WHERE status = 'Queued'").fetchone()["c"]
        failed = conn.execute("SELECT COUNT(*) AS c FROM pending_actions WHERE status = 'Error'").fetchone()["c"]
        snapshot = conn.execute("SELECT updated_at, source, error FROM dashboard_snapshot WHERE id = 1").fetchone()
    return {
        "mode": "local-first",
        "dbPath": str(DB_PATH),
        "pendingActions": pending,
        "failedActions": failed,
        "lastSheetSync": get_meta("last_sheet_sync", ""),
        "lastSyncError": get_meta("last_sync_error", ""),
        "snapshotUpdatedAt": iso_like(snapshot["updated_at"]) if snapshot else "",
        "snapshotSource": snapshot["source"] if snapshot else "",
        "snapshotError": snapshot["error"] if snapshot else "",
        "staffWakeups": staff_wakeup_summary(),
        "autopilot": autopilot_status(),
        "documentQuality": document_quality_status(),
    }


def local_day_key() -> str:
    return time.strftime("%Y-%m-%d", time.localtime())


def parse_json_meta(key: str, fallback: Any) -> Any:
    raw = get_meta(key, "")
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return fallback


def daily_progress() -> dict[str, Any]:
    today = local_day_key()
    progress = parse_json_meta("autopilot_daily_progress", {})
    if progress.get("date") != today:
        progress = {
            "date": today,
            "sheetSyncs": 0,
            "crmHealthChecks": 0,
            "runnerAttempts": 0,
            "tasksProcessed": 0,
            "codexTasksQueued": 0,
            "managerPlanRequests": 0,
            "lastCycleAt": "",
            "state": "Active",
            "reason": "",
        }
        set_meta("autopilot_daily_progress", progress)
    return progress


def save_daily_progress(progress: dict[str, Any]) -> None:
    progress["lastCycleAt"] = iso_like()
    set_meta("autopilot_daily_progress", progress)


def autopilot_config() -> dict[str, Any]:
    enabled = get_meta("autopilot_enabled", "TRUE").upper() == "TRUE"
    try:
        interval = max(120, int(get_meta("autopilot_interval_seconds", "600")))
    except ValueError:
        interval = 600
    return {
        "enabled": enabled,
        "intervalSeconds": interval,
        "dailyTargets": {
            "sheetSyncs": 1,
            "crmHealthChecks": 1,
            "runnerAttemptsWhenDue": 1,
            "codexTasksQueuedWhenIdle": 1,
        },
    }


def set_autopilot_enabled(enabled: bool) -> dict[str, Any]:
    set_meta("autopilot_enabled", "TRUE" if enabled else "FALSE")
    status = autopilot_status()
    record_worker_run("Control", "Enabled" if enabled else "Paused", "Autopilot setting changed.", "")
    return status


def autopilot_status() -> dict[str, Any]:
    config = autopilot_config()
    progress = daily_progress()
    with connect() as conn:
        recent = [
            dict(row)
            for row in conn.execute(
                "SELECT id, run_at, mode, status, action, result, notes FROM worker_runs ORDER BY run_at DESC LIMIT 8"
            ).fetchall()
        ]
    for row in recent:
        row["runAt"] = iso_like(row.pop("run_at"))
    return {
        "enabled": config["enabled"],
        "intervalSeconds": config["intervalSeconds"],
        "progress": progress,
        "targets": config["dailyTargets"],
        "recentRuns": recent,
    }


def record_worker_run(mode: str, status: str, action: str, result: Any, notes: str = "") -> None:
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO worker_runs (id, run_at, mode, status, action, result, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "worker_run_" + str(uuid.uuid4()),
                utc_ts(),
                mode,
                status,
                action,
                json.dumps(result, default=str)[:8000] if not isinstance(result, str) else result[:8000],
                notes[:2000],
            ),
        )


def json_clone(value: Any) -> Any:
    return json.loads(json.dumps(value, default=str))


def default_staff_profiles() -> list[dict[str, Any]]:
    titles = {
        "AIstaff_Manager": "Department Manager",
        "AIstaff_OpportunityHunter": "Opportunity Research Specialist",
        "AIstaff_FitAnalyst": "Fit And Eligibility Analyst",
        "AIstaff_ProfessorResearchAnalyst": "Professor Research Specialist",
        "AIstaff_ApplicationPackMaker": "Application Package Specialist",
        "AIstaff_ApplicationPackSender": "Outreach Safety Specialist",
        "AIstaff_FollowUpController": "Follow-up Coordinator",
        "AIstaff_CRMController": "CRM Operations Controller",
    }
    levels = {
        "AIstaff_Manager": "Expert",
        "AIstaff_OpportunityHunter": "Senior",
        "AIstaff_FitAnalyst": "Senior",
        "AIstaff_ProfessorResearchAnalyst": "Expert",
        "AIstaff_ApplicationPackMaker": "Specialist",
        "AIstaff_ApplicationPackSender": "Senior",
        "AIstaff_FollowUpController": "Junior",
        "AIstaff_CRMController": "Senior",
    }
    rows = [
        {
            "id": "Human_Iman",
            "label": "Iman / Human",
            "alias": "Iman",
            "profileTitle": "Department Owner / Human Manager",
            "role": "Human Manager",
            "managerId": "",
            "contactPolicy": "Human gives instructions only to AI Manager.",
            "avatarKind": "human-owner",
            "workspaceEditable": False,
            "locked": True,
        },
        {
            "id": "AIstaff_Manager",
            "label": "AI Manager",
            "alias": DEFAULT_STAFF_ALIASES["AIstaff_Manager"],
            "profileTitle": titles["AIstaff_Manager"],
            "role": "Department Manager",
            "managerId": "Human_Iman",
            "intelligenceLevel": levels["AIstaff_Manager"],
            "contactPolicy": "Only AI Manager communicates directly with the human manager.",
            "avatarKind": "human-ai",
            "workspaceEditable": True,
            "locked": False,
        },
    ]
    for staff_id, alias in DEFAULT_STAFF_ALIASES.items():
        if staff_id == "AIstaff_Manager":
            continue
        rows.append(
            {
                "id": staff_id,
                "label": staff_id.replace("AIstaff_", "").replace("_", " "),
                "alias": alias,
                "profileTitle": titles.get(staff_id, "AI Specialist"),
                "role": "Specialist AI Staff",
                "managerId": "AIstaff_Manager",
                "intelligenceLevel": levels.get(staff_id, "Senior"),
                "contactPolicy": "Specialist staff communicate with AI Manager; Manager decides whether Human is needed.",
                "avatarKind": "abstract-ai",
                "workspaceEditable": True,
                "locked": False,
            }
        )
    return rows


def default_output_templates() -> list[dict[str, Any]]:
    return [
        {
            "id": "output_verified_opportunity",
            "label": "Verified Opportunity Record",
            "ownerStaff": "AIstaff_OpportunityHunter",
            "requiredSections": ["Official source", "Funding/deadline", "Eligibility", "Why it fits"],
            "storage": "Opportunity, Links, Professor Research Fit",
            "qualityGates": ["gate_official_evidence", "gate_no_duplicate_opportunity"],
            "workspaceEditable": True,
        },
        {
            "id": "output_application_package",
            "label": "Application Package",
            "ownerStaff": "AIstaff_ApplicationPackMaker",
            "requiredSections": ["Academic CV", "Research proposal/concept note", "SOP/motivation", "Publication list", "Checklist"],
            "storage": "Drive package folder and Application Packages / Package Files rows",
            "qualityGates": ["gate_document_template_style", "gate_professor_specificity", "gate_package_folder_registered"],
            "workspaceEditable": True,
        },
        {
            "id": "output_supervisor_email",
            "label": "Supervisor Outreach Email",
            "ownerStaff": "AIstaff_ApplicationPackSender",
            "requiredSections": ["Recipient", "Subject", "Personalized body", "Verified attachments", "Safety result"],
            "storage": "Email Send Queue and task/thread evidence",
            "qualityGates": ["gate_content_safety", "gate_package_completeness", "gate_attachment_access", "gate_duplicate_recipient"],
            "workspaceEditable": True,
        },
        {
            "id": "output_operating_report",
            "label": "Manager Operating Report",
            "ownerStaff": "AIstaff_Manager",
            "requiredSections": ["Do first", "KPI progress", "Applications", "AI staff", "System health"],
            "storage": "Reports page and AI Staff Reports",
            "qualityGates": ["gate_kpi_progress", "gate_no_hidden_blocker"],
            "workspaceEditable": True,
        },
    ]


def default_report_definitions() -> list[dict[str, Any]]:
    return [
        {
            "id": "report_manager_operating_view",
            "label": "Manager Operating Report",
            "purpose": "Explain what is happening, why it matters, and the next action.",
            "sections": ["Do First", "KPI Progress", "Applications", "AI Staff", "System Health"],
            "defaultPeriod": "Last 7 days",
            "workspaceEditable": True,
        },
        {
            "id": "report_department_health",
            "label": "Department Health",
            "purpose": "Show sync health, stale work, blockers, and backup/version state.",
            "sections": ["System Health", "Blocked Work", "Backups", "Version History"],
            "defaultPeriod": "Today",
            "workspaceEditable": True,
        },
    ]


def default_kpis() -> list[dict[str, Any]]:
    return [
        {
            "id": "kpi_weekly_verified_opportunities",
            "label": "Verified Opportunities",
            "periodType": "Weekly",
            "targetUnit": "Opportunities",
            "targetCount": 10,
            "minimumEvidenceLevel": "Official source required",
            "ownerStaff": "AIstaff_OpportunityHunter",
            "workspaceEditable": True,
        },
        {
            "id": "kpi_weekly_application_packages",
            "label": "Complete Application Packages",
            "periodType": "Weekly",
            "targetUnit": "Packages",
            "targetCount": 2,
            "minimumEvidenceLevel": "Package folder + QA gates passed",
            "ownerStaff": "AIstaff_ApplicationPackMaker",
            "workspaceEditable": True,
        },
        {
            "id": "kpi_followup_compliance",
            "label": "Follow-up Compliance",
            "periodType": "Weekly",
            "targetUnit": "Percent",
            "targetCount": 100,
            "minimumEvidenceLevel": "No active AI-owned entity without due follow-up",
            "ownerStaff": "AIstaff_FollowUpController",
            "workspaceEditable": True,
        },
    ]


def default_department_platform_objects(fabric: dict[str, Any]) -> dict[str, list[dict[str, Any]] | dict[str, Any]]:
    return {
        "workspaces": [
            {
                "id": "workspace_iman_swiss_planner",
                "label": "Iman Najafi Workspace",
                "owner": "Human_Iman",
                "members": ["Human_Iman"],
                "status": "Active",
                "workspaceEditable": True,
            }
        ],
        "departments": [
            {
                "id": "department_swiss_planner_applications",
                "label": "Swiss Planner Application Department",
                "workspaceId": "workspace_iman_swiss_planner",
                "templateId": "template_swiss_planner_application_department",
                "humanManager": "Human_Iman",
                "aiManager": "AIstaff_Manager",
                "status": "Active",
                "workspaceEditable": True,
            }
        ],
        "departmentTemplates": [
            {
                "id": "template_swiss_planner_application_department",
                "label": "Swiss Planner Application Department",
                "purpose": "Find, evaluate, prepare, send, and follow up funded PhD/MSc applications.",
                "solutionModuleId": "solution_swiss_planner_apply_department",
                "capabilities": [row.get("id") for row in fabric.get("capabilities", []) or [] if isinstance(row, dict)],
                "staffProfiles": [row.get("id") for row in default_staff_profiles()],
                "status": "Active",
                "locked": True,
                "workspaceEditable": False,
            },
            {
                "id": "template_sales_research_department_sample",
                "label": "Sample Sales Research Department",
                "purpose": "Sample reusable department template proving the platform is not Swiss Planner-only.",
                "solutionModuleId": "solution_sample_sales_research_department",
                "capabilities": ["opportunity_discovery", "fit_assessment", "workflow_automation"],
                "staffProfiles": ["Human_Iman", "AIstaff_Manager", "AIstaff_OpportunityHunter", "AIstaff_FitAnalyst", "AIstaff_CRMController"],
                "status": "Sample",
                "locked": False,
                "workspaceEditable": True,
            },
        ],
        "workspaceOverrides": [
            {
                "id": "override_iman_swiss_planner",
                "workspaceId": "workspace_iman_swiss_planner",
                "departmentId": "department_swiss_planner_applications",
                "humanManager": "Human_Iman",
                "aiManagerAlias": DEFAULT_STAFF_ALIASES["AIstaff_Manager"],
                "defaultLanguage": "English/Persian mixed accepted",
                "status": "Active",
                "workspaceEditable": True,
            }
        ],
        "staffProfiles": default_staff_profiles(),
        "outputTemplates": default_output_templates(),
        "kpis": default_kpis(),
        "reportDefinitions": default_report_definitions(),
        "governance": {
            "lockedPlatformRules": [
                "Thread replies never send email by themselves.",
                "Only AI Manager creates human-facing tasks.",
                "External sends require queue approval, content safety, package completeness, and attachment verification.",
            ],
            "workspaceEditableRules": [
                "Staff aliases and avatars",
                "Workspace operating notes",
                "Tool assignments and non-locked QA gates",
                "Output templates and KPI targets",
            ],
            "versioning": "Every designer save writes a Department Version row.",
            "backupPolicy": "Create a local backup before major config changes.",
            "learningPolicy": "Approved human learning is added only after explicit approval.",
        },
        "permissions": {
            "workspaceOwner": ["view", "message_manager", "edit_workspace_rules", "approve_learning", "backup", "rollback"],
            "workspaceAdmin": ["view", "message_manager", "edit_workspace_rules", "approve_learning", "backup"],
            "workspaceDeveloper": ["view", "message_manager", "edit_workspace_rules", "connector_config", "backup"],
            "member": ["view", "message_manager"],
            "viewer": ["view"],
        },
    }


def merge_default_rows(existing: list[Any], defaults: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = [row for row in (existing or []) if isinstance(row, dict)]
    ids = {str(row.get("id")) for row in rows if row.get("id")}
    for default in defaults:
        if str(default.get("id")) not in ids:
            rows.append(json_clone(default))
            ids.add(str(default.get("id")))
    return rows


def normalize_capability_fabric(fabric: dict[str, Any]) -> dict[str, Any]:
    fabric = json_clone(fabric or {})
    defaults = default_department_platform_objects(fabric)
    for collection, default_rows in defaults.items():
        if isinstance(default_rows, list):
            fabric[collection] = merge_default_rows(fabric.get(collection, []), default_rows)
        elif collection not in fabric or not isinstance(fabric.get(collection), dict):
            fabric[collection] = json_clone(default_rows)
    if not any(row.get("id") == "solution_sample_sales_research_department" for row in fabric.get("solutionModules", []) if isinstance(row, dict)):
        fabric.setdefault("solutionModules", []).append(
            {
                "id": "solution_sample_sales_research_department",
                "label": "Sample Sales Research Department",
                "summary": "Reusable sample department template for lead discovery, fit review, and CRM follow-up.",
                "owner": "AIstaff_Manager",
                "lifecycleStatus": "Sample",
                "modulesUsing": ["AI Department Platform Core"],
                "operatingRule": "Department -> Capability -> Playbook -> Work Step -> Tool Lane -> QA Gate -> Output.",
                "locked": False,
                "workspaceEditable": True,
            }
        )
    fabric.setdefault("schemaVersion", "1.0")
    fabric.setdefault("architecture", "Capability Orchestration Fabric")
    fabric.setdefault("status", "Active")
    fabric.setdefault("lastReviewed", time.strftime("%Y-%m-%d", time.localtime()))
    return fabric


def validate_capability_fabric(fabric: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    capabilities = {row.get("id") for row in fabric.get("capabilities", []) if isinstance(row, dict)}
    recipes = {row.get("id") for row in fabric.get("recipes", []) if isinstance(row, dict)}
    lanes = {row.get("id") for row in fabric.get("lanes", []) if isinstance(row, dict)}
    connections = {row.get("id") for row in fabric.get("connections", []) if isinstance(row, dict)}
    databases = {row.get("id") for row in fabric.get("databases", []) if isinstance(row, dict)}
    ai_support = {row.get("id") for row in fabric.get("aiSupport", []) if isinstance(row, dict)}
    gates = {row.get("id") for row in fabric.get("qualityGates", []) if isinstance(row, dict)}
    for capability in fabric.get("capabilities", []) or []:
        if not isinstance(capability, dict):
            continue
        for recipe_id in capability.get("recipes", []) or []:
            if recipe_id not in recipes:
                errors.append(f"Capability {capability.get('id')} references missing recipe {recipe_id}.")
        for connection_id in (capability.get("requiredConnections", []) or []) + (capability.get("recommendedConnections", []) or []):
            if connection_id not in connections:
                errors.append(f"Capability {capability.get('id')} references missing connection {connection_id}.")
        for db_id in capability.get("databases", []) or []:
            if db_id not in databases:
                errors.append(f"Capability {capability.get('id')} references missing database {db_id}.")
        for ai_id in capability.get("aiSupport", []) or []:
            if ai_id not in ai_support:
                errors.append(f"Capability {capability.get('id')} references missing AI support {ai_id}.")
        for gate_id in capability.get("qualityGates", []) or []:
            if gate_id not in gates:
                errors.append(f"Capability {capability.get('id')} references missing quality gate {gate_id}.")
    for recipe in fabric.get("recipes", []) or []:
        if not isinstance(recipe, dict):
            continue
        if recipe.get("capabilityId") not in capabilities:
            errors.append(f"Recipe {recipe.get('id')} references missing capability {recipe.get('capabilityId')}.")
        for stage in recipe.get("stages", []) or []:
            if not isinstance(stage, dict):
                continue
            for lane_id in stage.get("lanes", []) or []:
                if lane_id not in lanes:
                    errors.append(f"Stage {stage.get('id')} references missing lane {lane_id}.")
            for gate_id in stage.get("qualityGates", []) or []:
                if gate_id not in gates:
                    errors.append(f"Stage {stage.get('id')} references missing quality gate {gate_id}.")
    for lane in fabric.get("lanes", []) or []:
        if not isinstance(lane, dict):
            continue
        for connection_id in lane.get("connections", []) or []:
            if connection_id not in connections:
                errors.append(f"Lane {lane.get('id')} references missing connection {connection_id}.")
        for db_id in lane.get("databases", []) or []:
            if db_id not in databases:
                errors.append(f"Lane {lane.get('id')} references missing database {db_id}.")
        for ai_id in lane.get("aiSupport", []) or []:
            if ai_id not in ai_support:
                errors.append(f"Lane {lane.get('id')} references missing AI support {ai_id}.")
        for gate_id in lane.get("qualityGates", []) or []:
            if gate_id not in gates:
                errors.append(f"Lane {lane.get('id')} references missing quality gate {gate_id}.")
    return errors


def names_for_ids(ids: list[Any] | tuple[Any, ...] | None, rows: list[dict[str, Any]]) -> str:
    lookup = {str(row.get("id")): row.get("label") or row.get("id") for row in rows if isinstance(row, dict)}
    values = [lookup.get(str(item), str(item)) for item in (ids or []) if item]
    return ", ".join(values) if values else "None"


def generated_fabric_note(section: str, fabric: dict[str, Any]) -> str:
    section = str(section or "").strip()
    if section == "workMap":
        lines = [
            "# Work Map",
            "",
            "This section explains how department work moves from responsibility to execution.",
            "",
        ]
        for capability in fabric.get("capabilities", []) or []:
            if not isinstance(capability, dict):
                continue
            lines.extend([
                f"## {capability.get('label') or capability.get('id')}",
                f"- Owner: `{capability.get('ownerStaff') or 'AIstaff_Manager'}`",
                f"- Purpose: {capability.get('summary') or ''}",
                f"- Recipes: {names_for_ids(capability.get('recipes'), fabric.get('recipes', []) or [])}",
                f"- Quality gates: {names_for_ids(capability.get('qualityGates'), fabric.get('qualityGates', []) or [])}",
                f"- Outputs: {', '.join(capability.get('outputs') or []) or 'None'}",
                "",
            ])
        return "\n".join(lines).rstrip() + "\n"
    if section == "lanesTools":
        lines = [
            "# Lanes & Tools",
            "",
            "Use this section to define how every lane/tool should be used, what it needs, and when it must stop.",
            "",
        ]
        for lane in fabric.get("lanes", []) or []:
            if not isinstance(lane, dict):
                continue
            lines.extend([
                f"## {lane.get('label') or lane.get('id')}",
                f"- Lane ID: `{lane.get('id')}`",
                f"- Route type: {lane.get('routeType') or ''}",
                f"- Owner: `{lane.get('ownerStaff') or 'AIstaff_Manager'}`",
                f"- Connections: {names_for_ids(lane.get('connections'), fabric.get('connections', []) or [])}",
                f"- Databases: {names_for_ids(lane.get('databases'), fabric.get('databases', []) or [])}",
                f"- AI support: {names_for_ids(lane.get('aiSupport'), fabric.get('aiSupport', []) or [])}",
                f"- Quality gates: {names_for_ids(lane.get('qualityGates'), fabric.get('qualityGates', []) or [])}",
                "- Use when: TODO",
                "- Input format: TODO",
                "- Output format: TODO",
                "- Failure handling: TODO",
                "- Evidence to log: TODO",
                "",
            ])
        return "\n".join(lines).rstrip() + "\n"
    if section == "qualityGates":
        lines = [
            "# Quality Gates",
            "",
            "Use this checklist before a staff member moves work to the next stage.",
            "",
        ]
        for gate in fabric.get("qualityGates", []) or []:
            if not isinstance(gate, dict):
                continue
            lines.extend([
                f"## {gate.get('label') or gate.get('id')}",
                f"- Gate ID: `{gate.get('id')}`",
                f"- Rule: {gate.get('rule') or ''}",
                "- Severity: Blocking unless marked as advisory.",
                "- Pass evidence: TODO",
                "- If failed: create or update a task/thread with the blocker and next owner.",
                "",
            ])
        return "\n".join(lines).rstrip() + "\n"
    if section == "dataConnectors":
        lines = [
            "# Data & Connectors",
            "",
            "This section tells staff which systems are available and how carefully they may write to them.",
            "",
            "## Connections",
        ]
        for connection in fabric.get("connections", []) or []:
            if not isinstance(connection, dict):
                continue
            lines.append(f"- `{connection.get('id')}`: {connection.get('label')} ({connection.get('status')}, {connection.get('type')})")
        lines.extend(["", "## Databases"])
        for database in fabric.get("databases", []) or []:
            if not isinstance(database, dict):
                continue
            lines.append(f"- `{database.get('id')}`: {database.get('label')} ({database.get('status')}, {database.get('type')})")
        lines.extend(["", "## Write Rules", "- Local task/thread updates are local-first.", "- Closed thread archives can sync to the online CRM.", "- Email and portal actions require their own safety gates."])
        return "\n".join(lines).rstrip() + "\n"
    if section == "aiBrain":
        lines = [
            "# AI Brain",
            "",
            "This section defines which reasoning level is used for each kind of work.",
            "",
        ]
        for row in fabric.get("aiSupport", []) or []:
            if not isinstance(row, dict):
                continue
            lines.extend([
                f"## {row.get('label') or row.get('id')}",
                f"- AI ID: `{row.get('id')}`",
                f"- Model: {row.get('model') or ''}",
                f"- Reasoning effort: {row.get('reasoningEffort') or ''}",
                f"- Owner: `{row.get('ownerStaff') or 'AIstaff_Manager'}`",
                f"- Usage: {row.get('usage') or ''}",
                "- Cost policy: Use the lowest level that can safely complete the work.",
                "",
            ])
        return "\n".join(lines).rstrip() + "\n"
    if section == "outputTemplates":
        lines = [
            "# Output Templates",
            "",
            "This section defines what each staff member must produce before a task can be marked done.",
            "",
        ]
        for capability in fabric.get("capabilities", []) or []:
            if not isinstance(capability, dict):
                continue
            outputs = capability.get("outputs") or []
            if not outputs:
                continue
            lines.extend([
                f"## {capability.get('label') or capability.get('id')}",
                f"- Owner: `{capability.get('ownerStaff') or 'AIstaff_Manager'}`",
                f"- Outputs: {', '.join(outputs)}",
                "- Naming rule: include application/opportunity ID when available.",
                "- Evidence rule: attach a link, file path, or task/thread reference.",
                "",
            ])
        return "\n".join(lines).rstrip() + "\n"
    if section == "learningLibrary":
        return (
            "# Learning Library\n\n"
            "Closed threads can become Skill Update Candidates.\n\n"
            "## Rule\n"
            "- Human-approved learnings are appended to the related staff role file.\n"
            "- Do not auto-apply a learning without `Human_Iman` approval.\n"
            "- The Manager decides whether a human answer should become a department rule or a staff-specific rule.\n\n"
            "## Where Learnings Go\n"
            "- Department-wide rule: `swiss-planner-staff/SKILL.md`\n"
            "- Staff-specific rule: `swiss-planner-staff/roles/<StaffID>.md`\n"
        )
    return f"# {FABRIC_NOTE_SECTIONS.get(section, 'Operating Note')}\n\nAdd operating instructions here.\n"


def load_capability_fabric() -> dict[str, Any]:
    try:
        fabric = json.loads(CAPABILITY_FABRIC_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        return {
            "schemaVersion": "error",
            "status": "Error",
            "errors": [f"Could not load capability fabric: {exc}"],
            "solutionModules": [],
            "capabilities": [],
            "recipes": [],
            "lanes": [],
            "connections": [],
            "databases": [],
            "aiSupport": [],
            "qualityGates": [],
            "automations": [],
            "operatingNotes": {},
        }
    fabric = normalize_capability_fabric(fabric)
    errors = validate_capability_fabric(fabric)
    if not isinstance(fabric.get("operatingNotes"), dict):
        fabric["operatingNotes"] = {}
    fabric["errors"] = errors
    fabric["summary"] = {
        "solutions": len(fabric.get("solutionModules", []) or []),
        "capabilities": len(fabric.get("capabilities", []) or []),
        "recipes": len(fabric.get("recipes", []) or []),
        "stages": sum(len(recipe.get("stages", []) or []) for recipe in fabric.get("recipes", []) or [] if isinstance(recipe, dict)),
        "lanes": len(fabric.get("lanes", []) or []),
        "connections": len(fabric.get("connections", []) or []),
        "databases": len(fabric.get("databases", []) or []),
        "aiSupport": len(fabric.get("aiSupport", []) or []),
        "qualityGates": len(fabric.get("qualityGates", []) or []),
        "departmentTemplates": len(fabric.get("departmentTemplates", []) or []),
        "departments": len(fabric.get("departments", []) or []),
        "staffProfiles": len(fabric.get("staffProfiles", []) or []),
        "outputTemplates": len(fabric.get("outputTemplates", []) or []),
        "kpis": len(fabric.get("kpis", []) or []),
        "reportDefinitions": len(fabric.get("reportDefinitions", []) or []),
        "automations": len(fabric.get("automations", []) or []),
        "operatingNotes": len(fabric.get("operatingNotes", {}) or {}),
        "errors": len(errors),
    }
    return fabric


def read_fabric_note(section: str) -> dict[str, Any]:
    section = str(section or "").strip()
    if section not in FABRIC_NOTE_SECTIONS:
        return {"ok": False, "error": f"Unknown fabric note section: {section}"}
    fabric = load_capability_fabric()
    saved = (fabric.get("operatingNotes") or {}).get(section)
    generated = not isinstance(saved, str) or not saved.strip()
    content = generated_fabric_note(section, fabric) if generated else saved
    return {
        "ok": True,
        "section": section,
        "label": FABRIC_NOTE_SECTIONS[section],
        "generated": generated,
        "content": content,
        "path": str(CAPABILITY_FABRIC_PATH),
        "updatedAt": iso_like(CAPABILITY_FABRIC_PATH.stat().st_mtime) if CAPABILITY_FABRIC_PATH.exists() else "",
    }


def write_fabric_note(payload: dict[str, Any]) -> dict[str, Any]:
    section = str(payload.get("section") or "").strip()
    content = payload.get("content")
    if section not in FABRIC_NOTE_SECTIONS:
        return {"ok": False, "error": f"Unknown fabric note section: {section}"}
    if not isinstance(content, str) or not content.strip():
        return {"ok": False, "error": "Missing Markdown content."}
    try:
        fabric = json.loads(CAPABILITY_FABRIC_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        return {"ok": False, "error": f"Could not load capability fabric: {exc}"}
    fabric = normalize_capability_fabric(fabric)
    if not isinstance(fabric.get("operatingNotes"), dict):
        fabric["operatingNotes"] = {}
    fabric["operatingNotes"][section] = content.replace("\r\n", "\n")
    fabric["lastReviewed"] = time.strftime("%Y-%m-%d", time.localtime())
    errors = validate_capability_fabric(fabric)
    if errors:
        return {"ok": False, "error": "Capability fabric validation failed.", "errors": errors}
    record_department_version(
        object_type="operatingNotes",
        object_id=section,
        action="Update operating note",
        before_payload={section: (load_capability_fabric().get("operatingNotes") or {}).get(section, "")},
        after_payload={section: content.replace("\r\n", "\n")},
        created_by=str(payload.get("updatedBy") or "Human_Iman"),
        reason=str(payload.get("reason") or "Department settings note updated."),
    )
    CAPABILITY_FABRIC_PATH.write_text(json.dumps(fabric, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return read_fabric_note(section)


def record_department_version(
    object_type: str,
    object_id: str,
    action: str,
    before_payload: Any,
    after_payload: Any,
    created_by: str = "Human_Iman",
    reason: str = "",
) -> dict[str, Any]:
    init_db()
    version_id = "version_" + str(uuid.uuid4())
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO department_versions (
              version_id, object_type, object_id, action, before_payload, after_payload,
              created_at, created_by, reason
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                version_id,
                object_type,
                object_id,
                action,
                json.dumps(before_payload, ensure_ascii=False, default=str),
                json.dumps(after_payload, ensure_ascii=False, default=str),
                utc_ts(),
                created_by or "Human_Iman",
                reason or "",
            ),
        )
    return {"ok": True, "versionId": version_id}


def list_department_versions(limit: int = 80) -> dict[str, Any]:
    init_db()
    safe_limit = max(1, min(int(limit or 80), 250))
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM department_versions ORDER BY created_at DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()
    return {
        "ok": True,
        "versions": [
            {
                "versionId": row["version_id"],
                "objectType": row["object_type"],
                "objectId": row["object_id"],
                "action": row["action"],
                "createdAt": iso_like(row["created_at"]),
                "createdBy": row["created_by"],
                "reason": row["reason"],
                "beforePayload": row["before_payload"],
                "afterPayload": row["after_payload"],
            }
            for row in rows
        ],
    }


def collection_rows(fabric: dict[str, Any], collection: str) -> list[dict[str, Any]]:
    rows = fabric.setdefault(collection, [])
    if not isinstance(rows, list):
        fabric[collection] = []
        rows = fabric[collection]
    return rows


def find_collection_item(rows: list[dict[str, Any]], object_id: str) -> tuple[int, dict[str, Any] | None]:
    for index, row in enumerate(rows):
        if isinstance(row, dict) and str(row.get("id")) == str(object_id):
            return index, row
    return -1, None


def write_capability_fabric(fabric: dict[str, Any]) -> dict[str, Any]:
    fabric = normalize_capability_fabric(fabric)
    fabric["lastReviewed"] = time.strftime("%Y-%m-%d", time.localtime())
    errors = validate_capability_fabric(fabric)
    if errors:
        return {"ok": False, "error": "Capability fabric validation failed.", "errors": errors}
    CAPABILITY_FABRIC_PATH.write_text(json.dumps(fabric, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return {"ok": True, "capabilityFabric": load_capability_fabric()}


def upsert_fabric_object(payload: dict[str, Any]) -> dict[str, Any]:
    collection = str(payload.get("collection") or "").strip()
    item = payload.get("item")
    if collection not in EDITABLE_FABRIC_COLLECTIONS:
        return {"ok": False, "error": f"Unsupported designer collection: {collection}"}
    if not isinstance(item, dict):
        return {"ok": False, "error": "Designer save requires an object."}
    object_id = str(item.get("id") or payload.get("objectId") or "").strip()
    if not object_id:
        return {"ok": False, "error": "Object must include an id."}
    try:
        fabric = normalize_capability_fabric(json.loads(CAPABILITY_FABRIC_PATH.read_text(encoding="utf-8")))
    except Exception as exc:
        return {"ok": False, "error": f"Could not load capability fabric: {exc}"}
    rows = collection_rows(fabric, collection)
    index, existing = find_collection_item(rows, object_id)
    if existing and existing.get("locked") and not payload.get("allowLocked"):
        return {
            "ok": False,
            "error": f"{FABRIC_COLLECTION_LABELS.get(collection, collection)} item {object_id} is platform-locked.",
            "locked": True,
        }
    updated = json_clone(item)
    updated["id"] = object_id
    updated["updatedAt"] = iso_like()
    updated["updatedBy"] = payload.get("updatedBy") or "Human_Iman"
    action = "Update designer object" if existing else "Create designer object"
    if index >= 0:
        rows[index] = updated
    else:
        rows.append(updated)
    backup = create_config_backup({"reason": f"Before {action}: {collection}/{object_id}", "notes": "Automatic pre-save backup."})
    result = write_capability_fabric(fabric)
    if not result.get("ok"):
        return result
    version = record_department_version(
        object_type=collection,
        object_id=object_id,
        action=action,
        before_payload=existing or {},
        after_payload=updated,
        created_by=str(payload.get("updatedBy") or "Human_Iman"),
        reason=str(payload.get("reason") or ""),
    )
    result["version"] = version
    result["backup"] = backup
    return result


def archive_fabric_object(payload: dict[str, Any]) -> dict[str, Any]:
    collection = str(payload.get("collection") or "").strip()
    object_id = str(payload.get("objectId") or payload.get("id") or "").strip()
    if collection not in EDITABLE_FABRIC_COLLECTIONS:
        return {"ok": False, "error": f"Unsupported designer collection: {collection}"}
    if not object_id:
        return {"ok": False, "error": "Missing objectId."}
    try:
        fabric = normalize_capability_fabric(json.loads(CAPABILITY_FABRIC_PATH.read_text(encoding="utf-8")))
    except Exception as exc:
        return {"ok": False, "error": f"Could not load capability fabric: {exc}"}
    rows = collection_rows(fabric, collection)
    index, existing = find_collection_item(rows, object_id)
    if index < 0 or not existing:
        return {"ok": False, "error": f"Object not found: {collection}/{object_id}"}
    if existing.get("locked"):
        return {"ok": False, "error": "Platform-locked objects cannot be archived from workspace settings.", "locked": True}
    updated = {**existing, "lifecycleStatus": "Archived", "status": "Archived", "archived": True, "updatedAt": iso_like(), "updatedBy": payload.get("updatedBy") or "Human_Iman"}
    rows[index] = updated
    backup = create_config_backup({"reason": f"Before archive: {collection}/{object_id}", "notes": "Automatic pre-archive backup."})
    result = write_capability_fabric(fabric)
    if not result.get("ok"):
        return result
    version = record_department_version(
        object_type=collection,
        object_id=object_id,
        action="Archive designer object",
        before_payload=existing,
        after_payload=updated,
        created_by=str(payload.get("updatedBy") or "Human_Iman"),
        reason=str(payload.get("reason") or ""),
    )
    result["version"] = version
    result["backup"] = backup
    return result


def rollback_department_version(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()
    version_id = str(payload.get("versionId") or "").strip()
    if not version_id:
        return {"ok": False, "error": "Missing versionId."}
    with connect() as conn:
        row = conn.execute("SELECT * FROM department_versions WHERE version_id = ?", (version_id,)).fetchone()
    if not row:
        return {"ok": False, "error": f"Version not found: {version_id}"}
    collection = row["object_type"]
    object_id = row["object_id"]
    if collection not in EDITABLE_FABRIC_COLLECTIONS and collection != "operatingNotes":
        return {"ok": False, "error": f"Cannot rollback unsupported object type: {collection}"}
    if str(payload.get("confirmRollback") or "").strip().upper() != "ROLLBACK":
        return {"ok": False, "error": "Rollback requires confirmRollback = ROLLBACK."}
    before_payload = json.loads(row["before_payload"] or "{}")
    try:
        fabric = normalize_capability_fabric(json.loads(CAPABILITY_FABRIC_PATH.read_text(encoding="utf-8")))
    except Exception as exc:
        return {"ok": False, "error": f"Could not load capability fabric: {exc}"}
    if collection == "operatingNotes":
        notes = fabric.setdefault("operatingNotes", {})
        previous = notes.get(object_id, "")
        restored = before_payload.get(object_id, "") if isinstance(before_payload, dict) else ""
        notes[object_id] = restored
        current_before = {object_id: previous}
        current_after = {object_id: restored}
    else:
        rows = collection_rows(fabric, collection)
        index, existing = find_collection_item(rows, object_id)
        if before_payload:
            restored = json_clone(before_payload)
            restored["updatedAt"] = iso_like()
            restored["updatedBy"] = payload.get("updatedBy") or "Human_Iman"
            if index >= 0:
                rows[index] = restored
            else:
                rows.append(restored)
            current_after = restored
        else:
            if index >= 0:
                rows.pop(index)
            current_after = {}
        current_before = existing or {}
    backup = create_config_backup({"reason": f"Before rollback: {version_id}", "notes": "Automatic pre-rollback backup."})
    result = write_capability_fabric(fabric)
    if not result.get("ok"):
        return result
    version = record_department_version(
        object_type=collection,
        object_id=object_id,
        action=f"Rollback to {version_id}",
        before_payload=current_before,
        after_payload=current_after,
        created_by=str(payload.get("updatedBy") or "Human_Iman"),
        reason=str(payload.get("reason") or "Rollback requested from Department Designer."),
    )
    result["version"] = version
    result["backup"] = backup
    return result


def backup_manifest_paths() -> list[Path]:
    paths: list[Path] = []
    if APPLICATION_PACKAGES_DIR.exists():
        for candidate in APPLICATION_PACKAGES_DIR.rglob("*"):
            if candidate.is_file() and "manifest" in candidate.name.lower():
                paths.append(candidate)
    return paths[:200]


def create_config_backup(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = payload or {}
    init_db()
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    backup_id = "backup_" + time.strftime("%Y%m%d_%H%M%S", time.localtime()) + "_" + str(uuid.uuid4())[:8]
    zip_path = BACKUP_DIR / f"{backup_id}.zip"
    included: list[str] = []
    try:
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            if CAPABILITY_FABRIC_PATH.exists():
                archive.write(CAPABILITY_FABRIC_PATH, "swiss_planner_command_center/capability_fabric.json")
                included.append("capability_fabric.json")
            for suffix in ["", "-wal", "-shm"]:
                db_file = Path(str(DB_PATH) + suffix)
                if db_file.exists():
                    archive.write(db_file, f"swiss_planner_command_center/{db_file.name}")
                    included.append(db_file.name)
            if STAFF_SKILL_DIR.exists():
                for skill_file in [STAFF_SKILL_DIR / "SKILL.md", *list((STAFF_SKILL_DIR / "roles").glob("*.md"))]:
                    if skill_file.exists():
                        rel = "skills/swiss-planner-staff/" + str(skill_file.relative_to(STAFF_SKILL_DIR)).replace("\\", "/")
                        archive.write(skill_file, rel)
                        included.append(rel)
            for manifest in backup_manifest_paths():
                rel = "package_manifests/" + str(manifest.relative_to(ROOT_DIR)).replace("\\", "/")
                archive.write(manifest, rel)
                included.append(rel)
        status = "Done"
        error = ""
    except Exception as exc:
        status = "Error"
        error = str(exc)
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO backup_runs (backup_id, created_at, status, path, included, error, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                backup_id,
                utc_ts(),
                status,
                str(zip_path),
                json.dumps(included, ensure_ascii=False),
                error,
                str(payload.get("reason") or payload.get("notes") or ""),
            ),
        )
    return {
        "ok": status == "Done",
        "backupId": backup_id,
        "status": status,
        "path": str(zip_path),
        "included": included,
        "error": error,
    }


def list_backups(limit: int = 50) -> dict[str, Any]:
    init_db()
    safe_limit = max(1, min(int(limit or 50), 200))
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM backup_runs ORDER BY created_at DESC LIMIT ?",
            (safe_limit,),
        ).fetchall()
    return {
        "ok": True,
        "backups": [
            {
                "backupId": row["backup_id"],
                "createdAt": iso_like(row["created_at"]),
                "status": row["status"],
                "path": row["path"],
                "included": json.loads(row["included"] or "[]"),
                "error": row["error"],
                "notes": row["notes"],
            }
            for row in rows
        ],
    }


def restore_config_backup(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()
    if str(payload.get("confirmRestore") or "").strip().upper() != "RESTORE":
        return {"ok": False, "error": "Restore requires confirmRestore = RESTORE."}
    backup_id = str(payload.get("backupId") or "").strip()
    path = str(payload.get("path") or "").strip()
    if backup_id and not path:
        with connect() as conn:
            row = conn.execute("SELECT path FROM backup_runs WHERE backup_id = ?", (backup_id,)).fetchone()
        if row:
            path = row["path"]
    if not path:
        return {"ok": False, "error": "Missing backupId or path."}
    zip_path = Path(path).resolve()
    backup_root = BACKUP_DIR.resolve()
    if backup_root not in zip_path.parents and zip_path != backup_root:
        return {"ok": False, "error": "Restore path must be inside the local backups folder."}
    if not zip_path.exists():
        return {"ok": False, "error": f"Backup file not found: {zip_path}"}
    pre_restore = create_config_backup({"reason": "Automatic backup before restore."})
    try:
        with zipfile.ZipFile(zip_path, "r") as archive:
            raw = archive.read("swiss_planner_command_center/capability_fabric.json").decode("utf-8")
            restored_fabric = normalize_capability_fabric(json.loads(raw))
    except Exception as exc:
        return {"ok": False, "error": f"Could not read fabric from backup: {exc}", "preRestoreBackup": pre_restore}
    current = load_capability_fabric()
    result = write_capability_fabric(restored_fabric)
    if not result.get("ok"):
        return {**result, "preRestoreBackup": pre_restore}
    record_department_version(
        object_type="capability_fabric",
        object_id=str(backup_id or zip_path.name),
        action="Restore fabric backup",
        before_payload=current,
        after_payload=restored_fabric,
        created_by=str(payload.get("updatedBy") or "Human_Iman"),
        reason=str(payload.get("reason") or "Restore requested from Department Designer."),
    )
    result["preRestoreBackup"] = pre_restore
    return result


def department_config() -> dict[str, Any]:
    fabric = load_capability_fabric()
    return {
        "ok": True,
        "capabilityFabric": fabric,
        "collections": [
            {"key": key, "label": label, "count": len(fabric.get(key, []) or [])}
            for key, label in FABRIC_COLLECTION_LABELS.items()
            if isinstance(fabric.get(key, []), list)
        ],
        "governance": fabric.get("governance") or {},
        "permissions": fabric.get("permissions") or {},
        "versions": list_department_versions(25).get("versions", []),
        "backups": list_backups(15).get("backups", []),
    }


def capability_fabric_manager_context() -> dict[str, Any]:
    fabric = load_capability_fabric()
    return {
        "architecture": fabric.get("architecture"),
        "normalRelationship": "Solution module -> Capability -> Recipe -> Stage -> Lane -> Quality gate -> Output",
        "capabilities": [
            {
                "id": row.get("id"),
                "label": row.get("label"),
                "ownerStaff": row.get("ownerStaff"),
                "recipes": row.get("recipes", []),
                "qualityGates": row.get("qualityGates", []),
            }
            for row in (fabric.get("capabilities", []) or [])
            if isinstance(row, dict)
        ],
        "recipes": [
            {
                "id": row.get("id"),
                "capabilityId": row.get("capabilityId"),
                "ownerStaff": row.get("ownerStaff"),
                "stageCount": len(row.get("stages", []) or []),
            }
            for row in (fabric.get("recipes", []) or [])
            if isinstance(row, dict)
        ],
        "qualityGates": [
            {"id": row.get("id"), "label": row.get("label")}
            for row in (fabric.get("qualityGates", []) or [])
            if isinstance(row, dict)
        ],
        "operatingNoteSections": [
            {
                "section": section,
                "label": label,
                "available": isinstance((fabric.get("operatingNotes") or {}).get(section), str),
            }
            for section, label in FABRIC_NOTE_SECTIONS.items()
        ],
    }


def load_dashboard_snapshot() -> Dashboard | None:
    with connect() as conn:
        row = conn.execute("SELECT payload, updated_at, source, error FROM dashboard_snapshot WHERE id = 1").fetchone()
    if not row:
        return None
    enforce_manager_human_gate()
    payload = json.loads(row["payload"])
    payload = normalize_task_table(payload)
    payload = ensure_threads_for_tasks(payload)
    payload["skillUpdates"] = list_skill_updates("Pending").get("learning", [])
    payload["skillUpdatesAll"] = list_skill_updates("All").get("learning", [])
    payload["staffWakeups"] = staff_wakeup_summary()
    payload["localSync"] = local_status()
    payload["capabilityFabric"] = load_capability_fabric()
    return payload


def save_dashboard_snapshot(payload: Dashboard, source: str = "bridge", error: str = "") -> Dashboard:
    saved = dict(payload or {})
    saved = normalize_task_table(saved)
    saved = ensure_threads_for_tasks(saved)
    saved["skillUpdates"] = list_skill_updates("Pending").get("learning", [])
    saved["skillUpdatesAll"] = list_skill_updates("All").get("learning", [])
    saved["staffWakeups"] = staff_wakeup_summary()
    saved["localSync"] = local_status()
    saved["capabilityFabric"] = load_capability_fabric()
    raw = json.dumps(saved, default=str)
    now = utc_ts()
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO dashboard_snapshot (id, payload, updated_at, source, error)
            VALUES (1, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              payload=excluded.payload,
              updated_at=excluded.updated_at,
              source=excluded.source,
              error=excluded.error
            """,
            (raw, now, source, error),
        )
    return load_dashboard_snapshot() or saved


def normalize_text(value: Any) -> str:
    return str(value or "").lower().replace("_", " ").replace("-", " ").strip()


def local_env_value(name: str, fallback: str = "") -> str:
    value = os.environ.get(name)
    if value:
        return value.strip().strip('"').strip("'")
    if not LOCAL_ENV_PATH.exists():
        return fallback
    try:
        for raw_line in LOCAL_ENV_PATH.read_text(encoding="utf-8-sig").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[len("export ") :].strip()
            if "=" not in line:
                continue
            key, raw_value = line.split("=", 1)
            if key.strip() == name:
                return raw_value.strip().strip('"').strip("'")
    except OSError:
        return fallback
    return fallback


def approved_style_status(value: Any) -> bool:
    return normalize_text(value) in APPROVED_STYLE_QA_STATUSES


def document_quality_status(max_issues: int = 40) -> dict[str, Any]:
    """Scan local package manifests for visual/template QA blockers.

    This is intentionally local and conservative. It protects the Windows-first
    package workflow from treating operational PDFs as professor-ready files.
    """
    issues: list[dict[str, Any]] = []
    seen: set[str] = set()
    if not APPLICATION_PACKAGES_DIR.exists():
        return {"ok": True, "issueCount": 0, "issues": [], "root": str(APPLICATION_PACKAGES_DIR)}

    for manifest_path in APPLICATION_PACKAGES_DIR.rglob("deep_package_manifest.json"):
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig", errors="ignore"))
        except Exception as exc:
            issues.append(
                {
                    "kind": "Manifest Error",
                    "path": str(manifest_path),
                    "applicationId": "",
                    "opportunityId": "",
                    "queueId": "",
                    "status": "Unreadable manifest",
                    "message": f"Could not read package manifest: {exc}",
                }
            )
            continue
        quality = manifest.get("document_quality") or {}
        status = quality.get("style_quality_status") or quality.get("styleQualityStatus") or ""
        renderer = quality.get("pdf_renderer") or quality.get("pdfRenderer") or ""
        marker = manifest_path.parent / "STYLE_QA_APPROVED.txt"
        warning = manifest_path.parent / "UNAPPROVED_MINIMAL_PDFS_DO_NOT_SEND.md"
        if marker.exists() or approved_style_status(status):
            continue
        if not status and not renderer and not warning.exists():
            continue
        key = str(manifest_path)
        seen.add(key)
        issues.append(
            {
                "kind": "Document Template Style",
                "path": str(manifest_path),
                "folder": str(manifest_path.parent),
                "applicationId": manifest.get("application_id") or manifest.get("applicationId") or "",
                "opportunityId": manifest.get("opportunity_id") or manifest.get("opportunityId") or "",
                "queueId": manifest.get("queue_id") or manifest.get("queueId") or "",
                "status": status or "Not approved",
                "renderer": renderer,
                "message": (
                    quality.get("required_next_step")
                    or "Regenerate/export from the approved Google Docs/template path before external send."
                ),
                "approvedGoogleDocs": quality.get("approved_google_docs") or {},
            }
        )

    for warning_path in APPLICATION_PACKAGES_DIR.rglob("UNAPPROVED_MINIMAL_PDFS_DO_NOT_SEND.md"):
        manifest_path = warning_path.parent / "deep_package_manifest.json"
        if str(manifest_path) in seen:
            continue
        issues.append(
            {
                "kind": "Document Template Style",
                "path": str(warning_path),
                "folder": str(warning_path.parent),
                "applicationId": "",
                "opportunityId": "",
                "queueId": "",
                "status": "Not approved for external send",
                "renderer": "local minimal PDF renderer",
                "message": "Local warning marker says these PDFs are not approved for external send.",
                "approvedGoogleDocs": {},
            }
        )

    return {
        "ok": len(issues) == 0,
        "issueCount": len(issues),
        "issues": issues[:max_issues],
        "root": str(APPLICATION_PACKAGES_DIR),
    }


def queue_row_from_snapshot(queue_id: str) -> dict[str, Any] | None:
    target = str(queue_id or "").strip()
    if not target:
        return None
    snapshot = load_dashboard_snapshot() or {}
    for row in flatten_email_queue(snapshot.get("emailQueue")):
        if str(row.get("queueId") or row.get("Queue ID") or "").strip() == target:
            return row
    for row in snapshot.get("tasks", []) or []:
        if str(row.get("queueId") or row.get("sourceQueueId") or row.get("Queue ID") or "").strip() == target:
            return row
    return None


def preflight_queue_document_quality(queue_id: str) -> dict[str, Any]:
    queue_id = str(queue_id or "").strip()
    queue = queue_row_from_snapshot(queue_id)
    quality = document_quality_status()
    if not quality.get("issues"):
        return {"ok": True, "queueId": queue_id, "documentQuality": quality}
    blockers = []
    for issue in quality.get("issues", []):
        if issue.get("queueId") and str(issue.get("queueId")).strip() == queue_id:
            blockers.append(issue)
    if not queue:
        if blockers:
            return {
                "ok": False,
                "queueId": queue_id,
                "status": "Blocked - Document Style QA",
                "error": (
                    "Document Style QA blocked this send. The package manifest is tied to this queue ID and is marked "
                    "not approved for external send. Regenerate/export from the approved Google Docs/template path first."
                ),
                "blockers": blockers,
                "documentQuality": quality,
            }
        return {"ok": True, "queueId": queue_id, "documentQuality": quality}
    app_id = str(queue.get("applicationId") or queue.get("ApplicationID") or queue.get("Application ID") or "").strip()
    opp_id = str(queue.get("opportunityId") or queue.get("Opportunity ID") or "").strip()
    for issue in quality.get("issues", []):
        if issue.get("queueId") and str(issue.get("queueId")).strip() == queue_id:
            blockers.append(issue)
        elif app_id and issue.get("applicationId") == app_id:
            blockers.append(issue)
        elif opp_id and issue.get("opportunityId") == opp_id:
            blockers.append(issue)
    if not blockers:
        return {"ok": True, "queueId": queue_id, "documentQuality": quality}
    return {
        "ok": False,
        "queueId": queue_id,
        "status": "Blocked - Document Style QA",
        "error": (
            "Document Style QA blocked this send. The package has local/minimal-renderer PDFs or a manifest marked "
            "not approved for external send. Regenerate/export from the approved Google Docs/template path first."
        ),
        "blockers": blockers,
        "documentQuality": quality,
    }


def text_has_phrase(value: Any, phrase: str) -> bool:
    text = normalize_text(value)
    phrase_norm = normalize_text(phrase)
    if not text or not phrase_norm:
        return False
    pattern = r"(?<![a-z0-9])" + r"\s+".join(re.escape(part) for part in phrase_norm.split()) + r"(?![a-z0-9])"
    return re.search(pattern, text) is not None


def text_has_any_phrase(value: Any, phrases: list[str] | tuple[str, ...]) -> bool:
    return any(text_has_phrase(value, phrase) for phrase in phrases)


def is_false_cancel_correction(value: Any) -> bool:
    text = normalize_text(value)
    return (
        text_has_any_phrase(
            text,
            [
                "did not mean to cancel",
                "didn't mean to cancel",
                "do not cancel",
                "don't cancel",
                "not cancel",
                "not a cancel",
                "continue",
                "go on",
                "proceed",
            ],
        )
        or (text_has_phrase(text, "not") and text_has_phrase(text, "cancel"))
    )


def is_cancel_instruction(value: Any) -> bool:
    if is_false_cancel_correction(value):
        return False
    return text_has_any_phrase(
        value,
        [
            "stop",
            "stop this",
            "stop the task",
            "stop the thread",
            "cancel",
            "cancel this",
            "cancel the task",
            "cancel the thread",
            "do not continue",
            "don't continue",
            "do not proceed",
            "don't proceed",
            "do not send",
            "don't send",
            "pause this",
            "hold this",
            "close this thread",
            "archive this thread",
        ],
    )


def is_approval_instruction(value: Any) -> bool:
    return text_has_any_phrase(
        value,
        [
            "approve",
            "approved",
            "yes",
            "ok",
            "okay",
            "go ahead",
            "send it",
            "continue",
            "proceed",
        ],
    )


def is_full_process_request(value: Any) -> bool:
    return text_has_any_phrase(
        value,
        [
            "full process",
            "whole process",
            "end point",
            "end to end",
            "until submission",
            "till submission",
            "to submission",
            "application process",
            "apply for these",
            "take these through",
            "take them through",
            "with your team",
            "your department",
        ],
    )


def is_human_responsible(value: Any) -> bool:
    text = normalize_text(value)
    return text in {"human", "human iman"} or "iman / human" in text or "iman human" in text


def task_is_terminal(row: dict[str, Any]) -> bool:
    text = normalize_text(row.get("status"))
    return text in {"done", "closed", "cancelled", "sent", "submitted", "no further action"}


def has_human_signal(row: dict[str, Any]) -> bool:
    if task_is_terminal(row):
        return False
    text = normalize_text(
        " ".join(
            str(row.get(key) or "")
            for key in [
                "status",
                "failureStatus",
                "approvalStatus",
                "sendStatus",
                "lastError",
                "resultNotes",
                "nextAction",
                "completionCriteria",
            ]
        )
    )
    return any(
        term in text
        for term in [
            "needs approval",
            "needs human review",
            "human review",
            "duplicate recipient",
            "content review",
            "not approved",
            "approval required",
            "supervisor reply",
            "blocked",
        ]
    )


def flatten_email_queue(queue: Any) -> list[dict[str, Any]]:
    if isinstance(queue, list):
        return [row for row in queue if isinstance(row, dict)]
    if not isinstance(queue, dict):
        return []
    rows: list[dict[str, Any]] = []
    for key in ["queue", "blocked", "queued", "drafted", "sent", "errors", "needsReview"]:
        value = queue.get(key)
        if isinstance(value, list):
            rows.extend(row for row in value if isinstance(row, dict))
    return rows


def safe_task_part(value: Any) -> str:
    raw = str(value or "review")
    return "".join(ch if ch.isalnum() or ch in "_-" else "_" for ch in raw)


def thread_id_for_task(task_id: Any) -> str:
    return "thread_" + safe_task_part(task_id or ("task_" + str(uuid.uuid4())))


def staff_label(staff_id: Any) -> str:
    staff_id_text = str(staff_id or "").strip()
    if staff_id_text in DEFAULT_STAFF_ALIASES:
        return DEFAULT_STAFF_ALIASES[staff_id_text]
    text = str(staff_id or "").replace("AIstaff_", "").replace("Human_Iman", "Iman / Human")
    text = text.replace("_", " ")
    out = []
    for char in text:
        if out and char.isupper() and out[-1].islower():
            out.append(" ")
        out.append(char)
    return " ".join("".join(out).split()) or "AI Staff"


def is_staff_id(value: Any) -> bool:
    text = str(value or "").strip()
    return text.startswith("AIstaff_") or text == "Human_Iman"


def normalized_staff_id(value: Any, fallback: str = "AIstaff_Manager") -> str:
    text = str(value or "").strip()
    if text in {"Iman / Human", "Human", "human", "iman"}:
        return "Human_Iman"
    return text if is_staff_id(text) else fallback


def row_value(row: sqlite3.Row | dict[str, Any], key: str, default: Any = "") -> Any:
    if isinstance(row, dict):
        return row.get(key, default)
    try:
        return row[key]
    except (KeyError, IndexError):
        return default


def source_payload_for_thread(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    raw = row_value(row, "source_payload") or row_value(row, "source") or "{}"
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(str(raw or "{}"))
    except json.JSONDecodeError:
        return {}


def is_human_decision_thread(row: sqlite3.Row | dict[str, Any]) -> bool:
    source = source_payload_for_thread(row)
    if normalize_text(source.get("sourceKind")) == "system audit":
        return False
    category = normalize_text(source.get("taskCategory") or source.get("Task Category"))
    return (
        category == "human decision"
        or is_human_responsible(source.get("assignedTo"))
        or is_human_responsible(source.get("targetStaff"))
        or is_human_responsible(row_value(row, "responsible"))
        or is_human_responsible(row_value(row, "unread_for") or row_value(row, "unreadFor"))
    )


def thread_action_staff(row: sqlite3.Row | dict[str, Any]) -> str:
    if is_human_decision_thread(row):
        return "AIstaff_Manager"
    unread = normalized_staff_id(row_value(row, "unread_for") or row_value(row, "unreadFor"), "")
    if unread:
        return unread
    responsible = normalized_staff_id(row_value(row, "responsible"), "")
    if responsible:
        return responsible
    return normalized_staff_id(row_value(row, "source_staff") or row_value(row, "sourceStaff"), "AIstaff_Manager")


def is_thread_task(row: dict[str, Any]) -> bool:
    if not row or task_is_terminal(row):
        return False
    return bool(row.get("taskId") or row.get("Task ID"))


def thread_target_staff(row: dict[str, Any]) -> str:
    return normalized_staff_id(row.get("targetStaff") or row.get("assignedTo") or row.get("Assigned To"), "AIstaff_Manager")


def thread_source_staff(row: dict[str, Any]) -> str:
    candidates = [
        row.get("sourceStaff"),
        row.get("createdBy"),
        row.get("assignedTo") if not is_human_responsible(row.get("assignedTo")) else "",
    ]
    for value in candidates:
        text = normalized_staff_id(value, "")
        if text:
            return text
    return "AIstaff_Manager"


def route_target_staff(source_staff: str, target_staff: str) -> tuple[str, str]:
    source = normalized_staff_id(source_staff, "AIstaff_Manager")
    target = normalized_staff_id(target_staff, "AIstaff_Manager")
    if source.startswith("AIstaff_") and source != "AIstaff_Manager" and target != "AIstaff_Manager":
        return "AIstaff_Manager", f"Routed through AIstaff_Manager because {staff_label(source)} can only send tasks/messages to its AI Manager."
    if target == "Human_Iman" and source != "AIstaff_Manager":
        return "AIstaff_Manager", "Routed through AIstaff_Manager because only the AI Manager may contact Human_Iman."
    return target, ""


def routed_thread_parties(row: dict[str, Any]) -> tuple[str, str, str]:
    source_staff = thread_source_staff(row)
    target_staff, routing_note = route_target_staff(source_staff, thread_target_staff(row))
    return source_staff, target_staff, routing_note


def task_category_for_signal(row: dict[str, Any], source_kind: str = "") -> str:
    text = normalize_text(
        " ".join(
            str(row.get(key) or "")
            for key in [
                "taskCategory",
                "Task Category",
                "taskType",
                "Task Type",
                "status",
                "sendStatus",
                "approvalStatus",
                "lastError",
                "resultNotes",
                "nextAction",
                "subject",
                "Subject",
                "type",
                "message",
                "reason",
            ]
        )
        + " "
        + source_kind
    )
    if "duplicate recipient" in text or "needs approval" in text or "needs human review" in text or "supervisor reply" in text:
        return TASK_CATEGORIES["human"]
    if "email" in text or "queue" in text or "attachment" in text or "send" in text or "gmail" in text:
        return TASK_CATEGORIES["email"]
    if "technical" in text or "bug" in text or "webhook" in text or "lock" in text or "traceback" in text or "script error" in text:
        return TASK_CATEGORIES["technical"]
    if "audit" in text or "follow-up" in text or "followup" in text or "missing follow" in text or "stale" in text:
        return TASK_CATEGORIES["audit"]
    if "research" in text or "opportunit" in text or "professor" in text:
        return TASK_CATEGORIES["research"]
    if "package" in text or "application" in text or "proposal" in text or "cv" in text or "sop" in text:
        return TASK_CATEGORIES["application"]
    return TASK_CATEGORIES["manager"]


def assigned_staff_for_category(category: str, row: dict[str, Any], source_staff: str) -> str:
    if category == TASK_CATEGORIES["human"]:
        return "Human_Iman" if normalized_staff_id(source_staff, "AIstaff_Manager") == "AIstaff_Manager" else "AIstaff_Manager"
    if category in {TASK_CATEGORIES["audit"], TASK_CATEGORIES["technical"], TASK_CATEGORIES["manager"]}:
        return "AIstaff_Manager"
    if category == TASK_CATEGORIES["email"]:
        return "AIstaff_ApplicationPackSender"
    return normalized_staff_id(row.get("assignedTo") or row.get("staff") or source_staff, "AIstaff_Manager")


def compact_join(parts: list[Any], separator: str = " ") -> str:
    return separator.join(" ".join(str(part or "").split()) for part in parts if str(part or "").strip()).strip()


def task_context_label(row: dict[str, Any]) -> str:
    app_id = row.get("applicationId") or row.get("ApplicationID") or row.get("relatedApplicationId") or ""
    opp_id = row.get("opportunityId") or row.get("Opportunity ID") or row.get("relatedOpportunityId") or ""
    queue_id = row.get("sourceQueueId") or row.get("queueId") or row.get("Queue ID") or ""
    bits = []
    if app_id:
        bits.append(f"application `{app_id}`")
    if opp_id:
        bits.append(f"opportunity `{opp_id}`")
    if queue_id:
        bits.append(f"email queue `{queue_id}`")
    return "; ".join(bits) or "this task"


def human_task_problem(row: dict[str, Any]) -> str:
    text = normalize_text(
        compact_join(
            [
                row.get("taskType"),
                row.get("taskCategory"),
                row.get("status"),
                row.get("lastError"),
                row.get("resultNotes"),
                row.get("nextAction"),
                row.get("completionCriteria"),
            ]
        )
    )
    action = row.get("nextAction") or row.get("taskType") or "Review the task"
    if "duplicate recipient" in text or "repeated professor" in text or "repeated supervisor" in text:
        return "The system detected a repeated professor/supervisor recipient, so it stopped before any second outreach."
    if "document style qa" in text or "not approved for external send" in text or "minimal renderer" in text:
        return "The package documents are present, but at least one file is marked as not approved for external sending because it does not match the agreed template/style quality."
    if "attachment" in text and ("failed" in text or "blocked" in text or "incomplete" in text):
        return "The email/package cannot be sent yet because attachment access or package completeness has not passed."
    if "codex" in text or "outside apps script" in text or "waiting for codex worker" in text:
        return "The workflow reached a step that Apps Script can track, but not judge or write safely by itself."
    if "follow" in text or "reply" in text or "waiting" in text:
        return "A follow-up or reply-check is due, and the system needs a clear next action instead of guessing."
    if "approval" in text or "review" in text:
        return "The workflow is paused because a human decision or manager decision is required before it can continue."
    return f"The workflow needs a decision about: {compact_join([action])}."


def human_task_exact_need(row: dict[str, Any]) -> str:
    text = normalize_text(
        compact_join(
            [
                row.get("taskType"),
                row.get("taskCategory"),
                row.get("status"),
                row.get("lastError"),
                row.get("resultNotes"),
                row.get("nextAction"),
                row.get("completionCriteria"),
            ]
        )
    )
    if "duplicate recipient" in text or "repeated professor" in text or "repeated supervisor" in text:
        return "Tell me whether to prepare a careful follow-up for your review, wait longer, close the outreach path, or use a different contact."
    if "document style qa" in text or "not approved for external send" in text or "minimal renderer" in text:
        return "Confirm whether I should regenerate the package from the approved Google Docs/template path, or close this package as not ready."
    if "attachment" in text and ("failed" in text or "blocked" in text or "incomplete" in text):
        return "Tell me whether to fix the package/attachments, prepare missing documents, or leave the email blocked."
    if "codex" in text or "outside apps script" in text or "waiting for codex worker" in text:
        return "Tell me whether Codex should do the judgement/writing/research work, whether another staff member should take it, or whether the task should be closed."
    if "follow" in text or "reply" in text or "waiting" in text:
        return "Tell me whether to follow up now, wait until a later date, close the application path, or review the reply trail first."
    if "approval" in text or "review" in text:
        return "Tell me to approve and continue, reject/close, reassign, or explain what you want changed."
    return "Tell me the decision you want, in normal language. I will translate it into the next staff task."


def human_task_options(row: dict[str, Any]) -> list[str]:
    text = normalize_text(compact_join([row.get("taskType"), row.get("status"), row.get("resultNotes"), row.get("nextAction")]))
    if "duplicate recipient" in text or "repeated professor" in text:
        return ["Prepare a reviewed follow-up", "Wait longer", "Close this outreach", "Use another contact"]
    if "style" in text or "template" in text or "minimal renderer" in text:
        return ["Regenerate with approved template", "Use existing Google Doc links only", "Close as not ready"]
    if "codex" in text or "outside apps script" in text:
        return ["Let Codex handle it", "Reassign to another AI staff", "Ask me a more specific question", "Close the task"]
    if "follow" in text:
        return ["Follow up now", "Wait and remind later", "Review reply trail", "Close this application path"]
    return ["Approve and continue", "Reassign", "Ask for more detail", "Close"]


def human_decision_brief(row: dict[str, Any], target_staff: str = "", source_staff: str = "") -> str:
    title = compact_join([row.get("nextAction") or row.get("taskType") or "Review this task"])
    problem = human_task_problem(row)
    need = human_task_exact_need(row)
    options = human_task_options(row)
    details = compact_join(
        [
            row.get("lastError"),
            row.get("resultNotes"),
            row.get("completionCriteria"),
        ],
        "\n",
    )
    lines = [
        f"**What happened**\n{problem}",
        f"**Related item**\n{task_context_label(row)}",
        f"**What I need from you**\n{need}",
        "**Your options**\n" + "\n".join(f"- {option}" for option in options),
        "**What I will do after your reply**\nI will route the next step to the correct AI staff, keep this thread open for you, and I will not send any email or submit anything just because you replied here.",
    ]
    if title:
        lines.insert(0, f"**Task**\n{title}")
    if details and normalize_text(details) not in normalize_text(problem + " " + need):
        lines.append(f"**System detail**\n{details}")
    return "\n\n".join(lines)


def manager_followup_brief(row: dict[str, Any], thread: sqlite3.Row | dict[str, Any] | None = None) -> str:
    title = compact_join([row.get("nextAction") or row.get("taskType") or "this task"]).rstrip(".")
    problem = human_task_problem(row)
    need = human_task_exact_need(row)
    context = task_context_label(row)
    options = human_task_options(row)[:3]
    option_text = ""
    need_norm = normalize_text(need)
    if options and "tell me whether" not in need_norm and "tell me to" not in need_norm:
        option_text = " A simple answer is enough, for example: " + "; ".join(options) + "."
    bits = []
    if title:
        bits.append(f"You are asking about {title}.")
    if context and context != "the current task":
        bits.append(f"It is related to {context}.")
    if problem:
        bits.append(problem)
    if need:
        bits.append(need)
    bits.append("I will not send any email or submit anything from this chat reply.")
    text = " ".join(bit.strip() for bit in bits if str(bit or "").strip())
    return text + option_text


def initial_thread_message(row: dict[str, Any], target_staff: str = "", source_staff: str = "") -> str:
    if is_human_responsible(source_staff):
        return str(
            row.get("nextAction")
            or row.get("message")
            or row.get("resultNotes")
            or "Message to Manager."
        ).strip()
    if is_human_responsible(target_staff) or task_category_for_signal(row) == TASK_CATEGORIES["human"]:
        return human_decision_brief(row, target_staff, source_staff)
    parts = []
    if row.get("nextAction"):
        parts.append(str(row.get("nextAction")).strip())
    details = row.get("lastError") or row.get("resultNotes") or row.get("completionCriteria") or ""
    if details:
        parts.append(str(details).strip())
    if row.get("sourceQueueId"):
        parts.append(f"Related email queue row: {row.get('sourceQueueId')}")
    parts.append("Internal instruction for the assigned AI staff. Iman does not need to reply unless the Manager escalates this thread.")
    return "\n\n".join(part for part in parts if part)


def manager_ack_for_human_task(row: dict[str, Any], target_staff: str = "") -> str:
    result = str(row.get("resultNotes") or "").strip()
    if result:
        return f"{result}\n\nI will keep this thread open here, so you can see updates and reply in the same place. No email was sent."
    if target_staff and normalized_staff_id(target_staff, "") != "AIstaff_Manager":
        return f"Received. I will coordinate this with {staff_label(target_staff)} and keep the answer in this thread. No email was sent."
    return "Received. I will review this request, route it to the right AI staff if needed, and keep the answer in this thread. No email was sent."


def thread_preview(text: Any, length: int = 180) -> str:
    clean = " ".join(str(text or "").split())
    if len(clean) <= length:
        return clean
    return clean[: max(0, length - 1)] + "..."


def message_signature(text: Any) -> str:
    return " ".join(str(text or "").split()).casefold()


def row_to_thread(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    data = dict(row)
    created = data.get("created_at")
    closed = data.get("closed_at")
    last_message = data.get("last_message_at")
    source_payload = data.get("source_payload") or "{}"
    try:
        source = json.loads(source_payload)
    except json.JSONDecodeError:
        source = {}
    return {
        "threadId": data.get("thread_id"),
        "taskId": data.get("task_id"),
        "entityId": data.get("entity_id"),
        "applicationId": data.get("application_id"),
        "opportunityId": data.get("opportunity_id"),
        "startedBy": data.get("started_by"),
        "responsible": data.get("responsible"),
        "responsibleLabel": staff_label(data.get("responsible")),
        "sourceStaff": data.get("source_staff"),
        "sourceStaffLabel": staff_label(data.get("source_staff") or data.get("responsible")),
        "actionStaff": thread_action_staff(data),
        "actionStaffLabel": staff_label(thread_action_staff(data)),
        "status": data.get("status"),
        "archived": bool(data.get("archived")),
        "createdAt": iso_like(created) if created else "",
        "closedAt": iso_like(closed) if closed else "",
        "lastMessageAt": iso_like(last_message) if last_message else "",
        "lastMessagePreview": data.get("last_message_preview") or "",
        "unreadFor": data.get("unread_for") or "None",
        "source": source,
    }


def row_to_message(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    data = dict(row)
    created = data.get("created_at")
    return {
        "messageId": data.get("message_id"),
        "threadId": data.get("thread_id"),
        "taskId": data.get("task_id"),
        "senderType": data.get("sender_type"),
        "senderId": data.get("sender_id"),
        "senderLabel": data.get("sender_label"),
        "body": data.get("body"),
        "language": data.get("language") or "natural",
        "createdAt": iso_like(created) if created else "",
        "readByHuman": bool(data.get("read_by_human")),
        "readByStaff": bool(data.get("read_by_staff")),
        "evidenceLink": data.get("evidence_link") or "",
    }


def thread_sync_payload(thread: dict[str, Any]) -> dict[str, Any]:
    return {
        "threadId": thread.get("threadId") or "",
        "taskId": thread.get("taskId") or "",
        "entityId": thread.get("entityId") or "",
        "applicationId": thread.get("applicationId") or "",
        "opportunityId": thread.get("opportunityId") or "",
        "startedBy": thread.get("startedBy") or thread.get("sourceStaff") or "",
        "responsible": thread.get("responsible") or "",
        "status": thread.get("status") or "Open",
        "createdAt": thread.get("createdAt") or "",
        "closedAt": thread.get("closedAt") or "",
        "archived": "TRUE" if thread.get("archived") else "FALSE",
        "lastMessageAt": thread.get("lastMessageAt") or "",
    }


def message_sync_payload(message: dict[str, Any]) -> dict[str, Any]:
    return {
        "messageId": message.get("messageId") or "",
        "threadId": message.get("threadId") or "",
        "taskId": message.get("taskId") or "",
        "senderType": message.get("senderType") or "",
        "senderId": message.get("senderId") or "",
        "senderLabel": message.get("senderLabel") or "",
        "body": message.get("body") or "",
        "language": message.get("language") or "natural",
        "createdAt": message.get("createdAt") or "",
        "readByHuman": "TRUE" if message.get("readByHuman") else "FALSE",
        "readByStaff": "TRUE" if message.get("readByStaff") else "FALSE",
        "evidenceLink": message.get("evidenceLink") or "",
    }


def wakeup_key(staff_id: str, thread_id: str, task_id: str) -> str:
    return "wakeup_" + safe_task_part(f"{staff_id}_{thread_id or task_id}").lower()


def row_to_wakeup(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    data = dict(row)
    return {
        "wakeupId": data.get("wakeup_id"),
        "staffId": data.get("staff_id"),
        "staffLabel": staff_label(data.get("staff_id")),
        "threadId": data.get("thread_id"),
        "taskId": data.get("task_id"),
        "reason": data.get("reason"),
        "status": data.get("status"),
        "runAfter": iso_like(data.get("run_after")) if data.get("run_after") else "",
        "createdAt": iso_like(data.get("created_at")) if data.get("created_at") else "",
        "lastPresentedAt": iso_like(data.get("last_presented_at")) if data.get("last_presented_at") else "",
        "completedAt": iso_like(data.get("completed_at")) if data.get("completed_at") else "",
        "result": data.get("result") or "",
    }


def cleanup_stale_staff_wakeups(conn: sqlite3.Connection) -> None:
    now = utc_ts()
    conn.execute(
        """
        UPDATE staff_wakeups
        SET status = 'Completed',
            completed_at = COALESCE(completed_at, ?),
            result = CASE
              WHEN result = '' THEN 'Auto-completed: linked thread is closed or archived.'
              ELSE result
            END
        WHERE status IN ('Queued', 'Presented')
          AND thread_id != ''
          AND NOT EXISTS (
            SELECT 1
            FROM task_threads t
            WHERE t.thread_id = staff_wakeups.thread_id
              AND t.status = 'Open'
              AND t.archived = 0
          )
        """,
        (now,),
    )


def queue_staff_wakeup(staff_id: str, thread_id: str, task_id: str, reason: str, run_after: float | None = None) -> dict[str, Any] | None:
    staff_id = normalized_staff_id(staff_id, "")
    if not staff_id or not staff_id.startswith("AIstaff_"):
        return None
    init_db()
    now = utc_ts()
    wakeup_id = wakeup_key(staff_id, thread_id, task_id)
    with connect() as conn:
        existing = conn.execute(
            "SELECT * FROM staff_wakeups WHERE wakeup_id = ?",
            (wakeup_id,),
        ).fetchone()
        if existing:
            if existing["status"] not in {"Queued", "Presented", "Running"}:
                conn.execute(
                    """
                    UPDATE staff_wakeups
                    SET status = 'Queued', reason = ?, run_after = ?, completed_at = NULL, result = ''
                    WHERE wakeup_id = ?
                    """,
                    (reason or existing["reason"] or "Task assigned.", run_after or now, wakeup_id),
                )
                existing = conn.execute("SELECT * FROM staff_wakeups WHERE wakeup_id = ?", (wakeup_id,)).fetchone()
            return row_to_wakeup(existing)
        existing = conn.execute(
            """
            SELECT * FROM staff_wakeups
            WHERE staff_id = ? AND thread_id = ? AND task_id = ? AND status IN ('Queued', 'Presented', 'Running')
            """,
            (staff_id, thread_id or "", task_id or ""),
        ).fetchone()
        if existing:
            return row_to_wakeup(existing)
        conn.execute(
            """
            INSERT INTO staff_wakeups (
              wakeup_id, staff_id, thread_id, task_id, reason, status, run_after, created_at
            )
            VALUES (?, ?, ?, ?, ?, 'Queued', ?, ?)
            """,
            (wakeup_id, staff_id, thread_id or "", task_id or "", reason or "Task assigned.", run_after or now, now),
        )
        row = conn.execute("SELECT * FROM staff_wakeups WHERE wakeup_id = ?", (wakeup_id,)).fetchone()
    return row_to_wakeup(row) if row else None


def staff_wakeup_summary() -> dict[str, Any]:
    init_db()
    with connect() as conn:
        cleanup_stale_staff_wakeups(conn)
        rows = conn.execute(
            """
            SELECT staff_id, COUNT(*) AS queued
            FROM staff_wakeups
            WHERE status IN ('Queued', 'Presented')
            GROUP BY staff_id
            """
        ).fetchall()
    by_staff = {}
    total = 0
    for row in rows:
        count = int(row["queued"] or 0)
        total += count
        by_staff[row["staff_id"]] = {"staffId": row["staff_id"], "label": staff_label(row["staff_id"]), "queued": count}
    return {"queued": total, "byStaff": by_staff}


def list_staff_wakeups(staff: str = "", status: str = "queued") -> dict[str, Any]:
    init_db()
    clauses = []
    params: list[Any] = []
    if staff:
        clauses.append("staff_id = ?")
        params.append(staff)
    if status and status.lower() != "all":
        if status.lower() == "queued":
            clauses.append("status IN ('Queued', 'Presented')")
        else:
            clauses.append("status = ?")
            params.append(status)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    with connect() as conn:
        cleanup_stale_staff_wakeups(conn)
        rows = conn.execute(
            f"SELECT * FROM staff_wakeups {where} ORDER BY run_after ASC, created_at ASC LIMIT 100",
            params,
        ).fetchall()
    return {"ok": True, "wakeups": [row_to_wakeup(row) for row in rows], "summary": staff_wakeup_summary()}


def next_staff_wakeup(staff: str = "") -> dict[str, Any] | None:
    init_db()
    params: list[Any] = [utc_ts()]
    staff_clause = ""
    if staff:
        staff_clause = "AND staff_id = ?"
        params.append(staff)
    with connect() as conn:
        cleanup_stale_staff_wakeups(conn)
        row = conn.execute(
            f"""
            SELECT * FROM staff_wakeups
            WHERE status IN ('Queued', 'Presented') AND run_after <= ?
            {staff_clause}
            ORDER BY run_after ASC, created_at ASC
            LIMIT 1
            """,
            params,
        ).fetchone()
        if not row:
            return None
        conn.execute(
            "UPDATE staff_wakeups SET status = 'Presented', last_presented_at = ? WHERE wakeup_id = ?",
            (utc_ts(), row["wakeup_id"]),
        )
        updated = conn.execute("SELECT * FROM staff_wakeups WHERE wakeup_id = ?", (row["wakeup_id"],)).fetchone()
    return row_to_wakeup(updated) if updated else None


def thread_summary_counts() -> dict[str, Any]:
    init_db()
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT source_staff, responsible, unread_for, source_payload
            FROM task_threads
            WHERE status = 'Open' AND archived = 0
            """
        ).fetchall()
    by_staff: dict[str, Any] = {}
    total = len(rows)
    human_facing = 0
    for row in rows:
        try:
            source = json.loads(row["source_payload"] or "{}")
        except json.JSONDecodeError:
            source = {}
        if source.get("sourceKind") != "System Audit" and (
            is_human_responsible(row["unread_for"])
            or is_human_responsible(row["responsible"])
            or is_human_responsible(row["source_staff"])
            or is_human_responsible(source.get("createdBy"))
            or is_human_responsible(source.get("sourceStaff"))
            or is_human_responsible(source.get("assignedTo"))
            or is_human_responsible(source.get("targetStaff"))
            or source.get("escalationLevel") == "Human"
        ):
            human_facing += 1
        staff_id = thread_action_staff(row)
        if not staff_id:
            continue
        by_staff[staff_id] = {
            "staffId": staff_id,
            "label": staff_label(staff_id),
            "open": int(by_staff.get(staff_id, {}).get("open") or 0) + 1,
        }
    return {"open": total, "humanFacingOpen": human_facing, "byStaff": by_staff}


def upsert_thread_for_task(row: dict[str, Any]) -> dict[str, Any] | None:
    task_id = row.get("taskId") or row.get("Task ID")
    if not task_id or not is_thread_task(row):
        return None
    thread_id = row.get("threadId") or row.get("ThreadID") or thread_id_for_task(task_id)
    now = utc_ts()
    source_staff, target_staff, routing_note = routed_thread_parties(row)
    source_payload = {
        "taskType": row.get("taskType") or "",
        "taskTemplateId": row.get("taskTemplateId") or row.get("templateId") or "",
        "taskCategory": row.get("taskCategory") or row.get("Task Category") or task_category_for_signal(row),
        "priority": row.get("priority") or "",
        "status": row.get("status") or "",
        "assignedTo": target_staff,
        "createdBy": row.get("createdBy") or source_staff,
        "runAfter": row.get("runAfter") or "",
        "dueAt": row.get("dueAt") or "",
        "deadline": row.get("deadline") or "",
        "nextAction": row.get("nextAction") or "",
        "completionCriteria": row.get("completionCriteria") or "",
        "successStatus": row.get("successStatus") or "",
        "failureStatus": row.get("failureStatus") or "",
        "lastError": row.get("lastError") or "",
        "evidenceLink": row.get("evidenceLink") or "",
        "resultNotes": row.get("resultNotes") or "",
        "sourceKind": row.get("sourceKind") or "",
        "sourceQueueId": row.get("sourceQueueId") or "",
        "sourceTaskId": row.get("sourceTaskId") or "",
        "sourceFollowUpId": row.get("sourceFollowUpId") or "",
        "targetStaff": target_staff,
        "sourceStaff": source_staff,
        "routingNote": routing_note,
        "escalationLevel": row.get("escalationLevel") or row.get("Escalation Level") or "",
        "learningCandidateId": row.get("learningCandidateId") or row.get("Learning Candidate ID") or "",
        "subject": row.get("subject") or row.get("Subject") or "",
        "recipientName": row.get("recipientName") or row.get("Recipient Name") or "",
        "to": row.get("to") or row.get("To") or "",
    }
    message_body = initial_thread_message(row, target_staff, source_staff)
    created_thread = False
    created_message: dict[str, Any] | None = None
    created_manager_message: dict[str, Any] | None = None
    with connect() as conn:
        existing = conn.execute("SELECT * FROM task_threads WHERE thread_id = ?", (thread_id,)).fetchone()
        if existing:
            existing_has_human_message = bool(
                conn.execute(
                    """
                    SELECT 1
                    FROM thread_messages
                    WHERE thread_id = ?
                      AND (sender_type = 'Human' OR sender_id IN ('Human_Iman', 'Human', 'Iman / Human'))
                    LIMIT 1
                    """,
                    (thread_id,),
                ).fetchone()
            )
            if existing_has_human_message:
                try:
                    existing_payload = json.loads(existing["source_payload"] or "{}")
                except json.JSONDecodeError:
                    existing_payload = {}
                if existing_payload and normalize_text(row.get("taskType")) == "thread reply":
                    source_payload = existing_payload
                source_payload["sourceStaff"] = "Human_Iman"
                source_payload["targetStaff"] = "AIstaff_Manager"
                source_payload["createdBy"] = source_payload.get("createdBy") or "Command Center"
                task_id = existing["task_id"] or task_id
                source_staff = "Human_Iman"
                target_staff = "AIstaff_Manager"
            conn.execute(
                """
                UPDATE task_threads
                SET task_id = ?, entity_id = ?, application_id = ?, opportunity_id = ?,
                    responsible = ?, source_staff = ?, source_payload = ?
                WHERE thread_id = ?
                """,
                (
                    task_id,
                    row.get("entityId") or "",
                    row.get("applicationId") or "",
                    row.get("opportunityId") or "",
                    target_staff,
                    source_staff,
                    json.dumps(source_payload, default=str),
                    thread_id,
                ),
            )
        else:
            created_thread = True
            conn.execute(
                """
                INSERT INTO task_threads (
                  thread_id, task_id, entity_id, application_id, opportunity_id,
                  started_by, responsible, source_staff, status, archived, created_at,
                  closed_at, last_message_at, last_message_preview, unread_for, source_payload
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open', 0, ?, NULL, ?, ?, ?, ?)
                """,
                (
                    thread_id,
                    task_id,
                    row.get("entityId") or "",
                    row.get("applicationId") or "",
                    row.get("opportunityId") or "",
                    row.get("createdBy") or source_staff,
                    target_staff,
                    source_staff,
                    now,
                    now,
                    thread_preview(message_body),
                    target_staff,
                    json.dumps(source_payload, default=str),
                ),
            )
        count = conn.execute("SELECT COUNT(*) AS c FROM thread_messages WHERE thread_id = ?", (thread_id,)).fetchone()["c"]
        if not count:
            message_id = "msg_" + str(uuid.uuid4())
            human_source = is_human_responsible(source_staff)
            message_sender_type = "Human" if human_source else "AI Staff"
            message_read_by_human = 1 if human_source else 0
            message_read_by_staff = 0 if human_source else 1
            created_message = {
                "messageId": message_id,
                "threadId": thread_id,
                "taskId": task_id,
                "senderType": message_sender_type,
                "senderId": source_staff,
                "senderLabel": staff_label(source_staff),
                "body": message_body,
                "language": "natural",
                "createdAt": iso_like(now),
                "readByHuman": bool(message_read_by_human),
                "readByStaff": bool(message_read_by_staff),
                "evidenceLink": row.get("evidenceLink") or "",
            }
            conn.execute(
                """
                INSERT INTO thread_messages (
                  message_id, thread_id, task_id, sender_type, sender_id, sender_label,
                  body, language, created_at, read_by_human, read_by_staff, evidence_link, metadata
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 'natural', ?, ?, ?, ?, ?)
                """,
                (
                    message_id,
                    thread_id,
                    task_id,
                    message_sender_type,
                    source_staff,
                    staff_label(source_staff),
                    message_body,
                    now,
                    message_read_by_human,
                    message_read_by_staff,
                    row.get("evidenceLink") or "",
                    json.dumps({"initial": True}, default=str),
                ),
            )
            if human_source and target_staff == "AIstaff_Manager":
                thread_for_ack = conn.execute("SELECT * FROM task_threads WHERE thread_id = ?", (thread_id,)).fetchone()
                if thread_for_ack:
                    created_manager_message = append_manager_reply(conn, thread_for_ack, manager_ack_for_human_task(row, target_staff))
        thread_row = conn.execute("SELECT * FROM task_threads WHERE thread_id = ?", (thread_id,)).fetchone()
    thread_obj = row_to_thread(thread_row) if thread_row else None
    if thread_obj:
        reason = routing_note or f"Task {task_id} assigned to {staff_label(target_staff)}."
        queue_staff_wakeup(target_staff, thread_id, task_id, reason)
    if thread_obj and created_thread:
        queue_action("appendAiStaffThread", thread_sync_payload(thread_obj), method="POST", apply_snapshot=False, sync_online=False)
    if created_message:
        queue_action("appendAiStaffThreadMessage", message_sync_payload(created_message), method="POST", apply_snapshot=False, sync_online=False)
    if created_manager_message:
        queue_action("appendAiStaffThreadMessage", message_sync_payload(created_manager_message), method="POST", apply_snapshot=False, sync_online=False)
    return thread_obj


def ensure_threads_for_tasks(payload: Dashboard) -> Dashboard:
    normalized = dict(payload or {})
    tasks = [dict(row) for row in normalized.get("tasks", []) or [] if isinstance(row, dict)]
    threads_by_task: dict[str, dict[str, Any]] = {}
    for row in tasks:
        thread = upsert_thread_for_task(row)
        if thread:
            threads_by_task[str(thread["taskId"])] = thread
    for row in tasks:
        task_id = str(row.get("taskId") or "")
        for legacy_key in ["ThreadID", "Thread Status", "Last Message At", "Last Message Preview", "Unread For", "Source Staff"]:
            row.pop(legacy_key, None)
        thread = threads_by_task.get(task_id)
        if not thread:
            continue
        row["threadId"] = thread["threadId"]
        row["threadStatus"] = thread["status"]
        row["lastMessageAt"] = thread["lastMessageAt"]
        row["lastMessagePreview"] = thread["lastMessagePreview"]
        row["unreadFor"] = thread["unreadFor"]
        row["sourceStaff"] = row.get("sourceStaff") or thread["sourceStaff"]
        row["targetStaff"] = row.get("targetStaff") or thread["responsible"]
        row["taskCategory"] = row.get("taskCategory") or (thread.get("source") or {}).get("taskCategory") or task_category_for_signal(row)
    normalized["tasks"] = tasks
    normalized["threadsSummary"] = thread_summary_counts()
    return normalized


def list_threads(staff: str = "", status: str = "open") -> dict[str, Any]:
    init_db()
    enforce_manager_human_gate()
    clauses = []
    params: list[Any] = []
    status_key = (status or "open").lower()
    if status_key == "open":
        clauses.append("status = 'Open'")
        clauses.append("archived = 0")
    elif status_key == "archived":
        clauses.append("(archived = 1 OR status = 'Archived')")
    elif status_key == "closed":
        clauses.append("status = 'Closed'")
    elif status_key != "all":
        clauses.append("status = ?")
        params.append(status)
    if staff:
        clauses.append(
            """
            (CASE
              WHEN unread_for IN ('Human', 'human', 'Iman / Human', 'Human_Iman') THEN 'Human_Iman'
              WHEN unread_for LIKE 'AIstaff_%' THEN unread_for
              WHEN responsible LIKE 'AIstaff_%' OR responsible = 'Human_Iman' THEN responsible
              ELSE source_staff
            END) = ?
            """
        )
        params.append(staff)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    with connect() as conn:
        rows = conn.execute(
            f"""
            SELECT * FROM task_threads
            {where}
            ORDER BY last_message_at DESC
            LIMIT 200
            """,
            params,
        ).fetchall()
    return {"ok": True, "threads": [row_to_thread(row) for row in rows], "summary": thread_summary_counts()}


def add_system_thread_message(
    conn: sqlite3.Connection,
    thread: sqlite3.Row | dict[str, Any],
    body: str,
    sender_id: str = "AIstaff_Manager",
    metadata: dict[str, Any] | None = None,
) -> str:
    now = utc_ts()
    message_id = "msg_" + str(uuid.uuid4())
    conn.execute(
        """
        INSERT INTO thread_messages (
          message_id, thread_id, task_id, sender_type, sender_id, sender_label,
          body, language, created_at, read_by_human, read_by_staff, evidence_link, metadata
        )
        VALUES (?, ?, ?, 'System', ?, ?, ?, 'natural', ?, 1, 0, '', ?)
        """,
        (
            message_id,
            thread["thread_id"],
            thread["task_id"],
            sender_id,
            staff_label(sender_id),
            body,
            now,
            json.dumps(metadata or {}, default=str),
        ),
    )
    conn.execute(
        """
        UPDATE task_threads
        SET last_message_at = ?, last_message_preview = ?
        WHERE thread_id = ?
        """,
        (now, thread_preview(body), thread["thread_id"]),
    )
    return message_id


def enforce_manager_human_gate() -> dict[str, Any]:
    init_db()
    fixed = 0
    wakeups: list[tuple[str, str, str, str]] = []
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT * FROM task_threads
            WHERE status = 'Open'
              AND archived = 0
              AND source_staff LIKE 'AIstaff_%'
              AND source_staff != 'AIstaff_Manager'
              AND (responsible = 'Human_Iman' OR unread_for IN ('Human', 'Human_Iman'))
            """
        ).fetchall()
        for row in rows:
            try:
                source = json.loads(row["source_payload"] or "{}")
            except json.JSONDecodeError:
                source = {}
            source["targetStaff"] = "AIstaff_Manager"
            source["routingNote"] = "Routed through AIstaff_Manager because specialist staff cannot contact Human_Iman directly."
            already = conn.execute(
                """
                SELECT COUNT(*) AS c FROM thread_messages
                WHERE thread_id = ? AND body LIKE '%Routed to AI Manager before Human%'
                """,
                (row["thread_id"],),
            ).fetchone()["c"]
            if not already:
                add_system_thread_message(
                    conn,
                    row,
                    "Routed to AI Manager before Human. Specialist staff should ask the Manager first; the Manager decides whether Iman needs to be contacted.",
                    metadata={"manager_gate": True},
                )
            conn.execute(
                """
                UPDATE task_threads
                SET responsible = 'AIstaff_Manager',
                    unread_for = 'AIstaff_Manager',
                    source_payload = ?
                WHERE thread_id = ?
                """,
                (json.dumps(source, default=str), row["thread_id"]),
            )
            wakeups.append(
                (
                    "AIstaff_Manager",
                    row["thread_id"],
                    row["task_id"],
                    "Specialist staff attempted to route a task/message to Human_Iman; Manager review is required first.",
                )
            )
            fixed += 1
    for staff_id, thread_id, task_id, reason in wakeups:
        queue_staff_wakeup(staff_id, thread_id, task_id, reason)
    return {"ok": True, "fixed": fixed}


def get_thread(thread_id: str) -> dict[str, Any]:
    init_db()
    with connect() as conn:
        thread = conn.execute("SELECT * FROM task_threads WHERE thread_id = ?", (thread_id,)).fetchone()
        if not thread:
            return {"ok": False, "error": f"Thread not found: {thread_id}"}
        messages = conn.execute(
            "SELECT * FROM thread_messages WHERE thread_id = ? ORDER BY created_at ASC",
            (thread_id,),
        ).fetchall()
    return {"ok": True, "thread": row_to_thread(thread), "messages": [row_to_message(row) for row in messages]}


def add_thread_message(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()
    thread_id = str(payload.get("threadId") or "").strip()
    body = str(payload.get("body") or "").strip()
    if not thread_id:
        return {"ok": False, "error": "Missing threadId."}
    if not body:
        return {"ok": False, "error": "Message body is empty."}
    sender_type = str(payload.get("senderType") or "Human").strip()
    sender_id = str(payload.get("senderId") or "Human_Iman").strip()
    sender_label = str(payload.get("senderLabel") or staff_label(sender_id)).strip()
    metadata = payload.get("metadata") or {}
    is_system_closed = bool(metadata.get("system") and metadata.get("closed"))
    now = utc_ts()
    message_id = "msg_" + str(uuid.uuid4())
    message_payload: dict[str, Any] | None = None
    with connect() as conn:
        thread = conn.execute("SELECT * FROM task_threads WHERE thread_id = ?", (thread_id,)).fetchone()
        if not thread:
            return {"ok": False, "error": f"Thread not found: {thread_id}"}
        is_human = normalize_text(sender_type).startswith("human") or is_human_responsible(sender_id)
        duplicate_window = now - 30
        recent_same_sender = conn.execute(
            """
            SELECT *
            FROM thread_messages
            WHERE thread_id = ?
              AND sender_id = ?
              AND created_at >= ?
            ORDER BY created_at DESC
            LIMIT 8
            """,
            (thread_id, sender_id, duplicate_window),
        ).fetchall()
        body_sig = message_signature(body)
        for recent in recent_same_sender:
            if message_signature(recent["body"]) == body_sig:
                detail = get_thread(thread_id)
                detail["duplicateIgnored"] = True
                detail["ignoredMessage"] = "Duplicate message ignored; Alex will not answer the same repeated text twice."
                return detail
        responsible = normalized_staff_id(thread["responsible"], "AIstaff_Manager")
        source_staff = normalized_staff_id(thread["source_staff"], "AIstaff_Manager")
        sender_staff = normalized_staff_id(sender_id, "")
        if is_human:
            unread_for = "AIstaff_Manager"
        elif sender_staff.startswith("AIstaff_") and sender_staff != "AIstaff_Manager":
            unread_for = "AIstaff_Manager"
        elif sender_staff == "AIstaff_Manager" and (is_human_decision_thread(thread) or is_human_responsible(source_staff)):
            unread_for = "Human_Iman"
        elif sender_staff == "AIstaff_Manager" and responsible and responsible != "AIstaff_Manager":
            unread_for = responsible
        elif sender_staff == "AIstaff_Manager":
            unread_for = "None"
        elif sender_staff == responsible:
            unread_for = source_staff if source_staff != responsible else "None"
        else:
            unread_for = responsible
        if is_system_closed:
            unread_for = "None"
        conn.execute(
            """
            INSERT INTO thread_messages (
              message_id, thread_id, task_id, sender_type, sender_id, sender_label,
              body, language, created_at, read_by_human, read_by_staff, evidence_link, metadata
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                message_id,
                thread_id,
                thread["task_id"],
                sender_type,
                sender_id,
                sender_label,
                body,
                payload.get("language") or "natural",
                now,
                1 if is_human or is_system_closed else 0,
                1 if (not is_human) or is_system_closed else 0,
                payload.get("evidenceLink") or "",
                json.dumps(metadata, default=str),
            ),
        )
        message_payload = {
            "messageId": message_id,
            "threadId": thread_id,
            "taskId": thread["task_id"],
            "senderType": sender_type,
            "senderId": sender_id,
            "senderLabel": sender_label,
            "body": body,
            "language": payload.get("language") or "natural",
            "createdAt": iso_like(now),
            "readByHuman": is_human or is_system_closed,
            "readByStaff": (not is_human) or is_system_closed,
            "evidenceLink": payload.get("evidenceLink") or "",
        }
        conn.execute(
            """
            UPDATE task_threads
            SET status = CASE WHEN status = 'Archived' THEN 'Open' ELSE status END,
                archived = 0,
                last_message_at = ?,
                last_message_preview = ?,
                unread_for = ?
            WHERE thread_id = ?
            """,
            (now, thread_preview(body), unread_for, thread_id),
        )
        updated = conn.execute("SELECT * FROM task_threads WHERE thread_id = ?", (thread_id,)).fetchone()
    queued_task = None
    auto_manager_reply = None
    thread_obj = row_to_thread(updated)
    queue_staff_wakeup(thread_obj.get("unreadFor") or "", thread_id, thread_obj.get("taskId") or "", f"New thread message from {sender_label}.")
    queue_action("appendAiStaffThread", thread_sync_payload(thread_obj), method="POST", apply_snapshot=False, sync_online=False)
    if message_payload:
        queue_action("appendAiStaffThreadMessage", message_sync_payload(message_payload), method="POST", apply_snapshot=False, sync_online=False)
    if is_human and thread_obj.get("unreadFor") == "AIstaff_Manager":
        auto_manager_reply = process_manager_auto_replies(limit=1, thread_id=thread_id)
    elif str(thread_obj.get("unreadFor") or "").startswith("AIstaff_"):
        queued_task = queue_thread_reply_wakeup(thread_obj, body, sender_id)
    detail = get_thread(thread_id)
    detail["queuedTask"] = queued_task
    detail["autoManagerReply"] = auto_manager_reply
    return detail


def queue_thread_reply_wakeup(thread: dict[str, Any], body: str, sender_id: str = "Human_Iman") -> dict[str, Any]:
    staff_id = "AIstaff_Manager" if is_human_responsible(sender_id) else normalized_staff_id(thread.get("unreadFor") or thread.get("responsible") or thread.get("sourceStaff"), "AIstaff_Manager")
    return queue_action(
        "appendAiStaffTask",
        {
            "taskType": "Thread Reply",
            "taskCategory": TASK_CATEGORIES["manager"] if staff_id == "AIstaff_Manager" else "Application Work",
            "taskTemplateId": "template_handle_human_thread_reply",
            "assignedTo": staff_id,
            "createdBy": normalized_staff_id(sender_id, "Human_Iman"),
            "sourceStaff": normalized_staff_id(sender_id, "Human_Iman"),
            "targetStaff": staff_id,
            "entityId": thread.get("entityId") or "",
            "relatedApplicationId": thread.get("applicationId") or "",
            "relatedOpportunityId": thread.get("opportunityId") or "",
            "priority": "High",
            "runAfter": iso_like(),
            "dueAt": iso_like(utc_ts() + 2 * 60 * 60),
            "nextAction": f"Review Iman's reply in {thread.get('threadId')} and continue the task safely.",
            "completionCriteria": "The reply is interpreted, the original task is updated, and the thread receives an AI staff response or is closed.",
            "successStatus": "Thread Reply Handled",
            "failureStatus": "Needs Human Review",
            "status": "Waiting for Codex Worker",
            "escalationLevel": "Normal",
            "evidenceLink": "",
            "resultNotes": thread_preview(body, 500),
            "threadId": thread.get("threadId"),
            "sourceTaskId": thread.get("taskId"),
        },
        method="POST",
        sync_online=False,
    )


def thread_text_blob(conn: sqlite3.Connection, thread_id: str, latest_body: str = "") -> str:
    rows = conn.execute(
        "SELECT body FROM thread_messages WHERE thread_id = ? ORDER BY created_at ASC",
        (thread_id,),
    ).fetchall()
    parts = [str(row["body"] or "") for row in rows]
    if latest_body:
        parts.append(str(latest_body))
    return "\n".join(parts)


def extract_opportunity_ids(text: str) -> list[str]:
    seen: set[str] = set()
    ids: list[str] = []
    for match in re.findall(r"\bopp_[A-Za-z0-9_]+\b", text or ""):
        if match not in seen:
            seen.add(match)
            ids.append(match)
    return ids


def full_process_task_exists(thread_id: str, task_id: str) -> bool:
    snapshot = load_dashboard_snapshot() or {}
    for task in snapshot.get("tasks", []) or []:
        if str(task.get("taskId") or "") == task_id:
            return True
        if str(task.get("sourceTaskId") or "") == task_id:
            return True
    with connect() as conn:
        existing = conn.execute(
            """
            SELECT 1
            FROM pending_actions
            WHERE action = 'appendAiStaffTask'
              AND payload LIKE ?
              AND status IN ('Queued', 'Error', 'Synced')
            LIMIT 1
            """,
            (f"%{task_id}%",),
        ).fetchone()
    return bool(existing)


def thread_has_full_process_context(thread_id: str, latest_body: str = "") -> bool:
    with connect() as conn:
        text = thread_text_blob(conn, thread_id, latest_body)
    return is_full_process_request(text)


def queue_full_process_followthrough(thread_id: str, latest_body: str = "") -> dict[str, Any]:
    init_db()
    task_id = "staff_task_full_process_fit_review_" + safe_task_part(thread_id)
    if full_process_task_exists(thread_id, task_id):
        return {"ok": True, "skipped": True, "reason": "Full-process follow-through task already exists.", "taskId": task_id}
    with connect() as conn:
        thread = conn.execute("SELECT * FROM task_threads WHERE thread_id = ?", (thread_id,)).fetchone()
        if not thread:
            return {"ok": False, "error": f"Thread not found: {thread_id}"}
        text = thread_text_blob(conn, thread_id, latest_body)
        opportunity_ids = extract_opportunity_ids(text)
    opp_text = ", ".join(opportunity_ids) if opportunity_ids else "the opportunities already discussed in this thread"
    return queue_action(
        "appendAiStaffTask",
        {
            "taskId": task_id,
            "taskType": "Fit Review",
            "taskCategory": "Research Work",
            "taskTemplateId": "template_full_process_after_opportunity_research",
            "assignedTo": "AIstaff_FitAnalyst",
            "createdBy": "AIstaff_Manager",
            "sourceStaff": "AIstaff_Manager",
            "targetStaff": "AIstaff_FitAnalyst",
            "entityId": row_value(thread, "entity_id") or "",
            "relatedApplicationId": row_value(thread, "application_id") or "",
            "relatedOpportunityId": row_value(thread, "opportunity_id") or "",
            "priority": "High",
            "runAfter": iso_like(),
            "dueAt": iso_like(utc_ts() + 4 * 60 * 60),
            "nextAction": (
                f"Continue Iman's full-process instruction for {opp_text}. Verify the opportunities exist in the workbook with official evidence, "
                "score fit, reject hard-ineligible or expired cases, create Application entities/tasks for viable cases, and route the best candidates "
                "to Application Pack Maker. Do not send emails or submit portals from this task."
            ),
            "completionCriteria": (
                "A prioritized shortlist is recorded, viable Application tasks are created for the next staff, and rejected or blocked cases have clear reasons."
            ),
            "successStatus": "Fit Shortlist Ready",
            "failureStatus": "Blocked - Fit Review Issue",
            "status": "Waiting for Codex Worker",
            "escalationLevel": "Normal",
            "evidenceLink": "",
            "resultNotes": "Created by Manager from Iman's instruction to run the department process through to submission-readiness.",
            "threadId": thread_id,
            "sourceTaskId": row_value(thread, "task_id") or "",
        },
        method="POST",
        sync_online=False,
    )


def inferred_task_for_staff(route_staff: str, fallback_type: str = "") -> tuple[str, str]:
    route_staff = normalized_staff_id(route_staff, "AIstaff_Manager")
    if route_staff == "AIstaff_OpportunityHunter":
        return fallback_type or "Research", TASK_CATEGORIES["research"]
    if route_staff == "AIstaff_FitAnalyst":
        return fallback_type or "Fit Review", TASK_CATEGORIES["research"]
    if route_staff == "AIstaff_ProfessorResearchAnalyst":
        return fallback_type or "Professor Research", TASK_CATEGORIES["research"]
    if route_staff == "AIstaff_ApplicationPackMaker":
        return fallback_type or "Package", TASK_CATEGORIES["application"]
    if route_staff == "AIstaff_ApplicationPackSender":
        return fallback_type or "Outreach", TASK_CATEGORIES["email"]
    if route_staff == "AIstaff_FollowUpController":
        return fallback_type or "Follow-up", TASK_CATEGORIES["audit"]
    if route_staff == "AIstaff_CRMController":
        return fallback_type or "CRM Health", TASK_CATEGORIES["audit"]
    return fallback_type or "Manager Guidance", TASK_CATEGORIES["manager"]


def manager_routed_task_should_create(decision: dict[str, Any]) -> bool:
    if decision.get("createFitReviewTask"):
        return False
    route_staff = normalized_staff_id(decision.get("routeStaff") or "", "")
    if route_staff in {"", "AIstaff_Manager", "Human_Iman"}:
        return False
    if decision.get("createRoutedTask") is True:
        return True
    intent = normalize_text(decision.get("intent"))
    return intent in {
        "research",
        "new_request",
        "find_opportunities",
        "continue_full_process",
        "fit_review",
        "package",
        "prepare_package",
        "send_review",
        "follow_up",
        "crm_health",
        "document_quality",
    }


def queue_manager_routed_task(
    thread: sqlite3.Row | dict[str, Any],
    human_body: str,
    decision: dict[str, Any],
    message_id: str = "",
) -> dict[str, Any]:
    route_staff = normalized_staff_id(decision.get("routeStaff") or "", "")
    if route_staff in {"", "AIstaff_Manager", "Human_Iman"}:
        return {"ok": True, "skipped": True, "reason": "No specialist route requested."}
    thread_id = str(row_value(thread, "thread_id") or row_value(thread, "threadId") or "")
    source_suffix = message_id or str(int(utc_ts()))
    task_id = "staff_task_manager_route_" + safe_task_part(route_staff) + "_" + safe_task_part(source_suffix)
    if local_or_pending_task_exists(task_id):
        return {"ok": True, "skipped": True, "reason": "Routed task already exists.", "taskId": task_id}
    task_type, category = inferred_task_for_staff(route_staff, str(decision.get("taskType") or ""))
    if decision.get("taskCategory"):
        category = str(decision.get("taskCategory"))
    routed_next_action = str(decision.get("routedNextAction") or "").strip()
    if not routed_next_action:
        routed_next_action = (
            f"Handle Iman's request from Manager thread {thread_id}: {thread_preview(human_body, 700)}. "
            "Report progress back to AIstaff_Manager. Do not contact Human_Iman directly."
        )
    payload = {
        "taskId": task_id,
        "taskType": task_type,
        "taskCategory": category,
        "taskTemplateId": "template_manager_intelligent_route",
        "assignedTo": route_staff,
        "createdBy": "AIstaff_Manager",
        "sourceStaff": "AIstaff_Manager",
        "targetStaff": route_staff,
        "entityId": row_value(thread, "entity_id") or row_value(thread, "entityId") or "",
        "relatedApplicationId": row_value(thread, "application_id") or row_value(thread, "applicationId") or "",
        "relatedOpportunityId": row_value(thread, "opportunity_id") or row_value(thread, "opportunityId") or "",
        "priority": "High",
        "runAfter": iso_like(),
        "dueAt": iso_like(utc_ts() + 4 * 60 * 60),
        "nextAction": routed_next_action,
        "completionCriteria": (
            "The assigned staff completes or blocks the request with evidence, then reports back to AIstaff_Manager in the task thread."
        ),
        "successStatus": f"{task_type} Done",
        "failureStatus": f"Blocked - {task_type} Issue",
        "status": "Waiting for Codex Worker",
        "escalationLevel": "Manager",
        "evidenceLink": thread_id,
        "resultNotes": str(decision.get("routedTaskReason") or decision.get("intent") or "Routed by Alex Manager Brain."),
        "threadId": thread_id,
        "sourceTaskId": row_value(thread, "task_id") or row_value(thread, "taskId") or "",
    }
    return queue_action("appendAiStaffTask", payload, method="POST", sync_online=False)


def recent_thread_message_context(thread_id: str, limit: int = 10) -> list[dict[str, str]]:
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT sender_label, sender_id, body, created_at
            FROM thread_messages
            WHERE thread_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (thread_id, max(1, int(limit or 10))),
        ).fetchall()
    messages: list[dict[str, str]] = []
    for row in reversed(rows):
        messages.append(
            {
                "sender": str(row["sender_label"] or row["sender_id"] or ""),
                "body": str(row["body"] or ""),
                "createdAt": iso_like(float(row["created_at"] or utc_ts())),
            }
        )
    return messages


def extract_response_text(response: dict[str, Any]) -> str:
    if isinstance(response.get("output_text"), str):
        return response["output_text"]
    chunks: list[str] = []
    for item in response.get("output") or []:
        if not isinstance(item, dict):
            continue
        for content in item.get("content") or []:
            if not isinstance(content, dict):
                continue
            text = content.get("text") or content.get("output_text")
            if isinstance(text, str):
                chunks.append(text)
    return "\n".join(chunks).strip()


def first_json_object(text: str) -> dict[str, Any]:
    raw = (text or "").strip()
    if not raw:
        return {}
    try:
        value = json.loads(raw)
        return value if isinstance(value, dict) else {}
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        return {}
    try:
        value = json.loads(match.group(0))
        return value if isinstance(value, dict) else {}
    except json.JSONDecodeError:
        return {}


def manager_ai_decision(thread: sqlite3.Row | dict[str, Any], human_body: str) -> dict[str, Any] | None:
    enabled = normalize_text(local_env_value("SWISS_PLANNER_MANAGER_AI_ENABLED", "true"))
    if enabled in {"0", "false", "off", "no"}:
        return None
    api_key = local_env_value("SWISS_PLANNER_OPENAI_API_KEY") or local_env_value("OPENAI_API_KEY")
    if not api_key:
        set_meta("manager_ai_last_status", "missing_api_key")
        return None
    model = local_env_value("SWISS_PLANNER_MANAGER_AI_MODEL", "gpt-5-mini")
    effort = local_env_value("SWISS_PLANNER_MANAGER_AI_REASONING_EFFORT", "minimal")
    source = source_payload_for_thread(thread)
    thread_id = str(row_value(thread, "thread_id") or row_value(thread, "threadId") or "")
    context = {
        "human_message": human_body,
        "thread": {
            "threadId": thread_id,
            "taskId": row_value(thread, "task_id") or row_value(thread, "taskId"),
            "responsible": row_value(thread, "responsible"),
            "sourceStaff": row_value(thread, "source_staff") or row_value(thread, "sourceStaff"),
            "unreadFor": row_value(thread, "unread_for") or row_value(thread, "unreadFor"),
            "lastMessagePreview": row_value(thread, "last_message_preview") or row_value(thread, "lastMessagePreview"),
        },
        "source_task": {
            "taskType": source.get("taskType") or source.get("Task Type") or "",
            "taskCategory": source.get("taskCategory") or source.get("Task Category") or "",
            "nextAction": source.get("nextAction") or source.get("Next Action") or "",
            "completionCriteria": source.get("completionCriteria") or source.get("Completion Criteria") or "",
            "successStatus": source.get("successStatus") or source.get("Success Status") or "",
            "failureStatus": source.get("failureStatus") or source.get("Failure Status") or "",
            "lastError": source.get("lastError") or source.get("Last Error") or "",
            "resultNotes": source.get("resultNotes") or source.get("Result Notes") or "",
            "status": source.get("status") or source.get("Status") or "",
            "applicationId": source.get("applicationId") or source.get("ApplicationID") or "",
            "opportunityId": source.get("opportunityId") or source.get("Opportunity ID") or "",
            "sourceQueueId": source.get("sourceQueueId") or source.get("queueId") or "",
        },
        "recent_messages": recent_thread_message_context(thread_id, limit=10) if thread_id else [],
        "capability_fabric": capability_fabric_manager_context(),
        "allowed_staff": [
            "AIstaff_Manager",
            "AIstaff_OpportunityHunter",
            "AIstaff_FitAnalyst",
            "AIstaff_ProfessorResearchAnalyst",
            "AIstaff_ApplicationPackMaker",
            "AIstaff_ApplicationPackSender",
            "AIstaff_FollowUpController",
            "AIstaff_CRMController",
            "Human_Iman",
        ],
    }
    instructions = (
        "You are Alex, AIstaff_Manager for Iman's Swiss Planner AI Staff system. Interpret Iman's latest thread reply intelligently and safely.\n"
        "Return only JSON with these keys: reply, intent, createRoutedTask, createFitReviewTask, routeStaff, taskType, taskCategory, routedNextAction, routedTaskReason, confidence.\n"
        "Rules:\n"
        "- Be concise and human. The reply is shown directly to Iman.\n"
        "- Use the full human-decision structure only for the first message that opens a new human-facing task thread.\n"
        "- For later replies inside an existing thread, sound like a short human answer: 1-4 sentences, directly answer Iman's latest message, and do not repeat 'What happened / What I need / Your options' unless Iman explicitly asks for a structured summary.\n"
        "- If a concrete human action is still needed in a later reply, ask one clear question or give 2 concise choices.\n"
        "- If Iman asks for clarification, explain the exact task in this thread using source_task fields. Do not give a generic Apps Script vs Codex lecture unless it is tied to the concrete task.\n"
        "- Route by the Capability Orchestration Fabric: Solution -> Capability -> Recipe -> Stage -> Lane -> Quality gate -> Output.\n"
        "- Staff are execution lanes/agents under capabilities; do not confuse a staff name with the business capability.\n"
        "- If Iman gives you work for the department, acknowledge it and route a concrete internal task to exactly one specialist staff.\n"
        "- Do not send email, submit portals, or claim that external action happened.\n"
        "- Non-manager staff communicate through you; only you talk to Human_Iman.\n"
        "- Do not close human-facing threads; Iman closes them.\n"
        "- Treat 'now' as a time word, never as 'no'.\n"
        "- Only treat a message as cancel/stop if it is clearly a stop instruction.\n"
        "- If Iman says he did not mean to cancel, correct course and continue.\n"
        "- New opportunity search -> routeStaff='AIstaff_OpportunityHunter', taskType='Research', taskCategory='Research Work'.\n"
        "- Fit/prioritization/eligibility -> routeStaff='AIstaff_FitAnalyst'.\n"
        "- Professor publication/research fit -> routeStaff='AIstaff_ProfessorResearchAnalyst'.\n"
        "- CV/SOP/proposal/package docs -> routeStaff='AIstaff_ApplicationPackMaker'.\n"
        "- Email/package sending review -> routeStaff='AIstaff_ApplicationPackSender'.\n"
        "- Replies/follow-ups -> routeStaff='AIstaff_FollowUpController'.\n"
        "- CRM/sync/audit/technical health -> routeStaff='AIstaff_CRMController' unless it is a Manager policy question.\n"
        "- If Iman asks to run the full process to submission after opportunity research, set intent='continue_full_process', createFitReviewTask=true, routeStaff='AIstaff_FitAnalyst'.\n"
        "- The endpoint is submission-readiness unless Iman explicitly changes portal/email autonomy.\n"
    )
    payload = {
        "model": model,
        "instructions": instructions,
        "input": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": json.dumps(context, ensure_ascii=False, default=str),
                    }
                ],
            }
        ],
        "max_output_tokens": 650,
    }
    if effort:
        payload["reasoning"] = {"effort": effort}
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")[:1200]
        set_meta("manager_ai_last_status", f"http_error_{exc.code}")
        set_meta("manager_ai_last_error", detail)
        return None
    except Exception as exc:
        set_meta("manager_ai_last_status", "error")
        set_meta("manager_ai_last_error", str(exc)[:1200])
        return None
    try:
        parsed_response = json.loads(raw)
    except json.JSONDecodeError:
        set_meta("manager_ai_last_status", "bad_response_json")
        return None
    decision = first_json_object(extract_response_text(parsed_response))
    reply = str(decision.get("reply") or "").strip()
    if not reply:
        set_meta("manager_ai_last_status", "empty_reply")
        return None
    set_meta("manager_ai_last_status", f"ok:{model}")
    return {
        "reply": reply,
        "intent": str(decision.get("intent") or "general"),
        "createRoutedTask": bool(decision.get("createRoutedTask")),
        "createFitReviewTask": bool(decision.get("createFitReviewTask")),
        "routeStaff": str(decision.get("routeStaff") or "AIstaff_Manager"),
        "taskType": str(decision.get("taskType") or ""),
        "taskCategory": str(decision.get("taskCategory") or ""),
        "routedNextAction": str(decision.get("routedNextAction") or ""),
        "routedTaskReason": str(decision.get("routedTaskReason") or ""),
        "confidence": decision.get("confidence"),
        "source": "openai",
    }


def manager_rule_reply_text(thread: sqlite3.Row | dict[str, Any], human_body: str) -> str:
    source = source_payload_for_thread(thread)
    task_type = source.get("taskType") or "task"
    category = source.get("taskCategory") or "Manager Guidance"
    next_action = source.get("nextAction") or source.get("resultNotes") or row_value(thread, "last_message_preview") or ""
    clean_action = " ".join(str(next_action or "").split())
    body_norm = normalize_text(human_body)
    if "what do you mean" in body_norm or "meaning" in body_norm or body_norm in {"?", "??", "???", "?????", "????"}:
        if "smoke" in normalize_text(clean_action) or "smoke" in normalize_text(source.get("resultNotes")):
            return (
                "You are right to ask. This is only a smoke-test / system-test thread, not a real application task. "
                "It was created to confirm that replies create Manager wake-ups correctly. There is no email to send and no university action needed here. "
                "You can close or archive this thread."
            )
        return (
            "You are right; the previous wording was too vague.\n\n"
            + manager_followup_brief(source, thread)
        )
    if "explain more" in body_norm or "which part" in body_norm or "outside appscript" in body_norm or "outside apps script" in body_norm:
        return (
            manager_followup_brief(source, thread)
            + " In short, Apps Script handles the Google-side operations; the outside part is judgement-heavy work such as strategy, writing quality, fit interpretation, or approving a risky send."
        )
    if is_full_process_request(body_norm):
        return (
            "Understood. This is not a cancel instruction. I will move these opportunities through the department process: Fit Analyst first, then package preparation and sender checks for the viable cases. "
            "The end point is submission-readiness; actual portal submission and external sending still follow the safety gates. I will keep this thread open so you can see updates here."
        )
    if is_false_cancel_correction(body_norm):
        return (
            "Corrected. I will not treat this as cancel. I will continue the department process from the opportunity results already in this thread and keep this conversation open for your final closure."
        )
    if is_approval_instruction(body_norm):
        return (
            "Understood. I will treat this as permission to continue only if the normal safety checks pass: package complete, attachment access verified, no duplicate-recipient risk, and clean email wording. "
            "Your chat reply itself did not send any email."
        )
    if is_cancel_instruction(body_norm):
        return (
            "Understood. I will treat this as a stop/cancel instruction for this thread unless you clarify otherwise. "
            "I will not send anything from this reply."
        )
    return (
        f"Got it. I will apply this to the {task_type.lower()} workflow and route the next step internally if a specialist is needed. "
        "No email is sent from this chat reply."
    )


def manager_auto_reply_decision(thread: sqlite3.Row | dict[str, Any], human_body: str) -> dict[str, Any]:
    ai = manager_ai_decision(thread, human_body)
    if ai:
        return ai
    fallback_route = "AIstaff_Manager"
    fallback_type = ""
    fallback_category = ""
    text = normalize_text(human_body)
    if is_full_process_request(human_body):
        fallback_route, fallback_type, fallback_category = "AIstaff_FitAnalyst", "Fit Review", TASK_CATEGORIES["research"]
    elif "find" in text or "opportunit" in text or "phd" in text or "msc" in text or "search" in text:
        fallback_route, fallback_type, fallback_category = "AIstaff_OpportunityHunter", "Research", TASK_CATEGORIES["research"]
    elif "proposal" in text or "cv" in text or "resume" in text or "sop" in text or "package" in text or "document" in text:
        fallback_route, fallback_type, fallback_category = "AIstaff_ApplicationPackMaker", "Package", TASK_CATEGORIES["application"]
    elif "send" in text or "email" in text or "outreach" in text:
        fallback_route, fallback_type, fallback_category = "AIstaff_ApplicationPackSender", "Outreach", TASK_CATEGORIES["email"]
    return {
        "reply": manager_rule_reply_text(thread, human_body),
        "intent": "fallback",
        "createRoutedTask": fallback_route != "AIstaff_Manager",
        "createFitReviewTask": is_full_process_request(human_body)
        or (is_false_cancel_correction(human_body) and thread_has_full_process_context(str(row_value(thread, "thread_id") or ""), human_body)),
        "routeStaff": fallback_route,
        "taskType": fallback_type,
        "taskCategory": fallback_category,
        "routedNextAction": "",
        "routedTaskReason": "Fallback Manager routing from natural-language request.",
        "confidence": None,
        "source": "rules",
    }


def manager_auto_reply_text(thread: sqlite3.Row | dict[str, Any], human_body: str) -> str:
    return manager_auto_reply_decision(thread, human_body)["reply"]


def append_manager_reply(conn: sqlite3.Connection, thread: sqlite3.Row | dict[str, Any], body: str) -> dict[str, Any]:
    now = utc_ts()
    message_id = "msg_" + str(uuid.uuid4())
    conn.execute(
        """
        INSERT INTO thread_messages (
          message_id, thread_id, task_id, sender_type, sender_id, sender_label,
          body, language, created_at, read_by_human, read_by_staff, evidence_link, metadata
        )
        VALUES (?, ?, ?, 'AI Staff', 'AIstaff_Manager', ?, ?, 'natural', ?, 0, 1, '', ?)
        """,
        (
            message_id,
            row_value(thread, "thread_id"),
            row_value(thread, "task_id"),
            staff_label("AIstaff_Manager"),
            body,
            now,
            json.dumps({"auto_manager_reply": True}, default=str),
        ),
    )
    conn.execute(
        """
        UPDATE task_threads
        SET last_message_at = ?,
            last_message_preview = ?,
            unread_for = 'Human_Iman'
        WHERE thread_id = ?
        """,
        (now, thread_preview(body), row_value(thread, "thread_id")),
    )
    conn.execute(
        """
        UPDATE staff_wakeups
        SET status = 'Completed',
            completed_at = ?,
            result = ?
        WHERE thread_id = ?
          AND staff_id = 'AIstaff_Manager'
          AND status IN ('Queued', 'Presented')
        """,
        (now, "Manager auto-replied in thread.", row_value(thread, "thread_id")),
    )
    return {
        "messageId": message_id,
        "threadId": row_value(thread, "thread_id"),
        "taskId": row_value(thread, "task_id"),
        "senderType": "AI Staff",
        "senderId": "AIstaff_Manager",
        "senderLabel": staff_label("AIstaff_Manager"),
        "body": body,
        "language": "natural",
        "createdAt": iso_like(now),
        "readByHuman": False,
        "readByStaff": True,
        "evidenceLink": "",
    }


def process_manager_auto_replies(limit: int = 10, thread_id: str = "") -> dict[str, Any]:
    init_db()
    processed = 0
    replies: list[dict[str, Any]] = []
    followthrough_threads: list[tuple[str, str]] = []
    route_requests: list[tuple[dict[str, Any], str, dict[str, Any], str]] = []
    routed_tasks: list[dict[str, Any]] = []
    with connect() as conn:
        params: list[Any] = []
        where = "t.status = 'Open' AND t.archived = 0 AND t.unread_for = 'AIstaff_Manager'"
        if thread_id:
            where += " AND t.thread_id = ?"
            params.append(thread_id)
        rows = conn.execute(
            f"""
            SELECT t.*
            FROM task_threads t
            WHERE {where}
            ORDER BY t.last_message_at ASC
            LIMIT ?
            """,
            [*params, max(1, int(limit or 10))],
        ).fetchall()
        for thread in rows:
            latest = conn.execute(
                """
                SELECT *
                FROM thread_messages
                WHERE thread_id = ?
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (thread["thread_id"],),
            ).fetchone()
            if not latest:
                continue
            if not (normalize_text(latest["sender_type"]).startswith("human") or is_human_responsible(latest["sender_id"])):
                continue
            decision = manager_auto_reply_decision(thread, latest["body"] or "")
            message = append_manager_reply(conn, thread, decision["reply"])
            replies.append(message)
            if manager_routed_task_should_create(decision):
                route_requests.append((dict(thread), latest["body"] or "", decision, latest["message_id"] or ""))
            if decision.get("createFitReviewTask") or is_full_process_request(latest["body"] or "") or (
                is_false_cancel_correction(latest["body"] or "") and is_full_process_request(thread_text_blob(conn, thread["thread_id"], latest["body"] or ""))
            ):
                followthrough_threads.append((thread["thread_id"], latest["body"] or ""))
            processed += 1
    followthrough: list[dict[str, Any]] = []
    for target_thread_id, body in followthrough_threads:
        followthrough.append(queue_full_process_followthrough(target_thread_id, body))
    for route_thread, body, decision, message_id in route_requests:
        routed_tasks.append(queue_manager_routed_task(route_thread, body, decision, message_id))
    for message in replies:
        queue_action("appendAiStaffThreadMessage", message_sync_payload(message), method="POST", apply_snapshot=False, sync_online=False)
    return {"ok": True, "processed": processed, "replies": replies, "followthrough": followthrough, "routedTasks": routed_tasks}


def process_manager_thread_now(thread_id: str) -> dict[str, Any]:
    init_db()
    with connect() as conn:
        thread = conn.execute("SELECT * FROM task_threads WHERE thread_id = ?", (thread_id,)).fetchone()
        if not thread:
            return {"ok": False, "error": f"Thread not found: {thread_id}"}
        latest = conn.execute(
            """
            SELECT *
            FROM thread_messages
            WHERE thread_id = ?
              AND (sender_type = 'Human' OR sender_id IN ('Human_Iman', 'Human', 'Iman / Human'))
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (thread_id,),
        ).fetchone()
        if not latest:
            return {"ok": False, "error": "No human message found for Manager interpretation."}
        thread_dict = dict(thread)
        latest_dict = dict(latest)
    decision = manager_auto_reply_decision(thread_dict, latest_dict.get("body") or "")
    with connect() as conn:
        fresh_thread = conn.execute("SELECT * FROM task_threads WHERE thread_id = ?", (thread_id,)).fetchone()
        if not fresh_thread:
            return {"ok": False, "error": f"Thread not found after decision: {thread_id}"}
        message = append_manager_reply(conn, fresh_thread, decision["reply"])
    routed = None
    if manager_routed_task_should_create(decision):
        routed = queue_manager_routed_task(thread_dict, latest_dict.get("body") or "", decision, latest_dict.get("message_id") or "")
    followthrough = None
    if decision.get("createFitReviewTask") or is_full_process_request(latest_dict.get("body") or ""):
        followthrough = queue_full_process_followthrough(thread_id, latest_dict.get("body") or "")
    queue_action("appendAiStaffThreadMessage", message_sync_payload(message), method="POST", apply_snapshot=False, sync_online=False)
    return {"ok": True, "processed": 1, "decision": decision, "reply": message, "routedTask": routed, "followthrough": followthrough}


def create_manager_request(payload: dict[str, Any]) -> dict[str, Any]:
    message = str(payload.get("message") or payload.get("nextAction") or "").strip()
    if not message:
        return {"ok": False, "error": "Missing message for Alex / AI Manager."}
    task_id = payload.get("taskId") or "staff_task_manager_request_" + str(uuid.uuid4())
    task_payload = {
        "taskId": task_id,
        "taskType": "Manager Guidance",
        "taskCategory": TASK_CATEGORIES["manager"],
        "taskTemplateId": "template_message_ai_manager",
        "assignedTo": "AIstaff_Manager",
        "createdBy": "Human_Iman",
        "sourceStaff": "Human_Iman",
        "targetStaff": "AIstaff_Manager",
        "entityId": payload.get("entityId") or "",
        "relatedApplicationId": payload.get("relatedApplicationId") or payload.get("applicationId") or "",
        "relatedOpportunityId": payload.get("relatedOpportunityId") or payload.get("opportunityId") or "",
        "priority": payload.get("priority") or "High",
        "runAfter": payload.get("runAfter") or iso_like(),
        "dueAt": payload.get("dueAt") or iso_like(utc_ts() + 2 * 60 * 60),
        "nextAction": message,
        "completionCriteria": "Alex interprets the request, replies in-thread, and routes specialist work if needed.",
        "successStatus": "Manager Request Routed",
        "failureStatus": "Blocked - Manager Routing",
        "status": "Queued",
        "resultNotes": "Human message to Alex Manager Brain. No email is sent from this task.",
    }
    saved = queue_action("appendAiStaffTask", task_payload, method="POST", sync_online=False)
    thread_id = thread_id_for_task(task_id)
    interpreted = process_manager_thread_now(thread_id)
    detail = get_thread(thread_id)
    return {"ok": bool(saved.get("ok")) and bool(interpreted.get("ok")), "saved": saved, "manager": interpreted, "thread": detail.get("thread"), "messages": detail.get("messages")}


def close_thread(
    thread_id: str,
    closed_by: str = "Human_Iman",
    reason: str = "",
    create_learning: bool = False,
    proposed_rule: str = "",
    staff_id: str = "",
) -> dict[str, Any]:
    init_db()
    now = utc_ts()
    with connect() as conn:
        existing = conn.execute("SELECT * FROM task_threads WHERE thread_id = ?", (thread_id,)).fetchone()
        if not existing:
            return {"ok": False, "error": f"Thread not found: {thread_id}"}
        conn.execute(
            "UPDATE task_threads SET status = 'Closed', archived = 0, closed_at = ?, unread_for = 'None' WHERE thread_id = ?",
            (now, thread_id),
        )
        conn.execute(
            """
            UPDATE staff_wakeups
            SET status = 'Completed',
                completed_at = ?,
                result = CASE
                  WHEN result = '' THEN 'Thread closed.'
                  ELSE result
                END
            WHERE thread_id = ?
              AND status IN ('Queued', 'Presented')
            """,
            (now, thread_id),
        )
    if reason:
        add_thread_message(
            {
                "threadId": thread_id,
                "senderType": "System",
                "senderId": closed_by,
                "senderLabel": staff_label(closed_by),
                "body": f"Thread closed. {reason}",
                "metadata": {"system": True, "closed": True},
            }
        )
        with connect() as conn:
            conn.execute(
                "UPDATE task_threads SET status = 'Closed', archived = 0, closed_at = ?, unread_for = 'None' WHERE thread_id = ?",
                (now, thread_id),
            )
    detail = get_thread(thread_id)
    detail["crmUpload"] = queue_closed_thread_to_crm(thread_id)
    if create_learning and proposed_rule:
        detail["learningCandidate"] = create_skill_update_candidate(
            {
                "sourceThreadId": thread_id,
                "staffId": staff_id or (detail.get("thread") or {}).get("responsible") or "AIstaff_Manager",
                "proposedRule": proposed_rule,
                "reason": reason or "Learning proposed when thread was closed.",
                "evidence": thread_id,
            }
        )
    return detail


def closed_task_payload_from_thread(thread: dict[str, Any], messages: list[dict[str, Any]]) -> dict[str, Any]:
    source = thread.get("source") or {}
    completed_at = thread.get("closedAt") or iso_like()
    transcript_preview = " | ".join(
        thread_preview(f"{message.get('senderLabel') or message.get('senderId')}: {message.get('body')}", 240)
        for message in messages[-5:]
    )
    return {
        "taskId": thread.get("taskId") or "",
        "createdAt": source.get("createdAt") or thread.get("createdAt") or "",
        "taskType": source.get("taskType") or "Task Thread",
        "taskTemplateId": source.get("taskTemplateId") or "",
        "taskCategory": source.get("taskCategory") or TASK_CATEGORIES["manager"],
        "assignedTo": thread.get("responsible") or source.get("assignedTo") or "",
        "createdBy": source.get("createdBy") or thread.get("sourceStaff") or "AIstaff_Manager",
        "sourceStaff": thread.get("sourceStaff") or source.get("sourceStaff") or "",
        "targetStaff": thread.get("responsible") or source.get("targetStaff") or "",
        "entityId": thread.get("entityId") or "",
        "relatedApplicationId": thread.get("applicationId") or "",
        "relatedOpportunityId": thread.get("opportunityId") or "",
        "priority": source.get("priority") or "Medium",
        "runAfter": source.get("runAfter") or "",
        "dueAt": source.get("dueAt") or "",
        "deadline": source.get("deadline") or "",
        "status": "Closed",
        "nextAction": source.get("nextAction") or thread.get("lastMessagePreview") or "Task thread closed locally.",
        "completionCriteria": source.get("completionCriteria") or "Thread was resolved or archived locally before CRM upload.",
        "successStatus": source.get("successStatus") or "Closed",
        "failureStatus": source.get("failureStatus") or "",
        "lastError": source.get("lastError") or "",
        "evidenceLink": source.get("evidenceLink") or "",
        "completedAt": completed_at,
        "resultNotes": thread_preview(
            f"Closed task-thread archive. ThreadID: {thread.get('threadId')}. Recent messages: {transcript_preview}",
            900,
        ),
        "threadId": thread.get("threadId") or "",
        "escalationLevel": source.get("escalationLevel") or "",
        "learningCandidateId": source.get("learningCandidateId") or "",
    }


def queue_closed_thread_to_crm(thread_id: str) -> dict[str, Any]:
    detail = get_thread(thread_id)
    if not detail.get("ok"):
        return detail
    thread = detail.get("thread") or {}
    messages = detail.get("messages") or []
    if thread.get("status") != "Closed":
        return {"ok": False, "error": "Thread is not closed; CRM upload is only queued after closure."}
    task_payload = closed_task_payload_from_thread(thread, messages)
    actions = [
        queue_action("appendAiStaffTask", task_payload, method="POST", apply_snapshot=False, sync_online=True),
        queue_action("appendAiStaffThread", thread_sync_payload(thread), method="POST", apply_snapshot=False, sync_online=True),
    ]
    for message in messages:
        actions.append(queue_action("appendAiStaffThreadMessage", message_sync_payload(message), method="POST", apply_snapshot=False, sync_online=True))
    return {
        "ok": True,
        "message": "Closed task thread queued for CRM upload.",
        "actionsQueued": len(actions),
        "taskId": thread.get("taskId"),
        "threadId": thread_id,
    }


def archive_thread(thread_id: str, archived: bool = True) -> dict[str, Any]:
    init_db()
    now = utc_ts()
    with connect() as conn:
        existing = conn.execute("SELECT * FROM task_threads WHERE thread_id = ?", (thread_id,)).fetchone()
        if not existing:
            return {"ok": False, "error": f"Thread not found: {thread_id}"}
        conn.execute(
            "UPDATE task_threads SET archived = ?, status = ? WHERE thread_id = ?",
            (1 if archived else 0, "Archived" if archived else "Open", thread_id),
        )
        if archived:
            conn.execute(
                """
                UPDATE staff_wakeups
                SET status = 'Completed',
                    completed_at = ?,
                    result = CASE
                      WHEN result = '' THEN 'Thread archived.'
                      ELSE result
                    END
                WHERE thread_id = ?
                  AND status IN ('Queued', 'Presented')
                """,
                (now, thread_id),
            )
        updated = conn.execute("SELECT * FROM task_threads WHERE thread_id = ?", (thread_id,)).fetchone()
    queue_action("appendAiStaffThread", thread_sync_payload(row_to_thread(updated)), method="POST", apply_snapshot=False, sync_online=False)
    return get_thread(thread_id)


def target_skill_file_for_staff(staff_id: str) -> Path:
    safe = safe_task_part(staff_id or "AIstaff_Manager")
    return STAFF_SKILL_DIR / "roles" / f"{safe}.md"


def department_skill_file() -> Path:
    return STAFF_SKILL_DIR / "SKILL.md"


def safe_skill_file(scope: str = "staff", staff_id: str = "") -> Path:
    requested_scope = str(scope or "staff").strip().lower()
    skill_root = STAFF_SKILL_DIR.resolve()
    if requested_scope == "department":
        target = department_skill_file().resolve()
        if target != (skill_root / "SKILL.md").resolve():
            raise ValueError("Invalid department skill file.")
        return target
    normalized = normalized_staff_id(staff_id or "AIstaff_Manager", "AIstaff_Manager")
    if normalized == "Human_Iman":
        raise ValueError("Human_Iman does not have an AI role skill file.")
    target = target_skill_file_for_staff(normalized).resolve()
    roles_dir = (skill_root / "roles").resolve()
    if roles_dir not in target.parents:
        raise ValueError("Invalid staff skill file path.")
    return target


def read_skill_file(scope: str = "staff", staff_id: str = "") -> dict[str, Any]:
    try:
        path = safe_skill_file(scope, staff_id)
    except ValueError as exc:
        return {"ok": False, "error": str(exc)}
    exists = path.exists()
    content = path.read_text(encoding="utf-8", errors="ignore") if exists else ""
    return {
        "ok": True,
        "scope": "department" if str(scope or "").lower() == "department" else "staff",
        "staffId": "" if str(scope or "").lower() == "department" else normalized_staff_id(staff_id or "AIstaff_Manager", "AIstaff_Manager"),
        "staffLabel": "" if str(scope or "").lower() == "department" else staff_label(staff_id or "AIstaff_Manager"),
        "path": str(path),
        "exists": exists,
        "content": content,
        "updatedAt": iso_like(path.stat().st_mtime) if exists else "",
    }


def required_skill_markers(scope: str = "staff", staff_id: str = "") -> list[str]:
    if str(scope or "").strip().lower() == "department":
        return [
            "# Swiss Planner Staff",
            "## Operating Model",
            "Routing rule:",
            "only `AIstaff_Manager` may create human-facing",
            "Never send an email merely because a thread received a reply.",
            "Only apply a learning after `Human_Iman` approves it.",
        ]
    return [
        "## Scope",
        "## Approved Learnings",
    ]


def validate_skill_content(scope: str = "staff", staff_id: str = "", content: str = "") -> dict[str, Any]:
    missing = [marker for marker in required_skill_markers(scope, staff_id) if marker not in content]
    if missing:
        return {
            "ok": False,
            "error": "Protected skill structure is missing: " + "; ".join(missing),
            "missing": missing,
        }
    return {"ok": True}


def write_skill_file(payload: dict[str, Any]) -> dict[str, Any]:
    scope = str(payload.get("scope") or "staff")
    staff_id = str(payload.get("staffId") or "")
    content = payload.get("content")
    if not isinstance(content, str):
        return {"ok": False, "error": "Missing skill file content."}
    validation = validate_skill_content(scope, staff_id, content)
    if not validation.get("ok"):
        return validation
    try:
        path = safe_skill_file(scope, staff_id)
    except ValueError as exc:
        return {"ok": False, "error": str(exc)}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.replace("\r\n", "\n"), encoding="utf-8")
    return read_skill_file(scope, staff_id)


def row_to_skill_update(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    data = dict(row)
    return {
        "learningId": data.get("learning_id"),
        "sourceThreadId": data.get("source_thread_id"),
        "staffId": data.get("staff_id"),
        "staffLabel": staff_label(data.get("staff_id")),
        "proposedRule": data.get("proposed_rule"),
        "reason": data.get("reason"),
        "evidence": data.get("evidence"),
        "status": data.get("status"),
        "approvedBy": data.get("approved_by"),
        "appliedAt": iso_like(data.get("applied_at")) if data.get("applied_at") else "",
        "targetSkillFile": data.get("target_skill_file"),
        "createdAt": iso_like(data.get("created_at")) if data.get("created_at") else "",
    }


def create_skill_update_candidate(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()
    learning_id = payload.get("learningId") or "learning_" + str(uuid.uuid4())
    staff_id = normalized_staff_id(payload.get("staffId") or payload.get("staff") or "AIstaff_Manager", "AIstaff_Manager")
    target = str(target_skill_file_for_staff(staff_id))
    now = utc_ts()
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO skill_updates (
              learning_id, source_thread_id, staff_id, proposed_rule, reason, evidence,
              status, approved_by, applied_at, target_skill_file, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'Pending', '', NULL, ?, ?)
            """,
            (
                learning_id,
                payload.get("sourceThreadId") or payload.get("threadId") or "",
                staff_id,
                payload.get("proposedRule") or payload.get("rule") or "",
                payload.get("reason") or "",
                payload.get("evidence") or payload.get("evidenceLink") or "",
                target,
                now,
            ),
        )
    queue_action(
        "appendAiStaffSkillUpdate",
        {
            "learningId": learning_id,
            "sourceThreadId": payload.get("sourceThreadId") or payload.get("threadId") or "",
            "staffId": staff_id,
            "proposedRule": payload.get("proposedRule") or payload.get("rule") or "",
            "reason": payload.get("reason") or "",
            "evidence": payload.get("evidence") or payload.get("evidenceLink") or "",
            "status": "Pending",
            "targetSkillFile": target,
        },
        method="POST",
    )
    return get_skill_update(learning_id)


def get_skill_update(learning_id: str) -> dict[str, Any]:
    with connect() as conn:
        row = conn.execute("SELECT * FROM skill_updates WHERE learning_id = ?", (learning_id,)).fetchone()
    if not row:
        return {"ok": False, "error": f"Learning candidate not found: {learning_id}"}
    return {"ok": True, "learning": row_to_skill_update(row)}


def list_skill_updates(status: str = "Pending") -> dict[str, Any]:
    init_db()
    params: list[Any] = []
    where = ""
    if status and status.lower() != "all":
        where = "WHERE status = ?"
        params.append(status)
    with connect() as conn:
        rows = conn.execute(
            f"SELECT * FROM skill_updates {where} ORDER BY created_at DESC LIMIT 100",
            params,
        ).fetchall()
    return {"ok": True, "learning": [row_to_skill_update(row) for row in rows]}


def approve_skill_update(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()
    learning_id = str(payload.get("learningId") or "").strip()
    if not learning_id:
        return {"ok": False, "error": "Missing learningId."}
    with connect() as conn:
        row = conn.execute("SELECT * FROM skill_updates WHERE learning_id = ?", (learning_id,)).fetchone()
    if not row:
        return {"ok": False, "error": f"Learning candidate not found: {learning_id}"}
    learning = row_to_skill_update(row)
    if learning["status"] == "Approved":
        return {"ok": True, "learning": learning, "message": "Learning was already approved."}
    target = Path(learning["targetSkillFile"] or str(target_skill_file_for_staff(learning["staffId"])))
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        target.write_text(f"# {staff_label(learning['staffId'])}\n\n## Approved Learnings\n", encoding="utf-8")
    text = target.read_text(encoding="utf-8", errors="ignore")
    if "## Approved Learnings" not in text:
        text = text.rstrip() + "\n\n## Approved Learnings\n"
    entry = (
        f"\n- {iso_like()} [{learning['learningId']}] {learning['proposedRule']}"
        f"\n  Evidence: {learning['evidence'] or learning['sourceThreadId']}\n"
    )
    if learning["learningId"] not in text:
        target.write_text(text.rstrip() + entry, encoding="utf-8")
    applied = utc_ts()
    approved_by = payload.get("approvedBy") or "Human_Iman"
    with connect() as conn:
        conn.execute(
            """
            UPDATE skill_updates
            SET status = 'Approved', approved_by = ?, applied_at = ?, target_skill_file = ?
            WHERE learning_id = ?
            """,
            (approved_by, applied, str(target), learning_id),
        )
    queue_action(
        "approveAiStaffSkillUpdate",
        {
            "learningId": learning_id,
            "approvedBy": approved_by,
            "appliedAt": iso_like(applied),
            "targetSkillFile": str(target),
        },
        method="POST",
    )
    return get_skill_update(learning_id)


def human_task_from_signal(row: dict[str, Any], source_kind: str, source_staff: str = "AIstaff_Manager") -> dict[str, Any]:
    queue_id = row.get("queueId") or row.get("Queue ID") or ""
    source_task_id = row.get("taskId") or row.get("Task ID") or ""
    source_followup_id = row.get("followUpId") or row.get("FollowUpID") or ""
    if queue_id:
        stable_source = "email"
        source_id = queue_id
        title = f"Review email: {row.get('recipientName') or row.get('Recipient Name') or row.get('to') or row.get('To') or source_id}"
    elif source_task_id:
        stable_source = "task"
        source_id = source_task_id
        title = f"Review task: {row.get('taskType') or row.get('Task Type') or source_id}"
    elif source_followup_id:
        stable_source = "followup"
        source_id = source_followup_id
        title = f"Review follow-up: {row.get('reason') or row.get('Reason') or source_id}"
    else:
        stable_source = source_kind
        source_id = row.get("title") or row.get("entityId") or row.get("applicationId") or "review"
        title = f"Review {source_kind}: {source_id}"
    if normalize_text(source_kind) == "system audit":
        category = TASK_CATEGORIES["audit"]
    else:
        category = task_category_for_signal(row, source_kind)
    assigned_to = assigned_staff_for_category(category, row, source_staff)
    task_prefix = "human_task" if assigned_to == "Human_Iman" else "staff_task_review"
    task = dict(row)
    task.update(
        {
            "taskId": row.get("humanTaskId") or row.get("reviewTaskId") or f"{task_prefix}_{safe_task_part(stable_source).lower()}_{safe_task_part(source_id)}",
            "taskType": category,
            "taskCategory": category,
            "taskTemplateId": "template_human_review_task" if assigned_to == "Human_Iman" else "template_manager_guidance_task",
            "assignedTo": assigned_to,
            "createdBy": source_staff,
            "sourceStaff": source_staff,
            "targetStaff": assigned_to,
            "escalationLevel": "Human" if assigned_to == "Human_Iman" else "Manager",
            "entityId": row.get("entityId") or row.get("EntityID") or "",
            "applicationId": row.get("applicationId") or row.get("ApplicationID") or row.get("Application ID") or "",
            "opportunityId": row.get("opportunityId") or row.get("Opportunity ID") or "",
            "priority": row.get("priority") or row.get("Priority") or "High",
            "status": row.get("status") or row.get("sendStatus") or row.get("approvalStatus") or "Needs Human Review",
            "runAfter": row.get("runAfter") or row.get("Run After") or row.get("createdAt") or row.get("Created At") or "",
            "dueAt": row.get("dueAt") or row.get("Due At") or row.get("followUpDate") or "",
            "deadline": row.get("deadline") or row.get("Deadline") or "",
            "nextAction": title,
            "completionCriteria": "AI Manager reviews the audit issue, fixes/reroutes it internally, or escalates to Iman only with a plain-language question." if category == TASK_CATEGORIES["audit"] else "Human decision is recorded and the source row is returned to the responsible staff or processed safely.",
            "lastError": row.get("lastError") or row.get("Last Error") or "",
            "evidenceLink": row.get("evidenceLink") or row.get("Evidence Link") or "",
            "resultNotes": row.get("resultNotes") or row.get("notes") or row.get("Notes") or row.get("subject") or row.get("Subject") or "",
            "sourceKind": source_kind,
            "sourceQueueId": queue_id,
            "sourceTaskId": source_task_id,
            "sourceFollowUpId": source_followup_id,
            "isHumanTask": assigned_to == "Human_Iman",
        }
    )
    return task


def normalize_task_table(payload: Dashboard) -> Dashboard:
    normalized = dict(payload or {})
    tasks = [dict(row) for row in normalized.get("tasks", []) or [] if isinstance(row, dict)]
    for row in tasks:
        source_kind = normalize_text(row.get("sourceKind") or row.get("Source Kind"))
        task_id = str(row.get("taskId") or row.get("Task ID") or "")
        if source_kind == "system audit" or task_id.startswith("human_task_system_audit_"):
            row["taskType"] = TASK_CATEGORIES["audit"]
            row["taskCategory"] = TASK_CATEGORIES["audit"]
            row["taskTemplateId"] = "template_manager_guidance_task"
            row["assignedTo"] = "AIstaff_Manager"
            row["sourceStaff"] = "AIstaff_Manager"
            row["targetStaff"] = "AIstaff_Manager"
            row["escalationLevel"] = "Manager"
            row["isHumanTask"] = False
            row["completionCriteria"] = "AI Manager reviews the audit issue, fixes/reroutes it internally, or escalates to Iman only with a plain-language question."
        row["taskCategory"] = row.get("taskCategory") or row.get("Task Category") or task_category_for_signal(row)
        row["sourceStaff"] = normalized_staff_id(row.get("sourceStaff") or row.get("createdBy"), "AIstaff_Manager")
        row["targetStaff"] = normalized_staff_id(row.get("targetStaff") or row.get("assignedTo"), "AIstaff_Manager")
    existing_ids = {row.get("taskId") for row in tasks if row.get("taskId")}
    review = normalized.get("managerReview") if isinstance(normalized.get("managerReview"), dict) else {}
    review_rows: list[dict[str, Any]] = []
    for row in review.get("tasks", []) or []:
        if isinstance(row, dict):
            review_rows.append(human_task_from_signal(row, "Task", normalized_staff_id(row.get("assignedTo"), "AIstaff_Manager")))
    for row in review.get("followUps", []) or []:
        if isinstance(row, dict):
            review_rows.append(human_task_from_signal(row, "System Audit", normalized_staff_id(row.get("staff"), "AIstaff_Manager")))
    for row in review.get("queue", []) or []:
        if isinstance(row, dict):
            review_rows.append(human_task_from_signal(row, "Email Queue", "AIstaff_ApplicationPackSender"))
    for row in review.get("auditIssues", []) or []:
        if isinstance(row, dict):
            review_rows.append(human_task_from_signal(row, "System Audit", "AIstaff_Manager"))
    for row in flatten_email_queue(normalized.get("emailQueue")):
        if has_human_signal(row):
            review_rows.append(human_task_from_signal(row, "Email Queue", "AIstaff_ApplicationPackSender"))
    for row in review_rows:
        task_id = row.get("taskId")
        if task_id and task_id not in existing_ids:
            tasks.insert(0, row)
            existing_ids.add(task_id)
    normalized["tasks"] = tasks
    summary = dict(normalized.get("summary") or {})
    summary["humanTasks"] = len([row for row in tasks if is_human_responsible(row.get("assignedTo")) and not task_is_terminal(row)])
    summary["openEscalations"] = len([row for row in tasks if row.get("taskCategory") in {TASK_CATEGORIES["human"], TASK_CATEGORIES["manager"], TASK_CATEGORIES["audit"], TASK_CATEGORIES["technical"], TASK_CATEGORIES["email"]} and not task_is_terminal(row)])
    normalized["summary"] = summary
    return normalized


def empty_dashboard(error: str = "") -> Dashboard:
    return {
        "ok": True,
        "refreshedAt": iso_like(),
        "workbookUrl": "",
        "summary": {
            "activeEntities": 0,
            "openTasks": 0,
            "dueTasks": 0,
            "waitingCodexWorker": 0,
            "overdueTasks": 0,
            "openFollowUps": 0,
            "dueFollowUps": 0,
            "overdueFollowUps": 0,
            "managerReview": 0,
            "openEscalations": 0,
            "sentToday": 0,
            "queuedEmails": 0,
            "blockedEmails": 0,
        },
        "staff": [],
        "managerReview": {"tasks": [], "followUps": [], "queue": [], "auditIssues": []},
        "tasks": [],
        "followUps": [],
        "applications": [],
        "emailQueue": {"queued": [], "sent": [], "blocked": [], "errors": []},
        "recentEvents": [],
        "recentRuns": [],
        "recentReports": [],
        "skillUpdates": [],
        "skillUpdatesAll": [],
        "staffWakeups": staff_wakeup_summary(),
        "localSync": local_status() | {"snapshotError": error},
        "capabilityFabric": load_capability_fabric(),
    }


def queue_action(action: str, payload: dict, method: str = "POST", apply_snapshot: bool = True, sync_online: bool = True) -> dict[str, Any]:
    action_id = "local_action_" + str(uuid.uuid4())
    now = utc_ts()
    if sync_online:
        with connect() as conn:
            conn.execute(
                """
                INSERT INTO pending_actions (id, action, payload, method, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, 'Queued', ?, ?)
                """,
                (action_id, action, json.dumps(payload or {}, default=str), method, now, now),
            )
    if apply_snapshot:
        apply_local_action_to_snapshot(action, payload or {}, action_id)
    if sync_online:
        message = "Saved locally and queued for the next Google Sheet sync."
    else:
        message = "Saved locally. It will be uploaded to the online CRM when its task thread is closed."
    return {"ok": True, "queuedLocal": True, "localOnly": not sync_online, "actionId": action_id, "message": message}


def queue_daily_codex_research_task(reason: str = "") -> dict[str, Any]:
    return queue_action(
        "appendAiStaffTask",
        {
            "taskType": "Research",
            "taskTemplateId": "template_daily_kpi_opportunity_research",
            "assignedTo": "AIstaff_OpportunityHunter",
            "createdBy": "Windows Daily Autopilot",
            "priority": "High",
            "runAfter": iso_like(),
            "dueAt": iso_like(utc_ts() + 2 * 60 * 60),
            "nextAction": (
                "Find 3 verified Switzerland energy-finance PhD opportunities from official university, "
                "doctoral school, funded project, professor, or institutional pages. Add evidence links and "
                "prepare the best candidates for Fit Analyst review."
            ),
            "completionCriteria": "At least 3 official-evidence Swiss finance/energy PhD leads are added or a blocker is recorded.",
            "successStatus": "Research Done",
            "failureStatus": "Blocked - Research Issue",
            "status": "Waiting for Codex Worker",
            "evidenceLink": "",
            "resultNotes": "Created by Windows Daily Autopilot as a Codex Worker research task.",
            "reason": reason,
        },
        method="POST",
        sync_online=False,
    )


def local_or_pending_task_exists(task_id: str) -> bool:
    target = str(task_id or "").strip()
    if not target:
        return False
    snapshot = load_dashboard_snapshot() or {}
    for task in snapshot.get("tasks", []) or []:
        if str(task.get("taskId") or task.get("Task ID") or "") == target:
            return True
    with connect() as conn:
        thread = conn.execute("SELECT 1 FROM task_threads WHERE task_id = ? LIMIT 1", (target,)).fetchone()
        if thread:
            return True
        pending = conn.execute(
            """
            SELECT 1
            FROM pending_actions
            WHERE action = 'appendAiStaffTask'
              AND payload LIKE ?
              AND status IN ('Queued', 'Error', 'Synced')
            LIMIT 1
            """,
            (f"%{target}%",),
        ).fetchone()
    return bool(pending)


def queue_document_quality_fix_tasks(limit: int = 3) -> dict[str, Any]:
    quality = document_quality_status()
    queued: list[dict[str, Any]] = []
    skipped: list[dict[str, Any]] = []
    for issue in (quality.get("issues") or [])[: max(1, int(limit or 3))]:
        app_id = issue.get("applicationId") or "unknown_application"
        task_id = "staff_task_document_style_qa_fix_" + safe_task_part(app_id)
        if local_or_pending_task_exists(task_id):
            skipped.append({"taskId": task_id, "reason": "Task already exists.", "issue": issue})
            continue
        result = queue_action(
            "appendAiStaffTask",
            {
                "taskId": task_id,
                "taskType": "Package QA",
                "taskCategory": TASK_CATEGORIES["application"],
                "taskTemplateId": "template_document_style_quality_fix",
                "assignedTo": "AIstaff_ApplicationPackMaker",
                "createdBy": "AIstaff_Manager",
                "sourceStaff": "AIstaff_Manager",
                "targetStaff": "AIstaff_ApplicationPackMaker",
                "relatedApplicationId": issue.get("applicationId") or "",
                "relatedOpportunityId": issue.get("opportunityId") or "",
                "priority": "High",
                "runAfter": iso_like(),
                "dueAt": iso_like(utc_ts() + 4 * 60 * 60),
                "nextAction": (
                    "Regenerate the application package from the approved Swiss Planner document templates/Google Docs path, "
                    "replace or mark the old minimal-renderer PDFs as not approved, and update package links before any send."
                ),
                "completionCriteria": (
                    "CV, proposal/concept note, and publication list are produced from the approved template path; "
                    "STYLE_QA_APPROVED.txt or manifest style_quality_status confirms external-send approval."
                ),
                "successStatus": "Package Template QA Passed",
                "failureStatus": "Blocked - Document Style QA",
                "status": "Waiting for Codex Worker",
                "evidenceLink": issue.get("path") or "",
                "resultNotes": issue.get("message") or "Document style QA blocked external send.",
            },
            method="POST",
            sync_online=False,
        )
        queued.append({"taskId": task_id, "result": result, "issue": issue})
    return {"ok": True, "queued": queued, "skipped": skipped, "documentQuality": quality}


def document_quality_needs_new_task() -> bool:
    for issue in document_quality_status().get("issues") or []:
        app_id = issue.get("applicationId") or "unknown_application"
        task_id = "staff_task_document_style_qa_fix_" + safe_task_part(app_id)
        if not local_or_pending_task_exists(task_id):
            return True
    return False


def should_request_manager_plan(snapshot: Dashboard | None, progress: dict[str, Any]) -> bool:
    if progress.get("planRequestDate") == local_day_key():
        return False
    due_work = summary_number(snapshot, "dueTasks") + summary_number(snapshot, "dueFollowUps")
    if due_work > 0:
        return False
    if summary_number(snapshot, "openEscalations") or summary_number(snapshot, "managerReview"):
        return False
    if has_waiting_codex_task(snapshot):
        return False
    if summary_number(snapshot, "waitingCodexWorker") > 0:
        return False
    return True


def queue_manager_plan_request(reason: str = "") -> dict[str, Any]:
    return queue_action(
        "appendAiStaffTask",
        {
            "taskType": "Planning",
            "taskCategory": "Human Decision",
            "taskTemplateId": "template_manager_plan_request_when_kpi_idle",
            "assignedTo": "Human_Iman",
            "createdBy": "AIstaff_Manager",
            "sourceStaff": "AIstaff_Manager",
            "targetStaff": "Human_Iman",
            "priority": "High",
            "runAfter": iso_like(),
            "dueAt": iso_like(utc_ts() + 24 * 60 * 60),
            "nextAction": (
                "The KPI cycle has no executable staff task, no waiting Codex work, and no active opportunity path. "
                "Please review the AI Staff KPIs table and tell the Manager what plan to follow next: continue Swiss "
                "energy/finance research, switch geography, prepare a specific application, pause sending, or change the KPI targets."
            ),
            "completionCriteria": "Human_Iman provides a clear next plan or KPI adjustment for AIstaff_Manager.",
            "successStatus": "Planning Direction Received",
            "failureStatus": "Needs Human Planning Direction",
            "status": "Queued",
            "resultNotes": (
                "Created by AIstaff_Manager because the daily KPI cycle became idle. "
                "The KPI table remains the base for deciding the next plan."
            ),
            "reason": reason,
        },
        method="POST",
        sync_online=False,
    )


def apply_local_action_to_snapshot(action: str, payload: dict, action_id: str) -> None:
    snapshot = load_dashboard_snapshot() or empty_dashboard()
    changed = False
    if action == "appendAiStaffTask":
        task = local_task_from_payload(payload, action_id)
        snapshot.setdefault("tasks", []).insert(0, task)
        snapshot.setdefault("summary", {})["openTasks"] = int(snapshot.get("summary", {}).get("openTasks") or 0) + 1
        changed = True
    elif action == "appendAiStaffDecision":
        report = local_decision_report_from_payload(payload, action_id)
        snapshot.setdefault("recentReports", []).insert(0, report)
        changed = True
    if changed:
        snapshot["refreshedAt"] = iso_like()
        save_dashboard_snapshot(snapshot, source="local")


def local_task_from_payload(payload: dict, action_id: str) -> dict[str, Any]:
    now = iso_like()
    task_id = payload.get("taskId") or "staff_task_local_" + action_id.replace("local_action_", "")
    task_type = payload.get("taskType") or "Task"
    next_action = payload.get("nextAction") or ""
    is_codex = task_needs_codex(payload)
    assigned_to = normalized_staff_id(payload.get("assignedTo") or "AIstaff_Manager", "AIstaff_Manager")
    source_staff = normalized_staff_id(payload.get("sourceStaff") or payload.get("createdBy") or "Command Center", "AIstaff_Manager")
    target_staff, routing_note = route_target_staff(source_staff, normalized_staff_id(payload.get("targetStaff") or assigned_to, assigned_to))
    category = payload.get("taskCategory") or task_category_for_signal(payload, task_type)
    return {
        "taskId": task_id,
        "taskType": task_type,
        "taskCategory": category,
        "templateId": payload.get("taskTemplateId") or "",
        "assignedTo": target_staff,
        "createdBy": payload.get("createdBy") or "Command Center",
        "sourceStaff": source_staff,
        "targetStaff": target_staff,
        "escalationLevel": payload.get("escalationLevel") or "",
        "learningCandidateId": payload.get("learningCandidateId") or "",
        "entityId": payload.get("entityId") or "",
        "applicationId": payload.get("relatedApplicationId") or payload.get("applicationId") or "",
        "opportunityId": payload.get("relatedOpportunityId") or payload.get("opportunityId") or "",
        "priority": payload.get("priority") or "High",
        "status": payload.get("status") or ("Waiting for Codex Worker" if is_codex else "Queued"),
        "runAfter": payload.get("runAfter") or now,
        "dueAt": payload.get("dueAt") or "",
        "deadline": payload.get("deadline") or "",
        "overdue": False,
        "nextAction": next_action,
        "completionCriteria": payload.get("completionCriteria") or "Task completed or blocked with clear result.",
        "successStatus": payload.get("successStatus") or "",
        "failureStatus": payload.get("failureStatus") or "",
        "lastError": "",
        "evidenceLink": payload.get("evidenceLink") or "",
        "threadId": payload.get("threadId") or "",
        "sourceTaskId": payload.get("sourceTaskId") or "",
        "resultNotes": payload.get("resultNotes") or routing_note or "Saved locally; will sync to Google Sheet when the task thread closes.",
    }


def task_needs_codex(payload: dict) -> bool:
    assigned = str(payload.get("assignedTo") or "").lower().replace("_", " ")
    if "human" in assigned or "iman" in assigned:
        return False
    text = " ".join(
        str(payload.get(key) or "")
        for key in ["taskType", "taskTemplateId", "nextAction", "completionCriteria"]
    ).lower()
    thinking_terms = [
        "research",
        "find ",
        "opportunit",
        "professor",
        "proposal",
        "write",
        "draft",
        "document",
        "cv",
        "resume",
        "sop",
        "package",
        "analy",
        "fit",
    ]
    manual_terms = ["duplicate recipient", "repeated professor", "manual send", "linkedin", "portal"]
    return any(term in text for term in thinking_terms) and not any(term in text for term in manual_terms)


def local_decision_report_from_payload(payload: dict, action_id: str) -> dict[str, Any]:
    return {
        "Report ID": "local_decision_" + action_id.replace("local_action_", ""),
        "Date": iso_like(),
        "Period": "Local Command Center",
        "Summary": payload.get("recommendation") or payload.get("decisionType") or "Manager decision recorded locally.",
        "KPI Progress": "",
        "Completed Work": "",
        "Blockers": "",
        "Approval Requests": payload.get("approvalStatus") or "",
        "Recommended Next Actions": payload.get("finalActionTaken") or payload.get("reason") or "",
    }


def sync_pending_actions(bridge_call: BridgeCall, max_actions: int = 25) -> dict[str, Any]:
    rows = []
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT * FROM pending_actions
            WHERE status IN ('Queued', 'Error')
            ORDER BY created_at ASC
            LIMIT ?
            """,
            (max_actions,),
        ).fetchall()
    synced = 0
    errors = 0
    for row in rows:
        result = bridge_call(row["action"], json.loads(row["payload"]), row["method"])
        ok = bool(result.get("ok"))
        with connect() as conn:
            conn.execute(
                """
                UPDATE pending_actions
                SET status = ?, attempts = attempts + 1, updated_at = ?, last_error = ?, result = ?
                WHERE id = ?
                """,
                (
                    "Synced" if ok else "Error",
                    utc_ts(),
                    "" if ok else str(result.get("error") or result.get("message") or "Sync failed"),
                    json.dumps(result, default=str)[:8000],
                    row["id"],
                ),
            )
        if ok:
            synced += 1
        else:
            errors += 1
    return {"synced": synced, "errors": errors, "processed": len(rows)}


def sync_from_sheet(bridge_call: BridgeCall, run_audit: bool = False) -> dict[str, Any]:
    pending = sync_pending_actions(bridge_call)
    dashboard = bridge_call("getAiStaffDashboard", {"limit": 80, "runAudit": "true" if run_audit else "false"}, "GET")
    if dashboard.get("ok") is False:
        error = str(dashboard.get("error") or dashboard.get("message") or "Dashboard sync failed")
        set_meta("last_sync_error", error)
        return {"ok": False, "pending": pending, "error": error}
    if isinstance(dashboard.get("result"), dict):
        dashboard = dashboard["result"]
    save_dashboard_snapshot(dashboard, source="bridge")
    set_meta("last_sheet_sync", iso_like())
    set_meta("last_sync_error", "")
    return {"ok": True, "pending": pending, "dashboard": True}


def summary_number(snapshot: Dashboard | None, key: str) -> int:
    try:
        return int((snapshot or {}).get("summary", {}).get(key) or 0)
    except (TypeError, ValueError):
        return 0


def has_waiting_codex_task(snapshot: Dashboard | None) -> bool:
    if summary_number(snapshot, "waitingCodexWorker") > 0:
        return True
    for task in (snapshot or {}).get("tasks", []) or []:
        text = " ".join(str(task.get(key) or "") for key in ["status", "resultNotes", "nextAction"]).lower()
        if "waiting for codex worker" in text or "outside apps script" in text:
            return True
    return False


def evaluate_daily_kpi_state(snapshot: Dashboard | None, progress: dict[str, Any]) -> dict[str, Any]:
    targets = autopilot_config()["dailyTargets"]
    due_work = summary_number(snapshot, "dueTasks") + summary_number(snapshot, "dueFollowUps")
    manager_review = summary_number(snapshot, "openEscalations") or summary_number(snapshot, "managerReview")
    waiting_codex = summary_number(snapshot, "waitingCodexWorker")
    pending = local_status().get("pendingActions", 0)
    document_quality = document_quality_status()
    checks = {
        "sheetSync": progress.get("sheetSyncs", 0) >= targets["sheetSyncs"],
        "crmHealth": progress.get("crmHealthChecks", 0) >= targets["crmHealthChecks"],
        "localDueWorkClear": due_work == 0,
        "pendingLocalActionsClear": pending == 0,
        "documentStyleQaClear": int(document_quality.get("issueCount") or 0) == 0,
    }
    if all(checks.values()) and manager_review == 0 and waiting_codex == 0:
        return {"state": "Completed", "reason": "Daily operational KPIs are complete and no local work is waiting.", "checks": checks}
    if manager_review > 0:
        return {"state": "Waiting for Human Review", "reason": f"{manager_review} item(s) need a human decision.", "checks": checks}
    if waiting_codex > 0:
        return {"state": "Waiting for Codex Worker", "reason": f"{waiting_codex} task(s) are queued for Codex research/writing.", "checks": checks}
    if int(document_quality.get("issueCount") or 0) > 0:
        return {"state": "Active", "reason": f"{document_quality.get('issueCount')} package document-style issue(s) need QA tasks.", "checks": checks}
    return {"state": "Active", "reason": "Daily KPIs are not complete yet.", "checks": checks}


def run_autopilot_cycle(bridge_call: BridgeCall, force: bool = False) -> dict[str, Any]:
    init_db()
    config = autopilot_config()
    progress = daily_progress()
    if not config["enabled"] and not force:
        result = {"ok": True, "state": "Paused", "action": "none", "progress": progress}
        record_worker_run("Autopilot", "Paused", "No action", result)
        return result

    snapshot = load_dashboard_snapshot()
    state = evaluate_daily_kpi_state(snapshot, progress)
    action = "none"
    result: Any = {}

    try:
        if force or progress.get("sheetSyncs", 0) < config["dailyTargets"]["sheetSyncs"] or not snapshot:
            action = "sync_from_sheet"
            result = sync_from_sheet(bridge_call, run_audit=False)
            if result.get("ok"):
                progress["sheetSyncs"] = int(progress.get("sheetSyncs", 0)) + 1
            snapshot = load_dashboard_snapshot()
        elif progress.get("crmHealthChecks", 0) < config["dailyTargets"]["crmHealthChecks"]:
            action = "crm_health"
            steps = []
            for bridge_action in ["syncSent", "syncInbound", "reconcileInboundReplies", "auditAiStaffProcessHealth"]:
                steps.append({"action": bridge_action, "response": bridge_call(bridge_action, {}, "POST")})
            result = {"ok": all(step["response"].get("ok") for step in steps), "steps": steps}
            progress["crmHealthChecks"] = int(progress.get("crmHealthChecks", 0)) + 1
            sync_from_sheet(bridge_call, run_audit=False)
            snapshot = load_dashboard_snapshot()
        elif document_quality_needs_new_task():
            action = "queue_document_quality_fix"
            result = queue_document_quality_fix_tasks(limit=3)
            snapshot = load_dashboard_snapshot()
        elif summary_number(snapshot, "dueTasks") + summary_number(snapshot, "dueFollowUps") > 0:
            action = "run_due_task"
            result = bridge_call("runAiStaffTaskRunner", {"maxItems": 1}, "POST")
            progress["runnerAttempts"] = int(progress.get("runnerAttempts", 0)) + 1
            processed = int((result.get("result") or result).get("processed") or 0) if isinstance(result, dict) else 0
            progress["tasksProcessed"] = int(progress.get("tasksProcessed", 0)) + processed
            sync_from_sheet(bridge_call, run_audit=False)
            snapshot = load_dashboard_snapshot()
        elif not has_waiting_codex_task(snapshot) and int(progress.get("codexTasksQueued", 0)) < config["dailyTargets"]["codexTasksQueuedWhenIdle"]:
            action = "queue_codex_research_task"
            result = queue_daily_codex_research_task("Daily KPI flow was idle without a Codex work item.")
            progress["codexTasksQueued"] = int(progress.get("codexTasksQueued", 0)) + 1
            snapshot = load_dashboard_snapshot()
        elif should_request_manager_plan(snapshot, progress):
            action = "request_human_plan"
            result = queue_manager_plan_request("Daily KPI cycle stopped with no executable task/opportunity path.")
            progress["managerPlanRequests"] = int(progress.get("managerPlanRequests", 0)) + 1
            progress["planRequestDate"] = local_day_key()
            snapshot = load_dashboard_snapshot()
        else:
            action = "monitor"
            result = {"ok": True, "message": state["reason"]}

        state = evaluate_daily_kpi_state(snapshot, progress)
        progress["state"] = state["state"]
        progress["reason"] = state["reason"]
        save_daily_progress(progress)
        record_worker_run("Autopilot", state["state"], action, result, state["reason"])
        return {"ok": True, "state": state["state"], "reason": state["reason"], "action": action, "result": result, "progress": progress}
    except Exception as exc:
        progress["state"] = "Error"
        progress["reason"] = str(exc)
        save_daily_progress(progress)
        record_worker_run("Autopilot", "Error", action, str(exc))
        return {"ok": False, "state": "Error", "action": action, "error": str(exc), "progress": progress}


def run_autopilot_until_blocked(bridge_call: BridgeCall, max_steps: int = 8) -> dict[str, Any]:
    """Run several safe KPI steps in sequence for the manual Run KPI Cycle button."""
    steps: list[dict[str, Any]] = []
    max_steps = max(1, min(int(max_steps or 8), 12))
    terminal_states = {"Completed", "Waiting for Human Review", "Waiting for Codex Worker", "Paused", "Error"}
    for index in range(max_steps):
        result = run_autopilot_cycle(bridge_call, force=(index == 0))
        steps.append(result)
        if not result.get("ok"):
            break
        state = str(result.get("state") or "")
        action = str(result.get("action") or "")
        if state in terminal_states:
            break
        if action in {"monitor", "request_human_plan", "queue_codex_research_task"}:
            break
        if action == "run_due_task":
            nested = result.get("result") if isinstance(result.get("result"), dict) else {}
            processed = int((nested.get("result") or nested).get("processed") or 0) if isinstance(nested, dict) else 0
            if processed <= 0:
                break
    last = steps[-1] if steps else {"ok": True, "state": "No Action", "reason": "No KPI cycle step ran."}
    record_worker_run("Autopilot", str(last.get("state") or "Cycle"), "run_until_blocked", {"steps": steps}, str(last.get("reason") or ""))
    return {
        "ok": all(step.get("ok") for step in steps) if steps else True,
        "state": last.get("state"),
        "reason": last.get("reason"),
        "stepsRun": len(steps),
        "steps": steps,
        "progress": daily_progress(),
    }


def start_hourly_sync(bridge_call: BridgeCall, interval_seconds: int = 3600) -> None:
    def worker() -> None:
        # Short startup delay lets the web server become responsive first.
        time.sleep(2)
        while True:
            try:
                sync_from_sheet(bridge_call, run_audit=False)
            except Exception as exc:
                set_meta("last_sync_error", str(exc))
            time.sleep(interval_seconds)

    thread = threading.Thread(target=worker, name="SwissPlannerSheetSync", daemon=True)
    thread.start()


def start_autopilot_loop(bridge_call: BridgeCall) -> None:
    def worker() -> None:
        time.sleep(8)
        while True:
            config = autopilot_config()
            try:
                run_autopilot_cycle(bridge_call, force=False)
            except Exception as exc:
                set_meta("autopilot_last_error", str(exc))
                record_worker_run("Autopilot", "Error", "cycle", str(exc))
            progress = daily_progress()
            sleep_for = config["intervalSeconds"]
            if progress.get("state") in ["Completed", "Waiting for Human Review", "Waiting for Codex Worker"]:
                sleep_for = max(sleep_for, 30 * 60)
            time.sleep(sleep_for)

    thread = threading.Thread(target=worker, name="SwissPlannerDailyAutopilot", daemon=True)
    thread.start()
