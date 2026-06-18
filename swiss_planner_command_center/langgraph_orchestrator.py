from __future__ import annotations

from typing import Any


GRAPH_NAME = "ai_department_langgraph_v1"
GRAPH_NODES = [
    "manager_intake",
    "resolve_context",
    "staff_router",
    "specialist_work",
    "qa_gate",
    "approval_gate",
    "activity_request",
    "manager_summary",
]


def langgraph_package_status() -> dict[str, Any]:
    try:
        import langgraph  # type: ignore

        return {
            "installed": True,
            "version": str(getattr(langgraph, "__version__", "unknown")),
            "mode": "langgraph_available",
        }
    except Exception as exc:
        return {
            "installed": False,
            "version": "",
            "mode": "local_graph_fallback",
            "missingReason": str(exc),
        }


def next_node(current_node: str, state: dict[str, Any]) -> str:
    if current_node == "qa_gate":
        return "approval_gate" if state.get("approvalRequired") else "manager_summary"
    if current_node == "approval_gate":
        return "activity_request" if state.get("approvalState") == "Approved" else "approval_gate"
    if current_node == "activity_request":
        return "manager_summary" if state.get("activityStatus") in {"Done", "Mock Done"} else "activity_request"
    try:
        index = GRAPH_NODES.index(current_node)
    except ValueError:
        return "manager_intake"
    return GRAPH_NODES[min(index + 1, len(GRAPH_NODES) - 1)]


def terminal_status(node: str, state: dict[str, Any]) -> str:
    if state.get("blocked"):
        return "Blocked"
    if node == "approval_gate" and state.get("approvalRequired") and state.get("approvalState") != "Approved":
        return "Waiting Approval"
    if node == "activity_request" and state.get("activityStatus") == "Needs Configuration":
        return "Needs Configuration"
    if node == "manager_summary":
        return "Completed"
    return "In Progress"
