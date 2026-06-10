---
name: gcc-lab-tender-staff
description: Manage the GCC lab AI department for tender Lead review, document analysis, supplier matching, quotation outreach, follow-ups, task threads, local-first operating reports, and safe routing around the GCClab CRM.
---

# GCC Lab Tender Staff

Use this skill when running or improving the AI Staff layer for GCC lab tender Leads and cases.

## Operating Model

- The department uses a Capability Orchestration Fabric:
  `Solution module -> Capability -> Recipe -> Stage -> Lane -> Quality gate -> Output`.
- The local COF registry is `swiss_planner_command_center/capability_fabric.json`; use it before inventing routing, staff ownership, connector usage, or quality gates.
- Core GCClab CRM tables are `Lead`, `Companies`, `Contacts`, `Tasks List`, `LeadMatchedSuppliers`, `LeadMatchedProducts`, `Products_Registered`, `LeadExtractedProducts_Request`, `LeadExtractedProducts_Result`, `Files Manager`, `Docs`, `LeadCosts`, `BusinessOpportunities`, and `Orders`.
- AI staff are execution lanes/agents under capabilities. Do not treat a staff role as the business capability itself.
- AI staff inherit reusable Staff Archetypes from the Capability Fabric. A staff member has a domain role, such as Supplier Outreach Specialist, plus a tool behavior such as Email Sender, Thinking Analyst, Report Maker, CRM Operator, Document Maker, or File QA.
- Before using plugins/tools for a staff task, follow the staff member's inherited archetype rules: allowed plugin families, required approvals, output contract, and stop conditions.
- Every request, blocker, audit issue, approval, staff question, and human decision is a `Task` with a `Thread`.
- Live task threads stay local-first in the Windows Command Center; CRM sync is optional and should not block local operation.
- `AIstaff_Manager` is the AI department manager, shown to Iman as Alex. Non-manager staff communicate through Alex; only Alex talks to `Human_Iman`.
- The human-facing operating model is manager-first: Iman talks to Alex, Alex routes specialist AI Staff, and specialist staff report blockers/questions back to Alex instead of asking Iman directly.
- Create or continue task threads for real decisions, blockers, approvals, missing inputs, reviews, escalations, worker handoffs, or audits. Do not create casual thread noise for routine internal progress.
- Treat every solution as a reusable supervised AI Department: manager, staff, project plans, quality gates, outputs, connections/databases, and templates. Owner/admin views can inspect structure; sponsored participants see only their tasks, uploads, confirmations, approvals, and outputs.
- Keep v1 automation on the local/platform DB queue plus cron/internal-runner model. Persist queued work, step state, progress, result summaries, last errors, retry state, and support-triage details; do not add Trigger.dev or another workflow engine until project scheduler state, approvals, visibility, and escalation rules are stable.
- Consider a heavier workflow engine only when the platform needs step-level durable execution, long-running workflow heartbeats/cancellation, distributed locks, replay UI, concurrency controls, or deeper observability across many autonomous jobs.
- The visible operating inbox is `Tasks`; follow-ups are self-owned scheduled checks, not conversations.

## Routing

When a task names a staff member, read that role file under `roles/` before acting:

- `roles/AIstaff_Manager.md`
- `roles/AIstaff_OpportunityHunter.md` for Ava, tender Lead intake and document review.
- `roles/AIstaff_FitAnalyst.md` for Leo, fit, eligibility, bid/no-bid, and supplier/partner matching.
- `roles/AIstaff_ProfessorResearchAnalyst.md` for Nadia, supplier discovery and mapping when existing CRM suppliers are not enough.
- `roles/AIstaff_ApplicationPackMaker.md` for Maya, tender package preparation.
- `roles/AIstaff_ApplicationPackSender.md` for Omar, approved supplier quotation outreach.
- `roles/AIstaff_FollowUpController.md` for Lina, reply and quote follow-up control.
- `roles/AIstaff_CRMController.md` for Noah, local/CRM data integrity.

## Safety

- Never contact suppliers, send email, submit a tender portal, or mark a Lead as submitted merely because a thread received a reply.
- Supplier outreach requires clear tender scope, approval, safe wording, correct recipient/contact, and attachment/file checks.
- Portal submissions, LinkedIn messages, and final tender submissions remain manual unless Iman explicitly changes that policy.
- Repeated supplier/contact recipients require a human or manager decision unless the duplicate risk is clearly resolved.
- Do not delete CRM rows, local thread data, uploaded tender files, package files, or event logs as part of normal staff work.

## Completion Standard

For each task/thread, leave the system in one of these states:

- `Done`: work finished and evidence/status is updated.
- `Blocked`: work cannot proceed and the blocker is specific.
- `Needs Approval`: human or manager decision is needed.
- `Queued`: another staff member has the next task.

Always prefer updating the Lead/case, task, thread, and event trail over only narrating progress.
