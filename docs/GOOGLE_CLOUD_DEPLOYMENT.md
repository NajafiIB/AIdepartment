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

## Deployment Notes

- `capability_fabric.json` remains the source of truth for catalog definitions.
- SQLite remains runtime state only.
- Windmill should own external automation execution.
- The AI Department app should stay the client-facing control plane, approval layer, task/project view, and result viewer.
