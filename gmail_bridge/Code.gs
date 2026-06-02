/**
 * Swiss Planner Gmail Bridge
 *
 * Install this Apps Script from the Google account that owns/sends:
 * iman.najafi86@gmail.com
 *
 * What it does:
 * 1. Syncs sent Gmail messages into the Swiss Planner workbook.
 * 2. Processes approved rows in "Email Send Queue".
 * 3. Exposes a token-protected webhook for Codex/AppSheet/other tools.
 *
 * First run:
 * - Paste this file into script.google.com while logged in as iman.najafi86@gmail.com.
 * - Run setupBridge().
 * - Authorize Gmail, Sheets, Drive, and script trigger permissions.
 * - Deploy as Web App only if you want webhook calls.
 *
 * Standalone guarantee:
 * - This script is safe for a standalone Apps Script project.
 * - It never uses SpreadsheetApp.getActiveSpreadsheet(), getActiveSheet(),
 *   or UI-selected cells. It always opens the workbook by the fixed ID below
 *   and addresses tabs by exact tab name.
 */

const BRIDGE = {
  SPREADSHEET_ID: '18scZfr6_DHSOfjCJvR14RLdnU1n6zgmJQoDb4WkfSzg',
  DEFAULT_DRIVE_PARENT_FOLDER_ID: '1E44Hjtawzm0-N898k5IJy7WfFqKHMQbJ',
  DEFAULT_PREPARED_PACKAGES_FOLDER_ID: '1JgN1XwaS64SxYb0BdhnRXPfveArc7nQf',
  CURRENT_WEBHOOK_URL: '',
  APPLICATION_PACKAGES: 'Application Packages',
  PACKAGE_FILES: 'Package Files',
  APPLICATION_DOCS: 'Application Docs',
  APPLICATION: 'Application',
  OUTREACH_QUEUE: 'Outreach Queue',
  LINKS: 'Links',
  SENT_LOG: 'Gmail Sent Log',
  INBOX_LOG: 'Gmail Inbox Log',
  SEND_QUEUE: 'Email Send Queue',
  RUNS: 'Email Bridge Runs',
  CONFIG: 'Email Bridge Config',
  AI_STAFF_KPIS: 'AI Staff KPIs',
  AI_STAFF_RUN_QUEUE: 'AI Staff Tasks',
  AI_STAFF_RUN_QUEUE_LEGACY: 'AI Staff Run Queue',
  AI_STAFF_DECISIONS: 'AI Staff Decisions',
  AI_STAFF_RUN_LOG: 'AI Staff Run Log',
  AI_STAFF_REPORTS: 'AI Staff Reports',
  AI_STAFF_ENTITIES: 'AI Staff Entities',
  AI_STAFF_FOLLOW_UPS: 'AI Staff Follow Ups',
  AI_STAFF_THREADS: 'AI Staff Threads',
  AI_STAFF_THREAD_MESSAGES: 'AI Staff Thread Messages',
  AI_STAFF_SKILL_UPDATES: 'AI Staff Skill Updates',
  AI_STAFF_EVENT_LOG: 'AI Staff Event Log',
  AI_STAFF_REGISTRY: 'AI Staff Registry',
  AI_STAFF_TASK_TEMPLATES: 'AI Staff Task Templates'
};

const SENT_LOG_HEADERS = [
  'Log ID', 'Gmail Message ID', 'Thread ID', 'Sent Date', 'From', 'To', 'CC', 'BCC',
  'Subject', 'Snippet / Body Preview', 'Attachments', 'Matched University',
  'Matched Opportunity ID', 'Matched Application ID', 'Source Query', 'Logged At',
  'Gmail URL', 'Labels', 'Status', 'Notes'
];

const INBOX_LOG_HEADERS = [
  'Log ID', 'Gmail Message ID', 'Thread ID', 'Received Date', 'From', 'To', 'CC', 'Subject',
  'Snippet / Body Preview', 'Attachments', 'Matched University', 'Matched Opportunity ID',
  'Matched Application ID', 'Matched Sent Message ID', 'Source Query', 'Logged At',
  'Gmail URL', 'Labels', 'Status', 'Notes'
];

const SEND_QUEUE_HEADERS = [
  'Queue ID', 'Created At', 'Opportunity ID', 'ApplicationID', 'Recipient Type',
  'Recipient Name', 'To', 'CC', 'BCC', 'Subject', 'Body', 'Attachment Drive URLs',
  'Send Mode', 'Approval Status', 'Approved By', 'Approved At', 'Not Before',
  'Send Status', 'Gmail Draft ID', 'Gmail Message ID', 'Thread ID', 'Sent At',
  'Last Error', 'Notes'
];

const PACKAGE_FILES_HEADERS = [
  'FileID', 'PackageID', 'ApplicationID', 'OpportunityID', 'Document Type',
  'Source URL', 'Package File URL', 'Status', 'Last Checked', 'Last Error'
];

const RUN_HEADERS = [
  'Run ID', 'Run At', 'Action', 'Status', 'Rows Added', 'Rows Processed',
  'Messages Sent', 'Drafts Created', 'Errors', 'Notes'
];

const PACKAGE_DOCUMENT_COLUMNS = [
  { type: 'Academic CV', headers: ['Academic CV Path', 'Academic CV', 'CV Path', 'CV path'] },
  { type: 'Professional Resume', headers: ['Professional Resume Path', 'Resume Path', 'Professional Resume', 'Resume'] },
  { type: 'Statement of Purpose', headers: ['SOP Path', 'Statement of Purpose Path', 'Motivation Letter Path', 'SOP'] },
  { type: 'Research Proposal', headers: ['Proposal Path', 'Research Proposal Path', 'Research Statement Path', 'Proposal'] },
  { type: 'Publication List', headers: ['Publication List Path', 'Publication Appendix Path', 'Publication List'] },
  { type: 'Document Checklist', headers: ['Checklist Path', 'Document Checklist Path', 'Checklist'] },
  { type: 'PDF Export', headers: ['PDF Exports', 'PDF Export Paths'] },
  { type: 'Outreach Draft', headers: ['Outreach Draft Paths', 'Email Drafts', 'Email Draft Paths'] }
];

const CONFIG_HEADERS = ['Key', 'Value', 'Notes', 'Updated At'];

const AI_STAFF_KPI_HEADERS = [
  'KPI ID', 'Period Type', 'Start Date', 'End Date', 'Target Unit', 'Target Count',
  'Geography Priority', 'Field Priority', 'Minimum Fit Score', 'Required Evidence Level',
  'Status', 'Owner Notes'
];

const AI_STAFF_RUN_QUEUE_HEADERS = [
  'Task ID', 'Created At', 'Task Type', 'Task Template ID', 'Assigned To',
  'Created By', 'EntityID', 'Related Opportunity ID', 'Related ApplicationID',
  'KPI ID', 'Priority', 'Run After', 'Due At', 'Deadline', 'Depends On',
  'Status', 'Next Action', 'Completion Criteria', 'Success Status',
  'Failure Status', 'Last Error', 'Evidence Link', 'Completed At', 'Result Notes',
  'Task Category', 'ThreadID', 'Source Staff', 'Target Staff', 'Escalation Level',
  'Learning Candidate ID'
];

const AI_STAFF_DECISION_HEADERS = [
  'Decision ID', 'Date', 'Decision Type', 'Recommendation', 'Reason', 'Evidence',
  'Approval Needed', 'Approval Status', 'User Response', 'Final Action Taken'
];

const AI_STAFF_RUN_LOG_HEADERS = [
  'Run ID', 'Run Timestamp', 'Run Type', 'KPI Snapshot', 'Actions Completed',
  'Rows Added/Updated', 'Packages Prepared', 'Drafts Queued', 'Sends Blocked',
  'Replies Reconciled', 'KPI Progress', 'Next Run Focus', 'Notes'
];

const AI_STAFF_REPORT_HEADERS = [
  'Report ID', 'Date', 'Period', 'Summary', 'KPI Progress', 'Completed Work',
  'Blockers', 'Approval Requests', 'Recommended Next Actions'
];

const AI_STAFF_ENTITY_HEADERS = [
  'EntityID', 'Entity Type', 'Related ID', 'Related Opportunity ID',
  'Related ApplicationID', 'Current Stage', 'Current Status',
  'Responsible Staff', 'Priority', 'Deadline', 'Active', 'Last Follow-up ID',
  'Last Task ID', 'Last Updated', 'Notes'
];

const AI_STAFF_FOLLOW_UP_HEADERS = [
  'FollowUpID', 'EntityID', 'Staff', 'Reason', 'Run After', 'Due At',
  'Active', 'Status', 'Next Action', 'Completion Criteria', 'Created By',
  'Created At', 'Completed At', 'Result', 'Evidence Link'
];

const AI_STAFF_THREAD_HEADERS = [
  'ThreadID', 'TaskID', 'EntityID', 'ApplicationID', 'OpportunityID',
  'Started By', 'Responsible', 'Status', 'Created At', 'Closed At',
  'Archived', 'Last Message At'
];

const AI_STAFF_THREAD_MESSAGE_HEADERS = [
  'MessageID', 'ThreadID', 'TaskID', 'Sender Type', 'SenderID',
  'Sender Label', 'Body', 'Language', 'Created At', 'Read By Human',
  'Read By Staff', 'Evidence Link'
];

const AI_STAFF_SKILL_UPDATE_HEADERS = [
  'LearningID', 'Source ThreadID', 'StaffID', 'Proposed Rule', 'Reason',
  'Evidence', 'Status', 'Approved By', 'Applied At', 'Target Skill File'
];

const AI_STAFF_EVENT_LOG_HEADERS = [
  'UUID', 'Event', 'EntityID', 'Entity Type', 'Field', 'Before', 'After',
  'User/Staff', 'DateTime', 'Reason', 'Evidence Link'
];

const AI_STAFF_REGISTRY_HEADERS = [
  'StaffID', 'Role', 'Scope', 'Allowed Entity Types', 'Allowed Stage Range',
  'Allowed Tools', 'Guardrails', 'Manager'
];

const AI_STAFF_TASK_TEMPLATE_HEADERS = [
  'TemplateID', 'StaffID', 'Task Name', 'Definition', 'Trigger',
  'Tools To Use', 'Guardrails', 'Best Practice', 'Sample Success',
  'Sample Failure', 'Success Status', 'Failure Status', 'Follow-up Rule'
];

const AI_STAFF_TERMINAL_STATUSES = [
  'Done', 'Cancelled', 'Closed', 'Submitted', 'No Further Action'
];

const AI_STAFF_FOLLOW_UP_ESCALATION_HOURS = 3;
const AI_STAFF_FOLLOW_UP_ESCALATION_TEMPLATE = 'template_manager_followup_delay_escalation';

const UNIVERSITY_RULES = [
  {
    name: 'AGH University of Krakow',
    opportunityId: 'opp_agh_drilling_knez_2026 / opp_agh_geothermal_sowizdzal_2026 / opp_agh_fin_transfer_2026 / opp_agh_energy_env_secondary_2026',
    applicationId: 'AGH mixed',
    terms: ['agh.edu.pl', 'godawska@agh.edu.pl', 'knez@agh.edu.pl', 'necki@agh.edu.pl', 'ansow@agh.edu.pl', 'phd@agh.edu.pl', 'agh doctoral']
  },
  {
    name: 'Krakow University of Economics / UEK',
    opportunityId: 'opp_uek_ds_fin_2026',
    applicationId: 'app_uek_ds_2026',
    terms: ['uek.krakow.pl', 'phd.program@uek.krakow.pl', 'sduek@uek.krakow.pl', 'kozuchm@uek.krakow.pl', 'krakow university of economics']
  },
  {
    name: 'UKEN Krakow',
    opportunityId: 'opp_uken_econ_fin_2026',
    applicationId: 'app_uken_econ_fin_2026',
    terms: ['uken.krakow.pl', 'marian.kozaczka@uken.krakow.pl', 'university of the national education commission']
  },
  {
    name: 'Kozminski University',
    opportunityId: 'opp_kozminski_ds_2026',
    applicationId: 'app_kozminski_2026',
    terms: ['kozminski.edu.pl', 'pmielcarz@kozminski.edu.pl', 'kudos', 'kozminski doctoral']
  },
  {
    name: 'KISD / Polish Academy of Sciences',
    opportunityId: 'opp_kisd_igsmie_energy_transition_2026 / opp_kisd_img_thermal_storage_2026',
    applicationId: 'KISD mixed',
    terms: ['kisd@ifj.edu.pl', 'ifj.edu.pl', 'imgpan.pl', 'igsmie', 'pan.pl', 'skotniczny@imgpan.pl']
  },
  {
    name: 'Cracow University of Technology / PK',
    opportunityId: 'opp_pk_ds_env_energy_2026',
    applicationId: 'app_pk_ds_env_energy_2026',
    terms: ['pk.edu.pl', 'szkoladoktorska@pk.edu.pl', 'cracow university of technology']
  },
  {
    name: 'HSG / University of St. Gallen',
    opportunityId: 'opp_hsg_private_2026 / opp_hsg_sil_phd_2026',
    applicationId: 'HSG mixed',
    terms: ['unisg.ch', 'tereza.tykvova@unisg.ch', 'maximilian.palmie@unisg.ch', 'st. gallen']
  },
  {
    name: 'University of Basel',
    opportunityId: 'opp_unibas_sre_decarb_2026',
    applicationId: 'app_unibas_sre_decarb_2026',
    terms: ['unibas.ch', 'aya.kachi@unibas.ch', 'pascal.gantenbein@unibas.ch', 'university of basel']
  },
  {
    name: 'University of Zurich / SFI',
    opportunityId: 'opp_uzh_phd_fin_2027',
    applicationId: 'app_uzh_sustfin_2027',
    terms: ['uzh.ch', 'sfi.ch', 'markus.leippold@bf.uzh.ch', 'swiss finance institute']
  },
  {
    name: 'SGH Warsaw School of Economics',
    opportunityId: 'opp_sgh_ds_fin_2026',
    applicationId: 'app_sgh_ds_2026',
    terms: ['sgh.waw.pl', 'warsaw school of economics']
  },
  {
    name: 'University of Warsaw',
    opportunityId: 'opp_uw_phd_fin_2026',
    applicationId: 'app_uw_phd_2026',
    terms: ['uw.edu.pl', 'wne.uw.edu.pl', 'university of warsaw']
  }
];

function setupBridge() {
  ensureSheets_();
  ensureDefaultConfig_();
  ensureWebhookToken_();
  installBridgeTriggers_();
  logRun_('setupBridge', 'OK', 0, 0, 0, 0, 0, 'Bridge installed. Deploy as Web App if webhook access is needed.');
}

function syncSentEmails() {
  const started = new Date();
  const logSheet = sheet_(BRIDGE.SENT_LOG);
  const existingIds = getExistingMessageIds_(logSheet);
  const searchPlan = buildSentSearchPlan_();
  const maxMessages = Number(getConfig_('MAX_SENT_MESSAGES_PER_SYNC') || 200);
  const senderEmail = getSenderEmail_();
  const rows = [];

  for (let q = 0; q < searchPlan.queries.length && rows.length < maxMessages; q++) {
    const query = searchPlan.queries[q];
    const remaining = Math.max(1, maxMessages - rows.length);
    const threads = GmailApp.search(query, 0, Math.min(remaining, 500));
    for (let i = 0; i < threads.length && rows.length < maxMessages; i++) {
      const messages = threads[i].getMessages();
      for (let j = 0; j < messages.length && rows.length < maxMessages; j++) {
        const message = messages[j];
        if (!isSentByMe_(message, senderEmail)) continue;
        const messageId = message.getId();
        if (existingIds[messageId]) continue;

        const body = safePlainBody_(message);
        const match = matchUniversity_(message, body);
        if (searchPlan.logMatchedOnly && !match.name) continue;

        const sentDate = message.getDate();
        rows.push([
          Utilities.getUuid(),
          messageId,
          message.getThread().getId(),
          sentDate,
          message.getFrom(),
          message.getTo(),
          message.getCc(),
          message.getBcc(),
          message.getSubject(),
          body.slice(0, 1200),
          attachmentSummary_(message),
          match.name,
          match.opportunityId,
          match.applicationId,
          query,
          started,
          'https://mail.google.com/mail/u/0/#sent/' + messageId,
          'SENT',
          match.name ? 'Matched' : 'Logged',
          searchPlan.mode
        ]);
        existingIds[messageId] = true;
      }
    }
  }

  if (rows.length) {
    logSheet.getRange(logSheet.getLastRow() + 1, 1, rows.length, SENT_LOG_HEADERS.length).setValues(rows);
  }
  setConfig_('LAST_SENT_SYNC_ISO', started.toISOString(), 'Last successful sent-mail sync timestamp.');
  logRun_('syncSentEmails', 'OK', rows.length, rows.length, 0, 0, 0, 'Mode: ' + searchPlan.mode + '; queries: ' + searchPlan.queries.join(' || '));
  return { rowsAdded: rows.length, mode: searchPlan.mode, queries: searchPlan.queries };
}

function syncInboundReplies() {
  const started = new Date();
  const logSheet = sheet_(BRIDGE.INBOX_LOG);
  const existingIds = getExistingMessageIds_(logSheet);
  const sentThreadIndex = buildSentThreadIndex_();
  const searchPlan = buildInboundSearchPlan_();
  const maxMessages = Number(getConfig_('MAX_INBOUND_MESSAGES_PER_SYNC') || 200);
  const senderEmail = getSenderEmail_();
  const rows = [];

  for (let q = 0; q < searchPlan.queries.length && rows.length < maxMessages; q++) {
    const query = searchPlan.queries[q];
    const remaining = Math.max(1, maxMessages - rows.length);
    const threads = GmailApp.search(query, 0, Math.min(remaining, 500));
    for (let i = 0; i < threads.length && rows.length < maxMessages; i++) {
      const thread = threads[i];
      const threadMatch = sentThreadIndex[thread.getId()] || {};
      const messages = thread.getMessages();
      for (let j = 0; j < messages.length && rows.length < maxMessages; j++) {
        const message = messages[j];
        if (isSentByMe_(message, senderEmail)) continue;
        const messageId = message.getId();
        if (existingIds[messageId]) continue;

        const body = safePlainBody_(message);
        const match = matchUniversity_(message, body);
        if (searchPlan.logMatchedOnly && !match.name && !threadMatch.threadId) continue;

        const university = match.name || threadMatch.university || '';
        const opportunityId = match.opportunityId || threadMatch.opportunityId || '';
        const applicationId = match.applicationId || threadMatch.applicationId || '';

        rows.push([
          Utilities.getUuid(),
          messageId,
          thread.getId(),
          message.getDate(),
          message.getFrom(),
          message.getTo(),
          message.getCc(),
          message.getSubject(),
          body.slice(0, 1200),
          attachmentSummary_(message),
          university,
          opportunityId,
          applicationId,
          threadMatch.messageId || '',
          query,
          started,
          'https://mail.google.com/mail/u/0/#inbox/' + messageId,
          labelSummary_(message),
          university ? 'Matched Reply' : 'Thread Reply',
          searchPlan.mode
        ]);
        existingIds[messageId] = true;
      }
    }
  }

  if (rows.length) {
    logSheet.getRange(logSheet.getLastRow() + 1, 1, rows.length, INBOX_LOG_HEADERS.length).setValues(rows);
  }
  const reconciliation = reconcileInboundReplies_();
  setConfig_('LAST_INBOUND_SYNC_ISO', started.toISOString(), 'Last successful inbound-reply sync timestamp.');
  logRun_('syncInboundReplies', 'OK', rows.length, rows.length, 0, 0, 0, 'Mode: ' + searchPlan.mode + '; replies reconciled: ' + reconciliation.replies + '; queries: ' + searchPlan.queries.join(' || '));
  return { rowsAdded: rows.length, mode: searchPlan.mode, queries: searchPlan.queries, reconciliation: reconciliation };
}

function processApprovedEmailQueue() {
  const sheet = sheet_(BRIDGE.SEND_QUEUE);
  let values = readUsedRows_(sheet, SEND_QUEUE_HEADERS.length);
  if (values.length < 2) {
    logRun_('processApprovedEmailQueue', 'OK', 0, 0, 0, 0, 0, 'No queue rows.');
    return { processed: 0, sent: 0, drafts: 0, errors: 0 };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let processed = 0;
  let sent = 0;
  let drafts = 0;
  let errors = 0;
  let autoApproval = { approved: 0, blocked: 0, skipped: 0 };

  try {
    let headerMap = headerMap_(values[0]);
    if (configIsTrue_('AUTO_APPROVE_QUEUE_ROWS', false)) {
      autoApproval = autoApproveQueueRows_(sheet, values, headerMap);
      if (autoApproval.approved || autoApproval.blocked) {
        SpreadsheetApp.flush();
        values = readUsedRows_(sheet, SEND_QUEUE_HEADERS.length);
        headerMap = headerMap_(values[0]);
      }
    }
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const approval = cell_(row, headerMap, 'Approval Status');
      const sendStatus = cell_(row, headerMap, 'Send Status');
      const mode = (cell_(row, headerMap, 'Send Mode') || getConfig_('DEFAULT_SEND_MODE') || 'CREATE_DRAFT').toUpperCase();

      if (String(approval).toLowerCase() !== 'approved') continue;
      if (isFinalQueueSendStatus_(sendStatus)) continue;
      if (!isDue_(cell_(row, headerMap, 'Not Before'))) continue;

      const rowNumber = r + 1;
      try {
        const contentCheck = validateQueueEmailContentSafety_(row, headerMap);
        if (!contentCheck.ok) {
          errors++;
          setCell_(sheet, rowNumber, headerMap, 'Send Status', contentCheck.status || 'Blocked - Content Review');
          setCell_(sheet, rowNumber, headerMap, 'Last Error', contentCheck.message || 'Outbound email content needs review.');
          appendQueueNote_(sheet, rowNumber, headerMap, contentCheck.message || 'Outbound email content needs review.');
          continue;
        }

        const packageCheck = validateQueuePackageCompleteness_(sheet, rowNumber, row, headerMap);
        if (!packageCheck.ok) {
          errors++;
          setCell_(sheet, rowNumber, headerMap, 'Send Status', packageCheck.status || 'Blocked - Package Incomplete');
          setCell_(sheet, rowNumber, headerMap, 'Last Error', packageCheck.message || 'Package is incomplete.');
          continue;
        }

        const attachmentCheck = verifyQueueAttachmentsForRow_(row, headerMap);
        appendQueueNote_(sheet, rowNumber, headerMap, attachmentCheck.message);

        setCell_(sheet, rowNumber, headerMap, 'Send Status', 'Processing');
        SpreadsheetApp.flush();

        const to = cell_(row, headerMap, 'To');
        const subject = cell_(row, headerMap, 'Subject');
        const body = cell_(row, headerMap, 'Body');
        const options = buildMailOptions_(row, headerMap);
        if (!to || !subject || !body) throw new Error('Missing To, Subject, or Body.');

        if (mode === 'SEND_NOW') {
          GmailApp.sendEmail(to, subject, body, options);
          setCell_(sheet, rowNumber, headerMap, 'Send Status', 'Sent');
          setCell_(sheet, rowNumber, headerMap, 'Sent At', new Date());
          sent++;
        } else {
          const draft = GmailApp.createDraft(to, subject, body, options);
          setCell_(sheet, rowNumber, headerMap, 'Send Status', 'Draft Created');
          setCell_(sheet, rowNumber, headerMap, 'Gmail Draft ID', draft.getId());
          setCell_(sheet, rowNumber, headerMap, 'Gmail Message ID', draft.getMessage().getId());
          setCell_(sheet, rowNumber, headerMap, 'Thread ID', draft.getMessage().getThread().getId());
          drafts++;
        }
        setCell_(sheet, rowNumber, headerMap, 'Last Error', '');
        processed++;
      } catch (err) {
        errors++;
        setCell_(sheet, rowNumber, headerMap, 'Send Status', 'Error');
        setCell_(sheet, rowNumber, headerMap, 'Last Error', String(err && err.message ? err.message : err));
      }
    }
  } finally {
    lock.releaseLock();
  }

  logRun_('processApprovedEmailQueue', errors ? 'Completed with errors' : 'OK', autoApproval.approved, processed, sent, drafts, errors, 'Auto-approved: ' + autoApproval.approved + '; duplicate/review blocks: ' + autoApproval.blocked + '.');
  return { processed: processed, sent: sent, drafts: drafts, errors: errors, autoApproval: autoApproval };
}

function testAttachmentAccess() {
  return testAttachmentAccessForQueue_(getConfig_('ATTACHMENT_TEST_QUEUE_ID'));
}

function testAttachmentAccessForQueue_(queueId) {
  const sheet = sheet_(BRIDGE.SEND_QUEUE);
  const values = readUsedRows_(sheet, SEND_QUEUE_HEADERS.length);
  if (values.length < 2) {
    throw new Error('No queue rows found.');
  }

  const headerMap = headerMap_(values[0]);
  const targetQueueId = String(queueId || '').trim();
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const rowQueueId = String(cell_(row, headerMap, 'Queue ID') || '').trim();
    const attachmentUrls = cell_(row, headerMap, 'Attachment Drive URLs');
    if (!attachmentUrls) continue;
    if (targetQueueId && rowQueueId !== targetQueueId) continue;
    if (!targetQueueId && String(cell_(row, headerMap, 'Approval Status')).toLowerCase() !== 'approved') continue;
    const blobs = getDriveBlobsFromUrls_(attachmentUrls);
    const names = blobs.map(function(blob) { return blob.getName(); });
    logRun_('testAttachmentAccess', 'OK', 0, 1, 0, 0, 0, 'Queue ID: ' + rowQueueId + '; prepared ' + blobs.length + ' attachment(s): ' + names.join('; '));
    return { ok: true, queueId: rowQueueId, attachments: names };
  }

  if (targetQueueId) throw new Error('Queue ID not found or has no Attachment Drive URLs: ' + targetQueueId);
  throw new Error('No approved queue row has Attachment Drive URLs to test. Set ATTACHMENT_TEST_QUEUE_ID in Email Bridge Config to test a draft row.');
}

function syncPackageFilesForPackage(packageId) {
  ensureSheets_();
  const result = syncPackageFilesForPackage_(packageId || '');
  logRun_('syncPackageFilesForPackage', 'OK', result.rowsAdded, result.rowsProcessed, 0, 0, result.errors, 'Package ID: ' + (packageId || 'ALL'));
  return result;
}

function copyPackageFilesToFolder(packageId) {
  ensureSheets_();
  syncPackageFilesForPackage_(packageId || '');
  const result = copyPackageFilesToFolder_(packageId || '');
  logRun_('copyPackageFilesToFolder', result.errors ? 'Completed with errors' : 'OK', result.rowsAdded, result.rowsProcessed, 0, 0, result.errors, 'Package ID: ' + (packageId || 'ALL'));
  return result;
}

function verifyPackageFiles(packageId) {
  ensureSheets_();
  const result = verifyPackageFiles_(packageId || '');
  logRun_('verifyPackageFiles', result.errors ? 'Completed with errors' : 'OK', 0, result.rowsProcessed, 0, 0, result.errors, 'Package ID: ' + (packageId || 'ALL'));
  return result;
}

function uploadPackageFile(payload) {
  return uploadPackageFile_(payload || {});
}

function verifyQueueAttachments(queueId) {
  const sheet = sheet_(BRIDGE.SEND_QUEUE);
  const values = readUsedRows_(sheet, SEND_QUEUE_HEADERS.length);
  if (values.length < 2) throw new Error('No queue rows found.');
  const map = headerMap_(values[0]);
  const targetQueueId = String(queueId || '').trim();
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const rowQueueId = String(cell_(row, map, 'Queue ID') || '').trim();
    if (targetQueueId && rowQueueId !== targetQueueId) continue;
    if (!targetQueueId && String(cell_(row, map, 'Approval Status')).toLowerCase() !== 'approved') continue;
    if (!targetQueueId && isFinalQueueSendStatus_(cell_(row, map, 'Send Status'))) continue;
    const result = verifyQueueAttachmentsForRow_(row, map);
    logRun_('verifyQueueAttachments', 'OK', 0, 1, 0, 0, 0, 'Queue ID: ' + rowQueueId + '; ' + result.message);
    return result;
  }
  if (targetQueueId) throw new Error('Queue ID not found: ' + targetQueueId);
  throw new Error('No approved queue row found to verify.');
}

function validateEmailContentSafety(queueId) {
  const sheet = sheet_(BRIDGE.SEND_QUEUE);
  const values = readUsedRows_(sheet, SEND_QUEUE_HEADERS.length);
  if (values.length < 2) throw new Error('No queue rows found.');
  const map = headerMap_(values[0]);
  const targetQueueId = String(queueId || '').trim();
  const checked = [];
  const blocked = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const rowQueueId = String(cell_(row, map, 'Queue ID') || '').trim();
    if (targetQueueId && rowQueueId !== targetQueueId) continue;
    if (!targetQueueId && String(cell_(row, map, 'Approval Status')).toLowerCase() !== 'approved') continue;
    if (!targetQueueId && isFinalQueueSendStatus_(cell_(row, map, 'Send Status'))) continue;
    const result = validateQueueEmailContentSafety_(row, map);
    checked.push({ queueId: rowQueueId, ok: result.ok, message: result.message || '' });
    if (!result.ok) blocked.push({ queueId: rowQueueId, message: result.message || '' });
  }
  if (targetQueueId && !checked.length) throw new Error('Queue ID not found: ' + targetQueueId);
  logRun_('validateEmailContentSafety', blocked.length ? 'Blocked' : 'OK', 0, checked.length, 0, 0, blocked.length, blocked.length ? blocked.map(function(item) { return item.queueId + ': ' + item.message; }).join(' | ') : 'Checked ' + checked.length + ' queue row(s).');
  return { ok: blocked.length === 0, checked: checked.length, blocked: blocked };
}

function validatePackageCompleteness(applicationId, opportunityId) {
  ensureSheets_();
  const result = validatePackageCompleteness_(applicationId || '', opportunityId || '');
  logRun_('validatePackageCompleteness', result.ok ? 'OK' : 'Blocked', 0, 1, 0, 0, result.ok ? 0 : 1, result.message || '');
  return result;
}

function syncConfiguredPackageFiles() {
  return syncPackageFilesForPackage(getConfig_('PACKAGE_TEST_PACKAGE_ID') || '');
}

