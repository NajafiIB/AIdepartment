# Swiss Planner Gmail Bridge

This bridge lets Iman's real Gmail account, `iman.najafi86@gmail.com`, sync with the Swiss Planner workbook without giving Codex the Gmail password or direct OAuth access.

Drive roots:

- Mother/applicant folder: `115. NJ_Switzerland`
  `https://drive.google.com/drive/folders/1E44Hjtawzm0-N898k5IJy7WfFqKHMQbJ`
- Existing prepared-package archive: `10. Swiss Planner Applications`
  `https://drive.google.com/drive/folders/1JgN1XwaS64SxYb0BdhnRXPfveArc7nQf`

Do not invent a third application root. Existing prepared packages can remain under `10. Swiss Planner Applications`. New applicant-source material and any package files that need direct attachment by Iman's Gmail should be created, copied, or verified under `115. NJ_Switzerland` or another folder that `iman.najafi86@gmail.com` can access.

## What Was Created

Workbook tabs added to Swiss Planner:

- `Gmail Sent Log`: sent-email history from Iman's Gmail.
- `Gmail Inbox Log`: inbound replies from matched university/application contacts and threads.
- `Email Send Queue`: approval-gated outbound email queue.
- `Package Files`: one row per package document, including source file, copied package file, verification status, and last error.
- `AI Staff KPIs`: KPI targets that drive the Swiss Planner AI Staff cycle.
- `AI Staff Run Queue`: prioritized staff tasks and blockers.
- `AI Staff Decisions`: approval-gated recommendations and decisions.
- `AI Staff Run Log`: machine-readable run history.
- `AI Staff Reports`: Iman-facing daily and weekly reports.
- `Email Bridge Runs`: run logs for sync/send jobs and webhook calls.
- `Email Bridge Config`: non-secret configuration and deployment notes.

Local Apps Script file:

- `gmail_bridge/Code.gs`
- `gmail_bridge/appsscript.json`

## Standalone Design

This is designed for a standalone Apps Script project, not a script bound to a specific spreadsheet UI.

It does not use:

- `SpreadsheetApp.getActiveSpreadsheet()`
- `getActiveSheet()`
- selected cells
- sheet formulas as triggers or control logic

It always opens the Swiss Planner workbook by this fixed spreadsheet ID:

`18scZfr6_DHSOfjCJvR14RLdnU1n6zgmJQoDb4WkfSzg`

The script still uses Apps Script's internal cell write/read methods such as `getRange()` because Google Sheets requires that API to read and write tab data, but those calls are all fixed by workbook ID, exact tab name, row, and column. They do not depend on whichever sheet is open in the browser.

## Setup In Iman's Gmail Account

1. Log in to Google as `iman.najafi86@gmail.com`.
2. Open `https://script.google.com`.
3. Create a new Apps Script project named `Swiss Planner Gmail Bridge`.
4. Paste the full contents of `Code.gs` into the editor.
5. Optional but recommended: open Project Settings, enable `Show appsscript.json manifest file in editor`, then replace the manifest with `appsscript.json`.
6. Run `setupBridge()`.
7. Approve Gmail, Sheets, Drive, and trigger permissions.

After `setupBridge()` runs, it creates:

- an hourly sync from Sent Gmail to `Gmail Sent Log`;
- an hourly matched-reply sync to `Gmail Inbox Log`;
- a 15-minute processor for approved rows in `Email Send Queue`;
- a webhook token in Script Properties.

## Deploy Webhook

Only needed if Codex, AppSheet, or another tool should trigger the bridge immediately.

1. In Apps Script, click `Deploy` then `New deployment`.
2. Select `Web app`.
3. Execute as: `Me`.
4. Who has access: `Anyone with the link`.
5. Deploy and copy the Web App URL.
6. Paste the URL into `Email Bridge Config` under `WEBHOOK_URL`.

Current deployment URL:

`YOUR_WEBHOOK_URL`

After pasting the updated script, run `setupBridge()` once. It records this URL into `Email Bridge Config` even if an older deployment URL was already there.

The script checks a webhook token, so the public web app URL alone is not enough to send mail.

To let Codex call the webhook, copy the `WEBHOOK_TOKEN` from Apps Script project settings / Script Properties into `Email Bridge Config`. If you do not want Codex to call the webhook directly, leave it only in Script Properties and rely on the 15-minute trigger.

## Safe Sending Policy

Rows in `Email Send Queue` are not processed unless:

- `Approval Status` is exactly `Approved`;
- `Send Status` is blank, `Queued`, or `Ready`;
- `Not Before` is empty or in the past.
- outbound content safety passes, meaning external emails must not contain internal package-folder, CRM, queue, bridge, attachment-test, or "not yet finalized package" wording.
- package completeness and attachment checks pass.

