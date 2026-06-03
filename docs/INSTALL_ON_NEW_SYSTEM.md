# Install AIdepartment On A New Windows System

This guide is for downloading the AI Department Command Center from GitHub and running it on another Windows machine.

## 1. Install Requirements

Install:

- Python 3.10 or newer
- Git for Windows
- A browser such as Chrome or Edge

No Node.js build step is required. The dashboard uses buildless React from the checked-in source files.

## 2. Download The Repository

Open PowerShell and run:

```powershell
git clone https://github.com/NajafiIB/AIdepartment.git
cd AIdepartment
```

If you downloaded the ZIP from GitHub instead, extract it and open PowerShell in the extracted folder.

## 3. Configure Local Secrets

This step is optional. The command center runs in local-only mode without Google Apps Script. Copy the environment template only if you want to add Manager Brain settings or re-enable online CRM/Gmail sync later:

```powershell
Copy-Item .env.example .env.local
```

For online CRM/Gmail sync, open `.env.local` and fill:

```text
SWISS_PLANNER_WEBHOOK_URL=
SWISS_PLANNER_WEBHOOK_TOKEN=
```

Optional Manager Brain settings are also listed in `.env.example`.

Keep `.env.local` private. It is ignored by Git.

## 4. Start The Command Center

Double-click:

```text
swiss_planner_command_center\start_command_center.cmd
```

Or run:

```powershell
python .\swiss_planner_command_center\server.py
```

The browser should open:

```text
http://127.0.0.1:8765/
```

## 5. Verify The Setup

Run:

```powershell
python -m py_compile .\swiss_planner_command_center\server.py .\swiss_planner_command_center\local_store.py
```

Then open:

```text
http://127.0.0.1:8765/api/department-config
```

You should see JSON with:

- `departmentTemplates`
- `staffProfiles`
- `capabilities`
- `qualityGates`
- `errors: 0` in the summary

## 6. What Is Local And Not In Git

The following are created locally and are intentionally not committed:

- `.env.local`
- `swiss_planner_command_center\swiss_planner_local.db`
- `backups\`
- generated application packages
- local shortcuts and machine-specific scripts
- downloaded PDFs/DOCX/ZIP files

## 7. Updating Later

From the repository folder:

```powershell
git pull
```

Then restart the Command Center.

## 8. Troubleshooting

If the app says bridge settings are missing:

- check `.env.local`;
- confirm the webhook URL and token are correct;
- confirm the Apps Script deployment is active.

If port `8765` is already in use, another Command Center window may already be running. Close the old command window and start again.