function copyConfiguredPackageFilesToFolder() {
  return copyPackageFilesToFolder(getConfig_('PACKAGE_TEST_PACKAGE_ID') || '');
}

function verifyConfiguredPackageFiles() {
  return verifyPackageFiles(getConfig_('PACKAGE_TEST_PACKAGE_ID') || '');
}

function validateConfiguredPackageCompleteness() {
  return validatePackageCompleteness(
    getConfig_('PACKAGE_TEST_APPLICATION_ID') || '',
    getConfig_('PACKAGE_TEST_OPPORTUNITY_ID') || ''
  );
}

function verifyConfiguredQueueAttachments() {
  const queueId = getConfig_('ATTACHMENT_TEST_QUEUE_ID') || '';
  if (!queueId) {
    return {
      skipped: true,
      reason: 'ATTACHMENT_TEST_QUEUE_ID is blank.'
    };
  }
  return verifyQueueAttachments(queueId);
}

function setDefaultSendMode(mode, updateQueuedRows) {
  ensureSheets_();
  const normalized = normalizeSendMode_(mode || 'SEND_NOW');
  setConfig_(
    'DEFAULT_SEND_MODE',
    normalized,
    'CREATE_DRAFT creates Gmail drafts. SEND_NOW sends approved queue rows directly when processQueue runs.'
  );
  const rowsUpdated = isTrue_(updateQueuedRows) ? updateQueuedSendModes_(normalized) : 0;
  logRun_('setDefaultSendMode', 'OK', rowsUpdated, 0, 0, 0, 0, 'Default send mode set to ' + normalized + '.');
  return {
    ok: true,
    defaultSendMode: normalized,
    queuedRowsUpdated: rowsUpdated,
    approvalGate: 'Only Email Send Queue rows with Approval Status = Approved can be processed.'
  };
}

function setAutoProcessApprovedQueue(enabled) {
  ensureSheets_();
  const value = isTrue_(enabled) ? 'TRUE' : 'FALSE';
  setConfig_(
    'AUTO_PROCESS_APPROVED_QUEUE',
    value,
    'When TRUE, scheduled staff may call processQueue for already-approved rows. processQueue still verifies packages and attachments before sending.'
  );
  logRun_('setAutoProcessApprovedQueue', 'OK', 0, 0, 0, 0, 0, 'AUTO_PROCESS_APPROVED_QUEUE set to ' + value + '.');
  return {
    ok: true,
    autoProcessApprovedQueue: value,
    approvalGate: 'Only Email Send Queue rows with Approval Status = Approved can be processed.'
  };
}

function setAutoApproveQueueRows(enabled) {
  ensureSheets_();
  const value = isTrue_(enabled) ? 'TRUE' : 'FALSE';
  setConfig_(
    'AUTO_APPROVE_QUEUE_ROWS',
    value,
    'When TRUE, queue rows are auto-approved unless they repeat a professor/supervisor recipient.'
  );
  const result = value === 'TRUE' ? autoApproveQueueRows() : { approved: 0, blocked: 0, skipped: 0 };
  logRun_('setAutoApproveQueueRows', 'OK', result.approved || 0, result.approved || 0, 0, 0, result.blocked || 0, 'AUTO_APPROVE_QUEUE_ROWS set to ' + value + '.');
  return {
    ok: true,
    autoApproveQueueRows: value,
    result: result,
    exception: 'Repeated professor/supervisor recipients are blocked for manual review.'
  };
}

function autoApproveQueueRows() {
  ensureSheets_();
  const sheet = sheet_(BRIDGE.SEND_QUEUE);
  const values = readUsedRows_(sheet, SEND_QUEUE_HEADERS.length);
  if (values.length < 2) return { approved: 0, blocked: 0, skipped: 0 };
  const headerMap = headerMap_(values[0]);
  const result = autoApproveQueueRows_(sheet, values, headerMap);
  logRun_('autoApproveQueueRows', 'OK', result.approved, result.approved + result.blocked + result.skipped, 0, 0, result.blocked, 'Repeated professor/supervisor blocks: ' + result.blocked + '.');
  return result;
}

function getEmailQueueStatus(limit) {
  ensureSheets_();
  const sheet = sheet_(BRIDGE.SEND_QUEUE);
  const values = readUsedRows_(sheet, SEND_QUEUE_HEADERS.length);
  const maxRows = Math.max(1, Number(limit || 20));
  if (values.length < 2) {
    return { totalRows: 0, sent: [], errors: [], blocked: [], queued: [] };
  }
  const map = headerMap_(values[0]);
  const result = {
    totalRows: values.length - 1,
    sent: [],
    errors: [],
    blocked: [],
    queued: []
  };
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const status = String(cell_(row, map, 'Send Status') || '').trim();
    const item = {
      rowNumber: r + 1,
      queueId: cell_(row, map, 'Queue ID'),
      opportunityId: cell_(row, map, 'Opportunity ID'),
      applicationId: cell_(row, map, 'ApplicationID'),
      recipientType: cell_(row, map, 'Recipient Type'),
      recipientName: cell_(row, map, 'Recipient Name'),
      to: cell_(row, map, 'To'),
      subject: cell_(row, map, 'Subject'),
      sendMode: cell_(row, map, 'Send Mode'),
      approvalStatus: cell_(row, map, 'Approval Status'),
      sendStatus: status,
      sentAt: cell_(row, map, 'Sent At'),
      lastError: cell_(row, map, 'Last Error')
    };
    const upper = status.toUpperCase();
    if (upper === 'SENT' || upper === 'SENT - REPLY RECEIVED') pushLimited_(result.sent, item, maxRows);
    else if (upper === 'ERROR') pushLimited_(result.errors, item, maxRows);
    else if (upper.indexOf('BLOCKED') === 0 || upper.indexOf('NEEDS REVIEW') === 0) pushLimited_(result.blocked, item, maxRows);
    else if (['', 'QUEUED', 'READY', 'DRAFTED'].indexOf(upper) >= 0) pushLimited_(result.queued, item, maxRows);
  }
  return result;
}

function getAiStaffDashboard(payload) {
  ensureSheets_();
  ensureAiStaffSheets_();
  payload = payload || {};
  const now = payload.now ? new Date(payload.now) : new Date();
  const limit = Math.max(5, Math.min(Number(payload.limit || 30), 100));
  const tasks = selectAiStaffTaskRows_();
  const followUps = selectAiStaffFollowUpRows_();
  const entities = selectAiStaffEntityRows_();
  const registry = selectAiStaffRegistryRows_();
  const queue = selectEmailQueueRows_();
  const audit = isTrue_(payload.runAudit) ? auditAiStaffProcessHealth({
    now: now,
    staleDays: payload.staleDays || 7,
    followUpEscalationHours: payload.followUpEscalationHours || AI_STAFF_FOLLOW_UP_ESCALATION_HOURS
  }) : { ok: true, skipped: true, issueCount: 0, issues: [] };
  const openTasks = tasks.filter(function(task) { return isOpenAiStaffWorkStatus_(task.status); });
  const waitingCodexTasks = openTasks.filter(function(task) { return isCodexWorkerHandoffTask_(task); });
  const locallyRunnableTasks = openTasks.filter(function(task) { return !isCodexWorkerHandoffTask_(task); });
  const openFollowUps = followUps.filter(function(followUp) {
    return isTruthy_(followUp.active) && isOpenAiStaffWorkStatus_(followUp.status);
  });
  const dueTasks = locallyRunnableTasks.filter(function(task) { return dateIsDue_(task.runAfter || task.dueAt, now); });
  const overdueTasks = locallyRunnableTasks.filter(function(task) { return dateIsOverdue_(task.dueAt, now); });
  const dueFollowUps = openFollowUps.filter(function(followUp) { return dateIsDue_(followUp.runAfter || followUp.dueAt, now); });
  const overdueFollowUps = openFollowUps.filter(function(followUp) { return dateIsOverdue_(followUp.dueAt, now); });
  const activeEntities = entities.filter(function(entity) {
    return isTruthy_(entity.active) && !isAiStaffTerminalStatus_(entity.currentStatus);
  });
  const needsReviewTasks = tasks.filter(function(task) {
    return isOpenAiStaffWorkStatus_(task.status) &&
      !isCodexWorkerHandoffTask_(task) &&
      (isManagerReviewStatus_(task.status) || isManagerReviewStatus_(task.failureStatus) || task.lastError);
  });
  const needsReviewFollowUps = followUps.filter(function(followUp) { return isTruthy_(followUp.active) && (isManagerReviewStatus_(followUp.status) || dateIsOverdue_(followUp.dueAt, now)); });
  const blockedQueue = queue.filter(function(row) { return isManagerReviewStatus_(row.approvalStatus) || isManagerReviewStatus_(row.sendStatus); });
  const sentToday = queue.filter(function(row) {
    return String(row.sendStatus || '').toLowerCase() === 'sent' && sameDay_(row.sentAt, now);
  }).length;
  return {
    ok: true,
    refreshedAt: now,
    workbookUrl: 'https://docs.google.com/spreadsheets/d/' + BRIDGE.SPREADSHEET_ID + '/edit',
    summary: {
      activeEntities: activeEntities.length,
      openTasks: openTasks.length,
      dueTasks: dueTasks.length,
      waitingCodexWorker: waitingCodexTasks.length,
      overdueTasks: overdueTasks.length,
      openFollowUps: openFollowUps.length,
      dueFollowUps: dueFollowUps.length,
      overdueFollowUps: overdueFollowUps.length,
      managerReview: needsReviewTasks.length + needsReviewFollowUps.length + blockedQueue.length + (audit.issueCount || 0),
      openEscalations: needsReviewTasks.length + needsReviewFollowUps.length + blockedQueue.length + (audit.issueCount || 0),
      sentToday: sentToday,
      queuedEmails: getEmailQueueStatus(5).queued.length,
      blockedEmails: getEmailQueueStatus(5).blocked.length
    },
    staff: buildAiStaffDashboardSummary_(registry, tasks, followUps, entities, now),
    managerReview: {
      tasks: limitRows_(sortAiStaffWorkForDashboard_(needsReviewTasks, now).map(function(row) { return compactDashboardTask_(row, now); }), limit),
      followUps: limitRows_(sortAiStaffWorkForDashboard_(needsReviewFollowUps, now).map(function(row) { return compactDashboardFollowUp_(row, now); }), limit),
      queue: limitRows_(blockedQueue.map(compactDashboardQueueRow_), limit),
      auditIssues: limitRows_(audit.issues || [], limit)
    },
    tasks: limitRows_(sortAiStaffWorkForDashboard_(openTasks, now).map(function(row) { return compactDashboardTask_(row, now); }), limit),
    followUps: limitRows_(sortAiStaffWorkForDashboard_(openFollowUps, now).map(function(row) { return compactDashboardFollowUp_(row, now); }), limit),
    applications: limitRows_(sortEntitiesForDashboard_(activeEntities).map(compactDashboardEntity_), limit),
    emailQueue: getEmailQueueStatus(limit),
    recentEvents: recentSheetObjects_(BRIDGE.AI_STAFF_EVENT_LOG, AI_STAFF_EVENT_LOG_HEADERS, limit),
    recentRuns: recentSheetObjects_(BRIDGE.AI_STAFF_RUN_LOG, AI_STAFF_RUN_LOG_HEADERS, limit),
    recentReports: recentSheetObjects_(BRIDGE.AI_STAFF_REPORTS, AI_STAFF_REPORT_HEADERS, Math.min(limit, 10)),
    skillUpdates: recentSheetObjects_(BRIDGE.AI_STAFF_SKILL_UPDATES, AI_STAFF_SKILL_UPDATE_HEADERS, Math.min(limit, 20))
  };
}

function pushLimited_(array, item, limit) {
  if (array.length < limit) array.push(item);
}

function normalizeSendMode_(mode) {
  const normalized = String(mode || '').trim().toUpperCase();
  if (['CREATE_DRAFT', 'SEND_NOW'].indexOf(normalized) < 0) {
    throw new Error('Invalid send mode. Use CREATE_DRAFT or SEND_NOW.');
  }
  return normalized;
}

function updateQueuedSendModes_(mode) {
  const sheet = sheet_(BRIDGE.SEND_QUEUE);
  const values = readUsedRows_(sheet, SEND_QUEUE_HEADERS.length);
  if (values.length < 2) return 0;
  const headerMap = headerMap_(values[0]);
  const finalStatuses = [
    'SENT',
    'DRAFT CREATED',
    'ERROR',
    'DO NOT SEND',
    'CANCELLED',
    'REPLIED',
    'REPLY RECEIVED',
    'SENT - REPLY RECEIVED'
  ];
  let updated = 0;
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const sendStatus = String(cell_(row, headerMap, 'Send Status') || '').trim().toUpperCase();
    if (finalStatuses.indexOf(sendStatus) >= 0) continue;
    setCell_(sheet, r + 1, headerMap, 'Send Mode', mode);
    updated++;
  }
  return updated;
}

function isTrue_(value) {
  return ['TRUE', 'YES', 'Y', '1', 'ON'].indexOf(String(value || '').trim().toUpperCase()) >= 0 || value === true;
}

function autoApproveQueueRows_(sheet, values, headerMap) {
  const seen = {};
  const approvedBy = getConfig_('AUTO_APPROVE_APPROVED_BY') || 'Swiss Planner AI Staff';
  const now = new Date();
  let approved = 0;
  let blocked = 0;
  let skipped = 0;

  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const rowNumber = r + 1;
    const approval = String(cell_(row, headerMap, 'Approval Status') || '').trim();
    const sendStatus = String(cell_(row, headerMap, 'Send Status') || '').trim();
    const repeated = isRepeatedProfessorRecipient_(row, headerMap, seen);
    const terminal = isFinalQueueSendStatus_(sendStatus) || isTerminalApprovalStatus_(approval);

    if (repeated && !isFinalQueueSendStatus_(sendStatus)) {
      setCell_(sheet, rowNumber, headerMap, 'Approval Status', 'Needs Review - Duplicate Recipient');
      setCell_(sheet, rowNumber, headerMap, 'Send Status', 'Blocked - Duplicate Recipient');
      setCell_(sheet, rowNumber, headerMap, 'Last Error', repeated.message);
      appendQueueNote_(sheet, rowNumber, headerMap, repeated.message);
      blocked++;
      rememberRecipient_(seen, row, headerMap, rowNumber);
      continue;
    }

    if (terminal || approval.toLowerCase() === 'approved') {
      skipped++;
      rememberRecipient_(seen, row, headerMap, rowNumber);
      continue;
    }

    setCell_(sheet, rowNumber, headerMap, 'Approval Status', 'Approved');
    setCell_(sheet, rowNumber, headerMap, 'Approved By', approvedBy);
    setCell_(sheet, rowNumber, headerMap, 'Approved At', now);
    if (!sendStatus || ['drafted', 'queued - not approved', 'needs approval', 'ready'].indexOf(sendStatus.toLowerCase()) >= 0) {
      setCell_(sheet, rowNumber, headerMap, 'Send Status', 'Queued');
    }
    appendQueueNote_(sheet, rowNumber, headerMap, 'Auto-approved: no repeated professor/supervisor recipient detected.');
    approved++;
    rememberRecipient_(seen, row, headerMap, rowNumber);
  }

  return { approved: approved, blocked: blocked, skipped: skipped };
}

function isRepeatedProfessorRecipient_(row, headerMap, seen) {
  if (!isProfessorLikeQueueRow_(row, headerMap)) return null;
  const key = recipientKeyForQueueRow_(row, headerMap);
  if (!key) return null;
  const previous = seen[key];
  if (!previous) return null;
  return {
    key: key,
    message: 'Manual review required: repeated professor/supervisor recipient matches queue row ' + previous.rowNumber + ' (' + previous.label + ').'
  };
}

function rememberRecipient_(seen, row, headerMap, rowNumber) {
  const key = recipientKeyForQueueRow_(row, headerMap);
  if (!key || seen[key]) return;
  seen[key] = {
    rowNumber: rowNumber,
    label: String(cell_(row, headerMap, 'Recipient Name') || cell_(row, headerMap, 'To') || key)
  };
}

function recipientKeyForQueueRow_(row, headerMap) {
  const email = firstEmail_(cell_(row, headerMap, 'To'));
  if (email) return 'email:' + email;
  const name = normalizePersonName_(cell_(row, headerMap, 'Recipient Name'));
  return name ? 'name:' + name : '';
}

function firstEmail_(value) {
  const match = String(value || '').toLowerCase().match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
  return match ? match[0] : '';
}

