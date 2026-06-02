# Swiss Planner Staff Operating Rules

## Source Systems

Swiss Planner workbook:

`https://docs.google.com/spreadsheets/d/18scZfr6_DHSOfjCJvR14RLdnU1n6zgmJQoDb4WkfSzg/edit`

Applicant folder:

`D:\personal\Iman Apply\115. NJ_Switzerland`

Prepared package Drive root:

`10. Swiss Planner Applications`

Gmail Bridge deployment:

`YOUR_WEBHOOK_URL`

Do not print or expose webhook tokens, AppSheet keys, or private credentials.

## Staff Workbook Tabs

### AI Staff Dashboard

The first visibility layer for Iman and the Manager. It summarizes:

- active AI-owned entities;
- queued due tasks;
- active follow-ups due now;
- follow-ups delayed more than 3 hours;
- blocked or review-needed entities;
- approved email rows not yet sent;
- latest run and report summary;
- due task list;
- delayed follow-up list;
- blocked/review entity list;
- latest report rows.

### AI Staff KPIs

Columns:

1. KPI ID
2. Period Type
3. Start Date
4. End Date
5. Target Unit
6. Target Count
7. Geography Priority
8. Field Priority
9. Minimum Fit Score
10. Required Evidence Level
11. Status
12. Owner Notes

Allowed period types: `Daily`, `Weekly`, `Monthly`, `Final`.

Allowed target units:

- `Opportunities`
- `Professor Research Fit`
- `Student Contacts`
- `Packages`
- `Outreach Drafts`
- `Follow-ups`
- `Sent Emails`
- `Replies`
- `Applications Submitted`

### AI Staff Tasks

Columns:

1. Task ID
2. Created At
3. Task Type
4. Task Template ID
5. Assigned To
6. Created By
7. EntityID
8. Related Opportunity ID
9. Related ApplicationID
10. KPI ID
11. Priority
12. Run After
13. Due At
14. Deadline
15. Depends On
16. Status
17. Next Action
18. Completion Criteria
19. Success Status
20. Failure Status
21. Last Error
22. Evidence Link
23. Completed At
24. Result Notes

Task types: `Research`, `Fit Review`, `Package`, `Outreach`, `Follow-up`, `CRM Health`, `Report`.

Statuses: `Queued`, `Running`, `Done`, `Blocked`, `Needs Approval`.

### AI Staff Entities

Columns:

1. EntityID
2. Entity Type
3. Related ID
4. Related Opportunity ID
5. Related ApplicationID
6. Current Stage
7. Current Status
8. Responsible Staff
9. Priority
10. Deadline
11. Active
12. Last Follow-up ID
13. Last Task ID
14. Last Updated
15. Notes

Every active AI-owned entity must have an active follow-up unless it is terminal: `Done`, `Cancelled`, `Closed`, `Submitted`, or `No Further Action`.

An active follow-up is considered delayed when its `Due At` or `Run After` time is more than 3 hours in the past. Delayed active follow-ups must create a `CRM Health` task for `AIstaff_Manager` with template `template_manager_followup_delay_escalation`, unless an open manager escalation task already exists for the same entity.

### AI Staff Follow Ups

Columns:

1. FollowUpID
2. EntityID
3. Staff
4. Reason
5. Run After
6. Due At
7. Active
8. Status
9. Next Action
10. Completion Criteria
11. Created By
12. Created At
13. Completed At
14. Result
15. Evidence Link

Follow-ups are self-owned future checks. Delegated work belongs in `AI Staff Tasks`.

### AI Staff Event Log

Columns:

1. UUID
2. Event
3. EntityID
4. Entity Type
5. Field
6. Before
7. After
8. User/Staff
9. DateTime
10. Reason
11. Evidence Link

All entity details, status, responsible-staff, task, and follow-up changes should write an event row.

### AI Staff Registry

Columns:

1. StaffID
2. Role
3. Scope
4. Allowed Entity Types
5. Allowed Stage Range
6. Allowed Tools
7. Guardrails
8. Manager

