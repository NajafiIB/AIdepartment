# Swiss Planner AI Staff Command Center

Local Windows dashboard for monitoring and running the Swiss Planner AI Staff workflow.

## Start

Run:

```bat
swiss_planner_command_center\start_command_center.cmd
```

For a portable GitHub clone, you can also run:

```powershell
python .\swiss_planner_command_center\server.py
```

The dashboard opens at:

```text
http://127.0.0.1:8765/
```

## Desktop Shortcut

Run once:

```bat
create_swiss_planner_command_center_desktop_shortcut.cmd
```

This creates a Windows Desktop shortcut named `Swiss Planner Command Center`.

## What It Does

- Runs in local-runtime mode by default: the dashboard reads and writes to a Windows SQLite database and does not require Google Apps Script.
- Stores newly created staff tasks, comments, KPIs, package checks, and local email status in SQLite first.
- Runs a daily Windows autopilot loop while the Command Center is open. The autopilot keeps working until daily flow KPIs are complete, or until the next action is blocked by Codex work or human review.
- Shows active entities, due tasks, late follow-ups, manager review items, and sent emails.
- Shows one card per AI staff member.
- Lets Iman run one due item at a time.
- Lets Iman run local CRM health and audit checks.
- Lets Iman record manager comments into `AI Staff Decisions`.
- Lets Iman process one selected email queue row locally. The local runtime enforces package, attachment, approval, content, and document-style safety. If SMTP is not configured, it creates a local `.eml` draft instead of sending.
- Shows an application pipeline board.
- Lets Iman create a staff task from the dashboard.
- Lets Iman snooze tasks/follow-ups, reassign tasks to the manager, close entities, and approve one selected email row.
- Can show browser notifications when manager review items appear.
- Shows Daily Autopilot status: Active, Completed, Waiting for Codex Worker, Waiting for Human Review, Paused, or Error.

## Local Database

The local working database is:

```text
swiss_planner_command_center\swiss_planner_local.db
```

SQLite is now the operational source of truth. Google Sheets/Apps Script can be enabled as an optional legacy export/import bridge, but the Windows dashboard no longer depends on it for task running, package safety, queue checks, or KPI cycles.

## Daily Autopilot

The Daily Autopilot checks the local dashboard every few minutes and safely advances the flow:

- runs local health and continuity checks;
- runs due local operational tasks one at a time;
- queues a Codex Worker research task when the day is idle but daily flow still needs thinking work;
- stops active pushing when the day is complete, waiting for Codex writing/research, or waiting for human approval.

It never bypasses email/package safety checks. Professor/university emails still depend on approval, package completeness, attachment verification, content safety, document template/style QA, and duplicate-recipient guardrails.

## Local Runtime And Optional Legacy Bridge

Apps Script is optional and disabled by default. To use the old Google Apps Script bridge, set:

```text
SWISS_PLANNER_USE_APPS_SCRIPT_BRIDGE=true
SWISS_PLANNER_WEBHOOK_URL=...
SWISS_PLANNER_WEBHOOK_TOKEN=...
```

If `SWISS_PLANNER_USE_APPS_SCRIPT_BRIDGE` is not `true`, webhook settings are ignored and the local runtime handles operations.

## Local Email Sending

The local runtime can send through SMTP when configured:

```text
SWISS_PLANNER_SMTP_HOST=
SWISS_PLANNER_SMTP_PORT=587
SWISS_PLANNER_SMTP_USER=
SWISS_PLANNER_SMTP_PASSWORD=
SWISS_PLANNER_SMTP_FROM=
SWISS_PLANNER_SMTP_USE_TLS=true
```

If SMTP is not configured, `processQueueRow` creates a local `.eml` draft under:

```text
outbox\
```

This keeps sending safe and local without depending on Apps Script.