function normalizePersonName_(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(prof|professor|dr|doctor|assoc|assistant|associate)\b\.?/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isProfessorLikeQueueRow_(row, headerMap) {
  const text = [
    cell_(row, headerMap, 'Recipient Type'),
    cell_(row, headerMap, 'Recipient Name'),
    cell_(row, headerMap, 'Subject')
  ].join(' ').toLowerCase();
  return /(prof|professor|supervisor|principal investigator|\bpi\b)/.test(text);
}

function isFinalQueueSendStatus_(status) {
  return [
    'SENT',
    'DRAFT CREATED',
    'PROCESSING',
    'ERROR',
    'DO NOT SEND',
    'CANCELLED',
    'BLOCKED - PACKAGE INCOMPLETE',
    'BLOCKED - ATTACHMENTS FAILED',
    'BLOCKED - CONTENT REVIEW',
    'REPLIED',
    'REPLY RECEIVED',
    'SENT - REPLY RECEIVED'
  ].indexOf(String(status || '').trim().toUpperCase()) >= 0;
}

function isTerminalApprovalStatus_(approval) {
  return [
    'REJECTED',
    'DO NOT SEND',
    'CANCELLED',
    'NEEDS REVIEW - DUPLICATE RECIPIENT'
  ].indexOf(String(approval || '').trim().toUpperCase()) >= 0;
}

function runConfiguredPackageSmokeTest() {
  const packageId = getConfig_('PACKAGE_TEST_PACKAGE_ID') || '';
  const applicationId = getConfig_('PACKAGE_TEST_APPLICATION_ID') || '';
  const opportunityId = getConfig_('PACKAGE_TEST_OPPORTUNITY_ID') || '';
  const queueId = getConfig_('ATTACHMENT_TEST_QUEUE_ID') || '';
  const syncResult = syncPackageFilesForPackage(packageId);
  const copyResult = copyPackageFilesToFolder(packageId);
  const verifyResult = verifyPackageFiles(packageId);
  const completenessResult = validatePackageCompleteness(applicationId, opportunityId);
  let queueResult = { skipped: true, reason: 'ATTACHMENT_TEST_QUEUE_ID is blank.' };
  if (queueId) {
    try {
      queueResult = verifyQueueAttachments(queueId);
    } catch (err) {
      queueResult = {
        ok: false,
        skipped: false,
        queueId: queueId,
        error: String(err && err.message ? err.message : err),
        recommendation: 'Set ATTACHMENT_TEST_QUEUE_ID to a real Email Send Queue Queue ID such as queue_agh_knez_20260527, or leave it blank to skip queue attachment verification in this smoke test.'
      };
    }
  }
  return {
    sync: syncResult,
    copy: copyResult,
    verifyPackage: verifyResult,
    completeness: completenessResult,
    queueAttachments: queueResult
  };
}

function syncAghKnezPackageFiles() {
  createAghKnezPreparedPackageFolder();
  return syncPackageFilesForPackage(getAghKnezPackageId_());
}

function copyAghKnezPackageFilesToFolder() {
  createAghKnezPreparedPackageFolder();
  return copyPackageFilesToFolder(getAghKnezPackageId_());
}

function verifyAghKnezPackageFiles() {
  createAghKnezPreparedPackageFolder();
  return verifyPackageFiles(getAghKnezPackageId_());
}

function validateAghKnezPackageCompleteness() {
  createAghKnezPreparedPackageFolder();
  return validatePackageCompleteness('app_agh_drilling_knez_2026', 'opp_agh_drilling_knez_2026');
}

function verifyAghKnezQueueAttachments() {
  return verifyQueueAttachments('queue_agh_knez_20260527');
}

function runAghKnezPackageSmokeTest() {
  createAghKnezPreparedPackageFolder();
  const packageId = getAghKnezPackageId_();
  return {
    sync: syncPackageFilesForPackage(packageId),
    copy: copyPackageFilesToFolder(packageId),
    verifyPackage: verifyPackageFiles(packageId),
    completeness: validatePackageCompleteness('app_agh_drilling_knez_2026', 'opp_agh_drilling_knez_2026'),
    queueAttachments: verifyQueueAttachments('queue_agh_knez_20260527')
  };
}

function getAghKnezPackageId_() {
  const pkg = findBestPackageForApplication_('app_agh_drilling_knez_2026', 'opp_agh_drilling_knez_2026');
  return pkg ? pkg.packageId : '';
}

function reconcileInboundReplies() {
  const result = reconcileInboundReplies_();
  logRun_('reconcileInboundReplies', 'OK', 0, result.rowsProcessed, 0, 0, result.errors, 'Replies reconciled: ' + result.replies);
  return result;
}

function setupAiStaffWorkbook() {
  ensureSheets_();
  ensureAiStaffSheets_();
  const seeded = seedDefaultAiStaffKpis_();
  const process = setupAiStaffProcessSchema();
  logRun_('setupAiStaffWorkbook', 'OK', seeded + process.seeded, 0, 0, 0, 0, 'AI Staff workbook/process tabs ready. Default rows added: ' + (seeded + process.seeded));
  return { ok: true, tabsReady: true, defaultKpisAdded: seeded, processSchema: process };
}

function setupAiStaffProcessSchema() {
  ensureAiStaffSheets_();
  const seeded = seedAiStaffRegistryAndTemplates_();
  logRun_('setupAiStaffProcessSchema', 'OK', seeded, 0, 0, 0, 0, 'AI Staff process engine schema ready. Registry/template rows added: ' + seeded);
  return { ok: true, processTabsReady: true, seeded: seeded };
}

function upsertAiStaffEntity(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const entityId = payload.entityId || payload.EntityID || makeAiStaffEntityId_(payload);
  const now = new Date();
  const record = {
    'EntityID': entityId,
    'Entity Type': payload.entityType || payload.type || 'Application',
    'Related ID': payload.relatedId || payload.relatedID || payload.relatedApplicationId || payload.relatedApplicationID || payload.relatedOpportunityId || '',
    'Related Opportunity ID': payload.relatedOpportunityId || payload.opportunityId || '',
    'Related ApplicationID': payload.relatedApplicationId || payload.relatedApplicationID || payload.applicationId || '',
    'Current Stage': payload.currentStage || payload.stage || 'Application Created',
    'Current Status': payload.currentStatus || payload.status || 'Active',
    'Responsible Staff': payload.responsibleStaff || payload.responsible || 'AIstaff_Manager',
    'Priority': payload.priority || 'Medium',
    'Deadline': payload.deadline || '',
    'Active': payload.active === undefined ? 'TRUE' : String(payload.active),
    'Last Follow-up ID': payload.lastFollowUpId || '',
    'Last Task ID': payload.lastTaskId || '',
    'Last Updated': now,
    'Notes': payload.notes || ''
  };
  const result = upsertAiStaffEntityRecord_(record, payload.user || payload.staff || 'AIstaff_Manager', payload.reason || 'Entity upserted.', payload.evidenceLink || '');
  const entity = findAiStaffEntity_(entityId);
  if (payload.ensureFollowUp !== false) ensureAiStaffEntityFollowUp_(entity, payload.followUp || {});
  return { ok: true, entityId: entityId, added: result.added, updated: result.updated };
}

function updateAiStaffEntityStatus(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const entity = resolveAiStaffEntity_(payload);
  if (!entity) throw new Error('AI Staff entity not found.');
  const updates = {};
  if (payload.currentStage !== undefined || payload.stage !== undefined) updates['Current Stage'] = payload.currentStage || payload.stage;
  if (payload.currentStatus !== undefined || payload.status !== undefined) updates['Current Status'] = payload.currentStatus || payload.status;
  if (payload.responsibleStaff !== undefined || payload.responsible !== undefined) updates['Responsible Staff'] = payload.responsibleStaff || payload.responsible;
  if (payload.priority !== undefined) updates['Priority'] = payload.priority;
  if (payload.deadline !== undefined) updates['Deadline'] = payload.deadline;
  if (payload.active !== undefined) updates['Active'] = String(payload.active);
  if (payload.notes !== undefined) updates['Notes'] = payload.notes;
  updates['Last Updated'] = new Date();
  updateAiStaffEntityFields_(entity.entityId, updates, payload.user || payload.staff || 'AIstaff_Manager', payload.reason || 'Entity status updated.', payload.evidenceLink || '');
  const updated = findAiStaffEntity_(entity.entityId);
  if (isAiStaffTerminalStatus_(updated.currentStatus) || !isTruthy_(updated.active)) {
    closeAiStaffFollowUpsForEntity_(updated.entityId, payload.user || 'AIstaff_Manager', 'Entity is terminal or inactive.');
  } else if (payload.ensureFollowUp !== false) {
    ensureAiStaffEntityFollowUp_(updated, payload.followUp || {});
  }
  return { ok: true, entityId: updated.entityId, status: updated.currentStatus, stage: updated.currentStage };
}

function appendAiStaffRunLog(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const row = [
    payload.runId || 'staff_run_' + Utilities.getUuid(),
    payload.runTimestamp || new Date(),
    payload.runType || '',
    payload.kpiSnapshot || '',
    payload.actionsCompleted || '',
    payload.rowsAddedUpdated || '',
    payload.packagesPrepared || '',
    payload.draftsQueued || '',
    payload.sendsBlocked || '',
    payload.repliesReconciled || '',
    payload.kpiProgress || '',
    payload.nextRunFocus || '',
    payload.notes || ''
  ];
  sheet_(BRIDGE.AI_STAFF_RUN_LOG).appendRow(row);
  return { ok: true, runId: row[0] };
}

function appendAiStaffReport(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const row = [
    payload.reportId || 'staff_report_' + Utilities.getUuid(),
    payload.date || new Date(),
    payload.period || '',
    payload.summary || '',
    payload.kpiProgress || '',
    payload.completedWork || '',
    payload.blockers || '',
    payload.approvalRequests || '',
    payload.recommendedNextActions || ''
  ];
  sheet_(BRIDGE.AI_STAFF_REPORTS).appendRow(row);
  return { ok: true, reportId: row[0] };
}

function appendAiStaffDecision(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const row = [
    payload.decisionId || 'staff_decision_' + Utilities.getUuid(),
    payload.date || new Date(),
    payload.decisionType || '',
    payload.recommendation || '',
    payload.reason || '',
    payload.evidence || '',
    payload.approvalNeeded || '',
    payload.approvalStatus || 'Drafted',
    payload.userResponse || '',
    payload.finalActionTaken || ''
  ];
  sheet_(BRIDGE.AI_STAFF_DECISIONS).appendRow(row);
  return { ok: true, decisionId: row[0] };
}

function appendAiStaffTask(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const taskId = payload.taskId || 'staff_task_' + Utilities.getUuid();
  const entityId = payload.entityId || payload.EntityID || payload.relatedEntityId || '';
  const record = {
    'Task ID': taskId,
    'Created At': payload.createdAt || new Date(),
    'Task Type': payload.taskType || payload.type || '',
    'Task Template ID': payload.taskTemplateId || payload.templateId || '',
    'Assigned To': payload.assignedTo || payload.staff || '',
    'Created By': payload.createdBy || 'AIstaff_Manager',
    'EntityID': entityId,
    'Related Opportunity ID': payload.relatedOpportunityId || payload.opportunityId || '',
    'Related ApplicationID': payload.relatedApplicationId || payload.relatedApplicationID || payload.applicationId || '',
    'KPI ID': payload.kpiId || '',
    'Priority': payload.priority || '',
    'Run After': payload.runAfter || '',
    'Due At': payload.dueAt || payload.due || '',
    'Deadline': payload.deadline || '',
    'Depends On': payload.dependsOn || '',
    'Status': payload.status || 'Queued',
    'Next Action': payload.nextAction || '',
    'Completion Criteria': payload.completionCriteria || '',
    'Success Status': payload.successStatus || '',
    'Failure Status': payload.failureStatus || '',
    'Last Error': payload.lastError || '',
    'Evidence Link': payload.evidenceLink || '',
    'Completed At': payload.completedAt || '',
    'Result Notes': payload.resultNotes || '',
    'Task Category': payload.taskCategory || payload.category || '',
    'ThreadID': payload.threadId || payload.ThreadID || '',
    'Source Staff': payload.sourceStaff || payload.createdBy || '',
    'Target Staff': payload.targetStaff || payload.assignedTo || payload.staff || '',
    'Escalation Level': payload.escalationLevel || '',
    'Learning Candidate ID': payload.learningCandidateId || ''
  };
  appendMappedRow_(sheet_(BRIDGE.AI_STAFF_RUN_QUEUE), AI_STAFF_RUN_QUEUE_HEADERS, record);
  if (entityId) {
    updateAiStaffEntityFields_(entityId, { 'Last Task ID': taskId, 'Last Updated': new Date() }, payload.createdBy || 'AIstaff_Manager', 'Task assigned to entity.', payload.evidenceLink || '');
  }
  appendAiStaffEvent_('Task Created', entityId, '', 'Last Task ID', '', taskId, payload.createdBy || 'AIstaff_Manager', payload.nextAction || 'Task created.', payload.evidenceLink || '');
  return { ok: true, taskId: taskId };
}

function appendAiStaffFollowUp(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const followUpId = payload.followUpId || 'staff_followup_' + Utilities.getUuid();
  const entityId = payload.entityId || payload.EntityID || '';
  if (!entityId) throw new Error('appendAiStaffFollowUp requires entityId.');
  const staff = payload.staff || payload.assignedTo || payload.createdBy || 'AIstaff_Manager';
  const record = {
    'FollowUpID': followUpId,
    'EntityID': entityId,
    'Staff': staff,
    'Reason': payload.reason || '',
    'Run After': payload.runAfter || payload.dueAt || '',
    'Due At': payload.dueAt || payload.runAfter || '',
    'Active': payload.active === undefined ? 'TRUE' : String(payload.active),
    'Status': payload.status || 'Queued',
    'Next Action': payload.nextAction || '',
    'Completion Criteria': payload.completionCriteria || '',
    'Created By': payload.createdBy || staff,
    'Created At': payload.createdAt || new Date(),
    'Completed At': payload.completedAt || '',
    'Result': payload.result || '',
    'Evidence Link': payload.evidenceLink || ''
  };
  appendMappedRow_(sheet_(BRIDGE.AI_STAFF_FOLLOW_UPS), AI_STAFF_FOLLOW_UP_HEADERS, record);
  updateAiStaffEntityFields_(entityId, { 'Last Follow-up ID': followUpId, 'Last Updated': new Date() }, payload.createdBy || staff, payload.reason || 'Follow-up created.', payload.evidenceLink || '');
  appendAiStaffEvent_('Follow-up Created', entityId, '', 'Last Follow-up ID', '', followUpId, payload.createdBy || staff, payload.reason || 'Follow-up created.', payload.evidenceLink || '');
  return { ok: true, followUpId: followUpId };
}

function appendAiStaffThread(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const threadId = payload.threadId || payload.ThreadID || 'staff_thread_' + Utilities.getUuid();
  const record = {
    'ThreadID': threadId,
    'TaskID': payload.taskId || payload.TaskID || '',
    'EntityID': payload.entityId || payload.EntityID || '',
    'ApplicationID': payload.applicationId || payload.ApplicationID || payload.relatedApplicationId || '',
    'OpportunityID': payload.opportunityId || payload.OpportunityID || payload.relatedOpportunityId || '',
    'Started By': payload.startedBy || payload.started_by || '',
    'Responsible': payload.responsible || payload.sourceStaff || '',
    'Status': payload.status || 'Open',
    'Created At': payload.createdAt || new Date(),
    'Closed At': payload.closedAt || '',
    'Archived': payload.archived === undefined ? 'FALSE' : String(payload.archived),
    'Last Message At': payload.lastMessageAt || new Date()
  };
  upsertMappedRow_(sheet_(BRIDGE.AI_STAFF_THREADS), AI_STAFF_THREAD_HEADERS, 'ThreadID', threadId, record);
  return { ok: true, threadId: threadId };
}

function appendAiStaffThreadMessage(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const messageId = payload.messageId || payload.MessageID || 'staff_msg_' + Utilities.getUuid();
  const record = {
    'MessageID': messageId,
    'ThreadID': payload.threadId || payload.ThreadID || '',
    'TaskID': payload.taskId || payload.TaskID || '',
    'Sender Type': payload.senderType || '',
    'SenderID': payload.senderId || payload.SenderID || '',
    'Sender Label': payload.senderLabel || '',
    'Body': payload.body || '',
    'Language': payload.language || 'natural',
    'Created At': payload.createdAt || new Date(),
    'Read By Human': payload.readByHuman === undefined ? '' : String(payload.readByHuman),
    'Read By Staff': payload.readByStaff === undefined ? '' : String(payload.readByStaff),
    'Evidence Link': payload.evidenceLink || ''
  };
  appendMappedRow_(sheet_(BRIDGE.AI_STAFF_THREAD_MESSAGES), AI_STAFF_THREAD_MESSAGE_HEADERS, record);
  return { ok: true, messageId: messageId };
}

function appendAiStaffSkillUpdate(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const learningId = payload.learningId || payload.LearningID || 'learning_' + Utilities.getUuid();
  const record = {
    'LearningID': learningId,
    'Source ThreadID': payload.sourceThreadId || payload.threadId || '',
    'StaffID': payload.staffId || payload.staff || 'AIstaff_Manager',
    'Proposed Rule': payload.proposedRule || payload.rule || '',
    'Reason': payload.reason || '',
    'Evidence': payload.evidence || payload.evidenceLink || '',
    'Status': payload.status || 'Pending',
    'Approved By': payload.approvedBy || '',
    'Applied At': payload.appliedAt || '',
    'Target Skill File': payload.targetSkillFile || ''
  };
  upsertMappedRow_(sheet_(BRIDGE.AI_STAFF_SKILL_UPDATES), AI_STAFF_SKILL_UPDATE_HEADERS, 'LearningID', learningId, record);
  return { ok: true, learningId: learningId };
}

function approveAiStaffSkillUpdate(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const learningId = payload.learningId || payload.LearningID || '';
  if (!learningId) throw new Error('approveAiStaffSkillUpdate requires learningId.');
  const sheet = sheet_(BRIDGE.AI_STAFF_SKILL_UPDATES);
  const values = readUsedRows_(sheet, AI_STAFF_SKILL_UPDATE_HEADERS.length);
  const map = values.length ? headerMap_(values[0]) : {};
  for (let r = 1; r < values.length; r++) {
    if (String(cell_(values[r], map, 'LearningID') || '') !== String(learningId)) continue;
      updateMappedRow_(sheet, r + 1, map, {
        'Status': 'Approved',
        'Approved By': payload.approvedBy || 'Human_Iman',
        'Applied At': payload.appliedAt || new Date(),
        'Target Skill File': payload.targetSkillFile || cell_(values[r], map, 'Target Skill File') || ''
      });
      return { ok: true, learningId: learningId, status: 'Approved' };
  }
  throw new Error('Learning candidate not found: ' + learningId);
}

function markAiStaffThreadLearningCandidate(payload) {
  payload = payload || {};
  return appendAiStaffSkillUpdate({
    learningId: payload.learningId,
    sourceThreadId: payload.threadId || payload.sourceThreadId,
    staffId: payload.staffId || 'AIstaff_Manager',
    proposedRule: payload.proposedRule || payload.rule || '',
    reason: payload.reason || 'Learning proposed from closed task thread.',
    evidence: payload.evidence || payload.threadId || '',
    status: 'Pending',
    targetSkillFile: payload.targetSkillFile || ''
  });
}

function completeAiStaffTask(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const taskId = payload.taskId || '';
  if (!taskId) throw new Error('completeAiStaffTask requires taskId.');
  const task = findAiStaffTask_(taskId);
  if (!task) throw new Error('Task not found: ' + taskId);
  const status = payload.status || (payload.success === false ? 'Blocked' : 'Done');
  const updates = {
    'Status': status,
    'Completed At': payload.completedAt || new Date(),
    'Result Notes': payload.result || payload.resultNotes || '',
    'Last Error': payload.lastError || ''
  };
  updateMappedRow_(task.sheet, task.rowNumber, task.headerMap, updates);
  const entityId = payload.entityId || task.entityId;
  const nextStatus = payload.entityStatus || payload.currentStatus || (status === 'Done' ? (payload.successStatus || task.successStatus) : (payload.failureStatus || task.failureStatus));
  if (entityId && nextStatus) {
    const followUpOptions = payload.followUp || {};
    if (payload.followUp && followUpOptions.replaceExisting === undefined) followUpOptions.replaceExisting = true;
    const entityUpdate = {
      entityId: entityId,
      status: nextStatus,
      user: payload.user || task.assignedTo || 'AIstaff_Manager',
      reason: payload.result || 'Task completed: ' + taskId,
      evidenceLink: payload.evidenceLink || task.evidenceLink || '',
      ensureFollowUp: payload.ensureFollowUp,
      followUp: followUpOptions
    };
    if (payload.entityStage || payload.currentStage) entityUpdate.stage = payload.entityStage || payload.currentStage;
    updateAiStaffEntityStatus(entityUpdate);
  } else if (entityId && payload.ensureFollowUp !== false) {
    const entity = findAiStaffEntity_(entityId);
    ensureAiStaffEntityFollowUp_(entity, payload.followUp || {});
  }
  appendAiStaffEvent_('Task Completed', entityId, '', 'Task Status', task.status, status, payload.user || task.assignedTo || 'AIstaff_Manager', payload.result || 'Task completed.', payload.evidenceLink || task.evidenceLink || '');
  return { ok: true, taskId: taskId, status: status };
}

function completeAiStaffFollowUp(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const followUpId = payload.followUpId || '';
  if (!followUpId) throw new Error('completeAiStaffFollowUp requires followUpId.');
  const followUp = findAiStaffFollowUp_(followUpId);
  if (!followUp) throw new Error('Follow-up not found: ' + followUpId);
  const status = payload.status || 'Done';
  updateMappedRow_(followUp.sheet, followUp.rowNumber, followUp.headerMap, {
    'Active': 'FALSE',
    'Status': status,
    'Completed At': payload.completedAt || new Date(),
    'Result': payload.result || '',
    'Evidence Link': payload.evidenceLink || followUp.evidenceLink || ''
  });
  appendAiStaffEvent_('Follow-up Completed', followUp.entityId, '', 'Follow-up Status', followUp.status, status, payload.user || followUp.staff || 'AIstaff_Manager', payload.result || 'Follow-up completed.', payload.evidenceLink || followUp.evidenceLink || '');
  if (payload.createTask) {
    const taskPayload = payload.createTask;
    taskPayload.entityId = taskPayload.entityId || followUp.entityId;
    taskPayload.createdBy = taskPayload.createdBy || followUp.staff || 'AIstaff_Manager';
    appendAiStaffTask(taskPayload);
  }
  if (payload.nextFollowUp) {
    const nextPayload = payload.nextFollowUp;
    nextPayload.entityId = nextPayload.entityId || followUp.entityId;
    nextPayload.staff = nextPayload.staff || followUp.staff;
    appendAiStaffFollowUp(nextPayload);
  } else if (payload.ensureFollowUp !== false) {
    const entity = findAiStaffEntity_(followUp.entityId);
    ensureAiStaffEntityFollowUp_(entity, payload.followUp || {});
  }
  return { ok: true, followUpId: followUpId, status: status };
}

function reassignAiStaffTask(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const taskId = payload.taskId || '';
  if (!taskId) throw new Error('reassignAiStaffTask requires taskId.');
  const task = findAiStaffTask_(taskId);
  if (!task) throw new Error('Task not found: ' + taskId);
  const assignedTo = payload.assignedTo || payload.staff || '';
  if (!assignedTo) throw new Error('reassignAiStaffTask requires assignedTo.');
  const updates = {
    'Assigned To': assignedTo,
    'Status': payload.status || 'Queued',
    'Last Error': '',
    'Result Notes': appendText_(task.resultNotes, payload.reason || 'Task reassigned.')
  };
  if (payload.runAfter !== undefined) updates['Run After'] = payload.runAfter;
  if (payload.dueAt !== undefined) updates['Due At'] = payload.dueAt;
  updateMappedRow_(task.sheet, task.rowNumber, task.headerMap, updates);
  appendAiStaffEvent_('Task Reassigned', task.entityId, '', 'Assigned To', task.assignedTo, assignedTo, payload.user || 'AIstaff_Manager', payload.reason || 'Task reassigned from Command Center.', payload.evidenceLink || task.evidenceLink || '');
  return { ok: true, taskId: taskId, assignedTo: assignedTo };
}

function snoozeAiStaffTask(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const taskId = payload.taskId || '';
  if (!taskId) throw new Error('snoozeAiStaffTask requires taskId.');
  const task = findAiStaffTask_(taskId);
  if (!task) throw new Error('Task not found: ' + taskId);
  const dueAt = resolveSnoozeDate_(payload);
  const updates = {
    'Run After': payload.runAfter || dueAt,
    'Due At': dueAt,
    'Status': payload.status || 'Queued',
    'Result Notes': appendText_(task.resultNotes, payload.reason || 'Task snoozed.')
  };
  updateMappedRow_(task.sheet, task.rowNumber, task.headerMap, updates);
  appendAiStaffEvent_('Task Snoozed', task.entityId, '', 'Due At', task.dueAt, dueAt, payload.user || 'AIstaff_Manager', payload.reason || 'Task snoozed from Command Center.', payload.evidenceLink || task.evidenceLink || '');
  return { ok: true, taskId: taskId, dueAt: dueAt };
}

function snoozeAiStaffFollowUp(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const followUpId = payload.followUpId || '';
  if (!followUpId) throw new Error('snoozeAiStaffFollowUp requires followUpId.');
  const followUp = findAiStaffFollowUp_(followUpId);
  if (!followUp) throw new Error('Follow-up not found: ' + followUpId);
  const dueAt = resolveSnoozeDate_(payload);
  updateMappedRow_(followUp.sheet, followUp.rowNumber, followUp.headerMap, {
    'Run After': payload.runAfter || dueAt,
    'Due At': dueAt,
    'Active': 'TRUE',
    'Status': payload.status || 'Queued',
    'Result': appendText_(followUp.result, payload.reason || 'Follow-up snoozed.')
  });
  appendAiStaffEvent_('Follow-up Snoozed', followUp.entityId, '', 'Due At', followUp.dueAt, dueAt, payload.user || 'AIstaff_Manager', payload.reason || 'Follow-up snoozed from Command Center.', payload.evidenceLink || followUp.evidenceLink || '');
  return { ok: true, followUpId: followUpId, dueAt: dueAt };
}

function closeAiStaffEntity(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const entity = resolveAiStaffEntity_(payload);
  if (!entity) throw new Error('AI Staff entity not found.');
  const status = payload.status || 'No Further Action';
  updateAiStaffEntityStatus({
    entityId: entity.entityId,
    status: status,
    active: payload.active === undefined ? 'FALSE' : payload.active,
    notes: appendText_(entity.notes, payload.reason || 'Entity closed from Command Center.'),
    user: payload.user || 'AIstaff_Manager',
    reason: payload.reason || 'Entity closed from Command Center.',
    evidenceLink: payload.evidenceLink || '',
    ensureFollowUp: false
  });
  closeAiStaffFollowUpsForEntity_(entity.entityId, payload.user || 'AIstaff_Manager', payload.reason || 'Entity closed from Command Center.');
  return { ok: true, entityId: entity.entityId, status: status };
}

function updateEmailQueueApproval(payload) {
  ensureSheets_();
  payload = payload || {};
  const queueId = payload.queueId || payload.id || '';
  if (!queueId) throw new Error('updateEmailQueueApproval requires queueId.');
  const queue = findEmailQueueRowById_(queueId);
  if (!queue) throw new Error('Queue ID not found: ' + queueId);
  const approvalStatus = payload.approvalStatus || payload.approval || '';
  if (!approvalStatus) throw new Error('updateEmailQueueApproval requires approvalStatus.');
  const updates = {
    'Approval Status': approvalStatus,
    'Approved By': payload.approvedBy || payload.user || 'AIstaff_Manager',
    'Approved At': payload.approvedAt || new Date(),
    'Notes': appendText_(cell_(queue.rawRow, queue.headerMap, 'Notes'), payload.notes || payload.reason || 'Approval updated from Command Center.')
  };
  if (payload.sendMode) updates['Send Mode'] = payload.sendMode;
  if (payload.notBefore !== undefined) updates['Not Before'] = payload.notBefore;
  if (String(approvalStatus).toLowerCase() === 'approved' && isManagerReviewStatus_(queue.sendStatus)) {
    updates['Send Status'] = 'Queued';
    updates['Last Error'] = '';
  }
  updateMappedRow_(queue.sheet, queue.rowNumber, queue.headerMap, updates);
  logRun_('updateEmailQueueApproval', 'OK', 0, 1, 0, 0, 0, 'Queue ID: ' + queueId + '; approval=' + approvalStatus);
  return { ok: true, queueId: queueId, approvalStatus: approvalStatus };
}

function getDueAiStaffWork(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const staff = String(payload.staff || payload.staffId || '').trim();
  const now = payload.now ? new Date(payload.now) : new Date();
  return {
    ok: true,
    staff: staff,
    tasks: dueAiStaffTasks_(staff, now),
    followUps: dueAiStaffFollowUps_(staff, now)
  };
}

function auditAiStaffProcessHealth(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const now = payload.now ? new Date(payload.now) : new Date();
  const staleDays = Number(payload.staleDays || 7);
  const followUpEscalationHours = Number(payload.followUpEscalationHours || AI_STAFF_FOLLOW_UP_ESCALATION_HOURS);
  const issues = [];
  auditEntitiesForMissingFollowUps_(issues, now);
  auditOverdueTasks_(issues, now);
  auditOverdueFollowUps_(issues, now, followUpEscalationHours);
  auditBlockedAndStaleEntities_(issues, now, staleDays);
  logRun_('auditAiStaffProcessHealth', issues.length ? 'Issues Found' : 'OK', 0, issues.length, 0, 0, issues.length, 'AI Staff process health issues: ' + issues.length);
  appendAiStaffReport({
    reportId: 'staff_audit_' + Utilities.getUuid(),
    date: now,
    period: 'Process Health',
    summary: issues.length ? 'Process health issues found: ' + issues.length : 'No process health issues found.',
    blockers: JSON.stringify(issues.slice(0, 20)),
    recommendedNextActions: issues.length ? 'Review AI Staff Event Log, Follow Ups, and Tasks.' : 'Continue normal staff cycle.'
  });
  return { ok: true, issueCount: issues.length, issues: issues };
}

function runAiStaffTaskRunner(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  const started = new Date();
  const requestedMaxItems = Number(payload.maxItems || payload.limit || getConfig_('AI_STAFF_TASK_RUNNER_MAX_ITEMS') || 1);
  const maxItems = Math.max(1, Math.min(isNaN(requestedMaxItems) ? 1 : requestedMaxItems, 5));
  const staff = String(payload.staff || payload.staffId || '').trim();
  const results = [];
  let reset = { tasksReset: 0, followUpsReset: 0 };
  try {
    reset = resetStaleAiStaffRunningWork_(
      Number(payload.staleHours || getConfig_('AI_STAFF_TASK_RUNNER_STALE_HOURS') || 3),
      started
    );
    if (payload.skipAudit !== true && String(payload.skipAudit || '').toLowerCase() !== 'true') {
      auditAiStaffProcessHealth({ now: started, followUpEscalationHours: AI_STAFF_FOLLOW_UP_ESCALATION_HOURS });
    }
    for (let i = 0; i < maxItems; i++) {
      const work = getDueAiStaffWork({ staff: staff, now: started });
      const next = pickNextAiStaffWork_(work.tasks, work.followUps, started);
      if (!next) break;
      results.push(processOneAiStaffWork_(next, payload));
    }
    appendAiStaffRunLog({
      runType: 'AI Staff Task Runner',
      actionsCompleted: results.map(function(item) { return item.kind + ':' + item.id + '=' + item.status; }).join('; '),
      rowsAddedUpdated: results.length,
      sendsBlocked: results.filter(function(item) { return String(item.status || '').toLowerCase().indexOf('blocked') >= 0 || String(item.status || '').toLowerCase().indexOf('needs approval') >= 0; }).length,
      nextRunFocus: results.length ? 'Continue due AI Staff task queue.' : 'No due AI Staff work found.',
      notes: 'Stale resets: tasks=' + reset.tasksReset + ', follow-ups=' + reset.followUpsReset + '.'
    });
    return {
      ok: true,
      processed: results.length,
      reset: reset,
      results: results,
      message: results.length ? 'Processed ' + results.length + ' due AI Staff item(s).' : 'No due AI Staff work found.'
    };
  } catch (err) {
    appendAiStaffRunLog({
      runType: 'AI Staff Task Runner',
      sendsBlocked: 1,
      nextRunFocus: 'Review runner error.',
      notes: String(err && err.message ? err.message : err)
    });
    return { ok: false, processed: results.length, reset: reset, error: String(err && err.message ? err.message : err), results: results };
  } finally {
    lock.releaseLock();
  }
}

function resetStaleAiStaffRunningWork(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  return resetStaleAiStaffRunningWork_(
    Number(payload.staleHours || getConfig_('AI_STAFF_TASK_RUNNER_STALE_HOURS') || 3),
    payload.now ? new Date(payload.now) : new Date()
  );
}

function processQueueRow(queueId) {
  ensureSheets_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return processApprovedEmailQueueById_(queueId || '');
  } finally {
    lock.releaseLock();
  }
}

function appendAiStaffKpi(payload) {
  ensureAiStaffSheets_();
  payload = payload || {};
  const row = [
    payload.kpiId || 'staff_kpi_' + Utilities.getUuid(),
    payload.periodType || '',
    payload.startDate || '',
    payload.endDate || '',
    payload.targetUnit || '',
    payload.targetCount || '',
    payload.geographyPriority || '',
    payload.fieldPriority || '',
    payload.minimumFitScore || '',
    payload.requiredEvidenceLevel || '',
    payload.status || 'Active',
    payload.ownerNotes || ''
  ];
  sheet_(BRIDGE.AI_STAFF_KPIS).appendRow(row);
  return { ok: true, kpiId: row[0] };
}

function createBridgeDriveSmokeTest() {
  const parent = packageParentFolder_();
  const started = new Date();
  const stamp = Utilities.formatDate(started, Session.getScriptTimeZone(), 'yyyy-MM-dd HHmmss');
  const folder = parent.createFolder('TEST - Swiss Planner Gmail Bridge - ' + stamp);
  const doc = DocumentApp.create('TEST Attachment - Swiss Planner Gmail Bridge - ' + stamp);
  const body = doc.getBody();
  body.appendParagraph('TEST ATTACHMENT - SWISS PLANNER GMAIL BRIDGE').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Purpose');
  body.appendParagraph('This file was created by the Apps Script account to verify that Gmail can attach files from the shared application Drive area.');
  body.appendParagraph('If testAttachmentAccess() can prepare this file, the account and folder permissions are suitable for package attachments.');
  body.appendParagraph('Created at: ' + started.toISOString());
  body.appendParagraph('Created by Apps Script user: ' + getSenderEmail_());
  doc.saveAndClose();

  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);
  const pdfName = file.getAs(MimeType.PDF).getName();

  const result = {
    folderUrl: folder.getUrl(),
    docUrl: doc.getUrl(),
    fileId: doc.getId(),
    pdfName: pdfName
  };
  logRun_('createBridgeDriveSmokeTest', 'OK', 1, 1, 0, 0, 0, 'Folder: ' + result.folderUrl + '; Doc: ' + result.docUrl);
  return result;
}

function createPackageFolderIndex(opportunityId, applicationId, packageName) {
  const parent = packageParentFolder_();
  return createPackageFolderIndexInParent_(parent, opportunityId, applicationId, packageName);
}

function createPreparedPackageFolderIndex(opportunityId, applicationId, packageName) {
  const parent = preparedPackagesFolder_();
  return createPackageFolderIndexInParent_(parent, opportunityId, applicationId, packageName);
}

function createAghKnezPreparedPackageFolder() {
  return createAndRegisterPreparedPackage({
    opportunityId: 'opp_agh_drilling_knez_2026',
    applicationId: 'app_agh_drilling_knez_2026',
    opportunityTitle: 'AGH Doctoral School - ZB 0039/26 Borehole Wall Stress Gradients',
    packageName: '202605_AGH Krakow_ZB0039_Knez_Borehole Stress Gradients',
    academicCvUrl: 'https://docs.google.com/document/d/1g3PwfT60FynuwRW26BXZxIOO0iiSLIpi0pekGeSmh5k',
    proposalUrl: 'https://docs.google.com/document/d/16JlAuVcH_hFizwGXbukomihNNjIWKG3HY6FcHgWVvsE',
    publicationListUrl: 'https://docs.google.com/document/d/1AY8WQqZAGOYuGCSgtyNHE-3eUk4hq6LrmrsP2L22F58',
    outreachDraftPaths: 'Email Send Queue: queue_agh_knez_20260527',
    packageStatus: 'Drive Folder Created - Attachment Access Needs Verification',
    notes: 'AGH Knez ZB0039 package folder created under 10. Swiss Planner Applications.'
  });
}

function createPackageFolderIndexInParent_(parent, opportunityId, applicationId, packageName) {
  const safeOpportunity = sanitizeDriveName_(opportunityId || 'opportunity');
  const safeName = sanitizeDriveName_(packageName || applicationId || 'Application Package');
  const folderName = safeOpportunity + ' - ' + safeName;
  const folder = getOrCreateChildFolder_(parent, folderName);
  const indexTitle = 'Package Index - ' + safeOpportunity + ' - ' + safeName;
  const indexFile = getOrCreatePackageIndexDoc_(folder, indexTitle, opportunityId, applicationId);
  const result = {
    folderUrl: folder.getUrl(),
    indexDocUrl: indexFile.getUrl()
  };
  logRun_('createPackageFolderIndex', 'OK', 1, 1, 0, 0, 0, 'Folder: ' + result.folderUrl + '; Index: ' + result.indexDocUrl);
  return result;
}