If unsafe internal wording is detected, the row is marked `Blocked - Content Review` and no Gmail draft or sent email is created. Use the webhook action `validateEmailContentSafety` or the local `check_swiss_planner_email_content_safety.cmd` file to scan approved queue rows without sending anything.

For the live Swiss Planner workflow, `AUTO_APPROVE_QUEUE_ROWS` may be `TRUE`. In that mode, queue rows are automatically marked `Approved` unless they repeat a professor/supervisor recipient, in which case they are blocked as `Needs Review - Duplicate Recipient`.

`Send Mode` options:

- `CREATE_DRAFT`: creates a Gmail draft only.
- `SEND_NOW`: sends the email immediately.

For initial testing, use `CREATE_DRAFT`. For the live Swiss Planner workflow, `SEND_NOW` is supported after package verification because the approval gate remains mandatory.

## Sent-Mail Privacy Modes

The bridge does not need to record all of Iman's Sent mailbox.

Current recommended config:

- `SENT_SYNC_MODE`: `MATCHED_ONLY`
- `SENT_SYNC_START_DATE`: `2026/04/01`

`MATCHED_ONLY` searches Sent mail from the start date, but only records messages that match the application/university target rules in `Code.gs`, such as AGH, UEK, UKEN, Kozminski, KISD/PAN, CUT/PK, HSG, Basel, UZH/SFI, SGH, and University of Warsaw. Unmatched personal/business sent emails are not written to the workbook.

Alternative broader mode:

- `SENT_SYNC_MODE`: `ALL_SINCE_DATE`
- `SENT_SYNC_START_DATE`: `2026/04/01`

`ALL_SINCE_DATE` records every sent email from April 1, 2026 onward. Use this only if Iman explicitly wants the complete sent-mail history for that period in the sheet.

To change modes, edit `Email Bridge Config`, then run `syncSentEmails()` or call the webhook action `syncSent`.

## Inbound Reply Tracking

The bridge can also log replies without importing the whole mailbox.

Current recommended config:

- `INBOUND_SYNC_MODE`: `MATCHED_ONLY`
- `INBOUND_SYNC_START_DATE`: `2026/04/01`

`MATCHED_ONLY` searches Gmail from the start date for the same university/application targets used by the sent-mail sync. It also keeps replies in threads already present in `Gmail Sent Log`. Messages sent by Iman are skipped, so the tab focuses on inbound replies from AGH, UEK, KISD/PAN, Kozminski, HSG, Basel, UZH/SFI, SGH, UW, and other configured targets.

To run it manually in Apps Script, execute `syncInboundReplies()`. Through the webhook, use the `syncInbound` action.

`syncInboundReplies()` also reconciles reply status when `AUTO_RECONCILE_INBOUND_REPLIES` is `TRUE`:

- `Outreach Queue`: `Send Status` or `Status` becomes `Replied`, follow-up date is cleared, and the Gmail URL is recorded.
- `Application`: status becomes `Reply Received - Needs Review`.
- `Email Send Queue`: rows already sent or waiting are marked as replied and notes receive the Gmail evidence link.

To run reconciliation only:

```javascript
reconcileInboundReplies()
```

Webhook:

```json
{ "token": "PASTE_WEBHOOK_TOKEN", "action": "reconcileInboundReplies" }
```

## Queue Columns That Matter

Minimum required fields:

- `To`
- `Subject`
- `Body`
- `Send Mode`
- `Approval Status`

Optional but useful fields:

- `Opportunity ID`
- `ApplicationID`
- `Recipient Type`
- `Recipient Name`
- `Attachment Drive URLs`
- `Not Before`

Attachments must be Google Drive file URLs. Native Google Docs are attached as PDFs.

The Apps Script runs as `iman.najafi86@gmail.com`, so that account must be able to open every Drive file listed in `Attachment Drive URLs`. If a file is not accessible, the bridge now stops the row with `Send Status = Error` and records the problem in `Last Error`; it will not send an email without the requested attachments.

The queue processor also checks package completeness before it creates a draft or sends an external email. For supervisor/professor outreach, the package must have verified package copies of the academic CV, research proposal or concept note, and publication list. For admissions or university-office outreach, the package must have at least the academic CV and statement of purpose / motivation letter.

Student outreach and LinkedIn/manual messages do not require formal attachments. A fit-inquiry email may be sent without attachments only when the row explicitly says `No Attachment Required`, `No Attachments Required`, or `Fit Inquiry` in the subject, body, recipient type, or notes.

If a row is approved but the package is incomplete, the bridge sets `Send Status = Blocked - Package Incomplete` and records the missing files in `Last Error`.

