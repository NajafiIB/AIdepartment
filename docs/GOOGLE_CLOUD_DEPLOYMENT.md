# Google Cloud Deployment

This app is deployed as a lightweight Python/React control plane on a Compute Engine VM.

## Current Target

- Project: `gen-lang-client-0082422976`
- VM: `ai-department-vm`
- Zone: `europe-central2-a`
- Disk: 80 GB `pd-balanced`
- Static IP: `34.116.169.217`
- Public URL: `https://deptest.apastrof.com/`
- App path: `/opt/ai-department`
- Runtime data: `/var/lib/ai-department/swiss_planner_local.db`
- Service: `ai-department.service`
- Local app port: `8765`
- Nginx hostname: `deptest.apastrof.com`
- TLS: Let's Encrypt via Certbot, auto-renewed by `certbot.timer`

## DNS

Create this DNS record:

```text
Type: A
Host: deptest
Value: 34.116.169.217
TTL: Automatic or 300 seconds
```

The IP has been promoted to a static Google Cloud regional address named `ai-department-ip`.

## Runtime Environment

Set production values in `/etc/ai-department/env` on the VM. Do not commit secrets.

```bash
AI_DEPARTMENT_HOST=127.0.0.1
AI_DEPARTMENT_PORT=8765
AI_DEPARTMENT_OPEN_BROWSER=false
AI_DEPARTMENT_DB_PATH=/var/lib/ai-department/swiss_planner_local.db
SWISS_PLANNER_COMMAND_CENTER_URL=http://127.0.0.1:8765/

WINDMILL_BASE_URL=
WINDMILL_WORKSPACE=
WINDMILL_TOKEN=
WINDMILL_MCP_URL=
WORLDBC_WORDPRESS_MAKE_WEBHOOK_URL=
```

Use Google Secret Manager for long-lived API keys and inject them into this environment file or a future deployment pipeline.

## Service Commands

```bash
sudo systemctl status ai-department
sudo systemctl restart ai-department
sudo journalctl -u ai-department -f
sudo certbot certificates
sudo systemctl status certbot.timer
```

## GitHub Auto Deploy

GitHub Actions deploys merged PRs to the VM through `.github/workflows/deploy-ai-department.yml`.

Trigger behavior:

- Runs on every `push` to `main`.
- A merged pull request deploys because GitHub creates a trusted push to `main`.
- Can also be run manually from GitHub Actions with `workflow_dispatch`.
- Does not deploy from the `pull_request` event itself, because fork/PR contexts may not receive the GitHub OIDC token required for Google Cloud authentication.

The workflow:

1. Checks out the repo.
2. Runs Python compile checks.
3. Runs `node --check` for `react-app.js`.
4. Builds a source-only tarball that excludes `.env*`, local SQLite DBs, logs, backups, and generated runtime folders.
5. Uploads the tarball to `ai-department-vm`.
6. Extracts it as a release under `/opt/ai-department-releases/<commit-sha>`.
7. Points `/opt/ai-department` to that release.
8. Restarts `ai-department.service`.
9. Verifies `https://deptest.apastrof.com/` and `/api/windmill/status`.

Runtime state and secrets are not overwritten:

- `/var/lib/ai-department/swiss_planner_local.db`
- `/etc/ai-department/env`
- Nginx and Certbot configuration

GitHub authenticates to Google Cloud through Workload Identity Federation:

- Service account: `ai-department-deployer@gen-lang-client-0082422976.iam.gserviceaccount.com`
- Provider: `projects/998539683150/locations/global/workloadIdentityPools/github-actions/providers/github-ai-department`

## Deployment Notes

- `capability_fabric.json` remains the source of truth for catalog definitions.
- SQLite remains runtime state only.
- Windmill should own external automation execution.
- The AI Department app should stay the client-facing control plane, approval layer, task/project view, and result viewer.
