---
name: swiss-planner-staff
description: Manage Iman Najafi's Swiss Planner AI staff operating system, including KPI cycles, task-thread inboxes, staff routing, escalations, process audits, skill-update candidates, and safe coordination between research, application packages, Drive, Sheets, and Gmail bridge workflows.
---

# Swiss Planner Staff

Use this skill when running or improving the AI Staff layer above `swiss-planner-research`, `swiss-planner-apply`, the Swiss Planner workbook, Drive package folders, and the Gmail bridge.

## Operating Model

- Swiss Planner uses a Capability Orchestration Fabric:
  `Solution module -> Capability -> Recipe -> Stage -> Lane -> Quality gate -> Output`.
- Supporting inputs feed stage/lane work:
  `Databases + Connections + AI Support -> Stage/Lane`.
- The local COF registry is `swiss_planner_command_center/capability_fabric.json`; use it before inventing routing, staff ownership, connector usage, or quality gates.
- The same COF registry also stores editable Markdown operating notes under `operatingNotes` for Work Map, Lanes & Tools, Quality Gates, Data & Connectors, AI Brain, Output Templates, and Learning Library. Use those notes as the human-maintained practical instructions for how the registry should be applied.
- AI staff are execution lanes/agents under capabilities. Do not treat a staff role as the business capability itself.
- Every request, blocker, audit issue, approval, staff question, and human decision is a `Task` with a `Thread`.
- `AI Staff Tasks` is the canonical delegated work table.
- Live task threads stay local-first in the Windows Command Center; upload the related task/thread transcript to the online CRM when the thread is closed.
- `AI Staff Follow Ups` is only for self-owned scheduled checks, not conversations.
- The KPI table is the base plan. If all executable tasks/follow-ups are done, no Codex work is waiting, and no active opportunity path remains, `AIstaff_Manager` must create a Human Decision thread asking `Human_Iman` to set or adjust the KPI plan before the cycle silently stops.
- The visible operating inbox is `Tasks`; `Manager Review` is deprecated as a separate workflow.
- Task categories are: `Human Decision`, `Manager Guidance`, `System Audit`, `Technical Bug`, `Email Safety`, `Application Work`, and `Research Work`.
- `AIstaff_Manager` is the AI department manager, currently shown to Iman as Alex. It receives and sends tasks like other staff and escalates only unclear, risky, or outside-system issues to `Human_Iman`.
- Routing rule: non-manager AI staff send tasks/messages only to `AIstaff_Manager`; only `AIstaff_Manager` may create human-facing tasks/messages for `Human_Iman`.
- Activation rule: assigning a task or replying in a thread creates a local staff wake-up for the target AI staff. Human messages to Alex must be interpreted by the Manager Brain first, then routed to specialist staff when needed. The online CRM receives the task/thread archive only after the thread closes.

## Routing

When a task names a staff member, read that role file under `roles/` before acting:

- `roles/AIstaff_Manager.md`
- `roles/AIstaff_OpportunityHunter.md`
- `roles/AIstaff_FitAnalyst.md`
- `roles/AIstaff_ProfessorResearchAnalyst.md`
- `roles/AIstaff_ApplicationPackMaker.md`
- `roles/AIstaff_ApplicationPackSender.md`
- `roles/AIstaff_FollowUpController.md`
- `roles/AIstaff_CRMController.md`

Use `swiss-planner-research` for opportunity discovery, evidence, fit rows, professor/student leads, and CRM research updates. Use `swiss-planner-apply` for CV/SOP/proposal/package/outreach document quality.

For COF details, read `references/capability-orchestration-fabric.md`.

## Safety

- Never send an email merely because a thread received a reply.
- Email sending still goes through the Gmail bridge queue, content safety, package completeness, attachment verification, and send-mode rules.
- Portal submissions and LinkedIn sends remain manual unless Iman explicitly changes that policy.
- Repeated professor or supervisor recipients require a human thread unless the duplicate risk is clearly resolved.
- Professor-facing documents must pass the Document Template Style gate before upload/send. Local minimal-renderer PDFs are internal drafts unless a style QA marker or approved manifest explicitly permits external use.
- Do not delete workbook rows, Drive files, package files, or event logs as part of normal staff work.

## Learning

- Closed threads may create a `Skill Update Candidate`.
- Do not rewrite staff role files automatically.
- Only apply a learning after `Human_Iman` approves it.
- Approved learnings are appended to the target role file under `## Approved Learnings`.

## Completion Standard

For each task/thread, leave the system in one of these states:

- `Done`: work finished and evidence/status is updated.
- `Blocked`: work cannot proceed and the blocker is specific.
- `Needs Approval`: human or manager decision is needed.
- `Queued`: another staff member has the next task.

Always prefer updating the entity, task, thread, and event trail over only narrating progress.
