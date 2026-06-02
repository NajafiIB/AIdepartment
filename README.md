# Swiss Planner AI Staff Command Center

Local Windows command center for the Swiss Planner AI Staff workflow. It monitors application opportunities, AI staff tasks, task threads, package preparation, Gmail bridge safety checks, and manager-readable reports for Iman Najafi's PhD application process.

## Main Components

- `swiss_planner_command_center/`: local Python + buildless React dashboard at `http://127.0.0.1:8765/`.
- `gmail_bridge/`: Apps Script bridge for Google Sheets, Gmail, Drive package checks, and email queue safety.
- `skills/swiss-planner-staff/`: Codex skill and role files for the AI staff operating model.

## Local Setup

1. Install Python 3.10+.
2. Set local environment variables from `.env.example`.
3. Start the dashboard:

```powershell
python .\swiss_planner_command_center\server.py
```

4. Open:

```text
http://127.0.0.1:8765/
```

The local database is created at `swiss_planner_command_center/swiss_planner_local.db` and is intentionally ignored by Git.

## Bridge Setup

Deploy `gmail_bridge/Code.gs` as a standalone Apps Script project from the Gmail account that owns the bridge. Store the real webhook URL and token outside Git, then expose them locally as:

```text
SWISS_PLANNER_WEBHOOK_URL
SWISS_PLANNER_WEBHOOK_TOKEN
```

The dashboard also supports the older local `run_swiss_planner_bridge.cmd` fallback, but that file is machine-specific and ignored by Git.

## Verification

```powershell
python -m py_compile .\swiss_planner_command_center\server.py .\swiss_planner_command_center\local_store.py
```

Then open the local dashboard and confirm the Reports, Tasks, Applications, and Department Explorer pages load.

## Source-Control Safety

This repository intentionally excludes:

- local environment files and tokens;
- local SQLite data;
- generated application packages, PDFs, DOCX, EML, ZIP files;
- machine-specific command shortcuts and scripts;
- separate/reference repositories in the workspace.

See `GITHUB_HANDOFF.md` before pushing to GitHub.