function createAndRegisterPreparedPackage(payload) {
  payload = payload || {};
  const opportunityId = payload.opportunityId || '';
  const applicationId = payload.applicationId || '';
  const title = payload.opportunityTitle || payload.packageName || opportunityId || applicationId || 'Application Package';
  if (!opportunityId && !applicationId) {
    throw new Error('createAndRegisterPreparedPackage requires at least opportunityId or applicationId.');
  }

  const packageResult = createPreparedPackageFolderIndex(opportunityId, applicationId, payload.packageName || title);
  const now = new Date();
  const packageId = payload.packageId || 'pkg_' + sanitizeId_(applicationId || opportunityId) + '_' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const notes = [
    payload.notes || '',
    'Prepared-package folder auto-created/registered by Gmail Bridge.',
    'Package index: ' + packageResult.indexDocUrl,
    'All attachment files must pass testAttachmentAccess before any external send.'
  ].filter(Boolean).join(' ');

  upsertApplicationPackageRow_({
    packageId: packageId,
    applicationId: applicationId,
    opportunityId: opportunityId,
    opportunityTitle: title,
    targetFolder: packageResult.folderUrl,
    academicCvPath: payload.academicCvUrl || '',
    resumePath: payload.resumeUrl || '',
    sopPath: payload.sopUrl || '',
    proposalPath: payload.proposalUrl || '',
    publicationListPath: payload.publicationListUrl || '',
    checklistPath: payload.checklistUrl || '',
    pdfExports: payload.pdfExports || '',
    outreachDraftPaths: payload.outreachDraftPaths || '',
    packageStatus: payload.packageStatus || 'Drive Folder Created - Needs Package Files',
    lastUpdated: now,
    notes: notes
  });

  appendLinkRow_('link_package_folder_' + sanitizeId_(opportunityId || applicationId) + '_' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss'), 'Prepared package folder - ' + title, packageResult.folderUrl);
  appendLinkRow_('link_package_index_' + sanitizeId_(opportunityId || applicationId) + '_' + Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss'), 'Package index - ' + title, packageResult.indexDocUrl);
  updateQueuePackageNotes_(opportunityId, applicationId, packageResult.folderUrl, packageResult.indexDocUrl);
  const fileSync = syncPackageFilesForPackage_(packageId);
  const fileCopy = copyPackageFilesToFolder_(packageId);
  const fileVerify = verifyPackageFiles_(packageId);

  logRun_('createAndRegisterPreparedPackage', fileCopy.errors || fileVerify.errors ? 'Completed with package-file warnings' : 'OK', 1, 1, 0, 0, fileCopy.errors + fileVerify.errors, 'Package ID: ' + packageId + '; Folder: ' + packageResult.folderUrl);
  return {
    packageId: packageId,
    folderUrl: packageResult.folderUrl,
    indexDocUrl: packageResult.indexDocUrl,
    fileSync: fileSync,
    fileCopy: fileCopy,
    fileVerify: fileVerify
  };
}

function uploadPackageFile_(payload) {
  payload = payload || {};
  const applicationId = payload.applicationId || '';
  const opportunityId = payload.opportunityId || '';
  let packageId = payload.packageId || '';
  const documentType = payload.documentType || '';
  const fileName = sanitizeDriveName_(payload.fileName || documentType || 'package-file');
  const mimeType = payload.mimeType || 'application/pdf';
  const base64 = String(payload.base64 || '').trim();

  if (!documentType) throw new Error('uploadPackageFile requires documentType.');
  if (!fileName) throw new Error('uploadPackageFile requires fileName.');
  if (!base64) throw new Error('uploadPackageFile requires base64 content.');
  validateUploadStyleQuality_(payload, documentType, fileName, mimeType);

  let pkg = packageId ? findPackageById_(packageId) : findBestPackageForApplication_(applicationId, opportunityId);
  if (!pkg) {
    const created = createAndRegisterPreparedPackage({
      opportunityId: opportunityId,
      applicationId: applicationId,
      opportunityTitle: payload.opportunityTitle || payload.packageName || opportunityId || applicationId,
      packageName: payload.packageName || payload.opportunityTitle || opportunityId || applicationId,
      packageStatus: 'Drive Folder Created - Upload Started',
      notes: 'Package created automatically by uploadPackageFile.'
    });
    packageId = created.packageId;
    pkg = findPackageById_(packageId);
  }
  if (!pkg) throw new Error('Package row not found for upload after lookup/create.');

  pkg = ensurePackageFolderForPackage_(pkg);
  if (payload.replaceExisting !== false) {
    const existing = pkg.folder.getFilesByName(fileName);
    while (existing.hasNext()) {
      existing.next().setTrashed(true);
    }
  }

  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = pkg.folder.createFile(blob);
  const fileUrl = file.getUrl();
  const now = new Date();
  const fileId = payload.fileId || makePackageFileId_(pkg, documentType, fileUrl, sanitizeId_(fileName));

  upsertPackageFileRow_({
    fileId: fileId,
    packageId: pkg.packageId,
    applicationId: pkg.applicationId || applicationId,
    opportunityId: pkg.opportunityId || opportunityId,
    documentType: documentType,
    sourceUrl: payload.sourceUrl || '',
    packageFileUrl: fileUrl,
    status: 'Uploaded',
    lastChecked: now,
    lastError: ''
  });

  updateApplicationPackageDocumentPath_(pkg, documentType, fileUrl);
  if (mimeType === 'application/pdf') {
    appendCellAny_(pkg.sheet, pkg.rowNumber, pkg.headerMap, ['PDF Exports', 'PDF Export Paths'], fileUrl);
  }
  appendLinkRow_('link_uploaded_package_file_' + sanitizeId_(fileId), documentType + ' - ' + (pkg.opportunityTitle || pkg.opportunityId || pkg.packageId), fileUrl);
  logRun_('uploadPackageFile', 'OK', 1, 1, 0, 0, 0, 'Package ID: ' + pkg.packageId + '; File: ' + fileName);

  return {
    packageId: pkg.packageId,
    applicationId: pkg.applicationId,
    opportunityId: pkg.opportunityId,
    documentType: documentType,
    fileName: fileName,
    fileUrl: fileUrl,
    folderUrl: pkg.targetFolder
  };
}

function validateUploadStyleQuality_(payload, documentType, fileName, mimeType) {
  const type = String(documentType || '').toLowerCase();
  const isPdf = String(mimeType || '').toLowerCase() === 'application/pdf';
  const requiresQa = isPdf && (
    type.indexOf('academic cv') >= 0 ||
    type.indexOf('cv') >= 0 ||
    type.indexOf('resume') >= 0 ||
    type.indexOf('sop') >= 0 ||
    type.indexOf('statement') >= 0 ||
    type.indexOf('motivation') >= 0 ||
    type.indexOf('proposal') >= 0 ||
    type.indexOf('publication') >= 0
  );
  if (!requiresQa) return;

  const status = String(payload.styleQualityStatus || payload.styleQaStatus || '').trim().toLowerCase();
  const approvedStatuses = [
    'approved for external send',
    'style qa approved',
    'template qa passed',
    'approved',
    'passed'
  ];
  const explicitOverride = payload.allowUnstyledPdfUpload === true || String(payload.allowUnstyledPdfUpload || '').toUpperCase() === 'TRUE';
  if (approvedStatuses.indexOf(status) >= 0) return;

  if (explicitOverride) {
    logRun_(
      'uploadPackageFileStyleQA',
      'WARNING',
      0,
      1,
      0,
      0,
      0,
      'Manual override allowed unstyled PDF upload for ' + fileName + '.'
    );
    return;
  }

  throw new Error(
    'Document Style QA failed for ' + documentType + ' (' + fileName + '). ' +
    'Professor/university-facing PDF uploads must be exported from the approved template/Google Doc path. ' +
    'Pass styleQualityStatus="Approved for External Send" only after visual QA, or regenerate the package before upload.'
  );
}

function findPackageById_(packageId) {
  const packages = selectPackageRows_('');
  const target = String(packageId || '').trim();
  if (!target) return null;
  for (let i = 0; i < packages.length; i++) {
    if (String(packages[i].packageId || '').trim() === target) return packages[i];
  }
  return null;
}

function packageParentFolder_() {
  const folderId = getConfig_('DRIVE_PARENT_FOLDER_ID') || BRIDGE.DEFAULT_DRIVE_PARENT_FOLDER_ID;
  if (!folderId) throw new Error('DRIVE_PARENT_FOLDER_ID is not configured.');
  try {
    return DriveApp.getFolderById(folderId);
  } catch (err) {
    throw new Error('Cannot open DRIVE_PARENT_FOLDER_ID ' + folderId + '. Confirm the folder is shared with ' + getSenderEmail_() + ' as editor. ' + String(err && err.message ? err.message : err));
  }
}

function preparedPackagesFolder_() {
  const folderId = getConfig_('DRIVE_PREPARED_PACKAGES_FOLDER_ID') || BRIDGE.DEFAULT_PREPARED_PACKAGES_FOLDER_ID;
  if (!folderId) throw new Error('DRIVE_PREPARED_PACKAGES_FOLDER_ID is not configured.');
  try {
    return DriveApp.getFolderById(folderId);
  } catch (err) {
    throw new Error('Cannot open DRIVE_PREPARED_PACKAGES_FOLDER_ID ' + folderId + '. Confirm the folder is shared with ' + getSenderEmail_() + ' as editor. ' + String(err && err.message ? err.message : err));
  }
}

function getOrCreateChildFolder_(parent, name) {
  const existing = parent.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(name);
}

function getOrCreatePackageIndexDoc_(folder, title, opportunityId, applicationId) {
  const existing = folder.getFilesByName(title);
  if (existing.hasNext()) return existing.next();

  const doc = DocumentApp.create(title);
  const body = doc.getBody();
  body.appendParagraph('PACKAGE INDEX').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph('Opportunity ID: ' + (opportunityId || ''));
  body.appendParagraph('Application ID: ' + (applicationId || ''));
  body.appendParagraph('Folder: ' + folder.getUrl());
  body.appendParagraph('Rule: keep the editable Google Docs, final PDFs, email body, attachment list, and evidence links for this application inside this folder.');
  body.appendParagraph('Documents to include');
  body.appendListItem('Academic CV');
  body.appendListItem('Statement of purpose / motivation letter');
  body.appendListItem('Research proposal or concept note');
  body.appendListItem('Publication list appendix');
  body.appendListItem('Supervisor outreach email body');
  body.appendListItem('Evidence links and document checklist');
  body.appendParagraph('Send safety');
  body.appendListItem('Do not send external email until the Email Send Queue row is explicitly Approved.');
  body.appendListItem('Run testAttachmentAccess for the queue row before creating or sending any email with attachments.');
  doc.saveAndClose();

  const file = DriveApp.getFileById(doc.getId());
  file.moveTo(folder);
  return file;
}

function upsertApplicationPackageRow_(pkg) {
  const sheet = sheet_(BRIDGE.APPLICATION_PACKAGES);
  const width = 16;
  const values = readUsedRows_(sheet, width);
  if (values.length < 1) throw new Error('Application Packages sheet has no header row.');
  const map = headerMap_(values[0]);
  const row = [
    pkg.packageId,
    pkg.applicationId,
    pkg.opportunityId,
    pkg.opportunityTitle,
    pkg.targetFolder,
    pkg.academicCvPath,
    pkg.resumePath,
    pkg.sopPath,
    pkg.proposalPath,
    pkg.publicationListPath,
    pkg.checklistPath,
    pkg.pdfExports,
    pkg.outreachDraftPaths,
    pkg.packageStatus,
    pkg.lastUpdated,
    pkg.notes
  ];

  for (let r = 1; r < values.length; r++) {
    const currentApplicationId = String(cell_(values[r], map, 'ApplicationID') || '');
    const currentOpportunityId = String(cell_(values[r], map, 'Opportunity ID') || '');
    if ((pkg.applicationId && currentApplicationId === pkg.applicationId) || (pkg.opportunityId && currentOpportunityId === pkg.opportunityId)) {
      sheet.getRange(r + 1, 1, 1, width).setValues([row]);
      return;
    }
  }
  sheet.appendRow(row);
}

function appendLinkRow_(id, title, link) {
  const sheet = sheet_(BRIDGE.LINKS);
  const existing = readUsedRows_(sheet, 3);
  for (let i = 1; i < existing.length; i++) {
    if (existing[i][0] === id || existing[i][2] === link) return;
  }
  sheet.appendRow([id, title, link]);
}

function updateQueuePackageNotes_(opportunityId, applicationId, folderUrl, indexDocUrl) {
  const sheet = sheet_(BRIDGE.SEND_QUEUE);
  const values = readUsedRows_(sheet, SEND_QUEUE_HEADERS.length);
  if (values.length < 2) return;
  const map = headerMap_(values[0]);
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const rowOpportunityId = String(cell_(row, map, 'Opportunity ID') || '');
    const rowApplicationId = String(cell_(row, map, 'ApplicationID') || '');
    if ((opportunityId && rowOpportunityId === opportunityId) || (applicationId && rowApplicationId === applicationId)) {
      const notes = [
        cell_(row, map, 'Notes'),
        'Prepared package folder: ' + folderUrl,
        'Package index: ' + indexDocUrl
      ].filter(Boolean).join(' | ');
      setCell_(sheet, r + 1, map, 'Notes', notes);
    }
  }
}

function syncPackageFilesForPackage_(packageId) {
  const packages = selectPackageRows_(packageId);
  let rowsAdded = 0;
  let rowsProcessed = 0;
  let errors = 0;
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    const specs = packageDocumentSpecs_(pkg);
    for (let j = 0; j < specs.length; j++) {
      try {
        const sourceUrl = specs[j].sourceUrl;
        const hasDriveId = Boolean(extractDriveId_(sourceUrl));
        const result = upsertPackageFileRow_({
          fileId: makePackageFileId_(pkg, specs[j].documentType, sourceUrl, j),
          packageId: pkg.packageId,
          applicationId: pkg.applicationId,
          opportunityId: pkg.opportunityId,
          documentType: specs[j].documentType,
          sourceUrl: sourceUrl,
          packageFileUrl: '',
          status: hasDriveId ? 'Queued for Copy' : 'Tracked - Non Drive Source',
          lastChecked: new Date(),
          lastError: hasDriveId ? '' : 'Source is not a Drive URL and cannot be copied/attached automatically.'
        });
        if (result.added) rowsAdded++;
        rowsProcessed++;
      } catch (err) {
        errors++;
      }
    }
  }
  return { rowsAdded: rowsAdded, rowsProcessed: rowsProcessed, errors: errors, packages: packages.length };
}

function copyPackageFilesToFolder_(packageId) {
  const packages = selectPackageRows_(packageId);
  let rowsAdded = 0;
  let rowsProcessed = 0;
  let copied = 0;
  let errors = 0;

  for (let i = 0; i < packages.length; i++) {
    let pkg;
    try {
      pkg = ensurePackageFolderForPackage_(packages[i]);
    } catch (err) {
      errors++;
      continue;
    }
    const packageFileRows = selectPackageFileRows_(pkg.packageId);
    for (let j = 0; j < packageFileRows.length; j++) {
      const fileRow = packageFileRows[j];
      rowsProcessed++;
      if (fileRow.packageFileUrl && extractDriveId_(fileRow.packageFileUrl)) continue;
      const sourceId = extractDriveId_(fileRow.sourceUrl);
      if (!sourceId) {
        updatePackageFileRow_(fileRow.rowNumber, { status: 'Tracked - Non Drive Source', lastChecked: new Date(), lastError: 'No Drive file ID found in Source URL.' });
        continue;
      }

      try {
        const sourceFile = DriveApp.getFileById(sourceId);
        if (fileIsInFolder_(sourceFile, pkg.folder)) {
          const packageFileUrl = sourceFile.getUrl();
          updatePackageFileRow_(fileRow.rowNumber, { packageFileUrl: packageFileUrl, status: 'Copied', lastChecked: new Date(), lastError: '' });
          updateApplicationPackageDocumentPath_(pkg, fileRow.documentType, packageFileUrl);
          appendLinkRow_('link_package_file_' + sanitizeId_(fileRow.fileId), fileRow.documentType + ' - ' + (pkg.opportunityTitle || pkg.opportunityId || pkg.packageId), packageFileUrl);
          copied++;
          continue;
        }
        const copyName = packageCopyName_(pkg, fileRow.documentType, sourceFile.getName());
        const existing = pkg.folder.getFilesByName(copyName);
        const packageFile = existing.hasNext() ? existing.next() : sourceFile.makeCopy(copyName, pkg.folder);
        const packageFileUrl = packageFile.getUrl();
        updatePackageFileRow_(fileRow.rowNumber, { packageFileUrl: packageFileUrl, status: 'Copied', lastChecked: new Date(), lastError: '' });
        updateApplicationPackageDocumentPath_(pkg, fileRow.documentType, packageFileUrl);
        appendLinkRow_('link_package_file_' + sanitizeId_(fileRow.fileId), fileRow.documentType + ' - ' + (pkg.opportunityTitle || pkg.opportunityId || pkg.packageId), packageFileUrl);
        copied++;
      } catch (err) {
        errors++;
        updatePackageFileRow_(fileRow.rowNumber, {
          status: 'Needs Source Access',
          lastChecked: new Date(),
          lastError: 'Cannot copy source Drive file ' + sourceId + ': ' + String(err && err.message ? err.message : err)
        });
      }
    }
  }
  return { rowsAdded: rowsAdded, rowsProcessed: rowsProcessed, copied: copied, errors: errors, packages: packages.length };
}

function verifyPackageFiles_(packageId) {
  const packageFileRows = selectPackageFileRows_(packageId);
  let rowsProcessed = 0;
  let verified = 0;
  let errors = 0;
  for (let i = 0; i < packageFileRows.length; i++) {
    const row = packageFileRows[i];
    rowsProcessed++;
    const packageFileId = extractDriveId_(row.packageFileUrl);
    const sourceId = extractDriveId_(row.sourceUrl);
    if (!packageFileId) {
      if (sourceId) {
        try {
          DriveApp.getFileById(sourceId).getName();
          updatePackageFileRow_(row.rowNumber, { status: 'Needs Package Copy', lastChecked: new Date(), lastError: 'Source is accessible but has not yet been copied into the package folder.' });
        } catch (err) {
          errors++;
          updatePackageFileRow_(row.rowNumber, { status: 'Needs Source Access', lastChecked: new Date(), lastError: 'Cannot access source Drive file ' + sourceId + ': ' + String(err && err.message ? err.message : err) });
        }
      } else {
        updatePackageFileRow_(row.rowNumber, { status: 'Tracked - Non Drive Source', lastChecked: new Date(), lastError: 'No package Drive file URL is available.' });
      }
      continue;
    }

    try {
      getDriveBlobsFromUrls_(row.packageFileUrl);
      updatePackageFileRow_(row.rowNumber, { status: 'Verified', lastChecked: new Date(), lastError: '' });
      verified++;
    } catch (err) {
      errors++;
      updatePackageFileRow_(row.rowNumber, { status: 'Broken Package File', lastChecked: new Date(), lastError: String(err && err.message ? err.message : err) });
    }
  }
  return { rowsProcessed: rowsProcessed, verified: verified, errors: errors };
}

function validateQueuePackageCompleteness_(queueSheet, rowNumber, row, headerMap) {
  if (!configIsTrue_('ENFORCE_PACKAGE_COMPLETENESS', true)) return { ok: true, message: 'Package completeness enforcement disabled.' };
  const recipientType = String(cell_(row, headerMap, 'Recipient Type') || '');
  const requiredTypes = requiredDocumentTypesForRecipient_(recipientType);
  if (!requiredTypes.length) return { ok: true, message: 'No formal package attachments required for this recipient type.' };
  if (isInternalOnlyRecipient_(cell_(row, headerMap, 'To'), cell_(row, headerMap, 'CC'), cell_(row, headerMap, 'BCC'))) {
    return { ok: true, message: 'Internal/self email; package completeness check relaxed.' };
  }
  if (rowAllowsNoAttachments_(row, headerMap)) {
    return { ok: true, message: 'Explicit no-attachment fit inquiry allowed.' };
  }

  const applicationId = String(cell_(row, headerMap, 'ApplicationID') || '');
  const opportunityId = String(cell_(row, headerMap, 'Opportunity ID') || '');
  const packageRow = findBestPackageForApplication_(applicationId, opportunityId);
  if (!packageRow) {
    return {
      ok: false,
      status: 'Blocked - Package Incomplete',
      message: 'No Application Packages row found for ApplicationID "' + applicationId + '" / Opportunity ID "' + opportunityId + '".'
    };
  }

  syncPackageFilesForPackage_(packageRow.packageId);
  copyPackageFilesToFolder_(packageRow.packageId);
  verifyPackageFiles_(packageRow.packageId);

  const missing = missingRequiredPackageTypes_(packageRow.packageId, requiredTypes);
  if (missing.length) {
    return {
      ok: false,
      status: 'Blocked - Package Incomplete',
      message: 'Package ' + packageRow.packageId + ' is missing verified required file(s): ' + missing.join(', ') + applicationDocsHint_(applicationId, opportunityId, missing)
    };
  }

  const packageUrls = collectPackageAttachmentUrls_(packageRow.packageId, requiredTypes);
  if (!packageUrls.length) {
    return { ok: false, status: 'Blocked - Package Incomplete', message: 'Package ' + packageRow.packageId + ' has no verified package attachment URLs.' };
  }

  if (configIsTrue_('AUTO_ATTACH_PACKAGE_FILES', true) && !cell_(row, headerMap, 'Attachment Drive URLs')) {
    const attachmentValue = packageUrls.join('\n');
    setCell_(queueSheet, rowNumber, headerMap, 'Attachment Drive URLs', attachmentValue);
    row[headerMap['Attachment Drive URLs']] = attachmentValue;
    appendQueueNote_(queueSheet, rowNumber, headerMap, 'Attachment Drive URLs auto-filled from Package Files for package ' + packageRow.packageId + '.');
  }

  return { ok: true, packageId: packageRow.packageId, message: 'Package completeness verified for ' + packageRow.packageId + '.' };
}

function validatePackageCompleteness_(applicationId, opportunityId) {
  const packageRow = findBestPackageForApplication_(applicationId, opportunityId);
  if (!packageRow) return { ok: false, message: 'No Application Packages row found.' };
  syncPackageFilesForPackage_(packageRow.packageId);
  copyPackageFilesToFolder_(packageRow.packageId);
  verifyPackageFiles_(packageRow.packageId);
  const requiredTypes = ['Academic CV', 'Research Proposal', 'Publication List'];
  const missing = missingRequiredPackageTypes_(packageRow.packageId, requiredTypes);
  return {
    ok: missing.length === 0,
    packageId: packageRow.packageId,
    requiredTypes: requiredTypes,
    missing: missing,
    message: missing.length ? 'Missing verified file(s): ' + missing.join(', ') : 'Package is complete for supervisor outreach.'
  };
}

function verifyQueueAttachmentsForRow_(row, headerMap) {
  const queueId = String(cell_(row, headerMap, 'Queue ID') || '');
  const attachmentUrls = cell_(row, headerMap, 'Attachment Drive URLs');
  if (!attachmentUrls) return { ok: true, queueId: queueId, attachments: [], message: 'No attachment URLs listed.' };
  const blobs = getDriveBlobsFromUrls_(attachmentUrls);
  const names = blobs.map(function(blob) { return blob.getName(); });
  return { ok: true, queueId: queueId, attachments: names, message: 'Attachment check passed for ' + names.length + ' file(s): ' + names.join('; ') };
}

function reconcileInboundReplies_() {
  if (!configIsTrue_('AUTO_RECONCILE_INBOUND_REPLIES', true)) return { rowsProcessed: 0, replies: 0, errors: 0, skipped: true };
  const inboxSheet = optionalSheet_(BRIDGE.INBOX_LOG);
  if (!inboxSheet) return { rowsProcessed: 0, replies: 0, errors: 0 };
  const values = readAllRows_(inboxSheet);
  if (values.length < 2) return { rowsProcessed: 0, replies: 0, errors: 0 };
  const map = headerMap_(values[0]);
  let rowsProcessed = 0;
  let replies = 0;
  let errors = 0;
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const status = String(cell_(row, map, 'Status') || '').toLowerCase();
    if (status.indexOf('reply') < 0) continue;
    const opportunityId = String(cell_(row, map, 'Matched Opportunity ID') || '');
    const applicationId = String(cell_(row, map, 'Matched Application ID') || '');
    const threadId = String(cell_(row, map, 'Thread ID') || '');
    const gmailUrl = String(cell_(row, map, 'Gmail URL') || '');
    const receivedDate = cell_(row, map, 'Received Date') || new Date();
    if (!opportunityId && !applicationId && !threadId) continue;
    try {
      rowsProcessed++;
      replies += updateOutreachReplyStatus_(applicationId, opportunityId, gmailUrl, receivedDate);
      updateApplicationReplyStatus_(applicationId, opportunityId, gmailUrl, receivedDate);
      updateQueueReplyStatus_(applicationId, opportunityId, threadId, gmailUrl, receivedDate);
      setCell_(inboxSheet, r + 1, map, 'Status', 'Reconciled Reply');
    } catch (err) {
      errors++;
      setCell_(inboxSheet, r + 1, map, 'Notes', appendText_(cell_(row, map, 'Notes'), 'Reconciliation error: ' + String(err && err.message ? err.message : err)));
    }
  }
  return { rowsProcessed: rowsProcessed, replies: replies, errors: errors };
}

function selectPackageRows_(packageId) {
  const sheet = sheet_(BRIDGE.APPLICATION_PACKAGES);
  const values = readAllRows_(sheet);
  if (values.length < 2) return [];
  const map = headerMap_(values[0]);
  const packages = [];
  const targetPackageId = String(packageId || '').trim();
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const pkg = {
      sheet: sheet,
      rowNumber: r + 1,
      headerMap: map,
      rawRow: row,
      packageId: String(cellAny_(row, map, ['Package ID', 'PackageID', 'package ID']) || '').trim(),
      applicationId: String(cellAny_(row, map, ['ApplicationID', 'Application ID']) || '').trim(),
      opportunityId: String(cellAny_(row, map, ['Opportunity ID', 'OpportunityID']) || '').trim(),
      opportunityTitle: String(cellAny_(row, map, ['Opportunity Title', 'Title', 'Opportunity']) || '').trim(),
      targetFolder: String(cellAny_(row, map, ['Target Folder', 'Target folder', 'Folder URL', 'Package Folder']) || '').trim(),
      status: String(cellAny_(row, map, ['Status', 'Package Status']) || '').trim()
    };
    if (!pkg.packageId && !pkg.applicationId && !pkg.opportunityId) continue;
    if (targetPackageId && pkg.packageId !== targetPackageId) continue;
    packages.push(pkg);
  }
  return packages;
}

function packageDocumentSpecs_(pkg) {
  const specs = [];
  PACKAGE_DOCUMENT_COLUMNS.forEach(function(definition) {
    const rawValue = cellAny_(pkg.rawRow, pkg.headerMap, definition.headers);
    const values = splitFieldValues_(rawValue);
    for (let i = 0; i < values.length; i++) {
      specs.push({ documentType: definition.type, sourceUrl: values[i] });
    }
  });
  return specs;
}

function splitFieldValues_(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  const urls = text.match(/https?:\/\/[^\s;,]+/g);
  if (urls && urls.length > 1) return urls.map(cleanSplitValue_).filter(Boolean);
  return text.split(/[\n;]+/).map(cleanSplitValue_).filter(Boolean);
}

function cleanSplitValue_(value) {
  return String(value || '').trim().replace(/[),.]+$/g, '').trim();
}

function makePackageFileId_(pkg, documentType, sourceUrl, index) {
  return [
    'file',
    sanitizeId_(pkg.packageId || pkg.applicationId || pkg.opportunityId),
    sanitizeId_(documentType),
    sanitizeId_(index || 0)
  ].join('_').slice(0, 180);
}

function upsertPackageFileRow_(record) {
  const sheet = packageFilesSheet_();
  const values = readUsedRows_(sheet, PACKAGE_FILES_HEADERS.length);
  const map = headerMap_(values[0]);
  const incoming = [
    record.fileId,
    record.packageId,
    record.applicationId,
    record.opportunityId,
    record.documentType,
    record.sourceUrl,
    record.packageFileUrl,
    record.status,
    record.lastChecked,
    record.lastError
  ];

  for (let r = 1; r < values.length; r++) {
    if (String(cell_(values[r], map, 'FileID') || '') === record.fileId) {
      const existingPackageUrl = cell_(values[r], map, 'Package File URL');
      const existingStatus = cell_(values[r], map, 'Status');
      const existingError = cell_(values[r], map, 'Last Error');
      incoming[6] = record.packageFileUrl || existingPackageUrl || '';
      incoming[7] = existingPackageUrl ? existingStatus : (record.status || existingStatus || '');
      incoming[9] = record.lastError || existingError || '';
      sheet.getRange(r + 1, 1, 1, PACKAGE_FILES_HEADERS.length).setValues([incoming]);
      return { added: false, updated: true };
    }
  }

  sheet.appendRow(incoming);
  return { added: true, updated: false };
}

function packageFilesSheet_() {
  const ss = workbook_();
  ensureSheet_(ss, BRIDGE.PACKAGE_FILES, PACKAGE_FILES_HEADERS);
  return ss.getSheetByName(BRIDGE.PACKAGE_FILES);
}

function selectPackageFileRows_(packageId) {
  const sheet = packageFilesSheet_();
  const values = readUsedRows_(sheet, PACKAGE_FILES_HEADERS.length);
  if (values.length < 2) return [];
  const map = headerMap_(values[0]);
  const targetPackageId = String(packageId || '').trim();
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const packageRowId = String(cell_(row, map, 'PackageID') || '').trim();
    if (targetPackageId && packageRowId !== targetPackageId) continue;
    rows.push({
      rowNumber: r + 1,
      fileId: String(cell_(row, map, 'FileID') || ''),
      packageId: packageRowId,
      applicationId: String(cell_(row, map, 'ApplicationID') || ''),
      opportunityId: String(cell_(row, map, 'OpportunityID') || ''),
      documentType: String(cell_(row, map, 'Document Type') || ''),
      sourceUrl: String(cell_(row, map, 'Source URL') || ''),
      packageFileUrl: String(cell_(row, map, 'Package File URL') || ''),
      status: String(cell_(row, map, 'Status') || ''),
      lastError: String(cell_(row, map, 'Last Error') || '')
    });
  }
  return rows;
}

function updatePackageFileRow_(rowNumber, updates) {
  const sheet = packageFilesSheet_();
  const values = readUsedRows_(sheet, PACKAGE_FILES_HEADERS.length);
  const map = headerMap_(values[0]);
  if (updates.packageFileUrl !== undefined) setCell_(sheet, rowNumber, map, 'Package File URL', updates.packageFileUrl);
  if (updates.status !== undefined) setCell_(sheet, rowNumber, map, 'Status', updates.status);
  if (updates.lastChecked !== undefined) setCell_(sheet, rowNumber, map, 'Last Checked', updates.lastChecked);
  if (updates.lastError !== undefined) setCell_(sheet, rowNumber, map, 'Last Error', updates.lastError);
}

function ensurePackageFolderForPackage_(pkg) {
  const folderId = extractDriveId_(pkg.targetFolder);
  if (folderId) {
    try {
      pkg.folder = DriveApp.getFolderById(folderId);
      return pkg;
    } catch (err) {
      setCellAny_(pkg.sheet, pkg.rowNumber, pkg.headerMap, ['Status', 'Package Status'], 'Needs Folder Access');
      throw new Error('Cannot open package folder ' + folderId + ': ' + String(err && err.message ? err.message : err));
    }
  }

  const created = createPreparedPackageFolderIndex(pkg.opportunityId, pkg.applicationId, pkg.opportunityTitle || pkg.packageId || 'Application Package');
  setCellAny_(pkg.sheet, pkg.rowNumber, pkg.headerMap, ['Target Folder', 'Target folder', 'Folder URL', 'Package Folder'], created.folderUrl);
  setCellAny_(pkg.sheet, pkg.rowNumber, pkg.headerMap, ['Status', 'Package Status'], 'Drive Folder Created - Needs Package Files');
  setCellAny_(pkg.sheet, pkg.rowNumber, pkg.headerMap, ['Last Updated', 'Updated At'], new Date());
  pkg.targetFolder = created.folderUrl;
  pkg.folder = DriveApp.getFolderById(extractDriveId_(created.folderUrl));
  return pkg;
}

function packageCopyName_(pkg, documentType, sourceName) {
  const title = pkg.opportunityTitle || pkg.opportunityId || pkg.applicationId || pkg.packageId || 'Application';
  return sanitizeDriveName_(documentType + ' - ' + title + ' - ' + sourceName).slice(0, 180);
}

function fileIsInFolder_(file, folder) {
  const folderId = folder.getId();
  const parents = file.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === folderId) return true;
  }
  return false;
}

function updateApplicationPackageDocumentPath_(pkg, documentType, packageFileUrl) {
  const headerMap = {
    'Academic CV': ['Academic CV Path', 'Academic CV', 'CV Path', 'CV path'],
    'Professional Resume': ['Professional Resume Path', 'Resume Path', 'Professional Resume', 'Resume'],
    'Statement of Purpose': ['SOP Path', 'Statement of Purpose Path', 'Motivation Letter Path', 'SOP'],
    'Research Proposal': ['Proposal Path', 'Research Proposal Path', 'Research Statement Path', 'Proposal'],
    'Publication List': ['Publication List Path', 'Publication Appendix Path', 'Publication List'],
    'Document Checklist': ['Checklist Path', 'Document Checklist Path', 'Checklist'],
    'PDF Export': ['PDF Exports', 'PDF Export Paths'],
    'Outreach Draft': ['Outreach Draft Paths', 'Email Drafts', 'Email Draft Paths']
  };
  const headers = headerMap[documentType] || [];
  if (headers.length && documentType !== 'PDF Export' && documentType !== 'Outreach Draft') {
    setCellAny_(pkg.sheet, pkg.rowNumber, pkg.headerMap, headers, packageFileUrl);
  }
  setCellAny_(pkg.sheet, pkg.rowNumber, pkg.headerMap, ['Status', 'Package Status'], 'Package Files Synced');
  setCellAny_(pkg.sheet, pkg.rowNumber, pkg.headerMap, ['Last Updated', 'Updated At'], new Date());
}

function requiredDocumentTypesForRecipient_(recipientType) {
  const text = String(recipientType || '').toLowerCase();
  if (text.indexOf('student') >= 0 || text.indexOf('linkedin') >= 0) return [];
  if (text.indexOf('admission') >= 0 || text.indexOf('office') >= 0 || text.indexOf('university') >= 0) {
    return ['Academic CV', 'Statement of Purpose'];
  }
  return ['Academic CV', 'Research Proposal', 'Publication List'];
}

function isInternalOnlyRecipient_(to, cc, bcc) {
  const text = [to, cc, bcc].join(' ').toLowerCase();
  const emails = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) || [];
  if (!emails.length) return false;
  const internal = {
    'iman.najafi86@gmail.com': true,
    'in@worldbc.co': true,
    'iman@worldbc.co': true
  };
  for (let i = 0; i < emails.length; i++) {
    if (!internal[emails[i]]) return false;
  }
  return true;
}

function rowAllowsNoAttachments_(row, headerMap) {
  if (!configIsTrue_('ALLOW_FIT_INQUIRY_WITHOUT_ATTACHMENTS', true)) return false;
  const text = [
    cell_(row, headerMap, 'Recipient Type'),
    cell_(row, headerMap, 'Subject'),
    cell_(row, headerMap, 'Body'),
    cell_(row, headerMap, 'Notes')
  ].join(' ').toLowerCase();
  return text.indexOf('no attachment required') >= 0 ||
    text.indexOf('no attachments required') >= 0 ||
    text.indexOf('fit inquiry') >= 0;
}