After updating the deployed script, run `testAttachmentAccess()` once from Apps Script. By default, it tests only approved queue rows that have `Attachment Drive URLs`, so draft supervisor rows are not tested accidentally. To test one specific draft row, set `ATTACHMENT_TEST_QUEUE_ID` in `Email Bridge Config` to the queue ID, then run `testAttachmentAccess()`. This must be a value from the `Queue ID` column in `Email Send Queue`, such as `queue_agh_knez_20260527`; do not use a Drive file ID, folder ID, or spreadsheet ID.

If it fails with `No item with the given ID could be found`, the Apps Script account cannot access the attachment file. Share the referenced Drive files or parent folder with `iman.najafi86@gmail.com`, or recreate the files from that account, then test again.

If files were created outside folders accessible to `iman.najafi86@gmail.com`, move, share, or recreate them before adding them to `Attachment Drive URLs`.

## Webhook Payloads

For quick smoke tests, use `GET` with query parameters. Keep using `POST` for email-processing actions such as `processQueue` and `queueEmail`.

Basic status:

```powershell
curl.exe -L "YOUR_WEBHOOK_URL"
```

Validate AGH Knez package completeness:

```powershell
curl.exe -L "YOUR_WEBHOOK_URL?token=PASTE_WEBHOOK_TOKEN&action=validatePackageCompleteness&applicationId=app_agh_drilling_knez_2026&opportunityId=opp_agh_drilling_knez_2026"
```

Verify one queue row's attachments:

```powershell
curl.exe -L "YOUR_WEBHOOK_URL?token=PASTE_WEBHOOK_TOKEN&action=verifyQueueAttachments&queueId=queue_agh_knez_20260527"
```

Run the AGH Knez smoke test wrapper:

```powershell
curl.exe -L "YOUR_WEBHOOK_URL?token=PASTE_WEBHOOK_TOKEN&action=runAghKnezPackageSmokeTest"
```

Run a configured package smoke test:

```powershell
curl.exe -L "YOUR_WEBHOOK_URL?token=PASTE_WEBHOOK_TOKEN&action=runConfiguredPackageSmokeTest"
```

Create/verify the AI Staff tabs and seed default KPIs:

```powershell
curl.exe -L "YOUR_WEBHOOK_URL?token=PASTE_WEBHOOK_TOKEN&action=setupAiStaffWorkbook"
```

`processQueue` remains POST-only because it can create drafts or send approved emails:

```powershell
curl.exe -L -X POST "YOUR_WEBHOOK_URL" -H "Content-Type: application/json" -d "{\"token\":\"PASTE_WEBHOOK_TOKEN\",\"action\":\"processQueue\"}"
```

To send approved rows directly instead of creating Gmail drafts, set the default send mode to `SEND_NOW`. This does not remove the approval gate: only rows with `Approval Status = Approved` can be processed, and package/attachment checks still run before sending.

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$body='token='+[uri]::EscapeDataString($env:TOKEN)+'&action=setDefaultSendMode&mode=SEND_NOW&updateQueuedRows=TRUE'; (Invoke-WebRequest -Uri $env:WEBHOOK -Method POST -ContentType 'application/x-www-form-urlencoded' -Body $body -UseBasicParsing).Content"
```

To allow the scheduled AI Staff to process already-approved queue rows automatically, enable the auto-process switch:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$body='token='+[uri]::EscapeDataString($env:TOKEN)+'&action=setAutoProcessApprovedQueue&enabled=TRUE'; (Invoke-WebRequest -Uri $env:WEBHOOK -Method POST -ContentType 'application/x-www-form-urlencoded' -Body $body -UseBasicParsing).Content"
```

