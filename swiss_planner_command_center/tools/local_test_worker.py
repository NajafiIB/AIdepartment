from __future__ import annotations

import json
import sys
from datetime import datetime, timezone


def main() -> int:
    raw = sys.stdin.read()
    try:
        item = json.loads(raw or "{}")
    except json.JSONDecodeError as exc:
        print(
            json.dumps(
                {
                    "status": "Blocked",
                    "resultSummary": "Local test worker could not parse the work item JSON.",
                    "evidenceLink": "",
                    "lastError": str(exc),
                }
            )
        )
        return 0

    title = item.get("title") or "Untitled work item"
    staff = item.get("assignedStaff") or "AIstaff_Manager"
    work_item_id = item.get("workItemId") or "unknown"
    context = item.get("context") or {}
    source_task = context.get("sourceTask") if isinstance(context, dict) else {}
    next_action = ""
    if isinstance(source_task, dict):
        next_action = source_task.get("nextAction") or source_task.get("completionCriteria") or ""
    result = {
        "status": "Done",
        "resultSummary": (
            f"Local test worker completed internal analysis for {title}. "
            f"Assigned staff: {staff}. Work item: {work_item_id}. "
            f"No supplier email, tender submission, CRM write, or external side effect was performed. "
            f"Next action reviewed: {str(next_action)[:500] or 'not provided'}"
        ),
        "evidenceLink": f"local-test-worker://{work_item_id}/{datetime.now(timezone.utc).isoformat()}",
        "lastError": "",
    }
    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