function validateQueueEmailContentSafety_(row, headerMap) {
  if (isInternalOnlyRecipient_(cell_(row, headerMap, 'To'), cell_(row, headerMap, 'CC'), cell_(row, headerMap, 'BCC'))) {
    return { ok: true, message: 'Internal/self email; content safety check relaxed.' };
  }
  const body = String(cell_(row, headerMap, 'Body') || '');
  const subject = String(cell_(row, headerMap, 'Subject') || '');
  const notes = String(cell_(row, headerMap, 'Notes') || '');
  const matches = unsafeOutboundEmailTerms_(subject + '\n' + body);
  if (matches.length) {
    return {
      ok: false,
      status: 'Blocked - Content Review',
      message: 'Outbound content safety failed. Remove internal/system wording before sending: ' + matches.join('; ')
    };
  }
  if (rowAllowsNoAttachments_(row, headerMap)) {
    const explanation = [body, notes].join(' ').toLowerCase();
    if (explanation.indexOf('package folder') >= 0 || explanation.indexOf('prepared-package') >= 0 || explanation.indexOf('once the package') >= 0) {
      return {
        ok: false,
        status: 'Blocked - Content Review',
        message: 'Fit inquiry contains internal package-status wording. Rewrite as a clean academic fit question before sending.'
      };
    }
  }
  return { ok: true, message: 'Outbound email content passed safety check.' };
}

function unsafeOutboundEmailTerms_(text) {
  const value = String(text || '');
  const checks = [
    { label: 'package folder not finalized', pattern: /package folder[^.\n]{0,120}not yet[^.\n]{0,80}finaliz/i },
    { label: 'package/archive generation instruction', pattern: /once the package is generated/i },
    { label: 'prepared-package archive', pattern: /prepared[- ]package archive/i },
    { label: 'internal Drive parent folder link', pattern: /drive\.google\.com\/drive\/folders\/1JgN1XwaS64SxYb0BdhnRXPfveArc7nQf/i },
    { label: 'Application Packages row', pattern: /Application Packages row/i },
    { label: 'Package Files tab', pattern: /Package Files tab/i },
    { label: 'Email Send Queue', pattern: /Email Send Queue/i },
    { label: 'queue identifier', pattern: /\bqueue_[a-z0-9_]{8,}\b/i },
    { label: 'approval gate note', pattern: /approval[- ]gated/i },
    { label: 'attachment check note', pattern: /attachment check/i },
    { label: 'no email sent note', pattern: /no email (was )?sent/i },
    { label: 'processQueue instruction', pattern: /processQueue/i },
    { label: 'Codex/internal agent mention', pattern: /\bCodex\b/i },
    { label: 'Apps Script/internal bridge mention', pattern: /Apps Script|Gmail Bridge|bridge patched|Bridge Config/i },
    { label: 'manual-send operational status', pattern: /Needs Manual Send|Manual Send file|Draft queued/i },
    { label: 'Drive URL completion note', pattern: /Add final .*Drive URLs/i },
    { label: 'internal test wording', pattern: /TEST ONLY|do not reuse|do not process/i }
  ];
  const matches = [];
  for (let i = 0; i < checks.length; i++) {
    if (checks[i].pattern.test(value)) matches.push(checks[i].label);
  }
  return matches;
}

function findBestPackageForApplication_(applicationId, opportunityId) {
  const packages = selectPackageRows_('');
  let best = null;
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    if (idMatches_(pkg.applicationId, applicationId) || idMatches_(pkg.opportunityId, opportunityId)) {
      best = pkg;
    }
  }
  return best;
}

function idMatches_(candidate, target) {
  const left = String(candidate || '').toLowerCase().trim();
  const right = String(target || '').toLowerCase().trim();
  if (!left || !right) return false;
  return left === right || left.indexOf(right) >= 0 || right.indexOf(left) >= 0;
}

function missingRequiredPackageTypes_(packageId, requiredTypes) {
  const rows = selectPackageFileRows_(packageId);
  const missing = [];
  for (let i = 0; i < requiredTypes.length; i++) {
    const required = requiredTypes[i];
    let found = false;
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      if (!documentTypeMatches_(row.documentType, required)) continue;
      if (!extractDriveId_(row.packageFileUrl)) continue;
      const status = row.status.toLowerCase();
      if (status === 'verified' || status === 'copied' || status === 'package files synced') {
        found = true;
        break;
      }
    }
    if (!found) missing.push(required);
  }
  return missing;
}

function collectPackageAttachmentUrls_(packageId, requiredTypes) {
  const rows = selectPackageFileRows_(packageId);
  const urls = {};
  for (let i = 0; i < rows.length; i++) {
    if (!extractDriveId_(rows[i].packageFileUrl)) continue;
    for (let j = 0; j < requiredTypes.length; j++) {
      if (documentTypeMatches_(rows[i].documentType, requiredTypes[j])) urls[rows[i].packageFileUrl] = true;
    }
  }
  return Object.keys(urls);
}

function documentTypeMatches_(actual, required) {
  const left = String(actual || '').toLowerCase();
  const right = String(required || '').toLowerCase();
  if (!left || !right) return false;
  if (left === right || left.indexOf(right) >= 0 || right.indexOf(left) >= 0) return true;
  if (right === 'statement of purpose' && (left.indexOf('sop') >= 0 || left.indexOf('motivation') >= 0)) return true;
  if (right === 'research proposal' && (left.indexOf('concept note') >= 0 || left.indexOf('research statement') >= 0)) return true;
  return false;
}

function applicationDocsHint_(applicationId, opportunityId, missingTypes) {
  const sheet = optionalSheet_(BRIDGE.APPLICATION_DOCS);
  if (!sheet) return '';
  const values = readAllRows_(sheet);
  if (values.length < 2) return '';
  const map = headerMap_(values[0]);
  const hints = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (!rowMatchesApplication_(row, map, applicationId, opportunityId)) continue;
    const docType = String(cellAny_(row, map, ['Document Type', 'Doc Type', 'Document', 'Required Document']) || '');
    const status = String(cellAny_(row, map, ['Status', 'Doc Status', 'Document Status']) || '');
    for (let i = 0; i < missingTypes.length; i++) {
      if (documentTypeMatches_(docType, missingTypes[i])) hints.push(docType + '=' + status);
    }
  }
  return hints.length ? ' Application Docs says: ' + hints.join('; ') + '.' : '';
}

function updateOutreachReplyStatus_(applicationId, opportunityId, gmailUrl, receivedDate) {
  const sheet = optionalSheet_(BRIDGE.OUTREACH_QUEUE);
  if (!sheet) return 0;
  const values = readAllRows_(sheet);
  if (values.length < 2) return 0;
  const map = headerMap_(values[0]);
  let count = 0;
  for (let r = 1; r < values.length; r++) {
    if (!rowMatchesApplication_(values[r], map, applicationId, opportunityId)) continue;
    setCellAny_(sheet, r + 1, map, ['Send Status', 'Status'], 'Replied');
    setCellAny_(sheet, r + 1, map, ['Follow-up Date', 'Follow Up Date', 'Next Follow-up'], '');
    setCellAny_(sheet, r + 1, map, ['Evidence/Source Link', 'Evidence Link', 'Source Link', 'Gmail URL'], gmailUrl);
    appendCellAny_(sheet, r + 1, map, ['Notes'], 'Reply received/reconciled on ' + formatDateForNote_(receivedDate) + ': ' + gmailUrl);
    count++;
  }
  return count;
}

function updateApplicationReplyStatus_(applicationId, opportunityId, gmailUrl, receivedDate) {
  const sheet = optionalSheet_(BRIDGE.APPLICATION);
  if (!sheet) return 0;
  const values = readAllRows_(sheet);
  if (values.length < 2) return 0;
  const map = headerMap_(values[0]);
  let count = 0;
  for (let r = 1; r < values.length; r++) {
    if (!rowMatchesApplication_(values[r], map, applicationId, opportunityId)) continue;
    setCellAny_(sheet, r + 1, map, ['Status', 'Application Status'], 'Reply Received - Needs Review');
    appendCellAny_(sheet, r + 1, map, ['Notes', 'Application Notes'], 'Reply received/reconciled on ' + formatDateForNote_(receivedDate) + ': ' + gmailUrl);
    count++;
  }
  return count;
}

function updateQueueReplyStatus_(applicationId, opportunityId, threadId, gmailUrl, receivedDate) {
  const sheet = optionalSheet_(BRIDGE.SEND_QUEUE);
  if (!sheet) return 0;
  const values = readUsedRows_(sheet, SEND_QUEUE_HEADERS.length);
  if (values.length < 2) return 0;
  const map = headerMap_(values[0]);
  let count = 0;
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    const threadMatches = threadId && String(cell_(row, map, 'Thread ID') || '') === String(threadId);
    const applicationMatches = rowMatchesApplication_(row, map, applicationId, opportunityId);
    if (!threadMatches && !applicationMatches) continue;
    const status = String(cell_(row, map, 'Send Status') || '');
    if (status.toLowerCase().indexOf('waiting') >= 0 || status.toLowerCase() === 'sent') {
      setCell_(sheet, r + 1, map, 'Send Status', status.toLowerCase() === 'sent' ? 'Sent - Reply Received' : 'Replied');
    }
    setCell_(sheet, r + 1, map, 'Not Before', '');
    appendQueueNote_(sheet, r + 1, map, 'Reply received/reconciled on ' + formatDateForNote_(receivedDate) + ': ' + gmailUrl);
    count++;
  }
  return count;
}

function rowMatchesApplication_(row, map, applicationId, opportunityId) {
  const rowApplicationId = String(cellAny_(row, map, ['ApplicationID', 'Application ID', 'Matched Application ID']) || '');
  const rowOpportunityId = String(cellAny_(row, map, ['Opportunity ID', 'OpportunityID', 'Matched Opportunity ID', 'Opportunity']) || '');
  return idMatches_(rowApplicationId, applicationId) || idMatches_(rowOpportunityId, opportunityId);
}

function configIsTrue_(key, defaultValue) {
  const raw = String(getConfig_(key) || '').trim();
  if (!raw) return Boolean(defaultValue);
  return ['true', 'yes', 'y', '1', 'on'].indexOf(raw.toLowerCase()) >= 0;
}

function optionalSheet_(name) {
  return workbook_().getSheetByName(name);
}

function cellAny_(row, headerMap, headers) {
  for (let i = 0; i < headers.length; i++) {
    if (headerMap[headers[i]] !== undefined) return row[headerMap[headers[i]]];
  }
  return '';
}

function setCellAny_(sheet, rowNumber, headerMap, headers, value) {
  for (let i = 0; i < headers.length; i++) {
    if (headerMap[headers[i]] !== undefined) {
      sheet.getRange(rowNumber, headerMap[headers[i]] + 1).setValue(value);
      return true;
    }
  }
  return false;
}

function appendCellAny_(sheet, rowNumber, headerMap, headers, note) {
  if (!note) return false;
  for (let i = 0; i < headers.length; i++) {
    if (headerMap[headers[i]] !== undefined) {
      const range = sheet.getRange(rowNumber, headerMap[headers[i]] + 1);
      range.setValue(appendText_(range.getValue(), note));
      return true;
    }
  }
  return false;
}

function appendQueueNote_(sheet, rowNumber, headerMap, note) {
  if (!note) return;
  appendCellAny_(sheet, rowNumber, headerMap, ['Notes'], note);
}

function appendText_(existing, addition) {
  const current = String(existing || '').trim();
  const extra = String(addition || '').trim();
  if (!extra) return current;
  if (current.indexOf(extra) >= 0) return current;
  return current ? current + ' | ' + extra : extra;
}

