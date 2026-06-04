# AIdepartment

The structure of a single AI department in which there are multiple AI staff working under an AI manager.

This repository currently contains the GCC lab AI department command center: a local Windows command center for monitoring and running an AI department.

## Main Components

- `swiss_planner_command_center/`: local Python + buildless React dashboard at `http://127.0.0.1:8765/`.
- `gmail_bridge/`: optional legacy Apps Script bridge. The default operational engine is now local Python/SQLite.
- `skills/swiss-planner-staff/`: Codex skill and role files for the AI staff operating model.

## Local Setup

1. Install Python 3.10+.
2. Optional: copy `.env.example` to `.env.local` if you want local Manager Brain, SMTP, or legacy bridge settings.
3. Start the dashboard by double-clicking `swiss_planner_command_center/start_command_center.cmd`, or run:

```powershell
python .\swiss_planner_command_center\server.py
```

4. Open:

```text
http://127.0.0.1:8765/
```

The local database is created at `swiss_planner_command_center/swiss_planner_local.db` and is intentionally ignored by Git.

For a clean setup on another Windows computer, use [docs/INSTALL_ON_NEW_SYSTEM.md](docs/INSTALL_ON_NEW_SYSTEM.md).

## Optional Bridge Setup

The dashboard now runs through the local runtime without Google Apps Script. To re-enable online CRM/Gmail sync later, deploy `gmail_bridge/Code.gs` as a standalone Apps Script project from the Gmail account that owns the bridge, then explicitly enable it:

```text
SWISS_PLANNER_USE_APPS_SCRIPT_BRIDGE=true
SWISS_PLANNER_WEBHOOK_URL
SWISS_PLANNER_WEBHOOK_TOKEN
```

The dashboard also supports the older local `run_swiss_planner_bridge.cmd` fallback, but that file is machine-specific and ignored by Git.

## Verification

```powershell
python -m py_compile .\swiss_planner_command_center\server.py .\swiss_planner_command_center\local_store.py
```

Then open the local dashboard and confirm the Reports, Tasks, Leads, and Department Explorer pages load.

## Source-Control Safety

This repository intentionally excludes:

- local environment files and tokens;
- local SQLite data;
- generated tender packages, PDFs, DOCX, EML, ZIP files;
- machine-specific command shortcuts and scripts;
- separate/reference repositories in the workspace.

See `GITHUB_HANDOFF.md` before pushing future updates.