To enable automatic approval for non-duplicate recipients:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "$body='token='+[uri]::EscapeDataString($env:TOKEN)+'&action=setAutoApproveQueueRows&enabled=TRUE'; (Invoke-WebRequest -Uri $env:WEBHOOK -Method POST -ContentType 'application/x-www-form-urlencoded' -Body $body -UseBasicParsing).Content"
```

Sync sent emails:

```json
{
  "token": "PASTE_WEBHOOK_TOKEN",
  "action": "syncSent"
}
```

Sync inbound replies:

```json
{
  "token": "PASTE_WEBHOOK_TOKEN",
  "action": "syncInbound"
}
```

Process approved queue:

```json
{
  "token": "PASTE_WEBHOOK_TOKEN",
  "action": "processQueue"
}
```

Add one queued email:

```json
{
  "token": "PASTE_WEBHOOK_TOKEN",
  "action": "queueEmail",
  "email": {
    "opportunityId": "opp_agh_drilling_knez_2026",
    "applicationId": "app_agh_drilling_knez_2026",
    "recipientType": "Supervisor",
    "recipientName": "Prof. Dariusz Knez",
    "to": "knez@agh.edu.pl",
    "subject": "Prospective PhD applicant - AGH ZB 0039/26",
    "body": "Dear Prof. Knez,...",
    "attachmentDriveUrls": "https://docs.google.com/document/d/...",
    "sendMode": "CREATE_DRAFT",
    "approvalStatus": "Drafted",
    "notes": "Needs Iman review before approval."
  }
}
```

## Automatic Package Folder Registration

For every new application package, use the bridge to create or reuse a folder under `10. Swiss Planner Applications` and record it in the workbook. Do not ask Iman to provide a folder ID.

Generic Apps Script call:

```javascript
createAndRegisterPreparedPackage({
  opportunityId: 'opp_example_2026',
  applicationId: 'app_example_2026',
  opportunityTitle: 'University / Topic Name',
  packageName: '202605_University_Topic_Short_Name',
  academicCvUrl: 'https://docs.google.com/document/d/...',
  proposalUrl: 'https://docs.google.com/document/d/...',
  publicationListUrl: 'https://docs.google.com/document/d/...',
  outreachDraftPaths: 'Email Send Queue: queue_example_2026',
  packageStatus: 'Drive Folder Created - Needs Package Files',
  notes: 'Created from Swiss Planner Apply workflow.'
})
```

The function automatically:

- creates or reuses the package folder under `10. Swiss Planner Applications`;
- creates or reuses a package index Google Doc;
- upserts the package row in `Application Packages`;
- creates or updates rows in `Package Files`;
- copies accessible source Google Docs/files into the package folder;
- marks inaccessible source files as `Needs Source Access`;
- verifies package copies so they can be attached safely;
- appends package folder and package index rows to `Links`;
- annotates matching `Email Send Queue` rows with the package folder and package index;
- logs the operation in `Email Bridge Runs`.

Useful package functions:

```javascript
syncPackageFilesForPackage('pkg_or_blank_for_all')
copyPackageFilesToFolder('pkg_or_blank_for_all')
verifyPackageFiles('pkg_or_blank_for_all')
validatePackageCompleteness('app_example_2026', 'opp_example_2026')
```

The Apps Script editor cannot pass values into a function from the Run dropdown. For click-run testing, use the no-argument wrappers instead:

```javascript
syncConfiguredPackageFiles()
copyConfiguredPackageFilesToFolder()
verifyConfiguredPackageFiles()
validateConfiguredPackageCompleteness()
verifyConfiguredQueueAttachments()
runConfiguredPackageSmokeTest()
```

These read IDs from `Email Bridge Config`:

- `PACKAGE_TEST_PACKAGE_ID`
- `PACKAGE_TEST_APPLICATION_ID`
- `PACKAGE_TEST_OPPORTUNITY_ID`
- `ATTACHMENT_TEST_QUEUE_ID` (optional; must be an `Email Send Queue` row ID such as `queue_agh_knez_20260527`, or blank to skip queue attachment verification during `runConfiguredPackageSmokeTest`)

AGH Knez / ZB0039 also has no-argument wrappers:

```javascript
syncAghKnezPackageFiles()
copyAghKnezPackageFilesToFolder()
verifyAghKnezPackageFiles()
validateAghKnezPackageCompleteness()
verifyAghKnezQueueAttachments()
runAghKnezPackageSmokeTest()
```

Webhook equivalents:

```json
{ "token": "PASTE_WEBHOOK_TOKEN", "action": "syncPackageFilesForPackage", "packageId": "pkg_example" }
{ "token": "PASTE_WEBHOOK_TOKEN", "action": "copyPackageFilesToFolder", "packageId": "pkg_example" }
{ "token": "PASTE_WEBHOOK_TOKEN", "action": "verifyPackageFiles", "packageId": "pkg_example" }
{ "token": "PASTE_WEBHOOK_TOKEN", "action": "validatePackageCompleteness", "applicationId": "app_example_2026", "opportunityId": "opp_example_2026" }
```

When `AUTO_ATTACH_PACKAGE_FILES` is `TRUE`, an approved queue row with blank `Attachment Drive URLs` is auto-filled from verified package files before draft/send. Existing attachment URLs are never overwritten.

Task-specific helper for AGH Knez / ZB0039:

1. Paste the latest `Code.gs` into Apps Script and authorize if asked.
2. Run `createAghKnezPreparedPackageFolder()`.
3. The function records the folder and package index in the workbook automatically.

The generic function is:

```javascript
createPreparedPackageFolderIndex(
  'opp_agh_drilling_knez_2026',
  'app_agh_drilling_knez_2026',
  '202605_AGH Krakow_ZB0039_Knez_Borehole Stress Gradients'
)
```

## Canva Option

Canva can be used for polished one-page application visuals or portfolio-style summaries, but it should not be the system of record for email. Keep the operational system in Google Sheets + Gmail Apps Script. Use Canva only for optional visual documents that are linked from the queue or package tracker.





