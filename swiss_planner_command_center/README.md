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

- Runs in local-first mode: the dashboard reads from a Windows SQLite database and syncs with Google Sheets hourly.
- Stores newly created staff tasks, comments, and KPIs locally first, then pushes them to the Swiss Planner workbook during the next sync.
- Runs a daily Windows autopilot loop while the Command Center is open. The autopilot keeps working until daily flow KPIs are complete, or until the next action is blocked by Codex work or human review.
- Shows active entities, due tasks, late follow-ups, manager review items, and sent emails.
- Shows one card per AI staff member.
- Lets Iman run one due item at a time.
- Lets Iman run CRM health and audit checks.
- Lets Iman record manager comments into `AI Staff Decisions`.
- Lets Iman process one selected email queue row, while the bridge still enforces package, attachment, approval, and duplicate-recipient safety.
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

The Google Sheet remains the shared CRM/AppSheet source, but the Windows dashboard no longer needs to call Apps Script on every refresh. Use **More -> Sync Sheet Now** when you want to push/pull immediately instead of waiting for the hourly sync.

## Daily Autopilot

The Daily Autopilot checks the local dashboard every few minutes and safely advances the flow:

- syncs local changes to Google Sheets;
- runs one CRM health cycle per day;
- runs due local operational tasks one at a time;
- queues a Codex Worker research task when the day is idle but daily flow still needs thinking work;
- stops active pushing when the day is complete, waiting for Codex writing/research, or waiting for human approval.

It never bypasses email/package safety checks. Professor/university emails still depend on the existing approved queue, package completeness, attachment verification, and duplicate-recipient guardrails.

## Required Bridge Action

The dashboard reads bridge configuration from these environment variables first:

```text
SWISS_PLANNER_WEBHOOK_URL
SWISS_PLANNER_WEBHOOK_TOKEN
```

If they are not set, it reads the same keys from the repository-local `.env.local` file. If neither source exists, it falls back to the local `run_swiss_planner_bridge.cmd` file. That fallback is useful on Iman's Windows machine, but it is intentionally not a GitHub source file.

The Apps Script bridge must include:

```text
getAiStaffDashboard
```

If the dashboard says that action is unknown, run `copy_swiss_planner_bridge_code.cmd`, update Apps Script `Code.gs`, save, and redeploy the web app.

The v2 controls also require these bridge actions:

```text
reassignAiStaffTask
snoozeAiStaffTask
snoozeAiStaffFollowUp
closeAiStaffEntity
updateEmailQueueApproval
```