function formatDateForNote_(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (String(date) === 'Invalid Date') return String(value || '');
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

function sanitizeDriveName_(value) {
  return String(value || '')
    .replace(/[\\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'Application Package';
}

function sanitizeId_(value) {
  return String(value || 'package')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'package';
}

function doGet(e) {
  try {
    const payload = queryPayload_(e);
    if (!payload.action) return json_(bridgeInfo_());
    return json_(handleBridgeRequest_(payload, 'GET'));
  } catch (err) {
    logRun_('doGet', 'Error', 0, 0, 0, 0, 1, String(err && err.message ? err.message : err));
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function doPost(e) {
  try {
    const payload = parsePostPayload_(e);
    return json_(handleBridgeRequest_(payload, 'POST'));
  } catch (err) {
    logRun_('doPost', 'Error', 0, 0, 0, 0, 1, String(err && err.message ? err.message : err));
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function bridgeInfo_() {
  return {
    ok: true,
    service: 'Swiss Planner Gmail Bridge',
    account: getSenderEmail_(),
    webhookUrl: getConfig_('WEBHOOK_URL') || BRIDGE.CURRENT_WEBHOOK_URL,
    getUsage: 'GET: append ?token=...&action=validatePackageCompleteness&applicationId=...&opportunityId=...',
    postUsage: 'POST JSON: {"token":"...","action":"processQueue"}',
    getActions: getAllowedGetActions_(),
    postActions: bridgeActions_()
  };
}

function bridgeActions_() {
  return [
    'setupAiStaffWorkbook',
    'setupAiStaffProcessSchema',
    'syncSent',
    'syncInbound',
    'processQueue',
    'queueEmail',
    'validateEmailContentSafety',
    'testAttachmentAccess',
    'verifyQueueAttachments',
    'syncPackageFilesForPackage',
    'copyPackageFilesToFolder',
    'verifyPackageFiles',
    'validatePackageCompleteness',
    'syncConfiguredPackageFiles',
    'copyConfiguredPackageFilesToFolder',
    'verifyConfiguredPackageFiles',
    'validateConfiguredPackageCompleteness',
    'verifyConfiguredQueueAttachments',
    'runConfiguredPackageSmokeTest',
    'syncAghKnezPackageFiles',
    'copyAghKnezPackageFilesToFolder',
    'verifyAghKnezPackageFiles',
    'validateAghKnezPackageCompleteness',
    'verifyAghKnezQueueAttachments',
    'runAghKnezPackageSmokeTest',
    'reconcileInboundReplies',
    'createBridgeDriveSmokeTest',
    'createPackageFolderIndex',
    'createPreparedPackageFolderIndex',
    'createAndRegisterPreparedPackage',
    'uploadPackageFile',
    'createAghKnezPreparedPackageFolder',
    'setDefaultSendMode',
    'setAutoProcessApprovedQueue',
    'setAutoApproveQueueRows',
    'autoApproveQueueRows',
    'getEmailQueueStatus',
    'getAiStaffDashboard',
    'appendAiStaffRunLog',
    'appendAiStaffReport',
    'appendAiStaffDecision',
    'appendAiStaffTask',
    'appendAiStaffThread',
    'appendAiStaffThreadMessage',
    'appendAiStaffSkillUpdate',
    'approveAiStaffSkillUpdate',
    'markAiStaffThreadLearningCandidate',
    'appendAiStaffKpi',
    'upsertAiStaffEntity',
    'updateAiStaffEntityStatus',
    'appendAiStaffFollowUp',
    'completeAiStaffTask',
    'completeAiStaffFollowUp',
    'reassignAiStaffTask',
    'snoozeAiStaffTask',
    'snoozeAiStaffFollowUp',
    'closeAiStaffEntity',
    'updateEmailQueueApproval',
    'getDueAiStaffWork',
    'auditAiStaffProcessHealth',
    'resetStaleAiStaffRunningWork',
    'runAiStaffTaskRunner',
    'processQueueRow'
  ];
}

function getAllowedGetActions_() {
  return bridgeActions_().filter(function(action) {
    return [
      'processQueue',
      'queueEmail',
      'uploadPackageFile',
      'setDefaultSendMode',
      'setAutoProcessApprovedQueue',
      'setAutoApproveQueueRows',
      'autoApproveQueueRows',
      'appendAiStaffRunLog',
      'appendAiStaffReport',
      'appendAiStaffDecision',
      'appendAiStaffTask',
      'appendAiStaffThread',
      'appendAiStaffThreadMessage',
      'appendAiStaffSkillUpdate',
      'approveAiStaffSkillUpdate',
      'markAiStaffThreadLearningCandidate',
      'appendAiStaffKpi',
      'setupAiStaffProcessSchema',
      'upsertAiStaffEntity',
      'updateAiStaffEntityStatus',
      'appendAiStaffFollowUp',
      'completeAiStaffTask',
      'completeAiStaffFollowUp',
      'reassignAiStaffTask',
      'snoozeAiStaffTask',
      'snoozeAiStaffFollowUp',
      'closeAiStaffEntity',
      'updateEmailQueueApproval',
      'auditAiStaffProcessHealth',
      'resetStaleAiStaffRunningWork',
      'runAiStaffTaskRunner',
      'processQueueRow'
    ].indexOf(action) < 0;
  });
}

function parsePostPayload_(e) {
  const raw = (e && e.postData && e.postData.contents) || '{}';
  const contentType = String(e && e.postData && e.postData.type || '').toLowerCase();
  if (contentType.indexOf('application/x-www-form-urlencoded') >= 0) return queryPayload_(e);
  return JSON.parse(raw || '{}');
}

function queryPayload_(e) {
  const params = (e && e.parameter) || {};
  const payload = {};
  Object.keys(params).forEach(function(key) {
    payload[key] = params[key];
  });
  if (payload.packageJson) {
    payload.package = JSON.parse(payload.packageJson);
  }
  if (payload.emailJson) {
    payload.email = JSON.parse(payload.emailJson);
  }
  return payload;
}

function handleBridgeRequest_(payload, method) {
  payload = payload || {};
  const action = String(payload.action || '').trim();
  if (!action) return bridgeInfo_();
  requireValidToken_(payload.token);
  if (bridgeActions_().indexOf(action) < 0) return { ok: false, error: 'Unknown action: ' + action };
  if (method === 'GET' && getAllowedGetActions_().indexOf(action) < 0) {
    return { ok: false, error: 'Action ' + action + ' requires POST to avoid accidental email processing.' };
  }

  if (action === 'syncSent') return { ok: true, result: syncSentEmails() };
  if (action === 'setupAiStaffWorkbook') return { ok: true, result: setupAiStaffWorkbook() };
  if (action === 'setupAiStaffProcessSchema') return { ok: true, result: setupAiStaffProcessSchema() };
  if (action === 'syncInbound') return { ok: true, result: syncInboundReplies() };
  if (action === 'processQueue') return { ok: true, result: processApprovedEmailQueue() };
  if (action === 'validateEmailContentSafety') return { ok: true, result: validateEmailContentSafety(payload.queueId || '') };
  if (action === 'testAttachmentAccess') return { ok: true, result: testAttachmentAccessForQueue_(payload.queueId || getConfig_('ATTACHMENT_TEST_QUEUE_ID')) };
  if (action === 'verifyQueueAttachments') return { ok: true, result: verifyQueueAttachments(payload.queueId || getConfig_('ATTACHMENT_TEST_QUEUE_ID')) };
  if (action === 'syncPackageFilesForPackage') return { ok: true, result: syncPackageFilesForPackage(payload.packageId || '') };
  if (action === 'copyPackageFilesToFolder') return { ok: true, result: copyPackageFilesToFolder(payload.packageId || '') };
  if (action === 'verifyPackageFiles') return { ok: true, result: verifyPackageFiles(payload.packageId || '') };
  if (action === 'validatePackageCompleteness') return { ok: true, result: validatePackageCompleteness(payload.applicationId || '', payload.opportunityId || '') };
  if (action === 'syncConfiguredPackageFiles') return { ok: true, result: syncConfiguredPackageFiles() };
  if (action === 'copyConfiguredPackageFilesToFolder') return { ok: true, result: copyConfiguredPackageFilesToFolder() };
  if (action === 'verifyConfiguredPackageFiles') return { ok: true, result: verifyConfiguredPackageFiles() };
  if (action === 'validateConfiguredPackageCompleteness') return { ok: true, result: validateConfiguredPackageCompleteness() };
  if (action === 'verifyConfiguredQueueAttachments') return { ok: true, result: verifyConfiguredQueueAttachments() };
  if (action === 'runConfiguredPackageSmokeTest') return { ok: true, result: runConfiguredPackageSmokeTest() };
  if (action === 'syncAghKnezPackageFiles') return { ok: true, result: syncAghKnezPackageFiles() };
  if (action === 'copyAghKnezPackageFilesToFolder') return { ok: true, result: copyAghKnezPackageFilesToFolder() };
  if (action === 'verifyAghKnezPackageFiles') return { ok: true, result: verifyAghKnezPackageFiles() };
  if (action === 'validateAghKnezPackageCompleteness') return { ok: true, result: validateAghKnezPackageCompleteness() };
  if (action === 'verifyAghKnezQueueAttachments') return { ok: true, result: verifyAghKnezQueueAttachments() };
  if (action === 'runAghKnezPackageSmokeTest') return { ok: true, result: runAghKnezPackageSmokeTest() };
  if (action === 'reconcileInboundReplies') return { ok: true, result: reconcileInboundReplies() };
  if (action === 'createBridgeDriveSmokeTest') return { ok: true, result: createBridgeDriveSmokeTest() };
  if (action === 'createPackageFolderIndex') return { ok: true, result: createPackageFolderIndex(payload.opportunityId || '', payload.applicationId || '', payload.packageName || '') };
  if (action === 'createPreparedPackageFolderIndex') return { ok: true, result: createPreparedPackageFolderIndex(payload.opportunityId || '', payload.applicationId || '', payload.packageName || '') };
  if (action === 'createAndRegisterPreparedPackage') return { ok: true, result: createAndRegisterPreparedPackage(payload.package || payload) };
  if (action === 'uploadPackageFile') return { ok: true, result: uploadPackageFile(payload.file || payload) };
  if (action === 'createAghKnezPreparedPackageFolder') return { ok: true, result: createAghKnezPreparedPackageFolder() };
  if (action === 'setDefaultSendMode') return { ok: true, result: setDefaultSendMode(payload.mode || payload.sendMode || 'SEND_NOW', payload.updateQueuedRows) };
  if (action === 'setAutoProcessApprovedQueue') return { ok: true, result: setAutoProcessApprovedQueue(payload.enabled) };
  if (action === 'setAutoApproveQueueRows') return { ok: true, result: setAutoApproveQueueRows(payload.enabled) };
  if (action === 'autoApproveQueueRows') return { ok: true, result: autoApproveQueueRows() };
  if (action === 'getEmailQueueStatus') return { ok: true, result: getEmailQueueStatus(payload.limit || 20) };
  if (action === 'getAiStaffDashboard') return { ok: true, result: getAiStaffDashboard(payload.row || payload) };
  if (action === 'appendAiStaffRunLog') return { ok: true, result: appendAiStaffRunLog(payload.row || payload) };
  if (action === 'appendAiStaffReport') return { ok: true, result: appendAiStaffReport(payload.row || payload) };
  if (action === 'appendAiStaffDecision') return { ok: true, result: appendAiStaffDecision(payload.row || payload) };
  if (action === 'appendAiStaffTask') return { ok: true, result: appendAiStaffTask(payload.row || payload) };
  if (action === 'appendAiStaffThread') return { ok: true, result: appendAiStaffThread(payload.row || payload.thread || payload) };
  if (action === 'appendAiStaffThreadMessage') return { ok: true, result: appendAiStaffThreadMessage(payload.row || payload.message || payload) };
  if (action === 'appendAiStaffSkillUpdate') return { ok: true, result: appendAiStaffSkillUpdate(payload.row || payload.learning || payload) };
  if (action === 'approveAiStaffSkillUpdate') return { ok: true, result: approveAiStaffSkillUpdate(payload.row || payload.learning || payload) };
  if (action === 'markAiStaffThreadLearningCandidate') return { ok: true, result: markAiStaffThreadLearningCandidate(payload.row || payload.learning || payload) };
  if (action === 'appendAiStaffKpi') return { ok: true, result: appendAiStaffKpi(payload.row || payload) };
  if (action === 'upsertAiStaffEntity') return { ok: true, result: upsertAiStaffEntity(payload.row || payload.entity || payload) };
  if (action === 'updateAiStaffEntityStatus') return { ok: true, result: updateAiStaffEntityStatus(payload.row || payload.entity || payload) };
  if (action === 'appendAiStaffFollowUp') return { ok: true, result: appendAiStaffFollowUp(payload.row || payload.followUp || payload) };
  if (action === 'completeAiStaffTask') return { ok: true, result: completeAiStaffTask(payload.row || payload.task || payload) };
  if (action === 'completeAiStaffFollowUp') return { ok: true, result: completeAiStaffFollowUp(payload.row || payload.followUp || payload) };
  if (action === 'reassignAiStaffTask') return { ok: true, result: reassignAiStaffTask(payload.row || payload.task || payload) };
  if (action === 'snoozeAiStaffTask') return { ok: true, result: snoozeAiStaffTask(payload.row || payload.task || payload) };
  if (action === 'snoozeAiStaffFollowUp') return { ok: true, result: snoozeAiStaffFollowUp(payload.row || payload.followUp || payload) };
  if (action === 'closeAiStaffEntity') return { ok: true, result: closeAiStaffEntity(payload.row || payload.entity || payload) };
  if (action === 'updateEmailQueueApproval') return { ok: true, result: updateEmailQueueApproval(payload.row || payload.email || payload) };
  if (action === 'getDueAiStaffWork') return { ok: true, result: getDueAiStaffWork(payload.row || payload) };
  if (action === 'auditAiStaffProcessHealth') return { ok: true, result: auditAiStaffProcessHealth(payload.row || payload) };
  if (action === 'resetStaleAiStaffRunningWork') return { ok: true, result: resetStaleAiStaffRunningWork(payload.row || payload) };
  if (action === 'runAiStaffTaskRunner') return { ok: true, result: runAiStaffTaskRunner(payload.row || payload) };
  if (action === 'processQueueRow') return { ok: true, result: processQueueRow(payload.queueId || payload.id || '') };
  if (action === 'queueEmail') return { ok: true, result: appendQueueEmail_(payload.email || {}) };
  return { ok: false, error: 'Unknown action: ' + action };
}

function appendQueueEmail_(email) {
  const sheet = sheet_(BRIDGE.SEND_QUEUE);
  const now = new Date();
  const row = [
    email.queueId || Utilities.getUuid(),
    now,
    email.opportunityId || '',
    email.applicationId || '',
    email.recipientType || '',
    email.recipientName || '',
    email.to || '',
    email.cc || '',
    email.bcc || '',
    email.subject || '',
    email.body || '',
    email.attachmentDriveUrls || '',
    email.sendMode || getConfig_('DEFAULT_SEND_MODE') || 'CREATE_DRAFT',
    email.approvalStatus || 'Drafted',
    email.approvedBy || '',
    email.approvedAt || '',
    email.notBefore || '',
    'Queued',
    '',
    '',
    '',
    '',
    '',
    email.notes || 'Queued through webhook; must be Approved before processing.'
  ];
  sheet.appendRow(row);
  let autoApproval = null;
  if (configIsTrue_('AUTO_APPROVE_QUEUE_ROWS', false)) {
    const values = readUsedRows_(sheet, SEND_QUEUE_HEADERS.length);
    autoApproval = autoApproveQueueRows_(sheet, values, headerMap_(values[0]));
  }
  logRun_('queueEmail', 'OK', 1, 0, 0, 0, 0, email.subject || '');
  return { queueId: row[0], autoApproval: autoApproval };
}

function installBridgeTriggers_() {
  const handlers = ['syncSentEmails', 'syncInboundReplies', 'processApprovedEmailQueue'];
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (handlers.indexOf(triggers[i].getHandlerFunction()) >= 0) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('syncSentEmails').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('syncInboundReplies').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('processApprovedEmailQueue').timeBased().everyMinutes(15).create();
}

function ensureSheets_() {
  const ss = workbook_();
  ensureSheet_(ss, BRIDGE.SENT_LOG, SENT_LOG_HEADERS);
  ensureSheet_(ss, BRIDGE.INBOX_LOG, INBOX_LOG_HEADERS);
  ensureSheet_(ss, BRIDGE.SEND_QUEUE, SEND_QUEUE_HEADERS);
  ensureSheet_(ss, BRIDGE.PACKAGE_FILES, PACKAGE_FILES_HEADERS);
  ensureSheet_(ss, BRIDGE.RUNS, RUN_HEADERS);
  ensureSheet_(ss, BRIDGE.CONFIG, CONFIG_HEADERS);
  ensureAiStaffSheets_();
}

function ensureAiStaffSheets_() {
  const ss = workbook_();
  ensureSheet_(ss, BRIDGE.AI_STAFF_KPIS, AI_STAFF_KPI_HEADERS);
  ensureAiStaffRunQueueSheet_(ss);
  ensureSheet_(ss, BRIDGE.AI_STAFF_DECISIONS, AI_STAFF_DECISION_HEADERS);
  ensureSheet_(ss, BRIDGE.AI_STAFF_RUN_LOG, AI_STAFF_RUN_LOG_HEADERS);
  ensureSheet_(ss, BRIDGE.AI_STAFF_REPORTS, AI_STAFF_REPORT_HEADERS);
  ensureSheet_(ss, BRIDGE.AI_STAFF_ENTITIES, AI_STAFF_ENTITY_HEADERS);
  ensureSheet_(ss, BRIDGE.AI_STAFF_FOLLOW_UPS, AI_STAFF_FOLLOW_UP_HEADERS);
  ensureSheet_(ss, BRIDGE.AI_STAFF_THREADS, AI_STAFF_THREAD_HEADERS);
  ensureSheet_(ss, BRIDGE.AI_STAFF_THREAD_MESSAGES, AI_STAFF_THREAD_MESSAGE_HEADERS);
  ensureSheet_(ss, BRIDGE.AI_STAFF_SKILL_UPDATES, AI_STAFF_SKILL_UPDATE_HEADERS);
  ensureSheet_(ss, BRIDGE.AI_STAFF_EVENT_LOG, AI_STAFF_EVENT_LOG_HEADERS);
  ensureSheet_(ss, BRIDGE.AI_STAFF_REGISTRY, AI_STAFF_REGISTRY_HEADERS);
  ensureSheet_(ss, BRIDGE.AI_STAFF_TASK_TEMPLATES, AI_STAFF_TASK_TEMPLATE_HEADERS);
}

function ensureAiStaffRunQueueSheet_(ss) {
  let sheet = ss.getSheetByName(BRIDGE.AI_STAFF_RUN_QUEUE);
  if (!sheet) {
    const legacy = ss.getSheetByName(BRIDGE.AI_STAFF_RUN_QUEUE_LEGACY);
    if (legacy) {
      legacy.setName(BRIDGE.AI_STAFF_RUN_QUEUE);
      sheet = legacy;
    }
  }
  if (!sheet) {
    sheet = ss.insertSheet(BRIDGE.AI_STAFF_RUN_QUEUE);
    sheet.getRange(1, 1, 1, AI_STAFF_RUN_QUEUE_HEADERS.length).setValues([AI_STAFF_RUN_QUEUE_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  const currentWidth = Math.max(sheet.getLastColumn(), AI_STAFF_RUN_QUEUE_HEADERS.length, 1);
  const current = sheet.getRange(1, 1, 1, currentWidth).getValues()[0].map(function(v) { return String(v || ''); });
  let exact = true;
  for (let i = 0; i < AI_STAFF_RUN_QUEUE_HEADERS.length; i++) {
    if (current[i] !== AI_STAFF_RUN_QUEUE_HEADERS[i]) exact = false;
  }
  if (exact) return;

  const values = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, currentWidth).getValues() : [];
  const oldMap = headerMap_(current);
  const migrated = [];
  for (let r = 0; r < values.length; r++) {
    const oldRow = values[r];
    const record = {};
    record['Task ID'] = cell_(oldRow, oldMap, 'Task ID');
    record['Created At'] = cell_(oldRow, oldMap, 'Created At');
    record['Task Type'] = cell_(oldRow, oldMap, 'Task Type');
    record['Task Template ID'] = cell_(oldRow, oldMap, 'Task Template ID');
    record['Assigned To'] = cell_(oldRow, oldMap, 'Assigned To');
    record['Created By'] = cell_(oldRow, oldMap, 'Created By');
    record['EntityID'] = cell_(oldRow, oldMap, 'EntityID');
    record['Related Opportunity ID'] = cell_(oldRow, oldMap, 'Related Opportunity ID');
    record['Related ApplicationID'] = cell_(oldRow, oldMap, 'Related ApplicationID');
    record['KPI ID'] = cell_(oldRow, oldMap, 'KPI ID');
    record['Priority'] = cell_(oldRow, oldMap, 'Priority');
    record['Run After'] = cell_(oldRow, oldMap, 'Run After');
    record['Due At'] = cell_(oldRow, oldMap, 'Due At');
    record['Deadline'] = cell_(oldRow, oldMap, 'Deadline');
    record['Depends On'] = cell_(oldRow, oldMap, 'Depends On');
    record['Status'] = cell_(oldRow, oldMap, 'Status') || 'Queued';
    record['Next Action'] = cell_(oldRow, oldMap, 'Next Action');
    record['Completion Criteria'] = cell_(oldRow, oldMap, 'Completion Criteria');
    record['Success Status'] = cell_(oldRow, oldMap, 'Success Status');
    record['Failure Status'] = cell_(oldRow, oldMap, 'Failure Status');
    record['Last Error'] = cell_(oldRow, oldMap, 'Last Error');
    record['Evidence Link'] = cell_(oldRow, oldMap, 'Evidence Link');
    record['Completed At'] = cell_(oldRow, oldMap, 'Completed At');
    record['Result Notes'] = cell_(oldRow, oldMap, 'Result Notes');
    migrated.push(AI_STAFF_RUN_QUEUE_HEADERS.map(function(header) { return record[header] || ''; }));
  }

  sheet.clearContents();
  sheet.getRange(1, 1, 1, AI_STAFF_RUN_QUEUE_HEADERS.length).setValues([AI_STAFF_RUN_QUEUE_HEADERS]);
  sheet.setFrozenRows(1);
  if (migrated.length) {
    sheet.getRange(2, 1, migrated.length, AI_STAFF_RUN_QUEUE_HEADERS.length).setValues(migrated);
  }
}

function seedDefaultAiStaffKpis_() {
  const sheet = sheet_(BRIDGE.AI_STAFF_KPIS);
  if (sheet.getLastRow() > 1) return 0;
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const start = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const end = Utilities.formatDate(weekEnd, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const rows = [
    ['kpi_weekly_verified_opportunities', 'Weekly', start, end, 'Opportunities', 10, 'Switzerland; Krakow; Poland; UK/finance hubs', 'Finance; energy finance; private markets; project finance; renewable/storage', 4, 'Official evidence required', 'Active', 'Default weekly target: verified, funded, non-duplicate opportunities.'],
    ['kpi_weekly_professor_fit', 'Weekly', start, end, 'Professor Research Fit', 5, 'Switzerland; Krakow; Poland', 'Energy finance; sustainable finance; private markets; petroleum/energy engineering', 4, 'Official profile or publication evidence', 'Active', 'Default weekly target: professor/supervisor research-fit rows.'],
    ['kpi_weekly_student_contacts', 'Weekly', start, end, 'Student Contacts', 3, 'Switzerland; Krakow; Poland', 'Current PhD students or official student paths', 3, 'Public/official contact path required', 'Active', 'Default weekly target: student/contact leads.'],
    ['kpi_weekly_packages', 'Weekly', start, end, 'Packages', 2, 'Switzerland; Krakow; Poland', 'Highest-priority applications', 4, 'Package files verified', 'Active', 'Default weekly target: complete application packages.'],
    ['kpi_weekly_outreach_drafts', 'Weekly', start, end, 'Outreach Drafts', 5, 'Switzerland; Krakow; Poland', 'Professor, admissions, student outreach', 4, 'Evidence-backed recipient/context', 'Active', 'Default weekly target: queue draft messages, not auto-send.'],
    ['kpi_daily_crm_health', 'Daily', start, start, 'Follow-ups', 1, 'All active applications', 'CRM health and reply reconciliation', 1, 'Gmail/CRM evidence', 'Active', 'Daily target: run CRM health and move at least one blocker forward.']
  ];
  sheet.getRange(2, 1, rows.length, AI_STAFF_KPI_HEADERS.length).setValues(rows);
  return rows.length;
}

function seedAiStaffRegistryAndTemplates_() {
  let added = 0;
  const registry = sheet_(BRIDGE.AI_STAFF_REGISTRY);
  if (registry.getLastRow() <= 1) {
    const rows = [
      ['AIstaff_Manager', 'Manager', 'Audits all entities, tasks, follow-ups, event logs, stale statuses, missing follow-ups and KPI progress.', 'All', 'All non-terminal stages', 'Gmail Bridge; Swiss Planner workbook; swiss-planner-staff', 'Do not delete rows/files. Do not expose credentials. Do not bypass send/package guardrails.', 'Iman Najafi'],
      ['AIstaff_OpportunityHunter', 'Opportunity Hunter', 'Finds and verifies opportunities from official sources.', 'Opportunity', 'Opportunity search to Opportunity Verified', 'swiss-planner-research; browser; official university/funder/job sources', 'LinkedIn is a lead source only. Serious rows require official evidence.', 'AIstaff_Manager'],
      ['AIstaff_FitAnalyst', 'Fit Analyst', 'Scores opportunity fit and decides whether to create an application entity.', 'Opportunity; Application', 'Opportunity Verified to Fit Approved', 'swiss-planner-research; Swiss Planner workbook', 'Use Iman priorities and evidence. Do not invent supervisor fit.', 'AIstaff_Manager'],
      ['AIstaff_ProfessorResearchAnalyst', 'Professor Research Analyst', 'Analyzes supervisor publications, research themes, current students, lab/program evidence, and proposal angle before package writing.', 'Professor; Application; Research Fit', 'Fit Approved to Package Required', 'swiss-planner-research; swiss-planner-apply; Google Scholar; official university/professor pages; Professor Research Fit tab', 'Use official/public evidence. Do not invent publications or students. LinkedIn is a lead source only.', 'AIstaff_Manager'],
      ['AIstaff_ApplicationPackMaker', 'Application Pack Maker', 'Creates CV, SOP, research proposal, publication list and package artifacts.', 'Application; Package', 'Package Required to Package Verified', 'swiss-planner-apply; Google Drive; local package generator', 'Professor-specific documents only. Do not submit portals.', 'AIstaff_Manager'],
      ['AIstaff_ApplicationPackSender', 'Application Pack Sender', 'Sends or queues verified application-package emails.', 'Application; Outreach', 'Package Verified to Sent - Waiting for Reply', 'swiss-planner-apply; Gmail Bridge validatePackageCompleteness; verifyQueueAttachments; processQueue', 'Do not send duplicates. Do not send incomplete packages. Do not auto-send LinkedIn. Do not send internal package/status/CRM notes to external recipients.', 'AIstaff_Manager'],
      ['AIstaff_FollowUpController', 'Follow-up Controller', 'Checks replies, waiting statuses, due follow-ups and stale sent emails.', 'Application; Outreach; Reply', 'Sent - Waiting for Reply to Reply Received / Follow-up Sent', 'Gmail Bridge syncSent; syncInbound; reconcileInboundReplies', 'Do not send follow-ups to repeated recipients without review.', 'AIstaff_Manager'],
      ['AIstaff_CRMController', 'CRM Controller', 'Maintains workbook consistency, entity-task-follow-up links, package rows, evidence links, duplicate detection, and event logs.', 'All CRM/System entities', 'All non-terminal stages', 'Google Sheets; Gmail Bridge; Drive package folders; AI Staff Event Log', 'Do not delete rows/files. Mark conflicts for manager review. Do not send emails.', 'AIstaff_Manager']
    ];
    registry.getRange(2, 1, rows.length, AI_STAFF_REGISTRY_HEADERS.length).setValues(rows);
    added += rows.length;
  }

  const templates = sheet_(BRIDGE.AI_STAFF_TASK_TEMPLATES);
  if (templates.getLastRow() <= 1) {
    const rows = [
      [
        'template_send_application_package',
        'AIstaff_ApplicationPackSender',
        'Send verified application package',
        'Send means use the approved queue row, verified recipient, verified package files, and Gmail Bridge to send the supervisor/university package email. It does not mean writing the package.',
        'Entity Type = Application; Current Stage = Package Verified or Current Status = Send Ready; queue row exists; no duplicate professor/supervisor risk; Run After <= now.',
        'swiss-planner-apply; validatePackageCompleteness; verifyQueueAttachments; processQueue only when approved and allowed',
        'Do not send repeated professor/supervisor recipients. Do not send incomplete packages. Do not send if attachment verification fails. Do not send internal package/status/CRM notes. Do not auto-send LinkedIn. Do not submit portals. Do not send cancelled/closed/submitted applications.',
        'Verify outbound content safety first, verify package completeness second, verify queue attachments third, process queue only for approved SEND_NOW/CREATE_DRAFT rows, then create a 7-day reply follow-up.',
        'Email sent, Gmail IDs recorded, Application status = Sent - Waiting for Reply, follow-up created for 7 days later.',
        'Package incomplete, attachment inaccessible, duplicate professor, invalid recipient, or Gmail bridge error.',
        'Sent - Waiting for Reply',
        'Blocked - Send Failed',
        'Create active follow-up for AIstaff_FollowUpController due 7 days after successful send.'
      ],
      [
        'template_prepare_application_package',
        'AIstaff_ApplicationPackMaker',
        'Prepare application package',
        'Create professor-specific CV/SOP/research proposal/publication list and package checklist for one application.',
        'Application status = Package Required or Package In Progress.',
        'swiss-planner-apply; local package generator; Google Drive package folder when available',
        'Use official evidence and professor research fit. Do not use generic proposals. Do not submit portals.',
        'Generate docs, verify readback, register package, and create sender task.',
        'Package prepared and entity status = Package Prepared or Package Verified.',
        'Missing official evidence, missing applicant source document, or package files not verified.',
        'Package Prepared',
        'Blocked - Package Incomplete',
        'Create active follow-up for package verification or sender handoff.'
      ],
      [
        'template_analyze_professor_research_fit',
        'AIstaff_ProfessorResearchAnalyst',
        'Analyze professor research fit',
        'Build an evidence-backed professor research brief, publication/theme summary, current-student/contact clues, and proposal angle for one application.',
        'Application reached Fit Approved, professor/supervisor is known, or package preparation needs deeper research evidence.',
        'swiss-planner-research; swiss-planner-apply; Google Scholar leads; official university/professor/lab pages; Professor Research Fit; Student Outreach; Links',
        'Do not invent professor publications, students, emails, or fit claims. Use public/official evidence. LinkedIn may identify leads but official/public evidence is required before application use.',
        'Create a concise research-fit record with evidence links, professor themes, Iman fit, proposal direction, and student/contact leads if public.',
        'Professor Research Fit row complete; evidence links added; application status can move to Package Required or Package In Progress.',
        'Evidence missing, professor not relevant, or duplicate/unverified supervisor risk found.',
        'Professor Research Fit Ready',
        'Blocked - Missing Professor Evidence',
        'Create active follow-up for AIstaff_ApplicationPackMaker or AIstaff_Manager depending on result.'
      ],
      [
        'template_check_reply_followup',
        'AIstaff_FollowUpController',
        'Check reply and follow-up need',
        'Check inbound replies and decide whether to mark reply received or create a follow-up email task.',
        'Application status = Sent - Waiting for Reply and follow-up due.',
        'syncInbound; reconcileInboundReplies; Gmail Inbox Log; Email Send Queue',
        'Do not auto-send repeated professor follow-up without review. Do not contact LinkedIn automatically.',
        'Sync inbound, reconcile replies, update status, and create next action task.',
        'Reply received or follow-up task created.',
        'No thread evidence, duplicate risk, or stale queue data.',
        'Reply Received - Needs Review',
        'No Reply - Follow-up Due',
        'If no reply, create next follow-up or human review task.'
      ],
      [
        'template_run_crm_process_health',
        'AIstaff_CRMController',
        'Run CRM process health check',
        'Audit workbook consistency across entities, tasks, follow-ups, packages, queue rows, evidence links, sent/reply logs, and event history.',
        'Daily CRM health cycle, manager audit request, stale entity, missing follow-up, blocked package, or status mismatch.',
        'Google Sheets; Gmail Bridge syncSent; syncInbound; reconcileInboundReplies; verifyConfiguredPackageFiles; validateConfiguredPackageCompleteness; auditAiStaffProcessHealth',
        'Do not delete rows or files. Do not send emails. Do not change submitted/closed applications except to log audit evidence. Escalate conflicts to AIstaff_Manager.',
        'Detect missing follow-ups, overdue tasks, blocked packages, duplicate queue rows, missing evidence, and mismatched statuses; create repair tasks.',
        'CRM health report written; blockers converted into task threads; no active AI entity lacks a follow-up.',
        'Could not verify package files, workbook access failed, or conflicting statuses need AI Manager guidance.',
        'CRM Health Checked',
        'Blocked - CRM Data Issue',
        'Create next CRM health follow-up for the next daily cycle and repair tasks for other staff where needed.'
      ],
      [
        AI_STAFF_FOLLOW_UP_ESCALATION_TEMPLATE,
        'AIstaff_Manager',
        'Review delayed active follow-up',
        'Review an active AI-owned entity whose active follow-up is more than 3 hours past due, decide why progress stopped, and create/reassign the next task or close/block the entity.',
        'Active AI-owned entity has an active follow-up whose Due At or Run After time is more than 3 hours old.',
        'AI Staff Entities; AI Staff Follow Ups; AI Staff Tasks; AI Staff Event Log; relevant CRM tabs',
        'Do not send emails or delete rows. Do not ignore the entity. Either move it forward, reassign it, mark it blocked with reason, or close it if terminal.',
        'Check the entity, inspect the delayed follow-up, check latest event history, then create the next concrete task or update status with a clear reason.',
        'Manager task created/resolved; entity has a fresh active follow-up or terminal/blocker status with reason.',
        'Delayed follow-up remains active without owner action, or entity has no clear next step.',
        'Manager Guidance Completed',
        'Process Broken - Follow-up Delayed',
        'Create or preserve an active follow-up unless the entity becomes terminal.'
      ]
    ];
    templates.getRange(2, 1, rows.length, AI_STAFF_TASK_TEMPLATE_HEADERS.length).setValues(rows);
    added += rows.length;
  }
  return added;
}

function makeAiStaffEntityId_(payload) {
  const type = sanitizeId_(payload.entityType || payload.type || 'entity');
  const related = payload.relatedApplicationId || payload.relatedApplicationID || payload.applicationId || payload.relatedOpportunityId || payload.opportunityId || payload.relatedId || Utilities.getUuid();
  return 'entity_' + type + '_' + sanitizeId_(related);
}

function upsertAiStaffEntityRecord_(record, user, reason, evidenceLink) {
  const sheet = sheet_(BRIDGE.AI_STAFF_ENTITIES);
  const values = readUsedRows_(sheet, AI_STAFF_ENTITY_HEADERS.length);
  const map = headerMap_(values[0]);
  const entityId = record['EntityID'];
  for (let r = 1; r < values.length; r++) {
    if (String(cell_(values[r], map, 'EntityID') || '') === entityId) {
      const before = rowObject_(values[r], map, AI_STAFF_ENTITY_HEADERS);
      sheet.getRange(r + 1, 1, 1, AI_STAFF_ENTITY_HEADERS.length).setValues([AI_STAFF_ENTITY_HEADERS.map(function(header) {
        return record[header] !== undefined && record[header] !== '' ? record[header] : before[header] || '';
      })]);
      logRecordChanges_(entityId, record['Entity Type'] || before['Entity Type'], before, rowObjectFromRecord_(record, before), user, reason, evidenceLink);
      return { added: false, updated: true };
    }
  }
  appendMappedRow_(sheet, AI_STAFF_ENTITY_HEADERS, record);
  appendAiStaffEvent_('Entity Created', entityId, record['Entity Type'], 'EntityID', '', entityId, user, reason, evidenceLink);
  return { added: true, updated: false };
}

function rowObjectFromRecord_(record, fallback) {
  const obj = {};
  for (let i = 0; i < AI_STAFF_ENTITY_HEADERS.length; i++) {
    const header = AI_STAFF_ENTITY_HEADERS[i];
    obj[header] = record[header] !== undefined && record[header] !== '' ? record[header] : (fallback ? fallback[header] : '');
  }
  return obj;
}

function logRecordChanges_(entityId, entityType, before, after, user, reason, evidenceLink) {
  for (let i = 0; i < AI_STAFF_ENTITY_HEADERS.length; i++) {
    const header = AI_STAFF_ENTITY_HEADERS[i];
    if (header === 'Last Updated') continue;
    const oldValue = String(before[header] || '');
    const newValue = String(after[header] || '');
    if (oldValue !== newValue) {
      appendAiStaffEvent_('Entity Updated', entityId, entityType, header, oldValue, newValue, user, reason, evidenceLink);
    }
  }
}

function updateAiStaffEntityFields_(entityId, updates, user, reason, evidenceLink) {
  const sheet = sheet_(BRIDGE.AI_STAFF_ENTITIES);
  const values = readUsedRows_(sheet, AI_STAFF_ENTITY_HEADERS.length);
  const map = headerMap_(values[0]);
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    if (String(cell_(row, map, 'EntityID') || '') !== String(entityId || '')) continue;
    const entityType = String(cell_(row, map, 'Entity Type') || '');
    Object.keys(updates).forEach(function(header) {
      if (map[header] === undefined) return;
      const before = cell_(row, map, header);
      const after = updates[header];
      sheet.getRange(r + 1, map[header] + 1).setValue(after);
      if (String(before || '') !== String(after || '') && header !== 'Last Updated') {
        appendAiStaffEvent_('Entity Updated', entityId, entityType, header, before, after, user, reason, evidenceLink);
      }
    });
    return true;
  }
  return false;
}

function resolveAiStaffEntity_(payload) {
  if (payload.entityId || payload.EntityID) return findAiStaffEntity_(payload.entityId || payload.EntityID);
  const entities = selectAiStaffEntityRows_();
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const applicationMatch = payload.applicationId && idMatches_(entity.relatedApplicationId, payload.applicationId);
    const opportunityMatch = payload.opportunityId && idMatches_(entity.relatedOpportunityId, payload.opportunityId);
    if (applicationMatch || opportunityMatch) return entity;
  }
  return null;
}

function findAiStaffEntity_(entityId) {
  const rows = selectAiStaffEntityRows_();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].entityId || '') === String(entityId || '')) return rows[i];
  }
  return null;
}

function selectAiStaffEntityRows_() {
  const sheet = sheet_(BRIDGE.AI_STAFF_ENTITIES);
  const values = readUsedRows_(sheet, AI_STAFF_ENTITY_HEADERS.length);
  if (values.length < 2) return [];
  const map = headerMap_(values[0]);
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    rows.push({
      sheet: sheet,
      rowNumber: r + 1,
      headerMap: map,
      entityId: String(cell_(row, map, 'EntityID') || ''),
      entityType: String(cell_(row, map, 'Entity Type') || ''),
      relatedId: String(cell_(row, map, 'Related ID') || ''),
      relatedOpportunityId: String(cell_(row, map, 'Related Opportunity ID') || ''),
      relatedApplicationId: String(cell_(row, map, 'Related ApplicationID') || ''),
      currentStage: String(cell_(row, map, 'Current Stage') || ''),
      currentStatus: String(cell_(row, map, 'Current Status') || ''),
      responsibleStaff: String(cell_(row, map, 'Responsible Staff') || ''),
      priority: String(cell_(row, map, 'Priority') || ''),
      deadline: cell_(row, map, 'Deadline'),
      active: cell_(row, map, 'Active'),
      lastFollowUpId: String(cell_(row, map, 'Last Follow-up ID') || ''),
      lastTaskId: String(cell_(row, map, 'Last Task ID') || ''),
      lastUpdated: cell_(row, map, 'Last Updated'),
      notes: String(cell_(row, map, 'Notes') || '')
    });
  }
  return rows;
}

function ensureAiStaffEntityFollowUp_(entity, options) {
  if (!entity || !entityRequiresFollowUp_(entity)) return null;
  options = options || {};
  if (options.replaceExisting) {
    closeAiStaffFollowUpsForEntity_(entity.entityId, options.createdBy || 'AIstaff_Manager', options.reason || 'Replacing active follow-up.');
  }
  const existing = activeAiStaffFollowUpsForEntity_(entity.entityId);
  if (existing.length && !options.forceNew) return existing[0];
  const dueAt = options.dueAt || options.runAfter || defaultFollowUpDueAt_();
  return appendAiStaffFollowUp({
    entityId: entity.entityId,
    staff: options.staff || entity.responsibleStaff || 'AIstaff_Manager',
    reason: options.reason || 'Required active follow-up for AI-owned active entity.',
    runAfter: options.runAfter || dueAt,
    dueAt: dueAt,
    nextAction: options.nextAction || 'Review entity progress and create/complete the next valid task.',
    completionCriteria: options.completionCriteria || 'Entity moved forward, blocked with reason, or next follow-up/task created.',
    createdBy: options.createdBy || 'AIstaff_Manager',
    evidenceLink: options.evidenceLink || ''
  });
}

function defaultFollowUpDueAt_() {
  return new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
}

function entityRequiresFollowUp_(entity) {
  if (!entity) return false;
  if (!isTruthy_(entity.active)) return false;
  if (isAiStaffTerminalStatus_(entity.currentStatus)) return false;
  if (!isAiStaff_(entity.responsibleStaff)) return false;
  return true;
}

function isAiStaff_(staff) {
  return String(staff || '').toLowerCase().indexOf('aistaff_') === 0;
}

function isAiStaffTerminalStatus_(status) {
  const text = String(status || '').toLowerCase().trim();
  for (let i = 0; i < AI_STAFF_TERMINAL_STATUSES.length; i++) {
    if (text === AI_STAFF_TERMINAL_STATUSES[i].toLowerCase()) return true;
  }
  return false;
}

function isTruthy_(value) {
  const text = String(value === undefined ? '' : value).toLowerCase().trim();
  return !text || ['true', 'yes', 'y', '1', 'active', 'on'].indexOf(text) >= 0;
}

function closeAiStaffFollowUpsForEntity_(entityId, user, reason) {
  const followUps = selectAiStaffFollowUpRows_();
  let count = 0;
  for (let i = 0; i < followUps.length; i++) {
    const followUp = followUps[i];
    if (followUp.entityId !== entityId || !isTruthy_(followUp.active)) continue;
    updateMappedRow_(followUp.sheet, followUp.rowNumber, followUp.headerMap, {
      'Active': 'FALSE',
      'Status': 'Closed',
      'Completed At': new Date(),
      'Result': reason
    });
    appendAiStaffEvent_('Follow-up Closed', entityId, '', 'Follow-up Status', followUp.status, 'Closed', user, reason, '');
    count++;
  }
  return count;
}

function activeAiStaffFollowUpsForEntity_(entityId) {
  const rows = selectAiStaffFollowUpRows_();
  return rows.filter(function(row) {
    return row.entityId === entityId && isTruthy_(row.active) && row.status.toLowerCase() !== 'done' && row.status.toLowerCase() !== 'closed' && row.status.toLowerCase() !== 'cancelled';
  });
}

function findAiStaffFollowUp_(followUpId) {
  const rows = selectAiStaffFollowUpRows_();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].followUpId || '') === String(followUpId || '')) return rows[i];
  }
  return null;
}

function selectAiStaffFollowUpRows_() {
  const sheet = sheet_(BRIDGE.AI_STAFF_FOLLOW_UPS);
  const values = readUsedRows_(sheet, AI_STAFF_FOLLOW_UP_HEADERS.length);
  if (values.length < 2) return [];
  const map = headerMap_(values[0]);
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    rows.push({
      sheet: sheet,
      rowNumber: r + 1,
      headerMap: map,
      followUpId: String(cell_(row, map, 'FollowUpID') || ''),
      entityId: String(cell_(row, map, 'EntityID') || ''),
      staff: String(cell_(row, map, 'Staff') || ''),
      reason: String(cell_(row, map, 'Reason') || ''),
      runAfter: cell_(row, map, 'Run After'),
      dueAt: cell_(row, map, 'Due At'),
      active: cell_(row, map, 'Active'),
      status: String(cell_(row, map, 'Status') || ''),
      nextAction: String(cell_(row, map, 'Next Action') || ''),
      completionCriteria: String(cell_(row, map, 'Completion Criteria') || ''),
      createdBy: String(cell_(row, map, 'Created By') || ''),
      createdAt: cell_(row, map, 'Created At'),
      completedAt: cell_(row, map, 'Completed At'),
      result: String(cell_(row, map, 'Result') || ''),
      evidenceLink: String(cell_(row, map, 'Evidence Link') || '')
    });
  }
  return rows;
}

function findAiStaffTask_(taskId) {
  const rows = selectAiStaffTaskRows_();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].taskId || '') === String(taskId || '')) return rows[i];
  }
  return null;
}

function selectAiStaffTaskRows_() {
  const sheet = sheet_(BRIDGE.AI_STAFF_RUN_QUEUE);
  const values = readUsedRows_(sheet, AI_STAFF_RUN_QUEUE_HEADERS.length);
  if (values.length < 2) return [];
  const map = headerMap_(values[0]);
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    rows.push({
      sheet: sheet,
      rowNumber: r + 1,
      headerMap: map,
      taskId: String(cell_(row, map, 'Task ID') || ''),
      taskType: String(cell_(row, map, 'Task Type') || ''),
      taskTemplateId: String(cell_(row, map, 'Task Template ID') || ''),
      assignedTo: String(cell_(row, map, 'Assigned To') || ''),
      createdBy: String(cell_(row, map, 'Created By') || ''),
      entityId: String(cell_(row, map, 'EntityID') || ''),
      relatedOpportunityId: String(cell_(row, map, 'Related Opportunity ID') || ''),
      relatedApplicationId: String(cell_(row, map, 'Related ApplicationID') || ''),
      kpiId: String(cell_(row, map, 'KPI ID') || ''),
      priority: String(cell_(row, map, 'Priority') || ''),
      runAfter: cell_(row, map, 'Run After'),
      dueAt: cell_(row, map, 'Due At'),
      deadline: cell_(row, map, 'Deadline'),
      dependsOn: String(cell_(row, map, 'Depends On') || ''),
      status: String(cell_(row, map, 'Status') || ''),
      nextAction: String(cell_(row, map, 'Next Action') || ''),
      completionCriteria: String(cell_(row, map, 'Completion Criteria') || ''),
      successStatus: String(cell_(row, map, 'Success Status') || ''),
      failureStatus: String(cell_(row, map, 'Failure Status') || ''),
      lastError: String(cell_(row, map, 'Last Error') || ''),
      createdAt: cell_(row, map, 'Created At'),
      completedAt: cell_(row, map, 'Completed At'),
      resultNotes: String(cell_(row, map, 'Result Notes') || ''),
      evidenceLink: String(cell_(row, map, 'Evidence Link') || ''),
      taskCategory: String(cell_(row, map, 'Task Category') || ''),
      threadId: String(cell_(row, map, 'ThreadID') || ''),
      sourceStaff: String(cell_(row, map, 'Source Staff') || ''),
      targetStaff: String(cell_(row, map, 'Target Staff') || ''),
      escalationLevel: String(cell_(row, map, 'Escalation Level') || ''),
      learningCandidateId: String(cell_(row, map, 'Learning Candidate ID') || '')
    });
  }
  return rows;
}

function selectAiStaffRegistryRows_() {
  const sheet = sheet_(BRIDGE.AI_STAFF_REGISTRY);
  const values = readUsedRows_(sheet, AI_STAFF_REGISTRY_HEADERS.length);
  if (values.length < 2) return [];
  const map = headerMap_(values[0]);
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    rows.push({
      staffId: String(cell_(row, map, 'StaffID') || ''),
      role: String(cell_(row, map, 'Role') || ''),
      scope: String(cell_(row, map, 'Scope') || ''),
      allowedEntityTypes: String(cell_(row, map, 'Allowed Entity Types') || ''),
      allowedStageRange: String(cell_(row, map, 'Allowed Stage Range') || ''),
      allowedTools: String(cell_(row, map, 'Allowed Tools') || ''),
      guardrails: String(cell_(row, map, 'Guardrails') || ''),
      manager: String(cell_(row, map, 'Manager') || '')
    });
  }
  return rows;
}

