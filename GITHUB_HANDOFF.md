# GitHub Handoff Notes

This folder is being prepared as a safe source repository for the Swiss Planner AI Staff Command Center.

## What Should Be Tracked

Recommended GitHub contents:

- `.gitignore`
- `.env.example`
- `README.md`
- `GITHUB_HANDOFF.md`
- `swiss_planner_command_center/`
- `gmail_bridge/`
- `skills/swiss-planner-staff/`

## What Must Stay Local

Do not commit:

- `.env.local`
- `.tmp_new_webhook_token.txt`
- `swiss_planner_command_center/swiss_planner_local.db`
- `Application Packages/`
- `test_output_package/`
- generated PDFs, DOCX, EML files, ZIP archives, and screenshots;
- root-level local `.cmd` / `.ps1` files with absolute paths or deployment URLs;
- `Implementation_Musahama/`, which is a separate reference repository.

## Secret Handling

The app should use environment variables for bridge access:

```text
SWISS_PLANNER_WEBHOOK_URL
SWISS_PLANNER_WEBHOOK_TOKEN
```

OpenAI manager-brain credentials should also remain local:

```text
SWISS_PLANNER_OPENAI_API_KEY
```

Never commit webhook tokens, AppSheet keys, OpenAI API keys, Gmail credentials, or personal Drive package files.

## Suggested Git Steps Later

After reviewing the ignored/untracked files:

```powershell
git init
git status --short --ignored
git add .gitignore .env.example README.md GITHUB_HANDOFF.md swiss_planner_command_center gmail_bridge skills/swiss-planner-staff
git status --short
git commit -m "Prepare Swiss Planner AI Staff command center"
```

After Iman provides GitHub plugin/repository access, push this commit to the selected repository and open a review branch or pull request.

## Verification Before Push

Run:

```powershell
python -m py_compile .\swiss_planner_command_center\server.py .\swiss_planner_command_center\local_store.py
git status --short --ignored
```

Then scan the staged files for sensitive strings before committing.
