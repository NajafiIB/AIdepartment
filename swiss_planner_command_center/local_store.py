from __future__ import annotations

import base64
import io
import json
import os
import re
import shutil
import ssl
import sqlite3
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zipfile
from pathlib import Path
from typing import Any, Callable

try:
    from . import langgraph_orchestrator
except ImportError:  # pragma: no cover - direct script execution path.
    import langgraph_orchestrator  # type: ignore


Dashboard = dict[str, Any]
BridgeCall = Callable[[str | None, dict | None, str], dict]


DB_PATH = Path(
    os.environ.get("AI_DEPARTMENT_DB_PATH", "")
    or Path(__file__).resolve().parent / "swiss_planner_local.db"
).expanduser()
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
ROOT_DIR = Path(__file__).resolve().parent.parent
CAPABILITY_FABRIC_PATH = Path(__file__).resolve().parent / "capability_fabric.json"
TEST_WORKER_SCRIPT_PATH = Path(__file__).resolve().parent / "tools" / "local_test_worker.py"
STAFF_SKILL_DIR = Path(
    os.environ.get("SWISS_PLANNER_STAFF_SKILL_DIR", "")
    or ROOT_DIR / "skills" / "swiss-planner-staff"
)
LOCAL_ENV_PATH = ROOT_DIR / ".env.local"
BACKUP_DIR = ROOT_DIR / "backups"
LOCAL_WORKER_LOCK = threading.Lock()

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
    "email": "Outreach Safety",
    "application": "Tender Work",
    "research": "Research Work",
}

THREAD_REASON_LABELS = {
    "human_message": "Human/manager conversation",
    "approval": "Approval needed",
    "missing_input": "Missing input",
    "blocker": "Blocker",
    "review": "Review",
    "escalation": "Escalation",
    "worker_handoff": "Worker handoff",
    "system_audit": "System audit",
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
    "AIstaff_SEOManager": "Sofia",
    "AIstaff_SEOSourceAnalyst": "Tess",
    "AIstaff_SEOExpert": "Nora",
    "AIstaff_CaseStudyMapper": "Cora",
    "AIstaff_SEOContentWriter": "Hermes",
    "AIstaff_InternalLinkBuilder": "Iris",
    "AIstaff_SEOQAAnalyst": "Vera",
    "AIstaff_WordPressPublisher": "Priya",
}

FABRIC_COLLECTION_LABELS = {
    "solutionModules": "Department Solutions",
    "workspaces": "Workspaces",
    "departments": "Departments",
    "departmentTemplates": "Department Templates",
    "workspaceOverrides": "Workspace Overrides",
    "staffProfiles": "Staff Profiles",
    "staffArchetypes": "Predefined Staff Types",
    "platformSafetySkills": "Platform Safety Skills",
    "departmentSkills": "Department Skills",
    "staffTemplateSkills": "Staff Template Skills",
    "laneAdapterSkills": "Lane / Tool Adapter Skills",
    "compatibilityRules": "Compatibility Rules",
    "skillBindings": "Skill Bindings",
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
    "formSchemas": "Platform Admin Form Schemas",
    "enumSets": "Platform Admin Enum Sets",
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
            CREATE TABLE IF NOT EXISTS codex_work_items (
              work_item_id TEXT PRIMARY KEY,
              source_task_id TEXT NOT NULL DEFAULT '',
              thread_id TEXT NOT NULL DEFAULT '',
              assigned_staff TEXT NOT NULL DEFAULT '',
              skill_name TEXT NOT NULL DEFAULT '',
              title TEXT NOT NULL DEFAULT '',
              prompt TEXT NOT NULL DEFAULT '',
              context_json TEXT NOT NULL DEFAULT '{}',
              status TEXT NOT NULL DEFAULT 'Queued',
              priority TEXT NOT NULL DEFAULT 'Medium',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL,
              started_at REAL,
              completed_at REAL,
              result_summary TEXT NOT NULL DEFAULT '',
              evidence_link TEXT NOT NULL DEFAULT '',
              last_error TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS task_status_overrides (
              task_id TEXT PRIMARY KEY,
              status TEXT NOT NULL,
              result_notes TEXT NOT NULL DEFAULT '',
              evidence_link TEXT NOT NULL DEFAULT '',
              updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS project_plans (
              plan_id TEXT PRIMARY KEY,
              application_id TEXT NOT NULL DEFAULT '',
              opportunity_id TEXT NOT NULL DEFAULT '',
              title TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT 'Active',
              owner_staff TEXT NOT NULL DEFAULT 'AIstaff_Manager',
              current_step_id TEXT NOT NULL DEFAULT '',
              summary TEXT NOT NULL DEFAULT '',
              source_payload TEXT NOT NULL DEFAULT '{}',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS project_plan_steps (
              step_id TEXT PRIMARY KEY,
              plan_id TEXT NOT NULL,
              sequence INTEGER NOT NULL DEFAULT 0,
              stage TEXT NOT NULL DEFAULT '',
              title TEXT NOT NULL DEFAULT '',
              assigned_staff TEXT NOT NULL DEFAULT 'AIstaff_Manager',
              status TEXT NOT NULL DEFAULT 'Queued',
              blocker_type TEXT NOT NULL DEFAULT '',
              source_task_id TEXT NOT NULL DEFAULT '',
              source_thread_id TEXT NOT NULL DEFAULT '',
              queue_id TEXT NOT NULL DEFAULT '',
              due_at TEXT NOT NULL DEFAULT '',
              evidence_link TEXT NOT NULL DEFAULT '',
              notes TEXT NOT NULL DEFAULT '',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS project_step_outputs (
              output_id TEXT PRIMARY KEY,
              step_id TEXT NOT NULL,
              plan_id TEXT NOT NULL,
              application_id TEXT NOT NULL DEFAULT '',
              output_template_id TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT 'Draft',
              title TEXT NOT NULL DEFAULT '',
              summary TEXT NOT NULL DEFAULT '',
              content_json TEXT NOT NULL DEFAULT '{}',
              blocker_type TEXT NOT NULL DEFAULT '',
              evidence_link TEXT NOT NULL DEFAULT '',
              reviewed_by TEXT NOT NULL DEFAULT '',
              created_by TEXT NOT NULL DEFAULT 'AIstaff_Manager',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL,
              sent_to_alex_at REAL
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
            CREATE TABLE IF NOT EXISTS sender_identities (
              sender_id TEXT PRIMARY KEY,
              label TEXT NOT NULL,
              provider TEXT NOT NULL DEFAULT 'local',
              from_email TEXT NOT NULL DEFAULT '',
              reply_to TEXT NOT NULL DEFAULT '',
              approval_required INTEGER NOT NULL DEFAULT 1,
              status TEXT NOT NULL DEFAULT 'Draft',
              metadata TEXT NOT NULL DEFAULT '{}',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS outbound_attempts (
              attempt_id TEXT PRIMARY KEY,
              queue_id TEXT NOT NULL DEFAULT '',
              provider TEXT NOT NULL DEFAULT 'local',
              sender_id TEXT NOT NULL DEFAULT '',
              recipient TEXT NOT NULL DEFAULT '',
              subject TEXT NOT NULL DEFAULT '',
              approval_state TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT '',
              safety_json TEXT NOT NULL DEFAULT '{}',
              provider_metadata TEXT NOT NULL DEFAULT '{}',
              evidence_link TEXT NOT NULL DEFAULT '',
              created_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS communication_events (
              event_id TEXT PRIMARY KEY,
              queue_id TEXT NOT NULL DEFAULT '',
              thread_id TEXT NOT NULL DEFAULT '',
              direction TEXT NOT NULL DEFAULT '',
              provider TEXT NOT NULL DEFAULT 'local',
              sender_id TEXT NOT NULL DEFAULT '',
              recipient TEXT NOT NULL DEFAULT '',
              subject TEXT NOT NULL DEFAULT '',
              event_type TEXT NOT NULL DEFAULT '',
              approval_state TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT '',
              body_preview TEXT NOT NULL DEFAULT '',
              evidence_link TEXT NOT NULL DEFAULT '',
              metadata TEXT NOT NULL DEFAULT '{}',
              created_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS p4_installed_components (
              component_id TEXT PRIMARY KEY,
              department_id TEXT NOT NULL,
              component_type TEXT NOT NULL,
              catalog_id TEXT NOT NULL,
              version TEXT NOT NULL DEFAULT '1.0.0',
              status TEXT NOT NULL DEFAULT 'Active',
              source_payload TEXT NOT NULL DEFAULT '{}',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS p4_staff_assignments (
              assignment_id TEXT PRIMARY KEY,
              department_id TEXT NOT NULL,
              staff_profile_id TEXT NOT NULL,
              staff_blueprint_id TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'Active',
              source_payload TEXT NOT NULL DEFAULT '{}',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS p4_stage_assignments (
              assignment_id TEXT PRIMARY KEY,
              department_id TEXT NOT NULL,
              stage_template_id TEXT NOT NULL,
              staff_profile_id TEXT NOT NULL DEFAULT '',
              staff_blueprint_id TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT 'Active',
              source_payload TEXT NOT NULL DEFAULT '{}',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS p4_skill_assignments (
              assignment_id TEXT PRIMARY KEY,
              department_id TEXT NOT NULL,
              target_type TEXT NOT NULL,
              target_id TEXT NOT NULL,
              skill_pack_id TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'Active',
              source_payload TEXT NOT NULL DEFAULT '{}',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS p4_tool_data_contract_assignments (
              assignment_id TEXT PRIMARY KEY,
              department_id TEXT NOT NULL,
              target_type TEXT NOT NULL,
              target_id TEXT NOT NULL,
              contract_id TEXT NOT NULL,
              lane_id TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT 'Active',
              source_payload TEXT NOT NULL DEFAULT '{}',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS p4_readiness_state (
              readiness_id TEXT PRIMARY KEY,
              department_id TEXT NOT NULL,
              scope_type TEXT NOT NULL,
              scope_id TEXT NOT NULL,
              state TEXT NOT NULL,
              missing_requirements TEXT NOT NULL DEFAULT '[]',
              next_action TEXT NOT NULL DEFAULT '',
              checked_at REAL NOT NULL,
              source_payload TEXT NOT NULL DEFAULT '{}'
            );
            CREATE TABLE IF NOT EXISTS p4_provisioning_snapshots (
              snapshot_id TEXT PRIMARY KEY,
              department_id TEXT NOT NULL,
              stage_template_id TEXT NOT NULL DEFAULT '',
              staff_blueprint_id TEXT NOT NULL DEFAULT '',
              project_step_id TEXT NOT NULL DEFAULT '',
              thread_id TEXT NOT NULL DEFAULT '',
              work_item_id TEXT NOT NULL DEFAULT '',
              queue_id TEXT NOT NULL DEFAULT '',
              readiness_state TEXT NOT NULL DEFAULT '',
              payload TEXT NOT NULL,
              created_at REAL NOT NULL,
              created_by TEXT NOT NULL DEFAULT 'AIstaff_Manager'
            );
            CREATE TABLE IF NOT EXISTS p4_runtime_handlers (
              handler_id TEXT PRIMARY KEY,
              contract_id TEXT NOT NULL DEFAULT '',
              stage_template_id TEXT NOT NULL DEFAULT '',
              handler_type TEXT NOT NULL,
              handler_key TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'Active',
              source_payload TEXT NOT NULL DEFAULT '{}',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS orchestration_runs (
              run_id TEXT PRIMARY KEY,
              department_id TEXT NOT NULL DEFAULT '',
              organization_account_id TEXT NOT NULL DEFAULT '',
              goal_id TEXT NOT NULL DEFAULT '',
              project_step_id TEXT NOT NULL DEFAULT '',
              thread_id TEXT NOT NULL DEFAULT '',
              status TEXT NOT NULL DEFAULT 'Queued',
              current_node TEXT NOT NULL DEFAULT 'manager_intake',
              graph_name TEXT NOT NULL DEFAULT 'ai_department_langgraph_v1',
              state_json TEXT NOT NULL DEFAULT '{}',
              last_error TEXT NOT NULL DEFAULT '',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL,
              completed_at REAL,
              created_by TEXT NOT NULL DEFAULT 'AIstaff_Manager'
            );
            CREATE TABLE IF NOT EXISTS orchestration_events (
              event_id TEXT PRIMARY KEY,
              run_id TEXT NOT NULL,
              department_id TEXT NOT NULL DEFAULT '',
              event_type TEXT NOT NULL,
              node_name TEXT NOT NULL DEFAULT '',
              summary TEXT NOT NULL DEFAULT '',
              payload_json TEXT NOT NULL DEFAULT '{}',
              created_at REAL NOT NULL,
              created_by TEXT NOT NULL DEFAULT 'AIstaff_Manager'
            );
            CREATE TABLE IF NOT EXISTS seo_staff_profile_stage_overrides (
              department_id TEXT NOT NULL,
              staff_id TEXT NOT NULL,
              payload TEXT NOT NULL DEFAULT '[]',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL,
              updated_by TEXT NOT NULL DEFAULT 'Human_Iman',
              PRIMARY KEY (department_id, staff_id)
            );
            CREATE TABLE IF NOT EXISTS seo_staff_profile_settings (
              department_id TEXT NOT NULL,
              staff_id TEXT NOT NULL,
              payload TEXT NOT NULL DEFAULT '{}',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL,
              updated_by TEXT NOT NULL DEFAULT 'Human_Iman',
              PRIMARY KEY (department_id, staff_id)
            );
            CREATE TABLE IF NOT EXISTS seo_staff_profile_file_assets (
              asset_id TEXT PRIMARY KEY,
              department_id TEXT NOT NULL,
              staff_id TEXT NOT NULL,
              target_kind TEXT NOT NULL,
              file_name TEXT NOT NULL,
              content_type TEXT NOT NULL DEFAULT '',
              text_content TEXT NOT NULL DEFAULT '',
              source_payload TEXT NOT NULL DEFAULT '{}',
              created_at REAL NOT NULL,
              created_by TEXT NOT NULL DEFAULT 'Human_Iman'
            );
            CREATE TABLE IF NOT EXISTS activity_bindings (
              binding_id TEXT PRIMARY KEY,
              department_id TEXT NOT NULL DEFAULT '*',
              activity_name TEXT NOT NULL,
              label TEXT NOT NULL DEFAULT '',
              handler_type TEXT NOT NULL DEFAULT 'windmill',
              windmill_path TEXT NOT NULL DEFAULT '',
              approval_required INTEGER NOT NULL DEFAULT 1,
              dry_run_supported INTEGER NOT NULL DEFAULT 1,
              status TEXT NOT NULL DEFAULT 'Draft',
              source_payload TEXT NOT NULL DEFAULT '{}',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS activity_runs (
              activity_run_id TEXT PRIMARY KEY,
              department_id TEXT NOT NULL DEFAULT '',
              organization_account_id TEXT NOT NULL DEFAULT '',
              binding_id TEXT NOT NULL DEFAULT '',
              activity_name TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'Requested',
              approval_state TEXT NOT NULL DEFAULT 'Not Required',
              idempotency_key TEXT NOT NULL DEFAULT '',
              dry_run INTEGER NOT NULL DEFAULT 1,
              request_payload TEXT NOT NULL DEFAULT '{}',
              result_payload TEXT NOT NULL DEFAULT '{}',
              error TEXT NOT NULL DEFAULT '',
              windmill_job_id TEXT NOT NULL DEFAULT '',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL,
              requested_by TEXT NOT NULL DEFAULT 'AIstaff_Manager'
            );
            CREATE TABLE IF NOT EXISTS approval_tickets (
              approval_id TEXT PRIMARY KEY,
              activity_run_id TEXT NOT NULL DEFAULT '',
              department_id TEXT NOT NULL DEFAULT '',
              approval_type TEXT NOT NULL DEFAULT 'external_activity',
              status TEXT NOT NULL DEFAULT 'Pending',
              requested_by TEXT NOT NULL DEFAULT 'AIstaff_Manager',
              approved_by TEXT NOT NULL DEFAULT '',
              reason TEXT NOT NULL DEFAULT '',
              created_at REAL NOT NULL,
              updated_at REAL NOT NULL,
              resolved_at REAL
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
            CREATE INDEX IF NOT EXISTS idx_codex_work_items_status
              ON codex_work_items (status, assigned_staff, created_at);
            CREATE INDEX IF NOT EXISTS idx_codex_work_items_source
              ON codex_work_items (source_task_id, thread_id);
            CREATE INDEX IF NOT EXISTS idx_task_status_overrides_updated
              ON task_status_overrides (updated_at);
            CREATE INDEX IF NOT EXISTS idx_project_plans_application
              ON project_plans (application_id, status, updated_at);
            CREATE INDEX IF NOT EXISTS idx_project_plan_steps_plan
              ON project_plan_steps (plan_id, sequence, status);
            CREATE INDEX IF NOT EXISTS idx_project_step_outputs_step
              ON project_step_outputs (step_id, status, updated_at);
            CREATE INDEX IF NOT EXISTS idx_department_versions_object
              ON department_versions (object_type, object_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_backup_runs_created
              ON backup_runs (created_at);
            CREATE INDEX IF NOT EXISTS idx_outbound_attempts_queue
              ON outbound_attempts (queue_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_communication_events_queue
              ON communication_events (queue_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_p4_components_department
              ON p4_installed_components (department_id, component_type, status);
            CREATE INDEX IF NOT EXISTS idx_p4_staff_assignments_department
              ON p4_staff_assignments (department_id, status);
            CREATE INDEX IF NOT EXISTS idx_p4_stage_assignments_department
              ON p4_stage_assignments (department_id, status);
            CREATE INDEX IF NOT EXISTS idx_p4_readiness_department
              ON p4_readiness_state (department_id, state, checked_at);
            CREATE INDEX IF NOT EXISTS idx_p4_snapshots_refs
              ON p4_provisioning_snapshots (department_id, project_step_id, work_item_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_p4_handlers_status
              ON p4_runtime_handlers (handler_type, status);
            CREATE INDEX IF NOT EXISTS idx_orchestration_runs_department
              ON orchestration_runs (department_id, status, updated_at);
            CREATE INDEX IF NOT EXISTS idx_orchestration_events_run
              ON orchestration_events (run_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_activity_bindings_department
              ON activity_bindings (department_id, activity_name, status);
            CREATE INDEX IF NOT EXISTS idx_activity_runs_department
              ON activity_runs (department_id, status, updated_at);
            CREATE INDEX IF NOT EXISTS idx_activity_runs_idempotency
              ON activity_runs (idempotency_key);
            CREATE INDEX IF NOT EXISTS idx_approval_tickets_activity
              ON approval_tickets (activity_run_id, status);
            """
        )
    if not get_meta("autopilot_enabled"):
        set_meta("autopilot_enabled", "TRUE")
    elif get_meta("autopilot_enabled", "TRUE").upper() == "FALSE" and get_meta("autopilot_explicitly_paused", "FALSE").upper() != "TRUE":
        set_meta("autopilot_enabled", "TRUE")
    if not get_meta("autopilot_interval_seconds"):
        set_meta("autopilot_interval_seconds", "600")
    if not get_meta("local_worker_enabled"):
        set_meta("local_worker_enabled", "TRUE")
    ensure_default_sender_identity()
    ensure_default_activity_bindings()
    archive_legacy_activity_bindings()


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


def parse_json_text(raw: Any, fallback: Any) -> Any:
    if not raw:
        return json_clone(fallback)
    try:
        return json.loads(str(raw))
    except Exception:
        return json_clone(fallback)


def parse_json_meta(key: str, default: Any) -> Any:
    raw = get_meta(key, "")
    if not raw:
        return json_clone(default)
    try:
        return json.loads(raw)
    except Exception:
        return json_clone(default)


def field_access_for_key(key: str, row: dict[str, Any] | None = None) -> str:
    row = row or {}
    if row.get("locked") or key in {"id", "schemaVersion", "architecture", "templateId", "solutionModuleId"}:
        return "platform_locked"
    if key in {"status", "lifecycleStatus", "source_payload", "context_json", "createdAt", "updatedAt", "lastRun", "lastError"}:
        return "runtime_context"
    if key in {
        "companyDisplayName",
        "legalCompanyName",
        "vatOrTaxId",
        "commercialRegistrationNumber",
        "registeredAddress",
        "organizationDisplayName",
        "legalOrganizationName",
        "websiteUrl",
        "primaryDomain",
        "industrySector",
        "defaultLanguage",
        "approvedBrandTone",
        "defaultManagerTitle",
        "managerDisplayName",
        "managerTitle",
        "publicDescription",
        "approvedEmailSignature",
        "approvedSenderIdentities",
        "activeConnections",
        "approvedDatabases",
        "alias",
        "avatarUrl",
    }:
        return "workspace_editable"
    if row.get("workspaceEditable") is False:
        return "platform_locked"
    return "department_editable"


def attach_field_access(row: dict[str, Any], object_type: str = "") -> dict[str, Any]:
    decorated = json_clone(row or {})
    decorated["dtoType"] = object_type or decorated.get("dtoType") or "AiCatalogObject"
    decorated["fieldAccess"] = {key: field_access_for_key(key, decorated) for key in decorated.keys() if key != "fieldAccess"}
    if decorated["dtoType"] == "DepartmentBusinessIdentity":
        for key in DEPARTMENT_IDENTITY_FIELDS:
            if key in decorated["fieldAccess"]:
                decorated["fieldAccess"][key] = "department_editable"
        for key in {"updatedAt", "createdAt"}:
            if key in decorated["fieldAccess"]:
                decorated["fieldAccess"][key] = "runtime_context"
    decorated["accessSummary"] = (
        "platform_locked" if decorated.get("locked") or decorated.get("workspaceEditable") is False
        else "department_editable" if decorated["dtoType"] == "DepartmentBusinessIdentity"
        else "workspace_editable" if decorated.get("workspaceEditable") is True
        else "department_editable"
    )
    return decorated


PLATFORM_ADMIN_ENUM_OPTIONS = {
    "status": ["Draft", "Review", "Approved", "Active", "Deprecated", "Archived"],
    "lifecycleStatus": ["Draft", "Active", "Paused", "Deprecated", "Archived", "Sample"],
    "riskTier": ["Low", "Medium", "High"],
    "reasoningEffort": ["minimal", "low", "medium", "high"],
    "scope": ["platformSafety", "department", "staffTemplate", "laneAdapter"],
    "ownerLayer": ["platformAdmin", "workspaceSettings", "departmentExplorer", "runtime"],
    "communicationScope": ["human_to_manager", "manager_human_and_staff", "staff_to_manager_only"],
    "visibilityMode": ["ownedDepartment", "sponsoredAssignment"],
    "routeType": ["AI reasoning", "human-supervised AI worker", "external search", "database/writeback", "document storage", "email operation", "automation adapter", "local workflow", "local database", "tool/data contract"],
    "connectionStatus": ["Active", "Available", "Configured", "Needs Setup", "Test Failed", "Local", "Disabled", "Planned", "Draft"],
    "databaseStatus": ["Core", "Supporting", "Post-win", "Local", "Draft"],
    "confidence": ["Low", "Medium", "High"],
    "boolean": [True, False],
    "fieldType": ["text", "textarea", "boolean", "enum", "multiEnum", "reference", "multiReference", "tags", "childTable", "readonly", "advancedJson"],
    "formSection": ["Identity", "Ownership", "Composition", "Execution", "Data", "Governance", "Instructions", "Outputs", "Usage", "Stages", "General"],
}


def form_field(
    name: str,
    label: str,
    field_type: str = "text",
    *,
    required: bool = False,
    enum_key: str = "",
    reference_collection: str = "",
    default: Any = None,
    section: str = "General",
    help_text: str = "",
    editable: bool = True,
    fields: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    field = {
        "name": name,
        "label": label,
        "type": field_type,
        "required": required,
        "section": section,
        "editable": editable,
    }
    if enum_key:
        field["enumKey"] = enum_key
    if reference_collection:
        field["referenceCollection"] = reference_collection
    if default is not None:
        field["default"] = default
    if help_text:
        field["helpText"] = help_text
    if fields is not None:
        field["fields"] = fields
    return field


def friendly_label(value: str) -> str:
    text = re.sub(r"[_\-]+", " ", str(value or "")).strip()
    text = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", text)
    return text[:1].upper() + text[1:] if text else ""


def default_platform_admin_form_schemas() -> dict[str, Any]:
    scoped_skill_fields = [
        form_field("id", "ID", "text", required=True, section="Identity"),
        form_field("label", "Label", "text", required=True, section="Identity"),
        form_field("scope", "Scope", "enum", enum_key="scope", default="staffTemplate", section="Governance"),
        form_field("summary", "Summary", "textarea", required=True, section="Identity"),
        form_field("rules", "Rules", "tags", section="Instructions"),
        form_field("ownerLayer", "Owner Layer", "enum", enum_key="ownerLayer", default="platformAdmin", section="Governance"),
        form_field("compatibilityRules", "Compatibility Rules", "multiReference", reference_collection="compatibilityRules", section="Governance"),
        form_field("status", "Status", "enum", enum_key="status", default="Draft", section="Governance"),
        form_field("version", "Version", "text", default="0.1.0", section="Governance"),
        form_field("riskTier", "Risk Tier", "enum", enum_key="riskTier", default="Medium", section="Governance"),
        form_field("locked", "Locked", "boolean", section="Governance"),
        form_field("workspaceEditable", "Workspace Editable", "boolean", section="Governance"),
    ]
    schema_field_rows = [
        form_field("name", "Field Name", "text", required=True, section="Field"),
        form_field("label", "Field Label", "text", required=True, section="Field"),
        form_field("type", "Field Type", "enum", enum_key="fieldType", required=True, default="text", section="Field"),
        form_field("required", "Required", "boolean", section="Behavior"),
        form_field("editable", "Editable", "boolean", default=True, section="Behavior"),
        form_field("enumKey", "Enum Set", "reference", reference_collection="enumSets", section="Options"),
        form_field("referenceCollection", "Reference Table", "reference", reference_collection="formSchemas", section="Options"),
        form_field("default", "Default Value", "text", section="Behavior"),
        form_field("section", "Section", "enum", enum_key="formSection", default="General", section="Layout"),
        form_field("helpText", "Help Text", "textarea", section="Layout"),
        form_field("fields", "Child Fields", "childTable", section="Child Table", fields=[
            form_field("name", "Field Name", "text", required=True),
            form_field("label", "Field Label", "text", required=True),
            form_field("type", "Field Type", "enum", enum_key="fieldType", required=True, default="text"),
            form_field("required", "Required", "boolean"),
            form_field("editable", "Editable", "boolean", default=True),
            form_field("enumKey", "Enum Set", "reference", reference_collection="enumSets"),
            form_field("referenceCollection", "Reference Table", "reference", reference_collection="formSchemas"),
            form_field("default", "Default Value", "text"),
            form_field("section", "Section", "enum", enum_key="formSection"),
            form_field("helpText", "Help Text", "textarea"),
        ]),
    ]
    schemas = {
        "formSchemas": {
            "collection": "formSchemas",
            "label": "Form Schemas",
            "idPrefix": "schema",
            "fields": [
                form_field("id", "Schema ID", "text", required=True, section="Identity"),
                form_field("collection", "Target Collection", "text", required=True, section="Identity"),
                form_field("label", "Label", "text", required=True, section="Identity"),
                form_field("idPrefix", "ID Prefix", "text", section="Identity"),
                form_field("fields", "Fields", "childTable", section="Fields", fields=schema_field_rows),
                form_field("status", "Status", "enum", enum_key="status", default="Active", section="Governance"),
                form_field("locked", "Locked", "boolean", section="Governance"),
                form_field("workspaceEditable", "Workspace Editable", "boolean", default=True, section="Governance"),
            ],
        },
        "enumSets": {
            "collection": "enumSets",
            "label": "Enum Sets",
            "idPrefix": "enum",
            "fields": [
                form_field("id", "Enum Key", "text", required=True, section="Identity"),
                form_field("label", "Label", "text", required=True, section="Identity"),
                form_field("values", "Values", "tags", required=True, section="Values"),
                form_field("status", "Status", "enum", enum_key="status", default="Active", section="Governance"),
                form_field("locked", "Locked", "boolean", section="Governance"),
                form_field("workspaceEditable", "Workspace Editable", "boolean", default=True, section="Governance"),
            ],
        },
        "capabilities": {
            "collection": "capabilities",
            "label": "Capabilities",
            "idPrefix": "capability",
            "fields": [
                form_field("id", "ID", "text", required=True, section="Identity"),
                form_field("label", "Label", "text", required=True, section="Identity"),
                form_field("summary", "Summary", "textarea", section="Identity"),
                form_field("lifecycleStatus", "Lifecycle Status", "enum", enum_key="lifecycleStatus", default="Draft", section="Governance"),
                form_field("ownerStaff", "Owner Staff", "reference", reference_collection="staffProfiles", required=True, section="Ownership"),
                form_field("recipes", "Recipes", "multiReference", reference_collection="recipes", section="Execution"),
                form_field("requiredConnections", "Required Connections", "multiReference", reference_collection="connections", section="Execution"),
                form_field("recommendedConnections", "Recommended Connections", "multiReference", reference_collection="connections", section="Execution"),
                form_field("databases", "Databases", "multiReference", reference_collection="databases", section="Data"),
                form_field("aiSupport", "AI Support", "multiReference", reference_collection="aiSupport", section="Execution"),
                form_field("automations", "Automations", "multiReference", reference_collection="automations", section="Execution"),
                form_field("qualityGates", "Quality Gates", "multiReference", reference_collection="qualityGates", section="Governance"),
                form_field("outputs", "Outputs", "tags", section="Outputs"),
                form_field("confidence", "Confidence", "enum", enum_key="confidence", default="Medium", section="Governance"),
            ],
        },
        "recipes": {
            "collection": "recipes",
            "label": "Recipes",
            "idPrefix": "recipe",
            "fields": [
                form_field("id", "ID", "text", required=True, section="Identity"),
                form_field("capabilityId", "Capability", "reference", reference_collection="capabilities", required=True, section="Identity"),
                form_field("label", "Label", "text", required=True, section="Identity"),
                form_field("summary", "Summary", "textarea", section="Identity"),
                form_field("ownerStaff", "Owner Staff", "reference", reference_collection="staffProfiles", section="Ownership"),
                form_field("stages", "Stages", "childTable", section="Stages", fields=[
                    form_field("id", "Stage ID", "text", required=True),
                    form_field("label", "Stage Label", "text", required=True),
                    form_field("lanes", "Lanes", "multiReference", reference_collection="lanes"),
                    form_field("qualityGates", "Quality Gates", "multiReference", reference_collection="qualityGates"),
                    form_field("status", "Status", "enum", enum_key="status"),
                    form_field("outputs", "Outputs", "tags"),
                ]),
                form_field("outputs", "Outputs", "tags", section="Outputs"),
            ],
        },
        "lanes": {
            "collection": "lanes",
            "label": "Lane Adapters",
            "idPrefix": "lane",
            "fields": [
                form_field("id", "ID", "text", required=True, section="Identity"),
                form_field("label", "Label", "text", required=True, section="Identity"),
                form_field("routeType", "Route Type", "enum", enum_key="routeType", section="Identity"),
                form_field("ownerStaff", "Owner Staff", "reference", reference_collection="staffProfiles", section="Ownership"),
                form_field("connections", "Connections", "multiReference", reference_collection="connections", section="Execution"),
                form_field("databases", "Databases", "multiReference", reference_collection="databases", section="Data"),
                form_field("aiSupport", "AI Support", "multiReference", reference_collection="aiSupport", section="Execution"),
                form_field("qualityGates", "Quality Gates", "multiReference", reference_collection="qualityGates", section="Governance"),
                form_field("status", "Status", "enum", enum_key="status", default="Draft", section="Governance"),
                form_field("version", "Version", "text", default="0.1.0", section="Governance"),
                form_field("locked", "Locked", "boolean", section="Governance"),
                form_field("workspaceEditable", "Workspace Editable", "boolean", section="Governance"),
            ],
        },
        "connections": {
            "collection": "connections",
            "label": "Connections",
            "idPrefix": "connection",
            "fields": [
                form_field("id", "ID", "text", required=True, section="Identity"),
                form_field("label", "Label", "text", required=True, section="Identity"),
                form_field("status", "Status", "enum", enum_key="connectionStatus", section="Governance"),
                form_field("type", "Type", "text", section="Identity"),
                form_field("requiredFor", "Required For", "multiReference", reference_collection="capabilities", section="Usage"),
                form_field("setupFields", "Setup Fields Needed", "tags", section="Configuration"),
                form_field("accountLabel", "Account / Workspace Label", "text", section="Configuration"),
                form_field("propertyId", "Property / Project ID", "text", section="Configuration"),
                form_field("siteUrl", "Site URL", "text", section="Configuration"),
                form_field("webhookUrl", "Webhook / Endpoint URL", "text", section="Configuration"),
                form_field("configurationNotes", "Configuration Notes", "textarea", section="Configuration"),
                form_field("lastTestStatus", "Last Test Status", "readonly", section="Test"),
                form_field("lastTestAt", "Last Tested At", "readonly", section="Test"),
                form_field("lastTestMessage", "Last Test Message", "readonly", section="Test"),
            ],
        },
        "databases": {
            "collection": "databases",
            "label": "Databases",
            "idPrefix": "db",
            "fields": [
                form_field("id", "ID", "text", required=True, section="Identity"),
                form_field("label", "Label", "text", required=True, section="Identity"),
                form_field("status", "Status", "enum", enum_key="databaseStatus", section="Governance"),
                form_field("type", "Type", "text", section="Identity"),
                form_field("key", "Key Field", "text", section="Data"),
            ],
        },
        "aiSupport": {
            "collection": "aiSupport",
            "label": "AI Support",
            "idPrefix": "ai",
            "fields": [
                form_field("id", "ID", "text", required=True, section="Identity"),
                form_field("label", "Label", "text", required=True, section="Identity"),
                form_field("model", "Model", "text", section="Execution"),
                form_field("reasoningEffort", "Reasoning Effort", "enum", enum_key="reasoningEffort", section="Execution"),
                form_field("ownerStaff", "Owner Staff", "reference", reference_collection="staffProfiles", section="Ownership"),
                form_field("usage", "Usage", "textarea", section="Execution"),
            ],
        },
        "qualityGates": {
            "collection": "qualityGates",
            "label": "Quality Gates",
            "idPrefix": "gate",
            "fields": [
                form_field("id", "ID", "text", required=True, section="Identity"),
                form_field("label", "Label", "text", required=True, section="Identity"),
                form_field("rule", "Rule", "textarea", required=True, section="Governance"),
                form_field("status", "Status", "enum", enum_key="status", section="Governance"),
            ],
        },
        "automations": {
            "collection": "automations",
            "label": "Automations",
            "idPrefix": "automation",
            "fields": [
                form_field("id", "ID", "text", required=True, section="Identity"),
                form_field("label", "Label", "text", required=True, section="Identity"),
                form_field("status", "Status", "enum", enum_key="status", section="Governance"),
                form_field("capabilities", "Capabilities", "multiReference", reference_collection="capabilities", section="Usage"),
            ],
        },
        "compatibilityRules": {
            "collection": "compatibilityRules",
            "label": "Compatibility Rules",
            "idPrefix": "compatibility",
            "fields": [
                form_field("id", "ID", "text", required=True, section="Identity"),
                form_field("label", "Label", "text", required=True, section="Identity"),
                form_field("summary", "Summary", "textarea", required=True, section="Identity"),
                form_field("status", "Status", "enum", enum_key="status", section="Governance"),
                form_field("ownerLayer", "Owner Layer", "enum", enum_key="ownerLayer", section="Governance"),
                form_field("locked", "Locked", "boolean", section="Governance"),
                form_field("workspaceEditable", "Workspace Editable", "boolean", section="Governance"),
            ],
        },
        "platformSafetySkills": {
            "collection": "platformSafetySkills",
            "label": "Platform Safety Skills",
            "idPrefix": "platform_skill",
            "fields": [
                {**field, "default": "platformSafety"} if field["name"] == "scope" else field
                for field in scoped_skill_fields
            ],
        },
        "departmentSkills": {
            "collection": "departmentSkills",
            "label": "Department Skills",
            "idPrefix": "department_skill",
            "fields": [
                {**field, "default": "department"} if field["name"] == "scope" else field
                for field in scoped_skill_fields
            ],
        },
        "staffTemplateSkills": {
            "collection": "staffTemplateSkills",
            "label": "Staff Skill Packs",
            "idPrefix": "staff_skill",
            "fields": scoped_skill_fields,
        },
        "laneAdapterSkills": {
            "collection": "laneAdapterSkills",
            "label": "Lane Adapter Skills",
            "idPrefix": "lane_skill",
            "fields": [
                {**field, "default": "laneAdapter"} if field["name"] == "scope" else field
                for field in scoped_skill_fields
            ],
        },
        "departmentTemplates": {
            "collection": "departmentTemplates",
            "label": "Department Packages",
            "idPrefix": "template",
            "fields": [
                form_field("id", "ID", "text", required=True, section="Identity"),
                form_field("label", "Label", "text", required=True, section="Identity"),
                form_field("purpose", "Purpose", "textarea", required=True, section="Identity"),
                form_field("solutionModuleId", "Solution Module", "text", section="Identity"),
                form_field("capabilities", "Capabilities", "multiReference", reference_collection="capabilities", section="Composition"),
                form_field("staffProfiles", "Staff Profiles", "multiReference", reference_collection="staffProfiles", section="Composition"),
                form_field("ownershipModes", "Ownership Modes", "multiEnum", enum_key="visibilityMode", section="Governance"),
                form_field("projectTypes", "Project Types", "tags", section="Composition"),
                form_field("communicationModel", "Communication Model", "textarea", section="Governance"),
                form_field("templateFamilies", "Template Families", "tags", section="Composition"),
                form_field("status", "Status", "enum", enum_key="status", section="Governance"),
                form_field("locked", "Locked", "boolean", section="Governance"),
                form_field("workspaceEditable", "Workspace Editable", "boolean", section="Governance"),
            ],
        },
        "staffArchetypes": {
            "collection": "staffArchetypes",
            "label": "Staff Blueprints",
            "idPrefix": "archetype",
            "fields": [
                form_field("id", "ID", "text", required=True, section="Identity"),
                form_field("label", "Label", "text", required=True, section="Identity"),
                form_field("purpose", "Purpose", "textarea", section="Identity"),
                form_field("preferredModel", "Preferred Model", "text", section="Execution"),
                form_field("allowedPluginFamilies", "Allowed Plugin Families", "tags", section="Execution"),
                form_field("requiresApprovalFor", "Requires Approval For", "tags", section="Governance"),
                form_field("outputContract", "Output Contract", "tags", section="Outputs"),
                form_field("stopConditions", "Stop Conditions", "tags", section="Governance"),
                form_field("status", "Status", "enum", enum_key="status", section="Governance"),
                form_field("version", "Version", "text", section="Governance"),
                form_field("riskTier", "Risk Tier", "enum", enum_key="riskTier", section="Governance"),
                form_field("workspaceEditable", "Workspace Editable", "boolean", section="Governance"),
            ],
        },
        "staffProfiles": {
            "collection": "staffProfiles",
            "label": "Staff Profiles",
            "idPrefix": "AIstaff",
            "fields": [
                form_field("id", "ID", "text", required=True, section="Identity"),
                form_field("label", "Label", "text", required=True, section="Identity"),
                form_field("alias", "Alias", "text", section="Identity"),
                form_field("profileTitle", "Profile Title", "text", section="Identity"),
                form_field("role", "Role", "textarea", section="Identity"),
                form_field("managerId", "Manager", "reference", reference_collection="staffProfiles", section="Ownership"),
                form_field("reportsTo", "Reports To", "reference", reference_collection="staffProfiles", section="Ownership"),
                form_field("archetypeIds", "Archetypes", "multiReference", reference_collection="staffArchetypes", section="Composition"),
                form_field("primaryArchetypeId", "Primary Archetype", "reference", reference_collection="staffArchetypes", section="Composition"),
                form_field("contactPolicy", "Contact Policy", "textarea", section="Governance"),
                form_field("communicationScope", "Communication Scope", "enum", enum_key="communicationScope", section="Governance"),
                form_field("visibilityMode", "Visibility Mode", "enum", enum_key="visibilityMode", section="Governance"),
                form_field("canContactHuman", "Can Contact Human", "boolean", section="Governance"),
                form_field("canCreateHumanFacingThreads", "Can Create Human-Facing Threads", "boolean", section="Governance"),
                form_field("workspaceEditable", "Workspace Editable", "boolean", section="Governance"),
                form_field("locked", "Locked", "boolean", section="Governance"),
            ],
        },
    }
    return schemas


def default_platform_admin_form_schema_rows() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for collection, schema in default_platform_admin_form_schemas().items():
        row = json_clone(schema)
        row["id"] = collection
        row["collection"] = collection
        row.setdefault("label", FABRIC_COLLECTION_LABELS.get(collection, collection))
        row.setdefault("status", "Active")
        row.setdefault("locked", False)
        row.setdefault("workspaceEditable", True)
        rows.append(row)
    return rows


def default_platform_admin_enum_sets() -> list[dict[str, Any]]:
    return [
        {
            "id": key,
            "label": friendly_label(key),
            "values": json_clone(values),
            "status": "Active",
            "locked": False,
            "workspaceEditable": True,
        }
        for key, values in PLATFORM_ADMIN_ENUM_OPTIONS.items()
    ]


def platform_admin_enum_options(fabric: dict[str, Any] | None = None) -> dict[str, list[Any]]:
    fabric = fabric or load_capability_fabric()
    rows = fabric.get("enumSets") or []
    if not isinstance(rows, list) or not rows:
        return json_clone(PLATFORM_ADMIN_ENUM_OPTIONS)
    options: dict[str, list[Any]] = {}
    for row in rows:
        if not isinstance(row, dict) or not row.get("id"):
            continue
        values = row.get("values", [])
        if isinstance(values, str):
            values = [item.strip() for item in re.split(r"[\n,;]+", values) if item.strip()]
        if not isinstance(values, list):
            values = []
        options[str(row.get("id"))] = values
    for key, values in PLATFORM_ADMIN_ENUM_OPTIONS.items():
        options.setdefault(key, json_clone(values))
    return options


def platform_admin_form_schemas(fabric: dict[str, Any] | None = None) -> dict[str, Any]:
    fabric = fabric or load_capability_fabric()
    rows = fabric.get("formSchemas") or []
    if not isinstance(rows, list) or not rows:
        return default_platform_admin_form_schemas()
    schemas: dict[str, Any] = {}
    defaults = default_platform_admin_form_schemas()
    for row in rows:
        if not isinstance(row, dict):
            continue
        collection = str(row.get("collection") or row.get("id") or "").strip()
        if not collection:
            continue
        schema = json_clone(row)
        schema["collection"] = collection
        schema.setdefault("label", FABRIC_COLLECTION_LABELS.get(collection, collection))
        schema.setdefault("idPrefix", defaults.get(collection, {}).get("idPrefix") or collection)
        schema["fields"] = schema.get("fields") if isinstance(schema.get("fields"), list) else defaults.get(collection, {}).get("fields", [])
        schemas[collection] = schema
    for collection, schema in defaults.items():
        schemas.setdefault(collection, json_clone(schema))
    return schemas


def platform_admin_reference_indexes(fabric: dict[str, Any] | None = None) -> dict[str, list[dict[str, Any]]]:
    fabric = fabric or load_capability_fabric()
    collections = [
        "capabilities",
        "recipes",
        "lanes",
        "connections",
        "databases",
        "aiSupport",
        "qualityGates",
        "automations",
        "compatibilityRules",
        "platformSafetySkills",
        "departmentSkills",
        "staffTemplateSkills",
        "laneAdapterSkills",
        "formSchemas",
        "enumSets",
        "departmentTemplates",
        "staffArchetypes",
        "staffProfiles",
    ]
    indexes: dict[str, list[dict[str, Any]]] = {}
    for collection in collections:
        indexes[collection] = [
            {
                "id": row.get("id"),
                "label": row.get("label") or row.get("name") or row.get("id"),
                "summary": row.get("summary") or row.get("purpose") or row.get("rule") or row.get("usage") or "",
                "status": row.get("status") or row.get("lifecycleStatus") or "",
            }
            for row in (fabric.get(collection, []) or [])
            if isinstance(row, dict) and row.get("id")
        ]
    return indexes


def platform_admin_form_payload() -> dict[str, Any]:
    fabric = load_capability_fabric()
    return {
        "ok": True,
        "formSchemas": platform_admin_form_schemas(fabric),
        "enumOptions": platform_admin_enum_options(fabric),
        "referenceIndexes": platform_admin_reference_indexes(fabric),
        "editableCollections": sorted(EDITABLE_FABRIC_COLLECTIONS),
    }


def workspace_profile() -> dict[str, Any]:
    profile = default_workspace_business_profile()
    saved = parse_json_meta("workspace_business_profile", {})
    if isinstance(saved, dict):
        profile.update({key: value for key, value in saved.items() if key in profile or key in {"updatedAt", "updatedBy"}})
    return attach_field_access(profile, "WorkspaceBusinessProfile")


def split_list_value(value: Any) -> list[str]:
    if isinstance(value, str):
        return [item.strip() for item in re.split(r"[\n,;]+", value) if item.strip()]
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


DEPARTMENT_IDENTITY_FIELDS = {
    "organizationDisplayName",
    "legalOrganizationName",
    "websiteUrl",
    "primaryDomain",
    "vatOrTaxId",
    "commercialRegistrationNumber",
    "registeredAddress",
    "industrySector",
    "defaultLanguage",
    "approvedBrandTone",
    "managerDisplayName",
    "managerTitle",
    "approvedEmailSignature",
    "publicDescription",
    "activeConnections",
    "approvedDatabases",
    "connectionConfigs",
}


def department_identity_from_row(department: dict[str, Any], workspace_defaults: dict[str, Any] | None = None) -> dict[str, Any]:
    workspace_defaults = workspace_defaults or workspace_profile()
    override = department.get("businessIdentity") if isinstance(department.get("businessIdentity"), dict) else {}
    label = str(department.get("label") or "").strip()
    fallback_org = workspace_defaults.get("companyDisplayName") or label or "Department organization"
    identity = {
        "id": f"identity_{department.get('id') or fabric_slug(label or 'department')}",
        "departmentId": department.get("id") or "",
        "organizationDisplayName": fallback_org,
        "legalOrganizationName": workspace_defaults.get("legalCompanyName") or "",
        "websiteUrl": workspace_defaults.get("websiteUrl") or "",
        "primaryDomain": workspace_defaults.get("primaryDomain") or "",
        "vatOrTaxId": workspace_defaults.get("vatOrTaxId") or "",
        "commercialRegistrationNumber": workspace_defaults.get("commercialRegistrationNumber") or "",
        "registeredAddress": workspace_defaults.get("registeredAddress") or "",
        "industrySector": department.get("industrySector") or workspace_defaults.get("industrySector") or "",
        "defaultLanguage": department.get("defaultLanguage") or workspace_defaults.get("defaultLanguage") or "English",
        "approvedBrandTone": workspace_defaults.get("approvedBrandTone") or "",
        "managerDisplayName": department.get("humanManager") or workspace_defaults.get("defaultManagerTitle") or "Human Manager",
        "managerTitle": workspace_defaults.get("defaultManagerTitle") or "Human Manager",
        "approvedEmailSignature": workspace_defaults.get("approvedEmailSignature") or "",
        "publicDescription": department.get("purpose") or "",
        "activeConnections": split_list_value(department.get("activeConnections") or workspace_defaults.get("activeConnections") or []),
        "approvedDatabases": split_list_value(department.get("approvedDatasets") or workspace_defaults.get("approvedDatabases") or []),
        "connectionConfigs": {},
        "workspaceDefaultsId": workspace_defaults.get("id") or "workspace_business_profile",
        "source": "workspace defaults + department overrides",
        "workspaceEditable": True,
    }
    for key, value in override.items():
        if key in DEPARTMENT_IDENTITY_FIELDS or key in {"id", "departmentId", "updatedAt", "updatedBy", "createdAt", "createdBy"}:
            identity[key] = value
    identity["departmentId"] = department.get("id") or identity.get("departmentId") or ""
    identity["id"] = identity.get("id") or f"identity_{identity['departmentId']}"
    for key in {"activeConnections", "approvedDatabases"}:
        identity[key] = split_list_value(identity.get(key)) if not isinstance(identity.get(key), list) else split_list_value(identity.get(key))
    if not isinstance(identity.get("connectionConfigs"), dict):
        identity["connectionConfigs"] = {}
    return attach_field_access(identity, "DepartmentBusinessIdentity")


def attach_department_identities(fabric: dict[str, Any]) -> dict[str, Any]:
    workspace_defaults = fabric.get("workspaceBusinessProfile") if isinstance(fabric.get("workspaceBusinessProfile"), dict) else default_workspace_business_profile()
    for department in fabric.get("departments", []) or []:
        if isinstance(department, dict):
            department["effectiveBusinessIdentity"] = department_identity_from_row(department, workspace_defaults)
    return fabric


WORKSPACE_PROFILE_EDITABLE_FIELDS = {
    "companyDisplayName",
    "legalCompanyName",
    "vatOrTaxId",
    "commercialRegistrationNumber",
    "registeredAddress",
    "industrySector",
    "defaultLanguage",
    "approvedBrandTone",
    "defaultManagerTitle",
    "approvedEmailSignature",
    "approvedSenderIdentities",
    "activeConnections",
    "approvedDatabases",
}


def update_workspace_profile(payload: dict[str, Any]) -> dict[str, Any]:
    current = workspace_profile()
    profile_payload = payload.get("profile") if isinstance(payload.get("profile"), dict) else payload
    updated = {key: current.get(key) for key in default_workspace_business_profile().keys()}
    for key in WORKSPACE_PROFILE_EDITABLE_FIELDS:
        if key in profile_payload:
            value = profile_payload.get(key)
            if key in {"approvedSenderIdentities", "activeConnections", "approvedDatabases"}:
                if isinstance(value, str):
                    value = [item.strip() for item in re.split(r"[\n,;]+", value) if item.strip()]
                elif not isinstance(value, list):
                    value = []
            updated[key] = value
    updated["updatedAt"] = iso_like()
    updated["updatedBy"] = str(payload.get("updatedBy") or "Human_Iman")
    set_meta("workspace_business_profile", updated)
    record_department_version(
        object_type="workspaceBusinessProfile",
        object_id=str(updated.get("id") or "workspace_business_profile"),
        action="Update workspace profile",
        before_payload=current,
        after_payload=updated,
        created_by=updated["updatedBy"],
        reason=str(payload.get("reason") or "Workspace defaults updated."),
    )
    return {"ok": True, "workspaceProfile": workspace_profile()}


def department_business_identity(department_id: str) -> dict[str, Any]:
    fabric = load_capability_fabric()
    departments = [row for row in fabric.get("departments", []) or [] if isinstance(row, dict)]
    department = next((row for row in departments if str(row.get("id")) == str(department_id)), None)
    if not department:
        return {"ok": False, "error": f"Department not found: {department_id}"}
    return {
        "ok": True,
        "department": attach_field_access(department, "AiDepartmentInstance"),
        "businessIdentity": department_identity_from_row(department, fabric.get("workspaceBusinessProfile") or workspace_profile()),
    }


def normalized_department_goal(goal: dict[str, Any], department_id: str = "") -> dict[str, Any]:
    goal = json_clone(goal or {})
    label = str(goal.get("label") or "Department goal").strip()
    goal_id = str(goal.get("id") or f"goal_{fabric_slug(department_id or 'department')}_{fabric_slug(label)}").strip()
    try:
        target_count = max(0, int(float(goal.get("targetCount") or 0)))
    except Exception:
        target_count = 0
    try:
        current_count = max(0, int(float(goal.get("currentCount") or 0)))
    except Exception:
        current_count = 0
    progress_percent = round((current_count / target_count) * 100) if target_count else 0
    return {
        "id": goal_id,
        "label": label,
        "description": str(goal.get("description") or "").strip(),
        "metricType": str(goal.get("metricType") or "published_content_count").strip(),
        "targetCount": target_count,
        "currentCount": current_count,
        "targetUnit": str(goal.get("targetUnit") or "Content pieces").strip(),
        "periodType": str(goal.get("periodType") or "Monthly").strip(),
        "periodStart": str(goal.get("periodStart") or "").strip(),
        "periodEnd": str(goal.get("periodEnd") or "").strip(),
        "status": str(goal.get("status") or ("Completed" if target_count and current_count >= target_count else "Active")).strip(),
        "ownerStaff": str(goal.get("ownerStaff") or "AIstaff_Manager").strip(),
        "progressSource": str(goal.get("progressSource") or "Manual/local alpha until WordPress publish log is connected").strip(),
        "nextAction": str(goal.get("nextAction") or "").strip(),
        "requiresApprovalForTargetChange": bool(goal.get("requiresApprovalForTargetChange", True)),
        "workspaceEditable": bool(goal.get("workspaceEditable", True)),
        "progressPercent": min(100, progress_percent),
        "remainingCount": max(0, target_count - current_count),
        "updatedAt": goal.get("updatedAt") or "",
        "updatedBy": goal.get("updatedBy") or "",
        "createdAt": goal.get("createdAt") or "",
        "createdBy": goal.get("createdBy") or "",
    }


def department_goals(department_id: str) -> dict[str, Any]:
    fabric = load_capability_fabric()
    departments = [row for row in fabric.get("departments", []) or [] if isinstance(row, dict)]
    department = next((row for row in departments if str(row.get("id")) == str(department_id)), None)
    if not department:
        return {"ok": False, "error": f"Department not found: {department_id}"}
    goals = [normalized_department_goal(row, str(department.get("id") or "")) for row in (department.get("goals") or []) if isinstance(row, dict)]
    total_target = sum(int(goal.get("targetCount") or 0) for goal in goals)
    total_current = sum(int(goal.get("currentCount") or 0) for goal in goals)
    return {
        "ok": True,
        "departmentId": department_id,
        "department": attach_field_access(department, "AiDepartmentInstance"),
        "goals": [attach_field_access(goal, "DepartmentGoal") for goal in goals],
        "summary": {
            "goalCount": len(goals),
            "activeCount": len([goal for goal in goals if normalize_text(goal.get("status")) == "active"]),
            "completedCount": len([goal for goal in goals if normalize_text(goal.get("status")) == "completed"]),
            "targetCount": total_target,
            "currentCount": total_current,
            "progressPercent": round((total_current / total_target) * 100) if total_target else 0,
        },
    }


def upsert_department_goal(payload: dict[str, Any]) -> dict[str, Any]:
    department_id = str(payload.get("departmentId") or payload.get("id") or "").strip()
    if not department_id:
        return {"ok": False, "error": "Missing departmentId."}
    goal_payload = payload.get("goal") if isinstance(payload.get("goal"), dict) else payload
    try:
        fabric = normalize_capability_fabric(json.loads(CAPABILITY_FABRIC_PATH.read_text(encoding="utf-8")))
    except Exception as exc:
        return {"ok": False, "error": f"Could not load capability fabric: {exc}"}
    rows = collection_rows(fabric, "departments")
    target = next((row for row in rows if isinstance(row, dict) and str(row.get("id")) == department_id), None)
    if not target:
        return {"ok": False, "error": f"Department not found: {department_id}"}
    goals = [row for row in (target.get("goals") or []) if isinstance(row, dict)]
    updated = normalized_department_goal(goal_payload, department_id)
    now = iso_like()
    updated["updatedAt"] = now
    updated["updatedBy"] = str(payload.get("updatedBy") or "Human_Iman")
    existing_index = next((index for index, row in enumerate(goals) if str(row.get("id")) == str(updated.get("id"))), -1)
    before_payload = json_clone(target)
    if existing_index >= 0:
        created_at = goals[existing_index].get("createdAt")
        created_by = goals[existing_index].get("createdBy")
        updated["createdAt"] = created_at or now
        updated["createdBy"] = created_by or updated["updatedBy"]
        goals[existing_index] = updated
    else:
        updated["createdAt"] = now
        updated["createdBy"] = updated["updatedBy"]
        goals.append(updated)
    target["goals"] = goals
    target["updatedAt"] = now
    target["updatedBy"] = updated["updatedBy"]
    backup = create_config_backup({"reason": f"Before department goal update: {department_id}", "notes": "Automatic pre-goal-update backup."})
    result = write_capability_fabric(fabric)
    if not result.get("ok"):
        return result
    result.pop("capabilityFabric", None)
    version = record_department_version(
        object_type="departmentGoals",
        object_id=f"{department_id}:{updated.get('id')}",
        action="Update department goal",
        before_payload=before_payload,
        after_payload=json_clone(target),
        created_by=updated["updatedBy"],
        reason=str(payload.get("reason") or "Department goal updated."),
    )
    refreshed = load_capability_fabric()
    refreshed_department = next((row for row in refreshed.get("departments", []) or [] if isinstance(row, dict) and str(row.get("id")) == department_id), target)
    result["department"] = attach_field_access(refreshed_department, "AiDepartmentInstance")
    result["goal"] = attach_field_access(updated, "DepartmentGoal")
    result["goals"] = department_goals(department_id).get("goals") or []
    result["version"] = version
    result["backup"] = backup
    return result


def update_department_business_identity(payload: dict[str, Any]) -> dict[str, Any]:
    department_id = str(payload.get("departmentId") or payload.get("id") or "").strip()
    if not department_id:
        return {"ok": False, "error": "Missing departmentId."}
    try:
        fabric = normalize_capability_fabric(json.loads(CAPABILITY_FABRIC_PATH.read_text(encoding="utf-8")))
    except Exception as exc:
        return {"ok": False, "error": f"Could not load capability fabric: {exc}"}
    rows = collection_rows(fabric, "departments")
    target = next((row for row in rows if isinstance(row, dict) and str(row.get("id")) == department_id), None)
    if not target:
        return {"ok": False, "error": f"Department not found: {department_id}"}

    current_identity = department_identity_from_row(target, workspace_profile())
    profile_payload = payload.get("businessIdentity") if isinstance(payload.get("businessIdentity"), dict) else payload
    updated_identity = {key: current_identity.get(key) for key in DEPARTMENT_IDENTITY_FIELDS if key in current_identity}
    for key in DEPARTMENT_IDENTITY_FIELDS:
        if key not in profile_payload:
            continue
        value = profile_payload.get(key)
        if key in {"activeConnections", "approvedDatabases"}:
            value = split_list_value(value)
        updated_identity[key] = value
    updated_identity["id"] = current_identity.get("id") or f"identity_{department_id}"
    updated_identity["departmentId"] = department_id
    updated_identity["updatedAt"] = iso_like()
    updated_identity["updatedBy"] = str(payload.get("updatedBy") or "Human_Iman")
    if not target.get("businessIdentity"):
        updated_identity["createdAt"] = updated_identity["updatedAt"]
        updated_identity["createdBy"] = updated_identity["updatedBy"]

    before_payload = json_clone(target)
    target["businessIdentity"] = updated_identity
    if "defaultLanguage" in updated_identity:
        target["defaultLanguage"] = updated_identity.get("defaultLanguage") or target.get("defaultLanguage")
    if "activeConnections" in updated_identity:
        target["activeConnections"] = updated_identity.get("activeConnections") or []
    if "approvedDatabases" in updated_identity:
        target["approvedDatasets"] = updated_identity.get("approvedDatabases") or []
    target["updatedAt"] = updated_identity["updatedAt"]
    target["updatedBy"] = updated_identity["updatedBy"]

    backup = create_config_backup({"reason": f"Before department identity update: {department_id}", "notes": "Automatic pre-identity-update backup."})
    result = write_capability_fabric(fabric)
    if not result.get("ok"):
        return result
    result.pop("capabilityFabric", None)
    version = record_department_version(
        object_type="departments",
        object_id=department_id,
        action="Update department business identity",
        before_payload=before_payload,
        after_payload=json_clone(target),
        created_by=updated_identity["updatedBy"],
        reason=str(payload.get("reason") or "Department organization identity updated."),
    )
    refreshed = load_capability_fabric()
    refreshed_department = next((row for row in refreshed.get("departments", []) or [] if isinstance(row, dict) and str(row.get("id")) == department_id), target)
    result["department"] = attach_field_access(refreshed_department, "AiDepartmentInstance")
    result["businessIdentity"] = department_identity_from_row(refreshed_department, refreshed.get("workspaceBusinessProfile") or workspace_profile())
    result["version"] = version
    result["backup"] = backup
    result["catalogs"] = platform_admin_catalogs()
    return result


def ensure_default_sender_identity() -> None:
    now = utc_ts()
    profile = default_workspace_business_profile()
    with connect() as conn:
        existing = conn.execute("SELECT 1 FROM sender_identities LIMIT 1").fetchone()
        if existing:
            return
        conn.execute(
            """
            INSERT INTO sender_identities (
              sender_id, label, provider, from_email, reply_to, approval_required,
              status, metadata, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "sender_gcc_lab_default",
                "GCC lab approved sender",
                "local_eml_or_smtp",
                "",
                "",
                1,
                "Draft",
                json.dumps({"source": "local alpha", "companyDisplayName": profile.get("companyDisplayName")}),
                now,
                now,
            ),
        )


def list_sender_identities() -> list[dict[str, Any]]:
    init_db()
    with connect() as conn:
        rows = conn.execute("SELECT * FROM sender_identities ORDER BY updated_at DESC").fetchall()
    return [
        attach_field_access(
            {
                "id": row["sender_id"],
                "label": row["label"],
                "provider": row["provider"],
                "fromEmail": row["from_email"],
                "replyTo": row["reply_to"],
                "approvalRequired": bool(row["approval_required"]),
                "status": row["status"],
                "metadata": parse_json_text(row["metadata"], {}),
                "createdAt": iso_like(row["created_at"]),
                "updatedAt": iso_like(row["updated_at"]),
                "workspaceEditable": True,
            },
            "AiSenderIdentity",
        )
        for row in rows
    ]


def record_outbound_attempt(
    queue_id: str,
    row: dict[str, Any] | None,
    status: str,
    safety: dict[str, Any] | None = None,
    evidence_link: str = "",
    provider_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    init_db()
    row = row or {}
    now = utc_ts()
    attempt_id = "attempt_" + str(uuid.uuid4())
    provider = str((provider_metadata or {}).get("provider") or row.get("provider") or row.get("Provider") or "local_eml_or_smtp")
    sender_id = str(row.get("senderId") or row.get("Sender ID") or "sender_gcc_lab_default")
    recipient = str(row.get("to") or row.get("To") or row.get("recipientEmail") or "")
    subject = str(row.get("subject") or row.get("Subject") or "")
    approval_state = str(row.get("approvalStatus") or row.get("Approval Status") or "")
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO outbound_attempts (
              attempt_id, queue_id, provider, sender_id, recipient, subject,
              approval_state, status, safety_json, provider_metadata, evidence_link, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                attempt_id,
                queue_id or "",
                provider,
                sender_id,
                recipient,
                subject,
                approval_state,
                status or "",
                json.dumps(safety or {}, ensure_ascii=False, default=str),
                json.dumps(provider_metadata or {}, ensure_ascii=False, default=str),
                evidence_link or "",
                now,
            ),
        )
    record_communication_event(
        queue_id=queue_id,
        row=row,
        event_type="outbound_attempt",
        status=status,
        evidence_link=evidence_link,
        metadata={"attemptId": attempt_id, "safety": safety or {}, "providerMetadata": provider_metadata or {}},
    )
    return {"ok": True, "attemptId": attempt_id}


def record_communication_event(
    queue_id: str = "",
    row: dict[str, Any] | None = None,
    event_type: str = "event",
    status: str = "",
    direction: str = "outbound",
    evidence_link: str = "",
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    init_db()
    row = row or {}
    event_id = "comm_" + str(uuid.uuid4())
    provider = str((metadata or {}).get("provider") or row.get("provider") or row.get("Provider") or "local")
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO communication_events (
              event_id, queue_id, thread_id, direction, provider, sender_id, recipient, subject,
              event_type, approval_state, status, body_preview, evidence_link, metadata, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event_id,
                queue_id or str(row.get("queueId") or row.get("Queue ID") or ""),
                str(row.get("threadId") or row.get("Thread ID") or ""),
                direction,
                provider,
                str(row.get("senderId") or row.get("Sender ID") or "sender_gcc_lab_default"),
                str(row.get("to") or row.get("To") or row.get("recipientEmail") or ""),
                str(row.get("subject") or row.get("Subject") or ""),
                event_type,
                str(row.get("approvalStatus") or row.get("Approval Status") or ""),
                status or "",
                thread_preview(str(row.get("body") or row.get("Body") or row.get("emailBody") or ""), 260),
                evidence_link or "",
                json.dumps(metadata or {}, ensure_ascii=False, default=str),
                utc_ts(),
            ),
        )
    return {"ok": True, "eventId": event_id}


def list_communications(limit: int = 80) -> dict[str, Any]:
    init_db()
    safe_limit = max(1, min(int(limit or 80), 250))
    with connect() as conn:
        events = conn.execute("SELECT * FROM communication_events ORDER BY created_at DESC LIMIT ?", (safe_limit,)).fetchall()
        attempts = conn.execute("SELECT * FROM outbound_attempts ORDER BY created_at DESC LIMIT ?", (safe_limit,)).fetchall()
    return {
        "ok": True,
        "senderIdentities": list_sender_identities(),
        "events": [
            {
                "eventId": row["event_id"],
                "queueId": row["queue_id"],
                "threadId": row["thread_id"],
                "direction": row["direction"],
                "provider": row["provider"],
                "senderId": row["sender_id"],
                "recipient": row["recipient"],
                "subject": row["subject"],
                "eventType": row["event_type"],
                "approvalState": row["approval_state"],
                "status": row["status"],
                "bodyPreview": row["body_preview"],
                "evidenceLink": row["evidence_link"],
                "metadata": parse_json_text(row["metadata"], {}),
                "createdAt": iso_like(row["created_at"]),
            }
            for row in events
        ],
        "outboundAttempts": [
            {
                "attemptId": row["attempt_id"],
                "queueId": row["queue_id"],
                "provider": row["provider"],
                "senderId": row["sender_id"],
                "recipient": row["recipient"],
                "subject": row["subject"],
                "approvalState": row["approval_state"],
                "status": row["status"],
                "safety": parse_json_text(row["safety_json"], {}),
                "providerMetadata": parse_json_text(row["provider_metadata"], {}),
                "evidenceLink": row["evidence_link"],
                "createdAt": iso_like(row["created_at"]),
            }
            for row in attempts
        ],
    }


def set_task_status_override(task_id: str, status: str, result_notes: str = "", evidence_link: str = "") -> None:
    """Persist a local terminal decision so sheet sync cannot reopen stale rows."""
    task_id = str(task_id or "").strip()
    status = str(status or "").strip()
    if not task_id or not status:
        return
    init_db()
    now = utc_ts()
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO task_status_overrides (task_id, status, result_notes, evidence_link, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(task_id) DO UPDATE SET
              status=excluded.status,
              result_notes=excluded.result_notes,
              evidence_link=excluded.evidence_link,
              updated_at=excluded.updated_at
            """,
            (task_id, status, result_notes or "", evidence_link or "", now),
        )
        rows = conn.execute(
            "SELECT thread_id, source_payload FROM task_threads WHERE task_id = ?",
            (task_id,),
        ).fetchall()
        for row in rows:
            try:
                source = json.loads(row["source_payload"] or "{}")
            except Exception:
                source = {}
            source["status"] = status
            if result_notes:
                source["resultNotes"] = result_notes
            if evidence_link:
                source["evidenceLink"] = evidence_link
            if task_is_terminal({"status": status}):
                conn.execute(
                    """
                    UPDATE task_threads
                    SET status = 'Closed',
                        closed_at = COALESCE(closed_at, ?),
                        unread_for = 'None',
                        source_payload = ?,
                        last_message_preview = ?
                    WHERE thread_id = ?
                    """,
                    (
                        now,
                        json.dumps(source, default=str),
                        result_notes or f"Reconciled as {status}.",
                        row["thread_id"],
                    ),
                )
            else:
                conn.execute(
                    "UPDATE task_threads SET source_payload = ? WHERE thread_id = ?",
                    (json.dumps(source, default=str), row["thread_id"]),
                )


def task_status_overrides_map() -> dict[str, dict[str, Any]]:
    init_db()
    with connect() as conn:
        rows = conn.execute(
            "SELECT task_id, status, result_notes, evidence_link, updated_at FROM task_status_overrides"
        ).fetchall()
    return {
        row["task_id"]: {
            "status": row["status"],
            "resultNotes": row["result_notes"],
            "evidenceLink": row["evidence_link"],
            "updatedAt": row["updated_at"],
        }
        for row in rows
    }


def apply_task_status_overrides(payload: Dashboard) -> Dashboard:
    overrides = task_status_overrides_map()
    if not overrides:
        return payload
    normalized = dict(payload or {})
    tasks = [dict(row) for row in normalized.get("tasks", []) or [] if isinstance(row, dict)]
    changed = False
    for task in tasks:
        task_id = str(task.get("taskId") or task.get("Task ID") or "").strip()
        override = overrides.get(task_id)
        if not override:
            continue
        task["status"] = override["status"]
        task["completedAt"] = task.get("completedAt") or iso_like(float(override["updatedAt"] or utc_ts()))
        if override.get("resultNotes"):
            task["resultNotes"] = override["resultNotes"]
        if override.get("evidenceLink"):
            task["evidenceLink"] = override["evidenceLink"]
        changed = True
    if changed:
        normalized["tasks"] = tasks
    return normalized


def local_status(*, fast: bool = False, snapshot_payload: Dashboard | None = None) -> dict[str, Any]:
    with connect() as conn:
        pending = conn.execute("SELECT COUNT(*) AS c FROM pending_actions WHERE status = 'Queued'").fetchone()["c"]
        failed = conn.execute("SELECT COUNT(*) AS c FROM pending_actions WHERE status = 'Error'").fetchone()["c"]
        snapshot = conn.execute("SELECT payload, updated_at, source, error FROM dashboard_snapshot WHERE id = 1").fetchone()
    if snapshot_payload is None and snapshot:
        try:
            snapshot_payload = json.loads(snapshot["payload"] or "{}")
        except Exception:
            snapshot_payload = None
    crm_sync_enabled = normalize_text(get_meta("crm_sync_enabled", "false")) == "true"
    base = {
        "mode": "local-first" if crm_sync_enabled else "local-runtime",
        "crmSyncEnabled": crm_sync_enabled,
        "crmSyncStatus": get_meta("crm_sync_status", "legacy-apps-script" if crm_sync_enabled else "local-runtime"),
        "dbPath": str(DB_PATH),
        "pendingActions": pending,
        "failedActions": failed,
        "lastSheetSync": get_meta("last_sheet_sync", ""),
        "lastSyncError": get_meta("last_sync_error", "") if crm_sync_enabled else "",
        "snapshotUpdatedAt": iso_like(snapshot["updated_at"]) if snapshot else "",
        "snapshotSource": snapshot["source"] if snapshot else "",
        "snapshotError": snapshot["error"] if snapshot else "",
    }
    if fast:
        windmill = windmill_config()
        return {
            **base,
            "fastMode": True,
            "staffWakeups": {},
            "autopilot": {
                "enabled": get_meta("autopilot_enabled", "TRUE").upper() != "FALSE",
                "statusReason": "Fast dashboard mode; open Automation for full runtime status.",
            },
            "localWorker": {
                "enabled": get_meta("local_worker_enabled", "TRUE").upper() != "FALSE",
                "commandConfigured": bool(get_meta("local_worker_command", "")),
            },
            "windmill": {
                "configured": windmill.get("configured"),
                "mockMode": windmill.get("mockMode"),
                "baseUrl": windmill.get("baseUrl"),
                "workspace": windmill.get("workspace"),
            },
            "orchestration": {"fastMode": True, "runs": [], "counts": {}},
            "p4Readiness": {"fastMode": True, "items": [], "summary": {}},
            "automationBlockers": {"fastMode": True, "counts": {}, "groups": []},
            "documentQuality": {"fastMode": True},
        }
    return {
        **base,
        "staffWakeups": staff_wakeup_summary(),
        "autopilot": autopilot_status(),
        "localWorker": local_worker_status(),
        "windmill": windmill_status(),
        "orchestration": orchestration_status(),
        "p4Readiness": p4_readiness(),
        "automationBlockers": automation_blockers(snapshot_payload),
        "documentQuality": document_quality_status(),
    }


SEO_DEMAND_ENGINE_DEPARTMENT_ID = "department_seo_demand_engine"
SEO_DEMAND_ENGINE_WINDMILL_PREFIX = "u/admin/seo_demand_engine_worldbc"
SEO_STAFF_ACTOR_ORDER = [
    "AIstaff_SEOManager",
    "AIstaff_SEOSourceAnalyst",
    "AIstaff_SEOExpert",
    "AIstaff_CaseStudyMapper",
    "AIstaff_SEOContentWriter",
    "AIstaff_InternalLinkBuilder",
    "AIstaff_SEOQAAnalyst",
    "AIstaff_WordPressPublisher",
]
SEO_STAFF_PROFILE_IDS = set(SEO_STAFF_ACTOR_ORDER)
SEO_STAFF_ACTOR_TITLES = {
    "AIstaff_SEOManager": "SEO Demand Engine Manager",
    "AIstaff_SEOSourceAnalyst": "Transcript And Source Intelligence Analyst",
    "AIstaff_SEOExpert": "SEO Strategy, Analytics And Reporting Expert",
    "AIstaff_CaseStudyMapper": "Case Study And Evidence Mapper",
    "AIstaff_SEOContentWriter": "SEO Brief And Article Writer",
    "AIstaff_InternalLinkBuilder": "Internal Link And Content Inventory Specialist",
    "AIstaff_SEOQAAnalyst": "SEO QA And Performance Learning Analyst",
    "AIstaff_WordPressPublisher": "Supervised WordPress And Make.com Publisher",
}


def seo_staff_actor_slug(staff_id: str) -> str:
    raw = str(staff_id or "").replace("AIstaff_", "")
    return fabric_slug(raw, "seo_staff")


def seo_staff_actor_activity_name(staff_id: str) -> str:
    return f"worldbc.seo.actor.{seo_staff_actor_slug(staff_id)}"


def seo_staff_actor_path(staff_id: str) -> str:
    return f"{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_actor_{seo_staff_actor_slug(staff_id)}"


def seo_staff_actor_contracts() -> list[dict[str, Any]]:
    contracts: list[dict[str, Any]] = [
        {
            "staffId": "AIstaff_SEOManager",
            "alias": DEFAULT_STAFF_ALIASES.get("AIstaff_SEOManager", "Sofia"),
            "title": SEO_STAFF_ACTOR_TITLES["AIstaff_SEOManager"],
            "purpose": "Receive panel commands, resolve department/staff context, choose specialist actors, validate responses, and decide whether to continue, retry, reroute, or ask for approval.",
            "canContactHuman": True,
        }
    ]
    purposes = {
        "AIstaff_SEOSourceAnalyst": "Read transcripts, uploaded notes, briefs, and source material; extract reusable SEO requirements, claims, missing context, and routing evidence.",
        "AIstaff_SEOExpert": "Analyze SEO strategy, Search Console/analytics evidence, keyword opportunities, rankings, and performance learning.",
        "AIstaff_CaseStudyMapper": "Map case studies, proof, references, and claims to keywords or article angles.",
        "AIstaff_SEOContentWriter": "Prepare SEO briefs, outlines, article drafts, metadata, and content packages from approved evidence.",
        "AIstaff_InternalLinkBuilder": "Inspect content inventory and prepare internal link targets, anchors, and page relationships.",
        "AIstaff_SEOQAAnalyst": "Validate SEO quality, evidence coverage, metadata, duplication risk, and post-publish learning criteria.",
        "AIstaff_WordPressPublisher": "Prepare supervised WordPress and Make.com draft/publish payloads and block external execution until approval.",
    }
    for staff_id in SEO_STAFF_ACTOR_ORDER:
        if staff_id == "AIstaff_SEOManager":
            continue
        contracts.append(
            {
                "staffId": staff_id,
                "alias": DEFAULT_STAFF_ALIASES.get(staff_id, staff_id),
                "title": SEO_STAFF_ACTOR_TITLES.get(staff_id, staff_label(staff_id)),
                "purpose": purposes.get(staff_id, "Execute assigned SEO department work under manager supervision."),
                "canContactHuman": False,
            }
        )
    for row in contracts:
        staff_id = row["staffId"]
        row.update(
            {
                "activityName": seo_staff_actor_activity_name(staff_id),
                "windmillPath": f"/p/{seo_staff_actor_path(staff_id)}",
                "apiContract": {
                    "input": ["command", "stage", "subtask", "actorContext", "managerCommand", "qualityThreshold"],
                    "output": ["ok", "status", "summary", "result", "nextAction", "validation"],
                    "communicationRule": "Specialist actors return to Sofia/manager; only manager can communicate with the human.",
                },
            }
        )
    return contracts


def seo_profile_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item or "").strip()]
    if isinstance(value, str):
        return [item.strip() for item in re.split(r"[\n,]+", value) if item.strip()]
    return []


def seo_profile_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def sanitize_seo_staff_profile_stage(stage: Any, staff_id: str, index: int = 0) -> dict[str, Any]:
    source = stage if isinstance(stage, dict) else {}
    stage_id = str(source.get("id") or source.get("stageId") or f"custom_stage_{index + 1}").strip()
    stage_id = re.sub(r"[^a-zA-Z0-9_:-]+", "_", stage_id).strip("_") or f"custom_stage_{index + 1}"
    label = str(source.get("label") or source.get("stageName") or f"Assigned Stage {index + 1}").strip()
    lanes = seo_profile_list(source.get("lanes"))
    skills = seo_profile_list(source.get("skills"))
    lane_catalog = {
        str(key).strip(): value
        for key, value in seo_profile_dict(source.get("laneCatalog")).items()
        if str(key).strip() and isinstance(value, dict)
    }
    skill_catalog = {
        str(key).strip(): value
        for key, value in seo_profile_dict(source.get("skillCatalog")).items()
        if str(key).strip() and isinstance(value, dict)
    }
    subtasks = []
    for sub_index, subtask in enumerate(source.get("subtasks") if isinstance(source.get("subtasks"), list) else []):
        if not isinstance(subtask, dict):
            continue
        subtask_id = str(subtask.get("id") or f"{stage_id}_subtask_{sub_index + 1}").strip()
        subtask_id = re.sub(r"[^a-zA-Z0-9_:-]+", "_", subtask_id).strip("_") or f"{stage_id}_subtask_{sub_index + 1}"
        subtasks.append(
            {
                **subtask,
                "id": subtask_id,
                "label": str(subtask.get("label") or f"Subtask {sub_index + 1}").strip(),
                "goal": str(subtask.get("goal") or "").strip(),
                "detail": str(subtask.get("detail") or "").strip(),
                "nextAction": str(subtask.get("nextAction") or "").strip(),
                "readiness": str(subtask.get("readiness") or "Ready").strip(),
                "lanes": [item for item in seo_profile_list(subtask.get("lanes")) if not lanes or item in lanes],
                "skills": [item for item in seo_profile_list(subtask.get("skills")) if not skills or item in skills],
                "outputs": seo_profile_list(subtask.get("outputs")),
            }
        )
    if not subtasks:
        subtasks.append(
            {
                "id": f"{stage_id}_subtask_1",
                "label": "Define first workflow subtask",
                "goal": "Define the goal for this workflow subtask.",
                "detail": "Describe the work the assigned AI staff must complete.",
                "nextAction": "Send the result to Sofia for routing.",
                "readiness": "Draft",
                "lanes": [],
                "skills": [],
                "outputs": [],
            }
        )
    return {
        **source,
        "id": stage_id,
        "label": label,
        "ownerStaff": str(source.get("ownerStaff") or staff_id).strip(),
        "staffAlias": str(source.get("staffAlias") or DEFAULT_STAFF_ALIASES.get(staff_id) or staff_id).strip(),
        "staffTitle": str(source.get("staffTitle") or "").strip(),
        "capabilityId": str(source.get("capabilityId") or "").strip(),
        "capabilityLabel": str(source.get("capabilityLabel") or "").strip(),
        "goal": str(source.get("goal") or "").strip(),
        "description": str(source.get("description") or source.get("detail") or "").strip(),
        "assignedDuty": str(source.get("assignedDuty") or "").strip(),
        "readiness": str(source.get("readiness") or "Ready").strip(),
        "lanes": lanes,
        "skills": skills,
        "qualityGates": seo_profile_list(source.get("qualityGates")),
        "outputs": seo_profile_list(source.get("outputs")),
        "laneCatalog": lane_catalog,
        "skillCatalog": skill_catalog,
        "subtasks": subtasks,
    }


def default_seo_staff_profile_settings(staff_id: str = "") -> dict[str, Any]:
    email = ""
    if staff_id == "AIstaff_SEOManager":
        email = local_env_value("SEO_MANAGER_EMAIL", "") or local_env_value("MANAGER_EMAIL", "")
    return {
        "email": email,
    }


def sanitize_seo_staff_profile_settings(value: Any, staff_id: str = "") -> dict[str, Any]:
    source = default_seo_staff_profile_settings(staff_id)
    if isinstance(value, dict):
        source.update(value)
    source["email"] = str(source.get("email") or "").strip()
    return source


def load_seo_staff_profile_settings(department_id: str, staff_id: str) -> dict[str, Any]:
    with connect() as conn:
        row = conn.execute(
            "SELECT payload, updated_at, updated_by FROM seo_staff_profile_settings WHERE department_id = ? AND staff_id = ?",
            (department_id, staff_id),
        ).fetchone()
    settings = sanitize_seo_staff_profile_settings(parse_json_text(row["payload"], {}) if row else {}, staff_id)
    if row:
        settings["updatedAt"] = iso_like(row["updated_at"])
        settings["updatedBy"] = row["updated_by"]
    return settings


def save_seo_staff_profile_settings(department_id: str, staff_id: str, settings: Any, updated_by: str = "Human_Iman") -> dict[str, Any]:
    safe_settings = sanitize_seo_staff_profile_settings(settings, staff_id)
    now = utc_ts()
    with connect() as conn:
        before = conn.execute(
            "SELECT payload FROM seo_staff_profile_settings WHERE department_id = ? AND staff_id = ?",
            (department_id, staff_id),
        ).fetchone()
        conn.execute(
            """
            INSERT INTO seo_staff_profile_settings (
              department_id, staff_id, payload, created_at, updated_at, updated_by
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(department_id, staff_id) DO UPDATE SET
              payload = excluded.payload,
              updated_at = excluded.updated_at,
              updated_by = excluded.updated_by
            """,
            (
                department_id,
                staff_id,
                json.dumps(safe_settings, ensure_ascii=False, default=str),
                now,
                now,
                updated_by,
            ),
        )
    record_department_version(
        object_type="seoStaffProfileSettings",
        object_id=f"{department_id}:{staff_id}",
        action="Update SEO staff profile settings",
        before_payload=parse_json_text(before["payload"], {}) if before else {},
        after_payload=safe_settings,
        created_by=updated_by,
        reason="SEO staff profile settings updated.",
    )
    safe_settings["updatedAt"] = iso_like(now)
    safe_settings["updatedBy"] = updated_by
    return safe_settings


def pdf_text_from_bytes(raw: bytes) -> str:
    try:
        from pypdf import PdfReader  # type: ignore
        reader = PdfReader(io.BytesIO(raw))
        return "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    except Exception:
        pass
    try:
        from PyPDF2 import PdfReader  # type: ignore
        reader = PdfReader(io.BytesIO(raw))
        return "\n".join(page.extract_text() or "" for page in reader.pages).strip()
    except Exception:
        pass
    fallback = raw.decode("latin-1", errors="ignore")
    return re.sub(r"[^\x09\x0a\x0d\x20-\x7e]+", " ", fallback).strip()


def extract_seo_uploaded_text(file_name: str, content_type: str, data_base64: str) -> tuple[str, dict[str, Any]]:
    raw = base64.b64decode(str(data_base64 or ""), validate=False)
    extension = Path(file_name or "").suffix.lower()
    kind = "binary"
    if extension == ".pdf" or "pdf" in normalize_text(content_type):
        kind = "pdf"
        text = pdf_text_from_bytes(raw)
    elif extension in {".txt", ".md", ".markdown"} or "text" in normalize_text(content_type):
        kind = "text"
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            text = raw.decode("latin-1", errors="ignore")
    else:
        try:
            text = raw.decode("utf-8")
            kind = "text"
        except UnicodeDecodeError:
            text = raw.decode("latin-1", errors="ignore")
    text = re.sub(r"\r\n?", "\n", text or "").strip()
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text[:200000], {
        "fileKind": kind,
        "byteLength": len(raw),
        "textLength": len(text),
        "truncated": len(text) > 200000,
    }


def process_seo_staff_profile_file(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()
    department_id = str(payload.get("departmentId") or SEO_DEMAND_ENGINE_DEPARTMENT_ID).strip() or SEO_DEMAND_ENGINE_DEPARTMENT_ID
    staff_id = str(payload.get("staffId") or "").strip()
    target_kind = normalize_text(payload.get("targetKind") or payload.get("kind") or "")
    if staff_id not in SEO_STAFF_PROFILE_IDS:
        return {"ok": False, "error": f"Unsupported SEO staff profile: {staff_id or 'missing'}"}
    if target_kind not in {"lane", "skill"}:
        return {"ok": False, "error": "targetKind must be lane or skill."}
    file_name = str(payload.get("fileName") or "").strip()
    if not file_name:
        return {"ok": False, "error": "Missing fileName."}
    extension = Path(file_name).suffix.lower()
    if extension not in {".pdf", ".txt", ".md", ".markdown"}:
        return {"ok": False, "error": "Only PDF, TXT, and MD files are supported."}
    data_base64 = str(payload.get("dataBase64") or "").strip()
    if not data_base64:
        return {"ok": False, "error": "Missing file data."}
    text, metadata = extract_seo_uploaded_text(file_name, str(payload.get("contentType") or ""), data_base64)
    if not text:
        return {"ok": False, "error": "Could not extract text from the uploaded file."}
    asset_id = "seo_file_" + str(uuid.uuid4())
    created_by = str(payload.get("updatedBy") or "Human_Iman")
    now = utc_ts()
    source_payload = {
        "metadata": metadata,
        "preview": text[:1200],
    }
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO seo_staff_profile_file_assets (
              asset_id, department_id, staff_id, target_kind, file_name, content_type,
              text_content, source_payload, created_at, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                asset_id,
                department_id,
                staff_id,
                target_kind,
                file_name,
                str(payload.get("contentType") or ""),
                text,
                json.dumps(source_payload, ensure_ascii=False, default=str),
                now,
                created_by,
            ),
        )
    base_label = re.sub(r"\.[^.]+$", "", Path(file_name).name).strip() or file_name
    slug = fabric_slug(base_label, "uploaded_file")
    preview = re.sub(r"\s+", " ", text).strip()[:520]
    asset = {
        "assetId": asset_id,
        "fileName": file_name,
        "contentType": str(payload.get("contentType") or ""),
        "targetKind": target_kind,
        "createdAt": iso_like(now),
        "metadata": metadata,
        "textPreview": text[:1200],
    }
    result: dict[str, Any] = {"ok": True, "asset": asset}
    if target_kind == "lane":
        result["lane"] = {
            "id": f"lane_file_{slug}",
            "label": base_label,
            "type": f"uploaded {metadata.get('fileKind') or 'file'} source",
            "status": "Processed",
            "data": preview,
            "assetId": asset_id,
            "fileName": file_name,
            "contentType": str(payload.get("contentType") or ""),
            "textPreview": text[:1200],
        }
    else:
        result["skill"] = {
            "id": f"staff_skill_file_{slug}",
            "label": base_label,
            "scope": "Uploaded file",
            "rule": f"Use the uploaded file `{file_name}` as staff guidance. Extracted preview: {preview}",
            "assetId": asset_id,
            "fileName": file_name,
            "contentType": str(payload.get("contentType") or ""),
            "textPreview": text[:1200],
        }
    return result


def list_seo_staff_profile_stages(department_id: str = "", staff_id: str = "") -> dict[str, Any]:
    init_db()
    department_id = str(department_id or SEO_DEMAND_ENGINE_DEPARTMENT_ID).strip() or SEO_DEMAND_ENGINE_DEPARTMENT_ID
    staff_id = str(staff_id or "").strip()
    if staff_id and staff_id not in SEO_STAFF_PROFILE_IDS:
        return {"ok": False, "error": f"Unsupported SEO staff profile: {staff_id}"}
    with connect() as conn:
        if staff_id:
            rows = conn.execute(
                "SELECT * FROM seo_staff_profile_stage_overrides WHERE department_id = ? AND staff_id = ?",
                (department_id, staff_id),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM seo_staff_profile_stage_overrides WHERE department_id = ?",
                (department_id,),
            ).fetchall()
    profiles = {}
    for row in rows:
        stages = parse_json_text(row["payload"], [])
        safe_stages = [
            sanitize_seo_staff_profile_stage(stage, row["staff_id"], index)
            for index, stage in enumerate(stages if isinstance(stages, list) else [])
        ]
        profiles[row["staff_id"]] = {
            "staffId": row["staff_id"],
            "stages": safe_stages,
            "settings": load_seo_staff_profile_settings(department_id, row["staff_id"]),
            "hasStageOverride": True,
            "updatedAt": iso_like(row["updated_at"]),
            "updatedBy": row["updated_by"],
        }
    if staff_id and staff_id not in profiles:
        profiles[staff_id] = {
            "staffId": staff_id,
            "stages": [],
            "settings": load_seo_staff_profile_settings(department_id, staff_id),
            "hasStageOverride": False,
        }
    return {
        "ok": True,
        "departmentId": department_id,
        "staffId": staff_id,
        "stages": (profiles.get(staff_id) or {}).get("stages", []) if staff_id else [],
        "profile": profiles.get(staff_id, {}) if staff_id else {},
        "profiles": profiles,
    }


def save_seo_staff_profile_stages(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()
    department_id = str(payload.get("departmentId") or SEO_DEMAND_ENGINE_DEPARTMENT_ID).strip() or SEO_DEMAND_ENGINE_DEPARTMENT_ID
    staff_id = str(payload.get("staffId") or "").strip()
    if staff_id not in SEO_STAFF_PROFILE_IDS:
        return {"ok": False, "error": f"Unsupported SEO staff profile: {staff_id or 'missing'}"}
    if bool(payload.get("clear")):
        with connect() as conn:
            before = conn.execute(
                "SELECT payload FROM seo_staff_profile_stage_overrides WHERE department_id = ? AND staff_id = ?",
                (department_id, staff_id),
            ).fetchone()
            conn.execute(
                "DELETE FROM seo_staff_profile_stage_overrides WHERE department_id = ? AND staff_id = ?",
                (department_id, staff_id),
            )
        version = record_department_version(
            object_type="seoStaffProfileStages",
            object_id=f"{department_id}:{staff_id}",
            action="Reset SEO staff profile stages",
            before_payload=parse_json_text(before["payload"], []) if before else [],
            after_payload=[],
            created_by=str(payload.get("updatedBy") or "Human_Iman"),
            reason=str(payload.get("reason") or "SEO staff profile stage override reset."),
        )
        return {
            "ok": True,
            "departmentId": department_id,
            "staffId": staff_id,
            "stages": [],
            "cleared": True,
            "updatedAt": iso_like(),
            "updatedBy": str(payload.get("updatedBy") or "Human_Iman"),
            "version": version,
        }
    raw_stages = payload.get("stages") if isinstance(payload.get("stages"), list) else []
    stages = [sanitize_seo_staff_profile_stage(stage, staff_id, index) for index, stage in enumerate(raw_stages)]
    now = utc_ts()
    updated_by = str(payload.get("updatedBy") or "Human_Iman").strip() or "Human_Iman"
    settings = None
    if isinstance(payload.get("settings"), dict):
        settings = save_seo_staff_profile_settings(department_id, staff_id, payload.get("settings"), updated_by)
    with connect() as conn:
        before = conn.execute(
            "SELECT payload FROM seo_staff_profile_stage_overrides WHERE department_id = ? AND staff_id = ?",
            (department_id, staff_id),
        ).fetchone()
        conn.execute(
            """
            INSERT INTO seo_staff_profile_stage_overrides (
              department_id, staff_id, payload, created_at, updated_at, updated_by
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(department_id, staff_id) DO UPDATE SET
              payload = excluded.payload,
              updated_at = excluded.updated_at,
              updated_by = excluded.updated_by
            """,
            (
                department_id,
                staff_id,
                json.dumps(stages, ensure_ascii=False, default=str),
                now,
                now,
                updated_by,
            ),
        )
    version = record_department_version(
        object_type="seoStaffProfileStages",
        object_id=f"{department_id}:{staff_id}",
        action="Update SEO staff profile stages",
        before_payload=parse_json_text(before["payload"], []) if before else [],
        after_payload=stages,
        created_by=updated_by,
        reason=str(payload.get("reason") or "SEO staff profile stage configuration updated."),
    )
    return {
        "ok": True,
        "departmentId": department_id,
        "staffId": staff_id,
        "stages": stages,
        "settings": settings or load_seo_staff_profile_settings(department_id, staff_id),
        "updatedAt": iso_like(now),
        "updatedBy": updated_by,
        "version": version,
    }


def seo_stage_override_context(department_id: str, staff_id: str) -> dict[str, Any]:
    profile = list_seo_staff_profile_stages(department_id, staff_id).get("profile") or {}
    stages = profile.get("stages") if isinstance(profile.get("stages"), list) else []
    lane_catalog: dict[str, Any] = {}
    skill_catalog: dict[str, Any] = {}
    lane_ids: list[str] = []
    skill_ids: list[str] = []
    for stage in stages:
        if not isinstance(stage, dict):
            continue
        for lane_id in seo_profile_list(stage.get("lanes")):
            if lane_id not in lane_ids:
                lane_ids.append(lane_id)
        for skill_id in seo_profile_list(stage.get("skills")):
            if skill_id not in skill_ids:
                skill_ids.append(skill_id)
        for key, value in seo_profile_dict(stage.get("laneCatalog")).items():
            if key:
                lane_catalog[key] = value
        for key, value in seo_profile_dict(stage.get("skillCatalog")).items():
            if key:
                skill_catalog[key] = value
    return {
        "settings": profile.get("settings") or load_seo_staff_profile_settings(department_id, staff_id),
        "assignedStages": stages,
        "laneIds": lane_ids,
        "skillIds": skill_ids,
        "laneCatalog": lane_catalog,
        "skillCatalog": skill_catalog,
        "hasStageOverride": bool(profile.get("hasStageOverride")),
        "updatedAt": profile.get("updatedAt") or "",
        "updatedBy": profile.get("updatedBy") or "",
    }


def seo_staff_actor_runtime_context(department_id: str, staff_id: str, input_payload: dict[str, Any] | None = None) -> dict[str, Any]:
    department_id = str(department_id or SEO_DEMAND_ENGINE_DEPARTMENT_ID).strip() or SEO_DEMAND_ENGINE_DEPARTMENT_ID
    staff_id = str(staff_id or "").strip()
    if staff_id not in SEO_STAFF_PROFILE_IDS:
        raise ValueError(f"Unsupported SEO staff actor: {staff_id or 'missing'}")
    fabric = load_capability_fabric()
    department = department_row_by_id(department_id)
    resolved = resolved_department_staff_context(department_id)
    assignments = list_department_staff_assignments(department_id).get("assignments") or []
    assignment = next((row for row in assignments if str(row.get("staffProfileId") or "") == staff_id), {})
    staff_context = (resolved.get("staff") or {}).get(staff_id) or {}
    contract = next((row for row in seo_staff_actor_contracts() if row.get("staffId") == staff_id), {})
    overrides = seo_stage_override_context(department_id, staff_id)
    stage = input_payload.get("stage") if isinstance(input_payload, dict) and isinstance(input_payload.get("stage"), dict) else {}
    subtask = input_payload.get("subtask") if isinstance(input_payload, dict) and isinstance(input_payload.get("subtask"), dict) else {}
    if not stage and overrides.get("assignedStages"):
        stage = overrides["assignedStages"][0]
    return {
        "departmentId": department_id,
        "staffId": staff_id,
        "actor": {
            "staffId": staff_id,
            "alias": contract.get("alias") or DEFAULT_STAFF_ALIASES.get(staff_id) or staff_label(staff_id),
            "title": contract.get("title") or SEO_STAFF_ACTOR_TITLES.get(staff_id) or staff_label(staff_id),
            "purpose": contract.get("purpose") or "",
            "canContactHuman": bool(contract.get("canContactHuman")),
            "reportsTo": "Human_Iman" if staff_id == "AIstaff_SEOManager" else "AIstaff_SEOManager",
            "activityName": contract.get("activityName") or seo_staff_actor_activity_name(staff_id),
            "windmillPath": contract.get("windmillPath") or f"/p/{seo_staff_actor_path(staff_id)}",
            "apiContract": contract.get("apiContract") or {},
        },
        "department": resolved.get("department") or {
            "id": department.get("id") or department_id,
            "label": department.get("label") or "",
            "purpose": department.get("purpose") or "",
            "approvalPolicy": department.get("approvalPolicy") or "",
        },
        "organization": resolved.get("organization") or {},
        "baseKnowledge": {
            "departmentDetail": department,
            "staffDetail": staff_context,
            "staffTemplate": (assignment.get("blueprint") or {}),
            "assignmentOverride": (assignment.get("assignment") or {}),
            "platformSafetySkills": resolved.get("platformSafetySkills") or [],
            "departmentSkills": resolved.get("departmentSkills") or [],
            "staffTemplateSkills": staff_context.get("skills") or [],
            "editableSkillRules": staff_context.get("editableSkillRules") or [],
            "skillResolutionOrder": resolved.get("skillResolutionOrder") or [],
        },
        "overrides": overrides,
        "selectedStage": stage,
        "selectedSubtask": subtask,
        "qualityPolicy": {
            "minimumScore": 0.75,
            "requiredChecks": ["has_summary", "has_next_action", "manager_route_respected", "has_validation"],
            "managerDecision": "Continue only when validation.passed is true; otherwise retry, reroute, or ask for missing input.",
        },
    }


def seo_actor_command_targets(command: str, requested: Any = None) -> list[str]:
    requested_ids = [item for item in seo_profile_list(requested) if item in SEO_STAFF_PROFILE_IDS]
    if requested_ids:
        return requested_ids
    text = normalize_text(command)
    routes = [
        ("AIstaff_SEOSourceAnalyst", ["transcript", "source", "notes", "requirement", "extract", "uploaded"]),
        ("AIstaff_SEOExpert", ["search console", "analytics", "keyword", "ranking", "rank", "performance", "traffic"]),
        ("AIstaff_CaseStudyMapper", ["case study", "proof", "evidence", "claim", "reference"]),
        ("AIstaff_SEOContentWriter", ["brief", "article", "draft", "content", "write", "metadata", "title"]),
        ("AIstaff_InternalLinkBuilder", ["internal link", "anchor", "inventory", "crawl", "existing page"]),
        ("AIstaff_SEOQAAnalyst", ["qa", "review", "validate", "quality", "check", "learn"]),
        ("AIstaff_WordPressPublisher", ["wordpress", "publish", "make.com", "make", "payload", "webhook"]),
    ]
    targets = [staff_id for staff_id, tokens in routes if any(token in text for token in tokens)]
    if not targets:
        targets = ["AIstaff_SEOSourceAnalyst"]
    return targets


def validate_seo_staff_actor_response(response: dict[str, Any], actor_context: dict[str, Any]) -> dict[str, Any]:
    staff_id = actor_context.get("staffId") or ""
    checks = [
        {"id": "has_summary", "label": "Response includes summary", "passed": bool(str(response.get("summary") or "").strip())},
        {"id": "has_next_action", "label": "Response includes next action", "passed": bool(str(response.get("nextAction") or "").strip())},
        {"id": "has_validation", "label": "Response includes validation object", "passed": isinstance(response.get("validation"), dict)},
        {
            "id": "manager_route_respected",
            "label": "Specialist response stays manager-facing",
            "passed": staff_id == "AIstaff_SEOManager" or not bool(response.get("humanFacingRequest")),
        },
        {
            "id": "has_context",
            "label": "Actor received base knowledge and overrides",
            "passed": bool(actor_context.get("baseKnowledge")) and "overrides" in actor_context,
        },
    ]
    passed_count = len([row for row in checks if row.get("passed")])
    score = passed_count / max(1, len(checks))
    passed = score >= float((actor_context.get("qualityPolicy") or {}).get("minimumScore") or 0.75) and all(
        row.get("passed") for row in checks if row.get("id") in {"has_summary", "has_next_action", "manager_route_respected"}
    )
    return {
        "passed": passed,
        "score": round(score, 2),
        "checks": checks,
        "nextDecision": "continue" if passed else "retry_or_reroute",
    }


def local_seo_staff_actor_response(command: str, actor_context: dict[str, Any], manager_command: dict[str, Any] | None = None) -> dict[str, Any]:
    actor = actor_context.get("actor") or {}
    overrides = actor_context.get("overrides") or {}
    selected_stage = actor_context.get("selectedStage") or {}
    selected_subtask = actor_context.get("selectedSubtask") or {}
    lane_count = len(overrides.get("laneIds") or [])
    skill_count = len(overrides.get("skillIds") or [])
    stage_label = selected_stage.get("label") or "assigned SEO stage"
    subtask_label = selected_subtask.get("label") or ""
    summary = (
        f"{actor.get('alias') or actor_context.get('staffId')} accepted the command for {stage_label}. "
        f"Runtime context includes {len(overrides.get('assignedStages') or [])} assigned stage(s), "
        f"{lane_count} lane override(s), and {skill_count} skill override(s)."
    )
    if subtask_label:
        summary += f" Active subtask: {subtask_label}."
    response = {
        "ok": True,
        "status": "done",
        "staffId": actor_context.get("staffId"),
        "alias": actor.get("alias") or "",
        "title": actor.get("title") or "",
        "command": command,
        "summary": summary,
        "result": {
            "stageId": selected_stage.get("id") or "",
            "stageGoal": selected_stage.get("goal") or "",
            "subtaskId": selected_subtask.get("id") or "",
            "lanesAvailable": overrides.get("laneIds") or [],
            "skillsAvailable": overrides.get("skillIds") or [],
            "settings": overrides.get("settings") or {},
            "managerCommandId": (manager_command or {}).get("commandId") or "",
        },
        "nextAction": "Return this manager-facing result to Sofia for validation and the next routing decision.",
        "humanFacingRequest": False,
        "validation": {"source": "local_actor_contract", "receivedActorContext": True},
    }
    response["validation"] = validate_seo_staff_actor_response(response, actor_context)
    return response


def seo_staff_actor_command(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()
    department_id = str(payload.get("departmentId") or SEO_DEMAND_ENGINE_DEPARTMENT_ID).strip() or SEO_DEMAND_ENGINE_DEPARTMENT_ID
    staff_id = str(payload.get("staffId") or payload.get("targetStaffId") or "").strip()
    if staff_id not in SEO_STAFF_PROFILE_IDS:
        return {"ok": False, "error": f"Unsupported SEO staff actor: {staff_id or 'missing'}"}
    command = str(payload.get("command") or payload.get("message") or "").strip()
    if not command:
        return {"ok": False, "error": "Missing command."}
    actor_context = seo_staff_actor_runtime_context(department_id, staff_id, payload)
    call_windmill = bool(payload.get("callWindmill")) and windmill_config()["configured"]
    windmill_result: dict[str, Any] = {}
    if call_windmill:
        requested = request_activity(
            {
                "departmentId": department_id,
                "activityName": seo_staff_actor_activity_name(staff_id),
                "dryRun": bool(payload.get("dryRun", False)),
                "requestedBy": str(payload.get("requestedBy") or "AIstaff_SEOManager"),
                "idempotencyKey": str(payload.get("idempotencyKey") or f"{department_id}:{staff_id}:{uuid.uuid4().hex[:12]}"),
                "input": {
                    "command": command,
                    "targetStaffId": staff_id,
                    "actorContext": actor_context,
                    "managerCommand": payload.get("managerCommand") if isinstance(payload.get("managerCommand"), dict) else {},
                    "stage": payload.get("stage") if isinstance(payload.get("stage"), dict) else {},
                    "subtask": payload.get("subtask") if isinstance(payload.get("subtask"), dict) else {},
                },
            }
        )
        activity = requested.get("activityRun") if requested.get("ok") else None
        if activity and activity.get("approvalState") != "Pending":
            windmill_result = run_activity({"activityRunId": activity.get("activityRunId")})
        else:
            windmill_result = {"ok": False, "error": requested.get("error") or "Windmill actor activity could not be requested.", "requested": requested}
    if windmill_result.get("ok"):
        raw = ((windmill_result.get("result") or {}).get("result") or windmill_result.get("result") or {})
        response = raw if isinstance(raw, dict) else {"ok": True, "summary": str(raw), "nextAction": "Return result to manager.", "validation": {}}
        response["validation"] = validate_seo_staff_actor_response(response, actor_context)
    else:
        response = local_seo_staff_actor_response(command, actor_context, payload.get("managerCommand") if isinstance(payload.get("managerCommand"), dict) else {})
    return {
        "ok": bool((response.get("validation") or {}).get("passed", response.get("ok", True))),
        "departmentId": department_id,
        "staffId": staff_id,
        "actorContext": actor_context,
        "response": response,
        "validation": response.get("validation") or validate_seo_staff_actor_response(response, actor_context),
        "windmill": {
            "called": bool(windmill_result),
            "configured": windmill_config()["configured"],
            "activityName": seo_staff_actor_activity_name(staff_id),
            "path": f"/p/{seo_staff_actor_path(staff_id)}",
            "result": windmill_result,
        },
    }


def seo_manager_command(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()
    department_id = str(payload.get("departmentId") or SEO_DEMAND_ENGINE_DEPARTMENT_ID).strip() or SEO_DEMAND_ENGINE_DEPARTMENT_ID
    command = str(payload.get("command") or payload.get("message") or "").strip()
    if not command:
        return {"ok": False, "error": "Missing command."}
    manager_context = seo_staff_actor_runtime_context(department_id, "AIstaff_SEOManager", payload)
    targets = seo_actor_command_targets(command, payload.get("targetStaffIds") or payload.get("targetStaffId"))
    if bool(payload.get("runFullFlow")):
        targets = [staff_id for staff_id in SEO_STAFF_ACTOR_ORDER if staff_id != "AIstaff_SEOManager"]
    command_id = f"seo_cmd_{uuid.uuid4().hex[:12]}"
    manager_decision = {
        "commandId": command_id,
        "manager": "AIstaff_SEOManager",
        "summary": f"Sofia received the panel command and routed it to {len(targets)} actor(s).",
        "targets": targets,
        "validationPolicy": manager_context.get("qualityPolicy") or {},
        "nextAction": "Call each selected actor, validate the response, then continue, retry, reroute, or pause.",
    }
    staff_responses: list[dict[str, Any]] = []
    blocked = False
    for staff_id in targets:
        result = seo_staff_actor_command(
            {
                **payload,
                "departmentId": department_id,
                "staffId": staff_id,
                "command": command,
                "requestedBy": "AIstaff_SEOManager",
                "managerCommand": manager_decision,
                "callWindmill": bool(payload.get("callWindmill")),
                "dryRun": bool(payload.get("dryRun", True)),
            }
        )
        staff_responses.append(result)
        if not (result.get("validation") or {}).get("passed"):
            blocked = True
            break
    return {
        "ok": not blocked,
        "departmentId": department_id,
        "commandId": command_id,
        "managerContext": manager_context,
        "managerDecision": {
            **manager_decision,
            "status": "blocked_validation" if blocked else "ready_to_continue",
            "nextAction": "Retry or reroute the failed actor response before continuing." if blocked else "Continue the SEO action flow or request approval for external execution.",
        },
        "staffResponses": staff_responses,
        "validation": {
            "passed": not blocked,
            "responseCount": len(staff_responses),
            "failedActors": [
                row.get("staffId")
                for row in staff_responses
                if not (row.get("validation") or {}).get("passed")
            ],
        },
        "windmill": {
            "configured": windmill_config()["configured"],
            "managerActivityName": "worldbc.seo.manager.command",
            "managerPath": f"/p/{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_manager_command",
            "actorContracts": seo_staff_actor_contracts(),
        },
    }


def seo_actor_manifest(department_id: str = "") -> dict[str, Any]:
    department_id = str(department_id or SEO_DEMAND_ENGINE_DEPARTMENT_ID).strip() or SEO_DEMAND_ENGINE_DEPARTMENT_ID
    return {
        "ok": True,
        "departmentId": department_id,
        "manager": seo_staff_actor_runtime_context(department_id, "AIstaff_SEOManager"),
        "actors": [
            seo_staff_actor_runtime_context(department_id, staff_id)
            for staff_id in SEO_STAFF_ACTOR_ORDER
        ],
        "bindings": seo_staff_actor_default_activity_bindings(),
    }


DEFAULT_ACTIVITY_BINDINGS = [
    {
        "bindingId": "binding_department_seo_demand_engine_workflow",
        "departmentId": SEO_DEMAND_ENGINE_DEPARTMENT_ID,
        "activityName": "worldbc.seo.run_workflow",
        "label": "WorldBC SEO Workflow",
        "windmillPath": f"/p/{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_staff_flow",
        "approvalRequired": False,
        "dryRunSupported": True,
        "status": "Active",
        "runnableKind": "flow",
        "summary": "Run the supervised SEO demand-engine workflow in Windmill: source intake, keyword brief, draft package, QA, and approval-ready WordPress payload.",
    },
    {
        "bindingId": "binding_department_seo_demand_engine_wordpress_draft",
        "departmentId": SEO_DEMAND_ENGINE_DEPARTMENT_ID,
        "activityName": "worldbc.wordpress.create_draft",
        "label": "WorldBC SEO WordPress Draft",
        "windmillPath": f"/p/{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_wordpress_draft",
        "approvalRequired": True,
        "dryRunSupported": True,
        "status": "Active",
        "summary": "Create a supervised WorldBC WordPress draft through Windmill. Publishing/draft creation still requires explicit approval.",
    },
    {
        "bindingId": "binding_department_seo_demand_engine_search_console",
        "departmentId": SEO_DEMAND_ENGINE_DEPARTMENT_ID,
        "activityName": "worldbc.search_console.query",
        "label": "WorldBC SEO Search Console Query",
        "windmillPath": f"/p/{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_search_console_query",
        "approvalRequired": False,
        "dryRunSupported": True,
        "status": "Active",
        "summary": "Read WorldBC SEO query/page performance through the department Search Console connection.",
    },
    {
        "bindingId": "binding_department_seo_demand_engine_webhook",
        "departmentId": SEO_DEMAND_ENGINE_DEPARTMENT_ID,
        "activityName": "worldbc.make.webhook_call",
        "label": "WorldBC SEO Make.com Webhook",
        "windmillPath": f"/p/{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_generic_webhook",
        "approvalRequired": True,
        "dryRunSupported": True,
        "status": "Active",
        "summary": "Call approved WorldBC SEO Make.com scenarios from Windmill after human approval.",
    },
    {
        "bindingId": "binding_department_seo_demand_engine_text_extract",
        "departmentId": SEO_DEMAND_ENGINE_DEPARTMENT_ID,
        "activityName": "worldbc.file.text_extract",
        "label": "WorldBC SEO Text Reader",
        "windmillPath": f"/p/{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_text_extract",
        "approvalRequired": False,
        "dryRunSupported": True,
        "status": "Active",
        "summary": "Safe internal extraction for WorldBC pasted transcripts, notes, and source text.",
    },
]


def seo_staff_actor_default_activity_bindings() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = [
        {
            "bindingId": "binding_department_seo_demand_engine_manager_command",
            "departmentId": SEO_DEMAND_ENGINE_DEPARTMENT_ID,
            "activityName": "worldbc.seo.manager.command",
            "label": "Sofia Manager Command API",
            "windmillPath": f"/p/{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_manager_command",
            "approvalRequired": False,
            "dryRunSupported": True,
            "status": "Active",
            "summary": "Manager-facing command endpoint that receives panel commands, resolves actor context, and returns a validation-gated routing plan.",
        }
    ]
    for contract in seo_staff_actor_contracts():
        rows.append(
            {
                "bindingId": f"binding_department_seo_demand_engine_actor_{seo_staff_actor_slug(contract['staffId'])}",
                "departmentId": SEO_DEMAND_ENGINE_DEPARTMENT_ID,
                "activityName": contract["activityName"],
                "label": f"{contract['alias']} Actor API",
                "windmillPath": contract["windmillPath"],
                "approvalRequired": False,
                "dryRunSupported": True,
                "status": "Active",
                "summary": contract["purpose"],
            }
        )
    return rows


LEGACY_ACTIVITY_BINDING_IDS = {
    "binding_worldbc_wordpress_draft",
    "binding_worldbc_search_console_query",
    "binding_generic_webhook_call",
    "binding_local_text_extract",
}


LEGACY_WINDMILL_SCRIPT_PATHS = [
    "f/shared/generic_webhook_call",
    "f/shared/local_text_extract",
    "f/worldbc/search_console_query",
    "f/worldbc/wordpress_create_draft",
    "u/admin/generic_webhook_call",
    "u/admin/local_text_extract",
    "u/admin/shared/generic_webhook_call",
    "u/admin/shared/local_text_extract",
    "u/admin/worldbc_search_console_query",
    "u/admin/worldbc_wordpress_create_draft",
    "u/admin/worldbc/search_console_query",
    "u/admin/worldbc/wordpress_create_draft",
]


def archive_legacy_activity_bindings() -> None:
    now = utc_ts()
    with connect() as conn:
        conn.executemany(
            "UPDATE activity_bindings SET status = 'Archived', updated_at = ? WHERE binding_id = ?",
            [(now, binding_id) for binding_id in LEGACY_ACTIVITY_BINDING_IDS],
        )


def ensure_default_activity_bindings() -> None:
    now = utc_ts()
    with connect() as conn:
        for row in [*DEFAULT_ACTIVITY_BINDINGS, *seo_staff_actor_default_activity_bindings()]:
            payload = {
                "summary": row.get("summary", ""),
                "handler": "windmill",
                "batch": "seo_staff_actor_runtime",
                "runnableKind": row.get("runnableKind", "script"),
                "actorContract": next((contract for contract in seo_staff_actor_contracts() if contract.get("activityName") == row.get("activityName")), {}),
            }
            conn.execute(
                """
                INSERT INTO activity_bindings (
                  binding_id, department_id, activity_name, label, handler_type,
                  windmill_path, approval_required, dry_run_supported, status,
                  source_payload, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, 'windmill', ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(binding_id) DO UPDATE SET
                  department_id=excluded.department_id,
                  activity_name=excluded.activity_name,
                  label=excluded.label,
                  handler_type=excluded.handler_type,
                  windmill_path=excluded.windmill_path,
                  approval_required=excluded.approval_required,
                  dry_run_supported=excluded.dry_run_supported,
                  status=excluded.status,
                  source_payload=excluded.source_payload,
                  updated_at=excluded.updated_at
                """,
                (
                    row["bindingId"],
                    row.get("departmentId", "*"),
                    row["activityName"],
                    row["label"],
                    row.get("windmillPath", ""),
                    1 if row.get("approvalRequired", True) else 0,
                    1 if row.get("dryRunSupported", True) else 0,
                    row.get("status", "Active"),
                    json.dumps(payload, default=str),
                    now,
                    now,
                ),
            )


def windmill_config() -> dict[str, Any]:
    base_url = local_env_value("WINDMILL_BASE_URL", "").rstrip("/")
    workspace = local_env_value("WINDMILL_WORKSPACE", "")
    token = local_env_value("WINDMILL_TOKEN", "")
    mcp_url = local_env_value("WINDMILL_MCP_URL", "")
    make_webhook_url = local_env_value("WORLDBC_WORDPRESS_MAKE_WEBHOOK_URL", "") or local_env_value("WORLDBC_MAKE_WEBHOOK_URL", "")
    return {
        "baseUrl": base_url,
        "workspace": workspace,
        "tokenConfigured": bool(token),
        "tokenPreview": "",
        "mcpConfigured": bool(mcp_url),
        "mcpUrlPreview": redact_url_secret(mcp_url),
        "wordpressWebhookConfigured": bool(make_webhook_url),
        "configured": bool(base_url and workspace and token),
        "mockMode": not bool(base_url and workspace and token),
    }


def redact_url_secret(url: str) -> str:
    if not url:
        return ""
    try:
        parsed = urllib.parse.urlsplit(url)
        query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
        redacted = []
        for key, value in query:
            if normalize_text(key) in {"token", "key", "secret", "password"} and value:
                redacted.append((key, "***"))
            else:
                redacted.append((key, value))
        return urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urllib.parse.urlencode(redacted), parsed.fragment))
    except Exception:
        return url[:28] + "..." if len(url) > 32 else "***"


SENSITIVE_ACTIVITY_KEYS = {
    "makewebhookurl",
    "webhookurl",
    "webhook_url",
    "token",
    "secret",
    "password",
    "apikey",
    "api_key",
    "authorization",
}


def redact_sensitive_activity_payload(value: Any, parent_key: str = "") -> Any:
    normalized_key = normalize_text(parent_key).replace(" ", "").replace("-", "").replace("_", "")
    if normalized_key in {key.replace("_", "") for key in SENSITIVE_ACTIVITY_KEYS}:
        return "***"
    if isinstance(value, dict):
        return {str(key): redact_sensitive_activity_payload(item, str(key)) for key, item in value.items()}
    if isinstance(value, list):
        return [redact_sensitive_activity_payload(item, parent_key) for item in value]
    if isinstance(value, str) and ("hook.eu" in value or "make.com" in value or "token=" in value.lower()):
        return "***"
    return value


def windmill_status() -> dict[str, Any]:
    ensure_default_activity_bindings()
    config = windmill_config()
    with connect() as conn:
        bindings = conn.execute("SELECT COUNT(*) AS c FROM activity_bindings WHERE status != 'Archived'").fetchone()["c"]
        runs = conn.execute(
            """
            SELECT status, COUNT(*) AS c
            FROM activity_runs
            GROUP BY status
            """
        ).fetchall()
    counts = {str(row["status"] or "Unknown"): int(row["c"] or 0) for row in runs}
    return {
        "configured": config["configured"],
        "mockMode": config["mockMode"],
        "baseUrl": config["baseUrl"],
        "workspace": config["workspace"],
        "tokenConfigured": config["tokenConfigured"],
        "tokenPreview": config["tokenPreview"],
        "mcpConfigured": config["mcpConfigured"],
        "mcpUrlPreview": config["mcpUrlPreview"],
        "wordpressWebhookConfigured": config["wordpressWebhookConfigured"],
        "setupGuidance": "Set WINDMILL_BASE_URL, WINDMILL_WORKSPACE, WINDMILL_TOKEN, and optionally WINDMILL_MCP_URL in the environment or .env.local. Do not save secrets in capability_fabric.json.",
        "activityBindings": int(bindings or 0),
        "activityRunCounts": counts,
        "lastTest": parse_json_meta("windmill_last_test", {}),
        "lastProvision": parse_json_meta("windmill_last_provision", {}),
        "lastCleanup": parse_json_meta("windmill_last_cleanup", {}),
    }


def windmill_ssl_context() -> ssl.SSLContext | None:
    try:
        import certifi  # type: ignore

        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return None


def test_windmill_connection(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    config = windmill_config()
    now = utc_ts()
    if not config["configured"]:
        result = {
            "ok": True,
            "configured": False,
            "mockMode": True,
            "message": "Windmill is not configured. Local mock mode is available for approved dry-run activities.",
            "testedAt": iso_like(now),
        }
        set_meta("windmill_last_test", result)
        return {"ok": True, "windmill": windmill_status(), "test": result}
    url = f"{config['baseUrl']}/api/version"
    request = urllib.request.Request(url, method="GET", headers={"Authorization": f"Bearer {local_env_value('WINDMILL_TOKEN', '')}"})
    try:
        with urllib.request.urlopen(request, timeout=15, context=windmill_ssl_context()) as response:
            body = response.read().decode("utf-8", errors="replace")
        result = {
            "ok": True,
            "configured": True,
            "mockMode": False,
            "message": "Windmill responded to the version check.",
            "statusCode": 200,
            "details": body[:500],
            "testedAt": iso_like(now),
        }
    except Exception as exc:
        result = {
            "ok": False,
            "configured": True,
            "mockMode": False,
            "message": f"Windmill connection test failed: {exc}",
            "testedAt": iso_like(now),
        }
    set_meta("windmill_last_test", result)
    return {"ok": bool(result.get("ok")), "windmill": windmill_status(), "test": result}


def windmill_api_json(method: str, path: str, body: dict[str, Any] | None = None, timeout: int = 30) -> dict[str, Any]:
    config = windmill_config()
    if not config["configured"]:
        return {"ok": False, "error": "Windmill is not configured."}
    token = local_env_value("WINDMILL_TOKEN", "")
    url = f"{config['baseUrl']}{path}"
    data = json.dumps(body or {}, ensure_ascii=False, default=str).encode("utf-8") if body is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout, context=windmill_ssl_context()) as response:
            raw = response.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw) if raw.strip() else {}
        except Exception:
            parsed = {"raw": raw[:2000]}
        return {"ok": True, "statusCode": 200, "body": parsed}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")[:2000]
        try:
            parsed = json.loads(raw) if raw else {}
        except Exception:
            parsed = {"raw": raw}
        return {"ok": False, "statusCode": exc.code, "error": raw or str(exc), "body": parsed}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


def windmill_workspace_path() -> str:
    workspace = urllib.parse.quote(windmill_config()["workspace"], safe="")
    return f"/api/w/{workspace}"


def windmill_archive_script(path: str) -> dict[str, Any]:
    clean_path = str(path or "").strip().strip("/")
    if not clean_path:
        return {"ok": False, "path": path, "error": "Missing Windmill script path."}
    result = windmill_api_json(
        "POST",
        f"{windmill_workspace_path()}/scripts/archive/p/{urllib.parse.quote(clean_path, safe='/')}",
        {},
        timeout=30,
    )
    status_code = int(result.get("statusCode") or 0)
    ok = bool(result.get("ok")) or status_code in {200, 204, 404}
    return {
        "ok": ok,
        "path": clean_path,
        "statusCode": status_code or None,
        "error": "" if ok else str(result.get("error") or ""),
    }


def windmill_script_by_path(path: str) -> dict[str, Any]:
    clean_path = urllib.parse.quote(path.strip().lstrip("/"), safe="/")
    return windmill_api_json("GET", f"{windmill_workspace_path()}/scripts/get/p/{clean_path}", timeout=20)


def windmill_flow_by_path(path: str) -> dict[str, Any]:
    clean_path = urllib.parse.quote(path.strip().lstrip("/"), safe="/")
    return windmill_api_json("GET", f"{windmill_workspace_path()}/flows/get/{clean_path}", timeout=20)


def windmill_create_or_update_script(script: dict[str, Any]) -> dict[str, Any]:
    path = str(script.get("path") or "").strip().lstrip("/")
    if not path:
        return {"ok": False, "error": "Missing Windmill script path."}
    existing = windmill_script_by_path(path)
    parent_hash = ""
    if existing.get("ok") and isinstance(existing.get("body"), dict):
        parent_hash = str((existing.get("body") or {}).get("hash") or "")
    elif existing.get("statusCode") not in {404, 400}:
        return {"ok": False, "path": path, "error": existing.get("error") or "Could not inspect existing Windmill script."}
    payload = {
        "path": path,
        "summary": script.get("summary") or "",
        "description": script.get("description") or "",
        "content": script.get("content") or "",
        "schema": script.get("schema") or {},
        "language": script.get("language") or "python3",
        "kind": "script",
        "deployment_message": script.get("deploymentMessage") or "Provisioned from AI Department local control plane.",
    }
    if script.get("tag"):
        payload["tag"] = script.get("tag")
    if parent_hash:
        payload["parent_hash"] = parent_hash
    created = windmill_api_json("POST", f"{windmill_workspace_path()}/scripts/create", payload, timeout=45)
    return {
        "ok": bool(created.get("ok")),
        "path": path,
        "updated": bool(parent_hash),
        "statusCode": created.get("statusCode"),
        "error": created.get("error", ""),
        "result": created.get("body"),
    }


def windmill_create_or_update_flow(flow: dict[str, Any]) -> dict[str, Any]:
    path = str(flow.get("path") or "").strip().lstrip("/")
    if not path:
        return {"ok": False, "error": "Missing Windmill flow path."}
    existing = windmill_flow_by_path(path)
    is_update = existing.get("ok") and isinstance(existing.get("body"), dict)
    if not is_update and existing.get("statusCode") not in {404, 400}:
        return {"ok": False, "path": path, "error": existing.get("error") or "Could not inspect existing Windmill flow."}
    payload = {
        "path": path,
        "summary": flow.get("summary") or "",
        "description": flow.get("description") or "",
        "value": flow.get("value") or {"modules": []},
        "schema": flow.get("schema") or {},
        "tag": flow.get("tag") or "",
        "deployment_message": flow.get("deploymentMessage") or "Provisioned from AI Department local control plane.",
    }
    endpoint = f"{windmill_workspace_path()}/flows/update/{urllib.parse.quote(path, safe='')}" if is_update else f"{windmill_workspace_path()}/flows/create"
    created = windmill_api_json("POST", endpoint, payload, timeout=45)
    return {
        "ok": bool(created.get("ok")),
        "path": path,
        "updated": bool(is_update),
        "statusCode": created.get("statusCode"),
        "error": created.get("error", ""),
        "result": created.get("body"),
    }


def windmill_static(value: Any) -> dict[str, Any]:
    return {"type": "static", "value": value}


def windmill_expr(expr: str) -> dict[str, Any]:
    return {"type": "javascript", "expr": expr}


def seo_flow_stage_module(stage_id: str, label: str, staff_id: str, staff_alias: str, mode: str, summary: str, extra: dict[str, Any] | None = None) -> dict[str, Any]:
    transforms = {
        "stageId": windmill_static(stage_id),
        "stageLabel": windmill_static(label),
        "staffId": windmill_static(staff_id),
        "staffAlias": windmill_static(staff_alias),
        "targetStaffId": windmill_static(staff_id),
        "command": windmill_static(summary),
        "mode": windmill_static(mode),
        "summary": windmill_static(summary),
        "activityRun": windmill_expr("flow_input.activityRun"),
        "input": windmill_expr("flow_input.input"),
        "staffContext": windmill_expr("flow_input.staffContext || {}"),
        "actorContext": windmill_expr(f"(flow_input.actorContexts || {{}})['{staff_id}'] || {{}}"),
        "managerCommand": windmill_expr("flow_input.managerCommand || {}"),
        "stage": windmill_static({"id": stage_id, "label": label, "mode": mode, "ownerStaff": staff_id, "description": summary}),
        "previous": windmill_expr("results || {}"),
        "extra": windmill_static(extra or {}),
    }
    return {
        "id": stage_id,
        "summary": f"{staff_alias} - {label}",
        "value": {
            "type": "script",
            "path": seo_staff_actor_path(staff_id),
            "input_transforms": transforms,
        },
    }


def windmill_seo_staff_flow() -> dict[str, Any]:
    modules = [
        seo_flow_stage_module("sofia_manager_intake", "Manager Intake", "AIstaff_SEOManager", "Sofia", "manager_intake", "Clarify objective, safety gates, and routing."),
        seo_flow_stage_module("tess_source_review", "Source Text Review", "AIstaff_SEOSourceAnalyst", "Tess", "source_review", "Read transcript/source material and extract reusable points."),
        seo_flow_stage_module("nora_seo_expert_analysis", "SEO Expert Analysis", "AIstaff_SEOExpert", "Nora", "seo_expert_analysis", "Use active SEO lanes such as Search Console, Analytics, Keyword Planner, GCP, local exports, and SEO research tools; report missing lanes and choose the right analysis template."),
        seo_flow_stage_module("cora_evidence_map", "Case Study And Evidence Map", "AIstaff_CaseStudyMapper", "Cora", "evidence_map", "Map proof, examples, references, and claims that need support."),
        seo_flow_stage_module("hermes_content_brief", "SEO Brief And Draft", "AIstaff_SEOContentWriter", "Hermes", "content_brief", "Create the SEO brief, draft outline, article angle, and metadata inputs from approved evidence."),
        seo_flow_stage_module("iris_internal_links", "Internal Link Plan", "AIstaff_InternalLinkBuilder", "Iris", "internal_linking", "Suggest relevant internal links, anchors, and content inventory gaps before publishing."),
        seo_flow_stage_module("vera_seo_qa", "SEO QA Review", "AIstaff_SEOQAAnalyst", "Vera", "seo_qa", "Check metadata, duplicate risk, content quality, references, and publishing readiness."),
        seo_flow_stage_module("priya_wordpress_handoff", "WordPress Draft Handoff", "AIstaff_WordPressPublisher", "Priya", "wordpress_handoff", "Prepare WordPress/Make.com draft handoff and block external action until approval."),
        {
            "id": "sofia_approval_package",
            "summary": "Sofia - Approval-Ready WordPress Package",
            "value": {
                "type": "script",
                "path": f"{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_workflow",
                "input_transforms": {
                    "activityRun": windmill_expr("flow_input.activityRun"),
                    "input": windmill_expr("{...(flow_input.input || {}), staffContext: flow_input.staffContext || {}, staffStageResults: results || {}}"),
                    "mode": windmill_static("approval_package"),
                    "dry_run": windmill_expr("(flow_input.activityRun || {}).dryRun !== false"),
                },
            },
        },
    ]
    return {
        "path": f"{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_staff_flow",
        "summary": "WorldBC SEO Demand Engine staff flow",
        "description": "Visual Windmill flow for the WorldBC SEO department. Each module is labeled by AI staff role; publishing remains approval-gated in the AI Department app.",
        "schema": {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "type": "object",
            "properties": {
                "activityRun": {"type": "object"},
                "input": {"type": "object"},
                "staffContext": {"type": "object"},
            },
        },
        "value": {
            "modules": modules,
            "same_worker": False,
            "concurrent_limit": 3,
        },
        "tag": "",
    }


def windmill_starter_scripts() -> list[dict[str, Any]]:
    activity_schema = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "activityRun": {"type": "object", "description": "AI Department activity run metadata."},
            "input": {"type": "object", "description": "Activity input payload."},
        },
        "required": [],
    }
    wordpress_script = r'''
import json
import os
import re
import urllib.request
import urllib.error


def _as_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return [value]


def _as_int_category_list(value):
    rows = _as_list(value)
    out = []
    for item in rows:
        try:
            out.append(int(item))
        except Exception:
            continue
    return out[:1]


def _word_count(html):
    text = re.sub(r"<[^>]+>", " ", html or "")
    return len(re.findall(r"\b[\w'-]+\b", text))


def _has_clean_html(html):
    text = html or ""
    return all(token in text for token in ["<h2", "<p"]) and "style=" not in text.lower()


def _post_json(url, payload):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=45) as res:
        raw = res.read().decode("utf-8", errors="replace")
    try:
        return json.loads(raw) if raw.strip() else {"status": "empty_response"}
    except Exception:
        return {"raw": raw[:1000]}


def _walk_dicts(value):
    if isinstance(value, dict):
        yield value
        for item in value.values():
            yield from _walk_dicts(item)
    elif isinstance(value, list):
        for item in value:
            yield from _walk_dicts(item)


def _first_value(result, keys):
    key_set = {key.lower() for key in keys}
    for row in _walk_dicts(result):
        for key, value in row.items():
            if str(key).lower() in key_set and value not in (None, ""):
                if isinstance(value, dict) and "rendered" in value:
                    return value.get("rendered")
                return value
    return ""


def _normalize_wordpress_draft(result, payload):
    draft_id = _first_value(result, ["id", "ID", "postId", "post_id", "draftId", "draft_id"])
    draft_url = _first_value(result, ["link", "url", "permalink", "postUrl", "post_url", "draftUrl", "draft_url", "guid"])
    status = _first_value(result, ["status", "postStatus", "post_status"]) or payload.get("status") or "draft"
    created_at = _first_value(result, ["date", "date_gmt", "createdAt", "created_at", "createdDate", "created_date", "modified", "modified_gmt"])
    return {
        "id": str(draft_id or ""),
        "url": str(draft_url or ""),
        "status": str(status or "draft"),
        "createdAt": str(created_at or ""),
        "rawReturned": bool(result),
    }


def main(activityRun=None, input=None):
    activityRun = activityRun or {}
    data = input or {}
    dry_run = bool(data.get("dryRun") or activityRun.get("dryRun"))
    approved = activityRun.get("approvalState") == "Approved"
    title = data.get("title") or data.get("seoTitle") or data.get("draftTitle") or ""
    content = data.get("content") or data.get("html") or data.get("articleHtml") or data.get("draftContent") or ""
    excerpt = data.get("excerpt") or data.get("metaDescription") or ""
    categories = _as_int_category_list(data.get("categories"))
    tags = _as_list(data.get("tags"))
    status = data.get("status") or "draft"
    payload = {
        "title": title,
        "content": content,
        "excerpt": excerpt,
        "categories": categories,
        "tags": tags,
        "status": status,
    }
    checklist = {
        "hasTitle": bool(title),
        "titleLengthTarget": 50 <= len(title) <= 60,
        "hasHtmlContent": _has_clean_html(content),
        "wordCountTarget": 900 <= _word_count(content) <= 1600,
        "hasExcerpt": bool(excerpt),
        "excerptLengthTarget": 140 <= len(excerpt) <= 160 and '"' not in excerpt,
        "hasH2H3Headings": "<h2" in content and "<h3" in content,
        "hasKeyTakeaways": "key takeaways" in content.lower(),
        "hasReferences": "references" in content.lower() and "rel=\"nofollow\"" in content.lower(),
        "hasOneCategoryId": len(categories) == 1 and isinstance(categories[0], int),
        "hasTags": 3 <= len(tags) <= 8,
        "defaultDraftStatus": status == "draft" or bool(data.get("explicitPublishApproval")),
        "approvalState": activityRun.get("approvalState", ""),
        "dryRun": dry_run,
    }
    missing = [key for key, ok in checklist.items() if key not in {"approvalState", "dryRun"} and not ok]
    if missing:
        return {"ok": False, "status": "blocked", "summary": "WordPress draft blocked by missing fields.", "missing": missing, "checklist": checklist}
    if not approved:
        return {"ok": False, "status": "approval_required", "summary": "External WordPress draft creation requires AI Department approval.", "checklist": checklist}
    webhook_url = data.get("makeWebhookUrl") or os.environ.get("WORLDBC_WORDPRESS_MAKE_WEBHOOK_URL") or os.environ.get("MAKE_WORDPRESS_WEBHOOK_URL")
    if dry_run:
        return {"ok": True, "status": "dry_run_done", "summary": "WordPress draft payload validated. No external webhook was called.", "payloadPreview": {k: payload[k] for k in ["title", "excerpt", "categories", "tags"]}, "checklist": checklist}
    if not webhook_url:
        return {"ok": False, "status": "needs_configuration", "summary": "Make/WordPress webhook URL is not configured in Windmill or activity input.", "checklist": checklist}
    result = _post_json(webhook_url, payload)
    wordpress_draft = _normalize_wordpress_draft(result, payload)
    return {
        "ok": True,
        "status": "draft_requested",
        "summary": "WordPress draft request sent through Make/Windmill.",
        "wordpressDraft": wordpress_draft,
        "wordpressDraftId": wordpress_draft.get("id"),
        "wordpressDraftUrl": wordpress_draft.get("url"),
        "wordpressDraftStatus": wordpress_draft.get("status"),
        "wordpressDraftCreatedAt": wordpress_draft.get("createdAt"),
        "result": result,
        "checklist": checklist,
    }
'''.strip()
    search_console_script = r'''
# /// script
# dependencies = [
#   "google-auth",
#   "requests",
#   "wmill",
# ]
# ///
import datetime
import json
import urllib.parse
import urllib.request
import urllib.error

import wmill
from google.auth.transport.requests import Request
from google.oauth2 import service_account


PROPERTY_VAR = "u/admin/worldbc_search_console_property"
SITE_URL_VAR = "u/admin/worldbc_search_console_site_url"
SERVICE_ACCOUNT_RESOURCE = "u/admin/worldbc_google_search_console_service_account"


def _date_range(data):
    today = datetime.date.today()
    end_date = data.get("endDate") or data.get("end_date") or (today - datetime.timedelta(days=2)).isoformat()
    start_date = data.get("startDate") or data.get("start_date") or (today - datetime.timedelta(days=30)).isoformat()
    return start_date, end_date


def _as_list(value, default):
    if value is None:
        return default
    if isinstance(value, list):
        return [str(item) for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return default


def _credentials():
    info = wmill.get_resource(SERVICE_ACCOUNT_RESOURCE)
    if not isinstance(info, dict) or not info.get("client_email") or not info.get("private_key"):
        return None, "Service account resource is missing client_email/private_key."
    scopes = ["https://www.googleapis.com/auth/webmasters.readonly"]
    creds = service_account.Credentials.from_service_account_info(info, scopes=scopes)
    creds.refresh(Request())
    return creds, ""


def _query_search_console(site_url, token, body):
    encoded = urllib.parse.quote(site_url, safe="")
    url = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{encoded}/searchAnalytics/query"
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=45) as res:
        raw = res.read().decode("utf-8", errors="replace")
    return json.loads(raw) if raw.strip() else {}


def _row_to_dict(row, dimensions):
    keys = row.get("keys") or []
    item = {dimensions[index]: keys[index] if index < len(keys) else "" for index in range(len(dimensions))}
    item.update({
        "clicks": row.get("clicks", 0),
        "impressions": row.get("impressions", 0),
        "ctr": row.get("ctr", 0),
        "position": row.get("position", 0),
    })
    return item


def main(activityRun=None, input=None):
    data = input or {}
    site_url = data.get("siteUrl") or data.get("site_url") or data.get("propertyId") or wmill.get_variable(PROPERTY_VAR) or wmill.get_variable(SITE_URL_VAR)
    display_site_url = data.get("displaySiteUrl") or data.get("websiteUrl") or wmill.get_variable(SITE_URL_VAR)
    if not site_url:
        return {"ok": False, "status": "needs_configuration", "summary": "Search Console property is missing.", "missing": ["worldbc_search_console_property"]}
    start_date, end_date = _date_range(data)
    dimensions = _as_list(data.get("dimensions"), ["query", "page"])
    row_limit = max(1, min(int(data.get("rowLimit") or data.get("row_limit") or 25), 250))
    body = {
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": dimensions,
        "rowLimit": row_limit,
        "startRow": int(data.get("startRow") or 0),
        "searchType": data.get("searchType") or "web",
    }
    if data.get("dimensionFilterGroups"):
        body["dimensionFilterGroups"] = data.get("dimensionFilterGroups")
    creds, credential_error = _credentials()
    if credential_error:
        return {"ok": False, "status": "needs_credentials", "summary": credential_error, "siteUrl": site_url}
    try:
        response = _query_search_console(site_url, creds.token, body)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")[:1200]
        status = "permission_denied" if exc.code in {401, 403} else "failed"
        return {"ok": False, "status": status, "summary": f"Search Console query failed with HTTP {exc.code}.", "siteUrl": site_url, "details": raw}
    except Exception as exc:
        return {"ok": False, "status": "failed", "summary": "Search Console query failed.", "siteUrl": site_url, "details": str(exc)}
    rows = [_row_to_dict(row, dimensions) for row in response.get("rows") or []]
    totals = {
        "clicks": sum(float(row.get("clicks") or 0) for row in rows),
        "impressions": sum(float(row.get("impressions") or 0) for row in rows),
    }
    totals["averageCtr"] = (totals["clicks"] / totals["impressions"]) if totals["impressions"] else 0
    return {
        "ok": True,
        "status": "done",
        "summary": f"Search Console returned {len(rows)} row(s) for {site_url}.",
        "siteUrl": site_url,
        "displaySiteUrl": display_site_url,
        "dateRange": {"startDate": start_date, "endDate": end_date},
        "dimensions": dimensions,
        "rowCount": len(rows),
        "totals": totals,
        "rows": rows,
    }
'''.strip()
    webhook_script = r'''
import json
import urllib.request


def main(activityRun=None, input=None):
    activityRun = activityRun or {}
    data = input or {}
    dry_run = bool(data.get("dryRun") or activityRun.get("dryRun"))
    approved = activityRun.get("approvalState") == "Approved"
    url = data.get("url") or data.get("webhookUrl") or ""
    payload = data.get("payload") or {}
    if not url:
        return {"ok": False, "status": "blocked", "summary": "Webhook URL is missing.", "missing": ["url"]}
    if not approved:
        return {"ok": False, "status": "approval_required", "summary": "External webhook call requires AI Department approval."}
    if dry_run:
        return {"ok": True, "status": "dry_run_done", "summary": "Webhook payload validated. No external request was sent.", "payloadKeys": sorted(payload.keys())}
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), method="POST", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=45) as res:
        raw = res.read().decode("utf-8", errors="replace")
    return {"ok": True, "status": "sent", "summary": "Webhook request sent.", "response": raw[:1000]}
'''.strip()
    text_extract_script = r'''
import re


def main(activityRun=None, input=None):
    data = input or {}
    text = data.get("text") or data.get("content") or data.get("draftContent") or data.get("sourceText") or ""
    words = re.findall(r"\b[\w'-]+\b", text)
    headings = re.findall(r"(?im)^#{1,3}\s+(.+)$|<h[23][^>]*>(.*?)</h[23]>", text)
    flat_headings = [a or b for a, b in headings if a or b]
    return {
        "ok": True,
        "status": "done",
        "summary": f"Extracted {len(words)} words and {len(flat_headings)} headings.",
        "wordCount": len(words),
        "headings": flat_headings[:20],
        "preview": text[:500],
    }
'''.strip()
    seo_staff_stage_script = r'''
import re


def _words(text):
    return re.findall(r"\b[\w'-]+\b", text or "")


def _staff_rules(staff_context, staff_id):
    staff = ((staff_context or {}).get("staff") or {}).get(staff_id) or {}
    rules = []
    for skill in staff.get("skills") or []:
        rules.extend(skill.get("rules") or [])
    return rules[:12]


def main(stageId="", stageLabel="", staffId="", staffAlias="", mode="", summary="", activityRun=None, input=None, staffContext=None, previous=None, extra=None):
    data = input or {}
    staff_context = staffContext or {}
    source_text = data.get("sourceText") or data.get("text") or data.get("transcript") or data.get("articleText") or ""
    previous = previous or {}
    department_rules = []
    for skill in staff_context.get("departmentSkills") or []:
        department_rules.extend(skill.get("rules") or [])
    output = {
        "stageId": stageId,
        "stageLabel": stageLabel,
        "staffId": staffId,
        "staffAlias": staffAlias,
        "mode": mode,
        "summary": summary,
        "status": "done",
        "received": {
            "sourceWordCount": len(_words(source_text)),
            "hasStaffContext": bool(staff_context),
            "previousStepCount": len(previous.keys()) if isinstance(previous, dict) else 0,
        },
        "rulesApplied": {
            "departmentRules": department_rules[:8],
            "staffRules": _staff_rules(staff_context, staffId),
        },
        "nextAction": "Continue to the next staff stage.",
    }
    if mode == "search_console":
        output["status"] = "ready_with_placeholder"
        output["nextAction"] = "Use Google Search Console rows when the Windmill Google credential/resource is connected."
    if mode == "seo_qa":
        output["nextAction"] = "Return QA findings to Sofia before WordPress/Make approval."
    return output
'''.strip()
    seo_actor_script = r'''
import re


def _words(text):
    return re.findall(r"\b[\w'-]+\b", text or "")


def _as_dict(value):
    return value if isinstance(value, dict) else {}


def _list(value):
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return []


def _validation(response, actor_context):
    checks = [
        {"id": "has_summary", "passed": bool(response.get("summary"))},
        {"id": "has_next_action", "passed": bool(response.get("nextAction"))},
        {"id": "manager_route_respected", "passed": actor_context.get("staffId") == "AIstaff_SEOManager" or not response.get("humanFacingRequest")},
        {"id": "has_context", "passed": bool(actor_context.get("baseKnowledge")) and "overrides" in actor_context},
    ]
    score = len([row for row in checks if row.get("passed")]) / max(1, len(checks))
    return {"passed": score >= 0.75, "score": round(score, 2), "checks": checks}


def main(activityRun=None, input=None, staffContext=None, command="", targetStaffId="", actorContext=None, managerCommand=None, stage=None, subtask=None):
    data = input or {}
    actor_context = actorContext or data.get("actorContext") or {}
    actor = actor_context.get("actor") or {}
    overrides = actor_context.get("overrides") or {}
    command = command or data.get("command") or ""
    staff_id = targetStaffId or data.get("targetStaffId") or actor_context.get("staffId") or ""
    stage = stage or data.get("stage") or actor_context.get("selectedStage") or {}
    subtask = subtask or data.get("subtask") or actor_context.get("selectedSubtask") or {}
    source_text = data.get("sourceText") or data.get("text") or data.get("transcript") or ""
    lanes = _list(overrides.get("laneIds"))
    skills = _list(overrides.get("skillIds"))
    summary = (
        f"{actor.get('alias') or staff_id} processed the command as an independent SEO actor. "
        f"Stage: {stage.get('label') or 'not selected'}. "
        f"Context: {len(lanes)} lane override(s), {len(skills)} skill override(s), {len(overrides.get('assignedStages') or [])} assigned stage(s)."
    )
    response = {
        "ok": True,
        "status": "done",
        "staffId": staff_id,
        "alias": actor.get("alias") or "",
        "title": actor.get("title") or "",
        "command": command,
        "summary": summary,
        "result": {
            "stageId": stage.get("id") or "",
            "subtaskId": subtask.get("id") or "",
            "sourceWordCount": len(_words(source_text)),
            "lanesAvailable": lanes,
            "skillsAvailable": skills,
            "settings": _as_dict(overrides.get("settings")),
        },
        "nextAction": "Return this result to Sofia for validation and the next routing decision.",
        "humanFacingRequest": False,
    }
    response["validation"] = _validation(response, actor_context)
    return response
'''.strip()
    seo_manager_command_script = r'''
import re


def _norm(value):
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def _targets(command):
    text = _norm(command)
    routes = [
        ("AIstaff_SEOSourceAnalyst", ["transcript", "source", "notes", "requirement", "extract", "uploaded"]),
        ("AIstaff_SEOExpert", ["search console", "analytics", "keyword", "ranking", "rank", "performance", "traffic"]),
        ("AIstaff_CaseStudyMapper", ["case study", "proof", "evidence", "claim", "reference"]),
        ("AIstaff_SEOContentWriter", ["brief", "article", "draft", "content", "write", "metadata", "title"]),
        ("AIstaff_InternalLinkBuilder", ["internal link", "anchor", "inventory", "crawl", "existing page"]),
        ("AIstaff_SEOQAAnalyst", ["qa", "review", "validate", "quality", "check", "learn"]),
        ("AIstaff_WordPressPublisher", ["wordpress", "publish", "make", "payload", "webhook"]),
    ]
    selected = [staff_id for staff_id, tokens in routes if any(token in text for token in tokens)]
    return selected or ["AIstaff_SEOSourceAnalyst"]


def main(activityRun=None, input=None, staffContext=None, command="", actorContext=None):
    data = input or {}
    command = command or data.get("command") or ""
    target_staff_ids = data.get("targetStaffIds") or _targets(command)
    return {
        "ok": True,
        "status": "routing_plan_ready",
        "manager": "AIstaff_SEOManager",
        "summary": f"Sofia accepted the command and prepared a routing plan for {len(target_staff_ids)} actor(s).",
        "targets": target_staff_ids,
        "nextAction": "Call each actor API with its resolved actorContext, then validate the returned response before continuing.",
        "validation": {
            "passed": bool(command),
            "checks": [
                {"id": "has_command", "passed": bool(command)},
                {"id": "has_targets", "passed": bool(target_staff_ids)},
            ],
        },
    }
'''.strip()
    seo_workflow_script = r'''
import datetime
import re


WORLDBC_CATEGORIES = {
    1: "Uncategorized",
    19: "Trade, Working-Capital & Treasury",
    27: "Corporate & Capital Markets",
    28: "Treasury, Cash & Liquidity",
    123: "Debt-Capital Markets (DCM)",
    126: "Real-Estate Corporate Finance",
    149: "Corporate guides",
    150: "Company News",
    270: "Mergers & Acquisitions (M&A)",
    274: "M&A & Strategic Transactions",
    348: "Growth & Venture Finance",
    349: "Structured & Asset-Backed Solutions",
    406: "Project & Infrastructure Finance",
    441: "Equity Capital & Private Placements",
    442: "Investor Relations & Corporate Governance",
    443: "Structured Finance & Securitisation",
    444: "Public Equity-Capital Markets (ECM)",
    445: "Startup Fundraising",
    446: "Venture Capital & Startup Funding",
    447: "Leveraged & Acquisition Finance",
    448: "Risk, Tax & Incentives",
    449: "ESG & Impact Finance",
    450: "FinTech & TreasuryTech",
    451: "Blockchain, Tokenisation & Digital Assets",
    452: "Investor Services",
    453: "Job Opportunities",
    454: "Fund raising",
    455: "Marketing Division",
    456: "Startup Investor Outreach",
    457: "Trade & Commodity Finance",
    458: "Receivables & Invoice Finance",
    459: "Supply-Chain & Payables Finance",
    460: "Tax, Legal & Compliance",
    461: "Risk Management & Hedging",
    462: "Government Grants & Incentives",
    463: "Success Stories",
    464: "Sample Reports",
    465: "Project Finance",
    466: "Strategic Alliances & Joint Ventures",
    467: "Private Equity & MBOs",
    468: "Restructuring & Turnaround",
    469: "Merger and Acquisition",
}


def _words(text):
    return re.findall(r"\b[\w'-]+\b", text or "")


def _first_sentence(text):
    parts = re.split(r"(?<=[.!?])\s+", (text or "").strip())
    return parts[0][:180] if parts and parts[0] else ""


def _slug(value):
    clean = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return clean[:72] or "worldbc-seo-draft"


def _one_category(value):
    if value is None:
        return []
    raw = value if isinstance(value, list) else [value]
    out = []
    for item in raw:
        try:
            category_id = int(item)
        except Exception:
            continue
        if category_id in WORLDBC_CATEGORIES:
            out.append(category_id)
    return out[:1]


def _select_category_id(blob):
    text = (blob or "").lower()
    rules = [
        (270, ["m&a", "merger", "acquisition", "deal", "transaction"]),
        (274, ["strategic transaction", "joint venture", "alliance"]),
        (454, ["fundraising", "fund raising", "raise capital", "capital raise"]),
        (456, ["investor outreach", "investor readiness", "pitch", "investor pipeline"]),
        (445, ["startup fundraising", "seed", "series a", "startup"]),
        (446, ["venture capital", "vc", "angel investor"]),
        (441, ["private placement", "equity capital", "share issue"]),
        (442, ["investor relations", "governance", "board", "shareholder"]),
        (123, ["bond", "debt capital", "dcm", "note issuance"]),
        (447, ["leveraged", "acquisition finance", "buyout"]),
        (406, ["infrastructure", "project finance", "ppp"]),
        (457, ["trade finance", "commodity"]),
        (458, ["receivables", "invoice finance", "factoring"]),
        (459, ["supply chain", "payables"]),
        (28, ["treasury", "cash", "liquidity"]),
        (448, ["tax", "incentive"]),
        (460, ["legal", "compliance", "regulation"]),
        (461, ["risk management", "hedging"]),
        (449, ["esg", "impact", "sustainability"]),
        (450, ["fintech", "treasurytech"]),
        (451, ["blockchain", "tokenisation", "tokenization", "digital asset"]),
        (463, ["case study", "success story"]),
    ]
    for category_id, tokens in rules:
        if any(token in text for token in tokens):
            return category_id
    return 149


def _fit_title(primary_keyword, topic):
    supplied = (topic or primary_keyword or "").strip()
    if 50 <= len(supplied) <= 60:
        return supplied
    candidates = [
        f"{primary_keyword.title()}: Practical Guide",
        f"{primary_keyword.title()} For Business Leaders",
        f"{primary_keyword.title()} For Growth Companies",
        f"{primary_keyword.title()} Explained For Decision Makers",
    ]
    for candidate in candidates:
        if 50 <= len(candidate) <= 60:
            return candidate
    candidate = candidates[0]
    if len(candidate) > 60:
        return candidate[:57].rstrip(" :-") + "..."
    return (candidate + " For Companies")[:60]


def _fit_excerpt(primary_keyword):
    base = f"Learn {primary_keyword} with practical business context, clear decision criteria, common risks, and next steps for companies preparing for growth."
    if len(base) < 140:
        base += " Use this guide before planning outreach or publishing."
    return base[:160].rstrip(" ,.;")


def _keyword_from_input(data, source_text):
    supplied = data.get("primaryKeyword") or data.get("keyword") or ""
    if supplied:
        return supplied
    title = data.get("title") or data.get("topic") or _first_sentence(source_text)
    focus = " ".join(_words(title)[:8]).strip().lower()
    return focus or "business growth strategy for investors"


def _html_article(title, primary_keyword, source_text):
    intro = _first_sentence(source_text) or "Business readers need practical context, clear definitions, and evidence before making decisions."
    return "\n".join([
        f"<p>{primary_keyword} is easiest to understand when it is connected to a real business decision. {intro} This guide explains the topic in a professional, Investopedia-style tone: clear enough for non-specialist readers, but structured enough for executives, founders, investors, and advisors who need to act on the information.</p>",
        "<p>For WorldBusiness Council readers, the practical question is not only what the concept means. The more important question is how a company can use the idea to improve preparation, reduce uncertainty, and communicate with investors or business partners in a more credible way.</p>",
        f"<h2>{primary_keyword.title()}: What It Means</h2>",
        f"<p>{primary_keyword} describes the process of turning a broad commercial objective into a more complete and decision-ready plan. In practice, that means clarifying the business goal, collecting the right evidence, explaining the opportunity in simple language, and preparing the documents or next steps that a reviewer would expect to see.</p>",
        "<p>A strong business article should not make the reader feel that the topic is mysterious. It should define the concept, show why it matters, and explain where the risks sit. That is why this draft avoids promotional language and focuses on practical interpretation.</p>",
        "<h2>Why This Matters For Companies</h2>",
        "<p>Companies often lose time because they begin outreach, fundraising, partnership discussions, or market expansion before their story is ready. The result can be weak follow-up, unclear positioning, missing evidence, or avoidable questions from investors and partners.</p>",
        "<p>Good preparation improves the quality of the conversation. It helps management explain what the company does, why now is the right time, what evidence supports the opportunity, and what decision the reader is being asked to consider. It also helps the company avoid overclaiming. Credible communication is usually more persuasive than aggressive selling.</p>",
        "<h3>What Readers Should Look For</h3>",
        "<ul><li>A clear explanation of the commercial objective.</li><li>Evidence that supports the opportunity or risk.</li><li>Simple definitions for technical or finance terms.</li><li>A practical next step the reader can take.</li><li>Balanced discussion of limitations and assumptions.</li></ul>",
        "<h2>How To Evaluate The Opportunity</h2>",
        "<p>A useful evaluation starts with the reader's intent. Some readers want a basic explanation. Others want a checklist they can apply to their own company. Investors may look for proof points, while operators may look for process and execution risk. The article should serve these needs without becoming too technical.</p>",
        "<p>One helpful approach is to separate the analysis into three layers. First, define the business situation. Second, identify the evidence that matters. Third, explain what action follows from the evidence. This structure keeps the article easy to scan and also helps search engines understand the topic.</p>",
        "<h3>Evidence To Collect</h3>",
        "<ul><li>Company background, stage, market, and business model.</li><li>Relevant metrics, milestones, customer traction, or financial signals.</li><li>External market context from reputable sources.</li><li>Risks, dependencies, and assumptions that may affect the decision.</li><li>Internal links or related WorldBusiness Council resources where available.</li></ul>",
        "<h2>Common Mistakes To Avoid</h2>",
        "<p>The most common mistake is writing content that sounds polished but does not help the reader make a decision. Generic claims such as market leader, innovative solution, or strong growth potential are not enough. Readers need context, examples, and a logical path from problem to recommendation.</p>",
        "<p>Another mistake is keyword stuffing. SEO works best when the primary keyword appears naturally in the title, opening, one heading, and conclusion. Repeating the same phrase too often can make the article less useful and less trustworthy.</p>",
        "<p>A third mistake is treating publishing as the final step. For a business blog, the article should also support follow-up. It can become a reference for investor outreach, partnership discussions, internal education, or a broader content campaign.</p>",
        "<h2>How This Supports Better Decision-Making</h2>",
        "<p>Decision makers usually need more than a definition. They need to understand whether the topic affects timing, cost, risk, credibility, or access to capital. A well-prepared article can help them compare options without feeling pushed toward one answer too quickly.</p>",
        "<p>This is especially important for growth companies. A founder may read the article to understand what should be prepared before investor contact. A corporate manager may use it to explain a financing or partnership question internally. An advisor may use it as a checklist for improving the quality of a client discussion.</p>",
        "<p>The best result is a draft that is useful on its own and also supports the next commercial action. That action might be preparing an investor deck, reviewing a financing structure, improving governance materials, or deciding whether the company is ready for outreach.</p>",
        "<h2>Practical Next Steps</h2>",
        "<p>Before publishing, the company should confirm that the article answers the reader's likely question, uses one primary category, includes relevant tags, and provides references for claims that need outside support. The final version should be saved as a WordPress draft unless a human manager explicitly approves publishing.</p>",
        "<p>For teams using automation, the safest operating model is supervised execution. The AI system can prepare the article, check the SEO structure, select the category, and create the WordPress payload. The human manager should approve the final handoff before any webhook or publishing action is triggered.</p>",
        f"<h2>Conclusion: Using {primary_keyword} Effectively</h2>",
        f"<p>{primary_keyword} is valuable when it helps a company explain its position with clarity, evidence, and practical next steps. The best articles do more than define a term. They help the reader understand what to check, what to avoid, and how to move from information to action.</p>",
        "<h2>Key Takeaways</h2>",
        "<ul><li>Use a professional but easy-to-understand tone.</li><li>Keep the article structured with H2/H3 headings and short paragraphs.</li><li>Use one specific long-tail keyword naturally, without stuffing.</li><li>Choose one WordPress category ID and 3-8 tags.</li><li>Send the post as a draft unless publishing is explicitly approved.</li></ul>",
        "<h2>References</h2>",
        '<p>[1] <a href="https://www.investopedia.com/" rel="nofollow">Investopedia</a></p>',
        '<p>[2] <a href="https://www.worldbank.org/" rel="nofollow">World Bank</a></p>',
        '<p>[3] <a href="https://www.oecd.org/" rel="nofollow">OECD</a></p>',
    ])


def _stage(stage_id, label, status, summary, output=None, missing=None):
    return {
        "id": stage_id,
        "label": label,
        "status": status,
        "summary": summary,
        "output": output or {},
        "missing": missing or [],
    }


def main(activityRun=None, input=None, mode="run_project", dry_run=True):
    activityRun = activityRun or {}
    data = input or {}
    requested_dry_run = bool(data.get("dryRun", dry_run) or activityRun.get("dryRun"))
    source_text = data.get("sourceText") or data.get("text") or data.get("transcript") or data.get("articleText") or ""
    topic = data.get("topic") or data.get("title") or _first_sentence(source_text) or "WorldBC business article"
    primary_keyword = _keyword_from_input(data, source_text)
    title = data.get("seoTitle") or _fit_title(primary_keyword, data.get("title") or topic)
    excerpt = data.get("excerpt") or _fit_excerpt(primary_keyword)
    content_html = data.get("content") or data.get("html") or _html_article(title, primary_keyword, source_text)
    if len(_words(re.sub(r"<[^>]+>", " ", content_html))) < 900:
        content_html = _html_article(title, primary_keyword, source_text)
    provided_categories = _one_category(data.get("categories")) or _one_category(data.get("categoryId"))
    category_id = provided_categories[0] if provided_categories else _select_category_id(" ".join([topic, primary_keyword, source_text]))
    categories = [category_id]
    supporting_keywords = data.get("supportingKeywords") or data.get("keywords") or [
        primary_keyword,
        "business strategy",
        "capital readiness",
        "investor communication",
        "WorldBusiness Council",
    ]
    tags = data.get("tags") or supporting_keywords[:5]
    tags = [str(item).strip() for item in tags if str(item).strip()][:8]
    if len(tags) < 3:
        tags.extend(["WorldBusiness Council", "business finance", "growth strategy"][: 3 - len(tags)])
    word_count = len(_words(re.sub(r"<[^>]+>", " ", content_html)))
    checklist = {
        "seoTitleLength": len(title),
        "seoTitleInTarget": 50 <= len(title) <= 60,
        "excerptLength": len(excerpt),
        "excerptInTarget": 140 <= len(excerpt) <= 160 and '"' not in excerpt,
        "wordCount": word_count,
        "wordCountInTarget": 900 <= word_count <= 1600,
        "hasH2": "<h2" in content_html,
        "hasH3": "<h3" in content_html,
        "hasKeyTakeaways": "key takeaways" in content_html.lower(),
        "hasNofollowReferences": "rel=\"nofollow\"" in content_html.lower(),
        "categoryCount": len(categories),
        "categoryId": category_id,
        "categoryName": WORLDBC_CATEGORIES.get(category_id, ""),
        "tagCount": len(tags),
        "status": "draft",
        "requiresConfirmationBeforeWebhook": True,
    }
    steps = [
        _stage("source_intake", "Source intake", "done" if source_text else "needs_input", "Read pasted transcript/source text and normalize the request.", {"wordCount": len(_words(source_text))}, [] if source_text else ["sourceText"]),
        _stage("keyword_evidence", "Keyword evidence", "done", "Select a specific long-tail keyword. Search Console can enrich this when connected.", {"primaryKeyword": primary_keyword}),
        _stage("content_brief", "SEO brief", "done", "Prepare title, excerpt, slug, one category ID, and tags.", {"title": title, "excerpt": excerpt, "slug": _slug(title), "categoryId": category_id, "categoryName": WORLDBC_CATEGORIES.get(category_id, ""), "tags": tags}),
        _stage("draft_package", "Article package", "done", "Prepare clean WordPress HTML in the required structure.", {"wordCount": word_count}),
        _stage("qa_review", "Internal QA", "ready" if all([checklist["seoTitleInTarget"], checklist["excerptInTarget"], checklist["wordCountInTarget"], checklist["hasH2"], checklist["hasH3"], checklist["hasKeyTakeaways"], checklist["hasNofollowReferences"], checklist["categoryCount"] == 1, 3 <= checklist["tagCount"] <= 8]) else "needs_review", "Check title length, excerpt length, HTML structure, references, category, tags, and key takeaways.", checklist),
        _stage("approval_gate", "Approval gate", "approval_required", "Ask Iman before sending the WordPress/Make.com draft action.", {"dryRun": requested_dry_run}),
    ]
    missing = []
    if not source_text:
        missing.append("sourceText")
    if not primary_keyword:
        missing.append("primaryKeyword")
    status = "blocked" if missing else ("ready_for_approval" if requested_dry_run else "approval_required")
    wordpress_payload = {
        "title": title,
        "content": content_html,
        "excerpt": excerpt,
        "categories": categories,
        "tags": tags,
        "slug": _slug(title),
        "primaryKeyword": primary_keyword,
        "supportingKeywords": supporting_keywords[:8],
        "status": "draft",
    }
    return {
        "ok": not missing,
        "mode": mode,
        "status": status,
        "department": "WorldBC SEO Demand Engine",
        "summary": "SEO workflow prepared an approval-ready WordPress draft package." if not missing else "SEO workflow needs source text before it can continue.",
        "generatedAt": datetime.datetime.utcnow().isoformat() + "Z",
        "steps": steps,
        "missing": missing,
        "outputs": {
            "primaryKeyword": primary_keyword,
            "seoTitle": title,
            "excerpt": excerpt,
            "slug": _slug(title),
            "category": {"id": category_id, "name": WORLDBC_CATEGORIES.get(category_id, "")},
            "supportingKeywords": supporting_keywords[:8],
            "finalChecklist": checklist,
            "wordpressPayload": wordpress_payload,
        },
        "nextAction": "Review the draft package, then approve the WordPress/Make.com activity from the AI Department UI." if not missing else "Paste or upload source text for the SEO article.",
    }
'''.strip()
    scripts = [
        {
            "path": f"{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_staff_stage",
            "summary": "WorldBC SEO staff-labeled flow stage",
            "description": "Reusable staff-stage script used by the visual Windmill SEO flow. Receives resolved staff, skills, and department rules from the AI Department app.",
            "content": seo_staff_stage_script,
            "schema": activity_schema,
            "tag": "",
        },
        {
            "path": f"{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_workflow",
            "summary": "WorldBC SEO Demand Engine workflow",
            "description": "Runs the supervised WorldBC SEO content workflow: source intake, keyword evidence, brief, draft package, QA, and approval-ready WordPress payload.",
            "content": seo_workflow_script,
            "schema": activity_schema,
            "tag": "",
        },
        {
            "path": f"{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_wordpress_draft",
            "summary": "WorldBC SEO WordPress draft handoff",
            "description": "Department-scoped WordPress/Make draft creator for the WorldBC SEO Demand Engine.",
            "content": wordpress_script,
            "schema": activity_schema,
            "tag": "",
        },
        {
            "path": f"{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_search_console_query",
            "summary": "WorldBC SEO Search Console query placeholder",
            "description": "Department-scoped Search Console query shell for WorldBC SEO. Configure Google credentials/resources in Windmill for live queries.",
            "content": search_console_script,
            "schema": activity_schema,
            "tag": "",
        },
        {
            "path": f"{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_generic_webhook",
            "summary": "WorldBC SEO approved webhook caller",
            "description": "Department-scoped approved webhook caller for WorldBC SEO Make.com activities.",
            "content": webhook_script,
            "schema": activity_schema,
            "tag": "",
        },
        {
            "path": f"{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_text_extract",
            "summary": "WorldBC SEO text extraction",
            "description": "Department-scoped safe text extraction utility for WorldBC transcripts and article sources.",
            "content": text_extract_script,
            "schema": activity_schema,
            "tag": "",
        },
    ]
    scripts.append(
        {
            "path": f"{SEO_DEMAND_ENGINE_WINDMILL_PREFIX}_manager_command",
            "summary": "Sofia manager command API",
            "description": "Receives AI Department panel commands and returns a routing plan for independent SEO staff actor APIs.",
            "content": seo_manager_command_script,
            "schema": activity_schema,
            "tag": "",
        }
    )
    for contract in seo_staff_actor_contracts():
        scripts.append(
            {
                "path": seo_staff_actor_path(contract["staffId"]),
                "summary": f"{contract['alias']} actor API",
                "description": f"Independent Windmill actor script for {contract['title']}. {contract['purpose']}",
                "content": seo_actor_script,
                "schema": activity_schema,
                "tag": "",
            }
        )
    return scripts


def windmill_starter_flows() -> list[dict[str, Any]]:
    return [windmill_seo_staff_flow()]


def provision_windmill_starter_activities(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    config = windmill_config()
    now = utc_ts()
    if not config["configured"]:
        result = {"ok": False, "message": "Windmill is not configured.", "testedAt": iso_like(now)}
        set_meta("windmill_last_provision", result)
        return {"ok": False, "windmill": windmill_status(), "provision": result}
    script_results = [windmill_create_or_update_script(script) for script in windmill_starter_scripts()]
    flow_results = [windmill_create_or_update_flow(flow) for flow in windmill_starter_flows()]
    results = [*script_results, *flow_results]
    ok = all(row.get("ok") for row in results)
    result = {
        "ok": ok,
        "message": "Starter Windmill activity scripts and flows provisioned." if ok else "One or more starter scripts/flows could not be provisioned.",
        "scripts": script_results,
        "flows": flow_results,
        "testedAt": iso_like(now),
    }
    set_meta("windmill_last_provision", result)
    return {"ok": ok, "windmill": windmill_status(), "provision": result}


def cleanup_old_windmill_and_activity_runs(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = payload or {}
    archive_legacy_activity_bindings()
    script_results: list[dict[str, Any]] = []
    if windmill_config()["configured"]:
        requested_paths = payload.get("scriptPaths")
        paths = requested_paths if isinstance(requested_paths, list) and requested_paths else LEGACY_WINDMILL_SCRIPT_PATHS
        script_results = [windmill_archive_script(str(path)) for path in paths]
    with connect() as conn:
        old_runs = conn.execute(
            """
            SELECT activity_run_id
            FROM activity_runs
            WHERE department_id = ?
              AND (
                dry_run = 1
                OR lower(idempotency_key) LIKE '%test%'
                OR lower(idempotency_key) LIKE '%validation%'
                OR lower(idempotency_key) LIKE '%sample%'
                OR lower(idempotency_key) LIKE '%smoke%'
              )
            """,
            (SEO_DEMAND_ENGINE_DEPARTMENT_ID,),
        ).fetchall()
        run_ids = [row["activity_run_id"] for row in old_runs]
        if run_ids:
            placeholders = ",".join("?" for _ in run_ids)
            conn.execute(f"DELETE FROM approval_tickets WHERE activity_run_id IN ({placeholders})", run_ids)
            conn.execute(f"DELETE FROM activity_runs WHERE activity_run_id IN ({placeholders})", run_ids)
        archived_bindings = conn.execute(
            "SELECT COUNT(*) AS c FROM activity_bindings WHERE binding_id IN ({}) AND status = 'Archived'".format(
                ",".join("?" for _ in LEGACY_ACTIVITY_BINDING_IDS)
            ),
            list(LEGACY_ACTIVITY_BINDING_IDS),
        ).fetchone()["c"]
    result = {
        "ok": all(row.get("ok") for row in script_results) if script_results else True,
        "message": "Old duplicate/test Windmill scripts and local activity runs cleaned.",
        "archivedScriptCount": len([row for row in script_results if row.get("ok")]),
        "removedActivityRunCount": len(run_ids),
        "archivedLegacyBindingCount": archived_bindings,
        "scripts": script_results,
        "cleanedAt": iso_like(utc_ts()),
    }
    set_meta("windmill_last_cleanup", result)
    return {"ok": result["ok"], "cleanup": result, "windmill": windmill_status()}


def row_to_activity_binding(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    source = parse_json_text(row["source_payload"], {}) if row else {}
    return {
        "bindingId": row["binding_id"],
        "departmentId": row["department_id"],
        "activityName": row["activity_name"],
        "label": row["label"],
        "handlerType": row["handler_type"],
        "windmillPath": row["windmill_path"],
        "approvalRequired": bool(row["approval_required"]),
        "dryRunSupported": bool(row["dry_run_supported"]),
        "status": row["status"],
        "summary": source.get("summary", ""),
        "metadata": source,
        "updatedAt": iso_like(row["updated_at"]),
    }


def activity_bindings_for_department(department_id: str = "") -> list[dict[str, Any]]:
    ensure_default_activity_bindings()
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT *
            FROM activity_bindings
            WHERE status != 'Archived' AND (department_id = '*' OR department_id = ?)
            ORDER BY activity_name, department_id DESC
            """,
            (department_id or "",),
        ).fetchall()
    if department_id:
        exact_names = {str(row["activity_name"] or "") for row in rows if str(row["department_id"] or "") == department_id}
        rows = [row for row in rows if str(row["department_id"] or "") == department_id or str(row["activity_name"] or "") not in exact_names]
    return [row_to_activity_binding(row) for row in rows]


def find_activity_binding(activity_name: str, department_id: str = "") -> dict[str, Any] | None:
    bindings = activity_bindings_for_department(department_id)
    exact = [row for row in bindings if row["activityName"] == activity_name and row["departmentId"] == department_id]
    if exact:
        return exact[0]
    return next((row for row in bindings if row["activityName"] == activity_name), None)


def row_to_activity_run(row: sqlite3.Row | dict[str, Any], approvals: dict[str, dict[str, Any]] | None = None) -> dict[str, Any]:
    approvals = approvals or {}
    run_id = row["activity_run_id"]
    return {
        "activityRunId": run_id,
        "departmentId": row["department_id"],
        "organizationAccountId": row["organization_account_id"],
        "bindingId": row["binding_id"],
        "activityName": row["activity_name"],
        "status": row["status"],
        "approvalState": row["approval_state"],
        "idempotencyKey": row["idempotency_key"],
        "dryRun": bool(row["dry_run"]),
        "requestPayload": parse_json_text(row["request_payload"], {}),
        "resultPayload": parse_json_text(row["result_payload"], {}),
        "error": row["error"],
        "windmillJobId": row["windmill_job_id"],
        "createdAt": iso_like(row["created_at"]),
        "updatedAt": iso_like(row["updated_at"]),
        "requestedBy": row["requested_by"],
        "approval": approvals.get(run_id),
    }


def list_activity_runs(department_id: str = "", limit: int = 50) -> dict[str, Any]:
    ensure_default_activity_bindings()
    params: list[Any] = []
    where = ""
    if department_id:
        where = "WHERE department_id = ?"
        params.append(department_id)
    params.append(max(1, min(int(limit or 50), 200)))
    with connect() as conn:
        rows = conn.execute(
            f"SELECT * FROM activity_runs {where} ORDER BY updated_at DESC LIMIT ?",
            params,
        ).fetchall()
        approval_rows = conn.execute(
            """
            SELECT *
            FROM approval_tickets
            WHERE activity_run_id IN (%s)
            """ % ",".join("?" for _ in rows),
            [row["activity_run_id"] for row in rows],
        ).fetchall() if rows else []
    approvals = {
        row["activity_run_id"]: {
            "approvalId": row["approval_id"],
            "status": row["status"],
            "approvalType": row["approval_type"],
            "requestedBy": row["requested_by"],
            "approvedBy": row["approved_by"],
            "reason": row["reason"],
            "createdAt": iso_like(row["created_at"]),
            "updatedAt": iso_like(row["updated_at"]),
        }
        for row in approval_rows
    }
    runs = [row_to_activity_run(row, approvals) for row in rows]
    return {
        "ok": True,
        "departmentId": department_id,
        "activityRuns": runs,
        "bindings": activity_bindings_for_department(department_id),
        "windmill": windmill_status(),
    }


def department_row_by_id(department_id: str) -> dict[str, Any]:
    if not department_id:
        return {}
    fabric = load_capability_fabric()
    return next((row for row in collection_rows(fabric, "departments") if str(row.get("id") or "") == department_id), {})


def department_staff_ids_from_fabric(fabric: dict[str, Any], department: dict[str, Any]) -> list[str]:
    template = next(
        (
            row
            for row in collection_rows(fabric, "departmentTemplates")
            if str(row.get("id") or "") == str(department.get("templateId") or "")
        ),
        {},
    )
    staff_ids: list[str] = []
    for value in [
        department.get("humanManager"),
        department.get("aiManager"),
        *(department.get("staffProfiles") or []),
        *(template.get("staffProfiles") or []),
    ]:
        text = str(value or "").strip()
        if text and text not in staff_ids:
            staff_ids.append(text)
    if str(department.get("id") or "") == SEO_DEMAND_ENGINE_DEPARTMENT_ID:
        for value in [
            "AIstaff_SEOManager",
            "AIstaff_SEOSourceAnalyst",
            "AIstaff_SEOExpert",
            "AIstaff_CaseStudyMapper",
            "AIstaff_SEOContentWriter",
            "AIstaff_InternalLinkBuilder",
            "AIstaff_SEOQAAnalyst",
            "AIstaff_WordPressPublisher",
        ]:
            if value not in staff_ids:
                staff_ids.append(value)
    return staff_ids


def staff_blueprint_id_for_profile(profile: dict[str, Any]) -> str:
    primary = str(profile.get("primaryArchetypeId") or "").strip()
    if primary:
        return primary
    archetypes = profile.get("archetypeIds") if isinstance(profile.get("archetypeIds"), list) else []
    return str(archetypes[0] if archetypes else "").strip()


def department_staff_assignment_id(department_id: str, staff_profile_id: str) -> str:
    raw = f"assign_{department_id}_{staff_profile_id}"
    return re.sub(r"[^A-Za-z0-9_-]+", "_", raw).strip("_")


def ensure_department_staff_assignments(fabric: dict[str, Any], department: dict[str, Any]) -> None:
    department_id = str(department.get("id") or "").strip()
    if not department_id:
        return
    profiles = {str(row.get("id") or ""): row for row in collection_rows(fabric, "staffProfiles") if isinstance(row, dict)}
    now = utc_ts()
    with connect() as conn:
        for staff_id in department_staff_ids_from_fabric(fabric, department):
            if not staff_id or staff_id == "Human_Iman":
                continue
            profile = profiles.get(staff_id) or {"id": staff_id, "label": staff_label(staff_id)}
            blueprint_id = staff_blueprint_id_for_profile(profile)
            assignment_id = department_staff_assignment_id(department_id, staff_id)
            payload = {
                "alias": profile.get("alias") or DEFAULT_STAFF_ALIASES.get(staff_id) or "",
                "displayName": profile.get("label") or staff_label(staff_id),
                "roleOverride": "",
                "toolOperatingModeOverride": "",
                "contactPolicyOverride": "",
                "editableSkillRules": [],
                "modelTier": "",
                "analysisTemplateId": "",
                "source": "seeded_from_reusable_staff_profile",
                "fieldAccess": "department_editable",
            }
            conn.execute(
                """
                INSERT INTO p4_staff_assignments (
                  assignment_id, department_id, staff_profile_id, staff_blueprint_id,
                  status, source_payload, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, 'Active', ?, ?, ?)
                ON CONFLICT(assignment_id) DO NOTHING
                """,
                (
                    assignment_id,
                    department_id,
                    staff_id,
                    blueprint_id,
                    json.dumps(payload, ensure_ascii=False, default=str),
                    now,
                    now,
                ),
            )


def staff_assignment_dto(row: sqlite3.Row, fabric: dict[str, Any]) -> dict[str, Any]:
    source = parse_json_text(row["source_payload"], {})
    profiles = {str(item.get("id") or ""): item for item in collection_rows(fabric, "staffProfiles") if isinstance(item, dict)}
    archetypes = {str(item.get("id") or ""): item for item in collection_rows(fabric, "staffArchetypes") if isinstance(item, dict)}
    staff_id = str(row["staff_profile_id"] or "")
    profile = profiles.get(staff_id) or {"id": staff_id, "label": staff_label(staff_id)}
    stored_blueprint_id = str(row["staff_blueprint_id"] or "").strip()
    profile_blueprint_id = staff_blueprint_id_for_profile(profile)
    blueprint_id = stored_blueprint_id or profile_blueprint_id
    if str(source.get("source") or "") == "seeded_from_reusable_staff_profile" and profile_blueprint_id:
        blueprint_id = profile_blueprint_id
    blueprint = archetypes.get(blueprint_id) or {"id": blueprint_id, "label": blueprint_id}
    editable_rules = source.get("editableSkillRules")
    if editable_rules in (None, [], ""):
        editable_rules = profile.get("editableSkillRules") or profile.get("skillRules") or []
    effective = {
        "id": staff_id,
        "label": source.get("displayName") or profile.get("label") or staff_label(staff_id),
        "alias": source.get("alias") or profile.get("alias") or DEFAULT_STAFF_ALIASES.get(staff_id) or "",
        "role": source.get("roleOverride") or profile.get("role") or profile.get("profileTitle") or "",
        "profileTitle": profile.get("profileTitle") or profile.get("label") or "",
        "communicationScope": profile.get("communicationScope") or "",
        "canContactHuman": bool(profile.get("canContactHuman")),
        "reportsTo": profile.get("reportsTo") or profile.get("managerId") or "",
        "toolOperatingMode": source.get("toolOperatingModeOverride") or profile.get("toolOperatingMode") or "",
        "contactPolicy": source.get("contactPolicyOverride") or profile.get("contactPolicy") or "",
        "editableSkillRules": split_list_value(editable_rules),
        "modelTier": source.get("modelTier") or profile.get("modelTier") or "",
        "analysisTemplateId": source.get("analysisTemplateId") or profile.get("analysisTemplateId") or "",
        "archetypeIds": profile.get("archetypeIds") or [],
        "primaryArchetypeId": profile.get("primaryArchetypeId") or blueprint_id,
    }
    return {
        "assignmentId": row["assignment_id"],
        "departmentId": row["department_id"],
        "staffProfileId": staff_id,
        "staffBlueprintId": blueprint_id,
        "status": row["status"] or "Active",
        "fieldAccess": "department_editable",
        "updatedAt": iso_like(row["updated_at"]),
        "profile": attach_field_access(profile, "AiStaffProfile"),
        "blueprint": attach_field_access(blueprint, "AiStaffBlueprint"),
        "assignment": {
            **source,
            "assignmentId": row["assignment_id"],
            "status": row["status"] or "Active",
            "source": source.get("source") or "department assignment override",
        },
        "effective": attach_field_access(effective, "DepartmentStaffAssignment"),
    }


def list_department_staff_assignments(department_id: str) -> dict[str, Any]:
    init_db()
    fabric = load_capability_fabric()
    department = next(
        (row for row in collection_rows(fabric, "departments") if str(row.get("id") or "") == str(department_id)),
        {},
    )
    if not department:
        return {"ok": False, "error": f"Department not found: {department_id}", "assignments": []}
    ensure_department_staff_assignments(fabric, department)
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT *
            FROM p4_staff_assignments
            WHERE department_id = ? AND status != 'Archived'
            ORDER BY created_at ASC, staff_profile_id ASC
            """,
            (department_id,),
        ).fetchall()
    desired_order = {
        staff_id: index
        for index, staff_id in enumerate(department_staff_ids_from_fabric(fabric, department))
        if staff_id != "Human_Iman"
    }
    assignments = [
        staff_assignment_dto(row, fabric)
        for row in rows
        if str(row["staff_profile_id"] or "") in desired_order
    ]
    assignments.sort(key=lambda item: (desired_order.get(str(item.get("staffProfileId") or ""), 999), str(item.get("staffProfileId") or "")))
    return {
        "ok": True,
        "departmentId": department_id,
        "department": attach_field_access(department, "AiDepartmentInstance"),
        "assignments": assignments,
        "summary": {
            "assignmentCount": len(assignments),
            "blueprintCount": len({row.get("staffBlueprintId") for row in assignments if row.get("staffBlueprintId")}),
        },
        "reuseModel": {
            "blueprintLayer": "Reusable staff type and protected defaults.",
            "assignmentLayer": "Department-specific alias, responsibility, tool behavior, escalation notes, and extra skill rules.",
            "runtimeLayer": "Resolved department rules, workspace/organization identity, tools, data, and task context sent to Windmill.",
        },
    }


def upsert_department_staff_assignment(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()
    department_id = str(payload.get("departmentId") or "").strip()
    staff_id = str(payload.get("staffProfileId") or payload.get("staffId") or "").strip()
    if not department_id:
        return {"ok": False, "error": "Missing departmentId."}
    if not staff_id:
        return {"ok": False, "error": "Missing staffProfileId."}
    fabric = load_capability_fabric()
    department = next((row for row in collection_rows(fabric, "departments") if str(row.get("id") or "") == department_id), {})
    if not department:
        return {"ok": False, "error": f"Department not found: {department_id}"}
    ensure_department_staff_assignments(fabric, department)
    profiles = {str(row.get("id") or ""): row for row in collection_rows(fabric, "staffProfiles") if isinstance(row, dict)}
    profile = profiles.get(staff_id) or {"id": staff_id, "label": staff_label(staff_id)}
    blueprint_id = str(payload.get("staffBlueprintId") or staff_blueprint_id_for_profile(profile) or "").strip()
    assignment_id = str(payload.get("assignmentId") or department_staff_assignment_id(department_id, staff_id)).strip()
    now = utc_ts()
    with connect() as conn:
        existing = conn.execute("SELECT * FROM p4_staff_assignments WHERE assignment_id = ?", (assignment_id,)).fetchone()
    before_payload = staff_assignment_dto(existing, fabric) if existing else {}
    source_payload = payload.get("assignment") if isinstance(payload.get("assignment"), dict) else payload
    updated_source = {
        "alias": str(source_payload.get("alias") or profile.get("alias") or DEFAULT_STAFF_ALIASES.get(staff_id) or "").strip(),
        "displayName": str(source_payload.get("displayName") or profile.get("label") or staff_label(staff_id)).strip(),
        "roleOverride": str(source_payload.get("roleOverride") or "").strip(),
        "toolOperatingModeOverride": str(source_payload.get("toolOperatingModeOverride") or "").strip(),
        "contactPolicyOverride": str(source_payload.get("contactPolicyOverride") or "").strip(),
        "editableSkillRules": split_list_value(source_payload.get("editableSkillRules")),
        "modelTier": str(source_payload.get("modelTier") or "").strip(),
        "analysisTemplateId": str(source_payload.get("analysisTemplateId") or "").strip(),
        "source": "department_staff_assignment_override",
        "fieldAccess": "department_editable",
        "updatedAt": iso_like(now),
        "updatedBy": str(payload.get("updatedBy") or source_payload.get("updatedBy") or "Human_Iman"),
    }
    status = str(payload.get("status") or source_payload.get("status") or "Active").strip() or "Active"
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO p4_staff_assignments (
              assignment_id, department_id, staff_profile_id, staff_blueprint_id,
              status, source_payload, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(assignment_id) DO UPDATE SET
              staff_blueprint_id=excluded.staff_blueprint_id,
              status=excluded.status,
              source_payload=excluded.source_payload,
              updated_at=excluded.updated_at
            """,
            (
                assignment_id,
                department_id,
                staff_id,
                blueprint_id,
                status,
                json.dumps(updated_source, ensure_ascii=False, default=str),
                now,
                now,
            ),
        )
        row = conn.execute("SELECT * FROM p4_staff_assignments WHERE assignment_id = ?", (assignment_id,)).fetchone()
    after_payload = staff_assignment_dto(row, fabric) if row else {}
    record_department_version(
        object_type="departmentStaffAssignment",
        object_id=assignment_id,
        action="Update department staff assignment",
        before_payload=before_payload,
        after_payload=after_payload,
        created_by=updated_source["updatedBy"],
        reason=str(payload.get("reason") or "Department-specific staff reuse settings updated."),
    )
    return {
        "ok": True,
        "assignment": after_payload,
        "assignments": list_department_staff_assignments(department_id).get("assignments") or [],
    }


def resolved_department_staff_context(department_id: str) -> dict[str, Any]:
    fabric = load_capability_fabric()
    department = next((row for row in collection_rows(fabric, "departments") if str(row.get("id") or "") == department_id), {})
    assignment_payload = list_department_staff_assignments(department_id) if department else {"assignments": []}
    assignment_rows = assignment_payload.get("assignments") or []
    skill_bindings = [row for row in collection_rows(fabric, "skillBindings") if isinstance(row, dict)]
    department_skill_ids: list[str] = []
    for binding in skill_bindings:
        if str(binding.get("targetId") or "") == department_id and str(binding.get("skillScope") or "") == "departmentSkills":
            department_skill_ids.extend(binding.get("skillIds") or [])
    department_skills = [row for row in collection_rows(fabric, "departmentSkills") if row.get("id") in department_skill_ids]
    if not department_skills:
        department_skills = [row for row in collection_rows(fabric, "departmentSkills") if row.get("id")]
    staff_template_skills = collection_rows(fabric, "staffTemplateSkills")
    staff_context: dict[str, Any] = {}
    for assignment in assignment_rows:
        effective = assignment.get("effective") or {}
        profile = assignment.get("profile") or {}
        blueprint = assignment.get("blueprint") or {}
        staff_id = str(effective.get("id") or assignment.get("staffProfileId") or "")
        archetype_ids = set(effective.get("archetypeIds") or profile.get("archetypeIds") or [])
        primary = effective.get("primaryArchetypeId") or profile.get("primaryArchetypeId") or assignment.get("staffBlueprintId")
        if primary:
            archetype_ids.add(primary)
        skills = [
            skill for skill in staff_template_skills
            if not skill.get("archetypeId") or skill.get("archetypeId") in archetype_ids
        ]
        staff_context[str(staff_id)] = {
            "id": staff_id,
            "label": effective.get("label") or profile.get("label") or staff_label(str(staff_id)),
            "alias": effective.get("alias") or "",
            "role": effective.get("role") or profile.get("profileTitle") or "",
            "communicationScope": effective.get("communicationScope") or "",
            "canContactHuman": bool(effective.get("canContactHuman")),
            "reportsTo": effective.get("reportsTo") or "",
            "skills": skills[:12],
            "editableSkillRules": effective.get("editableSkillRules") or [],
            "toolOperatingMode": effective.get("toolOperatingMode") or "",
            "contactPolicy": effective.get("contactPolicy") or "",
            "blueprint": {
                "id": assignment.get("staffBlueprintId") or blueprint.get("id") or "",
                "label": blueprint.get("label") or blueprint.get("name") or "",
                "summary": blueprint.get("summary") or blueprint.get("description") or "",
                "modelTiers": blueprint.get("modelTiers") or [],
                "analysisTemplates": blueprint.get("analysisTemplates") or [],
                "toolFallbackMatrix": blueprint.get("toolFallbackMatrix") or [],
            },
            "assignment": {
                "id": assignment.get("assignmentId"),
                "source": "department assignment override",
                "fieldAccess": "department_editable",
                "modelTier": effective.get("modelTier") or "",
                "analysisTemplateId": effective.get("analysisTemplateId") or "",
            },
        }
    identity = department.get("businessIdentity") or department.get("effectiveBusinessIdentity") or {}
    return {
        "departmentId": department_id,
        "department": {
            "id": department.get("id") or department_id,
            "label": department.get("label") or "",
            "purpose": department.get("purpose") or "",
            "approvalPolicy": department.get("approvalPolicy") or "",
            "aiManager": department.get("aiManager") or "AIstaff_Manager",
            "aiManagerAlias": department.get("aiManagerAlias") or "",
            "activeConnections": department.get("activeConnections") or [],
            "approvedDatasets": department.get("approvedDatasets") or [],
        },
        "organization": {
            "displayName": identity.get("organizationDisplayName") or "",
            "websiteUrl": identity.get("websiteUrl") or "",
            "primaryDomain": identity.get("primaryDomain") or "",
            "brandTone": identity.get("approvedBrandTone") or "",
        },
        "skillResolutionOrder": [
            "platform safety",
            "department skills",
            "staff template skills",
            "lane/tool skills",
            "project context",
            "workspace preferences",
            "approved learned updates",
        ],
        "platformSafetySkills": collection_rows(fabric, "platformSafetySkills"),
        "departmentSkills": department_skills,
        "staff": staff_context,
    }


def request_activity(payload: dict[str, Any]) -> dict[str, Any]:
    department_id = str(payload.get("departmentId") or "").strip()
    activity_name = str(payload.get("activityName") or "").strip()
    if not department_id:
        return {"ok": False, "error": "Missing departmentId."}
    if not activity_name:
        return {"ok": False, "error": "Missing activityName."}
    binding = find_activity_binding(activity_name, department_id)
    if not binding:
        return {"ok": False, "error": f"No activity binding found for {activity_name}."}
    input_payload = payload.get("input") if isinstance(payload.get("input"), dict) else {}
    input_payload = redact_sensitive_activity_payload(input_payload)
    staff_context = payload.get("staffContext") if isinstance(payload.get("staffContext"), dict) else resolved_department_staff_context(department_id)
    dry_run = bool(payload.get("dryRun", True))
    idempotency_key = str(payload.get("idempotencyKey") or f"{department_id}:{activity_name}:{uuid.uuid4().hex[:12]}").strip()
    with connect() as conn:
        duplicate = conn.execute(
            "SELECT * FROM activity_runs WHERE idempotency_key = ? ORDER BY created_at DESC LIMIT 1",
            (idempotency_key,),
        ).fetchone()
        if duplicate:
            return {
                "ok": True,
                "duplicate": True,
                "message": "An activity run already exists for this idempotency key.",
                "activityRun": row_to_activity_run(duplicate),
            }
    now = utc_ts()
    run_id = f"act_{uuid.uuid4().hex[:12]}"
    approval_required = bool(binding.get("approvalRequired"))
    approval_state = "Pending" if approval_required else "Not Required"
    status = "Pending Approval" if approval_required else "Ready"
    request_payload = {
        "departmentId": department_id,
        "organizationAccountId": payload.get("organizationAccountId") or "",
        "activityName": activity_name,
        "input": input_payload,
        "staffContext": staff_context,
        "sourceThreadId": payload.get("sourceThreadId") or payload.get("threadId") or "",
        "projectStepId": payload.get("projectStepId") or "",
        "goalId": payload.get("goalId") or "",
        "dryRun": dry_run,
        "binding": binding,
    }
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO activity_runs (
              activity_run_id, department_id, organization_account_id, binding_id,
              activity_name, status, approval_state, idempotency_key, dry_run,
              request_payload, result_payload, error, windmill_job_id, created_at,
              updated_at, requested_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', '', '', ?, ?, ?)
            """,
            (
                run_id,
                department_id,
                str(payload.get("organizationAccountId") or ""),
                binding["bindingId"],
                activity_name,
                status,
                approval_state,
                idempotency_key,
                1 if dry_run else 0,
                json.dumps(request_payload, ensure_ascii=False, default=str),
                now,
                now,
                str(payload.get("requestedBy") or "AIstaff_Manager"),
            ),
        )
        if approval_required:
            approval_id = f"appr_{uuid.uuid4().hex[:12]}"
            conn.execute(
                """
                INSERT INTO approval_tickets (
                  approval_id, activity_run_id, department_id, approval_type, status,
                  requested_by, approved_by, reason, created_at, updated_at, resolved_at
                )
                VALUES (?, ?, ?, 'external_activity', 'Pending', ?, '', ?, ?, ?, NULL)
                """,
                (
                    approval_id,
                    run_id,
                    department_id,
                    str(payload.get("requestedBy") or "AIstaff_Manager"),
                    str(payload.get("approvalReason") or "External/irreversible activity requires approval."),
                    now,
                    now,
                ),
            )
    row = get_activity_run_row(run_id)
    return {"ok": True, "activityRun": row_to_activity_run(row) if row else None, "binding": binding}


def get_activity_run_row(activity_run_id: str) -> sqlite3.Row | None:
    with connect() as conn:
        return conn.execute("SELECT * FROM activity_runs WHERE activity_run_id = ?", (activity_run_id,)).fetchone()


def approve_activity(payload: dict[str, Any]) -> dict[str, Any]:
    activity_run_id = str(payload.get("activityRunId") or payload.get("runId") or "").strip()
    approved = bool(payload.get("approved", True))
    if not activity_run_id:
        return {"ok": False, "error": "Missing activityRunId."}
    row = get_activity_run_row(activity_run_id)
    if not row:
        return {"ok": False, "error": f"Activity run not found: {activity_run_id}"}
    now = utc_ts()
    approval_state = "Approved" if approved else "Rejected"
    status = "Ready" if approved else "Blocked"
    with connect() as conn:
        conn.execute(
            """
            UPDATE activity_runs
            SET approval_state = ?, status = ?, updated_at = ?, error = ?
            WHERE activity_run_id = ?
            """,
            (approval_state, status, now, "" if approved else "Approval was rejected.", activity_run_id),
        )
        conn.execute(
            """
            UPDATE approval_tickets
            SET status = ?, approved_by = ?, reason = COALESCE(NULLIF(?, ''), reason),
                updated_at = ?, resolved_at = ?
            WHERE activity_run_id = ?
            """,
            (
                approval_state,
                str(payload.get("approvedBy") or "Human_Iman"),
                str(payload.get("reason") or ""),
                now,
                now,
                activity_run_id,
            ),
        )
    updated = get_activity_run_row(activity_run_id)
    return {"ok": True, "activityRun": row_to_activity_run(updated) if updated else None}


def activity_external_action_requires_approval(activity_name: str, binding: dict[str, Any]) -> bool:
    if binding.get("approvalRequired"):
        return True
    text = normalize_text(activity_name)
    return any(token in text for token in ["wordpress", "webhook", "email", "publish", "crm write", "send"])


def iter_dict_values(value: Any):
    if isinstance(value, dict):
        yield value
        for item in value.values():
            yield from iter_dict_values(item)
    elif isinstance(value, list):
        for item in value:
            yield from iter_dict_values(item)


def first_nested_value(value: Any, keys: set[str]) -> Any:
    normalized_keys = {key.lower() for key in keys}
    for row in iter_dict_values(value):
        for key, item in row.items():
            if str(key).lower() in normalized_keys and item not in (None, ""):
                if isinstance(item, dict) and item.get("rendered"):
                    return item.get("rendered")
                return item
    return ""


def normalize_wordpress_draft_return(parsed: Any, request_input: dict[str, Any] | None = None) -> dict[str, Any]:
    request_input = request_input or {}
    if isinstance(parsed, dict) and isinstance(parsed.get("wordpressDraft"), dict):
        existing = parsed.get("wordpressDraft") or {}
    else:
        existing = {}
    draft_id = existing.get("id") or first_nested_value(parsed, {"id", "ID", "postId", "post_id", "draftId", "draft_id"})
    draft_url = existing.get("url") or first_nested_value(parsed, {"link", "url", "permalink", "postUrl", "post_url", "draftUrl", "draft_url", "guid"})
    status = existing.get("status") or first_nested_value(parsed, {"status", "postStatus", "post_status"}) or request_input.get("status") or "draft"
    created_at = existing.get("createdAt") or first_nested_value(parsed, {"date", "date_gmt", "createdAt", "created_at", "createdDate", "created_date", "modified", "modified_gmt"})
    return {
        "id": str(draft_id or ""),
        "url": str(draft_url or ""),
        "status": str(status or "draft"),
        "createdAt": str(created_at or ""),
        "rawReturned": bool(parsed),
    }


def normalize_activity_result(activity_name: str, parsed: Any, request_input: dict[str, Any] | None = None) -> dict[str, Any]:
    normalized: dict[str, Any] = {}
    if activity_name == "worldbc.wordpress.create_draft":
        wordpress_draft = normalize_wordpress_draft_return(parsed, request_input)
        normalized.update(
            {
                "wordpressDraft": wordpress_draft,
                "wordpressDraftId": wordpress_draft.get("id", ""),
                "wordpressDraftUrl": wordpress_draft.get("url", ""),
                "wordpressDraftStatus": wordpress_draft.get("status", ""),
                "wordpressDraftCreatedAt": wordpress_draft.get("createdAt", ""),
            }
        )
    return normalized


def secure_activity_runtime_input(activity_name: str, department_id: str = "") -> dict[str, Any]:
    if activity_name == "worldbc.wordpress.create_draft":
        webhook_url = (
            local_env_value("WORLDBC_WORDPRESS_MAKE_WEBHOOK_URL", "")
            or local_env_value("WORLDBC_MAKE_WEBHOOK_URL", "")
            or local_env_value("MAKE_WORDPRESS_WEBHOOK_URL", "")
        )
        if webhook_url:
            return {"makeWebhookUrl": webhook_url}
    if activity_name == "worldbc.make.webhook_call":
        webhook_url = local_env_value("WORLDBC_MAKE_WEBHOOK_URL", "")
        if webhook_url:
            return {"webhookUrl": webhook_url}
    return {}


def run_windmill_activity(activity_run: dict[str, Any], binding: dict[str, Any]) -> dict[str, Any]:
    config = windmill_config()
    request_payload = activity_run.get("requestPayload") or {}
    metadata = binding.get("metadata") or {}
    if (activity_run.get("dryRun") and str(metadata.get("runnableKind") or "script").lower() != "flow") or not config["configured"]:
        return {
            "ok": True,
            "mock": True,
            "status": "Done",
            "summary": f"Mock activity completed for {activity_run.get('activityName')}.",
            "evidence": "local-mock://windmill/activity",
            "result": {
                "receivedInputKeys": sorted((request_payload.get("input") or {}).keys()),
                "windmillConfigured": config["configured"],
                "dryRun": bool(activity_run.get("dryRun")),
            },
        }
    token = local_env_value("WINDMILL_TOKEN", "")
    path = str(binding.get("windmillPath") or "").strip()
    if not path:
        return {"ok": False, "error": "Activity binding does not define a Windmill path.", "retryable": False}
    if path.startswith("http://") or path.startswith("https://"):
        url = path
    else:
        normalized_path = path if path.startswith("/") else f"/{path}"
        runnable_kind = str(metadata.get("runnableKind") or "script").lower()
        if runnable_kind == "flow":
            flow_path = normalized_path
            if flow_path.startswith("/p/"):
                flow_path = flow_path[len("/p/") :]
            flow_path = flow_path.strip("/")
            url = f"{config['baseUrl']}/api/w/{urllib.parse.quote(config['workspace'], safe='')}/jobs/run_wait_result/f/{urllib.parse.quote(flow_path, safe='/')}"
        elif normalized_path.startswith("/h/"):
            run_suffix = normalized_path
            url = f"{config['baseUrl']}/api/w/{urllib.parse.quote(config['workspace'], safe='')}/jobs/run_wait_result{run_suffix}"
        else:
            script_path = normalized_path
            if script_path.startswith("/p/"):
                script_path = script_path[len("/p/") :]
            script_path = script_path.strip("/")
            script = windmill_script_by_path(script_path)
            if not script.get("ok"):
                return {
                    "ok": False,
                    "status": "Failed",
                    "error": script.get("error") or f"Could not resolve Windmill script path: {script_path}",
                    "retryable": True,
                }
            script_hash = str(((script.get("body") or {}) if isinstance(script.get("body"), dict) else {}).get("hash") or "")
            if not script_hash:
                return {"ok": False, "status": "Failed", "error": f"Windmill script has no runnable hash: {script_path}", "retryable": True}
            run_suffix = f"/h/{urllib.parse.quote(script_hash, safe='')}"
            url = f"{config['baseUrl']}/api/w/{urllib.parse.quote(config['workspace'], safe='')}/jobs/run_wait_result{run_suffix}"
    runtime_input = {
        **(request_payload.get("input") or {}),
        **secure_activity_runtime_input(activity_run.get("activityName") or "", activity_run.get("departmentId") or ""),
    }
    actor_contexts = runtime_input.get("actorContexts") if isinstance(runtime_input.get("actorContexts"), dict) else {}
    if not actor_contexts and activity_run.get("departmentId") == SEO_DEMAND_ENGINE_DEPARTMENT_ID:
        actor_contexts = {
            staff_id: seo_staff_actor_runtime_context(activity_run.get("departmentId") or "", staff_id, runtime_input)
            for staff_id in SEO_STAFF_ACTOR_ORDER
        }
    body = json.dumps(
        {
            "activityRun": activity_run,
            "input": runtime_input,
            "staffContext": request_payload.get("staffContext") or resolved_department_staff_context(activity_run.get("departmentId") or ""),
            "actorContexts": actor_contexts,
            "managerCommand": runtime_input.get("managerCommand") if isinstance(runtime_input.get("managerCommand"), dict) else {},
        },
        ensure_ascii=False,
        default=str,
    ).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(request, timeout=60, context=windmill_ssl_context()) as response:
            raw = response.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = {"raw": raw[:1000]}
        script_ok = parsed.get("ok", True) is not False if isinstance(parsed, dict) else True
        normalized = normalize_activity_result(activity_run.get("activityName") or "", parsed, request_payload.get("input") or {})
        return {
            "ok": script_ok,
            "status": "Done" if script_ok else "Failed",
            "summary": (parsed.get("summary") if isinstance(parsed, dict) else "") or f"Windmill activity {activity_run.get('activityName')} returned successfully.",
            "windmillJobId": str((parsed.get("uuid") or parsed.get("jobId") or parsed.get("id") or "") if isinstance(parsed, dict) else ""),
            "result": parsed,
            **normalized,
        }
    except Exception as exc:
        return {"ok": False, "status": "Failed", "error": str(exc), "retryable": True}


def run_activity(payload: dict[str, Any]) -> dict[str, Any]:
    activity_run_id = str(payload.get("activityRunId") or payload.get("runId") or "").strip()
    if not activity_run_id:
        return {"ok": False, "error": "Missing activityRunId."}
    row = get_activity_run_row(activity_run_id)
    if not row:
        return {"ok": False, "error": f"Activity run not found: {activity_run_id}"}
    activity = row_to_activity_run(row)
    binding = find_activity_binding(activity["activityName"], activity["departmentId"]) or {}
    if activity_external_action_requires_approval(activity["activityName"], binding) and activity.get("approvalState") != "Approved":
        return {"ok": False, "activityRun": activity, "error": "This external activity requires approval before execution."}
    config = windmill_config()
    if not config["configured"] and not activity.get("dryRun"):
        now = utc_ts()
        with connect() as conn:
            conn.execute(
                "UPDATE activity_runs SET status = 'Needs Configuration', error = ?, updated_at = ? WHERE activity_run_id = ?",
                ("Windmill is not configured. Set WINDMILL_BASE_URL, WINDMILL_WORKSPACE, and WINDMILL_TOKEN or run as dry run.", now, activity_run_id),
            )
        updated = row_to_activity_run(get_activity_run_row(activity_run_id))
        return {"ok": False, "activityRun": updated, "windmill": windmill_status(), "error": updated.get("error")}
    now = utc_ts()
    with connect() as conn:
        conn.execute("UPDATE activity_runs SET status = 'Running', error = '', updated_at = ? WHERE activity_run_id = ?", (now, activity_run_id))
    latest = row_to_activity_run(get_activity_run_row(activity_run_id))
    result = run_windmill_activity(latest, binding)
    status = "Done" if result.get("ok") else "Failed"
    now = utc_ts()
    with connect() as conn:
        conn.execute(
            """
            UPDATE activity_runs
            SET status = ?, result_payload = ?, error = ?, windmill_job_id = ?, updated_at = ?
            WHERE activity_run_id = ?
            """,
            (
                status,
                json.dumps(result, ensure_ascii=False, default=str),
                "" if result.get("ok") else str(result.get("error") or "Activity failed."),
                str(result.get("windmillJobId") or ""),
                now,
                activity_run_id,
            ),
        )
    return {"ok": bool(result.get("ok")), "activityRun": row_to_activity_run(get_activity_run_row(activity_run_id)), "result": result, "windmill": windmill_status()}


def row_to_orchestration_run(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    return {
        "runId": row["run_id"],
        "departmentId": row["department_id"],
        "organizationAccountId": row["organization_account_id"],
        "goalId": row["goal_id"],
        "projectStepId": row["project_step_id"],
        "threadId": row["thread_id"],
        "status": row["status"],
        "currentNode": row["current_node"],
        "graphName": row["graph_name"],
        "state": parse_json_text(row["state_json"], {}),
        "lastError": row["last_error"],
        "createdAt": iso_like(row["created_at"]),
        "updatedAt": iso_like(row["updated_at"]),
        "completedAt": iso_like(row["completed_at"]) if row["completed_at"] else "",
        "createdBy": row["created_by"],
    }


def record_orchestration_event(run_id: str, department_id: str, event_type: str, node_name: str, summary: str, payload: dict[str, Any] | None = None, created_by: str = "AIstaff_Manager") -> None:
    now = utc_ts()
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO orchestration_events (
              event_id, run_id, department_id, event_type, node_name, summary,
              payload_json, created_at, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"evt_{uuid.uuid4().hex[:12]}",
                run_id,
                department_id,
                event_type,
                node_name,
                summary,
                json.dumps(payload or {}, ensure_ascii=False, default=str),
                now,
                created_by,
            ),
        )


def orchestration_engine_status() -> dict[str, Any]:
    package = langgraph_orchestrator.langgraph_package_status()
    return {
        "configured": True,
        "engine": "LangGraph" if package.get("installed") else "Local LangGraph-compatible graph",
        "graphName": langgraph_orchestrator.GRAPH_NAME,
        "nodes": langgraph_orchestrator.GRAPH_NODES,
        "package": package,
        "batch": "Batch 2 graph runtime",
        "setupGuidance": (
            "Install langgraph to use the official package runtime. The local fallback preserves the same persisted "
            "manager/staff graph state, approval gates, and Windmill activity handoff."
        ),
    }


def orchestration_activity_name_for_department(department: dict[str, Any], state: dict[str, Any]) -> str:
    text = normalize_text(" ".join([
        str(department.get("label") or ""),
        str(department.get("purpose") or ""),
        " ".join(str(item) for item in (department.get("projectTypes") or [])),
        str(state.get("intent") or ""),
    ]))
    if "seo" in text or "wordpress" in text or "content" in text:
        return "worldbc.wordpress.create_draft"
    if "search console" in text:
        return "worldbc.search_console.query"
    return "worldbc.file.text_extract"


def orchestration_activity_input(department: dict[str, Any], state: dict[str, Any]) -> dict[str, Any]:
    draft = state.get("draftOutput") if isinstance(state.get("draftOutput"), dict) else {}
    return {
        "departmentLabel": department.get("label") or state.get("departmentId") or "",
        "intent": state.get("intent") or "",
        "manager": state.get("manager") or "AIstaff_Manager",
        "assignedStaff": state.get("assignedStaff") or "",
        "draftTitle": draft.get("title") or "",
        "draftSummary": draft.get("summary") or "",
        "draftContent": draft.get("content") or "",
        "qualityChecks": (state.get("qa") or {}).get("checks") or [],
    }


def orchestration_existing_activity(activity_run_id: str) -> dict[str, Any] | None:
    if not activity_run_id:
        return None
    row = get_activity_run_row(activity_run_id)
    return row_to_activity_run(row) if row else None


def execute_orchestration_node(run: dict[str, Any]) -> tuple[str, str, dict[str, Any], str, str]:
    """Execute one supervised graph node and return next_node, status, state, event_type, summary."""
    current_node = str(run.get("currentNode") or "manager_intake")
    state = json_clone(run.get("state") or {})
    department_id = str(run.get("departmentId") or state.get("departmentId") or "")
    department = department_row_by_id(department_id)
    state["departmentId"] = department_id
    state["graphMode"] = orchestration_engine_status()["engine"]
    state.setdefault("events", [])

    if current_node == "manager_intake":
        state["managerDecision"] = {
            "summary": "AI Manager accepted the work and will route it to staff without bypassing approval gates.",
            "humanFacingOwner": state.get("manager") or (department or {}).get("aiManager") or "AIstaff_Manager",
        }
        next_node = "resolve_context"
        summary = "AI Manager intake completed."
    elif current_node == "resolve_context":
        resolved = p4_resolve_context({"departmentId": department_id})
        readiness = p4_readiness(department_id)
        state["resolvedContext"] = resolved
        state["readiness"] = readiness
        state["missingRequirements"] = resolved.get("missingRequirements") or []
        state["blocked"] = bool(state["missingRequirements"] and resolved.get("readinessState") not in {"ready", "approval_required"})
        next_node = "staff_router"
        summary = "Department package, stage, staff, skill packs, tools, and data context resolved."
    elif current_node == "staff_router":
        resolved = state.get("resolvedContext") if isinstance(state.get("resolvedContext"), dict) else {}
        staff = (resolved.get("staffProfile") or {}).get("id") or (resolved.get("assignedStaff") or {}).get("id") or (department or {}).get("aiManager") or "AIstaff_Manager"
        state["assignedStaff"] = staff
        state["staffRouting"] = {
            "assignedStaff": staff,
            "managerVisible": True,
            "specialistHumanFacing": False,
            "rule": "Specialist staff work under AI Manager; only manager-facing outputs reach the human.",
        }
        next_node = "specialist_work"
        summary = f"Routed work to {staff} under AI Manager supervision."
    elif current_node == "specialist_work":
        activity_name = orchestration_activity_name_for_department(department, state)
        is_wordpress = activity_name == "worldbc.wordpress.create_draft"
        state["activityName"] = activity_name
        state["draftOutput"] = {
            "title": "SEO-ready WordPress draft package" if is_wordpress else "Internal department work package",
            "summary": "Prepared a supervised draft for manager review and activity approval.",
            "content": "<p>Draft output placeholder prepared by the specialist graph node. Batch 3 can replace this with model-generated content.</p>" if is_wordpress else "Internal analysis package prepared for manager review.",
            "visibility": "manager_review",
        }
        next_node = "qa_gate"
        summary = "Specialist draft output prepared for QA."
    elif current_node == "qa_gate":
        activity_name = str(state.get("activityName") or orchestration_activity_name_for_department(department, state))
        binding = find_activity_binding(activity_name, department_id) or {}
        approval_required = activity_external_action_requires_approval(activity_name, binding)
        state["approvalRequired"] = approval_required
        state["qa"] = {
            "status": "Passed",
            "checks": [
                "manager-facing output only",
                "external action approval checked",
                "Windmill binding resolved" if binding else "Windmill binding missing",
            ],
            "bindingId": binding.get("bindingId") or "",
        }
        if approval_required and not state.get("activityRunId"):
            requested = request_activity(
                {
                    "departmentId": department_id,
                    "organizationAccountId": run.get("organizationAccountId") or "",
                    "activityName": activity_name,
                    "dryRun": True,
                    "requestedBy": state.get("manager") or "AIstaff_Manager",
                    "approvalReason": "LangGraph QA gate requires human confirmation before external execution.",
                    "goalId": run.get("goalId") or state.get("goalId") or "",
                    "threadId": run.get("threadId") or "",
                    "projectStepId": run.get("projectStepId") or "",
                    "input": orchestration_activity_input(department, state),
                }
            )
            activity = requested.get("activityRun") if requested.get("ok") else None
            if activity:
                state["activityRunId"] = activity.get("activityRunId")
                state["approvalState"] = activity.get("approvalState")
                state["activityStatus"] = activity.get("status")
        next_node = "approval_gate" if approval_required else "activity_request"
        summary = "QA gate completed; approval is required." if approval_required else "QA gate completed; no approval required."
    elif current_node == "approval_gate":
        activity_name = str(state.get("activityName") or orchestration_activity_name_for_department(department, state))
        activity = orchestration_existing_activity(str(state.get("activityRunId") or ""))
        if not activity:
            requested = request_activity(
                {
                    "departmentId": department_id,
                    "organizationAccountId": run.get("organizationAccountId") or "",
                    "activityName": activity_name,
                    "dryRun": True,
                    "requestedBy": state.get("manager") or "AIstaff_Manager",
                    "approvalReason": "LangGraph approval gate requires human confirmation before external execution.",
                    "goalId": run.get("goalId") or state.get("goalId") or "",
                    "threadId": run.get("threadId") or "",
                    "projectStepId": run.get("projectStepId") or "",
                    "input": orchestration_activity_input(department, state),
                }
            )
            activity = requested.get("activityRun") if requested.get("ok") else None
        if activity:
            state["activityRunId"] = activity.get("activityRunId")
            state["approvalState"] = activity.get("approvalState")
            state["activityStatus"] = activity.get("status")
        if state.get("approvalState") == "Approved":
            next_node = "activity_request"
            summary = "Human approval found; graph can proceed to Windmill activity execution."
        else:
            next_node = "approval_gate"
            summary = "Graph paused for human approval before external activity execution."
    elif current_node == "activity_request":
        activity = orchestration_existing_activity(str(state.get("activityRunId") or ""))
        if not activity:
            next_node = "approval_gate" if state.get("approvalRequired") else "activity_request"
            summary = "No activity run exists yet; graph returned to approval/activity preparation."
        else:
            result = run_activity({"activityRunId": activity.get("activityRunId")})
            activity = result.get("activityRun") or activity
            state["activityStatus"] = activity.get("status")
            state["activityResult"] = result.get("result") or activity.get("resultPayload") or {}
            if activity.get("status") == "Done":
                next_node = "manager_summary"
                summary = "Windmill activity completed and result returned to AI Manager."
            elif activity.get("status") == "Needs Configuration":
                next_node = "activity_request"
                summary = "Windmill activity is waiting for configuration."
            else:
                state["blocked"] = True
                next_node = "activity_request"
                summary = activity.get("error") or "Windmill activity did not complete."
    else:
        state["managerSummary"] = {
            "summary": "AI Manager has the latest staff output and activity result.",
            "nextAction": "Review result, continue the goal, or start another run.",
        }
        next_node = "manager_summary"
        summary = "AI Manager summary completed."

    status = langgraph_orchestrator.terminal_status(next_node, state)
    state["lastStep"] = {"from": current_node, "to": next_node, "at": iso_like(), "summary": summary}
    state["events"] = (state.get("events") or [])[-20:] + [state["lastStep"]]
    return next_node, status, state, "node_executed", summary


def orchestration_status(department_id: str = "") -> dict[str, Any]:
    params: list[Any] = []
    where = ""
    if department_id:
        where = "WHERE department_id = ?"
        params.append(department_id)
    with connect() as conn:
        rows = conn.execute(
            f"SELECT * FROM orchestration_runs {where} ORDER BY updated_at DESC LIMIT 20",
            params,
        ).fetchall()
        counts = conn.execute(
            f"SELECT status, COUNT(*) AS c FROM orchestration_runs {where} GROUP BY status",
            params,
        ).fetchall()
        events = conn.execute(
            """
            SELECT *
            FROM orchestration_events
            WHERE run_id IN (%s)
            ORDER BY created_at DESC
            LIMIT 30
            """ % ",".join("?" for _ in rows),
            [row["run_id"] for row in rows],
        ).fetchall() if rows else []
    engine = orchestration_engine_status()
    return {
        **engine,
        "departmentId": department_id,
        "counts": {str(row["status"] or "Unknown"): int(row["c"] or 0) for row in counts},
        "runs": [row_to_orchestration_run(row) for row in rows],
        "events": [
            {
                "eventId": row["event_id"],
                "runId": row["run_id"],
                "departmentId": row["department_id"],
                "eventType": row["event_type"],
                "nodeName": row["node_name"],
                "summary": row["summary"],
                "payload": parse_json_text(row["payload_json"], {}),
                "createdAt": iso_like(row["created_at"]),
                "createdBy": row["created_by"],
            }
            for row in events
        ],
    }


def start_orchestration(payload: dict[str, Any]) -> dict[str, Any]:
    department_id = str(payload.get("departmentId") or "").strip()
    if not department_id:
        return {"ok": False, "error": "Missing departmentId."}
    department = department_row_by_id(department_id)
    identity = department_identity_from_row(department, workspace_profile()) if department else {}
    run_id = f"orch_{uuid.uuid4().hex[:12]}"
    now = utc_ts()
    state = {
        "departmentId": department_id,
        "goalId": payload.get("goalId") or "",
        "intent": payload.get("intent") or "Advance department work under supervised autonomy.",
        "manager": (department or {}).get("aiManager") or "AIstaff_Manager",
        "resolvedContext": p4_resolve_context({"departmentId": department_id}),
        "windmillConfigured": windmill_config()["configured"],
        "graphName": langgraph_orchestrator.GRAPH_NAME,
        "graphNodes": langgraph_orchestrator.GRAPH_NODES,
    }
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO orchestration_runs (
              run_id, department_id, organization_account_id, goal_id, project_step_id,
              thread_id, status, current_node, graph_name, state_json, last_error,
              created_at, updated_at, completed_at, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, 'In Progress', 'manager_intake', 'ai_department_langgraph_v1', ?, '', ?, ?, NULL, ?)
            """,
            (
                run_id,
                department_id,
                str(identity.get("id") or payload.get("organizationAccountId") or ""),
                str(payload.get("goalId") or ""),
                str(payload.get("projectStepId") or ""),
                str(payload.get("threadId") or ""),
                json.dumps(state, ensure_ascii=False, default=str),
                now,
                now,
                str(payload.get("createdBy") or "AIstaff_Manager"),
            ),
        )
    record_orchestration_event(run_id, department_id, "run_created", "manager_intake", "LangGraph-compatible orchestration run created.", state, str(payload.get("createdBy") or "AIstaff_Manager"))
    return {"ok": True, "orchestrationRun": row_to_orchestration_run(get_orchestration_run_row(run_id)), "orchestration": orchestration_status(department_id)}


def get_orchestration_run_row(run_id: str) -> sqlite3.Row | None:
    with connect() as conn:
        return conn.execute("SELECT * FROM orchestration_runs WHERE run_id = ?", (run_id,)).fetchone()


def step_orchestration(payload: dict[str, Any]) -> dict[str, Any]:
    run_id = str(payload.get("runId") or "").strip()
    if not run_id:
        return {"ok": False, "error": "Missing runId."}
    row = get_orchestration_run_row(run_id)
    if not row:
        return {"ok": False, "error": f"Orchestration run not found: {run_id}"}
    current = row_to_orchestration_run(row)
    next_node, status, state, event_type, summary = execute_orchestration_node(current)
    now = utc_ts()
    completed_at = now if status == "Completed" else None
    with connect() as conn:
        conn.execute(
            """
            UPDATE orchestration_runs
            SET current_node = ?, status = ?, state_json = ?, updated_at = ?, completed_at = COALESCE(?, completed_at)
            WHERE run_id = ?
            """,
            (next_node, status, json.dumps(state, ensure_ascii=False, default=str), now, completed_at, run_id),
        )
    record_orchestration_event(run_id, current["departmentId"], event_type, next_node, summary, state)
    return {"ok": True, "orchestrationRun": row_to_orchestration_run(get_orchestration_run_row(run_id)), "orchestration": orchestration_status(current["departmentId"])}


def local_worker_command() -> str:
    return str(os.environ.get("AI_DEPARTMENT_WORKER_COMMAND") or get_meta("local_worker_command", "") or "").strip()


def local_worker_recommended_command() -> str:
    return f'python "{TEST_WORKER_SCRIPT_PATH}"'


def local_worker_enabled() -> bool:
    return get_meta("local_worker_enabled", "TRUE").upper() == "TRUE"


def codex_work_counts() -> dict[str, int]:
    init_db()
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT status, COUNT(*) AS count
            FROM codex_work_items
            GROUP BY status
            """
        ).fetchall()
    counts = {str(row["status"] or "Unknown"): int(row["count"] or 0) for row in rows}
    open_count = sum(count for status, count in counts.items() if status not in {"Done", "Blocked", "Cancelled"})
    return {
        "open": open_count,
        "queued": counts.get("Queued", 0),
        "ready": counts.get("Ready", 0),
        "inProgress": counts.get("In Progress", 0),
        "blocked": counts.get("Blocked", 0),
        "done": counts.get("Done", 0),
    }


def local_worker_status() -> dict[str, Any]:
    command = local_worker_command()
    with connect() as conn:
        running = conn.execute(
            """
            SELECT * FROM codex_work_items
            WHERE status = 'In Progress'
            ORDER BY updated_at DESC
            LIMIT 1
            """
        ).fetchone()
    return {
        "enabled": local_worker_enabled(),
        "commandConfigured": bool(command),
        "command": command,
        "recommendedCommand": local_worker_recommended_command(),
        "setupGuidance": (
            "Set AI_DEPARTMENT_WORKER_COMMAND to the recommended command for the bundled local test worker, "
            "or replace it with an enterprise/Codex/OpenAI worker command that accepts one work item JSON on stdin."
        ),
        "workerContract": {
            "stdin": "one codex work item as JSON",
            "stdout": {"status": "Done | Blocked | Ready", "resultSummary": "string", "evidenceLink": "string", "lastError": "string"},
            "safety": "Worker output must not send email, submit tenders, or perform external side effects.",
        },
        "currentlyRunningItem": row_to_codex_work_item(running) if running else None,
        "counts": codex_work_counts(),
        "lastRun": parse_json_meta("local_worker_last_run", {}),
        "lastError": get_meta("local_worker_last_error", ""),
        "p4Runtime": p4_runtime_handler_summary(),
    }


def set_local_worker_enabled(enabled: bool) -> dict[str, Any]:
    set_meta("local_worker_enabled", "TRUE" if enabled else "FALSE")
    record_worker_run("Local Worker", "Enabled" if enabled else "Paused", "Local worker setting changed.", "")
    return local_worker_status()


def set_local_worker_command(command: str) -> dict[str, Any]:
    command = str(command or "").strip()
    set_meta("local_worker_command", command)
    set_meta("local_worker_last_error", "" if command else "Worker command not configured.")
    record_worker_run("Local Worker", "Configured" if command else "Unconfigured", "Local worker command updated.", "")
    return local_worker_status()


def short_blocker_row(row: dict[str, Any], kind: str = "task") -> dict[str, Any]:
    return {
        "kind": kind,
        "taskId": row.get("taskId") or row.get("Task ID") or "",
        "queueId": row.get("queueId") or row.get("Queue ID") or row.get("sourceQueueId") or "",
        "applicationId": row.get("applicationId") or row.get("Application ID") or "",
        "assignedTo": row.get("assignedTo") or row.get("Assigned To") or "",
        "status": row.get("status") or row.get("sendStatus") or row.get("approvalStatus") or "",
        "title": row.get("taskType") or row.get("recipientName") or row.get("subject") or "",
        "nextAction": row.get("nextAction") or row.get("lastError") or row.get("resultNotes") or row.get("subject") or "",
    }


def automation_blockers(snapshot: Dashboard | None = None) -> dict[str, Any]:
    snapshot = snapshot or {}
    manager = snapshot.get("managerReview") or {}
    tasks = [row for row in (snapshot.get("tasks") or []) if isinstance(row, dict)]
    manager_tasks = [row for row in (manager.get("tasks") or []) if isinstance(row, dict)]
    email_rows = flatten_email_queue(snapshot.get("emailQueue") or manager.get("queue") or {})
    human: list[dict[str, Any]] = []
    missing_files: list[dict[str, Any]] = []
    email_approval: list[dict[str, Any]] = []
    codex_items = list_codex_work_items("open", limit=50).get("workItems", [])
    for row in manager_tasks + tasks:
        text = normalize_text(
            compact_join(
                [
                    row.get("status"),
                    row.get("taskType"),
                    row.get("taskCategory"),
                    row.get("nextAction"),
                    row.get("lastError"),
                    row.get("resultNotes"),
                ]
            )
        )
        if task_is_terminal(row):
            continue
        if "missing" in text and ("file" in text or "pdf" in text or "appendix" in text or "scope" in text):
            missing_files.append(short_blocker_row(row, "missing_files"))
        if is_human_responsible(row.get("assignedTo")) or normalize_text(row.get("taskCategory")) == "human decision":
            human.append(short_blocker_row(row, "human_approval"))
    for row in email_rows:
        text = normalize_text(compact_join([row.get("sendStatus"), row.get("approvalStatus"), row.get("lastError")]))
        if "needs approval" in text or "not approved" in text or "blocked" in text:
            email_approval.append(short_blocker_row(row, "email_approval"))
    fabric_errors = (load_capability_fabric().get("errors") or [])[:25]
    def dedupe(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen: set[str] = set()
        unique: list[dict[str, Any]] = []
        for row in rows:
            key = str(row.get("taskId") or row.get("queueId") or row.get("workItemId") or row.get("nextAction") or "")
            if key in seen:
                continue
            seen.add(key)
            unique.append(row)
        return unique

    groups = {
        "humanApproval": dedupe(human)[:25],
        "missingFiles": dedupe(missing_files)[:25],
        "externalEmailApproval": dedupe(email_approval)[:25],
        "codexWorker": [
            {
                "workItemId": item.get("workItemId"),
                "sourceTaskId": item.get("sourceTaskId"),
                "assignedStaff": item.get("assignedStaff"),
                "status": item.get("status"),
                "title": item.get("title"),
                "lastError": item.get("lastError"),
            }
            for item in codex_items
        ][:25],
        "fabricErrors": [{"message": error} for error in fabric_errors],
    }
    counts = {key: len(value) for key, value in groups.items()}
    return {"counts": counts, "groups": groups}


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
    set_meta("autopilot_explicitly_paused", "FALSE" if enabled else "TRUE")
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


def fabric_slug(value: Any, fallback: str = "department") -> str:
    text = str(value or "").strip().lower()
    slug = re.sub(r"[^a-z0-9]+", "_", text).strip("_")
    return slug or fallback


def default_staff_profiles() -> list[dict[str, Any]]:
    titles = {
        "AIstaff_Manager": "Department Manager",
        "AIstaff_OpportunityHunter": "Tender Document Analyst",
        "AIstaff_FitAnalyst": "Fit And Supplier Match Analyst",
        "AIstaff_ProfessorResearchAnalyst": "Supplier Mapper",
        "AIstaff_ApplicationPackMaker": "Tender Package Maker",
        "AIstaff_ApplicationPackSender": "Supplier Outreach Specialist",
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
            "communicationScope": "human_to_manager",
            "canContactHuman": True,
            "canCreateHumanFacingThreads": True,
            "reportsTo": "",
            "visibilityMode": "ownedDepartment",
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
            "contactPolicy": "Only AI Manager communicates directly with the human manager and routes specialist work underneath the department.",
            "communicationScope": "manager_human_and_staff",
            "canContactHuman": True,
            "canCreateHumanFacingThreads": True,
            "reportsTo": "Human_Iman",
            "visibilityMode": "ownedDepartment",
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
                "communicationScope": "staff_to_manager_only",
                "canContactHuman": False,
                "canCreateHumanFacingThreads": False,
                "reportsTo": "AIstaff_Manager",
                "visibilityMode": "ownedDepartment",
                "avatarKind": "abstract-ai",
                "workspaceEditable": True,
                "locked": False,
            }
        )
    return rows


def default_staff_archetypes() -> list[dict[str, Any]]:
    return [
        {
            "id": "archetype_manager_orchestrator",
            "label": "Manager / Orchestrator",
            "purpose": "Receive human intent, select the right specialist, create or route tasks, and keep the department moving without bypassing safety gates.",
            "preferredModel": "fast reasoning model for routing; higher reasoning only for complex strategy",
            "allowedPluginFamilies": ["local_tasks", "crm_read", "reporting", "codex_worker_queue"],
            "requiresApprovalFor": ["external_email", "portal_submission", "deleting_records", "applying_learning", "closing_incomplete_leads"],
            "outputContract": ["decision", "next_owner", "task_or_thread_update", "blocker_if_any"],
            "stopConditions": ["missing human policy", "destructive action", "external communication", "credentials or billing change"],
            "workspaceEditable": True,
        },
        {
            "id": "archetype_thinking_analyst",
            "label": "Thinking / Analysis Model",
            "purpose": "Read evidence, reason over fit and risk, produce structured recommendations, and cite sources before routing downstream.",
            "preferredModel": "reasoning model with medium effort",
            "allowedPluginFamilies": ["crm_read", "files_read", "official_web_sources", "local_tasks"],
            "requiresApprovalFor": ["external_email", "crm_write_except_task_notes", "final_bid_no_bid_decision"],
            "outputContract": ["finding_summary", "evidence_links", "confidence", "recommended_next_action"],
            "stopConditions": ["missing tender files", "unverified source", "low confidence", "human bid/no-bid decision needed"],
            "workspaceEditable": True,
        },
        {
            "id": "archetype_email_sender",
            "label": "Email Sender / Outreach Operator",
            "purpose": "Prepare, safety-check, queue, and process approved outbound emails through configured mail plugins or local SMTP draft mode.",
            "preferredModel": "low-cost model for safety checks; no creative rewriting after approval without review",
            "allowedPluginFamilies": ["email_queue", "gmail_or_outlook", "smtp_draft", "attachment_verification", "local_tasks"],
            "requiresApprovalFor": ["first_contact_email", "supplier_quote_request", "resending_to_duplicate_recipient", "attachments_to_external_party"],
            "outputContract": ["recipient", "subject", "approval_status", "safety_status", "send_or_draft_result"],
            "stopConditions": ["approval missing", "unsafe wording", "missing attachments", "duplicate recipient unresolved"],
            "workspaceEditable": True,
        },
        {
            "id": "archetype_document_maker",
            "label": "Document / Package Maker",
            "purpose": "Create structured document packages from approved templates, evidence, and task requirements.",
            "preferredModel": "higher reasoning/writing model for final packages",
            "allowedPluginFamilies": ["documents", "files_read", "local_packages", "crm_read", "local_tasks"],
            "requiresApprovalFor": ["external_send", "final_submission", "template_policy_change"],
            "outputContract": ["package_path", "content_summary", "missing_inputs", "style_qa_status"],
            "stopConditions": ["missing source files", "template unavailable", "style QA failed", "commercial data missing"],
            "workspaceEditable": True,
        },
        {
            "id": "archetype_report_maker",
            "label": "Report Maker",
            "purpose": "Summarize department health, KPIs, blockers, staff workload, and next actions for human review.",
            "preferredModel": "fast summarization model with deterministic structure",
            "allowedPluginFamilies": ["local_dashboard", "crm_read", "spreadsheets", "documents", "charts"],
            "requiresApprovalFor": ["publishing_report_external", "changing_kpi_targets", "closing_blockers"],
            "outputContract": ["executive_summary", "kpis", "blockers", "next_actions"],
            "stopConditions": ["data unavailable", "conflicting counts", "missing reporting period"],
            "workspaceEditable": True,
        },
        {
            "id": "archetype_crm_operator",
            "label": "CRM / Data Operator",
            "purpose": "Read and update CRM/local records according to schema-aware rules and preserve an event trail.",
            "preferredModel": "low-cost deterministic model for schema routing and validation",
            "allowedPluginFamilies": ["appsheet_crm", "local_sqlite", "spreadsheets", "task_threads"],
            "requiresApprovalFor": ["deleting_records", "bulk_updates", "status_to_submitted_or_won", "schema_change"],
            "outputContract": ["record_id", "table", "field_changes", "event_log"],
            "stopConditions": ["unknown table", "missing required key", "ambiguous record match", "write permission missing"],
            "workspaceEditable": True,
        },
        {
            "id": "archetype_file_qa",
            "label": "File / Upload QA",
            "purpose": "Check uploaded files, tender PDFs, screenshots, imports, and mapping evidence before other staff rely on them.",
            "preferredModel": "vision/document-capable model when files are visual or scanned",
            "allowedPluginFamilies": ["files_read", "documents", "spreadsheets", "ocr_or_pdf_tools", "local_tasks"],
            "requiresApprovalFor": ["discarding_files", "accepting_uncertain_mapping", "external_file_sharing"],
            "outputContract": ["accepted_files", "rejected_files", "data_shape", "mapping_assumptions", "blockers"],
            "stopConditions": ["corrupt file", "unreadable scan", "missing source file", "mapping cannot be verified"],
            "workspaceEditable": True,
        },
    ]


def default_platform_operating_model() -> dict[str, Any]:
    return {
        "id": "platform_ai_department_operating_model_v1",
        "label": "Reusable Supervised AI Department Operating Model",
        "terminologyAliases": {
            "Musahama": "platform",
            "Solution": "AI Department",
            "Project": "Department case",
            "Task Thread": "Human / AI Manager work record",
        },
        "departmentContract": {
            "goal": (
                "Each solution becomes a reusable supervised AI Department with an AI Manager, specialist AI Staff, "
                "project plans, quality gates, outputs, connections, databases, and reusable templates."
            ),
            "humanCommunicationRule": "The human talks to the AI Manager. Specialist AI Staff work underneath the Manager.",
            "staffCommunicationRule": "Specialist AI Staff report to the AI Manager and do not ask the human directly unless the Manager routes the request.",
            "managerRole": "Interpret human intent, route specialist work, consolidate results, and escalate only real decisions or blockers.",
            "safetyBoundary": "External supplier emails, tender submissions, learning updates, destructive CRM changes, and incomplete-case closures remain supervised.",
        },
        "threadPolicy": {
            "createThreadsFor": ["human_message", "approval", "missing_input", "blocker", "review", "escalation", "worker_handoff", "system_audit"],
            "doNotCreateThreadsFor": ["casual_internal_progress", "duplicate_status_noise", "routine_completed_work_without_decision"],
            "closedThreadLearning": "Closed threads may create skill-update candidates, but applying learnings requires human approval.",
        },
        "skillArchitecture": {
            "model": "Scoped skills with explicit bindings, not one giant skill table.",
            "resolutionOrder": [
                "platformSafetySkills",
                "departmentSkills",
                "staffTemplateSkills",
                "laneAdapterSkills",
                "projectContext",
                "userPreferences",
                "approvedLearnedUpdates",
            ],
            "overrideRule": "User-editable preferences and learned updates must never override locked platform safety, department policy, or lane/tool execution rules.",
            "controlSplit": {
                "platformAdmin": ["department blueprints", "staff templates", "lane/tool adapters", "workflow templates", "locked safety skills", "locked lane execution skills"],
                "workspaceSettings": ["company identity", "business registration", "tax/VAT IDs", "approved sender identities", "brand tone", "active integrations", "approved databases"],
                "departmentExplorer": ["installed department preferences", "manager aliases", "staff aliases", "vocabulary", "escalation contacts", "allowed quality-gate thresholds"],
                "projectWorkspace": ["plans", "tasks", "threads", "approvals", "outputs", "evidence"],
            },
        },
        "automationRuntimeArchitecture": {
            "currentApproach": "Use the platform database, explicit queue/state tables, cron triggers, and the internal runner before adding an external workflow engine.",
            "persistentState": [
                "department project plans",
                "project plan steps",
                "task threads",
                "thread messages",
                "task assignments",
                "skill-update candidates",
                "worker runs",
                "codex work items",
            ],
            "runnerResponsibilities": [
                "pick queued work",
                "record run status",
                "record current step and progress",
                "persist result summary",
                "persist last error",
                "retry recoverable failures",
                "stop at approval, missing input, or safety gates",
            ],
            "projectSchedulerPolicy": {
                "goal": "Every AI Department project should have durable scheduler state and a plan whose steps are owned by the AI Manager or specialist AI Staff.",
                "stepStates": ["Queued", "Ready", "In Progress", "Blocked", "Needs Approval", "Done", "Failed Requires Attention"],
                "ownerRule": "Plan steps are assigned to AI Manager or specialist AI Staff; human-facing work is routed through Manager threads.",
                "progressRule": "Async work must write partial progress so operators can replay, triage, or resume without trusting in-process memory.",
            },
            "retryPolicy": {
                "maxAttempts": 3,
                "afterExhaustion": "failed_requires_attention",
                "operatorExpectation": "Failures should leave enough state, last error, and next action for support triage.",
            },
            "externalWorkflowEnginePolicy": {
                "triggerDevDecision": "Do not add Trigger.dev in v1.",
                "reason": "The current database plus cron/internal-runner approach is enough while the product model still needs stronger plan, state, approval, visibility, and escalation discipline.",
                "reconsiderWhen": [
                    "step-level durable execution is needed across many autonomous jobs",
                    "long-running workflows need built-in heartbeats or cancellation",
                    "concurrency control is difficult to maintain locally",
                    "workflow replay UI becomes a product/support requirement",
                    "distributed locks are needed across multiple runners",
                    "deep observability is required across many departments",
                ],
            },
        },
        "visibilityModes": {
            "ownedDepartment": {
                "label": "AI Departments I Own",
                "visible": ["overview", "projects", "AI Manager", "AI Staff", "skills", "connections", "databases", "quality gates", "outputs", "settings"],
                "hidden": ["provider secrets", "raw operation keys"],
            },
            "sponsoredAssignment": {
                "label": "Sponsored Work Assigned To Me",
                "visible": ["sponsor", "assignment", "next task", "project thread", "uploads", "confirmations", "approvals", "outputs"],
                "hidden": ["internal recipes", "lanes", "provider routing", "scoring internals", "staff implementation details"],
            },
        },
        "templateFamilies": [
            "Department Templates",
            "Staff Models",
            "Skill Packs",
            "Toolsets",
            "Workflow Plans",
        ],
        "supportInventoryPattern": {
            "columns": ["Must Have", "Nice To Have"],
            "groups": ["Connections", "Databases"],
            "defaultRowFields": ["status", "name", "reason", "action"],
        },
        "internalPlatformTeam": [
            {
                "id": "platform_designer_agent",
                "label": "Designer Agent",
                "purpose": "Turn UI requests into approved patterns and acceptance checks before implementation.",
                "laneRule": "Design review happens before code edits for UI changes.",
            },
            {
                "id": "platform_upload_qa_agent",
                "label": "Upload QA Agent",
                "purpose": "Check screenshots, document references, imports, and mapping evidence before implementation relies on them.",
                "laneRule": "Upload evidence is verified before downstream implementation.",
            },
            {
                "id": "platform_codex_developer",
                "label": "Codex Developer",
                "purpose": "Own code edits, validation, PR body, versioning, and final handoff.",
                "laneRule": "One actor owns one code branch or implementation lane at a time.",
            },
            {
                "id": "platform_deployment_watcher",
                "label": "Deployment Watcher",
                "purpose": "Verify merged changes are actually live in the deployed runtime.",
                "laneRule": "Deployment verification is separate from implementation.",
            },
            {
                "id": "platform_ux_auditor",
                "label": "M3 UX Auditor",
                "purpose": "Check Material 3, house style, and page-pattern drift.",
                "laneRule": "UX drift is reported as review evidence, not hidden inside implementation notes.",
            },
            {
                "id": "platform_review_resolver",
                "label": "Review Resolver",
                "purpose": "Check unresolved AI and human PR comments and route fixes.",
                "laneRule": "Review comments are resolved before final handoff.",
            },
        ],
        "workspaceEditable": False,
    }


def default_scoped_skill_catalogs() -> dict[str, list[dict[str, Any]]]:
    platform_safety = [
        {
            "id": "platform_safety_supervised_external_actions",
            "label": "Supervised External Actions",
            "scope": "platformSafety",
            "summary": "External communication, tender submission, destructive data changes, and learning application require approved gates.",
            "rules": [
                "Do not send external supplier/client emails without approval.",
                "Do not submit tender portals automatically.",
                "Do not delete CRM rows or files as normal staff work.",
                "Do not apply learned behavior updates without human approval.",
            ],
            "ownerLayer": "platformAdmin",
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "platform_safety_manager_human_gate",
            "label": "Manager First Human Contact",
            "scope": "platformSafety",
            "summary": "Specialist AI Staff report to the AI Manager; only the Manager asks the human directly.",
            "rules": [
                "Human-facing requests go through AIstaff_Manager.",
                "Specialist staff report blockers/questions to AIstaff_Manager.",
                "Create human-facing threads only for decisions, blockers, approvals, missing inputs, review, or escalation.",
            ],
            "ownerLayer": "platformAdmin",
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "platform_safety_no_backend_disclosure",
            "label": "No Backend/System Detail Disclosure",
            "scope": "platformSafety",
            "summary": "Keep provider keys, backend routing, raw operation keys, and protected system prompts out of user-facing workspace views.",
            "rules": [
                "Do not expose provider keys or raw operation IDs in normal workspace views.",
                "Do not show sponsored participants recipes, lanes, scoring internals, or staff implementation details.",
            ],
            "ownerLayer": "platformAdmin",
            "locked": True,
            "workspaceEditable": False,
        },
    ]
    department_skills = [
        {
            "id": "dept_skill_gcc_lab_tone_vocabulary",
            "label": "GCC Lab Tone And Vocabulary",
            "scope": "department",
            "summary": "Use GCC lab tender vocabulary, concise business tone, and approved manager/sponsor naming.",
            "rules": [
                "Use tender Lead, tender case, supplier, quotation, package, and submission vocabulary.",
                "Write concise business updates with exact blocker, next owner, and next action.",
                "Accept English/Persian mixed instructions from Iman.",
            ],
            "ownerLayer": "departmentExplorer",
            "locked": False,
            "workspaceEditable": True,
        },
        {
            "id": "dept_skill_gcc_lab_approval_policy",
            "label": "GCC Lab Approval Policy",
            "scope": "department",
            "summary": "Department-level approval and visibility policy inherited by every staff member.",
            "rules": [
                "All supplier outreach remains approval-gated.",
                "Incomplete Leads are not closed automatically unless Iman approves an auto-close policy.",
                "Human-facing questions are phrased as operational choices for Alex to route.",
            ],
            "ownerLayer": "departmentExplorer",
            "locked": False,
            "workspaceEditable": True,
        },
        {
            "id": "dept_skill_owner_sponsor_visibility",
            "label": "Owner / Sponsored Visibility",
            "scope": "department",
            "summary": "Owners inspect department structure; sponsored participants see assigned work only.",
            "rules": [
                "Owners/admins can inspect staff, skills, connections, databases, quality gates, and outputs.",
                "Sponsored participants see tasks, uploads, confirmations, approvals, and accepted outputs only.",
            ],
            "ownerLayer": "departmentExplorer",
            "locked": False,
            "workspaceEditable": True,
        },
    ]
    staff_template_skills = [
        {
            "id": "staff_skill_manager_orchestrator",
            "label": "Manager Orchestrator Skill",
            "scope": "staffTemplate",
            "archetypeId": "archetype_manager_orchestrator",
            "summary": "Interpret human intent, route specialist work, consolidate results, and escalate only real decisions.",
            "rules": ["Choose the next specialist.", "Keep Iman informed through task threads.", "Do not bypass safety gates."],
            "ownerLayer": "platformAdmin",
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "staff_skill_thinking_analyst",
            "label": "Thinking Analyst Skill",
            "scope": "staffTemplate",
            "archetypeId": "archetype_thinking_analyst",
            "summary": "Read evidence, reason over fit/risk, and produce structured recommendations with sources.",
            "rules": ["Cite evidence.", "Separate facts from assumptions.", "Escalate low-confidence decisions to Manager."],
            "ownerLayer": "platformAdmin",
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "staff_skill_outreach_operator",
            "label": "Outreach Operator Skill",
            "scope": "staffTemplate",
            "archetypeId": "archetype_email_sender",
            "summary": "Prepare professional business outreach, summarize replies, and keep send actions approval-gated.",
            "rules": ["Draft concise supplier messages.", "Detect objections or sensitive claims.", "Ask Manager before sending or changing approved text."],
            "ownerLayer": "platformAdmin",
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "staff_skill_document_maker",
            "label": "Document Maker Skill",
            "scope": "staffTemplate",
            "archetypeId": "archetype_document_maker",
            "summary": "Create tender packages from templates, evidence, compliance requirements, and approved inputs.",
            "rules": ["Use approved templates.", "List missing inputs.", "Keep package QA explicit before external send."],
            "ownerLayer": "platformAdmin",
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "staff_skill_report_maker",
            "label": "Report Maker Skill",
            "scope": "staffTemplate",
            "archetypeId": "archetype_report_maker",
            "summary": "Summarize department health, KPIs, blockers, workload, and next actions.",
            "rules": ["Lead with blockers.", "Show next action and owner.", "Avoid hiding failed or waiting work."],
            "ownerLayer": "platformAdmin",
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "staff_skill_crm_operator",
            "label": "CRM Operator Skill",
            "scope": "staffTemplate",
            "archetypeId": "archetype_crm_operator",
            "summary": "Use schema-aware CRM/local data operations with event trails and guarded writes.",
            "rules": ["Validate table names and keys.", "Avoid ambiguous writes.", "Leave event-log evidence."],
            "ownerLayer": "platformAdmin",
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "staff_skill_file_qa",
            "label": "File QA Skill",
            "scope": "staffTemplate",
            "archetypeId": "archetype_file_qa",
            "summary": "Validate tender files, uploads, screenshots, imports, and mapping evidence before downstream work uses them.",
            "rules": ["Reject corrupt or unreadable files.", "Record mapping assumptions.", "Escalate missing files to Manager."],
            "ownerLayer": "platformAdmin",
            "locked": True,
            "workspaceEditable": False,
        },
    ]
    lane_adapter_skills = [
        {
            "id": "lane_skill_email_queue_safety",
            "label": "Email Queue Safety Lane",
            "scope": "laneAdapter",
            "laneId": "lane_gmail_bridge",
            "summary": "Queue, preflight, and process approved outreach without bypassing content/attachment/duplicate checks.",
            "rules": ["Draft before send when approval is required.", "Verify attachments.", "Log queue row and result."],
            "ownerLayer": "platformAdmin",
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "lane_skill_gmail_adapter",
            "label": "Gmail Adapter Skill",
            "scope": "laneAdapter",
            "laneId": "lane_gmail_adapter",
            "summary": "Gmail-specific execution rules for drafts/sends, thread IDs, message IDs, and errors.",
            "rules": ["Preserve Gmail thread ID.", "Log sent message ID.", "Handle Gmail API/MCP errors without retry storms."],
            "ownerLayer": "platformAdmin",
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "lane_skill_outlook_adapter",
            "label": "Outlook Adapter Skill",
            "scope": "laneAdapter",
            "laneId": "lane_outlook_adapter",
            "summary": "Outlook/Microsoft Graph-specific rules for conversation IDs, attachments, sent item IDs, and errors.",
            "rules": ["Preserve Outlook conversation ID.", "Verify attachments before send.", "Log sent item ID."],
            "ownerLayer": "platformAdmin",
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "lane_skill_local_crm_adapter",
            "label": "Local CRM Adapter Skill",
            "scope": "laneAdapter",
            "laneId": "lane_local_thread_tasks",
            "summary": "Local task/thread/SQLite execution rules before optional CRM sync.",
            "rules": ["Persist task/thread state locally.", "Queue CRM sync actions instead of blocking local work.", "Keep last error and evidence link."],
            "ownerLayer": "platformAdmin",
            "locked": True,
            "workspaceEditable": False,
        },
    ]
    skill_bindings = [
        {
            "id": "binding_platform_safety_global",
            "bindingType": "global",
            "targetId": "*",
            "skillScope": "platformSafetySkills",
            "skillIds": [row["id"] for row in platform_safety],
            "resolutionOrder": 1,
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "binding_department_gcc_lab",
            "bindingType": "department",
            "targetId": "department_swiss_planner_applications",
            "skillScope": "departmentSkills",
            "skillIds": [row["id"] for row in department_skills],
            "resolutionOrder": 2,
            "locked": False,
            "workspaceEditable": True,
        },
        {
            "id": "binding_archetype_manager",
            "bindingType": "staffArchetype",
            "targetId": "archetype_manager_orchestrator",
            "skillScope": "staffTemplateSkills",
            "skillIds": ["staff_skill_manager_orchestrator", "staff_skill_report_maker"],
            "resolutionOrder": 3,
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "binding_archetype_thinking",
            "bindingType": "staffArchetype",
            "targetId": "archetype_thinking_analyst",
            "skillScope": "staffTemplateSkills",
            "skillIds": ["staff_skill_thinking_analyst"],
            "resolutionOrder": 3,
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "binding_archetype_outreach",
            "bindingType": "staffArchetype",
            "targetId": "archetype_email_sender",
            "skillScope": "staffTemplateSkills",
            "skillIds": ["staff_skill_outreach_operator"],
            "resolutionOrder": 3,
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "binding_archetype_document",
            "bindingType": "staffArchetype",
            "targetId": "archetype_document_maker",
            "skillScope": "staffTemplateSkills",
            "skillIds": ["staff_skill_document_maker"],
            "resolutionOrder": 3,
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "binding_archetype_crm",
            "bindingType": "staffArchetype",
            "targetId": "archetype_crm_operator",
            "skillScope": "staffTemplateSkills",
            "skillIds": ["staff_skill_crm_operator"],
            "resolutionOrder": 3,
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "binding_archetype_file_qa",
            "bindingType": "staffArchetype",
            "targetId": "archetype_file_qa",
            "skillScope": "staffTemplateSkills",
            "skillIds": ["staff_skill_file_qa"],
            "resolutionOrder": 3,
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "binding_email_lane_adapter",
            "bindingType": "lane",
            "targetId": "lane_gmail_bridge",
            "skillScope": "laneAdapterSkills",
            "skillIds": ["lane_skill_email_queue_safety", "lane_skill_gmail_adapter", "lane_skill_outlook_adapter"],
            "resolutionOrder": 4,
            "locked": True,
            "workspaceEditable": False,
        },
        {
            "id": "binding_local_thread_lane_adapter",
            "bindingType": "lane",
            "targetId": "lane_local_thread_tasks",
            "skillScope": "laneAdapterSkills",
            "skillIds": ["lane_skill_local_crm_adapter"],
            "resolutionOrder": 4,
            "locked": True,
            "workspaceEditable": False,
        },
    ]
    return {
        "platformSafetySkills": platform_safety,
        "departmentSkills": department_skills,
        "staffTemplateSkills": staff_template_skills,
        "laneAdapterSkills": lane_adapter_skills,
        "skillBindings": skill_bindings,
    }


def default_workspace_business_profile() -> dict[str, Any]:
    return {
        "id": "workspace_business_profile_gcc_lab",
        "workspaceId": "workspace_iman_swiss_planner",
        "companyDisplayName": "GCC lab",
        "legalCompanyName": "",
        "vatOrTaxId": "",
        "commercialRegistrationNumber": "",
        "registeredAddress": "",
        "industrySector": "Testing, calibration, inspection, and tender services",
        "defaultLanguage": "English/Persian mixed accepted",
        "approvedBrandTone": "Concise, professional, evidence-based business communication",
        "defaultManagerTitle": "Iman / Human Manager",
        "approvedEmailSignature": "",
        "approvedSenderIdentities": [],
        "activeConnections": ["local_runtime", "local_sqlite", "email_queue"],
        "approvedDatabases": ["Lead", "Companies", "Contacts", "Tasks List", "LeadMatchedSuppliers", "Files Manager", "Docs"],
        "workspaceEditable": True,
    }


STAFF_ARCHETYPE_DEFAULTS = {
    "AIstaff_Manager": ["archetype_manager_orchestrator", "archetype_report_maker"],
    "AIstaff_OpportunityHunter": ["archetype_thinking_analyst", "archetype_file_qa"],
    "AIstaff_FitAnalyst": ["archetype_thinking_analyst", "archetype_crm_operator"],
    "AIstaff_ProfessorResearchAnalyst": ["archetype_thinking_analyst"],
    "AIstaff_ApplicationPackMaker": ["archetype_document_maker", "archetype_file_qa"],
    "AIstaff_ApplicationPackSender": ["archetype_email_sender"],
    "AIstaff_FollowUpController": ["archetype_email_sender", "archetype_report_maker"],
    "AIstaff_CRMController": ["archetype_crm_operator", "archetype_report_maker"],
}


def default_output_templates() -> list[dict[str, Any]]:
    return [
        {
            "id": "output_verified_opportunity",
            "label": "Lead Case Brief",
            "ownerStaff": "AIstaff_OpportunityHunter",
            "requiredSections": ["Lead record", "Tender source", "Files reviewed", "Deadlines", "Missing blockers"],
            "storage": "Lead, Files Manager, Docs, tender portal/source evidence",
            "qualityGates": ["gate_official_evidence", "gate_no_duplicate_opportunity"],
            "workspaceEditable": True,
        },
        {
            "id": "output_application_package",
            "label": "Tender Submission Package",
            "ownerStaff": "AIstaff_ApplicationPackMaker",
            "requiredSections": ["Compliance matrix", "Technical response", "Commercial summary", "Supplier quote evidence", "Submission checklist"],
            "storage": "Tender package folder, Lead files, Docs, Files Manager rows",
            "qualityGates": ["gate_document_template_style", "gate_professor_specificity", "gate_package_folder_registered"],
            "workspaceEditable": True,
        },
        {
            "id": "output_supervisor_email",
            "label": "Supplier Quotation Outreach",
            "ownerStaff": "AIstaff_ApplicationPackSender",
            "requiredSections": ["Supplier/contact", "Tender scope", "Quotation request", "Verified attachments", "Safety result"],
            "storage": "Email Send Queue and task/thread evidence",
            "qualityGates": ["gate_content_safety", "gate_package_completeness", "gate_attachment_access", "gate_duplicate_recipient"],
            "workspaceEditable": True,
        },
        {
            "id": "output_operating_report",
            "label": "Manager Operating Report",
            "ownerStaff": "AIstaff_Manager",
            "requiredSections": ["Do first", "KPI progress", "Leads", "AI staff", "System health"],
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
            "sections": ["Do First", "KPI Progress", "Leads", "AI Staff", "System Health"],
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
            "label": "Tender Leads Reviewed",
            "periodType": "Weekly",
            "targetUnit": "Leads",
            "targetCount": 10,
            "minimumEvidenceLevel": "Lead record + tender source/file evidence required",
            "ownerStaff": "AIstaff_OpportunityHunter",
            "workspaceEditable": True,
        },
        {
            "id": "kpi_weekly_application_packages",
            "label": "Tender Packages Ready",
            "periodType": "Weekly",
            "targetUnit": "Tender packages",
            "targetCount": 2,
            "minimumEvidenceLevel": "Compliance matrix + quote evidence + QA gates passed",
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
    scoped_skills = default_scoped_skill_catalogs()
    return {
        "workspaces": [
            {
                "id": "workspace_iman_swiss_planner",
                "label": "GCC lab Workspace",
                "owner": "Human_Iman",
                "members": ["Human_Iman"],
                "status": "Active",
                "workspaceEditable": True,
            }
        ],
        "departments": [
            {
                "id": "department_swiss_planner_applications",
                "label": "GCC lab AI department",
                "workspaceId": "workspace_iman_swiss_planner",
                "templateId": "template_swiss_planner_application_department",
                "ownershipMode": "ownedDepartment",
                "humanFacingSurface": "AI Manager project threads",
                "sponsoredParticipantsSee": ["tasks", "uploads", "confirmations", "approvals", "outputs"],
                "humanManager": "Human_Iman",
                "aiManager": "AIstaff_Manager",
                "status": "Active",
                "workspaceEditable": True,
            }
        ],
        "departmentTemplates": [
            {
                "id": "template_swiss_planner_application_department",
                "label": "GCC lab AI department",
                "purpose": "Review tender Leads, read documents, match suppliers or partners, request quotations, prepare tender packages, and follow up.",
                "solutionModuleId": "solution_swiss_planner_apply_department",
                "ownershipModes": ["ownedDepartment", "sponsoredAssignment"],
                "projectTypes": ["Tender Lead", "Supplier Quote Request", "Tender Package", "Missing File Review"],
                "communicationModel": "Human talks to AI Manager; specialist AI Staff report through AI Manager.",
                "capabilities": [row.get("id") for row in fabric.get("capabilities", []) or [] if isinstance(row, dict)],
                "staffProfiles": [row.get("id") for row in default_staff_profiles()],
                "templateFamilies": ["Department Templates", "Staff Models", "Skill Packs", "Toolsets", "Workflow Plans"],
                "status": "Active",
                "locked": True,
                "workspaceEditable": False,
            },
            {
                "id": "template_sales_research_department_sample",
                "label": "Sample Sales Research Department",
                "purpose": "Sample reusable department template proving the platform is not tied to one department.",
                "solutionModuleId": "solution_sample_sales_research_department",
                "ownershipModes": ["ownedDepartment", "sponsoredAssignment"],
                "projectTypes": ["Lead Discovery", "Fit Review", "CRM Follow-up"],
                "communicationModel": "Human talks to AI Manager; specialist AI Staff report through AI Manager.",
                "capabilities": ["opportunity_discovery", "fit_assessment", "workflow_automation"],
                "staffProfiles": ["Human_Iman", "AIstaff_Manager", "AIstaff_OpportunityHunter", "AIstaff_FitAnalyst", "AIstaff_CRMController"],
                "templateFamilies": ["Department Templates", "Staff Models", "Skill Packs", "Toolsets", "Workflow Plans"],
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
        "staffArchetypes": default_staff_archetypes(),
        "staffProfiles": default_staff_profiles(),
        "platformSafetySkills": scoped_skills["platformSafetySkills"],
        "departmentSkills": scoped_skills["departmentSkills"],
        "staffTemplateSkills": scoped_skills["staffTemplateSkills"],
        "laneAdapterSkills": scoped_skills["laneAdapterSkills"],
        "compatibilityRules": [
            {
                "id": "local_alpha_compatible",
                "label": "Compatible With Local Alpha Runtime",
                "summary": "This object can run in the current local Python/React + SQLite alpha without production cloud orchestration.",
                "status": "Active",
                "ownerLayer": "platformAdmin",
                "locked": False,
                "workspaceEditable": True,
            },
            {
                "id": "compatible_with_local_p4_resolver",
                "label": "Compatible With Local P4 Composition Resolver",
                "summary": "This skill pack can be resolved into the effective local P4 runtime context.",
                "status": "Active",
                "ownerLayer": "platformAdmin",
                "locked": False,
                "workspaceEditable": True,
            },
        ],
        "formSchemas": default_platform_admin_form_schema_rows(),
        "enumSets": default_platform_admin_enum_sets(),
        "skillBindings": scoped_skills["skillBindings"],
        "operatingModel": default_platform_operating_model(),
        "workspaceBusinessProfile": default_workspace_business_profile(),
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


def apply_staff_archetype_defaults(fabric: dict[str, Any]) -> None:
    archetype_ids = {str(row.get("id")) for row in fabric.get("staffArchetypes", []) if isinstance(row, dict)}
    for profile in fabric.get("staffProfiles", []) or []:
        if not isinstance(profile, dict):
            continue
        staff_id = str(profile.get("id") or "")
        defaults = [item for item in STAFF_ARCHETYPE_DEFAULTS.get(staff_id, []) if item in archetype_ids]
        if defaults and not profile.get("archetypeIds"):
            profile["archetypeIds"] = defaults
        if defaults and not profile.get("primaryArchetypeId"):
            profile["primaryArchetypeId"] = defaults[0]
        if defaults and not profile.get("toolOperatingMode"):
            profile["toolOperatingMode"] = "Use inherited Staff Archetype plugin rules before taking tool or worker action."
        if staff_id == "Human_Iman":
            profile.setdefault("communicationScope", "human_to_manager")
            profile.setdefault("canContactHuman", True)
            profile.setdefault("canCreateHumanFacingThreads", True)
            profile.setdefault("reportsTo", "")
            profile.setdefault("visibilityMode", "ownedDepartment")
        elif staff_id == "AIstaff_Manager":
            profile.setdefault("communicationScope", "manager_human_and_staff")
            profile.setdefault("canContactHuman", True)
            profile.setdefault("canCreateHumanFacingThreads", True)
            profile.setdefault("reportsTo", "Human_Iman")
            profile.setdefault("visibilityMode", "ownedDepartment")
        elif staff_id.startswith("AIstaff_"):
            profile.setdefault("communicationScope", "staff_to_manager_only")
            profile.setdefault("canContactHuman", False)
            profile.setdefault("canCreateHumanFacingThreads", False)
            profile.setdefault("reportsTo", "AIstaff_Manager")
            profile.setdefault("visibilityMode", "ownedDepartment")


def merge_default_rows(existing: list[Any], defaults: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = [row for row in (existing or []) if isinstance(row, dict)]
    ids = {str(row.get("id")) for row in rows if row.get("id")}
    for default in defaults:
        if str(default.get("id")) not in ids:
            rows.append(json_clone(default))
            ids.add(str(default.get("id")))
    return rows


def merge_default_dict(existing: Any, defaults: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(existing, dict):
        return json_clone(defaults)
    merged = json_clone(existing)
    for key, value in defaults.items():
        if key not in merged:
            merged[key] = json_clone(value)
        elif isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = merge_default_dict(merged[key], value)
    return merged


def normalize_capability_fabric(fabric: dict[str, Any]) -> dict[str, Any]:
    fabric = json_clone(fabric or {})
    defaults = default_department_platform_objects(fabric)
    for collection, default_rows in defaults.items():
        if isinstance(default_rows, list):
            fabric[collection] = merge_default_rows(fabric.get(collection, []), default_rows)
        elif isinstance(default_rows, dict):
            fabric[collection] = merge_default_dict(fabric.get(collection), default_rows)
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
    apply_staff_archetype_defaults(fabric)
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
    archetypes = {row.get("id") for row in fabric.get("staffArchetypes", []) if isinstance(row, dict)}
    departments = {row.get("id") for row in fabric.get("departments", []) if isinstance(row, dict)}
    skill_catalogs = {
        "platformSafetySkills": {row.get("id") for row in fabric.get("platformSafetySkills", []) if isinstance(row, dict)},
        "departmentSkills": {row.get("id") for row in fabric.get("departmentSkills", []) if isinstance(row, dict)},
        "staffTemplateSkills": {row.get("id") for row in fabric.get("staffTemplateSkills", []) if isinstance(row, dict)},
        "laneAdapterSkills": {row.get("id") for row in fabric.get("laneAdapterSkills", []) if isinstance(row, dict)},
    }
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
    for staff in fabric.get("staffProfiles", []) or []:
        if not isinstance(staff, dict):
            continue
        for archetype_id in staff.get("archetypeIds", []) or []:
            if archetype_id not in archetypes:
                errors.append(f"Staff {staff.get('id')} references missing staff archetype {archetype_id}.")
        primary = staff.get("primaryArchetypeId")
        if primary and primary not in archetypes:
            errors.append(f"Staff {staff.get('id')} references missing primary staff archetype {primary}.")
    for binding in fabric.get("skillBindings", []) or []:
        if not isinstance(binding, dict):
            continue
        scope = str(binding.get("skillScope") or "")
        skill_ids = skill_catalogs.get(scope)
        if skill_ids is None:
            errors.append(f"Skill binding {binding.get('id')} references unknown skill scope {scope}.")
            continue
        for skill_id in binding.get("skillIds", []) or []:
            if skill_id not in skill_ids:
                errors.append(f"Skill binding {binding.get('id')} references missing skill {skill_id} in {scope}.")
        binding_type = str(binding.get("bindingType") or "")
        target = binding.get("targetId")
        if binding_type == "department" and target not in departments:
            errors.append(f"Skill binding {binding.get('id')} references missing department {target}.")
        if binding_type == "staffArchetype" and target not in archetypes:
            errors.append(f"Skill binding {binding.get('id')} references missing staff archetype {target}.")
        if binding_type == "lane" and target not in lanes:
            errors.append(f"Skill binding {binding.get('id')} references missing lane {target}.")
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
    try:
        fabric["workspaceBusinessProfile"] = workspace_profile()
    except Exception:
        fabric["workspaceBusinessProfile"] = attach_field_access(default_workspace_business_profile(), "WorkspaceBusinessProfile")
    fabric = attach_department_identities(fabric)
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
        "staffArchetypes": len(fabric.get("staffArchetypes", []) or []),
        "platformSafetySkills": len(fabric.get("platformSafetySkills", []) or []),
        "departmentSkills": len(fabric.get("departmentSkills", []) or []),
        "staffTemplateSkills": len(fabric.get("staffTemplateSkills", []) or []),
        "laneAdapterSkills": len(fabric.get("laneAdapterSkills", []) or []),
        "skillBindings": len(fabric.get("skillBindings", []) or []),
        "outputTemplates": len(fabric.get("outputTemplates", []) or []),
        "kpis": len(fabric.get("kpis", []) or []),
        "reportDefinitions": len(fabric.get("reportDefinitions", []) or []),
        "automations": len(fabric.get("automations", []) or []),
        "operatingNotes": len(fabric.get("operatingNotes", {}) or {}),
        "errors": len(errors),
    }
    fabric["fieldAccessLegend"] = {
        "platform_locked": "Owned by Platform Admin/developer control plane.",
        "workspace_editable": "Safe workspace defaults or preferences.",
        "department_editable": "Safe installed-department runtime configuration.",
        "runtime_context": "Operational state produced by queues, workers, approvals, or integrations.",
    }
    fabric["typedCatalogSummary"] = platform_catalog_summary(fabric)
    return fabric


LIGHTWEIGHT_DASHBOARD_FABRIC_COLLECTIONS = {
    "solutionModules",
    "workspaces",
    "departments",
    "departmentTemplates",
    "workspaceOverrides",
    "staffProfiles",
    "staffArchetypes",
    "capabilities",
    "connections",
    "databases",
    "aiSupport",
    "qualityGates",
    "kpis",
    "reportDefinitions",
    "automations",
}


def dashboard_capability_fabric(*, full: bool = False) -> dict[str, Any]:
    fabric = load_capability_fabric()
    if full:
        fabric["dashboardPayloadMode"] = "full"
        return fabric
    lightweight: dict[str, Any] = {
        key: json_clone(value)
        for key, value in fabric.items()
        if key in LIGHTWEIGHT_DASHBOARD_FABRIC_COLLECTIONS
    }
    for key in [
        "schemaVersion",
        "status",
        "lastReviewed",
        "workspaceBusinessProfile",
        "fieldAccessLegend",
        "typedCatalogSummary",
        "summary",
        "errors",
    ]:
        if key in fabric:
            lightweight[key] = json_clone(fabric.get(key))
    lightweight["dashboardPayloadMode"] = "lightweight"
    lightweight["archivedCollections"] = [
        "recipes",
        "lanes",
        "platformSafetySkills",
        "departmentSkills",
        "staffTemplateSkills",
        "laneAdapterSkills",
        "skillBindings",
        "outputTemplates",
        "operatingNotes",
        "formSchemas",
        "enumSets",
    ]
    return lightweight


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


def validate_platform_admin_form_item(collection: str, item: dict[str, Any], fabric: dict[str, Any], *, mode: str = "", original_id: str = "") -> list[str]:
    schemas = platform_admin_form_schemas(fabric)
    schema = schemas.get(collection)
    if not schema:
        return []
    errors: list[str] = []
    object_id = str(item.get("id") or "").strip()
    rows = [row for row in fabric.get(collection, []) or [] if isinstance(row, dict)]
    if not object_id:
        errors.append("Object ID is required.")
    if object_id:
        matching = [row for row in rows if str(row.get("id")) == object_id]
        if mode == "add" and matching:
            errors.append(f"{collection} already has an item with ID {object_id}.")
        if original_id and original_id != object_id and matching:
            errors.append(f"{collection} already has an item with ID {object_id}.")
    reference_indexes = platform_admin_reference_indexes(fabric)
    enum_options = platform_admin_enum_options(fabric)

    def validate_field(field: dict[str, Any], value: Any, path: str) -> None:
        field_type = str(field.get("type") or "text")
        label = str(field.get("label") or field.get("name") or path)
        if field.get("required"):
            if value is None or value == "" or value == []:
                errors.append(f"{label} is required.")
                return
        if value is None or value == "" or value == []:
            return
        if field_type in {"enum", "multiEnum"}:
            allowed = enum_options.get(str(field.get("enumKey") or ""), [])
            values = value if isinstance(value, list) else [value]
            for option in values:
                if allowed and option not in allowed:
                    errors.append(f"{label} has invalid option {option}.")
        if field_type in {"reference", "multiReference"}:
            target = str(field.get("referenceCollection") or "")
            allowed_ids = {str(row.get("id")) for row in reference_indexes.get(target, [])}
            values = value if isinstance(value, list) else [value]
            for ref in values:
                if ref and allowed_ids and str(ref) not in allowed_ids:
                    errors.append(f"{label} references missing {target} item {ref}.")
        if field_type == "childTable":
            if not isinstance(value, list):
                errors.append(f"{label} must be a list.")
                return
            child_ids: set[str] = set()
            for index, child in enumerate(value):
                if not isinstance(child, dict):
                    errors.append(f"{label} row {index + 1} must be an object.")
                    continue
                child_id = str(child.get("id") or "").strip()
                if child_id:
                    if child_id in child_ids:
                        errors.append(f"{label} has duplicate child ID {child_id}.")
                    child_ids.add(child_id)
                for child_field in field.get("fields") or []:
                    validate_field(child_field, child.get(child_field.get("name")), f"{path}.{index}.{child_field.get('name')}")

    for field in schema.get("fields") or []:
        validate_field(field, item.get(field.get("name")), str(field.get("name") or "field"))
    return errors


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
    form_errors = validate_platform_admin_form_item(
        collection,
        item,
        fabric,
        mode=str(payload.get("mode") or ""),
        original_id=str(payload.get("originalId") or ""),
    )
    if form_errors:
        return {"ok": False, "error": "Form validation failed.", "errors": form_errors}
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


def connection_setup_fields(connection: dict[str, Any]) -> list[str]:
    connection_id = normalize_text(connection.get("id"))
    label = normalize_text(connection.get("label"))
    configured = [str(item).strip() for item in connection.get("setupFields") or [] if str(item).strip()]
    if configured:
        return configured
    if "search_console" in connection_id or "search console" in label:
        return ["accountLabel", "siteUrl", "propertyId"]
    if "analytics" in connection_id or "analytics" in label:
        return ["accountLabel", "propertyId", "siteUrl"]
    if "wordpress" in connection_id or "wordpress" in label:
        return ["siteUrl", "accountLabel"]
    if "make" in connection_id or "webhook" in connection_id or "make.com" in label:
        return ["webhookUrl"]
    if "sheet" in connection_id or "sheets" in label:
        return ["accountLabel", "propertyId"]
    if "local" in connection_id or "local" in label:
        return []
    return ["accountLabel"]


def is_search_console_connection_row(connection: dict[str, Any]) -> bool:
    connection_id = normalize_text(connection.get("id"))
    label = normalize_text(connection.get("label"))
    connection_type = normalize_text(connection.get("type"))
    return "search_console" in connection_id or "search console" in label or "search console" in connection_type


def is_make_webhook_connection_row(connection: dict[str, Any]) -> bool:
    connection_id = normalize_text(connection.get("id"))
    label = normalize_text(connection.get("label"))
    connection_type = normalize_text(connection.get("type"))
    return "make_com" in connection_id or "make.com" in label or "webhook" in connection_id or "webhook" in connection_type


def search_console_property_format_error(connection: dict[str, Any]) -> str:
    if not is_search_console_connection_row(connection):
        return ""
    value = str(connection.get("propertyId") or "").strip()
    if not value:
        return ""
    if value.startswith("sc-domain:") and len(value) > len("sc-domain:"):
        return ""
    if value.startswith("http://") or value.startswith("https://"):
        return ""
    return "Search Console property value must be the exact property, such as sc-domain:worldbc.co or https://worldbc.co/."


def connection_config_success_message(connection: dict[str, Any], *, organization_scoped: bool = False) -> str:
    if is_make_webhook_connection_row(connection):
        return "Organization webhook configuration check passed. Webhook action remains blocked until Iman explicitly confirms."
    if organization_scoped:
        return "Organization configuration check passed. OAuth can be connected when you are ready."
    return "Local configuration check passed. Provider credentials can be connected when you are ready."


def connection_required_field_label(field: str) -> str:
    labels = {
        "accountLabel": "account/workspace label",
        "propertyId": "property/project ID",
        "siteUrl": "site URL",
        "webhookUrl": "webhook/endpoint URL",
        "endpointUrl": "endpoint URL",
    }
    return labels.get(field, field)


CONNECTION_CONFIG_EDITABLE_FIELDS = {
    "status",
    "type",
    "requiredFor",
    "setupFields",
    "accountLabel",
    "propertyId",
    "siteUrl",
    "webhookUrl",
    "endpointUrl",
    "configurationNotes",
    "provider",
    "providerFamily",
    "testMode",
    "enabled",
    "openApiSpec",
    "operationId",
    "requestContract",
    "editorialPolicy",
    "contentChecklist",
    "categorySelectionPolicy",
    "referencePolicy",
    "defaultPostStatus",
    "requiresHumanConfirmation",
}


def connection_config_from_payload(existing: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    updated = json_clone(existing)
    for key in CONNECTION_CONFIG_EDITABLE_FIELDS:
        if key in payload:
            value = payload.get(key)
            if key in {"requiredFor", "setupFields"} and isinstance(value, str):
                value = [item.strip() for item in re.split(r"[,;\n]+", value) if item.strip()]
            updated[key] = value
    updated["setupFields"] = connection_setup_fields({**existing, **updated})
    updated["updatedAt"] = iso_like()
    updated["updatedBy"] = str(payload.get("updatedBy") or "Human_Iman")
    return updated


def merged_connection_with_config(connection: dict[str, Any], config: dict[str, Any], department: dict[str, Any] | None = None) -> dict[str, Any]:
    merged = {**json_clone(connection), **json_clone(config)}
    merged["id"] = connection.get("id")
    merged["label"] = connection.get("label")
    merged["connectionId"] = connection.get("id")
    merged["catalogConnectionId"] = connection.get("id")
    if department:
        identity = department_identity_from_row(department, workspace_profile())
        merged["departmentId"] = department.get("id")
        merged["organizationAccountId"] = identity.get("id")
        merged["organizationDisplayName"] = identity.get("organizationDisplayName")
        merged["organizationScoped"] = True
    return merged


def department_connection_config_target(fabric: dict[str, Any], department_id: str, connection_id: str) -> tuple[list[dict[str, Any]], dict[str, Any] | None, dict[str, Any] | None, dict[str, Any] | None]:
    rows = collection_rows(fabric, "departments")
    department = next((row for row in rows if isinstance(row, dict) and str(row.get("id")) == department_id), None)
    if not department:
        return rows, None, None, None
    connections = collection_rows(fabric, "connections")
    _, connection = find_collection_item(connections, connection_id)
    if not connection:
        return rows, department, None, None
    identity = department.get("businessIdentity") if isinstance(department.get("businessIdentity"), dict) else {}
    if not identity:
        identity = department_identity_from_row(department, workspace_profile())
    configs = identity.get("connectionConfigs") if isinstance(identity.get("connectionConfigs"), dict) else {}
    identity["connectionConfigs"] = configs
    department["businessIdentity"] = identity
    existing_config = configs.get(connection_id) if isinstance(configs.get(connection_id), dict) else {}
    return rows, department, connection, existing_config


def update_connection_config(payload: dict[str, Any]) -> dict[str, Any]:
    connection_id = str(payload.get("connectionId") or payload.get("id") or "").strip()
    department_id = str(payload.get("departmentId") or "").strip()
    if not connection_id:
        return {"ok": False, "error": "Missing connectionId."}
    try:
        fabric = normalize_capability_fabric(json.loads(CAPABILITY_FABRIC_PATH.read_text(encoding="utf-8")))
    except Exception as exc:
        return {"ok": False, "error": f"Could not load capability fabric: {exc}"}
    if department_id:
        department_rows, department, connection, existing_config = department_connection_config_target(fabric, department_id, connection_id)
        if not department:
            return {"ok": False, "error": f"Department not found: {department_id}"}
        if not connection:
            return {"ok": False, "error": f"Connection not found: {connection_id}"}
        updated_config = connection_config_from_payload(existing_config or {}, payload)
        updated_config["connectionId"] = connection_id
        updated_config["scope"] = "department_organization_account"
        updated_config["organizationAccountId"] = str((department.get("businessIdentity") or {}).get("id") or f"identity_{department_id}")
        department["businessIdentity"]["connectionConfigs"][connection_id] = updated_config
        department["updatedAt"] = updated_config["updatedAt"]
        department["updatedBy"] = updated_config["updatedBy"]
        backup = create_config_backup({"reason": f"Before organization connection config update: {department_id}/{connection_id}", "notes": "Automatic pre-organization-connection-config backup."})
        result = write_capability_fabric(fabric)
        if not result.get("ok"):
            return result
        result.pop("capabilityFabric", None)
        version = record_department_version(
            object_type="departmentConnectionConfig",
            object_id=f"{department_id}:{connection_id}",
            action="Update organization connection configuration",
            before_payload=existing_config or {},
            after_payload=updated_config,
            created_by=updated_config["updatedBy"],
            reason=str(payload.get("reason") or "Organization-scoped connection configured from Department Explorer."),
        )
        result["connection"] = attach_field_access(merged_connection_with_config(connection, updated_config, department), "AiConnection")
        result["department"] = attach_field_access(department, "AiDepartmentInstance")
        result["businessIdentity"] = department_identity_from_row(department, workspace_profile())
        result["version"] = version
        result["backup"] = backup
        return result
    rows = collection_rows(fabric, "connections")
    index, existing = find_collection_item(rows, connection_id)
    if index < 0 or not existing:
        return {"ok": False, "error": f"Connection not found: {connection_id}"}

    updated = connection_config_from_payload(existing, payload)

    backup = create_config_backup({"reason": f"Before connection config update: {connection_id}", "notes": "Automatic pre-connection-config backup."})
    rows[index] = updated
    result = write_capability_fabric(fabric)
    if not result.get("ok"):
        return result
    result.pop("capabilityFabric", None)
    version = record_department_version(
        object_type="connections",
        object_id=connection_id,
        action="Update connection configuration",
        before_payload=existing,
        after_payload=updated,
        created_by=str(payload.get("updatedBy") or "Human_Iman"),
        reason=str(payload.get("reason") or "Connection configured from Department Explorer."),
    )
    result["connection"] = attach_field_access(updated, "AiConnection")
    result["version"] = version
    result["backup"] = backup
    return result


def test_connection_config(payload: dict[str, Any]) -> dict[str, Any]:
    connection_id = str(payload.get("connectionId") or payload.get("id") or "").strip()
    department_id = str(payload.get("departmentId") or "").strip()
    if not connection_id:
        return {"ok": False, "error": "Missing connectionId."}
    try:
        fabric = normalize_capability_fabric(json.loads(CAPABILITY_FABRIC_PATH.read_text(encoding="utf-8")))
    except Exception as exc:
        return {"ok": False, "error": f"Could not load capability fabric: {exc}"}
    if department_id:
        department_rows, department, connection, existing_config = department_connection_config_target(fabric, department_id, connection_id)
        if not department:
            return {"ok": False, "error": f"Department not found: {department_id}"}
        if not connection:
            return {"ok": False, "error": f"Connection not found: {connection_id}"}
        updated = merged_connection_with_config(connection, existing_config or {}, department)
        required_fields = connection_setup_fields(updated)
        missing = [field for field in required_fields if not str(updated.get(field) or "").strip()]
        format_error = search_console_property_format_error(updated)
        status = "Available" if not required_fields else ("Configured" if not missing else "Needs Setup")
        ok = not missing and not format_error
        if normalize_text(updated.get("status")) in {"disabled", "archived"}:
            ok = False
            status = "Disabled"
            message = "Connection is disabled for this organization account."
        elif missing:
            missing_labels = ", ".join(connection_required_field_label(field) for field in missing)
            message = f"Missing setup fields for this organization account: {missing_labels}."
        elif format_error:
            status = "Needs Setup"
            message = format_error
        elif required_fields:
            message = connection_config_success_message(updated, organization_scoped=True)
        else:
            message = "Local connection is available for this organization account."
        tested_at = iso_like()
        config = json_clone(existing_config or {})
        config.update(
            {
                "connectionId": connection_id,
                "scope": "department_organization_account",
                "organizationAccountId": str((department.get("businessIdentity") or {}).get("id") or f"identity_{department_id}"),
                "status": status,
                "setupFields": required_fields,
                "lastTestStatus": "Passed" if ok else "Needs Setup",
                "lastTestAt": tested_at,
                "lastTestMessage": message,
                "updatedAt": tested_at,
                "updatedBy": str(payload.get("updatedBy") or "Human_Iman"),
            }
        )
        department["businessIdentity"]["connectionConfigs"][connection_id] = config
        department["updatedAt"] = tested_at
        department["updatedBy"] = config["updatedBy"]
        backup = create_config_backup({"reason": f"Before organization connection test update: {department_id}/{connection_id}", "notes": "Automatic pre-organization-connection-test backup."})
        result = write_capability_fabric(fabric)
        if not result.get("ok"):
            return result
        result.pop("capabilityFabric", None)
        version = record_department_version(
            object_type="departmentConnectionConfig",
            object_id=f"{department_id}:{connection_id}",
            action="Test organization connection configuration",
            before_payload=existing_config or {},
            after_payload=config,
            created_by=config["updatedBy"],
            reason=str(payload.get("reason") or "Organization connection test from Department Explorer."),
        )
        result["ok"] = True
        result["connection"] = attach_field_access(merged_connection_with_config(connection, config, department), "AiConnection")
        result["department"] = attach_field_access(department, "AiDepartmentInstance")
        result["businessIdentity"] = department_identity_from_row(department, workspace_profile())
        result["test"] = {
            "ok": ok,
            "status": config["lastTestStatus"],
            "message": message,
            "missingFields": missing,
            "testedAt": tested_at,
        }
        result["version"] = version
        result["backup"] = backup
        return result
    rows = collection_rows(fabric, "connections")
    index, existing = find_collection_item(rows, connection_id)
    if index < 0 or not existing:
        return {"ok": False, "error": f"Connection not found: {connection_id}"}

    updated = json_clone(existing)
    required_fields = connection_setup_fields(updated)
    missing = [field for field in required_fields if not str(updated.get(field) or "").strip()]
    format_error = search_console_property_format_error(updated)
    status = "Available" if not required_fields else ("Configured" if not missing else "Needs Setup")
    ok = not missing and not format_error
    if normalize_text(updated.get("status")) in {"disabled", "archived"}:
        ok = False
        status = "Disabled"
        message = "Connection is disabled."
    elif missing:
        missing_labels = ", ".join(connection_required_field_label(field) for field in missing)
        message = f"Missing setup fields: {missing_labels}."
    elif format_error:
        status = "Needs Setup"
        message = format_error
    elif required_fields:
        message = connection_config_success_message(updated)
    else:
        message = "Local connection is available."

    updated["status"] = status
    updated["setupFields"] = required_fields
    updated["lastTestStatus"] = "Passed" if ok else "Needs Setup"
    updated["lastTestAt"] = iso_like()
    updated["lastTestMessage"] = message
    updated["updatedAt"] = updated["lastTestAt"]
    updated["updatedBy"] = str(payload.get("updatedBy") or "Human_Iman")
    rows[index] = updated
    backup = create_config_backup({"reason": f"Before connection test update: {connection_id}", "notes": "Automatic pre-connection-test backup."})
    result = write_capability_fabric(fabric)
    if not result.get("ok"):
        return result
    result.pop("capabilityFabric", None)
    version = record_department_version(
        object_type="connections",
        object_id=connection_id,
        action="Test connection configuration",
        before_payload=existing,
        after_payload=updated,
        created_by=str(payload.get("updatedBy") or "Human_Iman"),
        reason=str(payload.get("reason") or "Connection test from Department Explorer."),
    )
    result["ok"] = True
    result["connection"] = attach_field_access(updated, "AiConnection")
    result["test"] = {
        "ok": ok,
        "status": updated["lastTestStatus"],
        "message": message,
        "missingFields": missing,
        "testedAt": updated["lastTestAt"],
    }
    result["version"] = version
    result["backup"] = backup
    return result


def set_department_status(payload: dict[str, Any]) -> dict[str, Any]:
    department_id = str(payload.get("departmentId") or payload.get("id") or "").strip()
    action = str(payload.get("action") or "activate").strip().lower()
    if not department_id:
        return {"ok": False, "error": "Missing departmentId."}
    if action not in {"activate", "pause"}:
        return {"ok": False, "error": "Unsupported department status action."}
    try:
        fabric = normalize_capability_fabric(json.loads(CAPABILITY_FABRIC_PATH.read_text(encoding="utf-8")))
    except Exception as exc:
        return {"ok": False, "error": f"Could not load capability fabric: {exc}"}

    rows = collection_rows(fabric, "departments")
    target = next((row for row in rows if isinstance(row, dict) and str(row.get("id")) == department_id), None)
    if not target:
        return {"ok": False, "error": f"Department not found: {department_id}"}
    if normalize_text(target.get("status")) == "archived" or target.get("archived"):
        return {"ok": False, "error": "Archived departments cannot be activated or paused."}

    before_payload = json_clone(rows)
    updated_at = iso_like()
    updated_by = str(payload.get("updatedBy") or "Human_Iman")
    for row in rows:
        if not isinstance(row, dict):
            continue
        if normalize_text(row.get("status")) == "archived" or row.get("archived"):
            continue
        if action == "activate":
            row["status"] = "Active" if str(row.get("id")) == department_id else "Paused"
            row["lifecycleStatus"] = row["status"]
            row["isCurrentDepartment"] = str(row.get("id")) == department_id
        elif str(row.get("id")) == department_id:
            row["status"] = "Paused"
            row["lifecycleStatus"] = "Paused"
            row["isCurrentDepartment"] = False
        row["updatedAt"] = updated_at
        row["updatedBy"] = updated_by

    backup = create_config_backup({"reason": f"Before department {action}: {department_id}", "notes": "Automatic pre-status-change backup."})
    result = write_capability_fabric(fabric)
    if not result.get("ok"):
        return result
    after_target = next((row for row in rows if isinstance(row, dict) and str(row.get("id")) == department_id), {})
    version = record_department_version(
        object_type="departments",
        object_id=department_id,
        action=f"Department {action}",
        before_payload={"departments": before_payload},
        after_payload={"departments": json_clone(rows), "department": json_clone(after_target)},
        created_by=updated_by,
        reason=str(payload.get("reason") or f"Department {action} from Departments workspace."),
    )
    result["department"] = attach_field_access(after_target, "AiDepartmentInstance")
    result["departments"] = [attach_field_access(row, "AiDepartmentInstance") for row in rows if isinstance(row, dict)]
    result["version"] = version
    result["backup"] = backup
    result["catalogs"] = platform_admin_catalogs()
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


def workflow_templates_from_fabric(fabric: dict[str, Any]) -> list[dict[str, Any]]:
    templates: list[dict[str, Any]] = []
    capability_lookup = {row.get("id"): row for row in fabric.get("capabilities", []) or [] if isinstance(row, dict)}
    for recipe in fabric.get("recipes", []) or []:
        if not isinstance(recipe, dict):
            continue
        capability = capability_lookup.get(recipe.get("capabilityId")) or {}
        templates.append(
            {
                "id": f"workflow_{recipe.get('id')}",
                "recipeId": recipe.get("id"),
                "label": recipe.get("label") or recipe.get("id"),
                "summary": recipe.get("summary") or capability.get("summary") or "",
                "capabilityId": recipe.get("capabilityId"),
                "ownerStaff": recipe.get("ownerStaff") or capability.get("ownerStaff") or "AIstaff_Manager",
                "stages": recipe.get("stages") or [],
                "outputs": recipe.get("outputs") or capability.get("outputs") or [],
                "locked": bool(recipe.get("locked")),
                "workspaceEditable": recipe.get("workspaceEditable", True),
            }
        )
    return templates


def scoped_skill_definitions(fabric: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for collection, dto_scope in [
        ("platformSafetySkills", "platformSafety"),
        ("departmentSkills", "department"),
        ("staffTemplateSkills", "staffTemplate"),
        ("laneAdapterSkills", "laneAdapter"),
    ]:
        for row in fabric.get(collection, []) or []:
            if not isinstance(row, dict):
                continue
            item = json_clone(row)
            item["catalog"] = collection
            item["scope"] = item.get("scope") or dto_scope
            rows.append(item)
    return rows


def staff_template_dto(row: dict[str, Any], fabric: dict[str, Any]) -> dict[str, Any]:
    item = json_clone(row)
    archetype_id = str(item.get("id") or "")
    role_type = "Manager" if "manager" in archetype_id else "QA" if "qa" in archetype_id else "Tool Operator" if any(term in archetype_id for term in ["email", "crm", "document"]) else "Staff"
    plugin_families = [str(value) for value in item.get("allowedPluginFamilies", []) or [] if value]
    family_lookup = {
        "email_queue": "Origination",
        "gmail_or_outlook": "Origination",
        "official_web_sources": "Origination",
        "crm_read": "Supplier Development",
        "appsheet_crm": "Supplier Development",
        "local_sqlite": "Supplier Development",
        "documents": "Strategy",
        "reporting": "Strategy",
        "charts": "Strategy",
        "files_read": "Strategy",
    }
    default_families = sorted({family_lookup.get(family, "Operations") for family in plugin_families}) or ["Operations"]
    risk_tier = "High" if item.get("requiresApprovalFor") else "Medium" if role_type in {"Tool Operator", "QA"} else "Low"
    required_tools = [
        {
            "family": family.replace("_", " "),
            "requirement": "required" if index < 2 else "optional",
            "status": "active" if family in {"local_tasks", "local_dashboard", "task_threads", "local_sqlite"} else "inactive until workspace connects provider",
            "fallbackBehavior": "Route to local task/thread lane and ask AI Manager when unavailable.",
            "providerResolutionRule": "Resolve by active workspace connection; Gmail/Outlook/API provider stays in lane adapter.",
        }
        for index, family in enumerate(plugin_families)
    ]
    required_datasets = []
    if any(family in plugin_families for family in ["crm_read", "appsheet_crm", "local_sqlite"]):
        required_datasets.extend(["CRM Lead or project record", "Company profile"])
    if any(family in plugin_families for family in ["email_queue", "gmail_or_outlook"]):
        required_datasets.extend(["Recipient/contact record", "Previous communication history"])
    if any(family in plugin_families for family in ["files_read", "documents", "spreadsheets"]):
        required_datasets.extend(["Source files", "Evidence package"])
    required_datasets = list(dict.fromkeys(required_datasets)) or ["Task brief"]
    bindings = [
        binding for binding in fabric.get("skillBindings", []) or []
        if isinstance(binding, dict) and binding.get("bindingType") == "staffArchetype" and binding.get("targetId") == archetype_id
    ]
    staff_skill_ids: list[str] = []
    for binding in bindings:
        staff_skill_ids.extend(str(skill_id) for skill_id in binding.get("skillIds", []) or [] if skill_id)
    skill_lookup = {
        str(skill.get("id")): skill
        for skill in fabric.get("staffTemplateSkills", []) or []
        if isinstance(skill, dict) and skill.get("id")
    }
    workflow_usage = []
    staff_profiles = [
        profile for profile in fabric.get("staffProfiles", []) or []
        if isinstance(profile, dict) and archetype_id in (profile.get("archetypeIds") or [])
    ]
    staff_ids = {profile.get("id") for profile in staff_profiles}
    for template in fabric.get("departmentTemplates", []) or []:
        if not isinstance(template, dict):
            continue
        overlap = [staff_id for staff_id in template.get("staffProfiles", []) or [] if staff_id in staff_ids]
        if overlap:
            workflow_usage.append(
                {
                    "blueprintId": template.get("id"),
                    "blueprintLabel": template.get("label"),
                    "staffProfiles": overlap,
                    "usage": "Assigned through staff profile archetype binding.",
                }
            )
    item.update(
        {
            "roleType": item.get("roleType") or role_type,
            "defaultDepartmentFamilies": item.get("defaultDepartmentFamilies") or default_families,
            "status": item.get("status") or "Approved",
            "version": item.get("version") or "1.0.0",
            "requiredLanesTools": item.get("requiredLanesTools") or required_tools,
            "requiredDatasets": item.get("requiredDatasets") or required_datasets,
            "optionalDatasets": item.get("optionalDatasets") or ["Workspace preferences", "Approved learned improvements"],
            "workspaceProvidedDatasets": item.get("workspaceProvidedDatasets") or ["Active CRM/source databases", "Approved contacts and sender identities"],
            "missingDataBehavior": item.get("missingDataBehavior") or "Ask AI Manager to create a human-facing missing-input thread; do not contact the human directly.",
            "lastUpdated": item.get("updatedAt") or item.get("createdAt") or fabric.get("lastReviewed"),
            "riskTier": item.get("riskTier") or risk_tier,
            "whenToUse": item.get("whenToUse") or item.get("purpose") or "",
            "defaultStageResponsibility": item.get("defaultStageResponsibility") or "Execute assigned workflow stages under the AI Manager and return structured evidence.",
            "supportedWorkflowStages": item.get("supportedWorkflowStages") or ["Intake", "Analysis", "Draft", "Review", "Follow-up", "Blocker escalation"],
            "capabilitiesAllowed": item.get("capabilitiesAllowed") or item.get("outputContract") or [],
            "capabilitiesNotAllowed": item.get("capabilitiesNotAllowed") or item.get("stopConditions") or [],
            "supportedTaskTypes": item.get("supportedTaskTypes") or item.get("outputContract") or [],
            "instructionLayers": item.get("instructionLayers") or [
                {"layer": "Fixed instructions", "access": "platform_locked", "summary": "Platform safety, manager-facing routing, and protected execution rules."},
                {"layer": "Department instructions", "access": "department_editable", "summary": "Department vocabulary, approval policy, and output preferences within policy."},
                {"layer": "Staff instructions", "access": "platform_locked", "summary": "Reusable job-description defaults for this staff template."},
                {"layer": "Workspace preferences", "access": "workspace_editable", "summary": "Safe tone, sender, identity, dataset, and naming preferences."},
                {"layer": "Learned improvements", "access": "runtime_context", "summary": "Proposed from closed threads and activated only after approval."},
            ],
            "inputContract": item.get("inputContract") or {
                "required": ["task objective", "project or lead context", "success criteria"],
                "optional": ["tone preference", "sample output", "deadline"],
                "acceptedTypes": ["text", "JSON", "CRM record", "document/file reference"],
                "validationRules": ["Required context must be present", "External actions require approval metadata"],
                "missingInputAction": "Ask AI Manager to request the missing input.",
            },
            "outputContractDetail": item.get("outputContractDetail") or {
                "format": "structured text or JSON",
                "requiredSections": item.get("outputContract") or [],
                "approvalRequirement": "Manager review; human approval for external or irreversible action.",
            },
            "qaGuardrails": item.get("qaGuardrails") or {
                "requiredChecks": ["policy compliance", "tone check", "missing data check", "evidence or source check"],
                "humanApprovalRules": item.get("requiresApprovalFor") or [],
                "forbiddenBehavior": ["do not expose backend/tool details", "do not bypass AI Manager", "do not execute external sends without approval"],
            },
            "retryPolicy": item.get("retryPolicy") or {
                "maxRetries": 3,
                "retryDelay": "exponential backoff",
                "retryableErrors": ["provider timeout", "temporary local worker failure", "rate limit"],
                "nonRetryableErrors": ["missing required input", "human approval missing", "duplicate-send risk", "policy violation"],
                "fallbackStaffOrTool": "AIstaff_Manager",
                "askManagerWhen": "confidence is low, provider unavailable, or task should be rerouted",
                "askHumanWhen": "required business input or approval is missing",
                "stopStageWhen": "guardrail fails or non-retryable blocker is detected",
                "createThreadWhen": "approval, missing input, review, escalation, or real blocker exists",
                "markWorkflowBlockedWhen": "no safe internal action remains",
            },
            "workflowUsage": item.get("workflowUsage") or workflow_usage,
            "versionLog": item.get("versionLog") or [{"version": item.get("version") or "1.0.0", "status": item.get("status") or "Approved", "changedBy": "Platform Admin", "summary": "Default local alpha staff template."}],
            "validationState": item.get("validationState") or {
                "missingTools": [],
                "missingDatasets": [],
                "missingSchemas": [],
                "missingGuardrails": [] if item.get("requiresApprovalFor") else ["Add approval rules for external/irreversible actions when applicable."],
            },
            "boundStaffProfiles": staff_profiles,
            "boundSkillIds": staff_skill_ids,
            "boundSkills": [skill_lookup.get(skill_id) for skill_id in staff_skill_ids if skill_lookup.get(skill_id)],
            "capabilityBased": True,
            "providerSpecificBehavior": "lane_adapter",
        }
    )
    return attach_field_access(item, "AiStaffTemplate")


def platform_catalog_summary(fabric: dict[str, Any]) -> dict[str, int]:
    return {
        "departmentBlueprints": len(fabric.get("departmentTemplates", []) or []),
        "staffTemplates": len(fabric.get("staffArchetypes", []) or []),
        "laneAdapters": len(fabric.get("lanes", []) or []),
        "scopedSkills": len(scoped_skill_definitions(fabric)),
        "workflowTemplates": len(workflow_templates_from_fabric(fabric)),
        "senderIdentities": len(list_sender_identities()) if DB_PATH.exists() else 0,
    }


def platform_admin_catalogs() -> dict[str, Any]:
    fabric = load_capability_fabric()
    p4 = p4_catalogs()
    catalogs = {
        "installedDepartments": [
            attach_field_access(
                {
                    **json_clone(row),
                    "blueprintId": row.get("templateId"),
                    "managerSurface": row.get("humanFacingSurface") or "AI Manager project threads",
                },
                "AiDepartmentInstance",
            )
            for row in (fabric.get("departments", []) or [])
            if isinstance(row, dict)
        ],
        "departmentBlueprints": [
            attach_field_access(
                {
                    **json_clone(row),
                    "capabilityCount": len(row.get("capabilities", []) or []),
                    "staffCount": len(row.get("staffProfiles", []) or []),
                },
                "AiDepartmentBlueprint",
            )
            for row in (fabric.get("departmentTemplates", []) or [])
            if isinstance(row, dict)
        ],
        "staffTemplates": [
            staff_template_dto(row, fabric)
            for row in (fabric.get("staffArchetypes", []) or [])
            if isinstance(row, dict)
        ],
        "laneAdapters": [
            attach_field_access(
                {
                    **json_clone(row),
                    "providerRulesOwnedBy": "platformAdmin",
                    "fieldAccessMode": "platform_locked_execution_rules",
                },
                "AiLaneAdapter",
            )
            for row in (fabric.get("lanes", []) or [])
            if isinstance(row, dict)
        ],
        "scopedSkills": [attach_field_access(row, "AiScopedSkillDefinition") for row in scoped_skill_definitions(fabric)],
        "workflowTemplates": [attach_field_access(row, "AiWorkflowTemplate") for row in workflow_templates_from_fabric(fabric)],
        "capabilities": [attach_field_access(row, "AiCapability") for row in (fabric.get("capabilities", []) or []) if isinstance(row, dict)],
        "connections": [attach_field_access(row, "AiConnection") for row in (fabric.get("connections", []) or []) if isinstance(row, dict)],
        "databases": [attach_field_access(row, "AiDatabase") for row in (fabric.get("databases", []) or []) if isinstance(row, dict)],
        "aiSupport": [attach_field_access(row, "AiSupport") for row in (fabric.get("aiSupport", []) or []) if isinstance(row, dict)],
        "qualityGates": [attach_field_access(row, "AiQualityGate") for row in (fabric.get("qualityGates", []) or []) if isinstance(row, dict)],
        "automations": [attach_field_access(row, "AiAutomation") for row in (fabric.get("automations", []) or []) if isinstance(row, dict)],
        "compatibilityRules": [attach_field_access(row, "AiCompatibilityRule") for row in (fabric.get("compatibilityRules", []) or []) if isinstance(row, dict)],
        "formSchemas": [attach_field_access(row, "AiFormSchema") for row in (fabric.get("formSchemas", []) or []) if isinstance(row, dict)],
        "enumSets": [attach_field_access(row, "AiEnumSet") for row in (fabric.get("enumSets", []) or []) if isinstance(row, dict)],
        "senderIdentities": list_sender_identities(),
    }
    p4_catalog_rows = p4.get("catalogs") or {}
    return {
        "ok": True,
        "catalogs": catalogs,
        "summary": {key: len(value) for key, value in catalogs.items()},
        "p4Catalogs": p4_catalog_rows,
        "p4Summary": p4.get("summary") or {},
        "formSchemas": platform_admin_form_schemas(fabric),
        "enumOptions": platform_admin_enum_options(fabric),
        "referenceIndexes": platform_admin_reference_indexes(fabric),
        "editableCollections": sorted(EDITABLE_FABRIC_COLLECTIONS),
        "fieldAccessLegend": fabric.get("fieldAccessLegend") or {},
        "validation": {"errors": fabric.get("errors") or [], "errorCount": len(fabric.get("errors") or [])},
        "exportReady": {
            "installedDepartments": [row.get("id") for row in catalogs["installedDepartments"]],
            "departmentBlueprints": [row.get("id") for row in catalogs["departmentBlueprints"]],
            "staffTemplates": [row.get("id") for row in catalogs["staffTemplates"]],
            "laneAdapters": [row.get("id") for row in catalogs["laneAdapters"]],
            "scopedSkills": [row.get("id") for row in catalogs["scopedSkills"]],
            "workflowTemplates": [row.get("id") for row in catalogs["workflowTemplates"]],
            "capabilities": [row.get("id") for row in catalogs["capabilities"]],
            "connections": [row.get("id") for row in catalogs["connections"]],
            "databases": [row.get("id") for row in catalogs["databases"]],
            "aiSupport": [row.get("id") for row in catalogs["aiSupport"]],
            "qualityGates": [row.get("id") for row in catalogs["qualityGates"]],
            "automations": [row.get("id") for row in catalogs["automations"]],
            "compatibilityRules": [row.get("id") for row in catalogs["compatibilityRules"]],
            "formSchemas": [row.get("id") for row in catalogs["formSchemas"]],
            "enumSets": [row.get("id") for row in catalogs["enumSets"]],
        },
    }


def create_department_from_template(payload: dict[str, Any]) -> dict[str, Any]:
    department_label = str(payload.get("departmentLabel") or payload.get("label") or "").strip()
    if not department_label:
        return {"ok": False, "error": "Department name is required."}
    source_template_id = str(payload.get("sourceTemplateId") or "template_swiss_planner_application_department").strip()
    purpose = str(payload.get("departmentPurpose") or payload.get("purpose") or "").strip()
    ai_manager_alias = str(payload.get("aiManagerAlias") or DEFAULT_STAFF_ALIASES["AIstaff_Manager"]).strip()
    human_manager = str(payload.get("humanManager") or "Human_Iman").strip()
    workspace_id = str(payload.get("workspaceId") or "workspace_iman_swiss_planner").strip()
    default_language = str(payload.get("defaultLanguage") or workspace_profile().get("defaultLanguage") or "English").strip()
    approval_policy = str(payload.get("approvalPolicy") or "").strip()
    raw_project_types = payload.get("projectTypes")
    if isinstance(raw_project_types, str):
        project_types = [item.strip() for item in re.split(r"[,;\n]+", raw_project_types) if item.strip()]
    elif isinstance(raw_project_types, list):
        project_types = [str(item).strip() for item in raw_project_types if str(item).strip()]
    else:
        project_types = []
    raw_active_connections = payload.get("activeConnections")
    if isinstance(raw_active_connections, str):
        active_connections = [item.strip() for item in re.split(r"[,;\n]+", raw_active_connections) if item.strip()]
    elif isinstance(raw_active_connections, list):
        active_connections = [str(item).strip() for item in raw_active_connections if str(item).strip()]
    else:
        active_connections = []
    raw_approved_datasets = payload.get("approvedDatasets")
    if isinstance(raw_approved_datasets, str):
        approved_datasets = [item.strip() for item in re.split(r"[,;\n]+", raw_approved_datasets) if item.strip()]
    elif isinstance(raw_approved_datasets, list):
        approved_datasets = [str(item).strip() for item in raw_approved_datasets if str(item).strip()]
    else:
        approved_datasets = []
    try:
        fabric = normalize_capability_fabric(json.loads(CAPABILITY_FABRIC_PATH.read_text(encoding="utf-8")))
    except Exception as exc:
        return {"ok": False, "error": f"Could not load capability fabric: {exc}"}

    normalized_label = department_label.casefold()
    existing_department = next(
        (
            row
            for row in fabric.get("departments", []) or []
            if isinstance(row, dict)
            and str(row.get("label") or "").strip().casefold() == normalized_label
            and str(row.get("status") or "").strip().casefold() != "archived"
        ),
        None,
    )
    if existing_department:
        return {
            "ok": True,
            "alreadyExists": True,
            "department": attach_field_access(existing_department, "AiDepartmentInstance"),
            "message": "A department with this name already exists.",
            "catalogs": platform_admin_catalogs(),
        }

    templates = [row for row in fabric.get("departmentTemplates", []) or [] if isinstance(row, dict)]
    source_template = next((row for row in templates if str(row.get("id")) == source_template_id), None)
    if not source_template:
        return {"ok": False, "error": f"Source department blueprint not found: {source_template_id}"}

    stamp = time.strftime("%Y%m%d%H%M%S", time.gmtime())
    slug = fabric_slug(department_label)
    department_id = str(payload.get("departmentId") or f"department_{slug}_{stamp}").strip()
    template_id = str(payload.get("templateId") or f"template_{slug}_{stamp}").strip()
    override_id = f"override_{slug}_{stamp}"
    binding_id = f"binding_department_{slug}_{stamp}"
    department_skills = [row.get("id") for row in fabric.get("departmentSkills", []) or [] if isinstance(row, dict) and row.get("id")]

    created_template = {
        **json_clone(source_template),
        "id": template_id,
        "label": f"{department_label} Blueprint",
        "purpose": purpose or source_template.get("purpose") or "",
        "projectTypes": project_types or json_clone(source_template.get("projectTypes") or []),
        "approvalPolicy": approval_policy,
        "activeConnections": active_connections,
        "approvedDatasets": approved_datasets,
        "defaultLanguage": default_language,
        "sourceTemplateId": source_template.get("id"),
        "status": "Draft",
        "locked": False,
        "workspaceEditable": False,
        "createdAt": iso_like(),
        "createdBy": str(payload.get("createdBy") or "Human_Iman"),
        "updatedAt": iso_like(),
        "updatedBy": str(payload.get("createdBy") or "Human_Iman"),
    }
    created_department = {
        "id": department_id,
        "label": department_label,
        "workspaceId": workspace_id,
        "templateId": template_id,
        "ownershipMode": str(payload.get("ownershipMode") or "ownedDepartment"),
        "humanFacingSurface": "AI Manager project threads",
        "sponsoredParticipantsSee": ["tasks", "uploads", "confirmations", "approvals", "outputs"],
        "humanManager": human_manager,
        "aiManager": "AIstaff_Manager",
        "aiManagerAlias": ai_manager_alias,
        "purpose": purpose or source_template.get("purpose") or "",
        "projectTypes": project_types or json_clone(source_template.get("projectTypes") or []),
        "approvalPolicy": approval_policy,
        "activeConnections": active_connections,
        "approvedDatasets": approved_datasets,
        "defaultLanguage": default_language,
        "status": "Active",
        "workspaceEditable": True,
        "createdAt": iso_like(),
        "createdBy": str(payload.get("createdBy") or "Human_Iman"),
    }
    created_department["businessIdentity"] = {
        "id": f"identity_{department_id}",
        "departmentId": department_id,
        "organizationDisplayName": str(payload.get("organizationDisplayName") or department_label).strip(),
        "legalOrganizationName": str(payload.get("legalOrganizationName") or "").strip(),
        "websiteUrl": str(payload.get("websiteUrl") or "").strip(),
        "primaryDomain": str(payload.get("primaryDomain") or "").strip(),
        "industrySector": str(payload.get("industrySector") or "").strip(),
        "defaultLanguage": default_language,
        "approvedBrandTone": str(payload.get("approvedBrandTone") or workspace_profile().get("approvedBrandTone") or "").strip(),
        "managerDisplayName": human_manager,
        "managerTitle": str(payload.get("managerTitle") or workspace_profile().get("defaultManagerTitle") or "Human Manager").strip(),
        "publicDescription": purpose or source_template.get("purpose") or "",
        "activeConnections": active_connections,
        "approvedDatabases": approved_datasets,
        "connectionConfigs": {},
        "workspaceEditable": True,
        "createdAt": created_department["createdAt"],
        "createdBy": created_department["createdBy"],
    }
    workspace_override = {
        "id": override_id,
        "workspaceId": workspace_id,
        "departmentId": department_id,
        "humanManager": human_manager,
        "aiManagerAlias": ai_manager_alias,
        "defaultLanguage": default_language,
        "approvalPolicy": approval_policy,
        "activeConnections": active_connections,
        "approvedDatasets": approved_datasets,
        "status": "Active",
        "workspaceEditable": True,
        "createdAt": iso_like(),
        "createdBy": str(payload.get("createdBy") or "Human_Iman"),
    }
    skill_binding = {
        "id": binding_id,
        "bindingType": "department",
        "targetId": department_id,
        "skillScope": "departmentSkills",
        "skillIds": department_skills,
        "resolutionOrder": 2,
        "locked": False,
        "workspaceEditable": True,
        "createdAt": iso_like(),
        "createdBy": str(payload.get("createdBy") or "Human_Iman"),
    }

    fabric.setdefault("departmentTemplates", []).append(created_template)
    fabric.setdefault("departments", []).append(created_department)
    fabric.setdefault("workspaceOverrides", []).append(workspace_override)
    fabric.setdefault("skillBindings", []).append(skill_binding)

    backup = create_config_backup({"reason": f"Before creating department: {department_label}", "notes": "Automatic pre-create backup."})
    result = write_capability_fabric(fabric)
    if not result.get("ok"):
        return result
    version = record_department_version(
        object_type="departments",
        object_id=department_id,
        action="Create department from blueprint",
        before_payload={},
        after_payload={
            "department": created_department,
            "departmentTemplate": created_template,
            "workspaceOverride": workspace_override,
            "skillBinding": skill_binding,
        },
        created_by=str(payload.get("createdBy") or "Human_Iman"),
        reason=str(payload.get("reason") or f"Created local AI Department from {source_template_id}."),
    )
    return {
        "ok": True,
        "alreadyExists": False,
        "department": attach_field_access(created_department, "AiDepartmentInstance"),
        "departmentTemplate": attach_field_access(created_template, "AiDepartmentBlueprint"),
        "workspaceOverride": attach_field_access(workspace_override, "WorkspaceOverride"),
        "skillBinding": attach_field_access(skill_binding, "AiScopedSkillBinding"),
        "version": version,
        "backup": backup,
        "catalogs": platform_admin_catalogs(),
    }


P4_READY_STATES = {
    "ready",
    "missing_assignment",
    "missing_tool",
    "missing_dataset",
    "inactive_connection",
    "version_conflict",
    "approval_required",
    "blocked",
}


def p4_versioned(row: dict[str, Any], dto_type: str, defaults: dict[str, Any] | None = None) -> dict[str, Any]:
    item = {**json_clone(defaults or {}), **json_clone(row or {})}
    item["version"] = str(item.get("version") or "1.0.0")
    item["status"] = str(item.get("status") or "Approved")
    item["riskTier"] = str(item.get("riskTier") or ("High" if item.get("requiresApprovalFor") else "Medium"))
    item["compatibilityRules"] = item.get("compatibilityRules") or ["local_alpha_compatible"]
    item["updatedAt"] = item.get("updatedAt") or item.get("createdAt") or iso_like(CAPABILITY_FABRIC_PATH.stat().st_mtime) if CAPABILITY_FABRIC_PATH.exists() else iso_like()
    item["updatedBy"] = item.get("updatedBy") or item.get("createdBy") or "Platform Admin"
    return attach_field_access(item, dto_type)


def p4_department_packages_from_fabric(fabric: dict[str, Any]) -> list[dict[str, Any]]:
    departments = {str(row.get("templateId")): row for row in fabric.get("departments", []) or [] if isinstance(row, dict)}
    packages: list[dict[str, Any]] = []
    for template in fabric.get("departmentTemplates", []) or []:
        if not isinstance(template, dict):
            continue
        department = departments.get(str(template.get("id"))) or {}
        packages.append(
            p4_versioned(
                {
                    **json_clone(template),
                    "packageId": template.get("id"),
                    "installedDepartmentId": department.get("id") or "",
                    "runtimeStatus": department.get("status") or template.get("status") or "Approved",
                    "staffBlueprintCount": len(template.get("staffProfiles", []) or []),
                    "stageTemplateCount": len(template.get("capabilities", []) or []),
                },
                "AiDepartmentPackage",
                {"status": template.get("status") or "Approved", "riskTier": "High"},
            )
        )
    return packages


def p4_staff_blueprints_from_fabric(fabric: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        {**staff_template_dto(row, fabric), "dtoType": "AiStaffBlueprint", "blueprintId": row.get("id")}
        for row in (fabric.get("staffArchetypes", []) or [])
        if isinstance(row, dict)
    ]


def p4_skill_packs_from_fabric(fabric: dict[str, Any]) -> list[dict[str, Any]]:
    packs: list[dict[str, Any]] = []
    for row in scoped_skill_definitions(fabric):
        scope = str(row.get("catalog") or row.get("scope") or "")
        packs.append(
            p4_versioned(
                {
                    **json_clone(row),
                    "skillPackId": row.get("id"),
                    "scope": row.get("scope"),
                    "sourceCatalog": scope,
                    "activationState": row.get("activationState") or row.get("status") or "Active",
                    "compatibilityRules": row.get("compatibilityRules") or ["compatible_with_local_p4_resolver"],
                },
                "AiSkillPack",
                {"status": row.get("status") or "Approved", "riskTier": "High" if row.get("locked") else "Medium"},
            )
        )
    return packs


def p4_tool_data_contracts_from_fabric(fabric: dict[str, Any]) -> list[dict[str, Any]]:
    connections = {str(row.get("id")): row for row in fabric.get("connections", []) or [] if isinstance(row, dict)}
    databases = {str(row.get("id")): row for row in fabric.get("databases", []) or [] if isinstance(row, dict)}
    contracts: list[dict[str, Any]] = []
    for lane in fabric.get("lanes", []) or []:
        if not isinstance(lane, dict):
            continue
        connection_ids = [str(item) for item in lane.get("connections", []) or [] if item]
        database_ids = [str(item) for item in lane.get("databases", []) or [] if item]
        contracts.append(
            p4_versioned(
                {
                    "id": f"contract_{lane.get('id')}",
                    "contractId": f"contract_{lane.get('id')}",
                    "label": f"{lane.get('label') or lane.get('id')} Contract",
                    "laneId": lane.get("id"),
                    "purpose": lane.get("summary") or lane.get("laneRule") or "Provider-agnostic tool/data contract.",
                    "requiredConnections": connection_ids,
                    "requiredDatabases": database_ids,
                    "connectionLabels": [connections.get(item, {}).get("label") or item for item in connection_ids],
                    "databaseLabels": [databases.get(item, {}).get("label") or item for item in database_ids],
                    "providerResolutionRule": "Resolve through active workspace connection and lane adapter; do not hard-code provider in department package.",
                    "fallbackBehavior": "Route to AI Manager/readiness blocker when a required provider or dataset is unavailable.",
                    "status": lane.get("status") or "Approved",
                    "locked": lane.get("locked", True),
                    "workspaceEditable": False,
                },
                "AiToolDataContract",
                {"riskTier": "High" if connection_ids else "Medium"},
            )
        )
    return contracts


def p4_stage_templates_from_fabric(fabric: dict[str, Any]) -> list[dict[str, Any]]:
    capabilities = {str(row.get("id")): row for row in fabric.get("capabilities", []) or [] if isinstance(row, dict)}
    stages: list[dict[str, Any]] = []
    for recipe in fabric.get("recipes", []) or []:
        if not isinstance(recipe, dict):
            continue
        capability = capabilities.get(str(recipe.get("capabilityId"))) or {}
        recipe_owner = recipe.get("ownerStaff") or capability.get("ownerStaff") or "AIstaff_Manager"
        for index, stage in enumerate(recipe.get("stages", []) or [], start=1):
            if not isinstance(stage, dict):
                continue
            stage_id = str(stage.get("id") or f"stage_{index}")
            stages.append(
                p4_versioned(
                    {
                        **json_clone(stage),
                        "id": f"stage_template_{recipe.get('id')}_{stage_id}",
                        "stageTemplateId": f"stage_template_{recipe.get('id')}_{stage_id}",
                        "label": stage.get("label") or stage_id,
                        "recipeId": recipe.get("id"),
                        "recipeLabel": recipe.get("label"),
                        "capabilityId": recipe.get("capabilityId"),
                        "capabilityLabel": capability.get("label"),
                        "ownerStaff": recipe_owner,
                        "sequence": index,
                        "requiredLanes": stage.get("lanes") or [],
                        "requiredQualityGates": stage.get("qualityGates") or [],
                        "escalationPolicy": "AI Manager first; human only for approval, missing input, external action, or irreversible decision.",
                        "status": stage.get("status") or recipe.get("status") or "Approved",
                    },
                    "AiStageTemplate",
                    {"riskTier": "Medium"},
                )
            )
    return stages


def p4_lane_adapters_from_fabric(fabric: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        p4_versioned(
            {
                **json_clone(row),
                "adapterId": row.get("id"),
                "providerRulesOwnedBy": "platformAdmin",
                "fieldAccessMode": "platform_locked_execution_rules",
                "status": row.get("status") or "Approved",
            },
            "AiLaneAdapter",
            {"riskTier": "High" if row.get("connections") else "Medium"},
        )
        for row in (fabric.get("lanes", []) or [])
        if isinstance(row, dict)
    ]


def p4_catalogs() -> dict[str, Any]:
    init_db()
    fabric = load_capability_fabric()
    catalogs = {
        "departmentPackages": p4_department_packages_from_fabric(fabric),
        "staffBlueprints": p4_staff_blueprints_from_fabric(fabric),
        "skillPacks": p4_skill_packs_from_fabric(fabric),
        "toolDataContracts": p4_tool_data_contracts_from_fabric(fabric),
        "stageTemplates": p4_stage_templates_from_fabric(fabric),
        "laneAdapters": p4_lane_adapters_from_fabric(fabric),
    }
    return {
        "ok": True,
        "catalogs": catalogs,
        "summary": {key: len(value) for key, value in catalogs.items()},
        "validation": {"errors": fabric.get("errors") or [], "errorCount": len(fabric.get("errors") or [])},
        "fieldAccessLegend": fabric.get("fieldAccessLegend") or {},
    }


def p4_lookup(catalog_rows: list[dict[str, Any]], *ids: str) -> dict[str, Any]:
    wanted = {str(item) for item in ids if item}
    for row in catalog_rows:
        row_ids = {str(row.get("id") or ""), str(row.get("stageTemplateId") or ""), str(row.get("blueprintId") or ""), str(row.get("contractId") or ""), str(row.get("packageId") or "")}
        if wanted & row_ids:
            return row
    return {}


def p4_staff_profile_for_blueprint(fabric: dict[str, Any], blueprint_id: str = "", staff_id: str = "") -> dict[str, Any]:
    profiles = [row for row in fabric.get("staffProfiles", []) or [] if isinstance(row, dict)]
    if staff_id:
        found = next((row for row in profiles if str(row.get("id")) == staff_id), None)
        if found:
            return found
    if blueprint_id:
        found = next((row for row in profiles if blueprint_id in (row.get("archetypeIds") or []) or row.get("primaryArchetypeId") == blueprint_id), None)
        if found:
            return found
    return next((row for row in profiles if row.get("id") == "AIstaff_Manager"), profiles[0] if profiles else {})


def p4_connection_ready(connection: dict[str, Any], profile: dict[str, Any]) -> bool:
    configs = profile.get("connectionConfigs") if isinstance(profile.get("connectionConfigs"), dict) else {}
    scoped_config = configs.get(str(connection.get("id"))) if isinstance(configs.get(str(connection.get("id"))), dict) else {}
    effective_connection = {**connection, **scoped_config}
    status = normalize_text(effective_connection.get("status") or effective_connection.get("lifecycleStatus") or "active")
    if status in {"disabled", "inactive", "archived", "deprecated", "blocked", "needs setup", "planned", "draft", "test failed"}:
        return False
    active = {normalize_text(item) for item in profile.get("activeConnections", []) or [] if item}
    if not active:
        return True
    connection_id = normalize_text(effective_connection.get("id"))
    connection_label = normalize_text(effective_connection.get("label"))
    local_aliases = {
        "local runtime": {"local command center", "codex worker", "google sheet crm", "apps script bridge"},
        "local sqlite": {"local command center", "google sheet crm"},
        "email queue": {"gmail bridge", "outlook bridge", "apps script bridge"},
    }
    satisfied_by_alias = any(connection_id in aliases for active_key, aliases in local_aliases.items() if active_key in active)
    return connection_id in active or connection_label in active or satisfied_by_alias


def p4_resolve_context(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    init_db()
    payload = payload or {}
    fabric = load_capability_fabric()
    catalogs = p4_catalogs().get("catalogs") or {}
    departments = [row for row in fabric.get("departments", []) or [] if isinstance(row, dict)]
    department_id = str(payload.get("departmentId") or "").strip()
    department = next((row for row in departments if str(row.get("id")) == department_id), None)
    if not department:
        department = next((row for row in departments if row.get("isCurrentDepartment")), None)
        if not department:
            department = next((row for row in departments if normalize_text(row.get("status") or "active") == "active"), departments[0] if departments else {})
        department_id = str(department.get("id") or department_id)
    package = p4_lookup(catalogs.get("departmentPackages") or [], str(department.get("templateId") or ""), str(payload.get("departmentPackageId") or ""))
    stage_template = p4_lookup(catalogs.get("stageTemplates") or [], str(payload.get("stageTemplateId") or ""))
    if not stage_template:
        package_capabilities = set(str(item) for item in (package.get("capabilities") or []) if item)
        stage_template = next((row for row in catalogs.get("stageTemplates") or [] if str(row.get("capabilityId")) in package_capabilities), (catalogs.get("stageTemplates") or [{}])[0])
    owner_staff = normalized_staff_id(payload.get("staffProfileId") or stage_template.get("ownerStaff") or "AIstaff_Manager", "AIstaff_Manager")
    staff_profile = p4_staff_profile_for_blueprint(fabric, staff_id=owner_staff)
    blueprint_id = str(payload.get("staffBlueprintId") or staff_profile.get("primaryArchetypeId") or "")
    staff_blueprint = p4_lookup(catalogs.get("staffBlueprints") or [], blueprint_id)
    if not staff_blueprint:
        staff_blueprint = p4_lookup(catalogs.get("staffBlueprints") or [], "archetype_manager_orchestrator")
        blueprint_id = str(staff_blueprint.get("id") or "")
    staff_profile = p4_staff_profile_for_blueprint(fabric, blueprint_id=blueprint_id, staff_id=owner_staff)
    staff_id = str(staff_profile.get("id") or owner_staff or "AIstaff_Manager")

    stage_lanes = [str(item) for item in (stage_template.get("requiredLanes") or stage_template.get("lanes") or []) if item]
    tool_contracts = [row for row in catalogs.get("toolDataContracts") or [] if str(row.get("laneId")) in set(stage_lanes)]
    lane_adapters = [row for row in catalogs.get("laneAdapters") or [] if str(row.get("id")) in set(stage_lanes)]
    scoped = resolve_scoped_skills_for_staff(staff_id, fabric, staff_profile)
    resolved_skills = scoped.get("resolvedSkills") or []
    skill_packs = []
    skill_pack_lookup = {str(row.get("id")): row for row in catalogs.get("skillPacks") or []}
    for skill in resolved_skills:
        skill_pack = skill_pack_lookup.get(str(skill.get("id")))
        if skill_pack:
            skill_packs.append(skill_pack)

    missing: list[dict[str, Any]] = []
    if not department:
        missing.append({"type": "missing_assignment", "scope": "department", "id": department_id, "message": "Department is not installed."})
    if not package:
        missing.append({"type": "missing_assignment", "scope": "departmentPackage", "id": str(department.get("templateId") or ""), "message": "Department package/blueprint is missing."})
    if not stage_template:
        missing.append({"type": "missing_assignment", "scope": "stageTemplate", "id": str(payload.get("stageTemplateId") or ""), "message": "Stage template is missing."})
    if not staff_blueprint:
        missing.append({"type": "missing_assignment", "scope": "staffBlueprint", "id": blueprint_id, "message": "Staff blueprint is missing."})
    if stage_lanes and len(tool_contracts) < len(stage_lanes):
        missing.append({"type": "missing_tool", "scope": "toolDataContract", "id": ",".join(stage_lanes), "message": "One or more stage lanes do not have tool/data contracts."})
    connections = {str(row.get("id")): row for row in fabric.get("connections", []) or [] if isinstance(row, dict)}
    databases = {str(row.get("id")): row for row in fabric.get("databases", []) or [] if isinstance(row, dict)}
    workspace_defaults = workspace_profile()
    department_identity = department_identity_from_row(department, workspace_defaults) if department else attach_field_access({}, "DepartmentBusinessIdentity")
    for contract in tool_contracts:
        for connection_id in contract.get("requiredConnections") or []:
            connection = connections.get(str(connection_id))
            if not connection:
                missing.append({"type": "missing_tool", "scope": "connection", "id": connection_id, "message": f"Missing connection {connection_id}."})
            elif not p4_connection_ready(connection, department_identity):
                missing.append({"type": "inactive_connection", "scope": "connection", "id": connection_id, "message": f"Connection {connection.get('label') or connection_id} is not active for this department."})
        for database_id in contract.get("requiredDatabases") or []:
            if str(database_id) not in databases:
                missing.append({"type": "missing_dataset", "scope": "database", "id": database_id, "message": f"Missing dataset/database {database_id}."})
    human_approval = sorted(set(staff_blueprint.get("requiresApprovalFor") or []))
    if any("external" in normalize_text(item) or "email" in normalize_text(item) for item in human_approval):
        missing.append({"type": "approval_required", "scope": "policy", "id": "external_action_gate", "message": "External communication remains human-approved."})

    blocking_missing = [item for item in missing if item.get("type") not in {"approval_required"}]
    readiness_state = "ready" if not blocking_missing else str(blocking_missing[0].get("type") or "blocked")
    effective = {
        "department": attach_field_access(department, "AiDepartmentInstance") if department else {},
        "departmentPackage": package,
        "stageTemplate": stage_template,
        "staffProfile": attach_field_access(staff_profile, "AiStaffProfile") if staff_profile else {},
        "staffBlueprint": staff_blueprint,
        "skillPacks": skill_packs,
        "toolDataContracts": tool_contracts,
        "laneAdapters": lane_adapters,
        "workspaceProfile": workspace_defaults,
        "departmentBusinessIdentity": department_identity,
        "managerEscalationPolicy": "Route blocked or ambiguous execution to AI Manager before human escalation.",
        "humanApprovalRequirements": human_approval,
        "skillResolutionOrder": scoped.get("resolutionOrder") or [
            "platform safety",
            "department skills",
            "staff template skills",
            "lane/tool skills",
            "project context",
            "workspace preferences",
            "approved learned updates",
        ],
        "projectContext": payload.get("projectContext") if isinstance(payload.get("projectContext"), dict) else {},
    }
    return {
        "ok": True,
        "departmentId": department_id,
        "readinessState": readiness_state if readiness_state in P4_READY_STATES else "blocked",
        "missingRequirements": missing,
        "nextAction": p4_next_action_for_missing(missing),
        "effectiveContext": effective,
    }


def p4_next_action_for_missing(missing: list[dict[str, Any]]) -> str:
    if not missing:
        return "Ready to execute supervised local runtime."
    first = missing[0]
    kind = first.get("type")
    if kind == "approval_required":
        return "Ask AI Manager to request Iman approval before external or irreversible action."
    if kind == "inactive_connection":
        return "Configure and test the required connection from Department Explorer -> Tools & Lanes or Settings -> Connected Apps."
    if kind == "missing_dataset":
        return "Add or map the required dataset/database before running this stage."
    if kind == "missing_tool":
        return "Create the missing tool/data contract or lane adapter mapping."
    return "Route to AI Manager for assignment or configuration repair."


def p4_readiness(department_id: str = "") -> dict[str, Any]:
    init_db()
    catalogs = p4_catalogs().get("catalogs") or {}
    fabric = load_capability_fabric()
    departments = [row for row in fabric.get("departments", []) or [] if isinstance(row, dict)]
    if not department_id:
        active = next((row for row in departments if row.get("isCurrentDepartment")), None)
        if not active:
            active = next((row for row in departments if normalize_text(row.get("status") or "active") == "active"), departments[0] if departments else {})
        department_id = str(active.get("id") or "")
    department = next((row for row in departments if str(row.get("id")) == department_id), {})
    package = p4_lookup(catalogs.get("departmentPackages") or [], str(department.get("templateId") or ""))
    package_capabilities = set(str(item) for item in package.get("capabilities", []) or [])
    stage_rows = [row for row in catalogs.get("stageTemplates") or [] if not package_capabilities or str(row.get("capabilityId")) in package_capabilities]
    rows = []
    for stage in stage_rows:
        resolved = p4_resolve_context({"departmentId": department_id, "stageTemplateId": stage.get("id")})
        context = resolved.get("effectiveContext") or {}
        rows.append(
            {
                "scopeType": "stage",
                "scopeId": stage.get("id"),
                "label": stage.get("label"),
                "state": resolved.get("readinessState"),
                "assignedStaff": ((context.get("staffProfile") or {}).get("id") or ""),
                "assignedStaffLabel": ((context.get("staffProfile") or {}).get("label") or staff_label(((context.get("staffProfile") or {}).get("id") or ""))),
                "staffBlueprintId": ((context.get("staffBlueprint") or {}).get("id") or ""),
                "skillPackIds": [row.get("id") for row in context.get("skillPacks") or []],
                "toolDataContractIds": [row.get("id") for row in context.get("toolDataContracts") or []],
                "laneAdapterIds": [row.get("id") for row in context.get("laneAdapters") or []],
                "missingRequirements": resolved.get("missingRequirements") or [],
                "nextAction": resolved.get("nextAction") or "",
            }
        )
    counts: dict[str, int] = {state: 0 for state in P4_READY_STATES}
    for row in rows:
        counts[str(row.get("state") or "blocked")] = counts.get(str(row.get("state") or "blocked"), 0) + 1
    checked_at = utc_ts()
    with connect() as conn:
        for row in rows:
            readiness_id = "p4_ready_" + safe_task_part(f"{department_id}_{row.get('scopeId')}")
            conn.execute(
                """
                INSERT INTO p4_readiness_state (
                  readiness_id, department_id, scope_type, scope_id, state,
                  missing_requirements, next_action, checked_at, source_payload
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(readiness_id) DO UPDATE SET
                  state=excluded.state,
                  missing_requirements=excluded.missing_requirements,
                  next_action=excluded.next_action,
                  checked_at=excluded.checked_at,
                  source_payload=excluded.source_payload
                """,
                (
                    readiness_id,
                    department_id,
                    "stage",
                    str(row.get("scopeId") or ""),
                    str(row.get("state") or "blocked"),
                    json.dumps(row.get("missingRequirements") or [], default=str),
                    str(row.get("nextAction") or ""),
                    checked_at,
                    json.dumps(row, default=str),
                ),
            )
    return {
        "ok": True,
        "departmentId": department_id,
        "departmentLabel": department.get("label") or department_id,
        "summary": counts,
        "rows": rows,
        "checkedAt": iso_like(checked_at),
    }


def p4_scenario_map(department_id: str = "") -> dict[str, Any]:
    fabric = load_capability_fabric()
    catalogs = p4_catalogs().get("catalogs") or {}
    readiness = p4_readiness(department_id)
    department_id = str(readiness.get("departmentId") or department_id or "")
    departments = [row for row in fabric.get("departments", []) or [] if isinstance(row, dict)]
    department = next((row for row in departments if str(row.get("id")) == department_id), {})
    package = p4_lookup(catalogs.get("departmentPackages") or [], str(department.get("templateId") or ""))
    connections = {str(row.get("id")): attach_field_access(row, "AiConnection") for row in fabric.get("connections", []) or [] if isinstance(row, dict)}
    databases = {str(row.get("id")): attach_field_access(row, "AiDatabase") for row in fabric.get("databases", []) or [] if isinstance(row, dict)}
    nodes: dict[str, dict[str, Any]] = {}
    edges: list[dict[str, str]] = []

    def node_id(node_type: str, object_id: str) -> str:
        return f"{node_type}:{object_id}"

    def edit_target(node_type: str, row: dict[str, Any]) -> dict[str, str]:
        object_id = str(row.get("id") or row.get("packageId") or row.get("stageTemplateId") or row.get("adapterId") or row.get("contractId") or "")
        mapping = {
            "departmentPackage": ("departmentPackages", "departmentTemplates", object_id),
            "stage": ("stageTemplates", "recipes", str(row.get("recipeId") or object_id)),
            "staff": ("staffTemplates", "staffProfiles", object_id),
            "skillPack": ("skillPacks", str(row.get("sourceCatalog") or row.get("catalog") or "staffTemplateSkills"), object_id),
            "lane": ("laneAdapters", "lanes", str(row.get("adapterId") or object_id)),
            "toolDataContract": ("toolDataContracts", "lanes", str(row.get("laneId") or object_id)),
            "connection": ("connections", "connections", object_id),
            "database": ("databases", "databases", object_id),
        }
        tab, collection, target_id = mapping.get(node_type, ("", "", object_id))
        return {"tab": tab, "collection": collection, "id": target_id} if tab and target_id else {}

    def add_node(node_type: str, row: dict[str, Any], status: str = "ready", summary: str = "", metadata: dict[str, Any] | None = None) -> str:
        object_id = str(row.get("id") or row.get("packageId") or row.get("stageTemplateId") or row.get("adapterId") or row.get("contractId") or row.get("label") or node_type)
        key = node_id(node_type, object_id)
        if key not in nodes:
            nodes[key] = {
                "id": key,
                "objectId": object_id,
                "type": node_type,
                "label": row.get("label") or row.get("name") or row.get("alias") or row.get("profileTitle") or object_id,
                "summary": summary or row.get("summary") or row.get("purpose") or row.get("role") or row.get("providerResolutionRule") or "",
                "status": status,
                "metadata": metadata or {},
                "source": json_clone(row),
                "editTarget": edit_target(node_type, row),
            }
        else:
            if nodes[key].get("status") == "ready" and status != "ready":
                nodes[key]["status"] = status
            nodes[key]["metadata"] = {**(nodes[key].get("metadata") or {}), **(metadata or {})}
        return key

    def add_edge(from_id: str, to_id: str, label: str) -> None:
        if from_id and to_id and not any(edge.get("from") == from_id and edge.get("to") == to_id and edge.get("label") == label for edge in edges):
            edges.append({"from": from_id, "to": to_id, "label": label})

    package_node = add_node(
        "departmentPackage",
        package or department,
        "ready",
        (package or {}).get("purpose") or department.get("label") or "Installed AI Department package.",
        {"departmentId": department_id, "templateId": department.get("templateId")},
    )
    stages: list[dict[str, Any]] = []
    summary = {"stageCount": 0, "ready": 0, "blocked": 0, "approvalRequired": 0}
    for readiness_row in readiness.get("rows") or []:
        resolved = p4_resolve_context({"departmentId": department_id, "stageTemplateId": readiness_row.get("scopeId")})
        context = resolved.get("effectiveContext") or {}
        stage = context.get("stageTemplate") or {}
        staff = context.get("staffProfile") or {}
        staff_blueprint = context.get("staffBlueprint") or {}
        skill_packs = context.get("skillPacks") or []
        tool_contracts = context.get("toolDataContracts") or []
        lane_adapters = context.get("laneAdapters") or []
        missing = resolved.get("missingRequirements") or []
        raw_state = str(resolved.get("readinessState") or readiness_row.get("state") or "blocked")
        stage_state = "approval_required" if raw_state == "ready" and any(item.get("type") == "approval_required" for item in missing) else raw_state
        summary["stageCount"] += 1
        if stage_state == "ready":
            summary["ready"] += 1
        elif stage_state == "approval_required":
            summary["approvalRequired"] += 1
        else:
            summary["blocked"] += 1
        stage_node = add_node(
            "stage",
            stage,
            stage_state,
            stage.get("summary") or stage.get("escalationPolicy") or "",
            {
                "sequence": stage.get("sequence"),
                "recipeId": stage.get("recipeId"),
                "capabilityId": stage.get("capabilityId"),
                "capabilityLabel": stage.get("capabilityLabel"),
                "qualityGates": stage.get("requiredQualityGates") or stage.get("qualityGates") or [],
                "outputs": stage.get("outputs") or [],
                "nextAction": resolved.get("nextAction") or "",
            },
        )
        add_edge(package_node, stage_node, "contains stage")
        staff_node = add_node(
            "staff",
            staff,
            stage_state,
            staff_blueprint.get("purpose") or staff.get("role") or "",
            {
                "staffBlueprint": staff_blueprint.get("label") or staff_blueprint.get("id"),
                "promptRules": staff_blueprint.get("outputContract") or [],
                "approvalRequiredFor": staff_blueprint.get("requiresApprovalFor") or [],
                "datasets": {
                    "required": staff_blueprint.get("requiredDatasets") or [],
                    "optional": staff_blueprint.get("optionalDatasets") or [],
                    "workspace": staff_blueprint.get("workspaceProvidedDatasets") or [],
                },
                "tools": staff_blueprint.get("requiredLanesTools") or [],
            },
        )
        add_edge(stage_node, staff_node, "assigned to")
        connection_rows: list[dict[str, Any]] = []
        database_rows: list[dict[str, Any]] = []
        for skill in skill_packs:
            skill_node = add_node(
                "skillPack",
                skill,
                stage_state,
                skill.get("summary") or "; ".join(str(rule) for rule in (skill.get("rules") or [])[:2]),
                {"scope": skill.get("scope"), "sourceCatalog": skill.get("sourceCatalog")},
            )
            add_edge(staff_node, skill_node, "uses skill")
        for contract in tool_contracts:
            contract_node = add_node(
                "toolDataContract",
                contract,
                stage_state,
                contract.get("purpose") or contract.get("providerResolutionRule") or "",
                {
                    "providerResolutionRule": contract.get("providerResolutionRule"),
                    "fallbackBehavior": contract.get("fallbackBehavior"),
                    "laneId": contract.get("laneId"),
                },
            )
            add_edge(stage_node, contract_node, "requires tool")
            for connection_id in contract.get("requiredConnections") or []:
                connection = connections.get(str(connection_id)) or {"id": connection_id, "label": str(connection_id), "status": "missing"}
                missing_connection = next((item for item in missing if item.get("scope") == "connection" and str(item.get("id")) == str(connection_id)), {})
                connection_state = str(missing_connection.get("type") or stage_state)
                connection_node = add_node("connection", connection, connection_state, connection.get("summary") or connection.get("type") or "", {"nextAction": missing_connection.get("message") or ""})
                add_edge(contract_node, connection_node, "requires connection")
                connection_rows.append(nodes[connection_node].get("source") or connection)
            for database_id in contract.get("requiredDatabases") or []:
                database = databases.get(str(database_id)) or {"id": database_id, "label": str(database_id), "status": "missing"}
                missing_database = next((item for item in missing if item.get("scope") == "database" and str(item.get("id")) == str(database_id)), {})
                database_state = str(missing_database.get("type") or stage_state)
                database_node = add_node("database", database, database_state, database.get("summary") or database.get("type") or "", {"nextAction": missing_database.get("message") or ""})
                add_edge(contract_node, database_node, "requires data")
                database_rows.append(nodes[database_node].get("source") or database)
        for lane in lane_adapters:
            lane_node = add_node(
                "lane",
                lane,
                stage_state,
                lane.get("summary") or lane.get("routeType") or "",
                {
                    "connections": lane.get("connections") or [],
                    "databases": lane.get("databases") or [],
                    "qualityGates": lane.get("qualityGates") or [],
                    "providerRulesOwnedBy": lane.get("providerRulesOwnedBy"),
                },
            )
            add_edge(stage_node, lane_node, "resolved by")
        stages.append(
            {
                "stage": stage,
                "staff": staff,
                "staffBlueprint": staff_blueprint,
                "skillPacks": skill_packs,
                "laneAdapters": lane_adapters,
                "toolDataContracts": tool_contracts,
                "connections": connection_rows,
                "databases": database_rows,
                "readinessState": stage_state,
                "rawReadinessState": raw_state,
                "missingRequirements": missing,
                "nextAction": resolved.get("nextAction") or "",
                "nodeIds": {
                    "stage": stage_node,
                    "staff": staff_node,
                    "skills": [node_id("skillPack", str(row.get("id"))) for row in skill_packs],
                    "lanes": [node_id("lane", str(row.get("id"))) for row in lane_adapters],
                },
            }
        )
    return {
        "ok": True,
        "departmentId": department_id,
        "department": attach_field_access(department, "AiDepartmentInstance") if department else {},
        "package": package,
        "nodes": list(nodes.values()),
        "edges": edges,
        "stages": stages,
        "summary": summary,
        "readiness": readiness,
    }


def create_p4_provisioning_snapshot(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()
    resolved = payload.get("resolvedContext") if isinstance(payload.get("resolvedContext"), dict) else {}
    if not resolved:
        resolved = p4_resolve_context(payload)
    context = resolved.get("effectiveContext") or {}
    stage = context.get("stageTemplate") or {}
    staff_blueprint = context.get("staffBlueprint") or {}
    department_id = str(payload.get("departmentId") or resolved.get("departmentId") or ((context.get("department") or {}).get("id") or ""))
    snapshot_id = str(payload.get("snapshotId") or ("p4_snapshot_" + str(uuid.uuid4())))
    now = utc_ts()
    snapshot_payload = {
        "resolved": resolved,
        "versions": {
            "departmentPackage": ((context.get("departmentPackage") or {}).get("version") or ""),
            "stageTemplate": stage.get("version") or "",
            "staffBlueprint": staff_blueprint.get("version") or "",
            "skillPacks": [{"id": row.get("id"), "version": row.get("version")} for row in context.get("skillPacks") or []],
            "toolDataContracts": [{"id": row.get("id"), "version": row.get("version")} for row in context.get("toolDataContracts") or []],
            "laneAdapters": [{"id": row.get("id"), "version": row.get("version")} for row in context.get("laneAdapters") or []],
        },
        "workspaceProfile": context.get("workspaceProfile") or {},
        "createdFor": {
            "projectStepId": payload.get("projectStepId") or "",
            "threadId": payload.get("threadId") or "",
            "workItemId": payload.get("workItemId") or "",
            "queueId": payload.get("queueId") or "",
        },
    }
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO p4_provisioning_snapshots (
              snapshot_id, department_id, stage_template_id, staff_blueprint_id,
              project_step_id, thread_id, work_item_id, queue_id, readiness_state,
              payload, created_at, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                snapshot_id,
                department_id,
                str(stage.get("id") or payload.get("stageTemplateId") or ""),
                str(staff_blueprint.get("id") or payload.get("staffBlueprintId") or ""),
                str(payload.get("projectStepId") or ""),
                str(payload.get("threadId") or ""),
                str(payload.get("workItemId") or ""),
                str(payload.get("queueId") or ""),
                str(resolved.get("readinessState") or ""),
                json.dumps(snapshot_payload, ensure_ascii=False, default=str),
                now,
                str(payload.get("createdBy") or "AIstaff_Manager"),
            ),
        )
    return {"ok": True, "snapshotId": snapshot_id, "snapshot": snapshot_payload, "createdAt": iso_like(now)}


def latest_p4_snapshot_for_ref(project_step_id: str = "", work_item_id: str = "", thread_id: str = "", queue_id: str = "") -> str:
    clauses: list[str] = []
    params: list[Any] = []
    for column, value in [
        ("project_step_id", project_step_id),
        ("work_item_id", work_item_id),
        ("thread_id", thread_id),
        ("queue_id", queue_id),
    ]:
        if value:
            clauses.append(f"{column} = ?")
            params.append(value)
    if not clauses:
        return ""
    with connect() as conn:
        row = conn.execute(
            f"SELECT snapshot_id FROM p4_provisioning_snapshots WHERE {' OR '.join(clauses)} ORDER BY created_at DESC LIMIT 1",
            params,
        ).fetchone()
    return str(row["snapshot_id"]) if row else ""


def p4_runtime_handler_summary() -> dict[str, Any]:
    init_db()
    recommended = [
        {"handlerId": "handler_local_worker_command", "handlerType": "local_worker", "handlerKey": "AI_DEPARTMENT_WORKER_COMMAND", "status": "Active" if local_worker_command() else "Needs Configuration"},
        {"handlerId": "handler_email_alpha", "handlerType": "email", "handlerKey": "email_preview_send_attempt", "status": "Supervised"},
        {"handlerId": "handler_project_step_output", "handlerType": "project_step", "handlerKey": "project_step_output", "status": "Active"},
        {"handlerId": "handler_thread_task", "handlerType": "thread_task", "handlerKey": "local_thread_task", "status": "Active"},
        {"handlerId": "handler_local_snapshot", "handlerType": "crm_local", "handlerKey": "dashboard_snapshot", "status": "Active"},
        {"handlerId": "handler_langgraph_orchestrator", "handlerType": "orchestration", "handlerKey": "ai_department_langgraph_v1", "status": "Interface Ready"},
        {"handlerId": "handler_windmill_activity", "handlerType": "activity_executor", "handlerKey": "WINDMILL_BASE_URL/WINDMILL_WORKSPACE", "status": "Active" if windmill_config()["configured"] else "Mock Mode"},
    ]
    now = utc_ts()
    with connect() as conn:
        for row in recommended:
            conn.execute(
                """
                INSERT INTO p4_runtime_handlers (
                  handler_id, handler_type, handler_key, status, source_payload, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(handler_id) DO UPDATE SET
                  handler_type=excluded.handler_type,
                  handler_key=excluded.handler_key,
                  status=excluded.status,
                  source_payload=excluded.source_payload,
                  updated_at=excluded.updated_at
                """,
                (
                    row["handlerId"],
                    row["handlerType"],
                    row["handlerKey"],
                    row["status"],
                    json.dumps(row, default=str),
                    now,
                    now,
                ),
            )
        rows = conn.execute("SELECT * FROM p4_runtime_handlers ORDER BY handler_type, handler_id").fetchall()
    handlers = [
        {
            "handlerId": row["handler_id"],
            "contractId": row["contract_id"],
            "stageTemplateId": row["stage_template_id"],
            "handlerType": row["handler_type"],
            "handlerKey": row["handler_key"],
            "status": row["status"],
            "metadata": parse_json_text(row["source_payload"], {}),
            "updatedAt": iso_like(row["updated_at"]),
        }
        for row in rows
    ]
    return {
        "handlers": handlers,
        "canExecuteResolvedContexts": bool(local_worker_command()),
        "missingConfiguration": "" if local_worker_command() else "AI_DEPARTMENT_WORKER_COMMAND is not configured for local worker execution.",
        "langGraph": orchestration_status(),
        "windmill": windmill_status(),
    }


def platform_export_manifest() -> dict[str, Any]:
    catalogs = platform_admin_catalogs()
    fabric = load_capability_fabric()
    p4 = p4_catalogs()
    manifest = {
        "manifestType": "AiDepartmentLocalAlphaExport",
        "generatedAt": iso_like(),
        "schemaVersion": fabric.get("schemaVersion") or "1.0",
        "source": "local command center",
        "version": {
            "fabricLastReviewed": fabric.get("lastReviewed"),
            "activeDepartment": "department_swiss_planner_applications",
            "runtimeMode": get_meta("crm_sync_status", "local-runtime"),
        },
        "catalogs": catalogs.get("catalogs") or {},
        "p4Catalogs": p4.get("catalogs") or {},
        "p4Summary": p4.get("summary") or {},
        "workspaceProfile": workspace_profile(),
        "fieldAccessLegend": catalogs.get("fieldAccessLegend") or {},
        "validation": catalogs.get("validation") or {},
        "orchestrationDecision": {
            "currentEngine": "DB queue + local runner + autopilot",
            "externalEngine": "Deferred",
            "criteria": ((fabric.get("operatingModel") or {}).get("automationRuntimeArchitecture") or {}).get("externalWorkflowEnginePolicy", {}),
        },
    }
    return {"ok": True, "manifest": manifest}


def capability_fabric_manager_context() -> dict[str, Any]:
    fabric = load_capability_fabric()
    return {
        "architecture": fabric.get("architecture"),
        "normalRelationship": "Solution module -> Capability -> Recipe -> Stage -> Lane -> Quality gate -> Output",
        "operatingModel": fabric.get("operatingModel") or {},
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
        "staffArchetypes": [
            {
                "id": row.get("id"),
                "label": row.get("label"),
                "allowedPluginFamilies": row.get("allowedPluginFamilies", []),
                "requiresApprovalFor": row.get("requiresApprovalFor", []),
            }
            for row in (fabric.get("staffArchetypes", []) or [])
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


def load_dashboard_snapshot(*, full_fabric: bool = False, fast: bool = False) -> Dashboard | None:
    with connect() as conn:
        row = conn.execute("SELECT payload, updated_at, source, error FROM dashboard_snapshot WHERE id = 1").fetchone()
    if not row:
        return None
    enforce_manager_human_gate()
    payload = json.loads(row["payload"])
    payload = reconcile_snapshot_tasks_from_threads(payload)
    payload = apply_task_status_overrides(payload)
    payload = normalize_task_table(payload)
    if fast:
        cached_plans = payload.get("projectPlans") if isinstance(payload.get("projectPlans"), dict) else {}
        payload["projectPlans"] = cached_plans or {"ok": True, "plans": [], "counts": {"total": 0, "blocked": 0, "inProgress": 0, "active": 0}, "fastMode": True}
        payload["skillUpdates"] = payload.get("skillUpdates") or []
        payload["skillUpdatesAll"] = payload.get("skillUpdatesAll") or []
        payload["staffWakeups"] = payload.get("staffWakeups") or {}
        payload["localSync"] = local_status(fast=True, snapshot_payload=payload)
    else:
        payload = apply_task_status_overrides(payload)
        payload = normalize_task_table(payload)
        payload = ensure_threads_for_tasks(payload)
        ensure_project_plans_from_snapshot(payload)
        payload["projectPlans"] = list_project_plans("active", 100, refresh=False)
        payload["skillUpdates"] = list_skill_updates("Pending").get("learning", [])
        payload["skillUpdatesAll"] = list_skill_updates("All").get("learning", [])
        payload["staffWakeups"] = staff_wakeup_summary()
        payload["localSync"] = local_status()
    payload["capabilityFabric"] = dashboard_capability_fabric(full=full_fabric)
    return payload


def save_dashboard_snapshot(payload: Dashboard, source: str = "bridge", error: str = "") -> Dashboard:
    saved = dict(payload or {})
    saved.pop("capabilityFabric", None)
    saved = apply_task_status_overrides(saved)
    saved = normalize_task_table(saved)
    saved = apply_task_status_overrides(saved)
    saved = normalize_task_table(saved)
    saved = ensure_threads_for_tasks(saved)
    ensure_project_plans_from_snapshot(saved)
    saved["projectPlans"] = list_project_plans("active", 100, refresh=False)
    saved["skillUpdates"] = list_skill_updates("Pending").get("learning", [])
    saved["skillUpdatesAll"] = list_skill_updates("All").get("learning", [])
    saved["staffWakeups"] = staff_wakeup_summary()
    saved["localSync"] = local_status()
    saved["capabilityFabric"] = dashboard_capability_fabric(full=False)
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
        marker = warning_path.parent / "STYLE_QA_APPROVED.txt"
        if marker.exists():
            continue
        if manifest_path.exists():
            try:
                manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig", errors="ignore"))
                quality = manifest.get("document_quality") or {}
                status = quality.get("style_quality_status") or quality.get("styleQualityStatus") or ""
                if approved_style_status(status):
                    continue
            except Exception:
                pass
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


def local_email_queue_status(limit: int = 80) -> dict[str, Any]:
    snapshot = load_dashboard_snapshot() or empty_dashboard()
    queue = snapshot.get("emailQueue")
    if isinstance(queue, dict):
        result = {key: value for key, value in queue.items() if isinstance(value, list)}
    else:
        result = {"queue": flatten_email_queue(queue)}
    result.setdefault("queue", [])
    result.setdefault("blocked", [])
    result.setdefault("queued", [])
    result.setdefault("sent", [])
    result.setdefault("errors", [])
    max_rows = max(1, int(limit or 80))
    for key, rows in list(result.items()):
        if isinstance(rows, list):
            result[key] = rows[:max_rows]
    result["ok"] = True
    result["localOnly"] = True
    return result


def update_snapshot_queue_row(queue_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    queue_id = str(queue_id or "").strip()
    if not queue_id:
        return {"ok": False, "error": "Missing queueId."}
    snapshot = load_dashboard_snapshot() or empty_dashboard()
    queue = snapshot.get("emailQueue")
    changed = False
    updated_row: dict[str, Any] | None = None

    def maybe_update(row: dict[str, Any]) -> None:
        nonlocal changed, updated_row
        row_id = str(row.get("queueId") or row.get("Queue ID") or row.get("sourceQueueId") or "").strip()
        if row_id != queue_id:
            return
        for key, value in (updates or {}).items():
            if value not in (None, ""):
                row[key] = value
        changed = True
        updated_row = dict(row)

    if isinstance(queue, dict):
        for rows in queue.values():
            if isinstance(rows, list):
                for row in rows:
                    if isinstance(row, dict):
                        maybe_update(row)
    elif isinstance(queue, list):
        for row in queue:
            if isinstance(row, dict):
                maybe_update(row)

    if not changed:
        return {"ok": False, "error": f"Queue ID not found locally: {queue_id}"}
    snapshot["refreshedAt"] = iso_like()
    save_dashboard_snapshot(snapshot, source="local-email")
    return {"ok": True, "queueId": queue_id, "row": updated_row}


def update_email_queue_approval(payload: dict[str, Any]) -> dict[str, Any]:
    queue_id = str(payload.get("queueId") or payload.get("id") or "").strip()
    if not queue_id:
        return {"ok": False, "error": "Missing queueId."}
    approval = str(payload.get("approvalStatus") or payload.get("Approval Status") or "Approved").strip()
    approved_by = str(payload.get("approvedBy") or "Human_Iman")
    now = iso_like()
    result = update_snapshot_queue_row(
        queue_id,
        {
            "approvalStatus": approval,
            "Approval Status": approval,
            "approvedBy": approved_by,
            "Approved By": approved_by,
            "approvedAt": now,
            "Approved At": now,
            "sendStatus": "Approved - Waiting Safety Check" if approval.lower() == "approved" else "Blocked - Needs Iman Approval",
            "Send Status": "Approved - Waiting Safety Check" if approval.lower() == "approved" else "Blocked - Needs Iman Approval",
        },
    )
    row = result.get("row") if isinstance(result.get("row"), dict) else queue_row_from_snapshot(queue_id) or {}
    record_communication_event(
        queue_id=queue_id,
        row=row,
        event_type="approval_update",
        status=approval,
        metadata={"approvedBy": approved_by, "approvedAt": now},
    )
    return result | {"approvalStatus": approval, "approvedBy": approved_by, "approvedAt": now}


PROJECT_WORKFLOW_BLUEPRINT = [
    {
        "stage": "Lead Received",
        "title": "Intake Lead and transferred tender files",
        "assignedStaff": "AIstaff_Manager",
        "readyAfter": -1,
        "taskType": "Lead Intake",
        "taskCategory": TASK_CATEGORIES["manager"],
        "outputTemplateId": "output_lead_intake_record",
        "actionLabel": "Review intake",
        "expectedOutput": "Lead intake brief with source, owner, tender case link, files received, and the first blocker or next staff route.",
        "safetyGate": "Manager-owned only; do not create supplier outreach or tender submission from intake.",
    },
    {
        "stage": "Tender Docs Reviewed",
        "title": "Review tender documents, scope, deadline, and missing inputs",
        "assignedStaff": "AIstaff_OpportunityHunter",
        "readyAfter": 0,
        "taskType": "Tender Document Review",
        "taskCategory": TASK_CATEGORIES["application"],
        "outputTemplateId": "output_tender_document_review",
        "actionLabel": "Start doc review",
        "expectedOutput": "Document review brief covering tender scope, required files, deadlines, mandatory forms, missing files, and first fit signals.",
        "safetyGate": "If technical appendix, scope PDF, BOQ, forms, or portal files are missing, stop and ask Alex to request them from Iman.",
    },
    {
        "stage": "Fit / Eligibility Checked",
        "title": "Assess GCC lab fit, eligibility, partner need, and supplier route",
        "assignedStaff": "AIstaff_FitAnalyst",
        "readyAfter": 1,
        "taskType": "Fit Review",
        "taskCategory": TASK_CATEGORIES["research"],
        "outputTemplateId": "output_fit_eligibility_report",
        "actionLabel": "Run fit review",
        "expectedOutput": "Fit and eligibility report with go/no-go, GCC lab capability match, partner need, supplier route, risks, and required approvals.",
        "safetyGate": "Do not mark eligible unless tender requirements and GCC lab capability evidence are both clear.",
    },
    {
        "stage": "Supplier Match Needed",
        "title": "Map existing suppliers/partners or discover new candidates",
        "assignedStaff": "AIstaff_ProfessorResearchAnalyst",
        "readyAfter": 2,
        "taskType": "Supplier Mapping",
        "taskCategory": TASK_CATEGORIES["research"],
        "outputTemplateId": "output_supplier_shortlist",
        "actionLabel": "Map suppliers",
        "expectedOutput": "Supplier or partner shortlist with existing CRM matches, missing capability gaps, new supplier candidates, contacts, and evidence.",
        "safetyGate": "Do not contact suppliers directly; prepare a shortlist and route outreach through Alex and the supervised email lane.",
    },
    {
        "stage": "Quotation Requested",
        "title": "Prepare approved supplier quotation outreach and capture replies",
        "assignedStaff": "AIstaff_ApplicationPackSender",
        "readyAfter": 3,
        "taskType": "Quotation Outreach",
        "taskCategory": TASK_CATEGORIES["email"],
        "outputTemplateId": "output_supplier_quotation_outreach",
        "actionLabel": "Prepare outreach",
        "expectedOutput": "Draft supplier quotation request, selected recipients, attachment checklist, duplicate check, approval preview, and communications log entry.",
        "safetyGate": "External supplier email must remain blocked until Iman approves the exact message, recipients, and attachments.",
    },
    {
        "stage": "Tender Package In Progress",
        "title": "Prepare compliance matrix, technical response, and commercial package",
        "assignedStaff": "AIstaff_ApplicationPackMaker",
        "readyAfter": 4,
        "taskType": "Tender Package",
        "taskCategory": TASK_CATEGORIES["application"],
        "outputTemplateId": "output_tender_package",
        "actionLabel": "Build package",
        "expectedOutput": "Tender package checklist, compliance matrix, technical response outline, commercial inputs, quotation evidence, and submission-readiness score.",
        "safetyGate": "Do not submit tender package; only prepare and mark readiness for Iman/Alex approval.",
    },
    {
        "stage": "Submitted / Waiting",
        "title": "Follow up, track submission/waiting state, and close or learn",
        "assignedStaff": "AIstaff_FollowUpController",
        "readyAfter": 5,
        "taskType": "Tender Follow-up",
        "taskCategory": TASK_CATEGORIES["audit"],
        "outputTemplateId": "output_followup_tracker",
        "actionLabel": "Track follow-up",
        "expectedOutput": "Follow-up tracker with pending supplier/client responses, due dates, next reminders, closure decision, and learning candidates.",
        "safetyGate": "Do not close incomplete Leads or change tender outcome unless Iman approved the closure/submission policy.",
    },
]


PROJECT_STAGE_ORDER = [
    "lead received",
    "tender docs reviewed",
    "fit eligibility checked",
    "supplier match needed",
    "quotation requested",
    "tender package in progress",
    "tender package ready",
    "submitted waiting",
]


def project_step_contract(sequence: int, blocker_type: str = "") -> dict[str, Any]:
    index = max(0, int(sequence or 1) - 1)
    template = PROJECT_WORKFLOW_BLUEPRINT[index] if index < len(PROJECT_WORKFLOW_BLUEPRINT) else PROJECT_WORKFLOW_BLUEPRINT[-1]
    blocker = str(blocker_type or "").strip()
    assigned_staff = template.get("assignedStaff") or "AIstaff_Manager"
    task_category = template.get("taskCategory") or TASK_CATEGORIES["application"]
    action_label = template.get("actionLabel") or "Start step"
    task_type = template.get("taskType") or template.get("stage") or "Project Step"
    completion = (
        f"Produce {template.get('expectedOutput')}. Respect safety gate: {template.get('safetyGate')}. "
        "Update the task thread with evidence, blocker, or next route through AIstaff_Manager."
    )
    if blocker == "Missing tender files":
        assigned_staff = "Human_Iman"
        task_category = TASK_CATEGORIES["human"]
        action_label = "Request files"
        task_type = "Missing Tender Files"
        completion = (
            "Iman uploads the missing tender files, confirms they are unavailable, or approves closing/parking the Lead. "
            "Alex then routes the next internal staff step."
        )
    elif blocker == "External email approval needed":
        assigned_staff = "Human_Iman"
        task_category = TASK_CATEGORIES["human"]
        action_label = "Request approval"
        task_type = "Supplier Outreach Approval"
        completion = (
            "Iman approves, rejects, or edits the supplier outreach preview. No supplier email is sent by creating this task."
        )
    elif blocker == "Human approval needed":
        assigned_staff = "Human_Iman"
        task_category = TASK_CATEGORIES["human"]
        action_label = "Ask Iman"
        task_type = "Tender Decision"
        completion = "Iman gives the decision Alex needs, then Alex routes the next staff task internally."
    return {
        "actionLabel": action_label,
        "taskType": task_type,
        "taskCategory": task_category,
        "assignedStaff": assigned_staff,
        "outputTemplateId": template.get("outputTemplateId") or "",
        "expectedOutput": template.get("expectedOutput") or "",
        "safetyGate": template.get("safetyGate") or "",
        "completionCriteria": completion,
        "successStatus": f"{task_type} Done",
        "failureStatus": f"Blocked - {task_type}",
        "canStart": True,
    }


def project_step_output_id(step_id: str) -> str:
    return "output_" + safe_task_part(step_id or "project_step")


def default_project_output_content(output_template_id: str, step_title: str = "") -> dict[str, Any]:
    template = str(output_template_id or "")
    sections_by_template = {
        "output_tender_document_review": ["scope", "filesReviewed", "missingInputs", "deadlines", "mandatoryForms", "initialFitSignals"],
        "output_fit_eligibility_report": ["recommendation", "capabilityMatch", "eligibilityRequirements", "partnerNeed", "supplierRoute", "risks"],
        "output_supplier_shortlist": ["existingMatches", "newCandidates", "contacts", "capabilityGaps", "evidence"],
        "output_supplier_quotation_outreach": ["recipients", "messageDraft", "attachments", "duplicateCheck", "approvalPreview"],
        "output_tender_package": ["complianceMatrix", "technicalResponse", "commercialInputs", "quotationEvidence", "readinessScore"],
        "output_followup_tracker": ["pendingResponses", "nextReminders", "dueDates", "closureDecision", "learningCandidates"],
        "output_lead_intake_record": ["source", "leadOwner", "tenderCase", "filesReceived", "firstBlocker", "nextRoute"],
    }
    return {
        "notes": "",
        "sections": {name: "" for name in sections_by_template.get(template, ["summary", "evidence", "nextRoute"])},
        "checklist": [],
        "sourceStep": step_title,
    }


def row_to_project_step_output(row: sqlite3.Row | dict[str, Any] | None) -> dict[str, Any] | None:
    if not row:
        return None
    return {
        "outputId": row_value(row, "output_id"),
        "stepId": row_value(row, "step_id"),
        "planId": row_value(row, "plan_id"),
        "applicationId": row_value(row, "application_id"),
        "outputTemplateId": row_value(row, "output_template_id"),
        "status": row_value(row, "status") or "Draft",
        "title": row_value(row, "title"),
        "summary": row_value(row, "summary"),
        "content": parse_json_text(row_value(row, "content_json"), {}),
        "blockerType": row_value(row, "blocker_type"),
        "evidenceLink": row_value(row, "evidence_link"),
        "reviewedBy": row_value(row, "reviewed_by"),
        "createdBy": row_value(row, "created_by"),
        "createdAt": iso_like(row_value(row, "created_at")),
        "updatedAt": iso_like(row_value(row, "updated_at")),
        "sentToAlexAt": iso_like(row_value(row, "sent_to_alex_at")) if row_value(row, "sent_to_alex_at") else "",
    }


def latest_project_step_output(step_id: str) -> dict[str, Any] | None:
    step_id = str(step_id or "").strip()
    if not step_id:
        return None
    with connect() as conn:
        row = conn.execute(
            """
            SELECT * FROM project_step_outputs
            WHERE step_id = ?
            ORDER BY updated_at DESC
            LIMIT 1
            """,
            (step_id,),
        ).fetchone()
    return row_to_project_step_output(row)


def project_step_next_action_label(step_status: str, output_status: str, action_label: str) -> str:
    if output_status == "Not started":
        return action_label or "Start"
    if output_status == "Draft":
        return "Continue output"
    if output_status == "Ready for Alex Review":
        return "Await Alex review"
    if output_status == "Blocked":
        return "Review blocker"
    if output_status == "Approved":
        return "Approved"
    return action_label or ("Rework" if step_status == "Done" else "Start")


def project_step_output_summary(step_id: str, step_status: str, action_label: str) -> dict[str, Any]:
    output = latest_project_step_output(step_id)
    output_status = output.get("status") if output else "Not started"
    return {
        "outputStatus": output_status,
        "outputId": output.get("outputId") if output else "",
        "outputUpdatedAt": output.get("updatedAt") if output else "",
        "nextActionLabel": project_step_next_action_label(step_status, output_status, action_label),
    }


def project_plan_id(application_id: str) -> str:
    return "plan_" + safe_task_part(application_id or "lead")


def project_step_id(plan_id: str, sequence: int) -> str:
    return f"{plan_id}_step_{int(sequence):02d}"


def application_identifier(app: dict[str, Any]) -> str:
    return str(
        app.get("applicationId")
        or app.get("Application ID")
        or app.get("entityId")
        or app.get("EntityID")
        or ""
    ).strip()


def application_stage_index(app: dict[str, Any]) -> int:
    text = normalize_text(compact_join([app.get("currentStage"), app.get("currentStatus"), app.get("stage"), app.get("status")]))
    if not text:
        return 0
    if any(term in text for term in ["submitted", "waiting", "awarded", "closed"]):
        return 7
    if "ready" in text and "package" in text:
        return 6
    if "package" in text:
        return 5
    if any(term in text for term in ["quotation", "quote requested", "requested"]):
        return 4
    if any(term in text for term in ["supplier", "partner", "match"]):
        return 3
    if any(term in text for term in ["fit", "eligibility", "eligible"]):
        return 2
    if any(term in text for term in ["doc", "document", "reviewed", "file"]):
        return 1
    return 0


def project_related_rows(application_id: str, snapshot: Dashboard | None) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    app_id = str(application_id or "").strip()
    tasks = [
        row for row in (snapshot or {}).get("tasks", []) or []
        if isinstance(row, dict)
        and app_id
        and str(row.get("applicationId") or row.get("Application ID") or row.get("relatedApplicationId") or row.get("entityId") or "").strip() == app_id
    ]
    emails = [
        row for row in flatten_email_queue((snapshot or {}).get("emailQueue"))
        if isinstance(row, dict)
        and app_id
        and str(row.get("applicationId") or row.get("Application ID") or row.get("relatedApplicationId") or "").strip() == app_id
    ]
    return tasks, emails


def infer_step_blocker(sequence: int, tasks: list[dict[str, Any]], emails: list[dict[str, Any]]) -> tuple[str, str, str, str, str]:
    blob = normalize_text(compact_join([json.dumps(tasks, default=str)[:4000], json.dumps(emails, default=str)[:4000]]))
    source_task = ""
    source_thread = ""
    queue_id = ""
    due_at = ""
    notes = ""
    for task in tasks:
        task_blob = normalize_text(compact_join([task.get("status"), task.get("taskType"), task.get("taskCategory"), task.get("nextAction"), task.get("lastError"), task.get("resultNotes")]))
        if sequence == 1 and "missing" in task_blob and any(term in task_blob for term in ["file", "pdf", "appendix", "scope"]):
            return "Missing tender files", str(task.get("taskId") or ""), str(task.get("threadId") or ""), str(task.get("sourceQueueId") or ""), str(task.get("dueAt") or task.get("runAfter") or ""), "Tender document review is blocked by missing files."
        if not task_is_terminal(task) and any(term in task_blob for term in ["approval", "needs iman", "human decision"]):
            source_task = str(task.get("taskId") or source_task)
            source_thread = str(task.get("threadId") or source_thread)
            due_at = str(task.get("dueAt") or task.get("runAfter") or due_at)
            notes = str(task.get("nextAction") or task.get("resultNotes") or notes)
    if sequence == 4:
        for email in emails:
            text = normalize_text(compact_join([email.get("sendStatus"), email.get("approvalStatus"), email.get("lastError")]))
            if any(term in text for term in ["needs approval", "not approved", "blocked"]):
                return "External email approval needed", source_task, source_thread, str(email.get("queueId") or email.get("Queue ID") or ""), due_at, str(email.get("lastError") or email.get("subject") or "Supplier outreach is approval-gated.")
    if "worker command not configured" in blob or "codex worker" in blob:
        return "Codex worker unavailable", source_task, source_thread, queue_id, due_at, notes or "Research/writing work is waiting for a local worker."
    if source_task:
        return "Human approval needed", source_task, source_thread, queue_id, due_at, notes or "Waiting for a human/manager decision."
    return "", source_task, source_thread, queue_id, due_at, notes


def build_project_steps(app: dict[str, Any], snapshot: Dashboard | None) -> list[dict[str, Any]]:
    app_id = application_identifier(app)
    tasks, emails = project_related_rows(app_id, snapshot)
    current_index = application_stage_index(app)
    steps: list[dict[str, Any]] = []
    blocked_seen = False
    for index, template in enumerate(PROJECT_WORKFLOW_BLUEPRINT):
        blocker, source_task, source_thread, queue_id, due_at, notes = infer_step_blocker(index, tasks, emails)
        blocker_applies = (
            (blocker == "Missing tender files" and index == 1)
            or (blocker == "External email approval needed" and index == 4)
            or (blocker in {"Human approval needed", "Codex worker unavailable"} and index in {current_index, current_index + 1})
        )
        if blocker and not blocker_applies:
            blocker = ""
            source_task = ""
            source_thread = ""
            queue_id = ""
            due_at = ""
            notes = ""
        if blocker and blocker_applies:
            status = "Blocked"
            blocked_seen = True
        elif index < current_index:
            status = "Done"
        elif index == current_index:
            status = "In Progress" if not blocked_seen else "Queued"
        elif index == current_index + 1:
            status = "Ready" if not blocked_seen else "Queued"
        else:
            status = "Queued"
        if status == "Done":
            blocker = ""
        contract = project_step_contract(index + 1, blocker)
        step_id = project_step_id(project_plan_id(app_id), index + 1)
        output_summary = project_step_output_summary(step_id, status, contract.get("actionLabel") or "")
        steps.append(
            {
                "sequence": index + 1,
                "stepId": step_id,
                "stage": template["stage"],
                "title": template["title"],
                "assignedStaff": template["assignedStaff"],
                "status": status,
                "blockerType": blocker,
                "action": contract,
                "expectedOutput": contract.get("expectedOutput") or "",
                "outputTemplateId": contract.get("outputTemplateId") or "",
                "safetyGate": contract.get("safetyGate") or "",
                **output_summary,
                "sourceTaskId": source_task,
                "sourceThreadId": source_thread,
                "queueId": queue_id,
                "dueAt": due_at,
                "evidenceLink": "",
                "notes": notes,
            }
        )
    return steps


def plan_status_from_steps(steps: list[dict[str, Any]]) -> str:
    if any(row.get("status") == "Blocked" for row in steps):
        return "Blocked"
    if steps and all(row.get("status") == "Done" for row in steps):
        return "Done"
    if any(row.get("status") == "In Progress" for row in steps):
        return "In Progress"
    return "Active"


def upsert_project_plan_for_application(app: dict[str, Any], snapshot: Dashboard | None) -> dict[str, Any] | None:
    app_id = application_identifier(app)
    if not app_id:
        return None
    plan_id = project_plan_id(app_id)
    steps = build_project_steps(app, snapshot)
    status = plan_status_from_steps(steps)
    current = next((row for row in steps if row.get("status") in {"Blocked", "In Progress", "Ready"}), steps[0] if steps else {})
    now = utc_ts()
    title = str(app.get("title") or app.get("leadTitle") or app.get("Lead Title") or app.get("currentStage") or app_id)
    owner = normalized_staff_id(app.get("responsibleStaff") or current.get("assignedStaff"), "AIstaff_Manager")
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO project_plans (
              plan_id, application_id, opportunity_id, title, status, owner_staff,
              current_step_id, summary, source_payload, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(plan_id) DO UPDATE SET
              opportunity_id=excluded.opportunity_id,
              title=excluded.title,
              status=excluded.status,
              owner_staff=excluded.owner_staff,
              current_step_id=excluded.current_step_id,
              summary=excluded.summary,
              source_payload=excluded.source_payload,
              updated_at=excluded.updated_at
            """,
            (
                plan_id,
                app_id,
                str(app.get("opportunityId") or app.get("Opportunity ID") or ""),
                title,
                status,
                owner,
                project_step_id(plan_id, int(current.get("sequence") or 1)),
                f"{status}: {current.get('title') or 'Project plan ready'}",
                json.dumps(app, ensure_ascii=False, default=str),
                now,
                now,
            ),
        )
        for step in steps:
            conn.execute(
                """
                INSERT INTO project_plan_steps (
                  step_id, plan_id, sequence, stage, title, assigned_staff, status,
                  blocker_type, source_task_id, source_thread_id, queue_id, due_at,
                  evidence_link, notes, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(step_id) DO UPDATE SET
                  stage=excluded.stage,
                  title=excluded.title,
                  assigned_staff=excluded.assigned_staff,
                  status=excluded.status,
                  blocker_type=excluded.blocker_type,
                  source_task_id=excluded.source_task_id,
                  source_thread_id=excluded.source_thread_id,
                  queue_id=excluded.queue_id,
                  due_at=excluded.due_at,
                  evidence_link=excluded.evidence_link,
                  notes=excluded.notes,
                  updated_at=excluded.updated_at
                """,
                (
                    project_step_id(plan_id, int(step.get("sequence") or 1)),
                    plan_id,
                    int(step.get("sequence") or 0),
                    step.get("stage") or "",
                    step.get("title") or "",
                    step.get("assignedStaff") or "AIstaff_Manager",
                    step.get("status") or "Queued",
                    step.get("blockerType") or "",
                    step.get("sourceTaskId") or "",
                    step.get("sourceThreadId") or "",
                    step.get("queueId") or "",
                    step.get("dueAt") or "",
                    step.get("evidenceLink") or "",
                    step.get("notes") or "",
                    now,
                    now,
                ),
            )
    return {"planId": plan_id, "applicationId": app_id, "status": status, "steps": steps}


def ensure_project_plans_from_snapshot(snapshot: Dashboard | None) -> dict[str, Any]:
    init_db()
    apps = [row for row in (snapshot or {}).get("applications", []) or [] if isinstance(row, dict)]
    plans = []
    for app in apps:
        plan = upsert_project_plan_for_application(app, snapshot)
        if plan:
            plans.append(plan)
    return {"ok": True, "createdOrUpdated": len(plans), "plans": plans}


def row_to_project_plan(row: sqlite3.Row, steps: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    return {
        "planId": row["plan_id"],
        "applicationId": row["application_id"],
        "opportunityId": row["opportunity_id"],
        "title": row["title"],
        "status": row["status"],
        "ownerStaff": row["owner_staff"],
        "currentStepId": row["current_step_id"],
        "summary": row["summary"],
        "source": parse_json_text(row["source_payload"], {}),
        "createdAt": iso_like(row["created_at"]),
        "updatedAt": iso_like(row["updated_at"]),
        "steps": steps or [],
    }


def row_to_project_step(row: sqlite3.Row) -> dict[str, Any]:
    contract = project_step_contract(int(row["sequence"] or 1), row["blocker_type"] or "")
    output_summary = project_step_output_summary(row["step_id"], row["status"] or "", contract.get("actionLabel") or "")
    try:
        p4_context = p4_resolve_context({"staffProfileId": row["assigned_staff"], "projectContext": {"projectStepId": row["step_id"], "planId": row["plan_id"]}})
    except Exception:
        p4_context = {"readinessState": "blocked", "nextAction": "P4 resolver failed for this local step.", "missingRequirements": []}
    return {
        "stepId": row["step_id"],
        "planId": row["plan_id"],
        "sequence": row["sequence"],
        "stage": row["stage"],
        "title": row["title"],
        "assignedStaff": row["assigned_staff"],
        "status": row["status"],
        "blockerType": row["blocker_type"],
        "action": contract,
        "expectedOutput": contract.get("expectedOutput") or "",
        "outputTemplateId": contract.get("outputTemplateId") or "",
        "safetyGate": contract.get("safetyGate") or "",
        **output_summary,
        "sourceTaskId": row["source_task_id"],
        "sourceThreadId": row["source_thread_id"],
        "queueId": row["queue_id"],
        "dueAt": row["due_at"],
        "evidenceLink": row["evidence_link"],
        "notes": row["notes"],
        "createdAt": iso_like(row["created_at"]),
        "updatedAt": iso_like(row["updated_at"]),
        "p4ReadinessState": p4_context.get("readinessState") or "",
        "p4NextAction": p4_context.get("nextAction") or "",
        "p4MissingRequirements": p4_context.get("missingRequirements") or [],
        "p4ProvisioningSnapshotId": latest_p4_snapshot_for_ref(project_step_id=row["step_id"]),
    }


def list_project_plans(status: str = "active", limit: int = 80, refresh: bool = True) -> dict[str, Any]:
    init_db()
    if refresh:
        snapshot = load_dashboard_snapshot()
        if snapshot:
            ensure_project_plans_from_snapshot(snapshot)
    safe_limit = max(1, min(int(limit or 80), 250))
    where = ""
    params: list[Any] = []
    if normalize_text(status) in {"active", "open"}:
        where = "WHERE status NOT IN ('Done', 'Archived')"
    elif status and normalize_text(status) != "all":
        where = "WHERE status = ?"
        params.append(status)
    with connect() as conn:
        plan_rows = conn.execute(
            f"SELECT * FROM project_plans {where} ORDER BY updated_at DESC LIMIT ?",
            (*params, safe_limit),
        ).fetchall()
        plan_ids = [row["plan_id"] for row in plan_rows]
        step_rows: list[sqlite3.Row] = []
        if plan_ids:
            placeholders = ",".join("?" for _ in plan_ids)
            step_rows = conn.execute(
                f"SELECT * FROM project_plan_steps WHERE plan_id IN ({placeholders}) ORDER BY plan_id, sequence",
                plan_ids,
            ).fetchall()
    by_plan: dict[str, list[dict[str, Any]]] = {}
    for row in step_rows:
        by_plan.setdefault(row["plan_id"], []).append(row_to_project_step(row))
    plans = [row_to_project_plan(row, by_plan.get(row["plan_id"], [])) for row in plan_rows]
    counts = {
        "total": len(plans),
        "blocked": len([row for row in plans if row.get("status") == "Blocked"]),
        "inProgress": len([row for row in plans if row.get("status") == "In Progress"]),
        "active": len([row for row in plans if row.get("status") not in {"Done", "Archived"}]),
    }
    return {"ok": True, "plans": plans, "counts": counts}


def get_project_plan(plan_id: str = "", application_id: str = "") -> dict[str, Any]:
    init_db()
    plan_id = str(plan_id or "").strip()
    application_id = str(application_id or "").strip()
    with connect() as conn:
        if plan_id:
            plan = conn.execute("SELECT * FROM project_plans WHERE plan_id = ?", (plan_id,)).fetchone()
        elif application_id:
            plan = conn.execute("SELECT * FROM project_plans WHERE application_id = ?", (application_id,)).fetchone()
        else:
            return {"ok": False, "error": "Missing planId or applicationId."}
        if not plan:
            return {"ok": False, "error": "Project plan not found."}
        steps = conn.execute("SELECT * FROM project_plan_steps WHERE plan_id = ? ORDER BY sequence", (plan["plan_id"],)).fetchall()
    return {"ok": True, "plan": row_to_project_plan(plan, [row_to_project_step(row) for row in steps])}


def create_project_step_action(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()
    plan_id = str(payload.get("planId") or "").strip()
    step_id = str(payload.get("stepId") or "").strip()
    sequence = int(payload.get("sequence") or 0)
    if not plan_id:
        return {"ok": False, "error": "Missing planId."}
    with connect() as conn:
        plan_row = conn.execute("SELECT * FROM project_plans WHERE plan_id = ?", (plan_id,)).fetchone()
        if not plan_row:
            return {"ok": False, "error": f"Project plan not found: {plan_id}"}
        if step_id:
            step_row = conn.execute("SELECT * FROM project_plan_steps WHERE step_id = ? AND plan_id = ?", (step_id, plan_id)).fetchone()
        elif sequence:
            step_row = conn.execute(
                "SELECT * FROM project_plan_steps WHERE plan_id = ? AND sequence = ?",
                (plan_id, sequence),
            ).fetchone()
        else:
            step_row = conn.execute(
                """
                SELECT * FROM project_plan_steps
                WHERE plan_id = ?
                  AND status IN ('Blocked', 'In Progress', 'Ready', 'Queued')
                ORDER BY CASE status
                  WHEN 'Blocked' THEN 0
                  WHEN 'In Progress' THEN 1
                  WHEN 'Ready' THEN 2
                  ELSE 3
                END, sequence
                LIMIT 1
                """,
                (plan_id,),
            ).fetchone()
        if not step_row:
            return {"ok": False, "error": "Project step not found."}
    plan = row_to_project_plan(plan_row, [])
    step = row_to_project_step(step_row)
    contract = step.get("action") or project_step_contract(step.get("sequence") or 1, step.get("blockerType") or "")
    target_staff = normalized_staff_id(contract.get("assignedStaff") or step.get("assignedStaff"), "AIstaff_Manager")
    task_id = "staff_task_project_step_" + safe_task_part(plan_id) + "_" + f"{int(step.get('sequence') or 0):02d}"
    if local_or_pending_task_exists(task_id):
        thread_id = thread_id_for_task(task_id)
        return {
            "ok": True,
            "alreadyExists": True,
            "taskId": task_id,
            "threadId": thread_id,
            "message": "This project-step task already exists.",
            "plan": get_project_plan(plan_id=plan_id).get("plan"),
        }
    lead_title = str(plan.get("title") or plan.get("applicationId") or plan_id)
    blocker = step.get("blockerType") or ""
    blocker_line = f" Current blocker: {blocker}. {step.get('notes') or ''}".strip() if blocker else ""
    next_action = (
        f"Alex has started project step {step.get('sequence')}: {step.get('title')} for Lead {lead_title} "
        f"({plan.get('applicationId')}).\n\n"
        f"Expected output: {contract.get('expectedOutput') or 'Complete the step output with evidence.'}\n"
        f"Safety gate: {contract.get('safetyGate') or 'Route irreversible actions through AIstaff_Manager.'}\n"
        f"Output template: {contract.get('outputTemplateId') or 'department default'}.\n"
        f"{blocker_line}\n\n"
        "Work under AIstaff_Manager. Do not ask Human_Iman directly unless this task is assigned to Human_Iman. "
        "Do not send supplier emails or submit tenders from this task."
    ).strip()
    task_payload = {
        "taskId": task_id,
        "taskType": contract.get("taskType") or step.get("stage") or "Project Step",
        "taskCategory": contract.get("taskCategory") or TASK_CATEGORIES["application"],
        "taskTemplateId": "template_project_workflow_step",
        "assignedTo": target_staff,
        "createdBy": "AIstaff_Manager",
        "sourceStaff": "AIstaff_Manager",
        "targetStaff": target_staff,
        "relatedApplicationId": plan.get("applicationId") or "",
        "relatedOpportunityId": plan.get("opportunityId") or "",
        "priority": "High" if step.get("status") in {"Blocked", "In Progress", "Ready"} else "Normal",
        "runAfter": iso_like(),
        "dueAt": iso_like(utc_ts() + (2 if target_staff == "Human_Iman" else 4) * 60 * 60),
        "nextAction": next_action,
        "completionCriteria": contract.get("completionCriteria") or "Complete or block this project step with evidence.",
        "successStatus": contract.get("successStatus") or f"{step.get('stage')} Done",
        "failureStatus": contract.get("failureStatus") or f"Blocked - {step.get('stage')}",
        "status": "Queued" if target_staff == "Human_Iman" else "Waiting for Codex Worker",
        "escalationLevel": "Human Approval" if target_staff == "Human_Iman" else "Manager",
        "evidenceLink": step.get("sourceThreadId") or step.get("queueId") or plan_id,
        "resultNotes": f"Created from project workflow step {step.get('stepId')} by AIstaff_Manager.",
        "projectPlanId": plan_id,
        "projectStepId": step.get("stepId") or "",
        "workflowStage": step.get("stage") or "",
        "outputTemplateId": contract.get("outputTemplateId") or "",
        "expectedOutput": contract.get("expectedOutput") or "",
        "safetyGate": contract.get("safetyGate") or "",
    }
    saved = queue_action("appendAiStaffTask", task_payload, method="POST", sync_online=False)
    thread_id = thread_id_for_task(task_id)
    with connect() as conn:
        conn.execute(
            """
            UPDATE project_plan_steps
            SET status = CASE WHEN status = 'Queued' THEN 'Ready' ELSE status END,
                source_task_id = ?,
                source_thread_id = ?,
                notes = CASE
                  WHEN notes = '' THEN ?
                  ELSE notes || ' | ' || ?
                END,
                updated_at = ?
            WHERE step_id = ?
            """,
            (
                task_id,
                thread_id,
                "Action task created by Alex.",
                "Action task created by Alex.",
                utc_ts(),
                step.get("stepId") or "",
            ),
        )
    refreshed = get_project_plan(plan_id=plan_id).get("plan")
    detail = get_thread(thread_id)
    output_result = None
    if payload.get("createOutputDraft"):
        output_result = save_project_step_output(
            {
                "stepId": step.get("stepId") or "",
                "planId": plan_id,
                "status": "Draft",
                "summary": "",
                "createdBy": target_staff,
            }
        )
    return {
        "ok": bool(saved.get("ok")),
        "saved": saved,
        "taskId": task_id,
        "threadId": thread_id,
        "assignedTo": target_staff,
        "step": step,
        "plan": refreshed,
        "thread": detail.get("thread"),
        "messages": detail.get("messages"),
        "output": output_result.get("output") if isinstance(output_result, dict) else None,
        "message": f"Created {contract.get('taskType') or 'project step'} task for {staff_label(target_staff)}.",
    }


def get_project_step_output(step_id: str) -> dict[str, Any]:
    init_db()
    step_id = str(step_id or "").strip()
    if not step_id:
        return {"ok": False, "error": "Missing stepId."}
    with connect() as conn:
        step_row = conn.execute("SELECT * FROM project_plan_steps WHERE step_id = ?", (step_id,)).fetchone()
        if not step_row:
            return {"ok": False, "error": f"Project step not found: {step_id}"}
        plan_row = conn.execute("SELECT * FROM project_plans WHERE plan_id = ?", (step_row["plan_id"],)).fetchone()
    step = row_to_project_step(step_row)
    plan = row_to_project_plan(plan_row, []) if plan_row else {}
    output = latest_project_step_output(step_id)
    if not output:
        output = {
            "outputId": project_step_output_id(step_id),
            "stepId": step_id,
            "planId": step.get("planId") or "",
            "applicationId": plan.get("applicationId") or "",
            "outputTemplateId": step.get("outputTemplateId") or "",
            "status": "Not started",
            "title": step.get("title") or "",
            "summary": "",
            "content": default_project_output_content(step.get("outputTemplateId") or "", step.get("title") or ""),
            "blockerType": "",
            "evidenceLink": "",
            "reviewedBy": "",
            "createdBy": (step.get("action") or {}).get("assignedStaff") or step.get("assignedStaff") or "AIstaff_Manager",
            "createdAt": "",
            "updatedAt": "",
            "sentToAlexAt": "",
        }
    return {"ok": True, "output": output, "step": step, "plan": plan}


def queue_project_output_alex_review(output: dict[str, Any], step: dict[str, Any], plan: dict[str, Any]) -> dict[str, Any]:
    task_id = "staff_task_project_output_review_" + safe_task_part(step.get("stepId") or output.get("stepId") or "")
    thread_id = thread_id_for_task(task_id)
    summary = output.get("summary") or "Project step output is ready for Alex review."
    message = (
        f"Review project step output for Lead {plan.get('applicationId') or ''}.\n\n"
        f"Step: {step.get('title') or step.get('stage')}\n"
        f"Output status: {output.get('status')}\n"
        f"Summary: {summary}\n"
        f"Evidence: {output.get('evidenceLink') or 'not attached'}\n\n"
        "Decide whether to approve the output, route the next staff step, request missing input from Iman, or keep it blocked. "
        "Do not send supplier email or submit tender from this review task."
    )
    if local_or_pending_task_exists(task_id):
        return add_thread_message(
            {
                "threadId": thread_id,
                "senderType": "AI Staff",
                "senderId": output.get("createdBy") or step.get("assignedStaff") or "AIstaff_Manager",
                "senderLabel": staff_label(output.get("createdBy") or step.get("assignedStaff")),
                "body": message,
                "evidenceLink": output.get("evidenceLink") or "",
                "metadata": {"project_step_output": output.get("outputId"), "alex_review": True},
            }
        )
    return queue_action(
        "appendAiStaffTask",
        {
            "taskId": task_id,
            "taskType": "Project Output Review",
            "taskCategory": TASK_CATEGORIES["manager"],
            "taskTemplateId": "template_project_output_alex_review",
            "assignedTo": "AIstaff_Manager",
            "createdBy": output.get("createdBy") or step.get("assignedStaff") or "AIstaff_Manager",
            "sourceStaff": output.get("createdBy") or step.get("assignedStaff") or "AIstaff_Manager",
            "targetStaff": "AIstaff_Manager",
            "relatedApplicationId": plan.get("applicationId") or "",
            "relatedOpportunityId": plan.get("opportunityId") or "",
            "priority": "High",
            "runAfter": iso_like(),
            "dueAt": iso_like(utc_ts() + 2 * 60 * 60),
            "nextAction": message,
            "completionCriteria": "Alex approves, blocks, or routes the next supervised project step.",
            "successStatus": "Project Output Reviewed",
            "failureStatus": "Blocked - Project Output Review",
            "status": "Queued",
            "evidenceLink": output.get("evidenceLink") or output.get("outputId") or "",
            "resultNotes": "Project step output sent to Alex for supervised review.",
            "projectPlanId": plan.get("planId") or "",
            "projectStepId": step.get("stepId") or "",
            "outputTemplateId": output.get("outputTemplateId") or "",
        },
        method="POST",
        sync_online=False,
    )


def save_project_step_output(payload: dict[str, Any]) -> dict[str, Any]:
    init_db()
    step_id = str(payload.get("stepId") or "").strip()
    if not step_id:
        return {"ok": False, "error": "Missing stepId."}
    with connect() as conn:
        step_row = conn.execute("SELECT * FROM project_plan_steps WHERE step_id = ?", (step_id,)).fetchone()
        if not step_row:
            return {"ok": False, "error": f"Project step not found: {step_id}"}
        plan_row = conn.execute("SELECT * FROM project_plans WHERE plan_id = ?", (step_row["plan_id"],)).fetchone()
    step = row_to_project_step(step_row)
    plan = row_to_project_plan(plan_row, []) if plan_row else {}
    action_raw = str(payload.get("action") or "").strip().lower()
    action = action_raw.replace("-", "_").replace(" ", "_")
    existing = latest_project_step_output(step_id)
    output_id = str(payload.get("outputId") or (existing or {}).get("outputId") or project_step_output_id(step_id))
    status = str(payload.get("status") or (existing or {}).get("status") or "Draft").strip() or "Draft"
    if action == "mark_blocked":
        status = "Blocked"
    elif action == "send_to_alex":
        status = "Ready for Alex Review"
    elif action == "approve":
        status = "Approved"
    summary = str(payload.get("summary") if payload.get("summary") is not None else (existing or {}).get("summary") or "").strip()
    content = payload.get("content") if isinstance(payload.get("content"), dict) else (existing or {}).get("content")
    if not isinstance(content, dict):
        content = default_project_output_content(step.get("outputTemplateId") or "", step.get("title") or "")
    blocker_type = str(payload.get("blockerType") or (existing or {}).get("blockerType") or "").strip()
    if action == "mark_blocked" and not blocker_type:
        blocker_type = "Output blocked"
    evidence_link = str(payload.get("evidenceLink") or (existing or {}).get("evidenceLink") or "").strip()
    created_by = normalized_staff_id(payload.get("createdBy") or (existing or {}).get("createdBy") or (step.get("action") or {}).get("assignedStaff") or step.get("assignedStaff"), "AIstaff_Manager")
    now = utc_ts()
    created_at = now
    if existing and existing.get("createdAt"):
        try:
            created_at = time.mktime(time.strptime(existing["createdAt"][:19], "%Y-%m-%dT%H:%M:%S"))
        except Exception:
            created_at = now
    sent_to_alex_at = now if action == "send_to_alex" else None
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO project_step_outputs (
              output_id, step_id, plan_id, application_id, output_template_id,
              status, title, summary, content_json, blocker_type, evidence_link,
              reviewed_by, created_by, created_at, updated_at, sent_to_alex_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(output_id) DO UPDATE SET
              status=excluded.status,
              title=excluded.title,
              summary=excluded.summary,
              content_json=excluded.content_json,
              blocker_type=excluded.blocker_type,
              evidence_link=excluded.evidence_link,
              reviewed_by=excluded.reviewed_by,
              updated_at=excluded.updated_at,
              sent_to_alex_at=COALESCE(excluded.sent_to_alex_at, project_step_outputs.sent_to_alex_at)
            """,
            (
                output_id,
                step_id,
                step.get("planId") or plan.get("planId") or payload.get("planId") or "",
                plan.get("applicationId") or payload.get("applicationId") or "",
                step.get("outputTemplateId") or payload.get("outputTemplateId") or "",
                status,
                str(payload.get("title") or (existing or {}).get("title") or step.get("title") or ""),
                summary,
                json.dumps(content, ensure_ascii=False, default=str),
                blocker_type,
                evidence_link,
                str(payload.get("reviewedBy") or (existing or {}).get("reviewedBy") or ""),
                created_by,
                created_at,
                now,
                sent_to_alex_at,
            ),
        )
    output = latest_project_step_output(step_id) or {}
    alex_review = None
    if action == "send_to_alex":
        alex_review = queue_project_output_alex_review(output, step, plan)
    if action == "mark_blocked":
        with connect() as conn:
            conn.execute(
                "UPDATE project_plan_steps SET status = 'Blocked', blocker_type = ?, notes = ?, updated_at = ? WHERE step_id = ?",
                (blocker_type or "Output blocked", summary or "Project step output marked blocked.", now, step_id),
            )
    return {
        "ok": True,
        "output": output,
        "step": get_project_plan(plan_id=step.get("planId") or "").get("plan", {}).get("steps", []),
        "alexReview": alex_review,
        "message": "Output sent to Alex for review." if action == "send_to_alex" else "Project step output saved.",
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


def task_waits_for_external_worker(row: dict[str, Any]) -> bool:
    text = normalize_text(
        " ".join(
            str(row.get(key) or "")
            for key in ["status", "resultNotes", "nextAction", "completionCriteria", "lastError"]
        )
    )
    return any(
        phrase in text
        for phrase in [
            "codex work queued",
            "waiting for codex worker",
        ]
    )


def task_is_locally_runnable(row: dict[str, Any]) -> bool:
    if task_is_terminal(row):
        return False
    status = normalize_text(row.get("status"))
    if (
        status.startswith("blocked")
        or status in {
            "needs approval",
            "needs human review",
            "needs human review - duplicate recipient",
            "needs human review - supervisor reply",
            "waiting for human review",
            "waiting for iman",
            "codex work queued",
            "waiting for codex worker",
        }
    ):
        return False
    return not task_waits_for_external_worker(row)


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


def task_thread_reason(row: dict[str, Any]) -> str:
    if not is_thread_task(row):
        return ""
    source_kind = normalize_text(row.get("sourceKind") or row.get("Source Kind"))
    category = task_category_for_signal(row, source_kind)
    source_staff, target_staff, routing_note = routed_thread_parties(row)
    text = normalize_text(
        compact_join(
            [
                row.get("taskType"),
                row.get("Task Type"),
                row.get("taskCategory"),
                row.get("Task Category"),
                row.get("status"),
                row.get("sendStatus"),
                row.get("approvalStatus"),
                row.get("failureStatus"),
                row.get("lastError"),
                row.get("resultNotes"),
                row.get("nextAction"),
                row.get("completionCriteria"),
                row.get("subject"),
                row.get("reason"),
                row.get("escalationLevel"),
                source_kind,
                routing_note,
            ]
        )
    )
    if is_human_responsible(source_staff) or is_human_responsible(target_staff) or category == TASK_CATEGORIES["human"]:
        return "human_message"
    if any(term in text for term in ["approval", "approve", "not approved", "needs review", "human review", "duplicate recipient"]):
        return "approval"
    if any(term in text for term in ["missing", "upload", "incomplete", "required file", "scope pdf", "appendix"]):
        return "missing_input"
    if any(term in text for term in ["blocked", "failed", "error", "unsafe", "cannot", "unavailable", "style qa", "template style"]):
        return "blocker"
    if any(term in text for term in ["escalat", "human decision", "manager decision"]):
        return "escalation"
    if any(term in text for term in ["codex worker", "waiting for codex", "requires codex", "worker handoff"]):
        return "worker_handoff"
    if source_kind == "system audit" or category in {TASK_CATEGORIES["audit"], TASK_CATEGORIES["technical"]}:
        return "system_audit"
    if any(term in text for term in ["review", "qa", "check", "verify", "fit", "eligib", "decision"]):
        return "review"
    if category in {TASK_CATEGORIES["manager"], TASK_CATEGORIES["email"]}:
        return "review"
    return ""


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
    if "duplicate recipient" in text or "needs approval" in text or "needs human review" in text or "supervisor reply" in text or "supplier reply" in text:
        return TASK_CATEGORIES["human"]
    if "email" in text or "queue" in text or "attachment" in text or "send" in text or "gmail" in text or "quote" in text or "quotation" in text:
        return TASK_CATEGORIES["email"]
    if "technical" in text or "bug" in text or "webhook" in text or "lock" in text or "traceback" in text or "script error" in text:
        return TASK_CATEGORIES["technical"]
    if "audit" in text or "follow-up" in text or "followup" in text or "missing follow" in text or "stale" in text:
        return TASK_CATEGORIES["audit"]
    if "research" in text or "opportunit" in text or "professor" in text or "supplier" in text or "vendor" in text or "partner" in text:
        return TASK_CATEGORIES["research"]
    if "package" in text or "application" in text or "proposal" in text or "cv" in text or "sop" in text or "lead" in text or "tender" in text or "rfq" in text or "rfp" in text:
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
        bits.append(f"lead `{app_id}`")
    if opp_id:
        bits.append(f"tender case `{opp_id}`")
    if queue_id:
        bits.append(f"outreach queue `{queue_id}`")
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
    if "duplicate recipient" in text or "repeated professor" in text or "repeated supervisor" in text or "repeated supplier" in text:
        return "The system detected a repeated or risky supplier/contact recipient, so it stopped before any second outreach."
    if "document style qa" in text or "not approved for external send" in text or "minimal renderer" in text:
        return "The package documents are present, but at least one file is marked as not approved for external sending because it does not match the agreed template/style quality."
    if "attachment" in text and ("failed" in text or "blocked" in text or "incomplete" in text):
        return "The supplier outreach or tender package cannot move yet because attachment access, package completeness, or quote evidence has not passed."
    if "codex" in text or "outside apps script" in text or "waiting for codex worker" in text:
        return "The workflow reached a judgement-heavy step that the local AI department should review before writing or changing the CRM."
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
    if "duplicate recipient" in text or "repeated professor" in text or "repeated supervisor" in text or "repeated supplier" in text:
        return "Tell me whether to prepare a careful follow-up for your review, wait longer, close the outreach path, or use a different supplier/contact."
    if "document style qa" in text or "not approved for external send" in text or "minimal renderer" in text:
        return "Confirm whether I should regenerate the package from the approved Google Docs/template path, or close this package as not ready."
    if "attachment" in text and ("failed" in text or "blocked" in text or "incomplete" in text):
        return "Tell me whether to fix the package/attachments, prepare missing tender documents, or leave the outreach blocked."
    if "codex" in text or "outside apps script" in text or "waiting for codex worker" in text:
        return "Tell me whether Codex should do the tender judgement/writing/research work, whether another staff member should take it, or whether the task should be closed."
    if "follow" in text or "reply" in text or "waiting" in text:
        return "Tell me whether to follow up now, wait until a later date, close the lead path, or review the reply trail first."
    if "approval" in text or "review" in text:
        return "Tell me to approve and continue, reject/close, reassign, or explain what you want changed."
    return "Tell me the decision you want, in normal language. I will translate it into the next staff task."


def human_task_options(row: dict[str, Any]) -> list[str]:
    text = normalize_text(compact_join([row.get("taskType"), row.get("status"), row.get("resultNotes"), row.get("nextAction")]))
    if "duplicate recipient" in text or "repeated professor" in text or "repeated supplier" in text:
        return ["Prepare a reviewed follow-up", "Wait longer", "Close this outreach", "Use another supplier/contact"]
    if "style" in text or "template" in text or "minimal renderer" in text:
        return ["Regenerate with approved template", "Use existing Google Doc links only", "Close as not ready"]
    if "codex" in text or "outside apps script" in text:
        return ["Let Codex handle it", "Reassign to another AI staff", "Ask me a more specific question", "Close the task"]
    if "follow" in text:
        return ["Follow up now", "Wait and remind later", "Review reply trail", "Close this lead path"]
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
        "threadReason": source.get("threadReason") or "",
        "threadReasonLabel": source.get("threadReasonLabel") or THREAD_REASON_LABELS.get(str(source.get("threadReason") or ""), ""),
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
    conn.execute(
        """
        UPDATE staff_wakeups
        SET status = 'Completed',
            completed_at = COALESCE(completed_at, ?),
            result = CASE
              WHEN result = '' THEN 'Auto-completed: linked Codex work item already exists.'
              ELSE result
            END
        WHERE status IN ('Queued', 'Presented')
          AND staff_id != 'AIstaff_Manager'
          AND (
            EXISTS (
              SELECT 1
              FROM codex_work_items c
              WHERE c.status IN ('Queued', 'Ready', 'Copied', 'In Progress')
                AND c.source_task_id != ''
                AND c.source_task_id = staff_wakeups.task_id
            )
            OR EXISTS (
              SELECT 1
              FROM codex_work_items c
              WHERE c.status IN ('Queued', 'Ready', 'Copied', 'In Progress')
                AND c.thread_id != ''
                AND c.thread_id = staff_wakeups.thread_id
            )
          )
        """,
        (now,),
    )
    snapshot_row = conn.execute("SELECT payload FROM dashboard_snapshot WHERE id = 1").fetchone()
    if not snapshot_row:
        return
    try:
        snapshot = json.loads(snapshot_row["payload"] or "{}")
    except Exception:
        return
    tasks_by_id = {
        str(row.get("taskId") or row.get("Task ID") or ""): row
        for row in snapshot.get("tasks", []) or []
        if isinstance(row, dict) and (row.get("taskId") or row.get("Task ID"))
    }
    for wakeup in conn.execute(
        "SELECT wakeup_id, task_id FROM staff_wakeups WHERE status IN ('Queued', 'Presented')"
    ).fetchall():
        task = tasks_by_id.get(str(wakeup["task_id"] or ""))
        if task and not task_is_locally_runnable(task):
            conn.execute(
                """
                UPDATE staff_wakeups
                SET status = 'Completed',
                    completed_at = COALESCE(completed_at, ?),
                    result = CASE
                      WHEN result = '' THEN 'Auto-completed: linked task is no longer locally runnable.'
                      ELSE result
                    END
                WHERE wakeup_id = ?
                """,
                (now, wakeup["wakeup_id"]),
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


def complete_staff_wakeup(wakeup_id: str, result: str = "") -> dict[str, Any]:
    wakeup_id = str(wakeup_id or "").strip()
    if not wakeup_id:
        return {"ok": False, "error": "Missing wakeupId."}
    init_db()
    with connect() as conn:
        row = conn.execute("SELECT * FROM staff_wakeups WHERE wakeup_id = ?", (wakeup_id,)).fetchone()
        if not row:
            return {"ok": False, "error": f"Staff wake-up not found: {wakeup_id}"}
        conn.execute(
            """
            UPDATE staff_wakeups
            SET status = 'Completed', completed_at = ?, result = ?
            WHERE wakeup_id = ?
            """,
            (utc_ts(), result or "Handled by local task runner.", wakeup_id),
        )
        updated = conn.execute("SELECT * FROM staff_wakeups WHERE wakeup_id = ?", (wakeup_id,)).fetchone()
    return {"ok": True, "wakeup": row_to_wakeup(updated)}


def parse_isoish_to_ts(value: Any) -> float:
    text = str(value or "").strip()
    if not text:
        return 0.0
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            return time.mktime(time.strptime(text[:26].replace("Z", ""), fmt.replace("Z", "")))
        except Exception:
            pass
    try:
        from datetime import datetime

        normalized = text.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized).timestamp()
    except Exception:
        return 0.0


def next_due_local_task(staff: str = "") -> dict[str, Any] | None:
    snapshot = load_dashboard_snapshot() or {}
    now = utc_ts()
    staff_filter = normalized_staff_id(staff, "") if staff else ""
    candidates: list[tuple[float, dict[str, Any]]] = []
    for row in snapshot.get("tasks", []) or []:
        if not isinstance(row, dict) or task_is_terminal(row):
            continue
        assigned = normalized_staff_id(row.get("assignedTo") or row.get("Assigned To"), "")
        if staff_filter and assigned != staff_filter:
            continue
        if is_human_responsible(assigned):
            continue
        if not task_is_locally_runnable(row):
            continue
        run_after = parse_isoish_to_ts(row.get("runAfter") or row.get("Run After") or row.get("createdAt") or row.get("Created At"))
        if run_after and run_after > now:
            continue
        due = parse_isoish_to_ts(row.get("dueAt") or row.get("Due At")) or run_after or now
        candidates.append((due, row))
    if not candidates:
        return None
    candidates.sort(key=lambda item: item[0])
    return dict(candidates[0][1])


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
    thread_reason = task_thread_reason(row)
    if not thread_reason:
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
        "threadReason": thread_reason,
        "threadReasonLabel": THREAD_REASON_LABELS.get(thread_reason, thread_reason),
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
            "taskCategory": TASK_CATEGORIES["manager"] if staff_id == "AIstaff_Manager" else TASK_CATEGORIES["application"],
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
    opp_text = ", ".join(opportunity_ids) if opportunity_ids else "the Leads or tender cases already discussed in this thread"
    return queue_action(
        "appendAiStaffTask",
        {
            "taskId": task_id,
            "taskType": "Fit / Supplier Match",
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
                f"Continue Iman's full-process instruction for {opp_text}. Verify the Lead/tender evidence, "
                "score GCC lab fit, reject hard-ineligible or expired cases, find supplier/partner route options, and route viable cases "
                "to Tender Package Maker. Do not contact suppliers or submit portals from this task."
            ),
            "completionCriteria": (
                "A prioritized shortlist is recorded, viable Lead tasks are created for the next staff, and rejected or blocked cases have clear reasons."
            ),
            "successStatus": "Fit Shortlist Ready",
            "failureStatus": "Blocked - Fit Review Issue",
            "status": "Waiting for Codex Worker",
            "escalationLevel": "Normal",
            "evidenceLink": "",
            "resultNotes": "Created by Manager from Iman's instruction to run the tender Lead process through to submission-readiness.",
            "threadId": thread_id,
            "sourceTaskId": row_value(thread, "task_id") or "",
        },
        method="POST",
        sync_online=False,
    )


def inferred_task_for_staff(route_staff: str, fallback_type: str = "") -> tuple[str, str]:
    route_staff = normalized_staff_id(route_staff, "AIstaff_Manager")
    if route_staff == "AIstaff_OpportunityHunter":
        return fallback_type or "Lead Review", TASK_CATEGORIES["application"]
    if route_staff == "AIstaff_FitAnalyst":
        return fallback_type or "Fit Review", TASK_CATEGORIES["research"]
    if route_staff == "AIstaff_ProfessorResearchAnalyst":
        return fallback_type or "Supplier Discovery", TASK_CATEGORIES["research"]
    if route_staff == "AIstaff_ApplicationPackMaker":
        return fallback_type or "Tender Package", TASK_CATEGORIES["application"]
    if route_staff == "AIstaff_ApplicationPackSender":
        return fallback_type or "Quotation Outreach", TASK_CATEGORIES["email"]
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


def handoff_blocker_route(source_staff: str, source: dict[str, Any], body: str) -> tuple[str, str, str] | None:
    text = normalize_text(
        compact_join(
            [
                body,
                source.get("nextAction") or "",
                source.get("resultNotes") or "",
                source.get("lastError") or "",
                source.get("failureStatus") or "",
                source.get("status") or "",
            ]
        )
    )
    blocker_terms = [
        "blocked",
        "failed",
        "missing",
        "incomplete",
        "not approved",
        "attachment verification",
        "access failed",
        "duplicate recipient",
        "repeated professor",
        "needs approval",
        "needs human review",
        "style not approved",
        "template style",
        "cancelled",
        "no further action",
    ]
    if not any(term in text for term in blocker_terms):
        return None
    if source_staff == "AIstaff_ApplicationPackSender" and any(
        term in text for term in ["package incomplete", "missing file", "attachment", "document", "style", "template"]
    ):
        return "AIstaff_ApplicationPackMaker", "Package QA", TASK_CATEGORIES["application"]
    if source_staff == "AIstaff_ApplicationPackMaker" and any(term in text for term in ["attachment", "folder", "drive", "package file"]):
        return "AIstaff_CRMController", "CRM Health", TASK_CATEGORIES["audit"]
    if source_staff == "AIstaff_OpportunityHunter" and any(term in text for term in ["eligibility", "deadline", "funding", "duplicate"]):
        return "AIstaff_FitAnalyst", "Fit Review", TASK_CATEGORIES["research"]
    if source_staff == "AIstaff_FitAnalyst" and any(term in text for term in ["professor", "supervisor", "evidence"]):
        return "AIstaff_ProfessorResearchAnalyst", "Professor Research", TASK_CATEGORIES["research"]
    if any(term in text for term in ["sync", "webhook", "token", "bridge", "crm", "apps script", "database"]):
        return "AIstaff_CRMController", "CRM Health", TASK_CATEGORIES["audit"]
    return "AIstaff_Manager", "Manager Guidance", TASK_CATEGORIES["manager"]


def next_staff_after_completed_staff(source_staff: str, source: dict[str, Any] | None = None, body: str = "") -> tuple[str, str, str]:
    source_staff = normalized_staff_id(source_staff, "AIstaff_Manager")
    source = source or {}
    blocker_route = handoff_blocker_route(source_staff, source, body)
    if blocker_route:
        return blocker_route
    if source_staff == "AIstaff_OpportunityHunter":
        return "AIstaff_FitAnalyst", "Fit Review", TASK_CATEGORIES["research"]
    if source_staff == "AIstaff_FitAnalyst":
        return "AIstaff_ProfessorResearchAnalyst", "Professor Research", TASK_CATEGORIES["research"]
    if source_staff == "AIstaff_ProfessorResearchAnalyst":
        return "AIstaff_ApplicationPackMaker", "Package", TASK_CATEGORIES["application"]
    if source_staff == "AIstaff_ApplicationPackMaker":
        return "AIstaff_ApplicationPackSender", "Outreach", TASK_CATEGORIES["email"]
    if source_staff == "AIstaff_ApplicationPackSender":
        return "AIstaff_FollowUpController", "Follow-up", TASK_CATEGORIES["audit"]
    if source_staff == "AIstaff_FollowUpController":
        return "AIstaff_CRMController", "CRM Health", TASK_CATEGORIES["audit"]
    if source_staff == "AIstaff_CRMController":
        return "AIstaff_Manager", "Manager Guidance", TASK_CATEGORIES["manager"]
    category = source.get("taskCategory") or source.get("Task Category") or TASK_CATEGORIES["manager"]
    return "AIstaff_Manager", "Manager Guidance", str(category)


def next_staff_for_manager_self_task(source: dict[str, Any], body: str) -> tuple[str, str, str]:
    text = normalize_text(
        compact_join(
            [
                body,
                source.get("taskType") or "",
                source.get("taskCategory") or "",
                source.get("nextAction") or "",
                source.get("completionCriteria") or "",
                source.get("resultNotes") or "",
                source.get("lastError") or "",
            ]
        )
    )
    if (
        "review task needing approval and either approve, reassign, or close" in text
        or "review follow up: this task requires codex/human work outside apps script: review task needing approval" in text
    ):
        return "AIstaff_Manager", "Manager Guidance", TASK_CATEGORIES["manager"]
    route_text = text
    for safety_phrase in [
        "do not send external email",
        "do not send",
        "no email is sent",
        "no email was sent",
        "will not send any email",
        "replying does not send",
        "never send email",
    ]:
        route_text = route_text.replace(safety_phrase, "")
    if any(term in text for term in ["crm", "sync", "audit", "health", "webhook", "apps script", "token", "database", "technical"]):
        return "AIstaff_CRMController", "CRM Health", TASK_CATEGORIES["audit"]
    if any(term in route_text for term in ["follow", "reply", "waiting", "response"]):
        return "AIstaff_FollowUpController", "Follow-up", TASK_CATEGORIES["audit"]
    if any(term in route_text for term in ["email queue", "blocked email", "queue row", "attachment", "recipient", "outreach", "gmail", "send queue", "process queue"]):
        return "AIstaff_ApplicationPackSender", "Outreach", TASK_CATEGORIES["email"]
    if any(term in route_text for term in ["professor", "supervisor", "publication", "research fit"]):
        return "AIstaff_ProfessorResearchAnalyst", "Professor Research", TASK_CATEGORIES["research"]
    if any(term in route_text for term in ["fit", "eligibility", "shortlist", "score", "priorit"]):
        return "AIstaff_FitAnalyst", "Fit Review", TASK_CATEGORIES["research"]
    if any(term in route_text for term in ["package", "proposal", "cv", "resume", "sop", "document", "template", "style"]):
        return "AIstaff_ApplicationPackMaker", "Package", TASK_CATEGORIES["application"]
    if any(term in route_text for term in ["find", "opportunit", "phd", "msc", "research work"]):
        return "AIstaff_OpportunityHunter", "Research", TASK_CATEGORIES["research"]
    return "AIstaff_Manager", "Manager Guidance", TASK_CATEGORIES["manager"]


def manager_staff_handoff_decision(thread: sqlite3.Row | dict[str, Any], staff_body: str, sender_staff: str = "") -> dict[str, Any]:
    source = source_payload_for_thread(thread)
    source_staff = normalized_staff_id(sender_staff, "") or normalized_staff_id(source.get("sourceStaff") or row_value(thread, "source_staff"), "AIstaff_Manager")
    route_staff, task_type, task_category = next_staff_after_completed_staff(source_staff, source, staff_body)
    thread_id = str(row_value(thread, "thread_id") or row_value(thread, "threadId") or "")
    source_task_id = source.get("sourceTaskId") or source.get("taskId") or row_value(thread, "task_id") or ""
    next_action = source.get("nextAction") or staff_body or row_value(thread, "last_message_preview") or ""
    if route_staff == "AIstaff_Manager":
        reply = (
            f"Thanks, {staff_label(source_staff)}. I reviewed the completed work and there is no automatic next specialist stage. "
            "I will keep this as a manager-owned closure/blocker decision."
        )
        routed_action = ""
    else:
        reply = (
            f"Thanks, {staff_label(source_staff)}. I reviewed the completed work and routed the next stage to "
            f"{staff_label(route_staff)}. Iman is not being asked unless a real decision becomes necessary."
        )
        routed_action = (
            f"Continue from Manager handoff {thread_id}. Source task: {source_task_id}. "
            f"Completed staff result: {thread_preview(staff_body or next_action, 900)}. "
            "Use the related application/opportunity evidence, update the task thread with the result, and report back to AIstaff_Manager when complete. "
            "Do not send external email or submit a portal from this task."
        )
    return {
        "reply": reply,
        "intent": "staff_completion_handoff",
        "createRoutedTask": route_staff not in {"", "AIstaff_Manager", "Human_Iman"},
        "createFitReviewTask": False,
        "routeStaff": route_staff,
        "taskType": task_type,
        "taskCategory": task_category,
        "routedNextAction": routed_action,
        "routedTaskReason": f"Alex routed completed work reported by {staff_label(source_staff)}.",
        "confidence": 1,
        "source": "staff_handoff_rules",
    }


def manager_self_task_decision(thread: sqlite3.Row | dict[str, Any], body: str) -> dict[str, Any]:
    source = source_payload_for_thread(thread)
    route_staff, task_type, task_category = next_staff_for_manager_self_task(source, body)
    if route_staff == "AIstaff_Manager":
        reply = (
            "I reviewed this internal manager item. It does not have enough concrete routing information, so I will keep it manager-owned "
            "until a clearer next action or human decision is available."
        )
        routed_action = ""
    else:
        reply = (
            f"I reviewed this internal manager item and routed it to {staff_label(route_staff)}. "
            "Iman is not being asked unless the next staff finds a real decision point."
        )
        routed_action = (
            f"Handle Alex's internal review item from thread {row_value(thread, 'thread_id')}. "
            f"Original request: {thread_preview(body or source.get('nextAction') or '', 900)}. "
            "Complete or block with evidence, then report back to AIstaff_Manager."
        )
    return {
        "reply": reply,
        "intent": "manager_internal_routing",
        "createRoutedTask": route_staff not in {"", "AIstaff_Manager", "Human_Iman"},
        "createFitReviewTask": False,
        "routeStaff": route_staff,
        "taskType": task_type,
        "taskCategory": task_category,
        "routedNextAction": routed_action,
        "routedTaskReason": "Alex routed an internal manager-owned review/audit item.",
        "confidence": 1,
        "source": "manager_self_rules",
    }


def append_manager_internal_reply(
    conn: sqlite3.Connection,
    thread: sqlite3.Row | dict[str, Any],
    body: str,
    unread_for: str = "None",
) -> dict[str, Any]:
    now = utc_ts()
    message_id = "msg_" + str(uuid.uuid4())
    thread_id = row_value(thread, "thread_id")
    task_id = row_value(thread, "task_id")
    conn.execute(
        """
        INSERT INTO thread_messages (
          message_id, thread_id, task_id, sender_type, sender_id, sender_label,
          body, language, created_at, read_by_human, read_by_staff, evidence_link, metadata
        )
        VALUES (?, ?, ?, 'AI Staff', 'AIstaff_Manager', ?, ?, 'natural', ?, 1, 1, '', ?)
        """,
        (
            message_id,
            thread_id,
            task_id,
            staff_label("AIstaff_Manager"),
            body,
            now,
            json.dumps({"auto_manager_reply": True, "internal_staff_handoff": True}, default=str),
        ),
    )
    conn.execute(
        """
        UPDATE task_threads
        SET last_message_at = ?,
            last_message_preview = ?,
            unread_for = ?
        WHERE thread_id = ?
        """,
        (now, thread_preview(body), unread_for, thread_id),
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
        (now, "Manager handled specialist handoff.", thread_id),
    )
    return {
        "messageId": message_id,
        "threadId": thread_id,
        "taskId": task_id,
        "senderType": "AI Staff",
        "senderId": "AIstaff_Manager",
        "senderLabel": staff_label("AIstaff_Manager"),
        "body": body,
        "language": "natural",
        "createdAt": iso_like(now),
        "readByHuman": True,
        "readByStaff": True,
        "evidenceLink": "",
    }


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
        "You are Alex, AIstaff_Manager for Iman's GCC lab AI department system for tender Leads. Interpret Iman's latest thread reply intelligently and safely.\n"
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
        "- Do not contact suppliers, send email, submit portals, or claim that external action happened.\n"
        "- Non-manager staff communicate through you; only you talk to Human_Iman.\n"
        "- Do not close human-facing threads; Iman closes them.\n"
        "- Treat 'now' as a time word, never as 'no'.\n"
        "- Only treat a message as cancel/stop if it is clearly a stop instruction.\n"
        "- If Iman says he did not mean to cancel, correct course and continue.\n"
        "- New Lead/tender/RFQ/RFP review -> routeStaff='AIstaff_OpportunityHunter', taskType='Lead Review', taskCategory='Tender Work'.\n"
        "- Fit/prioritization/eligibility/bid-no-bid/supplier match -> routeStaff='AIstaff_FitAnalyst'.\n"
        "- New supplier/vendor/partner/company mapping -> routeStaff='AIstaff_ProfessorResearchAnalyst', taskType='Supplier Discovery'.\n"
        "- Tender documents/compliance matrix/forms/submission package -> routeStaff='AIstaff_ApplicationPackMaker', taskType='Tender Package'.\n"
        "- Supplier quotation outreach / approved supplier communication -> routeStaff='AIstaff_ApplicationPackSender', taskType='Quotation Outreach'.\n"
        "- Replies/follow-ups -> routeStaff='AIstaff_FollowUpController'.\n"
        "- CRM/sync/audit/technical health -> routeStaff='AIstaff_CRMController' unless it is a Manager policy question.\n"
        "- If Iman asks to run the full process to tender submission-readiness after Lead review, set intent='continue_full_process', createFitReviewTask=true, routeStaff='AIstaff_FitAnalyst'.\n"
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
                "You are right to ask. This is only a smoke-test / system-test thread, not a real tender Lead task. "
                "It was created to confirm that replies create Manager wake-ups correctly. There is no supplier message to send and no tender action needed here. "
                "You can close or archive this thread."
            )
        return (
            "You are right; the previous wording was too vague.\n\n"
            + manager_followup_brief(source, thread)
        )
    if "explain more" in body_norm or "which part" in body_norm or "outside appscript" in body_norm or "outside apps script" in body_norm:
        return (
            manager_followup_brief(source, thread)
            + " In short, the bridge can track simple CRM-side operations; the outside part is judgement-heavy work such as tender strategy, supplier fit, writing quality, fit interpretation, or approving risky outreach."
        )
    if is_full_process_request(body_norm):
        return (
            "Understood. This is not a cancel instruction. I will move these Leads through the department process: Fit and supplier match first, then tender package preparation and outreach checks for the viable cases. "
            "The end point is tender submission-readiness; actual portal submission and external supplier communication still follow the safety gates. I will keep this thread open so you can see updates here."
        )
    if is_false_cancel_correction(body_norm):
        return (
            "Corrected. I will not treat this as cancel. I will continue the department process from the Lead/tender results already in this thread and keep this conversation open for your final closure."
        )
    if is_approval_instruction(body_norm):
        return (
            "Understood. I will treat this as permission to continue only if the normal safety checks pass: tender scope clear, package complete, attachment access verified, no duplicate-recipient risk, and clean outreach wording. "
            "Your chat reply itself did not contact any supplier or send any email."
        )
    if is_cancel_instruction(body_norm):
        return (
            "Understood. I will treat this as a stop/cancel instruction for this thread unless you clarify otherwise. "
            "I will not send or submit anything from this reply."
        )
    return (
        f"Got it. I will apply this to the {task_type.lower()} workflow and route the next step internally if a specialist is needed. "
        "No supplier message, email, or tender submission is sent from this chat reply."
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
    elif "lead" in text or "tender" in text or "rfq" in text or "rfp" in text or "opportunit" in text or "search" in text:
        fallback_route, fallback_type, fallback_category = "AIstaff_OpportunityHunter", "Lead Review", TASK_CATEGORIES["application"]
    elif "supplier" in text or "vendor" in text or "partner" in text or "company" in text:
        fallback_route, fallback_type, fallback_category = "AIstaff_ProfessorResearchAnalyst", "Supplier Discovery", TASK_CATEGORIES["research"]
    elif "proposal" in text or "package" in text or "document" in text or "compliance" in text or "boq" in text or "form" in text:
        fallback_route, fallback_type, fallback_category = "AIstaff_ApplicationPackMaker", "Tender Package", TASK_CATEGORIES["application"]
    elif "send" in text or "email" in text or "outreach" in text or "quote" in text or "quotation" in text:
        fallback_route, fallback_type, fallback_category = "AIstaff_ApplicationPackSender", "Quotation Outreach", TASK_CATEGORIES["email"]
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
    staff_handoff_routes: list[tuple[dict[str, Any], str, dict[str, Any], str]] = []
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
            latest_is_human = normalize_text(latest["sender_type"]).startswith("human") or is_human_responsible(latest["sender_id"])
            latest_staff = normalized_staff_id(latest["sender_id"], "")
            latest_is_staff_handoff = latest_staff.startswith("AIstaff_") and latest_staff != "AIstaff_Manager"
            latest_is_manager_self_task = latest_staff == "AIstaff_Manager"
            if latest_is_human:
                decision = manager_auto_reply_decision(thread, latest["body"] or "")
                message = append_manager_reply(conn, thread, decision["reply"])
            elif latest_is_staff_handoff:
                decision = manager_staff_handoff_decision(thread, latest["body"] or "", latest_staff)
                message = append_manager_internal_reply(conn, thread, decision["reply"])
            elif latest_is_manager_self_task:
                decision = manager_self_task_decision(thread, latest["body"] or "")
                message = append_manager_internal_reply(conn, thread, decision["reply"])
            else:
                continue
            replies.append(message)
            if (latest_is_staff_handoff or latest_is_manager_self_task) and manager_routed_task_should_create(decision):
                staff_handoff_routes.append((dict(thread), latest["body"] or "", decision, latest["message_id"] or ""))
            elif manager_routed_task_should_create(decision):
                route_requests.append((dict(thread), latest["body"] or "", decision, latest["message_id"] or ""))
            if latest_is_human and (decision.get("createFitReviewTask") or is_full_process_request(latest["body"] or "") or (
                is_false_cancel_correction(latest["body"] or "") and is_full_process_request(thread_text_blob(conn, thread["thread_id"], latest["body"] or ""))
            )):
                followthrough_threads.append((thread["thread_id"], latest["body"] or ""))
            processed += 1
    followthrough: list[dict[str, Any]] = []
    for target_thread_id, body in followthrough_threads:
        followthrough.append(queue_full_process_followthrough(target_thread_id, body))
    for route_thread, body, decision, message_id in route_requests:
        routed_tasks.append(queue_manager_routed_task(route_thread, body, decision, message_id))
    for route_thread, body, decision, message_id in staff_handoff_routes:
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
              AND (
                sender_type = 'Human'
                OR sender_id IN ('Human_Iman', 'Human', 'Iman / Human')
                OR (sender_id LIKE 'AIstaff_%' AND sender_id != 'AIstaff_Manager')
              )
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (thread_id,),
        ).fetchone()
        if not latest:
            return {"ok": False, "error": "No human or specialist message found for Manager interpretation."}
        thread_dict = dict(thread)
        latest_dict = dict(latest)
    latest_staff = normalized_staff_id(latest_dict.get("sender_id"), "")
    latest_is_staff_handoff = latest_staff.startswith("AIstaff_") and latest_staff != "AIstaff_Manager"
    latest_is_manager_self_task = latest_staff == "AIstaff_Manager"
    if latest_is_staff_handoff:
        decision = manager_staff_handoff_decision(thread_dict, latest_dict.get("body") or "", latest_staff)
    elif latest_is_manager_self_task:
        decision = manager_self_task_decision(thread_dict, latest_dict.get("body") or "")
    else:
        decision = manager_auto_reply_decision(thread_dict, latest_dict.get("body") or "")
    with connect() as conn:
        fresh_thread = conn.execute("SELECT * FROM task_threads WHERE thread_id = ?", (thread_id,)).fetchone()
        if not fresh_thread:
            return {"ok": False, "error": f"Thread not found after decision: {thread_id}"}
        if latest_is_staff_handoff or latest_is_manager_self_task:
            message = append_manager_internal_reply(conn, fresh_thread, decision["reply"])
        else:
            message = append_manager_reply(conn, fresh_thread, decision["reply"])
    routed = None
    if manager_routed_task_should_create(decision):
        routed = queue_manager_routed_task(thread_dict, latest_dict.get("body") or "", decision, latest_dict.get("message_id") or "")
    followthrough = None
    if not latest_is_staff_handoff and (decision.get("createFitReviewTask") or is_full_process_request(latest_dict.get("body") or "")):
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
            "# GCC lab AI department Staff",
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


def row_to_codex_work_item(row: sqlite3.Row | dict[str, Any]) -> dict[str, Any]:
    data = dict(row)
    context: Any = {}
    try:
        context = json.loads(data.get("context_json") or "{}")
    except Exception:
        context = {}
    return {
        "workItemId": data.get("work_item_id"),
        "sourceTaskId": data.get("source_task_id"),
        "threadId": data.get("thread_id"),
        "assignedStaff": data.get("assigned_staff"),
        "assignedStaffLabel": staff_label(data.get("assigned_staff")),
        "skillName": data.get("skill_name"),
        "title": data.get("title"),
        "prompt": data.get("prompt"),
        "context": context,
        "status": data.get("status"),
        "priority": data.get("priority"),
        "createdAt": iso_like(data.get("created_at")) if data.get("created_at") else "",
        "updatedAt": iso_like(data.get("updated_at")) if data.get("updated_at") else "",
        "startedAt": iso_like(data.get("started_at")) if data.get("started_at") else "",
        "completedAt": iso_like(data.get("completed_at")) if data.get("completed_at") else "",
        "resultSummary": data.get("result_summary"),
        "evidenceLink": data.get("evidence_link"),
        "lastError": data.get("last_error"),
    }


def skill_for_codex_staff(staff_id: str, text: str = "") -> str:
    staff = normalized_staff_id(staff_id, "AIstaff_Manager")
    blob = normalize_text(text)
    if staff in {"AIstaff_OpportunityHunter", "AIstaff_FitAnalyst", "AIstaff_ProfessorResearchAnalyst"}:
        return "swiss-planner-research"
    if staff in {"AIstaff_ApplicationPackMaker", "AIstaff_ApplicationPackSender"}:
        return "swiss-planner-apply"
    if any(term in blob for term in ["cv", "resume", "sop", "proposal", "package", "document", "template", "style"]):
        return "swiss-planner-apply"
    if any(term in blob for term in ["opportunit", "professor", "research fit", "student", "funding"]):
        return "swiss-planner-research"
    return "swiss-planner-staff"


def skill_catalog_lookup(fabric: dict[str, Any]) -> dict[str, dict[str, dict[str, Any]]]:
    scopes = ["platformSafetySkills", "departmentSkills", "staffTemplateSkills", "laneAdapterSkills"]
    return {
        scope: {
            str(row.get("id")): row
            for row in fabric.get(scope, []) or []
            if isinstance(row, dict) and row.get("id")
        }
        for scope in scopes
    }


def approved_learning_rules_for_staff(staff_id: str) -> list[dict[str, Any]]:
    init_db()
    normalized = normalized_staff_id(staff_id, "AIstaff_Manager")
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT learning_id, staff_id, proposed_rule, reason, evidence, target_skill_file, applied_at
            FROM skill_updates
            WHERE status = 'Approved'
              AND (staff_id = ? OR staff_id = 'AIstaff_Manager')
            ORDER BY applied_at DESC, created_at DESC
            LIMIT 20
            """,
            (normalized,),
        ).fetchall()
    return [
        {
            "id": row["learning_id"],
            "label": "Approved Learning",
            "scope": "approvedLearnedUpdates",
            "summary": row["proposed_rule"],
            "rules": [row["proposed_rule"]] if row["proposed_rule"] else [],
            "reason": row["reason"],
            "evidence": row["evidence"],
            "targetSkillFile": row["target_skill_file"],
            "workspaceEditable": False,
            "locked": False,
        }
        for row in rows
    ]


def resolve_scoped_skills_for_staff(staff_id: str, fabric: dict[str, Any], profile: dict[str, Any]) -> dict[str, Any]:
    normalized = normalized_staff_id(staff_id, "AIstaff_Manager")
    catalogs = skill_catalog_lookup(fabric)
    archetype_ids = [str(item) for item in (profile.get("archetypeIds") or []) if item]
    if not archetype_ids and profile.get("primaryArchetypeId"):
        archetype_ids = [str(profile.get("primaryArchetypeId"))]
    relevant_lane_ids = {"lane_local_thread_tasks"}
    if "archetype_email_sender" in archetype_ids:
        relevant_lane_ids.add("lane_gmail_bridge")
    if "archetype_crm_operator" in archetype_ids:
        relevant_lane_ids.add("lane_local_sqlite")
    bindings = sorted(
        [row for row in fabric.get("skillBindings", []) or [] if isinstance(row, dict)],
        key=lambda row: int(row.get("resolutionOrder") or 99),
    )
    resolved: list[dict[str, Any]] = []
    seen: set[str] = set()

    def binding_applies(binding: dict[str, Any]) -> bool:
        binding_type = str(binding.get("bindingType") or "")
        target = str(binding.get("targetId") or "")
        if binding_type == "global":
            return True
        if binding_type == "department":
            return target == "department_swiss_planner_applications"
        if binding_type == "staff":
            return target == normalized
        if binding_type == "staffArchetype":
            return target in archetype_ids
        if binding_type == "lane":
            return target in relevant_lane_ids
        return False

    for binding in bindings:
        if not binding_applies(binding):
            continue
        scope = str(binding.get("skillScope") or "")
        catalog = catalogs.get(scope) or {}
        for skill_id in binding.get("skillIds", []) or []:
            skill = catalog.get(str(skill_id))
            if not skill or str(skill.get("id")) in seen:
                continue
            resolved.append({**json_clone(skill), "resolvedFromBinding": binding.get("id"), "resolutionOrder": binding.get("resolutionOrder")})
            seen.add(str(skill.get("id")))

    workspace_profile = fabric.get("workspaceBusinessProfile") or {}
    user_preferences = [
        {
            "id": "workspace_preference_business_identity",
            "label": "Workspace Business Identity",
            "scope": "userPreferences",
            "summary": "Workspace-level company facts and communication preferences inherited by installed departments.",
            "rules": [
                f"Company display name: {workspace_profile.get('companyDisplayName') or 'not set'}",
                f"Default language: {workspace_profile.get('defaultLanguage') or 'not set'}",
                f"Brand tone: {workspace_profile.get('approvedBrandTone') or 'not set'}",
                f"Manager title: {workspace_profile.get('defaultManagerTitle') or 'not set'}",
            ],
            "workspaceEditable": True,
            "locked": False,
            "resolutionOrder": 6,
        }
    ]
    learned = approved_learning_rules_for_staff(normalized)
    return {
        "resolutionOrder": (fabric.get("operatingModel") or {}).get("skillArchitecture", {}).get("resolutionOrder", []),
        "appliedArchetypeIds": archetype_ids,
        "appliedLaneIds": sorted(relevant_lane_ids),
        "skills": resolved,
        "userPreferences": user_preferences,
        "approvedLearnedUpdates": learned,
    }


def codex_work_required(row: sqlite3.Row | dict[str, Any]) -> bool:
    source = source_payload_for_thread(row)
    staff = normalized_staff_id(row_value(row, "responsible") or source.get("assignedTo"), "AIstaff_Manager")
    if is_human_responsible(staff):
        return False
    blob = normalize_text(
        compact_join(
            [
                row_value(row, "last_message_preview"),
                source.get("status") or source.get("Status") or "",
                source.get("taskType") or source.get("Task Type") or "",
                source.get("taskCategory") or source.get("Task Category") or "",
                source.get("nextAction") or source.get("Next Action") or "",
                source.get("completionCriteria") or "",
                source.get("resultNotes") or source.get("notes") or source.get("Notes") or "",
                source.get("lastError") or source.get("Last Error") or "",
            ]
        )
    )
    if "workflow reached a step that apps script can track" in blob and "tell me whether codex should do" in blob:
        return False
    if "review task needing approval and either approve, reassign, or close" in blob and "original request" not in blob:
        return False
    app_id = row_value(row, "application_id") or source.get("relatedApplicationId") or source.get("applicationId") or ""
    if app_id and any(term in blob for term in ["document style", "style qa", "template style", "minimal-renderer"]):
        approved, _ = style_qa_approved_application(str(app_id))
        if approved:
            return False
    if any(term in blob for term in ["manual send", "linkedin", "portal submit", "duplicate recipient", "repeated professor"]):
        return False
    explicit = any(
        term in blob
        for term in [
            "waiting for codex worker",
            "requires codex",
            "outside apps script",
            "codex worker",
        ]
    )
    substantive = any(
        term in blob
        for term in [
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
            "template",
            "style",
            "checklist",
            "fit",
            "eligib",
            "analysis",
            "compile",
        ]
    )
    if staff == "AIstaff_CRMController" and not any(term in blob for term in ["technical bug", "script", "missing action", "database", "schema"]):
        return False
    return explicit and substantive


def staff_operating_contract(staff_id: str) -> dict[str, Any]:
    fabric = load_capability_fabric()
    normalized = normalized_staff_id(staff_id, "AIstaff_Manager")
    profiles = {
        str(row.get("id")): row
        for row in fabric.get("staffProfiles", []) or []
        if isinstance(row, dict) and row.get("id")
    }
    archetypes = {
        str(row.get("id")): row
        for row in fabric.get("staffArchetypes", []) or []
        if isinstance(row, dict) and row.get("id")
    }
    profile = profiles.get(normalized, {})
    ids = [str(item) for item in (profile.get("archetypeIds") or []) if item]
    if not ids and profile.get("primaryArchetypeId"):
        ids = [str(profile.get("primaryArchetypeId"))]
    inherited = [archetypes[item] for item in ids if item in archetypes]
    operating_model = fabric.get("operatingModel") or {}
    department_contract = operating_model.get("departmentContract") or {}
    thread_policy = operating_model.get("threadPolicy") or {}
    runtime_architecture = operating_model.get("automationRuntimeArchitecture") or {}
    scoped_skills = resolve_scoped_skills_for_staff(normalized, fabric, profile)
    return {
        "staffId": normalized,
        "staffLabel": staff_label(normalized),
        "profileTitle": profile.get("profileTitle") or profile.get("label") or staff_label(normalized),
        "contactPolicy": profile.get("contactPolicy") or "",
        "communicationScope": profile.get("communicationScope") or "",
        "reportsTo": profile.get("reportsTo") or profile.get("managerId") or "",
        "canContactHuman": bool(profile.get("canContactHuman")),
        "canCreateHumanFacingThreads": bool(profile.get("canCreateHumanFacingThreads")),
        "toolOperatingMode": profile.get("toolOperatingMode") or "",
        "departmentOperatingRules": {
            "humanCommunicationRule": department_contract.get("humanCommunicationRule") or "",
            "staffCommunicationRule": department_contract.get("staffCommunicationRule") or "",
            "managerRole": department_contract.get("managerRole") or "",
            "threadCreateReasons": thread_policy.get("createThreadsFor") or [],
            "threadDoNotCreateFor": thread_policy.get("doNotCreateThreadsFor") or [],
            "automationRuntime": {
                "currentApproach": runtime_architecture.get("currentApproach") or "",
                "runnerResponsibilities": runtime_architecture.get("runnerResponsibilities") or [],
                "projectSchedulerPolicy": runtime_architecture.get("projectSchedulerPolicy") or {},
                "externalWorkflowEnginePolicy": runtime_architecture.get("externalWorkflowEnginePolicy") or {},
            },
        },
        "resolvedScopedSkills": scoped_skills,
        "archetypeIds": ids,
        "archetypes": [
            {
                "id": row.get("id"),
                "label": row.get("label"),
                "purpose": row.get("purpose"),
                "preferredModel": row.get("preferredModel"),
                "allowedPluginFamilies": row.get("allowedPluginFamilies") or [],
                "requiresApprovalFor": row.get("requiresApprovalFor") or [],
                "outputContract": row.get("outputContract") or [],
                "stopConditions": row.get("stopConditions") or [],
            }
            for row in inherited
        ],
    }


def format_staff_operating_contract(contract: dict[str, Any]) -> str:
    lines = [
        "Staff operating contract:",
        f"- Staff profile: {contract.get('profileTitle') or contract.get('staffLabel')}",
    ]
    if contract.get("contactPolicy"):
        lines.append(f"- Contact policy: {contract.get('contactPolicy')}")
    if contract.get("communicationScope"):
        lines.append(f"- Communication scope: {contract.get('communicationScope')}")
    if contract.get("reportsTo"):
        lines.append(f"- Reports to: {contract.get('reportsTo')}")
    if not contract.get("canContactHuman") and contract.get("staffId") != "Human_Iman":
        lines.append("- Human contact: do not ask the human directly; report blockers or questions to AIstaff_Manager.")
    rules = contract.get("departmentOperatingRules") or {}
    if rules.get("humanCommunicationRule"):
        lines.append(f"- Department rule: {rules.get('humanCommunicationRule')}")
    if rules.get("staffCommunicationRule"):
        lines.append(f"- Staff routing rule: {rules.get('staffCommunicationRule')}")
    if rules.get("threadCreateReasons"):
        labels = [THREAD_REASON_LABELS.get(str(reason), str(reason)) for reason in rules.get("threadCreateReasons") or []]
        lines.append(f"- Create/continue task threads only for: {', '.join(labels)}.")
    if rules.get("threadDoNotCreateFor"):
        lines.append(f"- Do not create thread noise for: {', '.join(rules.get('threadDoNotCreateFor') or [])}.")
    runtime = rules.get("automationRuntime") or {}
    if runtime.get("currentApproach"):
        lines.append(f"- Runtime approach: {runtime.get('currentApproach')}")
    if runtime.get("runnerResponsibilities"):
        lines.append(f"- Worker responsibilities: {', '.join(runtime.get('runnerResponsibilities') or [])}.")
    scheduler = runtime.get("projectSchedulerPolicy") or {}
    if scheduler.get("progressRule"):
        lines.append(f"- Progress rule: {scheduler.get('progressRule')}")
    external_engine = runtime.get("externalWorkflowEnginePolicy") or {}
    if external_engine.get("triggerDevDecision"):
        lines.append(f"- Workflow engine policy: {external_engine.get('triggerDevDecision')} {external_engine.get('reason') or ''}".strip())
    scoped = contract.get("resolvedScopedSkills") or {}
    if scoped.get("resolutionOrder"):
        lines.append(f"- Skill resolution order: {', '.join(scoped.get('resolutionOrder') or [])}.")
    resolved_skills = scoped.get("skills") or []
    if resolved_skills:
        lines.append("- Resolved scoped skills:")
        for skill in resolved_skills[:12]:
            rules = "; ".join((skill.get("rules") or [])[:3])
            lines.append(f"  - {skill.get('scope')}: {skill.get('label')} - {skill.get('summary') or rules}")
    preferences = scoped.get("userPreferences") or []
    if preferences:
        pref_rules = []
        for pref in preferences:
            pref_rules.extend(pref.get("rules") or [])
        lines.append(f"- User-editable workspace preferences: {'; '.join(pref_rules[:6])}.")
    learned = scoped.get("approvedLearnedUpdates") or []
    if learned:
        lines.append("- Approved learned updates:")
        for item in learned[:5]:
            lines.append(f"  - {item.get('summary') or item.get('label')}")
    if contract.get("toolOperatingMode"):
        lines.append(f"- Tool mode: {contract.get('toolOperatingMode')}")
    for archetype in contract.get("archetypes") or []:
        lines.extend(
            [
                f"- Archetype: {archetype.get('label')} ({archetype.get('id')})",
                f"  Purpose: {archetype.get('purpose')}",
                f"  Preferred model: {archetype.get('preferredModel')}",
                f"  Allowed plugin/tool families: {', '.join(archetype.get('allowedPluginFamilies') or []) or 'none'}",
                f"  Requires approval for: {', '.join(archetype.get('requiresApprovalFor') or []) or 'none'}",
                f"  Output contract: {', '.join(archetype.get('outputContract') or []) or 'concise task result'}",
                f"  Stop conditions: {', '.join(archetype.get('stopConditions') or []) or 'unclear blocker'}",
            ]
        )
    return "\n".join(lines)


def build_codex_work_prompt(thread: dict[str, Any], messages: list[dict[str, Any]], source: dict[str, Any]) -> tuple[str, str, str, dict[str, Any]]:
    assigned = normalized_staff_id(thread.get("responsible") or source.get("assignedTo"), "AIstaff_Manager")
    task_text = compact_join(
        [
            source.get("nextAction") or thread.get("lastMessagePreview") or "",
            source.get("completionCriteria") or "",
            source.get("resultNotes") or "",
            source.get("lastError") or "",
        ]
    )
    skill = skill_for_codex_staff(assigned, task_text)
    operating_contract = staff_operating_contract(assigned)
    title_base = source.get("taskType") or source.get("taskCategory") or "Codex work"
    app_id = thread.get("applicationId") or source.get("relatedApplicationId") or source.get("applicationId") or ""
    opp_id = thread.get("opportunityId") or source.get("relatedOpportunityId") or source.get("opportunityId") or ""
    title_parts = [str(title_base)]
    if app_id:
        title_parts.append(app_id)
    title = " - ".join(title_parts)
    transcript = "\n".join(
        f"- {message.get('senderLabel') or message.get('senderId')}: {thread_preview(message.get('body'), 500)}"
        for message in messages[-8:]
    )
    context = {
        "threadId": thread.get("threadId"),
        "taskId": thread.get("taskId"),
        "assignedStaff": assigned,
        "skillName": skill,
        "applicationId": app_id,
        "opportunityId": opp_id,
        "sourceTask": source,
        "recentMessages": messages[-8:],
        "staffOperatingContract": operating_contract,
    }
    prompt = (
        f"You are acting as {staff_label(assigned)} ({assigned}) in the Swiss Planner AI Staff system.\n\n"
        f"Required skill: {skill}\n\n"
        f"{format_staff_operating_contract(operating_contract)}\n\n"
        "Task:\n"
        f"{task_text or title}\n\n"
        "Related IDs:\n"
        f"- TaskID: {thread.get('taskId')}\n"
        f"- ThreadID: {thread.get('threadId')}\n"
        f"- ApplicationID: {app_id or 'not set'}\n"
        f"- OpportunityID: {opp_id or 'not set'}\n\n"
        "Recent thread context:\n"
        f"{transcript or '- No prior messages.'}\n\n"
        "Required output:\n"
        "- Complete the judgement, research, writing, package QA, or routing work requested above.\n"
        "- Update the related task/thread with a concise result summary and evidence path/link.\n"
        "- If the work cannot be completed, mark it Blocked with the exact blocker and next owner.\n\n"
        "Safety gates:\n"
        "- Do not send email or submit a portal from this work item.\n"
        "- Do not contact LinkedIn users automatically.\n"
        "- Professor-facing documents must use approved templates/style QA before any external send.\n"
        "- Repeated professor/supervisor recipients remain guarded unless explicitly resolved.\n"
    )
    return title, skill, prompt, context


def create_codex_work_item_from_thread(thread_id: str, status: str = "Queued") -> dict[str, Any]:
    detail = get_thread(thread_id)
    if not detail.get("ok"):
        return detail
    thread = detail.get("thread") or {}
    messages = detail.get("messages") or []
    source = thread.get("source") or {}
    task_id = thread.get("taskId") or ""
    with connect() as conn:
        existing = conn.execute(
            """
            SELECT * FROM codex_work_items
            WHERE source_task_id = ? OR thread_id = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (task_id, thread_id),
        ).fetchone()
    if existing:
        return {"ok": True, "workItem": row_to_codex_work_item(existing), "alreadyExists": True}
    title, skill, prompt, context = build_codex_work_prompt(thread, messages, source)
    now = utc_ts()
    work_item_id = "codex_work_" + safe_task_part(task_id or thread_id)
    assigned = normalized_staff_id(thread.get("responsible") or source.get("assignedTo"), "AIstaff_Manager")
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO codex_work_items (
              work_item_id, source_task_id, thread_id, assigned_staff, skill_name, title,
              prompt, context_json, status, priority, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                work_item_id,
                task_id,
                thread_id,
                assigned,
                skill,
                title,
                prompt,
                json.dumps(context, default=str),
                status,
                source.get("priority") or "High",
                now,
                now,
            ),
        )
        row = conn.execute("SELECT * FROM codex_work_items WHERE work_item_id = ?", (work_item_id,)).fetchone()
    return {"ok": True, "workItem": row_to_codex_work_item(row), "alreadyExists": False}


def list_codex_work_items(status: str = "open", staff: str = "", limit: int = 100) -> dict[str, Any]:
    init_db()
    clauses: list[str] = []
    params: list[Any] = []
    if status and status.lower() not in {"all", "*"}:
        if status.lower() == "open":
            clauses.append("status NOT IN ('Done', 'Blocked', 'Cancelled')")
        else:
            clauses.append("status = ?")
            params.append(status)
    if staff:
        clauses.append("assigned_staff = ?")
        params.append(normalized_staff_id(staff, staff))
    where = "WHERE " + " AND ".join(clauses) if clauses else ""
    params.append(max(1, int(limit or 100)))
    with connect() as conn:
        rows = conn.execute(
            f"SELECT * FROM codex_work_items {where} ORDER BY created_at DESC LIMIT ?",
            params,
        ).fetchall()
    return {"ok": True, "workItems": [row_to_codex_work_item(row) for row in rows]}


def get_codex_work_item(work_item_id: str) -> dict[str, Any]:
    init_db()
    with connect() as conn:
        row = conn.execute("SELECT * FROM codex_work_items WHERE work_item_id = ?", (work_item_id,)).fetchone()
    if not row:
        return {"ok": False, "error": f"Codex work item not found: {work_item_id}"}
    return {"ok": True, "workItem": row_to_codex_work_item(row)}


def next_local_worker_item() -> dict[str, Any] | None:
    init_db()
    with connect() as conn:
        row = conn.execute(
            """
            SELECT *
            FROM codex_work_items
            WHERE status IN ('Queued', 'Ready')
            ORDER BY
              CASE priority
                WHEN 'Critical' THEN 0
                WHEN 'High' THEN 1
                WHEN 'Medium' THEN 2
                WHEN 'Low' THEN 3
                ELSE 4
              END,
              created_at ASC
            LIMIT 1
            """
        ).fetchone()
    return row_to_codex_work_item(row) if row else None


def prepare_codex_items_without_worker() -> dict[str, Any]:
    now = utc_ts()
    message = "Worker command not configured. Set AI_DEPARTMENT_WORKER_COMMAND to process Codex work items automatically."
    with connect() as conn:
        changed = conn.execute(
            """
            UPDATE codex_work_items
            SET status = 'Ready',
                updated_at = ?,
                last_error = ?
            WHERE status = 'Queued'
            """,
            (now, message),
        ).rowcount
    set_meta("local_worker_last_error", message)
    set_meta(
        "local_worker_last_run",
        {
            "runAt": iso_like(now),
            "status": "Worker Missing",
            "processed": 0,
            "message": message,
        },
    )
    return {"ok": True, "processed": 0, "changedToReady": int(changed or 0), "message": message}


def mark_codex_work_item(payload: dict[str, Any]) -> dict[str, Any]:
    work_item_id = str(payload.get("workItemId") or "").strip()
    status = str(payload.get("status") or "").strip()
    if not work_item_id or not status:
        return {"ok": False, "error": "Missing workItemId or status."}
    now = utc_ts()
    with connect() as conn:
        row = conn.execute("SELECT * FROM codex_work_items WHERE work_item_id = ?", (work_item_id,)).fetchone()
        if not row:
            return {"ok": False, "error": f"Codex work item not found: {work_item_id}"}
        started_at = row["started_at"]
        completed_at = row["completed_at"]
        if status in {"In Progress", "Copied"} and not started_at:
            started_at = now
        if status in {"Done", "Blocked", "Cancelled"}:
            completed_at = now
        conn.execute(
            """
            UPDATE codex_work_items
            SET status = ?, updated_at = ?, started_at = ?, completed_at = ?,
                result_summary = COALESCE(NULLIF(?, ''), result_summary),
                evidence_link = COALESCE(NULLIF(?, ''), evidence_link),
                last_error = COALESCE(NULLIF(?, ''), last_error)
            WHERE work_item_id = ?
            """,
            (
                status,
                now,
                started_at,
                completed_at,
                payload.get("resultSummary") or "",
                payload.get("evidenceLink") or "",
                payload.get("lastError") or "",
                work_item_id,
            ),
        )
    return get_codex_work_item(work_item_id)


def submit_codex_work_result(payload: dict[str, Any]) -> dict[str, Any]:
    work_item_id = str(payload.get("workItemId") or "").strip()
    result = str(payload.get("resultSummary") or "").strip()
    if not work_item_id:
        return {"ok": False, "error": "Missing workItemId."}
    if not result:
        return {"ok": False, "error": "Missing resultSummary."}
    marked = mark_codex_work_item(
        {
            "workItemId": work_item_id,
            "status": payload.get("status") or "Done",
            "resultSummary": result,
            "evidenceLink": payload.get("evidenceLink") or "",
            "lastError": payload.get("lastError") or "",
        }
    )
    if not marked.get("ok"):
        return marked
    item = marked["workItem"]
    thread_id = item.get("threadId") or ""
    if thread_id:
        add_thread_message(
            {
                "threadId": thread_id,
                "senderType": "AI",
                "senderId": item.get("assignedStaff") or "AIstaff_Manager",
                "senderLabel": staff_label(item.get("assignedStaff")),
                "body": result,
                "evidenceLink": payload.get("evidenceLink") or "",
                "metadata": {"codex_work_item": work_item_id, "status": item.get("status")},
            }
        )
    source_task_id = item.get("sourceTaskId") or ""
    status = str(item.get("status") or "")
    if source_task_id and status == "Done":
        update_snapshot_task_status(source_task_id, "Done", result, payload.get("evidenceLink") or "")
    elif source_task_id and status == "Blocked":
        update_snapshot_task_status(
            source_task_id,
            "Blocked - Codex Worker Issue",
            payload.get("lastError") or result,
            payload.get("evidenceLink") or "",
        )
    return marked


def run_local_worker_once(force: bool = False) -> dict[str, Any]:
    if not force and not local_worker_enabled():
        return {"ok": True, "processed": 0, "state": "Paused", "message": "Local worker is paused."}
    command = local_worker_command()
    if not command:
        return prepare_codex_items_without_worker()
    if not LOCAL_WORKER_LOCK.acquire(blocking=False):
        return {"ok": True, "processed": 0, "state": "Busy", "message": "Local worker is already running."}
    try:
        item = next_local_worker_item()
        if not item:
            run = {"runAt": iso_like(), "status": "Idle", "processed": 0, "message": "No queued Codex work items."}
            set_meta("local_worker_last_run", run)
            return {"ok": True, "processed": 0, "state": "Idle", "message": run["message"]}
        work_item_id = str(item.get("workItemId") or "")
        resolved_context = p4_resolve_context(
            {
                "staffProfileId": item.get("assignedStaff") or "AIstaff_Manager",
                "projectContext": {
                    "workItemId": work_item_id,
                    "threadId": item.get("threadId") or "",
                    "sourceTaskId": item.get("sourceTaskId") or "",
                },
            }
        )
        snapshot = create_p4_provisioning_snapshot(
            {
                "resolvedContext": resolved_context,
                "workItemId": work_item_id,
                "threadId": item.get("threadId") or "",
                "createdBy": "local_worker",
            }
        )
        assigned_staff = normalized_staff_id(item.get("assignedStaff"), "AIstaff_Manager")
        readiness_state = str(resolved_context.get("readinessState") or "")
        if readiness_state != "ready" and assigned_staff in {"AIstaff_ApplicationPackSender"}:
            message = (
                f"P4 readiness blocked worker execution before external-action staff ran: {readiness_state}. "
                f"Next action: {resolved_context.get('nextAction') or 'Route to AI Manager.'}"
            )
            result = submit_codex_work_result(
                {
                    "workItemId": work_item_id,
                    "status": "Blocked",
                    "resultSummary": message,
                    "lastError": message,
                    "evidenceLink": snapshot.get("snapshotId") or "",
                }
            )
            set_meta("local_worker_last_error", message)
            return {"ok": True, "processed": 0, "state": "P4 Readiness Blocked", "workItem": item, "result": result, "snapshot": snapshot}
        mark_codex_work_item({"workItemId": work_item_id, "status": "In Progress"})
        started = get_codex_work_item(work_item_id).get("workItem") or item
        started["p4ProvisioningSnapshotId"] = snapshot.get("snapshotId") or ""
        started["p4ReadinessState"] = readiness_state
        started["p4ResolvedContext"] = resolved_context
        timeout = max(30, int(os.environ.get("AI_DEPARTMENT_WORKER_TIMEOUT_SECONDS", "900") or "900"))
        try:
            completed = subprocess.run(
                command,
                input=json.dumps(started, default=str),
                text=True,
                capture_output=True,
                timeout=timeout,
                shell=True,
            )
        except subprocess.TimeoutExpired as exc:
            error = f"Worker command timed out after {timeout} seconds."
            submit_codex_work_result(
                {
                    "workItemId": work_item_id,
                    "status": "Blocked",
                    "resultSummary": error,
                    "lastError": str(exc),
                }
            )
            set_meta("local_worker_last_error", error)
            return {"ok": False, "processed": 0, "state": "Timeout", "workItem": started, "error": error}
        stdout = (completed.stdout or "").strip()
        stderr = (completed.stderr or "").strip()
        parsed: dict[str, Any] = {}
        if stdout:
            try:
                parsed = json.loads(stdout)
            except json.JSONDecodeError:
                parsed = {}
        if completed.returncode != 0:
            error = stderr or stdout or f"Worker command exited with code {completed.returncode}."
            result = submit_codex_work_result(
                {
                    "workItemId": work_item_id,
                    "status": "Blocked",
                    "resultSummary": error,
                    "lastError": error,
                }
            )
            set_meta("local_worker_last_error", error)
            return {"ok": False, "processed": 0, "state": "Worker Error", "workItem": started, "result": result, "error": error}
        status = str(parsed.get("status") or "Done").strip()
        if status not in {"Done", "Blocked", "Ready"}:
            status = "Done"
        result_summary = str(parsed.get("resultSummary") or parsed.get("summary") or stdout or "Worker completed the item.").strip()
        evidence_link = str(parsed.get("evidenceLink") or "").strip()
        last_error = str(parsed.get("lastError") or "").strip()
        result = submit_codex_work_result(
            {
                "workItemId": work_item_id,
                "status": status,
                "resultSummary": result_summary,
                "evidenceLink": evidence_link,
                "lastError": last_error,
            }
        )
        run = {
            "runAt": iso_like(),
            "status": status,
            "processed": 1,
            "workItemId": work_item_id,
            "title": started.get("title"),
        }
        set_meta("local_worker_last_run", run)
        if status == "Done":
            set_meta("local_worker_last_error", "")
        return {"ok": result.get("ok", True), "processed": 1, "state": status, "workItem": started, "result": result}
    finally:
        LOCAL_WORKER_LOCK.release()


def ensure_codex_work_items_for_open_threads(limit: int = 200) -> dict[str, Any]:
    init_db()
    created: list[dict[str, Any]] = []
    skipped = 0
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT *
            FROM task_threads
            WHERE status = 'Open'
              AND archived = 0
            ORDER BY last_message_at DESC
            LIMIT ?
            """,
            (max(1, int(limit or 200)),),
        ).fetchall()
    for row in rows:
        if not codex_work_required(row):
            skipped += 1
            continue
        result = create_codex_work_item_from_thread(row["thread_id"])
        if result.get("ok") and not result.get("alreadyExists"):
            created.append(result["workItem"])
    return {"ok": True, "created": len(created), "skipped": skipped, "workItems": created}


def update_snapshot_task_status(task_id: str, status: str, result_notes: str = "", evidence_link: str = "") -> None:
    task_id = str(task_id or "").strip()
    if not task_id:
        return
    if task_is_terminal({"status": status}):
        set_task_status_override(task_id, status, result_notes, evidence_link)
    snapshot = load_dashboard_snapshot() or {}
    changed = False
    for task in snapshot.get("tasks", []) or []:
        if str(task.get("taskId") or task.get("Task ID") or "") == task_id:
            task["status"] = status
            task["completedAt"] = iso_like()
            if result_notes:
                task["resultNotes"] = result_notes
            if evidence_link:
                task["evidenceLink"] = evidence_link
            changed = True
    if changed:
        save_dashboard_snapshot(snapshot, source="local")


def update_thread_source_status(thread_id: str, status: str, result_notes: str = "") -> None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM task_threads WHERE thread_id = ?", (thread_id,)).fetchone()
        if not row:
            return
        source = source_payload_for_thread(row)
        source["status"] = status
        if result_notes:
            source["resultNotes"] = result_notes
        conn.execute(
            "UPDATE task_threads SET source_payload = ? WHERE thread_id = ?",
            (json.dumps(source, default=str), thread_id),
        )
    update_snapshot_task_status(row["task_id"], status, result_notes)


def thread_blob(row: sqlite3.Row | dict[str, Any]) -> str:
    source = source_payload_for_thread(row)
    return normalize_text(
        compact_join(
            [
                row_value(row, "thread_id"),
                row_value(row, "task_id"),
                row_value(row, "application_id"),
                row_value(row, "opportunity_id"),
                row_value(row, "last_message_preview"),
                source.get("taskType") or "",
                source.get("taskCategory") or "",
                source.get("nextAction") or "",
                source.get("resultNotes") or "",
                source.get("status") or "",
            ]
        )
    )


def style_qa_approved_application(application_id: str) -> tuple[bool, str]:
    app_id = str(application_id or "").strip()
    if not app_id:
        return False, ""
    for manifest_path in APPLICATION_PACKAGES_DIR.glob("**/deep_package_manifest.json"):
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig", errors="ignore"))
        except Exception:
            continue
        if str(manifest.get("application_id") or "") != app_id:
            continue
        marker = manifest_path.parent / "STYLE_QA_APPROVED.txt"
        quality = manifest.get("document_quality") or {}
        status = quality.get("style_quality_status") or quality.get("styleQualityStatus") or ""
        if marker.exists() or approved_style_status(status):
            return True, str(manifest_path)
    return False, ""


def close_local_thread(thread_id: str, reason: str, status: str = "Closed") -> bool:
    detail = get_thread(thread_id)
    if not detail.get("ok"):
        return False
    thread = detail.get("thread") or {}
    if thread.get("status") == "Closed":
        return False
    close_thread(thread_id, closed_by="AIstaff_Manager", reason=reason)
    update_thread_source_status(thread_id, status, reason)
    return True


def resolve_alex_open_issues() -> dict[str, Any]:
    init_db()
    work_items = ensure_codex_work_items_for_open_threads()
    closed: list[dict[str, str]] = []
    kept: list[dict[str, str]] = []
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT *
            FROM task_threads
            WHERE status = 'Open'
              AND archived = 0
            ORDER BY last_message_at DESC
            """
        ).fetchall()
    for row in rows:
        thread_id = row["thread_id"]
        task_id = row["task_id"]
        app_id = row["application_id"] or ""
        blob = thread_blob(row)
        reason = ""
        new_status = "Closed"
        if app_id == "app_agh_drilling_knez_2026":
            reason = "Dr. Knez path is handled directly by Iman and marked complete/no further follow-up."
            new_status = "No Further Action"
        elif "e2e_smoke_test" in blob or "smoke test" in blob:
            reason = "Closed test/smoke task so it does not appear in Alex's real workload."
        elif app_id in {"app_agh_geothermal_sowizdzal_2026", "app_kisd_igsmie_energy_transition_2026"}:
            approved, evidence = style_qa_approved_application(app_id)
            if approved and any(term in blob for term in ["document style", "style qa", "template style", "minimal-renderer", "not approved"]):
                reason = "Style QA blocker resolved: approved-template package exists locally with STYLE_QA_APPROVED marker."
                new_status = "Done"
                if evidence:
                    reason += f" Evidence: {evidence}"
        if not reason and any(
            term in blob
            for term in [
                "review task needing approval and either approve, reassign, or close",
                "workflow reached a step that apps script can track",
                "this task requires codex/human work outside apps script: review task needing approval",
            ]
        ):
            if "routed it to" in blob or row["responsible"] in {"Human_Iman", "AIstaff_Manager"}:
                reason = "Closed generic review/escalation noise; Alex already routed the concrete next action or converted it to internal work."
        if not reason and "manager handoff" in blob and any(term in blob for term in ["routed the next stage", "routed it to"]):
            reason = "Closed completed manager handoff; Alex already routed the next specialist stage."
        if not reason and "reviewed the completed work and routed" in blob and row["responsible"] == "AIstaff_Manager":
            reason = "Closed completed manager routing note; the next specialist stage is already queued."
        if not reason and row["responsible"] == "AIstaff_Manager" and "no automatic next specialist stage" in blob:
            reason = "Closed manager-owned closure note; no next specialist action was available."
        if reason:
            if close_local_thread(thread_id, reason, new_status):
                closed.append({"threadId": thread_id, "taskId": task_id, "status": new_status, "reason": reason[:240]})
        else:
            if row["responsible"] in {"Human_Iman", "AIstaff_Manager"} or row["source_staff"] == "AIstaff_Manager":
                kept.append({"threadId": thread_id, "taskId": task_id, "reason": "Still appears actionable or needs a real owner decision."})
    snapshot = load_dashboard_snapshot() or {}
    if snapshot:
        summary = dict(snapshot.get("summary") or {})
        summary["openCodexWorkItems"] = len(list_codex_work_items("open").get("workItems") or [])
        snapshot["summary"] = summary
        save_dashboard_snapshot(snapshot, source="local")
    return {
        "ok": True,
        "codexWorkItemsCreated": work_items.get("created", 0),
        "threadsClosed": len(closed),
        "closed": closed,
        "kept": kept[:40],
        "openCodexWorkItems": len(list_codex_work_items("open").get("workItems") or []),
    }


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
    open_task_rows = [row for row in tasks if not task_is_terminal(row)]
    summary["openTasks"] = len(open_task_rows)
    summary["humanTasks"] = len([row for row in open_task_rows if is_human_responsible(row.get("assignedTo"))])
    summary["openEscalations"] = len(
        [
            row
            for row in open_task_rows
            if normalized_staff_id(row.get("assignedTo"), "") in {"Human_Iman", "AIstaff_Manager"}
            if row.get("taskCategory")
            in {TASK_CATEGORIES["human"], TASK_CATEGORIES["manager"], TASK_CATEGORIES["audit"], TASK_CATEGORIES["technical"], TASK_CATEGORIES["email"]}
        ]
    )
    summary["managerReview"] = 0
    summary["waitingCodexWorker"] = len(
        [row for row in open_task_rows if normalize_text(row.get("status")) == "waiting for codex worker"]
    )
    normalized["summary"] = summary
    return normalized


def reconcile_snapshot_tasks_from_threads(payload: Dashboard) -> Dashboard:
    normalized = dict(payload or {})
    tasks = [dict(row) for row in normalized.get("tasks", []) or [] if isinstance(row, dict)]
    if not tasks:
        return normalized
    task_ids = [str(row.get("taskId") or row.get("Task ID") or "") for row in tasks if row.get("taskId") or row.get("Task ID")]
    if not task_ids:
        return normalized
    placeholders = ",".join("?" for _ in task_ids)
    with connect() as conn:
        rows = conn.execute(
            f"""
            SELECT task_id, status, closed_at, last_message_preview, source_payload
            FROM task_threads
            WHERE task_id IN ({placeholders})
            """,
            task_ids,
        ).fetchall()
    by_task = {row["task_id"]: row for row in rows}
    changed = False
    for task in tasks:
        task_id = str(task.get("taskId") or task.get("Task ID") or "")
        thread = by_task.get(task_id)
        if not thread:
            continue
        source: dict[str, Any] = {}
        try:
            source = json.loads(thread["source_payload"] or "{}")
        except Exception:
            source = {}
        thread_status = str(thread["status"] or "")
        source_status = str(source.get("status") or source.get("Status") or "")
        if thread_status == "Closed":
            final_status = source_status if source_status and source_status.lower() != "needs approval" else "Closed"
            task["status"] = final_status
            task["completedAt"] = iso_like(thread["closed_at"]) if thread["closed_at"] else iso_like()
            task["resultNotes"] = source.get("resultNotes") or thread["last_message_preview"] or "Closed in local task thread."
            changed = True
        elif source_status and source_status != str(task.get("status") or ""):
            task["status"] = source_status
            if source.get("resultNotes"):
                task["resultNotes"] = source.get("resultNotes")
            changed = True
    if changed:
        normalized["tasks"] = tasks
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
        "capabilityFabric": dashboard_capability_fabric(full=False),
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
    if action == "appendAiStaffTask":
        try:
            task = local_task_from_payload(payload or {}, action_id)
            thread_id = str(payload.get("threadId") or task.get("threadId") or thread_id_for_task(task.get("taskId")))
            with connect() as conn:
                thread = conn.execute("SELECT * FROM task_threads WHERE thread_id = ?", (thread_id,)).fetchone()
            if thread and codex_work_required(thread):
                create_codex_work_item_from_thread(thread_id)
        except Exception as exc:
            set_meta("codex_work_item_auto_create_error", str(exc)[:1000])
    if sync_online:
        message = "Saved locally and queued for the next Google Sheet sync."
    elif normalize_text(get_meta("crm_sync_enabled", "false")) != "true":
        message = "Saved locally. CRM sync is disabled."
    else:
        message = "Saved locally. It will be uploaded to the online CRM when its task thread is closed."
    return {"ok": True, "queuedLocal": True, "localOnly": not sync_online, "actionId": action_id, "message": message}


def queue_daily_codex_research_task(reason: str = "") -> dict[str, Any]:
    return queue_action(
        "appendAiStaffTask",
        {
            "taskType": "Lead Review",
            "taskTemplateId": "template_daily_kpi_opportunity_research",
            "assignedTo": "AIstaff_OpportunityHunter",
            "createdBy": "Windows Daily Autopilot",
            "priority": "High",
            "runAfter": iso_like(),
            "dueAt": iso_like(utc_ts() + 2 * 60 * 60),
            "nextAction": (
                "Review transferred GCC lab tender Leads or queued Lead files. Extract tender scope, deadlines, required documents, "
                "missing blockers, and prepare viable cases for Fit and Supplier Match review."
            ),
            "completionCriteria": "At least one Lead/tender case has a document review brief or a specific missing-file/source blocker.",
            "successStatus": "Lead Review Done",
            "failureStatus": "Blocked - Lead Review Issue",
            "status": "Waiting for Codex Worker",
            "evidenceLink": "",
            "resultNotes": "Created by Windows Daily Autopilot as a Codex Worker tender Lead review task.",
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
                    "Regenerate the application package from the approved GCC lab AI department document templates/Google Docs path, "
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
        "projectPlanId": payload.get("projectPlanId") or "",
        "projectStepId": payload.get("projectStepId") or "",
        "workflowStage": payload.get("workflowStage") or "",
        "outputTemplateId": payload.get("outputTemplateId") or "",
        "expectedOutput": payload.get("expectedOutput") or "",
        "safetyGate": payload.get("safetyGate") or "",
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
        "lead",
        "tender",
        "supplier",
        "vendor",
        "partner",
        "quote",
        "quotation",
        "proposal",
        "write",
        "draft",
        "document",
        "package",
        "analy",
        "fit",
    ]
    manual_terms = ["duplicate recipient", "repeated supplier", "manual send", "linkedin", "portal"]
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


def task_lookup_value(row: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            return str(value)
    return ""


def is_completed_specialist_task(row: dict[str, Any]) -> bool:
    assigned = normalized_staff_id(task_lookup_value(row, "assignedTo", "Assigned To"), "")
    if not assigned.startswith("AIstaff_") or assigned == "AIstaff_Manager":
        return False
    task_id = task_lookup_value(row, "taskId", "Task ID")
    text = normalize_text(
        compact_join(
            [
                task_id,
                task_lookup_value(row, "taskType", "Task Type"),
                task_lookup_value(row, "taskCategory", "Task Category"),
                task_lookup_value(row, "status", "Status"),
                task_lookup_value(row, "priority", "Priority"),
                task_lookup_value(row, "resultNotes", "Result Notes"),
                task_lookup_value(row, "nextAction", "Next Action"),
            ]
        )
    )
    if any(term in text for term in ["smoke", "e2e", "process engine", "security rotate", "test only"]):
        return False
    status = normalize_text(task_lookup_value(row, "status", "Status"))
    completed_at = task_lookup_value(row, "completedAt", "Completed At")
    if status == "done":
        return True
    if completed_at and ("done" in status or "ready" in status or "prepared" in status or "sent" in status):
        return True
    return False


def manager_handoff_recommendation(row: dict[str, Any], assigned: str) -> str:
    result = compact_join(
        [
            task_lookup_value(row, "resultNotes", "Result Notes"),
            task_lookup_value(row, "nextAction", "Next Action"),
            task_lookup_value(row, "completionCriteria", "Completion Criteria"),
        ]
    ).lower()
    if assigned == "AIstaff_OpportunityHunter":
        return "Review the verified opportunities, pick the strongest viable leads, and create Fit Analyst tasks or Application rows for the candidates that should move forward."
    if assigned == "AIstaff_FitAnalyst":
        return "Confirm the shortlist decision, reject weak/expired cases, and route viable applications to Professor Research Analyst or Application Pack Maker."
    if assigned == "AIstaff_ProfessorResearchAnalyst":
        return "Check whether supervisor evidence is strong enough, then route the application to Package Maker or mark the research-fit blocker."
    if assigned == "AIstaff_ApplicationPackMaker":
        return "Check package completeness/style QA, then route verified packages to Application Pack Sender or return missing-document tasks."
    if assigned == "AIstaff_ApplicationPackSender":
        return "Check send outcome and safety status, then create a Follow-up Controller task or close the outreach path."
    if assigned == "AIstaff_FollowUpController":
        return "Review reply/follow-up outcome, update the application status, and create the next follow-up or closure decision."
    if assigned == "AIstaff_CRMController":
        return "Review CRM health output, clear stale blockers, and create the next operational task if any entity is still active."
    if "next:" in result:
        return "Read the staff result, extract the stated next step, and create the next staff task instead of leaving the work as a note."
    return "Review the staff result and decide the next responsible staff, human question, or closure."


def historical_completion_needs_manager_handoff(row: dict[str, Any], assigned: str) -> bool:
    """Retrofit manager routing for completed specialist work created before handoff automation existed."""
    text = normalize_text(
        compact_join(
            [
                task_lookup_value(row, "resultNotes", "Result Notes"),
                task_lookup_value(row, "nextAction", "Next Action"),
                task_lookup_value(row, "completionCriteria", "Completion Criteria"),
                task_lookup_value(row, "successStatus", "Success Status"),
            ]
        )
    )
    if "next:" in text or "next step" in text or "route" in text:
        return True
    if assigned == "AIstaff_OpportunityHunter":
        return "opportunit" in text and any(term in text for term in ["added", "found", "complete", "verified"])
    if assigned == "AIstaff_FitAnalyst":
        return any(term in text for term in ["shortlist", "fit", "viable", "reject", "approved"])
    if assigned == "AIstaff_ProfessorResearchAnalyst":
        return any(term in text for term in ["professor", "supervisor", "research fit", "evidence"])
    if assigned == "AIstaff_ApplicationPackMaker":
        return any(term in text for term in ["package", "proposal", "cv", "sop", "uploaded", "prepared"])
    if assigned == "AIstaff_ApplicationPackSender":
        return any(term in text for term in ["sent", "blocked", "queue", "attachment", "reply"])
    if assigned in {"AIstaff_FollowUpController", "AIstaff_CRMController"}:
        return any(term in text for term in ["follow", "reply", "crm", "health", "blocked", "stale"])
    return False


def ensure_manager_handoffs_for_completed_staff_tasks(
    snapshot: Dashboard | None,
    previous_snapshot: Dashboard | None = None,
    max_items: int = 8,
) -> dict[str, Any]:
    """Create Alex review tasks when specialist work completes with no next-stage owner."""
    created: list[str] = []
    skipped: list[str] = []
    previous_terminal: set[str] = set()
    for old in (previous_snapshot or {}).get("tasks", []) or []:
        if not isinstance(old, dict):
            continue
        if is_completed_specialist_task(old):
            old_source = task_lookup_value(old, "sourceTaskId", "Source Task ID") or task_lookup_value(old, "taskId", "Task ID")
            if old_source:
                previous_terminal.add(old_source)
    for row in (snapshot or {}).get("tasks", []) or []:
        if not isinstance(row, dict) or not is_completed_specialist_task(row):
            continue
        source_task_id = task_lookup_value(row, "sourceTaskId", "Source Task ID") or task_lookup_value(row, "taskId", "Task ID")
        if not source_task_id:
            continue
        handoff_task_id = "staff_task_manager_handoff_" + safe_task_part(source_task_id)
        if local_or_pending_task_exists(handoff_task_id):
            skipped.append(source_task_id)
            continue
        assigned = normalized_staff_id(task_lookup_value(row, "assignedTo", "Assigned To"), "AIstaff_Manager")
        is_new_completion = source_task_id not in previous_terminal
        result_notes = compact_join(
            [
                task_lookup_value(row, "resultNotes", "Result Notes"),
                task_lookup_value(row, "lastError", "Last Error"),
            ]
        )
        if not is_new_completion and not historical_completion_needs_manager_handoff(row, assigned):
            skipped.append(source_task_id)
            continue
        if len(created) >= max_items:
            break
        task_type = task_lookup_value(row, "taskType", "Task Type") or "Completed Work"
        payload = {
            "taskId": handoff_task_id,
            "taskType": "Manager Handoff",
            "taskCategory": TASK_CATEGORIES["manager"],
            "taskTemplateId": "template_staff_completion_manager_handoff",
            "assignedTo": "AIstaff_Manager",
            "createdBy": assigned,
            "sourceStaff": assigned,
            "targetStaff": "AIstaff_Manager",
            "entityId": task_lookup_value(row, "entityId", "EntityID"),
            "relatedApplicationId": task_lookup_value(row, "applicationId", "ApplicationID", "Related ApplicationID"),
            "relatedOpportunityId": task_lookup_value(row, "opportunityId", "Opportunity ID", "Related Opportunity ID"),
            "priority": task_lookup_value(row, "priority", "Priority") or "High",
            "runAfter": iso_like(),
            "dueAt": iso_like(utc_ts() + 2 * 60 * 60),
            "nextAction": (
                f"{staff_label(assigned)} completed {task_type}. Review the result and decide the next pipeline action. "
                + manager_handoff_recommendation(row, assigned)
            ),
            "completionCriteria": (
                "Alex records the next owner and creates a downstream task, closes the path, or asks Iman only if a real human decision is needed."
            ),
            "successStatus": "Next Stage Routed",
            "failureStatus": "Blocked - Manager Routing Needed",
            "status": "Queued",
            "evidenceLink": task_lookup_value(row, "evidenceLink", "Evidence Link"),
            "resultNotes": compact_join(
                [
                    f"Source task: {source_task_id}",
                    f"Staff result: {result_notes}",
                    f"Completed at: {task_lookup_value(row, 'completedAt', 'Completed At')}",
                ],
                " | ",
            ),
            "threadId": task_lookup_value(row, "threadId", "ThreadID"),
            "sourceTaskId": source_task_id,
        }
        queue_action("appendAiStaffTask", payload, method="POST", sync_online=False)
        created.append(handoff_task_id)
    return {"created": created, "skipped": skipped[:20], "createdCount": len(created)}


def application_id_from_row(row: dict[str, Any]) -> str:
    return task_lookup_value(row, "applicationId", "ApplicationID", "Application ID", "relatedApplicationId", "Related ApplicationID")


def is_real_pipeline_application(row: dict[str, Any]) -> bool:
    app_id = application_id_from_row(row)
    text = normalize_text(
        compact_join(
            [
                app_id,
                task_lookup_value(row, "label", "Label", "applicationLabel"),
                task_lookup_value(row, "currentStage", "Current Stage", "stage", "Stage"),
                task_lookup_value(row, "currentStatus", "Current Status", "status", "Status"),
                task_lookup_value(row, "notes", "Notes"),
            ]
        )
    )
    if not app_id or any(term in text for term in ["smoke", "e2e", "process engine", "test"]):
        return False
    terminal_terms = [
        "cancelled",
        "closed",
        "no further action",
        "completed",
        "complete",
        "done",
        "do not pursue",
        "rejected",
    ]
    return not any(term in text for term in terminal_terms)


def task_belongs_to_application(row: dict[str, Any], app_id: str) -> bool:
    if not app_id:
        return False
    direct = application_id_from_row(row)
    entity = task_lookup_value(row, "entityId", "EntityID")
    text = compact_join([direct, entity, task_lookup_value(row, "sourceTaskId", "Source Task ID")])
    return app_id in text


def is_open_pipeline_task(row: dict[str, Any]) -> bool:
    if task_is_terminal(row):
        return False
    status = normalize_text(task_lookup_value(row, "status", "Status"))
    if any(term in status for term in ["cancelled", "closed", "done", "sent", "submitted", "no further action"]):
        return False
    return bool(task_lookup_value(row, "taskId", "Task ID"))


def active_task_for_application_exists(snapshot: Dashboard | None, app_id: str) -> bool:
    for task in (snapshot or {}).get("tasks", []) or []:
        if isinstance(task, dict) and is_open_pipeline_task(task) and task_belongs_to_application(task, app_id):
            return True
    return False


def active_followup_for_application_exists(snapshot: Dashboard | None, app_id: str) -> bool:
    if not app_id:
        return False
    for follow_up in (snapshot or {}).get("followUps", []) or []:
        if not isinstance(follow_up, dict):
            continue
        status = normalize_text(task_lookup_value(follow_up, "status", "Status"))
        active = normalize_text(task_lookup_value(follow_up, "active", "Active"))
        if status in {"done", "closed", "cancelled", "no further action"} or active in {"false", "0", "no"}:
            continue
        text = compact_join(
            [
                task_lookup_value(follow_up, "applicationId", "ApplicationID", "relatedApplicationId", "Related ApplicationID"),
                task_lookup_value(follow_up, "entityId", "EntityID"),
                task_lookup_value(follow_up, "reason", "Reason"),
                task_lookup_value(follow_up, "nextAction", "Next Action"),
            ]
        )
        if app_id in text:
            return True
    return False


def active_work_for_application_exists(snapshot: Dashboard | None, app_id: str) -> bool:
    return active_task_for_application_exists(snapshot, app_id) or active_followup_for_application_exists(snapshot, app_id)


def next_staff_for_application_stage(app: dict[str, Any]) -> tuple[str, str, str]:
    text = normalize_text(
        compact_join(
            [
                task_lookup_value(app, "currentStage", "Current Stage", "stage", "Stage"),
                task_lookup_value(app, "currentStatus", "Current Status", "status", "Status"),
                task_lookup_value(app, "notes", "Notes"),
            ]
        )
    )
    if any(term in text for term in ["sent", "waiting for reply", "reply received", "follow"]):
        return "AIstaff_FollowUpController", "Follow-up", TASK_CATEGORIES["audit"]
    if any(term in text for term in ["send ready", "outreach", "email", "attachment", "queue", "package verified"]):
        return "AIstaff_ApplicationPackSender", "Outreach", TASK_CATEGORIES["email"]
    if any(term in text for term in ["package", "proposal", "cv", "sop", "document", "portal submission prep"]):
        return "AIstaff_ApplicationPackMaker", "Package", TASK_CATEGORIES["application"]
    if any(term in text for term in ["professor", "supervisor", "research fit", "student outreach"]):
        return "AIstaff_ProfessorResearchAnalyst", "Professor Research", TASK_CATEGORIES["research"]
    if any(term in text for term in ["fit", "eligibility", "opportunity verified", "application created", "data gathering"]):
        return "AIstaff_FitAnalyst", "Fit Review", TASK_CATEGORIES["research"]
    return "AIstaff_Manager", "Manager Guidance", TASK_CATEGORIES["manager"]


def pipeline_entry_work_exists(snapshot: Dashboard | None) -> bool:
    entry_staff = {"AIstaff_OpportunityHunter", "AIstaff_FitAnalyst", "AIstaff_ProfessorResearchAnalyst"}
    for task in (snapshot or {}).get("tasks", []) or []:
        if not isinstance(task, dict) or not is_open_pipeline_task(task):
            continue
        assigned = normalized_staff_id(task_lookup_value(task, "assignedTo", "Assigned To"), "")
        if assigned in entry_staff:
            return True
    wakeups = ((snapshot or {}).get("staffWakeups") or {}).get("byStaff") or {}
    for staff_id in entry_staff:
        try:
            if int((wakeups.get(staff_id) or {}).get("queued") or 0) > 0:
                return True
        except (TypeError, ValueError):
            continue
    for app in (snapshot or {}).get("applications", []) or []:
        if not isinstance(app, dict) or not is_real_pipeline_application(app):
            continue
        stage = normalize_text(
            compact_join(
                [
                    task_lookup_value(app, "currentStage", "Current Stage", "stage", "Stage"),
                    task_lookup_value(app, "currentStatus", "Current Status", "status", "Status"),
                ]
            )
        )
        if any(term in stage for term in ["opportunity verified", "fit", "data gathering", "application created", "professor"]):
            return True
    return False


def ensure_pipeline_continuity(snapshot: Dashboard | None, max_application_gaps: int = 3) -> dict[str, Any]:
    created: list[str] = []
    skipped: list[str] = []
    for app in (snapshot or {}).get("applications", []) or []:
        if not isinstance(app, dict) or not is_real_pipeline_application(app):
            continue
        app_id = application_id_from_row(app)
        if not app_id:
            continue
        if active_work_for_application_exists(snapshot, app_id):
            skipped.append(app_id)
            continue
        if len(created) >= max_application_gaps:
            break
        staff_id, task_type, category = next_staff_for_application_stage(app)
        task_id = "staff_task_pipeline_reconnect_" + safe_task_part(app_id)
        if local_or_pending_task_exists(task_id):
            skipped.append(app_id)
            continue
        queue_action(
            "appendAiStaffTask",
            {
                "taskId": task_id,
                "taskType": task_type,
                "taskCategory": category,
                "taskTemplateId": "template_pipeline_continuity_reconnect",
                "assignedTo": staff_id,
                "createdBy": "AIstaff_Manager",
                "sourceStaff": "AIstaff_Manager",
                "targetStaff": staff_id,
                "entityId": task_lookup_value(app, "entityId", "EntityID") or f"entity_application_{app_id}",
                "relatedApplicationId": app_id,
                "relatedOpportunityId": task_lookup_value(app, "opportunityId", "Opportunity ID", "relatedOpportunityId"),
                "priority": "High",
                "runAfter": iso_like(),
                "dueAt": iso_like(utc_ts() + 4 * 60 * 60),
                "nextAction": (
                    f"Pipeline continuity check found active application {app_id} without an active task or follow-up. "
                    "Review the current stage/status, create the correct next work item, or close/block the application with a specific reason. "
                    "Report the result back to AIstaff_Manager."
                ),
                "completionCriteria": "The application has a clear next task, follow-up, closure, or blocker recorded.",
                "successStatus": "Pipeline Reconnected",
                "failureStatus": "Blocked - Pipeline Gap",
                "status": "Waiting for Codex Worker" if staff_id != "AIstaff_Manager" else "Queued",
                "evidenceLink": "",
                "resultNotes": "Created automatically by the local pipeline continuity guard.",
            },
            method="POST",
            sync_online=False,
        )
        created.append(task_id)

    entry_task_id = "staff_task_pipeline_entry_hunt_" + local_day_key()
    entry_created = False
    if not pipeline_entry_work_exists(snapshot) and not local_or_pending_task_exists(entry_task_id):
        result = queue_action(
            "appendAiStaffTask",
            {
                "taskId": entry_task_id,
                "taskType": "Research",
                "taskCategory": TASK_CATEGORIES["research"],
                "taskTemplateId": "template_pipeline_entry_opportunity_hunt",
                "assignedTo": "AIstaff_OpportunityHunter",
                "createdBy": "AIstaff_Manager",
                "sourceStaff": "AIstaff_Manager",
                "targetStaff": "AIstaff_OpportunityHunter",
                "priority": "High",
                "runAfter": iso_like(),
                "dueAt": iso_like(utc_ts() + 6 * 60 * 60),
                "nextAction": (
                    "No active top-of-pipeline entry work was found. Find 3 verified new funded PhD opportunities aligned with "
                    "Iman's Europe/Krakow/Switzerland finance-energy priorities, add evidence links, and report candidates to AIstaff_Manager."
                ),
                "completionCriteria": "At least 3 official-evidence opportunities are added or a clear blocker is recorded.",
                "successStatus": "Pipeline Entry Added",
                "failureStatus": "Blocked - No Pipeline Entry",
                "status": "Waiting for Codex Worker",
                "resultNotes": "Created automatically by the local pipeline continuity guard because no entry work was active.",
            },
            method="POST",
            sync_online=False,
        )
        entry_created = bool(result.get("ok"))
        if entry_created:
            created.append(entry_task_id)

    return {
        "created": created,
        "skipped": skipped[:30],
        "createdCount": len(created),
        "entryCreated": entry_created,
    }


def sync_from_sheet(bridge_call: BridgeCall, run_audit: bool = False) -> dict[str, Any]:
    previous_snapshot = load_dashboard_snapshot() or {}
    pending = sync_pending_actions(bridge_call)
    dashboard = bridge_call("getAiStaffDashboard", {"limit": 80, "runAudit": "true" if run_audit else "false"}, "GET")
    if dashboard.get("ok") is False:
        error = str(dashboard.get("error") or dashboard.get("message") or "Dashboard sync failed")
        set_meta("last_sync_error", error)
        return {"ok": False, "pending": pending, "error": error}
    if isinstance(dashboard.get("result"), dict):
        dashboard = dashboard["result"]
    sync_source = "local-runtime" if (dashboard.get("localSync") or {}).get("crmSyncStatus") == "local-runtime" else "bridge"
    saved = save_dashboard_snapshot(dashboard, source=sync_source)
    manager_handoffs = ensure_manager_handoffs_for_completed_staff_tasks(saved, previous_snapshot)
    pipeline_continuity = ensure_pipeline_continuity(load_dashboard_snapshot() or saved)
    set_meta("last_sheet_sync", iso_like())
    set_meta("last_sync_error", "")
    return {
        "ok": True,
        "pending": pending,
        "dashboard": True,
        "managerHandoffs": manager_handoffs,
        "pipelineContinuity": pipeline_continuity,
    }


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


def open_codex_work_count() -> int:
    init_db()
    with connect() as conn:
        row = conn.execute(
            """
            SELECT COUNT(*) AS count
            FROM codex_work_items
            WHERE status IN ('Queued', 'Ready', 'Copied', 'In Progress')
            """
        ).fetchone()
    return int((row or {})["count"] or 0) if row else 0


def due_internal_task_count(snapshot: Dashboard | None) -> int:
    now = utc_ts()
    count = 0
    for row in (snapshot or {}).get("tasks", []) or []:
        if not isinstance(row, dict) or task_is_terminal(row):
            continue
        assigned = normalized_staff_id(row.get("assignedTo") or row.get("Assigned To"), "")
        if not assigned or is_human_responsible(assigned):
            continue
        if not task_is_locally_runnable(row):
            continue
        run_after = parse_isoish_to_ts(row.get("runAfter") or row.get("Run After") or row.get("createdAt") or row.get("Created At"))
        if run_after and run_after > now:
            continue
        count += 1
    return count


def runnable_staff_wakeup_count() -> int:
    try:
        return int((staff_wakeup_summary() or {}).get("queued") or 0)
    except Exception:
        return 0


def evaluate_daily_kpi_state(snapshot: Dashboard | None, progress: dict[str, Any]) -> dict[str, Any]:
    targets = autopilot_config()["dailyTargets"]
    internal_due_tasks = due_internal_task_count(snapshot)
    wakeups = runnable_staff_wakeup_count()
    local_runnable = internal_due_tasks + wakeups
    human_review = summary_number(snapshot, "humanTasks")
    open_escalations = summary_number(snapshot, "openEscalations") or summary_number(snapshot, "managerReview")
    waiting_codex = max(summary_number(snapshot, "waitingCodexWorker"), open_codex_work_count())
    pending = local_status().get("pendingActions", 0)
    document_quality = document_quality_status()
    blockers = automation_blockers(snapshot)
    missing_files = int((blockers.get("counts") or {}).get("missingFiles") or 0)
    email_approval = int((blockers.get("counts") or {}).get("externalEmailApproval") or 0)
    worker = local_worker_status()
    checks = {
        "sheetSync": progress.get("sheetSyncs", 0) >= targets["sheetSyncs"],
        "crmHealth": progress.get("crmHealthChecks", 0) >= targets["crmHealthChecks"],
        "localRunnableWorkClear": local_runnable == 0,
        "humanReviewClear": human_review == 0,
        "pendingLocalActionsClear": pending == 0,
        "documentStyleQaClear": int(document_quality.get("issueCount") or 0) == 0,
    }
    if all(checks.values()) and waiting_codex == 0:
        return {"state": "Completed", "reason": "Daily operational KPIs are complete and no local work is waiting.", "checks": checks}
    if local_runnable > 0:
        human_note = f" {human_review} human-facing item(s) are waiting separately." if human_review else ""
        return {
            "state": "Running Internal Work",
            "reason": f"{local_runnable} internal staff item(s) can still run locally.{human_note}",
            "checks": checks | {"openEscalations": open_escalations, "internalDueTasks": internal_due_tasks, "staffWakeups": wakeups},
        }
    if int(document_quality.get("issueCount") or 0) > 0:
        return {"state": "Running Internal Work", "reason": f"{document_quality.get('issueCount')} package document-style issue(s) need QA tasks.", "checks": checks}
    if waiting_codex > 0:
        human_note = f" {human_review} human-facing item(s) also need review." if human_review else ""
        if not worker.get("commandConfigured"):
            return {
                "state": "Waiting For Codex Worker",
                "reason": f"{waiting_codex} Codex work item(s) are ready, but AI_DEPARTMENT_WORKER_COMMAND is not configured.{human_note}",
                "checks": checks,
            }
        return {"state": "Waiting For Codex Worker", "reason": f"{waiting_codex} Codex work item(s) are queued for research/writing.{human_note}", "checks": checks}
    if missing_files > 0:
        return {"state": "Waiting For Missing Files", "reason": f"{missing_files} Lead item(s) are blocked by missing tender files.", "checks": checks}
    if email_approval > 0:
        return {"state": "Waiting For Human Approval", "reason": f"{email_approval} external outreach row(s) need Iman's approval.", "checks": checks}
    if human_review > 0:
        return {"state": "Waiting For Human Approval", "reason": f"{human_review} item(s) need Iman's decision.", "checks": checks}
    return {"state": "Running Internal Work", "reason": "Daily KPIs are not complete yet.", "checks": checks}


def run_autopilot_cycle(bridge_call: BridgeCall, force: bool = False) -> dict[str, Any]:
    init_db()
    config = autopilot_config()
    progress = daily_progress()
    if not config["enabled"] and not force:
        result = {"ok": True, "state": "Paused", "action": "none", "progress": progress}
        record_worker_run("Autopilot", "Paused", "No action", result)
        return result

    snapshot = load_dashboard_snapshot()
    continuity = {"createdCount": 0}
    if snapshot:
        continuity = ensure_pipeline_continuity(snapshot)
        if continuity.get("createdCount"):
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
            if snapshot:
                continuity = ensure_pipeline_continuity(snapshot)
                if continuity.get("createdCount"):
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
        elif due_internal_task_count(snapshot) + runnable_staff_wakeup_count() > 0:
            action = "run_due_task"
            result = bridge_call("runAiStaffTaskRunner", {"maxItems": 1}, "POST")
            progress["runnerAttempts"] = int(progress.get("runnerAttempts", 0)) + 1
            processed = int((result.get("result") or result).get("processed") or 0) if isinstance(result, dict) else 0
            progress["tasksProcessed"] = int(progress.get("tasksProcessed", 0)) + processed
            sync_from_sheet(bridge_call, run_audit=False)
            snapshot = load_dashboard_snapshot()
        elif open_codex_work_count() > 0:
            action = "run_local_codex_worker"
            result = run_local_worker_once(force=False)
            processed = int(result.get("processed") or 0) if isinstance(result, dict) else 0
            progress["tasksProcessed"] = int(progress.get("tasksProcessed", 0)) + processed
            snapshot = load_dashboard_snapshot()
        elif not has_waiting_codex_task(snapshot) and open_codex_work_count() == 0 and int(progress.get("codexTasksQueued", 0)) < config["dailyTargets"]["codexTasksQueuedWhenIdle"]:
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
            result = {"ok": True, "message": state["reason"], "pipelineContinuity": continuity}

        state = evaluate_daily_kpi_state(snapshot, progress)
        progress["state"] = state["state"]
        progress["reason"] = state["reason"]
        save_daily_progress(progress)
        record_worker_run("Autopilot", state["state"], action, result, state["reason"])
        return {
            "ok": True,
            "state": state["state"],
            "reason": state["reason"],
            "action": action,
            "result": result,
            "progress": progress,
            "pipelineContinuity": continuity,
        }
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
    terminal_states = {"Completed", "Waiting For Human Approval", "Waiting For Missing Files", "Waiting For Codex Worker", "Paused", "Error"}
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
        if action == "run_local_codex_worker":
            nested = result.get("result") if isinstance(result.get("result"), dict) else {}
            if int(nested.get("processed") or 0) <= 0:
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
            if progress.get("state") in ["Completed", "Waiting For Human Approval", "Waiting For Missing Files", "Waiting For Codex Worker"]:
                sleep_for = max(sleep_for, 30 * 60)
            time.sleep(sleep_for)

    thread = threading.Thread(target=worker, name="SwissPlannerDailyAutopilot", daemon=True)
    thread.start()


def start_local_worker_loop(interval_seconds: int = 30) -> None:
    def worker() -> None:
        time.sleep(10)
        while True:
            try:
                if local_worker_enabled() and local_worker_command() and open_codex_work_count() > 0:
                    run_local_worker_once(force=False)
            except Exception as exc:
                set_meta("local_worker_last_error", str(exc))
                record_worker_run("Local Worker", "Error", "cycle", str(exc))
            time.sleep(max(10, int(interval_seconds or 30)))

    thread = threading.Thread(target=worker, name="AIdepartmentLocalCodexWorker", daemon=True)
    thread.start()