function buildAiStaffDashboardSummary_(registry, tasks, followUps, entities, now) {
  const staffMap = {};
  function ensure(staffId) {
    const id = staffId || 'Unassigned';
    if (!staffMap[id]) {
      staffMap[id] = {
        staffId: id,
        role: '',
        activeEntities: 0,
        openTasks: 0,
        dueTasks: 0,
        overdueTasks: 0,
        waitingCodexWorker: 0,
        openFollowUps: 0,
        overdueFollowUps: 0,
        managerReview: 0,
        currentWork: '',
        nextRunAt: ''
      };
    }
    return staffMap[id];
  }
  (registry || []).forEach(function(row) {
    const item = ensure(row.staffId);
    item.role = row.role || item.role;
  });
  (entities || []).forEach(function(entity) {
    if (!isTruthy_(entity.active) || isAiStaffTerminalStatus_(entity.currentStatus)) return;
    const item = ensure(entity.responsibleStaff);
    item.activeEntities++;
  });
  (tasks || []).forEach(function(task) {
    const item = ensure(task.assignedTo);
    if (!item.currentWork && isOpenAiStaffWorkStatus_(task.status)) item.currentWork = task.nextAction || task.taskType || task.taskId;
    if (!isOpenAiStaffWorkStatus_(task.status)) return;
    item.openTasks++;
    if (isCodexWorkerHandoffTask_(task)) {
      item.waitingCodexWorker++;
    } else {
      if (dateIsDue_(task.runAfter || task.dueAt, now)) item.dueTasks++;
      if (dateIsOverdue_(task.dueAt, now)) item.overdueTasks++;
      if (isManagerReviewStatus_(task.status) || task.lastError) item.managerReview++;
    }
    item.nextRunAt = earliestDashboardDate_(item.nextRunAt, task.runAfter || task.dueAt);
  });
  (followUps || []).forEach(function(followUp) {
    const item = ensure(followUp.staff);
    if (!item.currentWork && isTruthy_(followUp.active) && isOpenAiStaffWorkStatus_(followUp.status)) item.currentWork = followUp.nextAction || followUp.reason || followUp.followUpId;
    if (!isTruthy_(followUp.active) || !isOpenAiStaffWorkStatus_(followUp.status)) return;
    item.openFollowUps++;
    if (dateIsOverdue_(followUp.dueAt, now)) {
      item.overdueFollowUps++;
      item.managerReview++;
    }
    item.nextRunAt = earliestDashboardDate_(item.nextRunAt, followUp.runAfter || followUp.dueAt);
  });
  return Object.keys(staffMap).sort().map(function(key) { return staffMap[key]; });
}

function sortAiStaffWorkForDashboard_(rows, now) {
  return (rows || []).slice().sort(function(left, right) {
    const leftOverdue = dateIsOverdue_(left.dueAt, now) ? 1 : 0;
    const rightOverdue = dateIsOverdue_(right.dueAt, now) ? 1 : 0;
    if (rightOverdue !== leftOverdue) return rightOverdue - leftOverdue;
    const priorityDelta = aiStaffPriorityWeight_(left.priority) - aiStaffPriorityWeight_(right.priority);
    if (priorityDelta) return priorityDelta;
    return aiStaffWorkTime_(left, now) - aiStaffWorkTime_(right, now);
  });
}

function sortEntitiesForDashboard_(rows) {
  return (rows || []).slice().sort(function(left, right) {
    const priorityDelta = aiStaffPriorityWeight_(left.priority) - aiStaffPriorityWeight_(right.priority);
    if (priorityDelta) return priorityDelta;
    return dashboardTime_(right.lastUpdated) - dashboardTime_(left.lastUpdated);
  });
}

function compactDashboardTask_(row, now) {
  return {
    taskId: row.taskId,
    taskType: row.taskType,
    templateId: row.taskTemplateId,
    assignedTo: row.assignedTo,
    entityId: row.entityId,
    applicationId: row.relatedApplicationId,
    opportunityId: row.relatedOpportunityId,
    priority: row.priority,
    status: row.status,
    runAfter: row.runAfter,
    dueAt: row.dueAt,
    deadline: row.deadline,
    overdue: dateIsOverdue_(row.dueAt, now),
    nextAction: row.nextAction,
    completionCriteria: row.completionCriteria,
    lastError: row.lastError,
    evidenceLink: row.evidenceLink,
    resultNotes: row.resultNotes,
    taskCategory: row.taskCategory,
    threadId: row.threadId,
    sourceStaff: row.sourceStaff,
    targetStaff: row.targetStaff,
    escalationLevel: row.escalationLevel,
    learningCandidateId: row.learningCandidateId
  };
}

function compactDashboardFollowUp_(row, now) {
  return {
    followUpId: row.followUpId,
    entityId: row.entityId,
    staff: row.staff,
    reason: row.reason,
    runAfter: row.runAfter,
    dueAt: row.dueAt,
    active: row.active,
    status: row.status,
    overdue: dateIsOverdue_(row.dueAt, now),
    nextAction: row.nextAction,
    result: row.result,
    evidenceLink: row.evidenceLink
  };
}

function compactDashboardEntity_(row) {
  return {
    entityId: row.entityId,
    entityType: row.entityType,
    applicationId: row.relatedApplicationId,
    opportunityId: row.relatedOpportunityId,
    currentStage: row.currentStage,
    currentStatus: row.currentStatus,
    responsibleStaff: row.responsibleStaff,
    priority: row.priority,
    deadline: row.deadline,
    lastFollowUpId: row.lastFollowUpId,
    lastTaskId: row.lastTaskId,
    lastUpdated: row.lastUpdated,
    notes: row.notes
  };
}

function compactDashboardQueueRow_(row) {
  return {
    queueId: row.queueId,
    applicationId: row.applicationId,
    opportunityId: row.opportunityId,
    recipientType: row.recipientType,
    recipientName: row.recipientName,
    to: row.to,
    subject: row.subject,
    approvalStatus: row.approvalStatus,
    sendStatus: row.sendStatus,
    sendMode: row.sendMode,
    sentAt: row.sentAt,
    lastError: row.lastError
  };
}

function recentSheetObjects_(sheetName, headers, limit) {
  const sheet = sheet_(sheetName);
  const values = readUsedRows_(sheet, headers.length);
  if (values.length < 2) return [];
  const map = headerMap_(values[0]);
  const rows = [];
  const start = Math.max(1, values.length - Math.max(1, Number(limit || 20)));
  for (let i = values.length - 1; i >= start; i--) {
    rows.push(rowObject_(values[i], map, headers));
  }
  return rows;
}

function limitRows_(rows, limit) {
  return (rows || []).slice(0, Math.max(1, Number(limit || 20)));
}

function isOpenAiStaffWorkStatus_(status) {
  const text = String(status || '').toLowerCase().trim();
  if (!text) return true;
  return ['done', 'closed', 'cancelled', 'sent', 'submitted', 'no further action'].indexOf(text) < 0;
}

function isManagerReviewStatus_(status) {
  const text = String(status || '').toLowerCase();
  return text.indexOf('blocked') >= 0 || text.indexOf('needs approval') >= 0 || text.indexOf('needs review') >= 0 || text.indexOf('error') >= 0 || text.indexOf('failed') >= 0;
}

function isCodexWorkerWaitingStatus_(status) {
  const text = String(status || '').toLowerCase();
  return text.indexOf('waiting for codex worker') >= 0 || text.indexOf('codex handoff') >= 0;
}

function isCodexWorkerHandoffTask_(task) {
  const text = String([
    task && task.status,
    task && task.lastError,
    task && task.resultNotes,
    task && task.nextAction,
    task && task.completionCriteria
  ].join(' ')).toLowerCase();
  if (!text) return false;
  if (text.indexOf('duplicate recipient') >= 0 ||
      text.indexOf('repeated professor') >= 0 ||
      text.indexOf('repeated supervisor') >= 0 ||
      text.indexOf('needs human review') >= 0 ||
      text.indexOf('human review') >= 0 ||
      text.indexOf('supervisor reply') >= 0 ||
      text.indexOf('portal submission') >= 0 ||
      text.indexOf('linkedin') >= 0 ||
      text.indexOf('manual send') >= 0) {
    return false;
  }
  return isCodexWorkerWaitingStatus_(task && task.status) ||
    text.indexOf('requires codex') >= 0 ||
    text.indexOf('outside apps script') >= 0 ||
    text.indexOf('external research') >= 0 ||
    text.indexOf('research') >= 0 ||
    text.indexOf('find ') >= 0 ||
    text.indexOf('opportunit') >= 0 ||
    text.indexOf('fit') >= 0 ||
    text.indexOf('package writing') >= 0 ||
    text.indexOf('package') >= 0 ||
    text.indexOf('proposal writing') >= 0 ||
    text.indexOf('proposal') >= 0 ||
    text.indexOf('professor analysis') >= 0 ||
    text.indexOf('professor') >= 0 ||
    text.indexOf('document drafting') >= 0 ||
    text.indexOf('document') >= 0 ||
    text.indexOf('cv') >= 0 ||
    text.indexOf('resume') >= 0 ||
    text.indexOf('sop') >= 0;
}

function earliestDashboardDate_(current, candidate) {
  if (!candidate) return current || '';
  if (!current) return candidate;
  return dashboardTime_(candidate) < dashboardTime_(current) ? candidate : current;
}

function dashboardTime_(value) {
  const date = toDate_(value);
  return date ? date.getTime() : 0;
}

function sameDay_(value, now) {
  const date = toDate_(value);
  if (!date) return false;
  return date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
}

function resolveSnoozeDate_(payload) {
  if (payload.dueAt) return payload.dueAt;
  if (payload.runAfter) return payload.runAfter;
  const hours = Number(payload.hours || payload.snoozeHours || 24);
  return new Date(new Date().getTime() + Math.max(1, isNaN(hours) ? 24 : hours) * 60 * 60 * 1000);
}

function dueAiStaffTasks_(staff, now) {
  const rows = selectAiStaffTaskRows_();
  const result = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const status = row.status.toLowerCase();
    if (status !== 'queued') continue;
    if (isCodexWorkerHandoffTask_(row)) continue;
    if (staff && row.assignedTo !== staff) continue;
    if (!dateIsDue_(row.runAfter || row.dueAt, now)) continue;
    result.push(compactAiStaffTask_(row, now));
  }
  return result;
}

function dueAiStaffFollowUps_(staff, now) {
  const rows = selectAiStaffFollowUpRows_();
  const result = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const status = row.status.toLowerCase();
    if (!isTruthy_(row.active) || status === 'done' || status === 'closed' || status === 'cancelled') continue;
    if (staff && row.staff !== staff) continue;
    if (!dateIsDue_(row.runAfter || row.dueAt, now)) continue;
    result.push(compactAiStaffFollowUp_(row, now));
  }
  return result;
}

function compactAiStaffTask_(row, now) {
  return {
    taskId: row.taskId,
    taskType: row.taskType,
    taskTemplateId: row.taskTemplateId,
    assignedTo: row.assignedTo,
    entityId: row.entityId,
    priority: row.priority,
    runAfter: row.runAfter,
    dueAt: row.dueAt,
    overdue: dateIsOverdue_(row.dueAt, now),
    status: row.status,
    nextAction: row.nextAction,
    evidenceLink: row.evidenceLink
  };
}

function compactAiStaffFollowUp_(row, now) {
  return {
    followUpId: row.followUpId,
    entityId: row.entityId,
    staff: row.staff,
    reason: row.reason,
    runAfter: row.runAfter,
    dueAt: row.dueAt,
    overdue: dateIsOverdue_(row.dueAt, now),
    status: row.status,
    nextAction: row.nextAction,
    evidenceLink: row.evidenceLink
  };
}

function resetStaleAiStaffRunningWork_(staleHours, now) {
  const staleMs = Math.max(1, Number(staleHours || 3)) * 60 * 60 * 1000;
  let tasksReset = 0;
  let followUpsReset = 0;
  const tasks = selectAiStaffTaskRows_();
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (!isRunningAiStaffStatus_(task.status)) continue;
    if (!isAiStaffWorkStale_(task, now, staleMs)) continue;
    const note = 'Reset by AI Staff task runner after stale Running/In Progress status.';
    updateMappedRow_(task.sheet, task.rowNumber, task.headerMap, {
      'Status': 'Queued',
      'Last Error': appendText_(task.lastError, note),
      'Result Notes': appendText_(task.resultNotes, note)
    });
    appendAiStaffEvent_('Task Reset', task.entityId, '', 'Task Status', task.status, 'Queued', 'AIstaff_Manager', note, task.evidenceLink || '');
    tasksReset++;
  }
  const followUps = selectAiStaffFollowUpRows_();
  for (let j = 0; j < followUps.length; j++) {
    const followUp = followUps[j];
    if (!isTruthy_(followUp.active) || !isRunningAiStaffStatus_(followUp.status)) continue;
    if (!isAiStaffWorkStale_(followUp, now, staleMs)) continue;
    const reason = 'Reset by AI Staff task runner after stale Running/In Progress follow-up status.';
    updateMappedRow_(followUp.sheet, followUp.rowNumber, followUp.headerMap, {
      'Status': 'Queued',
      'Result': appendText_(followUp.result, reason)
    });
    appendAiStaffEvent_('Follow-up Reset', followUp.entityId, '', 'Follow-up Status', followUp.status, 'Queued', 'AIstaff_Manager', reason, followUp.evidenceLink || '');
    followUpsReset++;
  }
  return { tasksReset: tasksReset, followUpsReset: followUpsReset };
}

function pickNextAiStaffWork_(tasks, followUps, now) {
  const items = [];
  (tasks || []).forEach(function(task) {
    items.push({
      kind: 'task',
      id: task.taskId,
      staff: task.assignedTo,
      priority: task.priority,
      dueAt: task.dueAt,
      runAfter: task.runAfter,
      overdue: task.overdue,
      data: task
    });
  });
  (followUps || []).forEach(function(followUp) {
    items.push({
      kind: 'followUp',
      id: followUp.followUpId,
      staff: followUp.staff,
      priority: '',
      dueAt: followUp.dueAt,
      runAfter: followUp.runAfter,
      overdue: followUp.overdue,
      data: followUp
    });
  });
  if (!items.length) return null;
  items.sort(function(left, right) {
    const managerDelta = managerWorkWeight_(left) - managerWorkWeight_(right);
    if (managerDelta) return managerDelta;
    const overdueDelta = (right.overdue ? 1 : 0) - (left.overdue ? 1 : 0);
    if (overdueDelta) return overdueDelta;
    const priorityDelta = aiStaffPriorityWeight_(left.priority) - aiStaffPriorityWeight_(right.priority);
    if (priorityDelta) return priorityDelta;
    return aiStaffWorkTime_(left, now) - aiStaffWorkTime_(right, now);
  });
  return items[0];
}

function processOneAiStaffWork_(item, payload) {
  if (item.kind === 'followUp') return processOneAiStaffFollowUp_(item.data, payload || {});
  return processOneAiStaffTask_(item.data, payload || {});
}

function processOneAiStaffFollowUp_(followUp, payload) {
  const full = findAiStaffFollowUp_(followUp.followUpId);
  if (!full) return { kind: 'followUp', id: followUp.followUpId, status: 'Blocked', message: 'Follow-up row not found.' };
  const startedNote = 'AI Staff task runner converted due follow-up into a task.';
  updateMappedRow_(full.sheet, full.rowNumber, full.headerMap, {
    'Status': 'Running',
    'Result': appendText_(full.result, 'AI Staff task runner started.')
  });
  appendAiStaffEvent_('Follow-up Started', full.entityId, '', 'Follow-up Status', full.status, 'Running', full.staff || 'AIstaff_Manager', 'AI Staff task runner started follow-up.', full.evidenceLink || '');
  const entity = findAiStaffEntity_(full.entityId);
  const staff = full.staff || (entity ? entity.responsibleStaff : '') || 'AIstaff_Manager';
  const templateId = staff === 'AIstaff_Manager' ? AI_STAFF_FOLLOW_UP_ESCALATION_TEMPLATE : 'template_check_reply_followup';
  completeAiStaffFollowUp({
    followUpId: full.followUpId,
    status: 'Done',
    result: startedNote,
    ensureFollowUp: true,
    createTask: {
      taskType: 'Follow-up',
      taskTemplateId: templateId,
      assignedTo: staff,
      createdBy: full.staff || 'AIstaff_Manager',
      entityId: full.entityId,
      relatedOpportunityId: entity ? entity.relatedOpportunityId : '',
      relatedApplicationId: entity ? entity.relatedApplicationId : '',
      priority: entity ? entity.priority : '',
      runAfter: new Date(),
      dueAt: new Date(),
      nextAction: full.nextAction || 'Review due follow-up and decide the next action.',
      completionCriteria: full.completionCriteria || 'Follow-up reviewed and next task/status recorded.',
      successStatus: 'Reply Reviewed - Next Action Set',
      failureStatus: 'Needs Human Review - Supervisor Reply',
      evidenceLink: full.evidenceLink || ''
    }
  });
  return { kind: 'followUp', id: full.followUpId, status: 'Done', message: startedNote };
}

function processOneAiStaffTask_(task, payload) {
  const full = findAiStaffTask_(task.taskId);
  if (!full) return { kind: 'task', id: task.taskId, status: 'Blocked', message: 'Task row not found.' };
  markAiStaffTaskRunning_(full);
  try {
    if (isSendApplicationPackageTask_(full)) return processSendApplicationPackageTask_(full, payload);
    if (isCrmHealthTask_(full)) return processCrmHealthTask_(full, payload);
    if (isReplyFollowUpTask_(full)) return processReplyFollowUpTask_(full, payload);
    return completeTaskCodexHandoff_(full, 'This task requires Codex work outside Apps Script: ' + (full.nextAction || full.taskTemplateId || full.taskType));
  } catch (err) {
    return completeTaskBlocked_(full, 'Blocked', String(err && err.message ? err.message : err), full.failureStatus || 'Blocked - Task Runner Error');
  }
}

function processSendApplicationPackageTask_(task, payload) {
  const queue = findBestEmailQueueRowForTask_(task);
  if (!queue) {
    return completeTaskBlocked_(task, 'Blocked', 'No Email Send Queue row found for this application/opportunity.', task.failureStatus || 'Blocked - Send Queue Missing');
  }
  const approval = String(cell_(queue.rawRow, queue.headerMap, 'Approval Status') || '').trim();
  const sendStatus = String(cell_(queue.rawRow, queue.headerMap, 'Send Status') || '').trim();
  const sendStatusUpper = sendStatus.toUpperCase();
  if (sendStatusUpper === 'SENT' || sendStatusUpper === 'SENT - REPLY RECEIVED') {
    return completeTaskDone_(task, 'Email already sent for queue row ' + queue.queueId + '.', 'Sent - Waiting for Reply', {
      staff: 'AIstaff_FollowUpController',
      reason: 'Check for reply after sent package.',
      dueAt: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
      nextAction: 'Check whether the recipient replied and decide follow-up.'
    });
  }
  if (sendStatusUpper.indexOf('DUPLICATE') >= 0 || approval.toLowerCase().indexOf('duplicate') >= 0 || approval.toLowerCase().indexOf('needs review') >= 0) {
    return completeTaskNeedsApproval_(task, 'Needs Approval', 'Duplicate or manual-review recipient guardrail is active for queue row ' + queue.queueId + '.', 'Needs Human Review - Duplicate Recipient');
  }
  if (approval.toLowerCase() !== 'approved') {
    return completeTaskNeedsApproval_(task, 'Needs Approval', 'Queue row ' + queue.queueId + ' is not approved yet.', 'Send Ready');
  }
  const packageCheck = validateQueuePackageCompleteness_(queue.sheet, queue.rowNumber, queue.rawRow, queue.headerMap);
  if (!packageCheck.ok) {
    setCell_(queue.sheet, queue.rowNumber, queue.headerMap, 'Send Status', packageCheck.status || 'Blocked - Package Incomplete');
    setCell_(queue.sheet, queue.rowNumber, queue.headerMap, 'Last Error', packageCheck.message || 'Package incomplete.');
    return completeTaskBlocked_(task, 'Blocked', packageCheck.message || 'Package incomplete.', task.failureStatus || 'Blocked - Package Incomplete');
  }
  try {
    const attachmentCheck = verifyQueueAttachmentsForRow_(queue.rawRow, queue.headerMap);
    appendQueueNote_(queue.sheet, queue.rowNumber, queue.headerMap, attachmentCheck.message);
  } catch (err) {
    const message = String(err && err.message ? err.message : err);
    setCell_(queue.sheet, queue.rowNumber, queue.headerMap, 'Send Status', 'Blocked - Attachments Failed');
    setCell_(queue.sheet, queue.rowNumber, queue.headerMap, 'Last Error', message);
    return completeTaskBlocked_(task, 'Blocked', message, task.failureStatus || 'Blocked - Attachment Verification Failed');
  }
  if (!configIsTrue_('AUTO_PROCESS_APPROVED_QUEUE', false) && payload.forceSend !== true) {
    return completeTaskNeedsApproval_(task, 'Needs Approval', 'Package and attachments verified, but AUTO_PROCESS_APPROVED_QUEUE is not enabled.', 'Send Ready');
  }
  const result = processApprovedEmailQueueById_(queue.queueId);
  const finalStatus = String(result.sendStatus || '').toUpperCase();
  if (finalStatus === 'SENT') {
    return completeTaskDone_(task, 'Sent queue row ' + queue.queueId + '.', 'Sent - Waiting for Reply', {
      staff: 'AIstaff_FollowUpController',
      reason: 'Check for reply after sent package.',
      dueAt: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
      nextAction: 'Check whether the recipient replied and decide follow-up.'
    });
  }
  if (finalStatus === 'DRAFT CREATED') {
    return completeTaskDone_(task, 'Draft created for queue row ' + queue.queueId + '.', 'Outreach Queued');
  }
  if (finalStatus.indexOf('BLOCKED') >= 0 || finalStatus === 'ERROR') {
    return completeTaskBlocked_(task, 'Blocked', result.lastError || result.message || 'Queue processing blocked.', task.failureStatus || finalStatus);
  }
  return completeTaskNeedsApproval_(task, 'Needs Approval', result.message || 'Queue row did not reach a terminal sent/draft status.', 'Send Ready');
}

function processCrmHealthTask_(task, payload) {
  let sent = null;
  let inbound = null;
  let audit = null;
  if (payload.skipGmailSync !== true && String(payload.skipGmailSync || '').toLowerCase() !== 'true') {
    sent = syncSentEmails();
    inbound = syncInboundReplies();
  }
  audit = auditAiStaffProcessHealth({});
  return completeTaskDone_(task, 'CRM health checked. Sent sync: ' + summarizeResult_(sent) + '; inbound sync: ' + summarizeResult_(inbound) + '; audit issues: ' + (audit.issueCount || 0) + '.', task.successStatus || 'CRM Health Checked', {
    staff: task.assignedTo || 'AIstaff_CRMController',
    reason: 'Next CRM health cycle.',
    dueAt: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
    nextAction: 'Run the next CRM health check.'
  });
}

function processReplyFollowUpTask_(task, payload) {
  let inbound = null;
  if (payload.skipGmailSync !== true && String(payload.skipGmailSync || '').toLowerCase() !== 'true') {
    inbound = syncInboundReplies();
  } else {
    inbound = reconcileInboundReplies();
  }
  return completeTaskNeedsApproval_(
    task,
    'Needs Approval',
    'Reply/follow-up check ran. Inbound result: ' + summarizeResult_(inbound) + '. Human/Codex review is needed to decide response wording or closure.',
    task.failureStatus || 'Needs Human Review - Supervisor Reply'
  );
}

function processApprovedEmailQueueById_(queueId) {
  const sheet = sheet_(BRIDGE.SEND_QUEUE);
  const queue = findEmailQueueRowById_(queueId);
  if (!queue) throw new Error('Queue ID not found: ' + queueId);
  const row = queue.rawRow;
  const headerMap = queue.headerMap;
  const approval = cell_(row, headerMap, 'Approval Status');
  const currentStatus = String(cell_(row, headerMap, 'Send Status') || '').trim();
  const mode = (cell_(row, headerMap, 'Send Mode') || getConfig_('DEFAULT_SEND_MODE') || 'CREATE_DRAFT').toUpperCase();
  if (String(approval).toLowerCase() !== 'approved') {
    return { ok: false, queueId: queue.queueId, sendStatus: currentStatus, message: 'Queue row is not approved.' };
  }
  if (isFinalQueueSendStatus_(currentStatus)) {
    return { ok: true, queueId: queue.queueId, sendStatus: currentStatus, message: 'Queue row already has final status.' };
  }
  if (!isDue_(cell_(row, headerMap, 'Not Before'))) {
    return { ok: false, queueId: queue.queueId, sendStatus: currentStatus, message: 'Queue row is not due yet.' };
  }
  const packageCheck = validateQueuePackageCompleteness_(sheet, queue.rowNumber, row, headerMap);
  if (!packageCheck.ok) {
    setCell_(sheet, queue.rowNumber, headerMap, 'Send Status', packageCheck.status || 'Blocked - Package Incomplete');
    setCell_(sheet, queue.rowNumber, headerMap, 'Last Error', packageCheck.message || 'Package is incomplete.');
    return { ok: false, queueId: queue.queueId, sendStatus: packageCheck.status || 'Blocked - Package Incomplete', lastError: packageCheck.message || '' };
  }
  try {
    const contentCheck = validateQueueEmailContentSafety_(row, headerMap);
    if (!contentCheck.ok) {
      setCell_(sheet, queue.rowNumber, headerMap, 'Send Status', contentCheck.status || 'Blocked - Content Review');
      setCell_(sheet, queue.rowNumber, headerMap, 'Last Error', contentCheck.message || 'Outbound email content needs review.');
      appendQueueNote_(sheet, queue.rowNumber, headerMap, contentCheck.message || 'Outbound email content needs review.');
      logRun_('processQueueRow', 'Blocked', 0, 1, 0, 0, 1, 'Queue ID: ' + queue.queueId + '; ' + (contentCheck.message || 'Content review required.'));
      return { ok: false, queueId: queue.queueId, sendStatus: contentCheck.status || 'Blocked - Content Review', lastError: contentCheck.message || '' };
    }
    const attachmentCheck = verifyQueueAttachmentsForRow_(row, headerMap);
    appendQueueNote_(sheet, queue.rowNumber, headerMap, attachmentCheck.message);
    setCell_(sheet, queue.rowNumber, headerMap, 'Send Status', 'Processing');
    SpreadsheetApp.flush();
    const to = cell_(row, headerMap, 'To');
    const subject = cell_(row, headerMap, 'Subject');
    const body = cell_(row, headerMap, 'Body');
    const options = buildMailOptions_(row, headerMap);
    if (!to || !subject || !body) throw new Error('Missing To, Subject, or Body.');
    if (mode === 'SEND_NOW') {
      GmailApp.sendEmail(to, subject, body, options);
      setCell_(sheet, queue.rowNumber, headerMap, 'Send Status', 'Sent');
      setCell_(sheet, queue.rowNumber, headerMap, 'Sent At', new Date());
      setCell_(sheet, queue.rowNumber, headerMap, 'Last Error', '');
      logRun_('processQueueRow', 'OK', 0, 1, 1, 0, 0, 'Queue ID: ' + queue.queueId);
      return { ok: true, queueId: queue.queueId, sendStatus: 'Sent' };
    }
    const draft = GmailApp.createDraft(to, subject, body, options);
    setCell_(sheet, queue.rowNumber, headerMap, 'Send Status', 'Draft Created');
    setCell_(sheet, queue.rowNumber, headerMap, 'Gmail Draft ID', draft.getId());
    setCell_(sheet, queue.rowNumber, headerMap, 'Gmail Message ID', draft.getMessage().getId());
    setCell_(sheet, queue.rowNumber, headerMap, 'Thread ID', draft.getMessage().getThread().getId());
    setCell_(sheet, queue.rowNumber, headerMap, 'Last Error', '');
    logRun_('processQueueRow', 'OK', 0, 1, 0, 1, 0, 'Queue ID: ' + queue.queueId);
    return { ok: true, queueId: queue.queueId, sendStatus: 'Draft Created' };
  } catch (err) {
    const message = String(err && err.message ? err.message : err);
    setCell_(sheet, queue.rowNumber, headerMap, 'Send Status', 'Error');
    setCell_(sheet, queue.rowNumber, headerMap, 'Last Error', message);
    logRun_('processQueueRow', 'Error', 0, 1, 0, 0, 1, 'Queue ID: ' + queue.queueId + '; ' + message);
    return { ok: false, queueId: queue.queueId, sendStatus: 'Error', lastError: message };
  }
}

function completeTaskDone_(task, result, entityStatus, followUp) {
  completeAiStaffTask({
    taskId: task.taskId,
    status: 'Done',
    success: true,
    result: result,
    entityStatus: entityStatus || task.successStatus,
    evidenceLink: task.evidenceLink || '',
    followUp: followUp || {},
    ensureFollowUp: true
  });
  return { kind: 'task', id: task.taskId, status: 'Done', message: result };
}

function completeTaskBlocked_(task, status, result, entityStatus) {
  completeAiStaffTask({
    taskId: task.taskId,
    status: status || 'Blocked',
    success: false,
    result: result,
    lastError: result,
    entityStatus: entityStatus || task.failureStatus || 'Blocked - Task Runner Error',
    evidenceLink: task.evidenceLink || '',
    ensureFollowUp: true,
    followUp: {
      staff: 'AIstaff_Manager',
      reason: result,
      dueAt: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
      nextAction: 'Review blocked task and decide repair, reassignment, or closure.'
    }
  });
  return { kind: 'task', id: task.taskId, status: status || 'Blocked', message: result };
}

function completeTaskNeedsApproval_(task, status, result, entityStatus) {
  completeAiStaffTask({
    taskId: task.taskId,
    status: status || 'Needs Approval',
    success: false,
    result: result,
    lastError: '',
    entityStatus: entityStatus || task.failureStatus || 'Needs Human Review',
    evidenceLink: task.evidenceLink || '',
    ensureFollowUp: true,
    followUp: {
      staff: 'AIstaff_Manager',
      reason: result,
      dueAt: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
      nextAction: 'Review task needing approval and either approve, reassign, or close.'
    }
  });
  return { kind: 'task', id: task.taskId, status: status || 'Needs Approval', message: result };
}

function completeTaskCodexHandoff_(task, result, entityStatus) {
  const status = 'Waiting for Codex Worker';
  updateMappedRow_(task.sheet, task.rowNumber, task.headerMap, {
    'Status': status,
    'Last Error': '',
    'Result Notes': appendText_(task.resultNotes, result)
  });
  if (task.entityId) {
    updateAiStaffEntityStatus({
      entityId: task.entityId,
      status: entityStatus || 'Waiting for Codex Worker',
      user: task.assignedTo || 'AIstaff_Manager',
      reason: result,
      evidenceLink: task.evidenceLink || '',
      ensureFollowUp: true,
      followUp: {
        staff: task.assignedTo || 'AIstaff_Manager',
        reason: 'Codex Worker should execute the queued thinking/writing task.',
        dueAt: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
        nextAction: task.nextAction || 'Run the Codex-capable part of this task.'
      }
    });
  }
  appendAiStaffEvent_('Task Handed to Codex Worker', task.entityId, '', 'Task Status', task.status, status, task.assignedTo || 'AIstaff_Manager', result, task.evidenceLink || '');
  return { kind: 'task', id: task.taskId, status: status, message: result };
}