### AI Staff Task Templates

Columns:

1. TemplateID
2. StaffID
3. Task Name
4. Definition
5. Trigger
6. Tools To Use
7. Guardrails
8. Best Practice
9. Sample Success
10. Sample Failure
11. Success Status
12. Failure Status
13. Follow-up Rule

Required v1 template: `template_send_application_package`.

### AI Staff Decisions

Columns:

1. Decision ID
2. Date
3. Decision Type
4. Recommendation
5. Reason
6. Evidence
7. Approval Needed
8. Approval Status
9. User Response
10. Final Action Taken

### AI Staff Run Log

Columns:

1. Run ID
2. Run Timestamp
3. Run Type
4. KPI Snapshot
5. Actions Completed
6. Rows Added/Updated
7. Packages Prepared
8. Drafts Queued
9. Sends Blocked
10. Replies Reconciled
11. KPI Progress
12. Next Run Focus
13. Notes

### AI Staff Reports

Columns:

1. Report ID
2. Date
3. Period
4. Summary
5. KPI Progress
6. Completed Work
7. Blockers
8. Approval Requests
9. Recommended Next Actions

## Default KPI Template

Weekly defaults:

- 10 verified new opportunities.
- 5 professor research-fit records.
- 3 student/contact leads.
- 2 complete application packages.
- 5 outreach drafts queued.
- 100% follow-up compliance within 10 days.

Daily defaults:

- Run CRM health once.
- Move at least one package/application forward unless blocked.
- Produce one report row.

## Decision Priority

Rank next actions in this order:

1. Inbound replies needing action or overdue follow-ups.
2. Approved or nearly complete packages blocked by one missing file.
3. High-fit applications with deadlines within 30 days.
4. Switzerland finance/energy opportunities.
5. Krakow/Poland high-probability PhD opportunities.
6. New research needed to fill active KPI gaps.
7. Long-range monitor items.

## Bridge Action Policy

Safe GET/curl actions:

- `syncSent`
- `syncInbound`
- `reconcileInboundReplies`
- `testAttachmentAccess`
- `verifyQueueAttachments`
- `syncPackageFilesForPackage`
- `copyPackageFilesToFolder`
- `verifyPackageFiles`
- `validatePackageCompleteness`
- `syncConfiguredPackageFiles`
- `copyConfiguredPackageFilesToFolder`
- `verifyConfiguredPackageFiles`
- `validateConfiguredPackageCompleteness`
- `verifyConfiguredQueueAttachments`
- `runConfiguredPackageSmokeTest`
- `runAghKnezPackageSmokeTest`
- `createBridgeDriveSmokeTest`
- `createAghKnezPreparedPackageFolder`

POST-only actions:

- `processQueue`
- `queueEmail`
- `setDefaultSendMode`
- `setAutoProcessApprovedQueue`
- `setAutoApproveQueueRows`
- `autoApproveQueueRows`

Call `processQueue` only when Iman explicitly requests queue processing, or `AUTO_PROCESS_APPROVED_QUEUE` is `TRUE`. Queue rows may be approved automatically when `AUTO_APPROVE_QUEUE_ROWS` is `TRUE`, but repeated professor/supervisor recipients must be blocked for manual review.

Direct-send mode:

- `DEFAULT_SEND_MODE = CREATE_DRAFT`: approved rows create Gmail drafts when `processQueue` runs.
- `DEFAULT_SEND_MODE = SEND_NOW`: approved rows are sent directly when `processQueue` runs.
- `AUTO_APPROVE_QUEUE_ROWS = TRUE`: eligible queue rows are marked `Approved` automatically.
- A row-level `Send Mode` in `Email Send Queue` overrides the default.
- Direct sending is still blocked unless `Approval Status = Approved`, package completeness passes, and attachments are accessible.
- If a professor/supervisor recipient is repeated, mark the row `Needs Review - Duplicate Recipient` and do not send automatically.

## Run Mode Details

### CRM Health Cycle

1. Sync sent mail.
2. Sync inbound replies.
3. Reconcile replies.
4. Check configured package files.
5. Validate configured package completeness.
6. Get due AI Staff tasks/follow-ups.
7. Audit process health for active entities without follow-ups, overdue work, delayed follow-ups over 3 hours, blocked entities, and stale entities.
8. Detect queue blockers and duplicate send risks.
9. Write a run-log row and report summary.

### Daily Staff Cycle

1. Run CRM health.
2. Read active daily/weekly KPIs.
3. Read due tasks and due follow-ups.
4. Compare KPI targets against current tracker state.
5. Pick the highest-priority unblocked due task or follow-up.
6. Execute one bounded work batch:
   - research batch;
   - package improvement;
   - outreach queueing;
   - follow-up preparation;
   - report creation.
7. Update the entity stage/status and event log.
8. Create the next follow-up unless the entity is terminal.
9. Write `AI Staff Run Log` and `AI Staff Reports`.

### Research Cycle

Use the `swiss-planner-research` skill. Always prefer official evidence. LinkedIn posts may generate leads but must not become serious opportunities without official verification.

### Application Cycle

Use the `swiss-planner-apply` skill. Create one package per opportunity, update Drive and package rows, queue outreach rows, and verify package completeness.

### Weekly KPI Review

Summarize:

- target vs actual;
- geography and field distribution;
- high-priority bottlenecks;
- packages ready for review;
- drafts waiting for approval;
- recommended next-week KPIs.

## Approval Gates

Always require manual review for:

- repeated professor/supervisor recipients;
- formal application portal submission;
- LinkedIn outreach;
- finalizing a package as submitted.

Never require approval for:

- research;
- evidence collection;
- draft generation;
- package verification;
- non-send CRM reconciliation.

## Application Stage Model

Standard flow:

`Opportunity Verified -> Fit Approved -> Application Created -> Package Required -> Package In Progress -> Package Prepared -> Package Verified -> Outreach Queued -> Send Ready -> Sent - Waiting for Reply -> Reply Received - Needs Review -> Submitted / Closed`

Failure/blocker statuses:

- `Blocked - Missing Evidence`
- `Blocked - Package Incomplete`
- `Blocked - Attachment Verification Failed`
- `Needs Human Review - Duplicate Recipient`
- `Needs Human Review - Supervisor Reply`
- `Cancelled`
- `No Further Action`

## Application Pack Sender Template

`template_send_application_package`

Sending means using the approved queue row, verified recipient, verified package files, and Gmail Bridge to send the supervisor/university package email. It does not mean writing the package.

Trigger:

- `Entity Type = Application`
- `Current Stage = Package Verified` or `Current Status = Send Ready`
- Responsible staff is `AIstaff_ApplicationPackSender`
- Queue row exists
- No duplicate professor/supervisor risk
- `Run After <= now`

Success:

- Email sent.
- Gmail message/thread ID recorded.
- Application status becomes `Sent - Waiting for Reply`.
- A follow-up is created for 7 days later.
- Event log records status change and send evidence.

Failure:

- Missing files -> `Blocked - Package Incomplete`.
- Attachment failure -> `Blocked - Attachment Verification Failed`.
- Duplicate recipient -> `Needs Human Review - Duplicate Recipient`.
- Gmail bridge error -> `Blocked - Send Failed`.

## Manager Follow-Up Delay Template

`template_manager_followup_delay_escalation`

Trigger:

- Entity is active.
- Entity is owned by an AI staff member.
- Entity has an active follow-up.
- The active follow-up's `Due At` or `Run After` time is more than 3 hours in the past.
- No open manager escalation task already exists for the same entity.

Success:

- Manager reviews the entity, event history, responsible staff, and delayed follow-up.
- Manager creates/reassigns the next task, marks a blocker, refreshes the follow-up, or closes the entity if terminal.

Failure:

- The delayed follow-up remains active without a concrete next action.
- The entity remains active but has no fresh follow-up or valid blocker status.