function markAiStaffTaskRunning_(task) {
  updateMappedRow_(task.sheet, task.rowNumber, task.headerMap, {
    'Status': 'Running',
    'Result Notes': appendText_(task.resultNotes, 'AI Staff task runner started.')
  });
  appendAiStaffEvent_('Task Started', task.entityId, '', 'Task Status', task.status, 'Running', task.assignedTo || 'AIstaff_Manager', 'AI Staff task runner started task.', task.evidenceLink || '');
}

function isSendApplicationPackageTask_(task) {
  const text = [task.taskTemplateId, task.assignedTo, task.taskType, task.nextAction].join(' ').toLowerCase();
  return text.indexOf('template_send_application_package') >= 0 || text.indexOf('applicationpacksender') >= 0;
}

function isCrmHealthTask_(task) {
  const text = [task.taskTemplateId, task.assignedTo, task.taskType, task.nextAction].join(' ').toLowerCase();
  return text.indexOf('template_run_crm_process_health') >= 0 || text.indexOf('crmcontroller') >= 0 || text.indexOf('crm health') >= 0;
}

function isReplyFollowUpTask_(task) {
  const text = [task.taskTemplateId, task.assignedTo, task.taskType, task.nextAction].join(' ').toLowerCase();
  return text.indexOf('template_check_reply_followup') >= 0 || text.indexOf('followupcontroller') >= 0 || text.indexOf('review reply') >= 0;
}

function findBestEmailQueueRowForTask_(task) {
  const rows = selectEmailQueueRows_();
  let fallback = null;
  for (let i = 0; i < rows.length; i++) {
    const queue = rows[i];
    const appMatch = idMatches_(queue.applicationId, task.relatedApplicationId);
    const oppMatch = idMatches_(queue.opportunityId, task.relatedOpportunityId);
    if (!appMatch && !oppMatch) continue;
    if (!fallback) fallback = queue;
    const status = String(queue.sendStatus || '').toUpperCase();
    if (!isFinalQueueSendStatus_(status) || status === 'SENT') return queue;
  }
  return fallback;
}

function findEmailQueueRowById_(queueId) {
  const rows = selectEmailQueueRows_();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].queueId || '') === String(queueId || '')) return rows[i];
  }
  return null;
}

function selectEmailQueueRows_() {
  const sheet = sheet_(BRIDGE.SEND_QUEUE);
  const values = readUsedRows_(sheet, SEND_QUEUE_HEADERS.length);
  if (values.length < 2) return [];
  const map = headerMap_(values[0]);
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    rows.push({
      sheet: sheet,
      rowNumber: r + 1,
      headerMap: map,
      rawRow: row,
      queueId: String(cell_(row, map, 'Queue ID') || ''),
      opportunityId: String(cell_(row, map, 'Opportunity ID') || ''),
      applicationId: String(cell_(row, map, 'ApplicationID') || ''),
      recipientType: String(cell_(row, map, 'Recipient Type') || ''),
      recipientName: String(cell_(row, map, 'Recipient Name') || ''),
      to: String(cell_(row, map, 'To') || ''),
      subject: String(cell_(row, map, 'Subject') || ''),
      sendMode: String(cell_(row, map, 'Send Mode') || ''),
      approvalStatus: String(cell_(row, map, 'Approval Status') || ''),
      sendStatus: String(cell_(row, map, 'Send Status') || ''),
      sentAt: cell_(row, map, 'Sent At'),
      lastError: String(cell_(row, map, 'Last Error') || '')
    });
  }
  return rows;
}

function isRunningAiStaffStatus_(status) {
  const normalized = String(status || '').toLowerCase().replace(/[_-]+/g, ' ').trim();
  return ['running', 'in progress', 'processing'].indexOf(normalized) >= 0;
}

function isAiStaffWorkStale_(item, now, staleMs) {
  const base = toDate_(item.completedAt) || toDate_(item.dueAt) || toDate_(item.runAfter) || toDate_(item.createdAt);
  if (!base) return false;
  return now.getTime() - base.getTime() >= staleMs;
}

function managerWorkWeight_(item) {
  return String(item.staff || '').toLowerCase() === 'aistaff_manager' ? 0 : 1;
}

function aiStaffPriorityWeight_(priority) {
  const text = String(priority || '').toLowerCase();
  if (text === 'critical' || text === 'urgent') return 0;
  if (text === 'high') return 1;
  if (text === 'medium') return 2;
  if (text === 'low') return 3;
  if (text === 'test') return 9;
  return 4;
}

function aiStaffWorkTime_(item, now) {
  const date = toDate_(item.dueAt) || toDate_(item.runAfter);
  return date ? date.getTime() : now.getTime();
}

function summarizeResult_(result) {
  if (!result) return 'skipped';
  try {
    return JSON.stringify(result).slice(0, 300);
  } catch (err) {
    return String(result).slice(0, 300);
  }
}

function auditEntitiesForMissingFollowUps_(issues, now) {
  const entities = selectAiStaffEntityRows_();
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    if (!entityRequiresFollowUp_(entity)) continue;
    if (activeAiStaffFollowUpsForEntity_(entity.entityId).length) continue;
    issues.push({
      type: 'Process Broken - No Active Follow-up',
      entityId: entity.entityId,
      responsibleStaff: entity.responsibleStaff,
      status: entity.currentStatus,
      stage: entity.currentStage
    });
  }
}

function auditOverdueTasks_(issues, now) {
  const tasks = selectAiStaffTaskRows_();
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (task.status.toLowerCase() !== 'queued') continue;
    if (!dateIsOverdue_(task.dueAt, now)) continue;
    issues.push({ type: 'Overdue Task', taskId: task.taskId, entityId: task.entityId, assignedTo: task.assignedTo, dueAt: task.dueAt });
  }
}

function auditOverdueFollowUps_(issues, now, escalationHours) {
  const followUps = selectAiStaffFollowUpRows_();
  const escalationMs = Number(escalationHours || AI_STAFF_FOLLOW_UP_ESCALATION_HOURS) * 60 * 60 * 1000;
  for (let i = 0; i < followUps.length; i++) {
    const followUp = followUps[i];
    if (!isTruthy_(followUp.active)) continue;
    const dueAt = toDate_(followUp.dueAt || followUp.runAfter);
    if (!dueAt || dueAt.getTime() >= now.getTime()) continue;
    const delayedHours = (now.getTime() - dueAt.getTime()) / (60 * 60 * 1000);
    issues.push({ type: 'Overdue Follow-up', followUpId: followUp.followUpId, entityId: followUp.entityId, staff: followUp.staff, dueAt: followUp.dueAt, delayedHours: delayedHours.toFixed(2) });
    if (now.getTime() - dueAt.getTime() <= escalationMs) continue;
    const entity = findAiStaffEntity_(followUp.entityId);
    if (!entityRequiresFollowUp_(entity)) continue;
    issues.push({
      type: 'Delayed Follow-up - Manager Action Required',
      followUpId: followUp.followUpId,
      entityId: followUp.entityId,
      responsibleStaff: entity.responsibleStaff,
      staff: followUp.staff,
      dueAt: followUp.dueAt,
      delayedHours: delayedHours.toFixed(2)
    });
    ensureManagerDelayedFollowUpTask_(entity, followUp, delayedHours);
  }
}

function ensureManagerDelayedFollowUpTask_(entity, followUp, delayedHours) {
  if (!entity || !followUp) return null;
  if (openAiStaffTaskExists_(entity.entityId, AI_STAFF_FOLLOW_UP_ESCALATION_TEMPLATE)) return null;
  return appendAiStaffTask({
    taskType: 'CRM Health',
    taskTemplateId: AI_STAFF_FOLLOW_UP_ESCALATION_TEMPLATE,
    assignedTo: 'AIstaff_Manager',
    createdBy: 'AIstaff_CRMController',
    entityId: entity.entityId,
    relatedOpportunityId: entity.relatedOpportunityId,
    relatedApplicationId: entity.relatedApplicationId,
    priority: 'Critical',
    runAfter: new Date(),
    dueAt: new Date(),
    status: 'Queued',
    nextAction: 'Review delayed follow-up ' + followUp.followUpId + ' for entity ' + entity.entityId + '. It is about ' + delayedHours.toFixed(1) + ' hours past due.',
    completionCriteria: 'Manager moves the entity forward, reassigns work, marks a blocker, or closes the entity with a clear event-log reason.',
    successStatus: 'Manager Guidance Completed',
    failureStatus: 'Process Broken - Follow-up Delayed',
    evidenceLink: followUp.evidenceLink || '',
    resultNotes: 'Auto-created by process health audit because an active follow-up exceeded the 3-hour delay threshold.'
  });
}

function openAiStaffTaskExists_(entityId, templateId) {
  const tasks = selectAiStaffTaskRows_();
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    if (task.entityId !== entityId || task.taskTemplateId !== templateId) continue;
    const status = task.status.toLowerCase();
    if (['done', 'closed', 'cancelled'].indexOf(status) < 0) return true;
  }
  return false;
}

function auditBlockedAndStaleEntities_(issues, now, staleDays) {
  const entities = selectAiStaffEntityRows_();
  const eventEntityIds = eventEntityIdSet_();
  const staleMs = staleDays * 24 * 60 * 60 * 1000;
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const status = entity.currentStatus.toLowerCase();
    if (status.indexOf('blocked') >= 0 || status.indexOf('needs human review') >= 0) {
      issues.push({ type: 'Blocked Entity', entityId: entity.entityId, status: entity.currentStatus, responsibleStaff: entity.responsibleStaff });
    }
    const updated = toDate_(entity.lastUpdated);
    if (updated && now.getTime() - updated.getTime() > staleMs && !isAiStaffTerminalStatus_(entity.currentStatus)) {
      issues.push({ type: 'Stale Entity', entityId: entity.entityId, lastUpdated: entity.lastUpdated, status: entity.currentStatus });
    }
    if (!eventEntityIds[entity.entityId]) {
      issues.push({ type: 'Missing Event Log', entityId: entity.entityId, status: entity.currentStatus });
    }
  }
}

function eventEntityIdSet_() {
  const sheet = sheet_(BRIDGE.AI_STAFF_EVENT_LOG);
  const values = readUsedRows_(sheet, AI_STAFF_EVENT_LOG_HEADERS.length);
  if (values.length < 2) return {};
  const map = headerMap_(values[0]);
  const ids = {};
  for (let r = 1; r < values.length; r++) {
    const entityId = String(cell_(values[r], map, 'EntityID') || '');
    if (entityId) ids[entityId] = true;
  }
  return ids;
}

function appendAiStaffEvent_(event, entityId, entityType, field, before, after, user, reason, evidenceLink) {
  ensureAiStaffSheets_();
  const row = {
    'UUID': Utilities.getUuid(),
    'Event': event || '',
    'EntityID': entityId || '',
    'Entity Type': entityType || '',
    'Field': field || '',
    'Before': before === undefined ? '' : before,
    'After': after === undefined ? '' : after,
    'User/Staff': user || 'AIstaff_Manager',
    'DateTime': new Date(),
    'Reason': reason || '',
    'Evidence Link': evidenceLink || ''
  };
  appendMappedRow_(sheet_(BRIDGE.AI_STAFF_EVENT_LOG), AI_STAFF_EVENT_LOG_HEADERS, row);
}

function appendMappedRow_(sheet, headers, record) {
  const row = headers.map(function(header) { return record[header] === undefined ? '' : record[header]; });
  sheet.appendRow(row);
}

function upsertMappedRow_(sheet, headers, keyHeader, keyValue, record) {
  const values = readUsedRows_(sheet, headers.length);
  const map = values.length ? headerMap_(values[0]) : headerMap_(headers);
  const keyIndex = map[keyHeader];
  if (keyIndex !== undefined) {
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][keyIndex] || '') === String(keyValue || '')) {
        sheet.getRange(r + 1, 1, 1, headers.length).setValues([headers.map(function(header) {
          return record[header] === undefined ? '' : record[header];
        })]);
        return { ok: true, updated: true };
      }
    }
  }
  appendMappedRow_(sheet, headers, record);
  return { ok: true, added: true };
}

function updateMappedRow_(sheet, rowNumber, headerMap, updates) {
  Object.keys(updates).forEach(function(header) {
    if (headerMap[header] === undefined) return;
    sheet.getRange(rowNumber, headerMap[header] + 1).setValue(updates[header]);
  });
}

function rowObject_(row, map, headers) {
  const obj = {};
  for (let i = 0; i < headers.length; i++) {
    obj[headers[i]] = cell_(row, map, headers[i]);
  }
  return obj;
}

function dateIsDue_(value, now) {
  if (!value) return true;
  const date = toDate_(value);
  if (!date) return true;
  return date.getTime() <= now.getTime();
}

function dateIsOverdue_(value, now) {
  if (!value) return false;
  const date = toDate_(value);
  if (!date) return false;
  return date.getTime() < now.getTime();
}

function toDate_(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (String(date) === 'Invalid Date') return null;
  return date;
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const current = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  let needsHeader = false;
  for (let i = 0; i < headers.length; i++) {
    if (current[i] !== headers[i]) needsHeader = true;
  }
  if (needsHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function ensureDefaultConfig_() {
  const defaults = {
    SPREADSHEET_ID: [BRIDGE.SPREADSHEET_ID, 'Swiss Planner workbook used by the Apps Script bridge.'],
    SENT_SYNC_MODE: ['MATCHED_ONLY', 'Privacy mode. MATCHED_ONLY logs only university/application-related sent emails; ALL_SINCE_DATE logs all sent mail since SENT_SYNC_START_DATE.'],
    SENT_SYNC_START_DATE: ['2026/04/01', 'Start date for sent-mail sync in Gmail search format yyyy/mm/dd.'],
    SENT_SEARCH_DAYS_BACK: ['365', 'Fallback only if SENT_SYNC_START_DATE is blank. Existing message IDs are deduped.'],
    MAX_SENT_MESSAGES_PER_SYNC: ['200', 'Safety cap per run to avoid Apps Script/Gmail quotas.'],
    INBOUND_SYNC_MODE: ['MATCHED_ONLY', 'Privacy mode. MATCHED_ONLY logs only replies from university/application targets or threads already present in Gmail Sent Log.'],
    INBOUND_SYNC_START_DATE: ['2026/04/01', 'Start date for inbound-reply sync in Gmail search format yyyy/mm/dd.'],
    MAX_INBOUND_MESSAGES_PER_SYNC: ['200', 'Safety cap per run to avoid Apps Script/Gmail quotas.'],
    ATTACHMENT_TEST_QUEUE_ID: ['', 'Optional queue ID for testAttachmentAccess(). Leave blank to test only approved queue rows with attachments.'],
    PACKAGE_TEST_PACKAGE_ID: ['', 'Optional Package ID used by no-argument configured package test functions. Leave blank to check all package rows where supported.'],
    PACKAGE_TEST_APPLICATION_ID: ['app_agh_drilling_knez_2026', 'ApplicationID used by validateConfiguredPackageCompleteness().'],
    PACKAGE_TEST_OPPORTUNITY_ID: ['opp_agh_drilling_knez_2026', 'Opportunity ID used by validateConfiguredPackageCompleteness().'],
    DRIVE_PARENT_FOLDER_ID: [BRIDGE.DEFAULT_DRIVE_PARENT_FOLDER_ID, 'Shared Drive parent folder for application package folders. The Apps Script account must have editor access.'],
    DRIVE_PARENT_FOLDER_URL: ['https://drive.google.com/drive/folders/' + BRIDGE.DEFAULT_DRIVE_PARENT_FOLDER_ID, 'Parent folder URL for package folders and package index documents.'],
    DRIVE_PREPARED_PACKAGES_FOLDER_ID: [BRIDGE.DEFAULT_PREPARED_PACKAGES_FOLDER_ID, 'Existing prepared-package archive: 10. Swiss Planner Applications. Use for already prepared packages and historical package links.'],
    DRIVE_PREPARED_PACKAGES_FOLDER_URL: ['https://drive.google.com/drive/folders/' + BRIDGE.DEFAULT_PREPARED_PACKAGES_FOLDER_ID, 'Prepared-package archive URL.'],
    DRIVE_PACKAGE_RULE: ['Mother/applicant root is 115. NJ_Switzerland; prepared packages live under 10. Swiss Planner Applications. Any external-send attachment must be copied/verified in the Package Files tab first.', 'Prevents attachment failure when files are created under a different Google account or root.'],
    ENFORCE_PACKAGE_COMPLETENESS: ['TRUE', 'When TRUE, external supervisor/university emails are blocked until required package files exist and are verified.'],
    ALLOW_FIT_INQUIRY_WITHOUT_ATTACHMENTS: ['TRUE', 'When TRUE, rows whose notes/body/subject say No Attachment Required or Fit Inquiry may send without package attachments.'],
    AUTO_ATTACH_PACKAGE_FILES: ['TRUE', 'When TRUE, approved queue rows with blank Attachment Drive URLs receive verified package file URLs automatically.'],
    AUTO_RECONCILE_INBOUND_REPLIES: ['TRUE', 'When TRUE, syncInboundReplies updates Outreach Queue/Application statuses after logging replies.'],
    AUTO_APPROVE_QUEUE_ROWS: ['TRUE', 'When TRUE, queue rows are auto-approved unless they repeat a professor/supervisor recipient.'],
    AUTO_APPROVE_APPROVED_BY: ['Swiss Planner AI Staff', 'Value written into Approved By for automatic queue approvals.'],
    DEFAULT_SEND_MODE: ['CREATE_DRAFT', 'CREATE_DRAFT is safest. SEND_NOW only sends approved queue rows.'],
    AUTO_PROCESS_APPROVED_QUEUE: ['FALSE', 'When TRUE, scheduled staff may call processQueue for already-approved rows. processQueue still verifies packages and attachments before sending.'],
    AI_STAFF_TASK_RUNNER_STALE_HOURS: ['3', 'Running/In Progress AI Staff tasks or follow-ups older than this are reset to Queued by runAiStaffTaskRunner.'],
    AI_STAFF_TASK_RUNNER_MAX_ITEMS: ['1', 'Maximum due AI Staff tasks/follow-ups processed per runAiStaffTaskRunner call. Keep 1 for safe one-at-a-time execution.'],
    APPROVAL_POLICY: ['Only rows with Approval Status = Approved may be processed.', 'Third-party emails remain approval-gated.'],
    SENDER_ALIASES: ['', 'Optional comma-separated email aliases if sent messages are not recognized as yours.'],
    WEBHOOK_URL: [BRIDGE.CURRENT_WEBHOOK_URL, 'Current Apps Script web app deployment URL. Prefer the Email Bridge Config value as the source of truth after deployment.'],
    WEBHOOK_TOKEN: ['', 'Optional mirror of the Script Properties token. Prefer Script Properties for security.']
  };
  for (const key in defaults) {
    if (!getConfig_(key)) setConfig_(key, defaults[key][0], defaults[key][1]);
  }
}

function ensureWebhookToken_() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('WEBHOOK_TOKEN')) {
    props.setProperty('WEBHOOK_TOKEN', Utilities.getUuid() + '-' + Utilities.getUuid());
  }
}

function requireValidToken_(token) {
  const scriptToken = PropertiesService.getScriptProperties().getProperty('WEBHOOK_TOKEN');
  const sheetToken = getConfig_('WEBHOOK_TOKEN');
  if (!scriptToken && !sheetToken) throw new Error('Webhook token is not configured. Run setupBridge().');
  if (token !== scriptToken && token !== sheetToken) throw new Error('Invalid webhook token.');
}

function getConfig_(key) {
  const sheet = sheet_(BRIDGE.CONFIG);
  if (!sheet || sheet.getLastRow() < 2) return '';
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === key) return values[i][1];
  }
  return '';
}

function setConfig_(key, value, notes) {
  const sheet = sheet_(BRIDGE.CONFIG);
  const lastRow = Math.max(sheet.getLastRow(), 1);
  const values = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, 1).getValues() : [];
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === key) {
      sheet.getRange(i + 2, 2, 1, 3).setValues([[value, notes || sheet.getRange(i + 2, 3).getValue(), new Date()]]);
      return;
    }
  }
  sheet.appendRow([key, value, notes || '', new Date()]);
}

function getExistingMessageIds_(sheet) {
  const ids = {};
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return ids;
  const values = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (values[i][0]) ids[String(values[i][0])] = true;
  }
  return ids;
}

function buildSentSearchPlan_() {
  const mode = String(getConfig_('SENT_SYNC_MODE') || 'MATCHED_ONLY').toUpperCase();
  const baseQuery = sentDateQuery_();

  if (mode === 'ALL_SINCE_DATE') {
    return {
      mode: mode,
      queries: [baseQuery],
      logMatchedOnly: false
    };
  }

  const terms = targetSearchTerms_();
  return {
    mode: 'MATCHED_ONLY',
    queries: buildTargetedSentQueries_(baseQuery, terms),
    logMatchedOnly: true
  };
}

function buildInboundSearchPlan_() {
  const mode = String(getConfig_('INBOUND_SYNC_MODE') || 'MATCHED_ONLY').toUpperCase();
  const baseQuery = inboundDateQuery_();

  if (mode === 'ALL_SINCE_DATE') {
    return {
      mode: mode,
      queries: [baseQuery],
      logMatchedOnly: false
    };
  }

  const terms = targetSearchTerms_();
  return {
    mode: 'MATCHED_ONLY',
    queries: buildTargetedInboundQueries_(baseQuery, terms),
    logMatchedOnly: true
  };
}

function sentDateQuery_() {
  const startDate = normalizeGmailDate_(getConfig_('SENT_SYNC_START_DATE'));
  if (startDate) return 'in:sent after:' + startDate;
  const daysBack = Number(getConfig_('SENT_SEARCH_DAYS_BACK') || 365);
  return 'in:sent newer_than:' + daysBack + 'd';
}

function inboundDateQuery_() {
  const startDate = normalizeGmailDate_(getConfig_('INBOUND_SYNC_START_DATE') || getConfig_('SENT_SYNC_START_DATE'));
  if (startDate) return 'after:' + startDate;
  const daysBack = Number(getConfig_('SENT_SEARCH_DAYS_BACK') || 365);
  return 'newer_than:' + daysBack + 'd';
}

function normalizeGmailDate_(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const match = text.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (!match) return text;
  const yyyy = match[1];
  const mm = ('0' + match[2]).slice(-2);
  const dd = ('0' + match[3]).slice(-2);
  return yyyy + '/' + mm + '/' + dd;
}

function targetSearchTerms_() {
  const terms = {};
  UNIVERSITY_RULES.forEach(function(rule) {
    rule.terms.forEach(function(term) {
      const cleaned = String(term || '').trim();
      if (!cleaned) return;
      if (cleaned.indexOf(' ') >= 0) return;
      terms[cleaned] = true;
    });
  });
  return Object.keys(terms).sort();
}

function buildTargetedSentQueries_(baseQuery, terms) {
  if (!terms.length) return [baseQuery];
  const queries = [];
  const chunkSize = 16;
  for (let i = 0; i < terms.length; i += chunkSize) {
    const chunk = terms.slice(i, i + chunkSize);
    queries.push(baseQuery + ' {' + chunk.join(' ') + '}');
  }
  return queries;
}

function buildTargetedInboundQueries_(baseQuery, terms) {
  if (!terms.length) return [baseQuery];
  const queries = [];
  const chunkSize = 16;
  for (let i = 0; i < terms.length; i += chunkSize) {
    const chunk = terms.slice(i, i + chunkSize);
    queries.push(baseQuery + ' {' + chunk.join(' ') + '}');
  }
  return queries;
}

function buildSentThreadIndex_() {
  const index = {};
  const sentSheet = sheet_(BRIDGE.SENT_LOG);
  const values = readUsedRows_(sentSheet, SENT_LOG_HEADERS.length);
  if (values.length < 2) return index;
  const map = headerMap_(values[0]);
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const threadId = cell_(row, map, 'Thread ID');
    if (!threadId) continue;
    index[String(threadId)] = {
      threadId: String(threadId),
      messageId: cell_(row, map, 'Gmail Message ID'),
      university: cell_(row, map, 'Matched University'),
      opportunityId: cell_(row, map, 'Matched Opportunity ID'),
      applicationId: cell_(row, map, 'Matched Application ID')
    };
  }
  return index;
}

function getSenderEmail_() {
  return Session.getEffectiveUser().getEmail() || '';
}

function isSentByMe_(message, senderEmail) {
  const from = String(message.getFrom() || '').toLowerCase();
  const aliases = String(getConfig_('SENDER_ALIASES') || '').toLowerCase().split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  if (senderEmail && from.indexOf(String(senderEmail).toLowerCase()) >= 0) return true;
  for (let i = 0; i < aliases.length; i++) {
    if (from.indexOf(aliases[i]) >= 0) return true;
  }
  return from.indexOf('iman') >= 0;
}

function safePlainBody_(message) {
  try {
    return String(message.getPlainBody() || '').replace(/\s+/g, ' ').trim();
  } catch (err) {
    return '';
  }
}

function attachmentSummary_(message) {
  try {
    const attachments = message.getAttachments();
    return attachments.map(function(a) {
      return a.getName() + ' (' + a.getContentType() + ')';
    }).join('; ');
  } catch (err) {
    return '';
  }
}

function labelSummary_(message) {
  try {
    return message.getThread().getLabels().map(function(label) {
      return label.getName();
    }).join('; ');
  } catch (err) {
    return '';
  }
}

function matchUniversity_(message, body) {
  const haystack = [
    message.getTo(), message.getCc(), message.getBcc(), message.getSubject(), body
  ].join(' ').toLowerCase();
  for (let i = 0; i < UNIVERSITY_RULES.length; i++) {
    const rule = UNIVERSITY_RULES[i];
    for (let j = 0; j < rule.terms.length; j++) {
      if (haystack.indexOf(rule.terms[j].toLowerCase()) >= 0) {
        return { name: rule.name, opportunityId: rule.opportunityId, applicationId: rule.applicationId };
      }
    }
  }
  return { name: '', opportunityId: '', applicationId: '' };
}

function headerMap_(headers) {
  const map = {};
  for (let i = 0; i < headers.length; i++) map[headers[i]] = i;
  return map;
}

function cell_(row, headerMap, header) {
  const index = headerMap[header];
  return index === undefined ? '' : row[index];
}

function setCell_(sheet, rowNumber, headerMap, header, value) {
  const index = headerMap[header];
  if (index === undefined) return;
  sheet.getRange(rowNumber, index + 1).setValue(value);
}

function isDue_(value) {
  if (!value) return true;
  const date = value instanceof Date ? value : new Date(value);
  if (String(date) === 'Invalid Date') return true;
  return date.getTime() <= new Date().getTime();
}

function buildMailOptions_(row, headerMap) {
  const options = { name: 'Iman Najafi' };
  const cc = cell_(row, headerMap, 'CC');
  const bcc = cell_(row, headerMap, 'BCC');
  if (cc) options.cc = cc;
  if (bcc) options.bcc = bcc;
  const attachmentUrls = cell_(row, headerMap, 'Attachment Drive URLs');
  const attachments = getDriveBlobsFromUrls_(attachmentUrls);
  if (attachments.length) options.attachments = attachments;
  return options;
}

function getDriveBlobsFromUrls_(value) {
  if (!value) return [];
  const chunks = String(value).split(/[\n;,]+/).map(function(s) { return s.trim(); }).filter(Boolean);
  const blobs = [];
  const failures = [];
  for (let i = 0; i < chunks.length; i++) {
    const id = extractDriveId_(chunks[i]);
    if (!id) {
      failures.push('Could not extract a Drive file ID from: ' + chunks[i]);
      continue;
    }
    try {
      const file = DriveApp.getFileById(id);
      let blob;
      if (file.getMimeType().indexOf('application/vnd.google-apps') === 0) {
        blob = file.getAs(MimeType.PDF).setName(file.getName() + '.pdf');
      } else {
        blob = file.getBlob().setName(file.getName());
      }
      blobs.push(blob);
    } catch (err) {
      failures.push('Cannot attach Drive file ' + id + ': ' + String(err && err.message ? err.message : err));
    }
  }
  if (failures.length) {
    throw new Error('Attachment check failed. No email was sent. ' + failures.join(' | '));
  }
  if (chunks.length && blobs.length !== chunks.length) {
    throw new Error('Attachment check failed. Expected ' + chunks.length + ' attachment(s), prepared ' + blobs.length + '. No email was sent.');
  }
  return blobs;
}

function extractDriveId_(url) {
  const text = String(url || '');
  let match = text.match(/\/d\/([A-Za-z0-9_-]{20,})/);
  if (match) return match[1];
  match = text.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  if (match) return match[1];
  match = text.match(/([A-Za-z0-9_-]{25,})/);
  return match ? match[1] : '';
}

function logRun_(action, status, rowsAdded, rowsProcessed, messagesSent, draftsCreated, errors, notes) {
  const ss = workbook_();
  const sheet = ss.getSheetByName(BRIDGE.RUNS) || ss.insertSheet(BRIDGE.RUNS);
  if (sheet.getLastRow() === 0) sheet.appendRow(RUN_HEADERS);
  sheet.appendRow([
    Utilities.getUuid(),
    new Date(),
    action,
    status,
    rowsAdded || 0,
    rowsProcessed || 0,
    messagesSent || 0,
    draftsCreated || 0,
    errors || 0,
    notes || ''
  ]);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function workbook_() {
  return SpreadsheetApp.openById(BRIDGE.SPREADSHEET_ID);
}

function sheet_(name) {
  const sheet = workbook_().getSheetByName(name);
  if (!sheet) throw new Error('Missing required sheet tab: ' + name);
  return sheet;
}

function readUsedRows_(sheet, columnCount) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];
  return sheet.getRange(1, 1, lastRow, columnCount).getValues();
}

function readAllRows_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  if (lastRow < 1) return [];
  return sheet.getRange(1, 1, lastRow, lastColumn).getValues();
}

