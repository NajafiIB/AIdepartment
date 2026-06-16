/* global React, ReactDOM */
const h = React.createElement;
const { Children, Fragment, cloneElement, useEffect, useMemo, useState } = React;

const APP_NAME = "GCC lab AI department";
const APP_SHORT_NAME = "GCC lab";
const APP_MARK = "GC";
const HUMAN_STAFF_ID = "Human_Iman";

const STAFF_ORDER = [
  HUMAN_STAFF_ID,
  "AIstaff_Manager",
  "AIstaff_OpportunityHunter",
  "AIstaff_FitAnalyst",
  "AIstaff_ProfessorResearchAnalyst",
  "AIstaff_ApplicationPackMaker",
  "AIstaff_ApplicationPackSender",
  "AIstaff_FollowUpController",
  "AIstaff_CRMController",
];

const STAFF_PROFILE_STORAGE_KEY = "swissPlannerStaffProfiles.v1";

const FABRIC_NOTE_SECTIONS = [
  ["workMap", "Work Map"],
  ["lanesTools", "Lanes & Tools"],
  ["qualityGates", "Quality Gates"],
  ["dataConnectors", "Data & Connectors"],
  ["aiBrain", "AI Brain"],
  ["outputTemplates", "Output Templates"],
  ["learningLibrary", "Learning Library"],
];

const UI_FACES_ABSTRACT_AVATARS = [
  "https://mockmind-api.uifaces.co/content/abstract/51.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/50.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/49.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/48.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/47.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/46.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/45.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/44.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/43.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/42.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/41.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/40.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/39.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/38.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/37.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/36.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/35.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/34.jpg",
  "https://mockmind-api.uifaces.co/content/abstract/33.jpg",
];

const UI_FACES_HUMAN_AVATARS = [
  "https://mockmind-api.uifaces.co/content/human/80.jpg",
  "https://mockmind-api.uifaces.co/content/human/219.jpg",
  "https://mockmind-api.uifaces.co/content/human/222.jpg",
  "https://mockmind-api.uifaces.co/content/human/92.jpg",
  "https://mockmind-api.uifaces.co/content/human/125.jpg",
  "https://mockmind-api.uifaces.co/content/human/128.jpg",
  "https://mockmind-api.uifaces.co/content/human/108.jpg",
  "https://mockmind-api.uifaces.co/content/human/104.jpg",
  "https://mockmind-api.uifaces.co/content/human/91.jpg",
  "https://mockmind-api.uifaces.co/content/human/217.jpg",
  "https://mockmind-api.uifaces.co/content/human/218.jpg",
  "https://mockmind-api.uifaces.co/content/human/97.jpg",
  "https://mockmind-api.uifaces.co/content/human/213.jpg",
  "https://mockmind-api.uifaces.co/content/human/210.jpg",
  "https://mockmind-api.uifaces.co/content/human/196.jpg",
  "https://mockmind-api.uifaces.co/content/human/212.jpg",
  "https://mockmind-api.uifaces.co/content/human/221.jpg",
  "https://mockmind-api.uifaces.co/content/human/216.jpg",
  "https://mockmind-api.uifaces.co/content/human/209.jpg",
  "https://mockmind-api.uifaces.co/content/human/99.jpg",
  "https://mockmind-api.uifaces.co/content/human/124.jpg",
  "https://mockmind-api.uifaces.co/content/human/102.jpg",
  "https://mockmind-api.uifaces.co/content/human/195.jpg",
  "https://mockmind-api.uifaces.co/content/human/215.jpg",
];

const DEFAULT_STAFF_ALIASES = {
  AIstaff_Manager: "Alex",
  AIstaff_OpportunityHunter: "Ava",
  AIstaff_FitAnalyst: "Leo",
  AIstaff_ProfessorResearchAnalyst: "Nadia",
  AIstaff_ApplicationPackMaker: "Maya",
  AIstaff_ApplicationPackSender: "Omar",
  AIstaff_FollowUpController: "Lina",
  AIstaff_CRMController: "Noah",
};

const APPLICATION_STAGES = [
  "Lead Received",
  "Tender Docs Reviewed",
  "Fit / Eligibility Checked",
  "Supplier Match Needed",
  "Quotation Requested",
  "Tender Package In Progress",
  "Tender Package Ready",
  "Submitted / Waiting",
];

const NAV_ITEMS = [
  ["overview", "Overview"],
  ["wikis", "Wikis"],
  ["platform-admin", "Platform Admin"],
  ["explorer", "Department Explorer"],
  ["applications", "Leads"],
  ["work", "Tasks"],
  ["email", "Email Alpha"],
  ["reports", "Reports"],
  ["settings", "Settings"],
];
const NAV_KEYS = NAV_ITEMS.map(([key]) => key);

function initialViewFromHash() {
  const hash = String(window.location.hash || "").replace(/^#/, "");
  return NAV_KEYS.includes(hash) ? hash : "overview";
}

const NAV_ICONS = {
  overview: "chart",
  wikis: "book",
  "platform-admin": "database",
  explorer: "user",
  applications: "file",
  work: "send",
  email: "mail",
  reports: "database",
  settings: "shield",
};

const TASK_CATEGORIES = [
  "Human Decision",
  "Manager Guidance",
  "System Audit",
  "Technical Bug",
  "Outreach Safety",
  "Tender Work",
  "Research Work",
];

const STAFF_TOOL_CATALOG = [
  { id: "local_task_threads", label: "Local Task Threads", locked: true, description: "Local-first task and conversation memory." },
  { id: "event_log", label: "Event Log", locked: true, description: "Required audit trail for important changes." },
  { id: "manager_routing", label: "Manager Routing", locked: true, description: "Specialists route human-facing questions through AI Manager." },
  { id: "google_sheet_crm", label: "Google Sheet CRM", description: `${APP_NAME} workbook records and status tables.` },
  { id: "google_drive_packages", label: "Tender Files", description: "Lead files, tender PDFs, forms, specs, quotations, and package documents." },
  { id: "gmail_bridge", label: "Supplier Outreach", description: "Quotation requests, supplier replies, and communication safety." },
  { id: "official_web_sources", label: "Official Web Sources", description: "Tender portals, vendor registries, and supplier evidence." },
  { id: "google_scholar_public_pages", label: "Vendor Registries", description: "Verified vendor lists and supplier qualification evidence." },
  { id: "linkedin_lead_search", label: "LinkedIn Supplier Search", description: "Supplier discovery source only; official evidence still required." },
  { id: "codex_worker", label: "Codex Worker", description: "Tender document review, supplier research, and package production." },
  { id: "openai_api", label: "OpenAI Brain", description: "Low-cost Manager interpretation and routing." },
];

const SETTINGS_SOLUTIONS = [
  {
    id: "solution_swiss_planner_apply_department",
    name: APP_NAME,
    status: "Active",
    owner: "AIstaff_Manager",
    purpose: "Review tender leads, read tender documents, match suppliers or partners, request quotations, and prepare tender submission packages.",
    source: "Local Command Center, GCClab CRM, Lead, Companies, Contacts, Tasks List, LeadMatchedSuppliers, LeadMatchedProducts, and transferred tender files.",
    operatingRule: "Every request, blocker, approval, audit issue, and staff question becomes a Task with a Thread.",
  },
];

const SETTINGS_RECIPES = [
  {
    name: "Tender Lead Review",
    skill: "swiss-planner-research",
    owner: "AIstaff_OpportunityHunter",
    output: "Lead case brief, tender requirement matrix, deadline map, and missing-file blockers.",
    guardrail: "Tender facts must cite the Lead record, transferred files, portal source, or official evidence.",
  },
  {
    name: "Fit And Supplier Match",
    skill: "swiss-planner-staff",
    owner: "AIstaff_FitAnalyst",
    output: "GCC lab fit score, bid/no-bid recommendation, and supplier/partner route.",
    guardrail: "Do not promote a case without compliance, capability, supplier/partner, and deadline checks.",
  },
  {
    name: "Supplier Discovery",
    skill: "swiss-planner-research",
    owner: "AIstaff_ProfessorResearchAnalyst",
    output: "New supplier candidates, contact map, evidence links, and confidence notes.",
    guardrail: "Use official company/vendor evidence before recommending a new supplier.",
  },
  {
    name: "Tender Package",
    skill: "swiss-planner-apply",
    owner: "AIstaff_ApplicationPackMaker",
    output: "Compliance matrix, tender forms, technical response, commercial summary, quotation evidence, and checklist.",
    guardrail: "Use tender-owner forms and GCC lab templates; keep missing quote/document blockers explicit.",
  },
  {
    name: "Supplier Quotation Outreach",
    skill: "swiss-planner-apply + Gmail Bridge",
    owner: "AIstaff_ApplicationPackSender",
    output: "Supplier interest status, quotation request log, price list, or clear blocked reason.",
    guardrail: "No supplier outreach without approval, content safety, and clear tender scope.",
  },
  {
    name: "Supplier And Tender Follow-up",
    skill: "swiss-planner-staff + Gmail Bridge",
    owner: "AIstaff_FollowUpController",
    output: "Supplier reply status, quote follow-up task, Q&A reminder, or submission-status update.",
    guardrail: "Every waiting supplier/client/tender-owner action needs a due follow-up.",
  },
  {
    name: "CRM Health",
    skill: "swiss-planner-staff",
    owner: "AIstaff_CRMController",
    output: "Sync state, process audit, blocker list, event trail, and stale-work detection.",
    guardrail: "Do not delete rows, package files, or event logs during normal operations.",
  },
];

const SETTINGS_STAGES = [
  {
    staff: "AIstaff_Manager",
    stages: ["Intake", "Triage", "Delegate", "Escalate To Human", "Close Or Learn"],
    purpose: "Owns the operating system, routes staff questions, and asks Iman only when the team cannot safely decide.",
  },
  {
    staff: "AIstaff_OpportunityHunter",
    stages: ["Lead Intake", "Tender File Check", "Requirement Extraction", "Deadline Map", "Manager Handoff"],
    purpose: "Reads Lead details, tender documents, scope, eligibility clauses, deadlines, and first blockers.",
  },
  {
    staff: "AIstaff_FitAnalyst",
    stages: ["Capability Fit", "Compliance Check", "Supplier Search", "Partner Route", "Bid / No-Bid"],
    purpose: "Decides whether GCC lab can bid directly, needs a partner, needs suppliers, or should close the lead.",
  },
  {
    staff: "AIstaff_ProfessorResearchAnalyst",
    stages: ["Supplier Gap", "Market Search", "Vendor Evidence", "Contact Map", "Supplier Brief"],
    purpose: "Finds ideal suppliers when the existing GCC lab supplier database is not enough.",
  },
  {
    staff: "AIstaff_ApplicationPackMaker",
    stages: ["Inputs Check", "Compliance Matrix", "Technical Response", "Commercial Summary", "Ready For Submission"],
    purpose: "Creates tender response material, required forms, supplier quote evidence, and submission checklist.",
  },
  {
    staff: "AIstaff_ApplicationPackSender",
    stages: ["Supplier Selection", "Approval Check", "Content Safety", "Quotation Request", "Quote Collection"],
    purpose: "Handles approved supplier quotation requests and captures pricing, delivery terms, and interest.",
  },
  {
    staff: "AIstaff_FollowUpController",
    stages: ["Check Replies", "Match Lead", "Review Waiting Quotes", "Create Follow-up", "Close Or Escalate"],
    purpose: "Keeps supplier replies, Q&A deadlines, quotation gaps, and tender-owner responses moving.",
  },
  {
    staff: "AIstaff_CRMController",
    stages: ["Local Sync", "Lead Audit", "Supplier Match Audit", "Create System Tasks", "Report"],
    purpose: "Keeps Lead, Companies, Contacts, Tasks List, supplier matches, local threads, and event trail healthy.",
  },
];

const SETTINGS_LANES = [
  {
    name: "GCClab CRM Lane",
    agent: "CRM Data Agent",
    owner: "AIstaff_CRMController",
    connectors: "AppSheet structure, GCClab CRM tables, local SQLite queue.",
    data: "Lead, Companies, Contacts, Tasks List, LeadMatchedSuppliers, LeadMatchedProducts, Products_Registered, Orders.",
    model: "Low or medium reasoning for audits; high reasoning for process diagnosis.",
    guardrail: "Every important status change should leave an event-log trail.",
  },
  {
    name: "Tender Files Lane",
    agent: "Tender File Agent",
    owner: "AIstaff_ApplicationPackMaker",
    connectors: "Transferred Lead files, Docs, PDFs, local package folders.",
    data: "Tender PDFs, BOQs, forms, specs, addenda, supplier quotations, compliance matrix, submission package.",
    model: "High reasoning for tender document analysis and package writing; low reasoning for file checks.",
    guardrail: "Tender package cannot be ready while required forms, quote evidence, or compliance items are missing.",
  },
  {
    name: "Supplier Outreach Lane",
    agent: "Quotation Outreach Agent",
    owner: "AIstaff_ApplicationPackSender",
    connectors: "Approved email/outreach channel, Contacts, EmailsLog, supplier evidence.",
    data: "Supplier quotation requests, supplier replies, price lists, delivery terms, exclusions, validity.",
    model: "Low reasoning for verification; high reasoning when reviewing supplier/content risk.",
    guardrail: "Never contact suppliers unless tender scope, approval, and content safety are clear.",
  },
  {
    name: "Supplier Evidence Lane",
    agent: "Supplier Evidence Agent",
    owner: "AIstaff_OpportunityHunter",
    connectors: "Tender portals, supplier websites, vendor registries, LinkedIn as discovery source.",
    data: "Companies, Contacts, vendor evidence, qualification notes, supplier candidate notes.",
    model: "High reasoning for supplier fit; official evidence required before recommendation.",
    guardrail: "No new supplier recommendation without source evidence that Iman can inspect.",
  },
  {
    name: "Local Command Lane",
    agent: "Local Worker Agent",
    owner: "AIstaff_Manager",
    connectors: "Local Python server, SQLite, PowerShell launchers, Codex worker handoff.",
    data: "Task threads, wake-ups, local pending actions, dashboard state.",
    model: "Medium reasoning for routing; high reasoning for technical blockers.",
    guardrail: "Live threads stay local until closed; thread replies never send email by themselves.",
  },
];

const UNIVERSITY_REFERENCES = {
  crm: {
    key: "crm",
    name: "GCClab CRM Lead",
    city: "",
    country: "",
    type: "Lead table",
    website: "",
    doctoral: "",
    focus: "Lead records transferred from Blue Mark Business Sphere with tender scope, dates, responsible staff, contacts, and files.",
    fit: "Primary source for tender intake. Ava starts here before reading transferred files.",
  },
  portal: {
    key: "portal",
    name: "Tender Portal",
    city: "",
    country: "",
    type: "Official tender source",
    website: "",
    doctoral: "",
    focus: "Public or private tender pages, RFQ/RFP/PQ/SOI sources, addenda, Q&A pages, and closing-date evidence.",
    fit: "Used to verify deadlines, requirements, submission rules, and official document versions.",
  },
  supplier: {
    key: "supplier",
    name: "Supplier / Partner Source",
    city: "",
    country: "",
    type: "Companies and Contacts",
    website: "",
    doctoral: "",
    focus: "Supplier, active supplier, client, partner, verified vendor, and contact records from Companies and Contacts.",
    fit: "Used by Leo, Nadia, Omar, and Lina for supplier matching, quotation requests, and follow-up.",
  },
  aramco: {
    key: "aramco",
    name: "Saudi Aramco Vendor Evidence",
    city: "",
    country: "Saudi Arabia",
    type: "Verified vendor list",
    website: "",
    doctoral: "",
    focus: "Verified Vendor List evidence and qualification signals relevant to GCC lab tender participation.",
    fit: "Useful when a tender requires vendor qualification, local partner evidence, or supplier credibility.",
  },
  unknown: {
    key: "unknown",
    name: "Tender source not identified",
    city: "",
    country: "",
    type: "Reference",
    website: "",
    doctoral: "",
    focus: "The current row does not include enough Lead Source, portal, company, or contact metadata.",
    fit: "Add Lead Source, Lead Contact, company/contact, or file metadata to make this reference exact.",
  },
};

function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}

function normalizedText(value) {
  return String(value || "").toLowerCase().replace(/[_-]+/g, " ").trim();
}

function shortText(value, length = 96) {
  const text = String(value || "").trim();
  if (text.length <= length) return text;
  return `${text.slice(0, Math.max(0, length - 1))}...`;
}

function fmtDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function dateMs(value) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function firstValue(row, keys) {
  for (const key of keys) {
    const value = row && row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function linkedWorkTimeItems(row = {}, kind = "task") {
  const base = kind === "email"
    ? [
        ["Created", ["createdAt", "Created At"]],
        ["Not before", ["notBefore", "Not Before"]],
        ["Approved", ["approvedAt", "Approved At"]],
        ["Sent", ["sentAt", "Sent At"]],
        ["Follow-up", ["followUpDate", "Follow-up Date", "Follow Up Date"]],
        ["Updated", ["lastUpdated", "Last Updated", "updatedAt", "Updated At"]],
      ]
    : [
        ["Created", ["createdAt", "Created At"]],
        ["Run after", ["runAfter", "Run After"]],
        ["Due", ["dueAt", "Due At"]],
        ["Deadline", ["deadline", "Deadline"]],
        ["Completed", ["completedAt", "Completed At"]],
        ["Updated", ["lastUpdated", "Last Updated", "updatedAt", "Updated At"]],
      ];
  return base
    .map(([label, keys]) => ({ label, value: firstValue(row, keys) }))
    .filter(item => item.value);
}

function daysUntil(value) {
  const ms = dateMs(value);
  if (!ms) return null;
  return Math.ceil((ms - Date.now()) / 86400000);
}

function daysSince(value) {
  const ms = dateMs(value);
  if (!ms) return null;
  return Math.max(0, Math.floor((Date.now() - ms) / 86400000));
}

function localDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function endOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999).getTime();
}

function resolveReportPeriod(filter = {}) {
  const now = new Date();
  const preset = filter.preset || "7";
  if (preset === "custom") {
    const from = filter.from ? new Date(`${filter.from}T00:00:00`) : new Date(now.getTime() - 6 * 86400000);
    const to = filter.to ? new Date(`${filter.to}T23:59:59.999`) : now;
    const fromMs = Number.isNaN(from.getTime()) ? now.getTime() - 6 * 86400000 : from.getTime();
    const toMs = Number.isNaN(to.getTime()) ? now.getTime() : to.getTime();
    return {
      preset,
      fromMs: Math.min(fromMs, toMs),
      toMs: Math.max(fromMs, toMs),
      label: `${localDateInputValue(new Date(Math.min(fromMs, toMs)))} to ${localDateInputValue(new Date(Math.max(fromMs, toMs)))}`,
    };
  }
  if (preset === "today") {
    return { preset, fromMs: startOfLocalDay(now), toMs: now.getTime(), label: "Today" };
  }
  const days = Math.max(1, Number(filter.days || preset || 7));
  return {
    preset,
    fromMs: now.getTime() - (days * 86400000),
    toMs: now.getTime(),
    label: `Last ${days} day${days === 1 ? "" : "s"}`,
  };
}

function rowTimeInPeriod(row = {}, keys = [], period) {
  return keys.some(key => {
    const ms = dateMs(row[key]);
    return ms && ms >= period.fromMs && ms <= period.toMs;
  });
}

function countRowsInPeriod(rows = [], keys = [], period) {
  return rows.filter(row => rowTimeInPeriod(row, keys, period)).length;
}

function latestWorkTime(timeItems = []) {
  let latest = "";
  let latestMs = 0;
  timeItems.forEach(item => {
    const ms = dateMs(item.value);
    if (ms > latestMs) {
      latestMs = ms;
      latest = item.value;
    }
  });
  return { latest, latestMs };
}

function isTruthy(value) {
  return String(value).toLowerCase() === "true" || value === true || value === 1;
}

function stableIndex(value, modulo) {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % Math.max(1, modulo || 1);
}

function readStaffProfileOverrides() {
  try {
    return JSON.parse(window.localStorage.getItem(STAFF_PROFILE_STORAGE_KEY) || "{}") || {};
  } catch (error) {
    return {};
  }
}

function writeStaffProfileOverrides(overrides) {
  window.localStorage.setItem(STAFF_PROFILE_STORAGE_KEY, JSON.stringify(overrides || {}));
}

function staffProfileOverride(staffId) {
  return readStaffProfileOverrides()[staffId] || {};
}

function saveStaffProfileOverride(staffId, patch) {
  const all = readStaffProfileOverrides();
  all[staffId] = { ...(all[staffId] || {}), ...(patch || {}) };
  writeStaffProfileOverrides(all);
  return all[staffId];
}

function defaultSpecialistAvatar(staffId) {
  if (!isAiStaffId(staffId) || staffId === "AIstaff_Manager") return "";
  return UI_FACES_ABSTRACT_AVATARS[stableIndex(staffId, UI_FACES_ABSTRACT_AVATARS.length)];
}

function defaultManagerAvatar(staffId) {
  if (staffId !== "AIstaff_Manager") return "";
  return UI_FACES_HUMAN_AVATARS[stableIndex(staffId, UI_FACES_HUMAN_AVATARS.length)];
}

function defaultStaffAvatar(staffId) {
  const registry = registryStaffProfile(staffId);
  if (registry && registry.avatarUrl) return registry.avatarUrl;
  return defaultManagerAvatar(staffId) || defaultSpecialistAvatar(staffId);
}

function defaultStaffAlias(staffId) {
  const registry = registryStaffProfile(staffId);
  return (registry && (registry.alias || registry.displayName || registry.label)) || DEFAULT_STAFF_ALIASES[staffId] || "";
}

function activeFabric() {
  return (typeof window !== "undefined" && window.__SWISS_PLANNER_FABRIC__) || {};
}

function registryStaffProfile(staffId) {
  const id = String(staffId || "");
  return ((activeFabric().staffProfiles || [])).find(row => row && row.id === id) || null;
}

function registryStaffIds(fabric = activeFabric()) {
  return uniqueValues([
    ...STAFF_ORDER,
    ...((fabric.staffProfiles || []).map(row => row && row.id)),
  ]);
}

function icon(name) {
  const paths = {
    list: [
      h("path", { key: 1, d: "M8 6h13" }),
      h("path", { key: 2, d: "M8 12h13" }),
      h("path", { key: 3, d: "M8 18h13" }),
      h("path", { key: 4, d: "M3 6h.01" }),
      h("path", { key: 5, d: "M3 12h.01" }),
      h("path", { key: 6, d: "M3 18h.01" }),
    ],
    kanban: [
      h("path", { key: 1, d: "M6 5v11" }),
      h("path", { key: 2, d: "M12 5v6" }),
      h("path", { key: 3, d: "M18 5v14" }),
    ],
    refresh: [
      h("path", { key: 1, d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }),
      h("path", { key: 2, d: "M21 3v5h-5" }),
      h("path", { key: 3, d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }),
      h("path", { key: 4, d: "M8 16H3v5" }),
    ],
    play: [h("polygon", { key: 1, points: "6 3 20 12 6 21 6 3" })],
    plus: [h("path", { key: 1, d: "M5 12h14" }), h("path", { key: 2, d: "M12 5v14" })],
    save: [
      h("path", { key: 1, d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }),
      h("polyline", { key: 2, points: "17 21 17 13 7 13 7 21" }),
      h("polyline", { key: 3, points: "7 3 7 8 15 8" }),
    ],
    mail: [
      h("rect", { key: 1, width: "20", height: "16", x: "2", y: "4", rx: "2" }),
      h("path", { key: 2, d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" }),
    ],
    shield: [
      h("path", { key: 1, d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" }),
      h("path", { key: 2, d: "m9 12 2 2 4-4" }),
    ],
    search: [
      h("circle", { key: 1, cx: "11", cy: "11", r: "8" }),
      h("path", { key: 2, d: "m21 21-4.3-4.3" }),
    ],
    user: [
      h("circle", { key: 1, cx: "12", cy: "8", r: "5" }),
      h("path", { key: 2, d: "M20 21a8 8 0 0 0-16 0" }),
    ],
    send: [
      h("path", { key: 1, d: "m22 2-7 20-4-9-9-4Z" }),
      h("path", { key: 2, d: "M22 2 11 13" }),
    ],
    clock: [
      h("circle", { key: 1, cx: "12", cy: "12", r: "10" }),
      h("path", { key: 2, d: "M12 6v6l4 2" }),
    ],
    file: [
      h("path", { key: 1, d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" }),
      h("path", { key: 2, d: "M14 2v4a2 2 0 0 0 2 2h4" }),
      h("path", { key: 3, d: "M10 9H8" }),
      h("path", { key: 4, d: "M16 13H8" }),
      h("path", { key: 5, d: "M16 17H8" }),
    ],
    chart: [
      h("path", { key: 1, d: "M3 3v18h18" }),
      h("path", { key: 2, d: "M18 17V9" }),
      h("path", { key: 3, d: "M13 17V5" }),
      h("path", { key: 4, d: "M8 17v-3" }),
    ],
    book: [
      h("path", { key: 1, d: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20" }),
      h("path", { key: 2, d: "M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z" }),
      h("path", { key: 3, d: "M8 6h8" }),
      h("path", { key: 4, d: "M8 10h6" }),
    ],
    database: [
      h("ellipse", { key: 1, cx: "12", cy: "5", rx: "9", ry: "3" }),
      h("path", { key: 2, d: "M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" }),
      h("path", { key: 3, d: "M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" }),
    ],
    x: [h("path", { key: 1, d: "M18 6 6 18" }), h("path", { key: 2, d: "m6 6 12 12" })],
  };
  return h(
    "svg",
    {
      className: "lucide ui-icon",
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
    },
    paths[name] || paths.user
  );
}

function staffProfile(value) {
  const id = String(value || "");
  if (isHumanResponsible(id)) {
    return { label: "Iman / Human", initials: "IN", icon: "user", tone: "human" };
  }
  const registry = registryStaffProfile(id);
  const profiles = [
    ["Manager", "Manager", "MG", "user", "manager"],
    ["OpportunityHunter", "Tender Document Analyst", "TD", "search", "hunter"],
    ["FitAnalyst", "Fit And Supplier Match Analyst", "FA", "chart", "fit"],
    ["ProfessorResearchAnalyst", "Supplier Mapper", "SM", "file", "research"],
    ["ApplicationPackMaker", "Tender Package Maker", "TP", "file", "maker"],
    ["ApplicationPackSender", "Supplier Outreach Specialist", "SO", "send", "sender"],
    ["FollowUpController", "Follow-up Controller", "FU", "clock", "follow"],
    ["CRMController", "CRM Controller", "CRM", "database", "crm"],
  ];
  const match = profiles.find(([needle]) => id.includes(needle));
  if (match) {
    const override = staffProfileOverride(id);
    const baseLabel = match[1];
    const alias = String(override.alias || (registry && registry.alias) || defaultStaffAlias(id) || "").trim();
    const label = alias || (registry && registry.label) || baseLabel;
    return {
      label,
      systemLabel: (registry && registry.label) || baseLabel,
      initials: label.split(/\s+/).map(part => part[0]).join("").slice(0, 3).toUpperCase(),
      icon: match[3],
      tone: match[4],
    };
  }
  const label = id.replace(/^AIstaff_/, "").replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim() || "Staff";
  const override = staffProfileOverride(id);
  const alias = String(override.alias || (registry && registry.alias) || defaultStaffAlias(id) || "").trim();
  const display = alias || (registry && registry.label) || label;
  return { label: display, systemLabel: (registry && registry.label) || label, initials: display.split(/\s+/).map(part => part[0]).join("").slice(0, 3).toUpperCase(), icon: "user", tone: "neutral" };
}

function isHumanResponsible(value) {
  const text = normalizedText(value);
  return text === "human iman" || text === "human" || text.includes("iman / human") || text.includes("iman human") || text.includes("human_iman");
}

function staffAvatar(staffId, compact = false) {
  const profile = staffProfile(staffId);
  const override = staffProfileOverride(staffId);
  const avatarUrl = String(override.avatarUrl || defaultStaffAvatar(staffId) || "").trim();
  const isAi = isAiStaffId(staffId);
  return h("span", { className: cn("staff-avatar", profile.tone, isAi && "ai-avatar", compact && "compact"), title: profile.label },
    avatarUrl ? h("img", { src: avatarUrl, alt: "", loading: "lazy", referrerPolicy: "no-referrer" }) : icon(profile.icon),
    h("span", { className: "avatar-initials" }, isAi ? "AI" : profile.initials)
  );
}

function StaffChip({ staffId }) {
  const profile = staffProfile(staffId);
  return h("span", { className: cn("staff-chip", profile.tone) },
    staffAvatar(staffId, true),
    h("span", null, profile.label)
  );
}

function isAiStaffId(value) {
  return String(value || "").startsWith("AIstaff_");
}

function isHumanDecisionThread(thread = {}) {
  const source = thread.source || {};
  if (source.sourceKind === "System Audit") return false;
  return source.taskCategory === "Human Decision" ||
    isHumanResponsible(thread.responsible) ||
    isHumanResponsible(thread.unreadFor) ||
    isHumanResponsible(source.assignedTo) ||
    isHumanResponsible(source.targetStaff);
}

function isHumanFacingThread(thread = {}) {
  const source = thread.source || {};
  if (source.sourceKind === "System Audit") return false;
  return isHumanResponsible(thread.unreadFor) ||
    isHumanResponsible(thread.responsible) ||
    isHumanResponsible(thread.sourceStaff) ||
    isHumanResponsible(thread.startedBy) ||
    isHumanResponsible(source.createdBy) ||
    isHumanResponsible(source.sourceStaff) ||
    isHumanResponsible(source.assignedTo) ||
    isHumanResponsible(source.targetStaff) ||
    source.escalationLevel === "Human";
}

function operatingModelFromDashboard(dashboard = {}) {
  const fabric = fabricOrFallback(dashboard);
  return fabric.operatingModel || {};
}

function threadReasonLabel(thread = {}) {
  const source = thread.source || {};
  return thread.threadReasonLabel || source.threadReasonLabel || ({
    human_message: "Human / manager",
    approval: "Approval",
    missing_input: "Missing input",
    blocker: "Blocker",
    review: "Review",
    escalation: "Escalation",
    worker_handoff: "Worker handoff",
    system_audit: "System audit",
  }[thread.threadReason || source.threadReason] || "Work thread");
}

function threadReasonTone(thread = {}) {
  const reason = normalizedText((thread.source || {}).threadReason || thread.threadReason || "");
  if (reason.includes("approval") || reason.includes("missing") || reason.includes("blocker") || reason.includes("escalation")) return "warn";
  if (reason.includes("audit") || reason.includes("worker")) return "neutral";
  return "ok";
}

function threadActionStaffId(thread = {}) {
  if (isHumanDecisionThread(thread)) return "AIstaff_Manager";
  if (isAiStaffId(thread.actionStaff) || isHumanResponsible(thread.actionStaff)) return isHumanResponsible(thread.actionStaff) ? HUMAN_STAFF_ID : thread.actionStaff;
  const unread = String(thread.unreadFor || "");
  if (isAiStaffId(unread) || isHumanResponsible(unread)) return isHumanResponsible(unread) ? HUMAN_STAFF_ID : unread;
  if (isAiStaffId(thread.responsible) || isHumanResponsible(thread.responsible)) return isHumanResponsible(thread.responsible) ? HUMAN_STAFF_ID : thread.responsible;
  if (isAiStaffId(thread.targetStaff) || isHumanResponsible(thread.targetStaff)) return isHumanResponsible(thread.targetStaff) ? HUMAN_STAFF_ID : thread.targetStaff;
  if (isAiStaffId(thread.sourceStaff)) return thread.sourceStaff;
  return "AIstaff_Manager";
}

function threadActionStaffLabel(thread = {}) {
  return staffProfile(threadActionStaffId(thread)).label;
}

function waitingLabel(thread = {}) {
  const unread = String(thread.unreadFor || "");
  if (isHumanDecisionThread(thread) && isAiStaffId(unread) && unread !== "AIstaff_Manager") return "Manager is routing internally";
  if (isHumanResponsible(unread)) return "Waiting for Iman";
  if (isAiStaffId(unread)) return `Waiting for ${staffProfile(unread).label}`;
  return "No unread owner";
}

function inferUniversity(row = {}) {
  const text = [
    row.university,
    row.University,
    row["Lead Source"],
    row.leadSource,
    row.source,
    row.company,
    row.Company,
    row["Lead Contact"],
    row.opportunityId,
    row.applicationId,
    row.entityId,
    row.notes,
    row.recipientName,
    row.to,
    row.subject,
  ].join(" ").toLowerCase();
  const tests = [
    ["aramco", /aramco|verified vendor|vendor list|vvl/],
    ["supplier", /supplier|partner|company|quotation|quote|contact|vendor/],
    ["portal", /portal|tender|rfq|rfp|pq|soi|procurement|etimad|source/],
    ["crm", /lead|blue mark|gcclab|gcc lab|crm/],
  ];
  for (const [key, pattern] of tests) {
    if (pattern.test(text)) return UNIVERSITY_REFERENCES[key];
  }
  return UNIVERSITY_REFERENCES.unknown;
}

function applicationStage(row = {}) {
  const text = `${row.currentStage || ""} ${row.currentStatus || ""}`.toLowerCase();
  if (text.includes("submitted") || text.includes("waiting")) return "Submitted / Waiting";
  if (text.includes("ready") || text.includes("verified")) return "Tender Package Ready";
  if (text.includes("package") && text.includes("progress")) return "Tender Package In Progress";
  if (text.includes("quotation") || text.includes("quote")) return "Quotation Requested";
  if (text.includes("supplier") || text.includes("partner")) return "Supplier Match Needed";
  if (text.includes("fit") || text.includes("eligibility")) return "Fit / Eligibility Checked";
  if (text.includes("document") || text.includes("docs")) return "Tender Docs Reviewed";
  if (text.includes("lead") || text.includes("opportunity")) return "Lead Received";
  return "Other";
}

function noticeTone(value) {
  const text = normalizedText(value);
  if (text.includes("blocked") || text.includes("error") || text.includes("failed") || text.includes("late")) return "danger";
  if (text.includes("needs") || text.includes("waiting") || text.includes("queued") || text.includes("review")) return "warn";
  if (text.includes("sent") || text.includes("done") || text.includes("ok") || text.includes("complete")) return "ok";
  return "";
}

function isManualReviewText(text) {
  return (
    text.includes("duplicate recipient") ||
    text.includes("repeated professor") ||
    text.includes("repeated supervisor") ||
    text.includes("repeated supplier") ||
    text.includes("needs human review") ||
    text.includes("human review") ||
    text.includes("supervisor reply") ||
    text.includes("supplier reply") ||
    text.includes("portal submission") ||
    text.includes("linkedin") ||
    text.includes("manual send")
  );
}

function isCodexWorkerHandoff(row) {
  const text = normalizedText([
    row && row.status,
    row && row.failureStatus,
    row && row.lastError,
    row && row.resultNotes,
    row && row.nextAction,
    row && row.completionCriteria,
  ].join(" "));
  if (!text || isManualReviewText(text)) return false;
  return (
    text.includes("waiting for codex worker") ||
    text.includes("codex handoff") ||
    text.includes("requires codex") ||
    text.includes("outside apps script") ||
    text.includes("external research") ||
    text.includes("package writing") ||
    text.includes("proposal writing") ||
    text.includes("professor analysis") ||
    text.includes("supplier analysis") ||
    text.includes("tender document") ||
    text.includes("quotation") ||
    text.includes("document drafting")
  );
}

function displayStatus(row) {
  if (isCodexWorkerHandoff(row)) return "Waiting for Codex Worker";
  return (row && row.status) || "";
}

function taskNeedsCodex(data) {
  if (isHumanResponsible(data.assignedTo)) return false;
  const text = normalizedText([data.taskType, data.taskTemplateId, data.nextAction, data.completionCriteria].join(" "));
  if (!text || isManualReviewText(text)) return false;
  return ["research", "find ", "opportunit", "lead", "tender", "supplier", "vendor", "quotation", "quote", "proposal", "write", "draft", "document", "package", "analy", "fit"].some(term => text.includes(term));
}

function isTerminal(row) {
  const text = normalizedText(row && row.status);
  return ["done", "closed", "cancelled", "sent", "submitted", "no further action"].includes(text);
}

function hasHumanApprovalSignal(row) {
  if (isTerminal(row) || isCodexWorkerHandoff(row)) return false;
  const text = normalizedText([
    row.status,
    row.failureStatus,
    row.approvalStatus,
    row.sendStatus,
    row.lastError,
    row.resultNotes,
    row.nextAction,
    row.completionCriteria,
  ].join(" "));
  return (
    text.includes("needs approval") ||
    text.includes("needs human review") ||
    text.includes("human review") ||
    text.includes("duplicate recipient") ||
    text.includes("content review") ||
    text.includes("not approved") ||
    text.includes("approval required") ||
    text.includes("supervisor reply") ||
    text.includes("supplier reply")
  );
}

function friendlyId(id) {
  const text = String(id || "").trim();
  if (!text) return "";
  return text
    .replace(/^entity_application_/, "")
    .replace(/^app_/, "")
    .replace(/^opp_/, "")
    .replace(/^task_/, "")
    .replace(/^staff_task_/, "Task ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, match => match.toUpperCase());
}

function buildLabels(data) {
  const labels = { tasks: {}, followUps: {}, applications: {}, opportunities: {} };
  (data.tasks || []).forEach(row => {
    if (row.taskId) labels.tasks[row.taskId] = { label: row.nextAction || row.taskType || friendlyId(row.taskId), status: displayStatus(row) };
  });
  (data.followUps || []).forEach(row => {
    if (row.followUpId) labels.followUps[row.followUpId] = { label: row.reason || row.nextAction || friendlyId(row.followUpId), status: row.status || "" };
  });
  (data.applications || []).forEach(row => {
    const university = inferUniversity(row);
    const label = [university.key !== "unknown" ? university.name : "", friendlyId(row.applicationId || row.entityId)].filter(Boolean).join(" - ");
    if (row.applicationId) labels.applications[row.applicationId] = { label, status: row.currentStatus || "" };
    if (row.entityId) labels.applications[row.entityId] = { label, status: row.currentStatus || "" };
    if (row.opportunityId) labels.opportunities[row.opportunityId] = { label: [university.name, friendlyId(row.opportunityId)].filter(Boolean).join(" - "), status: row.currentStatus || "" };
  });
  flattenEmailQueue(data.emailQueue || {}).forEach(row => {
    if (row.applicationId && !labels.applications[row.applicationId]) {
      labels.applications[row.applicationId] = { label: friendlyId(row.applicationId), status: row.sendStatus || "" };
    }
    if (row.opportunityId && !labels.opportunities[row.opportunityId]) {
      labels.opportunities[row.opportunityId] = { label: friendlyId(row.opportunityId), status: row.sendStatus || "" };
    }
  });
  return labels;
}

function pageHeaderForView(view, labels = {}, context = {}) {
  const navMap = Object.fromEntries(NAV_ITEMS);
  if (view === "application-detail") {
    const title = (labels.applications && labels.applications[context.applicationId] && labels.applications[context.applicationId].label) || friendlyId(context.applicationId) || "Lead";
    return { crumbs: [APP_NAME, "Leads"], title };
  }
  if (view === "opportunity-detail") {
    const title = (labels.opportunities && labels.opportunities[context.opportunityId] && labels.opportunities[context.opportunityId].label) || friendlyId(context.opportunityId) || "Tender Case";
    return { crumbs: [APP_NAME, "Leads"], title };
  }
  if (view === "university-detail") {
    return { crumbs: [APP_NAME, "Leads"], title: context.universityName || "Tender Source" };
  }
  return {
    crumbs: [APP_NAME],
    title: navMap[view] || "Overview",
  };
}

function flattenEmailQueue(queue) {
  if (Array.isArray(queue)) return queue;
  if (!queue || typeof queue !== "object") return [];
  const keys = ["queue", "blocked", "queued", "drafted", "sent", "errors", "needsReview"];
  return keys.flatMap(key => Array.isArray(queue[key]) ? queue[key] : []);
}

function deriveSummary(data) {
  const summary = { ...(data.summary || {}) };
  const seen = new Set();
  const tasks = [...(data.tasks || []), ...((data.managerReview && data.managerReview.tasks) || [])].filter(row => {
    if (!row || !row.taskId || seen.has(row.taskId)) return false;
    seen.add(row.taskId);
    return true;
  });
  const waitingCodex = tasks.filter(isCodexWorkerHandoff).length;
  const humanTasks = collectHumanTaskRows(data).filter(row => !isTerminal(row));
  summary.waitingCodexWorker = summary.waitingCodexWorker == null ? waitingCodex : summary.waitingCodexWorker;
  summary.humanTasks = data.threadsSummary && data.threadsSummary.humanFacingOpen != null
    ? data.threadsSummary.humanFacingOpen
    : humanTasks.length;
  const reviewCount = collectManagerReviewItems(data.managerReview || {}).length;
  summary.openEscalations = summary.openEscalations == null ? reviewCount : summary.openEscalations;
  summary.managerReview = 0;
  if (waitingCodex && summary.dueTasks !== undefined) summary.dueTasks = Math.max(0, Number(summary.dueTasks || 0) - waitingCodex);
  return summary;
}

function collectManagerReviewItems(review) {
  const items = [];
  (review.tasks || []).forEach(row => {
    if (isTerminal(row) || isCodexWorkerHandoff(row)) return;
    items.push({ kind: "Task", title: row.taskType || row.taskId, status: displayStatus(row), staff: row.assignedTo, taskId: row.taskId, entityId: row.entityId, body: row.nextAction || row.lastError || row.resultNotes, row });
  });
  (review.followUps || []).forEach(row => {
    items.push({ kind: "Follow-up", title: row.reason || row.followUpId, status: row.status, staff: row.staff, followUpId: row.followUpId, entityId: row.entityId, body: row.nextAction || row.result, row });
  });
  (review.queue || []).forEach(row => {
    items.push({ kind: "Email", title: row.recipientName || row.to || row.queueId, status: row.sendStatus || row.approvalStatus, staff: "AIstaff_ApplicationPackSender", queueId: row.queueId, body: row.subject || row.lastError, row });
  });
  (review.auditIssues || []).forEach(row => {
    items.push({ kind: row.type || "Audit", title: row.entityId || row.taskId || row.followUpId || "Process issue", status: "System Audit", staff: "AIstaff_Manager", body: row.message || row.reason || JSON.stringify(row), row, internalOnly: true });
  });
  return items;
}

function collectHumanTaskSignals(data) {
  const items = [];
  collectManagerReviewItems(data.managerReview || {}).forEach(item => {
    if (item.internalOnly || item.sourceKind === "System Audit" || normalizedText(item.kind).includes("audit")) return;
    if (hasHumanApprovalSignal(item.row || {})) {
      items.push({
        ...item,
        kind: "Human Task",
        sourceKind: item.kind,
        assignedTo: "Iman / Human",
        taskTitle: `Review ${item.kind.toLowerCase()}: ${item.title}`,
      });
    }
  });
  flattenEmailQueue(data.emailQueue || {}).forEach(row => {
    if (hasHumanApprovalSignal(row) || normalizedText(row.sendStatus).includes("blocked")) {
      const sourceKind = normalizedText(row.sendStatus).includes("sent") ? "Sent Email" : "Email Queue";
      items.push({
        kind: "Human Task",
        sourceKind,
        assignedTo: "Iman / Human",
        taskTitle: `Review email to ${row.recipientName || row.to || "recipient"}`,
        title: row.recipientName || row.to || row.queueId,
        status: row.sendStatus || row.approvalStatus,
        staff: "AIstaff_ApplicationPackSender",
        queueId: row.queueId,
        body: row.lastError || row.subject,
        row,
      });
    }
  });
  const priority = item => {
    const text = normalizedText(`${item.status} ${item.body}`);
    if (text.includes("duplicate") || text.includes("blocked")) return 0;
    if (text.includes("approval")) return 1;
    if (text.includes("human review")) return 2;
    return 3;
  };
  return items.sort((a, b) => priority(a) - priority(b));
}

function humanTaskFromItem(item) {
  const row = item.row || {};
  if (item.internalOnly || item.sourceKind === "System Audit" || normalizedText(item.kind).includes("audit")) return null;
  const sourceId = item.queueId || item.taskId || item.followUpId || item.title || "review";
  const sourceKind = item.sourceKind || item.kind || "Review";
  const stableSource = item.queueId ? "email" : item.taskId ? "task" : item.followUpId ? "followup" : String(sourceKind);
  const safeSource = String(stableSource).replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  const safeId = String(sourceId).replace(/[^a-z0-9_-]+/gi, "_");
  const title = item.taskTitle || `Review ${String(sourceKind).toLowerCase()}: ${item.title || sourceId}`;
  return {
    ...row,
    taskId: row.humanTaskId || `human_task_${safeSource}_${safeId}`,
    taskType: "Human Review",
    taskTemplateId: "template_human_review_task",
    assignedTo: HUMAN_STAFF_ID,
    createdBy: item.staff || row.createdBy || "AIstaff_Manager",
    entityId: row.entityId || item.entityId || "",
    applicationId: row.applicationId || row.ApplicationID || "",
    opportunityId: row.opportunityId || row["Opportunity ID"] || "",
    priority: row.priority || "High",
    status: item.status || row.status || row.approvalStatus || row.sendStatus || "Needs Human Review",
    runAfter: row.runAfter || row.createdAt || row["Created At"] || "",
    dueAt: row.dueAt || row["Due At"] || row.followUpDate || "",
    deadline: row.deadline || row.Deadline || "",
    nextAction: title,
    completionCriteria: row.completionCriteria || "Human decision is recorded and the source row is returned to the responsible staff or processed safely.",
    lastError: row.lastError || "",
    evidenceLink: row.evidenceLink || row["Evidence Link"] || "",
    resultNotes: row.resultNotes || item.body || row.notes || "",
    sourceKind,
    sourceQueueId: item.queueId || "",
    sourceTaskId: item.taskId || "",
    sourceFollowUpId: item.followUpId || "",
    sourceStaff: item.staff || "AIstaff_Manager",
    isHumanTask: true,
    sourceRow: row,
  };
}

function collectHumanTaskRows(data) {
  const actualHumanRows = (data.tasks || []).filter(row => isHumanResponsible(row.assignedTo) && row.sourceKind !== "System Audit" && !String(row.taskId || "").startsWith("human_task_system_audit_"));
  const actualIds = new Set(actualHumanRows.map(row => row.taskId).filter(Boolean));
  const derivedRows = collectHumanTaskSignals(data).map(humanTaskFromItem).filter(row => row && !actualIds.has(row.taskId));
  const seen = new Set();
  return [...actualHumanRows, ...derivedRows].filter(row => {
    const key = row.taskId || `${row.sourceKind}-${row.sourceQueueId || row.sourceTaskId || row.sourceFollowUpId}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeTaskRows(tasks, humanTasks) {
  const seen = new Set();
  return [...(humanTasks || []), ...(tasks || [])].filter(row => {
    const key = row.taskId || `${row.assignedTo}-${row.nextAction}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function threadIdForTask(taskId) {
  return `thread_${String(taskId || "task").replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

function taskIsHumanThread(row) {
  return row && !isTerminal(row) && Boolean(row.taskId);
}

function sourceStaffForTask(row) {
  return row.sourceStaff || row.createdBy || "AIstaff_Manager";
}

function taskCategory(row = {}) {
  const explicit = row.taskCategory || row["Task Category"];
  if (explicit) return explicit;
  const text = normalizedText([row.taskType, row.status, row.lastError, row.resultNotes, row.nextAction, row.sourceKind, row.subject].join(" "));
  if (text.includes("duplicate recipient") || text.includes("human review") || text.includes("needs approval")) return "Human Decision";
  if (text.includes("email") || text.includes("queue") || text.includes("attachment") || text.includes("send") || text.includes("quote") || text.includes("quotation")) return "Outreach Safety";
  if (text.includes("technical") || text.includes("bug") || text.includes("webhook") || text.includes("lock")) return "Technical Bug";
  if (text.includes("audit") || text.includes("follow-up") || text.includes("stale")) return "System Audit";
  if (text.includes("research") || text.includes("opportunit") || text.includes("supplier") || text.includes("vendor") || text.includes("partner")) return "Research Work";
  if (text.includes("package") || text.includes("application") || text.includes("proposal") || text.includes("cv") || text.includes("lead") || text.includes("tender")) return "Tender Work";
  return "Manager Guidance";
}

function managerRouteForMessage(message = "", taskType = "") {
  const text = normalizedText(`${taskType} ${message}`);
  if (text.includes("full process") || text.includes("whole process") || text.includes("end point") || text.includes("until submission") || text.includes("till submission") || text.includes("to submission") || text.includes("application process") || text.includes("tender process") || text.includes("take part") || text.includes("take these through")) {
    return { staff: "AIstaff_FitAnalyst", taskType: "Fit Review", taskCategory: "Research Work" };
  }
  if (text.includes("lead") || text.includes("tender") || text.includes("rfq") || text.includes("rfp") || text.includes("pq") || text.includes("soi") || text.includes("opportunit")) {
    return { staff: "AIstaff_OpportunityHunter", taskType: "Lead Review", taskCategory: "Tender Work" };
  }
  if (text.includes("fit") || text.includes("score") || text.includes("priorit") || text.includes("eligibility") || text.includes("bid")) {
    return { staff: "AIstaff_FitAnalyst", taskType: "Fit Review", taskCategory: "Research Work" };
  }
  if (text.includes("supplier") || text.includes("vendor") || text.includes("partner") || text.includes("company") || text.includes("contact")) {
    return { staff: "AIstaff_ProfessorResearchAnalyst", taskType: "Supplier Discovery", taskCategory: "Research Work" };
  }
  if (text.includes("proposal") || text.includes("package") || text.includes("document") || text.includes("compliance") || text.includes("boq") || text.includes("form")) {
    return { staff: "AIstaff_ApplicationPackMaker", taskType: "Tender Package", taskCategory: "Tender Work" };
  }
  if (text.includes("send") || text.includes("email") || text.includes("outreach") || text.includes("quote") || text.includes("quotation")) {
    return { staff: "AIstaff_ApplicationPackSender", taskType: "Quotation Outreach", taskCategory: "Outreach Safety" };
  }
  if (text.includes("follow up") || text.includes("reply") || text.includes("waiting")) {
    return { staff: "AIstaff_FollowUpController", taskType: "Follow-up", taskCategory: "System Audit" };
  }
  if (text.includes("sync") || text.includes("crm") || text.includes("status") || text.includes("audit")) {
    return { staff: "AIstaff_CRMController", taskType: "CRM Health", taskCategory: "System Audit" };
  }
  return { staff: "AIstaff_Manager", taskType: taskType || "Manager Guidance", taskCategory: "Manager Guidance" };
}

function humanReadableTaskProblem(row = {}) {
  const text = normalizedText([row.taskType, row.taskCategory, row.status, row.lastError, row.resultNotes, row.nextAction, row.completionCriteria].join(" "));
  if (text.includes("duplicate recipient") || text.includes("repeated professor") || text.includes("repeated supervisor") || text.includes("repeated supplier")) return "The system detected a repeated or risky supplier/contact recipient, so it stopped before another outreach.";
  if (text.includes("document style qa") || text.includes("not approved for external send") || text.includes("minimal renderer")) return "The package exists, but at least one document is not approved for external sending because it does not match the agreed template/style quality.";
  if (text.includes("attachment") && (text.includes("failed") || text.includes("blocked") || text.includes("incomplete"))) return "The supplier message or tender package cannot move yet because file access, package completeness, or quote evidence has not passed.";
  if (text.includes("codex") || text.includes("outside apps script") || text.includes("waiting for codex worker")) return "The workflow reached a judgement-heavy step that the local AI department should review before writing or changing the CRM.";
  if (text.includes("follow") || text.includes("reply") || text.includes("waiting")) return "A follow-up or reply-check is due, and the system needs a clear next action instead of guessing.";
  return "The workflow is paused because a decision is needed before it can continue.";
}

function humanReadableTaskNeed(row = {}) {
  const text = normalizedText([row.taskType, row.taskCategory, row.status, row.lastError, row.resultNotes, row.nextAction, row.completionCriteria].join(" "));
  if (text.includes("duplicate recipient") || text.includes("repeated professor") || text.includes("repeated supplier")) return "Tell Alex whether to prepare a reviewed follow-up, wait longer, close this outreach, or use another supplier/contact.";
  if (text.includes("document style qa") || text.includes("not approved for external send") || text.includes("minimal renderer")) return "Tell Alex whether to regenerate the package from the approved template path or close it as not ready.";
  if (text.includes("attachment") && (text.includes("failed") || text.includes("blocked") || text.includes("incomplete"))) return "Tell Alex whether to fix the files/attachments, prepare missing tender documents, or leave the outreach blocked.";
  if (text.includes("codex") || text.includes("outside apps script") || text.includes("waiting for codex worker")) return "Tell Alex whether Codex should do the tender judgement/writing/research work, another staff member should take it, or the task should be closed.";
  if (text.includes("follow") || text.includes("reply") || text.includes("waiting")) return "Tell Alex whether to follow up now, wait until a later date, close the lead path, or review the reply trail first.";
  return "Reply in normal language: approve and continue, reassign, ask for more detail, or close.";
}

function humanReadableTaskOptions(row = {}) {
  const text = normalizedText([row.taskType, row.status, row.resultNotes, row.nextAction].join(" "));
  if (text.includes("duplicate recipient") || text.includes("repeated professor") || text.includes("repeated supplier")) return ["Prepare a reviewed follow-up", "Wait longer", "Close this outreach", "Use another supplier/contact"];
  if (text.includes("style") || text.includes("template") || text.includes("minimal renderer")) return ["Regenerate with approved template", "Use Google Doc links only", "Close as not ready"];
  if (text.includes("codex") || text.includes("outside apps script")) return ["Let Codex handle it", "Reassign to another AI staff", "Ask for more detail", "Close the task"];
  if (text.includes("follow")) return ["Follow up now", "Wait and remind later", "Review reply trail", "Close this lead path"];
  return ["Approve and continue", "Reassign", "Ask for more detail", "Close"];
}

function humanDecisionBrief(row = {}) {
  const related = [row.applicationId ? `lead ${row.applicationId}` : "", row.opportunityId ? `tender case ${row.opportunityId}` : "", row.sourceQueueId ? `outreach queue ${row.sourceQueueId}` : ""].filter(Boolean).join("; ") || "this task";
  return [
    `**Task**\n${row.nextAction || row.taskType || "Review this task"}`,
    `**What happened**\n${humanReadableTaskProblem(row)}`,
    `**Related item**\n${related}`,
    `**What I need from you**\n${humanReadableTaskNeed(row)}`,
    `**Your options**\n${humanReadableTaskOptions(row).map(option => `- ${option}`).join("\n")}`,
    "**What I will do after your reply**\nAlex will route the next step to the correct AI staff. Replying here will not send an email or submit anything."
  ].join("\n\n");
}

function initialMessageFromTask(row) {
  if (isHumanResponsible(row.assignedTo) || row.isHumanTask || taskCategory(row) === "Human Decision") {
    return humanDecisionBrief(row);
  }
  return [
    row.nextAction || row.taskType || "This task needs staff review.",
    row.lastError || row.resultNotes || "",
    row.sourceQueueId ? `Related email queue row: ${row.sourceQueueId}` : "",
    "Internal AI staff instruction. Iman only needs to reply if Alex escalates it.",
  ].filter(Boolean).join("\n\n");
}

function localThreadFromTask(row) {
  const taskId = row.taskId || row.sourceTaskId || "task";
  const sourceStaff = sourceStaffForTask(row);
  const body = row.lastMessagePreview || initialMessageFromTask(row);
  return {
    threadId: row.threadId || row.ThreadID || threadIdForTask(taskId),
    taskId,
    entityId: row.entityId || "",
    applicationId: row.applicationId || "",
    opportunityId: row.opportunityId || "",
    startedBy: row.createdBy || sourceStaff,
    responsible: sourceStaff,
    responsibleLabel: staffProfile(sourceStaff).label,
    sourceStaff,
    targetStaff: row.targetStaff || row.assignedTo || "AIstaff_Manager",
    sourceStaffLabel: staffProfile(sourceStaff).label,
    status: row.threadStatus || row["Thread Status"] || "Open",
    archived: false,
    createdAt: row.runAfter || row.createdAt || "",
    closedAt: "",
    lastMessageAt: row.lastMessageAt || row["Last Message At"] || row.runAfter || row.createdAt || "",
    lastMessagePreview: shortText(body, 180),
    unreadFor: row.unreadFor || row["Unread For"] || "Human",
    source: {
      ...row,
      sourceQueueId: row.sourceQueueId || "",
      taskType: row.taskType || "",
      taskCategory: taskCategory(row),
      priority: row.priority || "",
      status: row.status || "",
    },
  };
}

function buildLocalThreadsFromTasks(tasks) {
  const threads = [];
  const details = {};
  (tasks || []).forEach(row => {
    if (!taskIsHumanThread(row)) return;
    const thread = localThreadFromTask(row);
    threads.push(thread);
    details[thread.threadId] = {
      ok: true,
      thread,
      messages: [
        {
          messageId: `${thread.threadId}_initial`,
          threadId: thread.threadId,
          taskId: thread.taskId,
          senderType: "AI Staff",
          senderId: thread.sourceStaff,
          senderLabel: thread.sourceStaffLabel,
          body: initialMessageFromTask(row),
          language: "natural",
          createdAt: thread.createdAt || thread.lastMessageAt,
          readByHuman: false,
          readByStaff: true,
          evidenceLink: row.evidenceLink || "",
        },
      ],
      localFallback: true,
    };
  });
  threads.sort((a, b) => String(b.lastMessageAt || "").localeCompare(String(a.lastMessageAt || "")));
  return { threads, details };
}

async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 120000);
  let response;
  try {
    response = await fetch(path, {
      method: options.method || "GET",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      body: options.body,
      signal: controller.signal,
    });
  } catch (error) {
    if (error && error.name === "AbortError") throw new Error("The local worker took too long to answer. Refresh in a moment.");
    throw new Error("Local Command Center server is not reachable. Start the launcher and keep its command window open.");
  } finally {
    clearTimeout(timeout);
  }
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      if (!response.ok) throw new Error(`${response.status} ${response.statusText || "Request failed"}`);
      throw new Error("The local Command Center returned an unreadable response.");
    }
  }
  if (!response.ok || data.ok === false) throw new Error(data.error || (data.result && data.result.error) || `${response.status} ${response.statusText || "Request failed"}`);
  return data.result == null ? data : data.result;
}

function materialButtonTag(variant, size) {
  if (size === "icon") return "";
  if (variant === "secondary") return "md-filled-tonal-button";
  if (variant === "outline") return "md-outlined-button";
  if (variant === "ghost") return "md-text-button";
  return "md-filled-button";
}

function materialWebReady(tag) {
  return Boolean(tag && typeof customElements !== "undefined" && customElements.get(tag));
}

function isUiIconElement(child) {
  return Boolean(child && typeof child === "object" && child.type === "svg" && String((child.props && child.props.className) || "").includes("ui-icon"));
}

function Button({ children, className, variant = "default", size = "default", actionKey = "", pending = false, pendingLabel = "", ...props }) {
  const tag = materialButtonTag(variant, size);
  const globalBusy = (typeof window !== "undefined" && window.__SWISS_PLANNER_ACTION_STATE__) || {};
  const isPending = Boolean(pending || (actionKey && globalBusy.busy && globalBusy.actionKey === actionKey));
  const isDisabled = Boolean(props.disabled || isPending || (actionKey && globalBusy.busy));
  const renderedChildren = isPending
    ? [h("span", { key: "spinner", className: "button-spinner", "aria-hidden": "true" }), pendingLabel || globalBusy.label || "Running..."]
    : children;
  const classes = cn("ui-button", "m3-button", `ui-button-${variant}`, `ui-button-${size}`, isPending && "is-running", className);
  if (materialWebReady(tag)) {
    const childArray = Children.toArray(renderedChildren);
    const hasIcon = childArray.some(isUiIconElement);
    const materialChildren = childArray.map((child, index) => (
      isUiIconElement(child) ? cloneElement(child, { slot: "icon", key: child.key || `icon-${index}` }) : child
    ));
    const attrs = {
      ...props,
      type: props.type || "button",
      className: classes,
      disabled: isDisabled || undefined,
      "aria-busy": isPending ? "true" : undefined,
    };
    if (hasIcon) attrs["has-icon"] = "";
    return h(tag, attrs, materialChildren);
  }
  return h("button", { ...props, type: props.type || "button", className: classes, disabled: isDisabled, "aria-busy": isPending ? "true" : undefined }, renderedChildren);
}

function Card({ children, className, tone }) {
  return h("section", { className: cn("ui-card", tone && `is-${tone}`, className) }, children);
}

function CardHeader({ title, description, action, eyebrow }) {
  return h("div", { className: "ui-card-header" },
    h("div", null,
      eyebrow ? h("p", { className: "eyebrow" }, eyebrow) : null,
      h("h2", null, title),
      description ? h("p", { className: "panel-subtitle" }, description) : null
    ),
    action ? h("div", { className: "panel-actions" }, action) : null
  );
}

function CardContent({ children, className }) {
  return h("div", { className: cn("ui-card-content", className) }, children);
}

function Badge({ children, tone }) {
  return h("span", { className: cn("ui-badge", tone || noticeTone(children)) }, children || "No status");
}

function AccessBadge({ value }) {
  const label = String(value || "department_editable").replace(/_/g, " ");
  const tone = value === "platform_locked" ? "warn" : value === "runtime_context" ? "neutral" : value === "workspace_editable" ? "success" : "ok";
  return h(Badge, { tone }, label);
}

function listText(value) {
  if (Array.isArray(value)) return value.join(", ");
  return String(value || "");
}

function Input(props) {
  return h("input", { ...props, className: cn("ui-input", props.className) });
}

function Select({ children, className, ...props }) {
  return h("select", { ...props, className: cn("ui-select", className) }, children);
}

function Textarea(props) {
  return h("textarea", { ...props, className: cn("ui-textarea", props.className) });
}

function Field({ label, children, className }) {
  return h("label", { className: cn("ui-field", className) }, h("span", null, label), children);
}

function EmptyState({ title, body }) {
  return h("div", { className: "empty-state" }, h("h3", null, title), h("p", null, body));
}

function renderInlineMarkdown(text) {
  const parts = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  String(text || "").replace(pattern, (match, _token, index) => {
    if (index > lastIndex) parts.push(String(text).slice(lastIndex, index));
    if (match.startsWith("**")) {
      parts.push(h("strong", { key: `${index}-strong` }, match.slice(2, -2)));
    } else if (match.startsWith("`")) {
      parts.push(h("code", { key: `${index}-code` }, match.slice(1, -1)));
    } else {
      const [, label, url] = match.match(/^\[([^\]]+)\]\(([^)]+)\)$/) || [];
      parts.push(h("a", { key: `${index}-link`, href: url || "#", target: "_blank", rel: "noreferrer" }, label || match));
    }
    lastIndex = index + match.length;
    return match;
  });
  if (lastIndex < String(text || "").length) parts.push(String(text || "").slice(lastIndex));
  return parts.length ? parts : String(text || "");
}

function MarkdownViewer({ content, className }) {
  const lines = String(content || "").split(/\r?\n/);
  const blocks = [];
  let listItems = [];
  let codeLines = [];
  let inCode = false;

  function flushList(key) {
    if (!listItems.length) return;
    blocks.push(h("ul", { key }, listItems.map((item, index) => h("li", { key: index }, renderInlineMarkdown(item)))));
    listItems = [];
  }

  function flushCode(key) {
    if (!codeLines.length) return;
    blocks.push(h("pre", { key }, h("code", null, codeLines.join("\n"))));
    codeLines = [];
  }

  lines.forEach((line, index) => {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        flushCode(`code-${index}`);
        inCode = false;
      } else {
        flushList(`list-before-code-${index}`);
        inCode = true;
      }
      return;
    }
    if (inCode) {
      codeLines.push(line);
      return;
    }
    const trimmed = line.trim();
    if (!trimmed) {
      flushList(`list-${index}`);
      return;
    }
    if (trimmed.startsWith("### ")) {
      flushList(`list-${index}`);
      blocks.push(h("h4", { key: index }, renderInlineMarkdown(trimmed.slice(4))));
      return;
    }
    if (trimmed.startsWith("## ")) {
      flushList(`list-${index}`);
      blocks.push(h("h3", { key: index }, renderInlineMarkdown(trimmed.slice(3))));
      return;
    }
    if (trimmed.startsWith("# ")) {
      flushList(`list-${index}`);
      blocks.push(h("h2", { key: index }, renderInlineMarkdown(trimmed.slice(2))));
      return;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
      return;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      listItems.push(trimmed.replace(/^\d+\.\s+/, ""));
      return;
    }
    flushList(`list-${index}`);
    blocks.push(h("p", { key: index }, renderInlineMarkdown(trimmed)));
  });
  flushList("list-final");
  flushCode("code-final");
  return h("div", { className: cn("markdown-viewer", className) }, blocks.length ? blocks : h("p", null, "No Markdown content yet."));
}

function DetailList({ rows }) {
  const clean = (rows || []).filter(Boolean).filter(row => row.value !== undefined && row.value !== null && String(row.value).trim() !== "");
  if (!clean.length) return null;
  return h("div", { className: "detail-list" }, clean.map(row =>
    h("div", { className: "detail-line", key: row.label },
      h("span", { className: "detail-label" }, row.label),
      h("span", { className: "detail-value" }, row.raw ? row.value : shortText(row.value, row.length || 160))
    )
  ));
}

function RefChip({ kind, id, labels = {}, openRef, length = 190, showStatus = true }) {
  if (!id) return null;
  const label = (labels[kind] && labels[kind][id] && labels[kind][id].label) || friendlyId(id);
  const status = labels[kind] && labels[kind][id] && labels[kind][id].status;
  return h("button", { className: "ref-link entity-ref", type: "button", onClick: () => openRef(kind, id), title: id },
    shortText(label, length),
    showStatus && status ? h("span", { className: "ref-status" }, status) : null
  );
}

function UniversityButton({ row, openUniversity }) {
  const university = inferUniversity(row);
  return h("button", { className: "ref-link university-ref", type: "button", onClick: () => openUniversity(university.key) }, university.name);
}

function App() {
  const [dashboard, setDashboard] = useState(null);
  const [view, setViewState] = useState(initialViewFromHash);
  const [status, setStatus] = useState("Loading dashboard...");
  const [busy, setBusy] = useState(false);
  const [busyStartedAt, setBusyStartedAt] = useState(0);
  const [busyAction, setBusyAction] = useState("");
  const [busyLabel, setBusyLabel] = useState("");
  const [toast, setToast] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [applicationsView, setApplicationsView] = useState("list");
  const [applicationFilters, setApplicationFilters] = useState({ search: "", stage: "", university: "" });
  const [taskFilters, setTaskFilters] = useState({ search: "", responsible: "", status: "open", category: "", application: "", unread: "" });
  const [taskDialog, setTaskDialog] = useState(null);
  const [decisionDialog, setDecisionDialog] = useState(null);
  const [selectedUniversityKey, setSelectedUniversityKey] = useState("");
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState("");
  const [selectedExplorerStaffId, setSelectedExplorerStaffId] = useState("");
  const [materialReady, setMaterialReady] = useState(Boolean(window.__MATERIAL_WEB_READY__));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.localStorage.getItem("swissPlannerSidebarCollapsed") === "true");

  const labels = useMemo(() => buildLabels(dashboard || {}), [dashboard]);
  const summary = useMemo(() => deriveSummary(dashboard || {}), [dashboard]);
  const humanTasks = useMemo(() => collectHumanTaskRows(dashboard || {}), [dashboard]);
  const allTasks = useMemo(() => mergeTaskRows((dashboard && dashboard.tasks) || [], humanTasks), [dashboard, humanTasks]);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function setView(nextView) {
    setViewState(nextView);
    if (NAV_KEYS.includes(nextView) && window.location.hash !== `#${nextView}`) {
      window.history.replaceState(null, "", `#${nextView}`);
    }
  }

  async function loadDashboard(runAudit = false, force = false) {
    if (busy && !force && !runAudit) return;
    setStatus(runAudit ? "Refreshing local dashboard..." : "Loading the local dashboard view...");
    try {
      const result = await api(`/api/dashboard?limit=60&runAudit=${runAudit ? "true" : "false"}`);
      setDashboard(result);
      const sync = result.localSync || {};
      const crmStatus = sync.crmSyncEnabled
        ? `CRM sync: ${sync.lastSheetSync ? fmtDate(sync.lastSheetSync) : "pending"}`
        : "CRM sync disabled";
      setStatus(`Last refreshed ${fmtDate(result.refreshedAt)}. ${sync.mode || "local-only"} mode. ${crmStatus}. Pending local changes: ${sync.pendingActions || 0}.`);
    } catch (error) {
      setStatus(`Dashboard error: ${error.message}`);
      showToast(error.message);
    }
  }

  useEffect(() => {
    loadDashboard(false, true);
    const timer = window.setInterval(() => loadDashboard(false, true), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    window.__SWISS_PLANNER_FABRIC__ = (dashboard && dashboard.capabilityFabric) || {};
  }, [dashboard]);

  useEffect(() => {
    const ready = () => setMaterialReady(true);
    if (window.__MATERIAL_WEB_READY__) ready();
    window.addEventListener("material-web-ready", ready);
    return () => window.removeEventListener("material-web-ready", ready);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("swissPlannerSidebarCollapsed", sidebarCollapsed ? "true" : "false");
  }, [sidebarCollapsed]);

  useEffect(() => {
    const syncHashView = () => {
      const nextView = initialViewFromHash();
      setViewState(nextView);
    };
    window.addEventListener("hashchange", syncHashView);
    return () => window.removeEventListener("hashchange", syncHashView);
  }, []);

  async function bridgeAction(action, payload = {}) {
    const result = await api("/api/action", { method: "POST", body: JSON.stringify({ action, payload }) });
    showToast(result.queuedLocal ? `${action} saved locally` : `${action} completed`);
    return result;
  }

  async function runBusy(label, fn, actionKey = "", runningText = "Running...") {
    const busyAge = busy && busyStartedAt ? Date.now() - busyStartedAt : 0;
    if (busy && busyAge < 180000) {
      showToast("Another action is still running. Wait a moment, then try again.");
      setStatus(`Still working: ${status || label}`);
      return;
    }
    if (busy && busyAge >= 180000) {
      showToast("Cleared a stale action lock and started again.");
    }
    setBusy(true);
    setBusyStartedAt(Date.now());
    setBusyAction(actionKey || label);
    setBusyLabel(runningText || "Running...");
    setStatus(label);
    try {
      await fn();
    } catch (error) {
      showToast(error.message);
      setStatus(`Action failed: ${error.message}`);
    } finally {
      setBusy(false);
      setBusyStartedAt(0);
      setBusyAction("");
      setBusyLabel("");
    }
  }

  async function syncNow(runAudit = false) {
    await runBusy(runAudit ? "Refreshing CRM sync state..." : "Refreshing local state...", async () => {
      const result = await api("/api/sync-now", { method: "POST", body: JSON.stringify({ runAudit }) });
      setDashboard(result.dashboard);
      showToast(result.bridgeDisabled ? "CRM sync is disabled" : "CRM sync completed");
      setStatus(result.bridgeDisabled ? "CRM sync is disabled; local-only mode is active." : "CRM sync completed.");
    }, runAudit ? "sync:audit" : "sync:now", runAudit ? "Refreshing..." : "Refreshing...");
  }

  async function runOne(staff = "") {
    await runBusy(staff ? `Asking ${staffProfile(staff).label} to handle one due item...` : "Running one due staff task...", async () => {
      const result = await api("/api/run-one", { method: "POST", body: JSON.stringify({ staff, maxItems: 1 }), timeoutMs: 140000 });
      showToast(result.message || "Runner finished");
      await loadDashboard(false, true);
    }, `run-one:${staff || "next"}`, staff ? "Running staff..." : "Running task...");
  }

  async function runLocalWorkerOnce() {
    await runBusy("Running one local worker item...", async () => {
      const result = await api("/api/local-worker/control", {
        method: "POST",
        body: JSON.stringify({ action: "run-once" }),
        timeoutMs: 180000,
      });
      const message = (result.result && (result.result.message || result.result.state)) || "Local worker finished";
      showToast(message);
      await loadDashboard(false, true);
    }, "local-worker:run-once", "Running worker...");
  }

  async function useTestWorkerCommand() {
    await runBusy("Configuring bundled local test worker...", async () => {
      const result = await api("/api/local-worker/control", {
        method: "POST",
        body: JSON.stringify({ action: "use-test-command" }),
        timeoutMs: 30000,
      });
      setDashboard(prev => ({ ...(prev || {}), localSync: { ...((prev && prev.localSync) || {}), localWorker: result.localWorker } }));
      showToast("Local test worker command configured");
      await loadDashboard(false, true);
    }, "local-worker:use-test-command", "Configuring...");
  }

  async function startProjectStepAction(plan, step) {
    if (!plan || !step) return;
    const action = step.action || {};
    await runBusy(`Starting ${step.stage || "project step"}...`, async () => {
      const result = await api("/api/project-step/action", {
        method: "POST",
        body: JSON.stringify({
          planId: plan.planId,
          stepId: step.stepId,
          sequence: step.sequence,
          createOutputDraft: true,
        }),
        timeoutMs: 90000,
      });
      showToast(result.alreadyExists ? "Project-step task already exists" : (result.message || `${action.actionLabel || "Step"} started`));
      await loadDashboard(false, true);
    }, `project-step:${plan.planId}:${step.stepId || step.sequence}`, action.actionLabel || "Starting...");
  }

  async function runAutopilotCycle() {
    await runBusy("Running KPI flow until blocked or complete...", async () => {
      const result = await api("/api/autopilot-control", { method: "POST", body: JSON.stringify({ action: "run-now", maxSteps: 8 }), timeoutMs: 240000 });
      setDashboard(result.dashboard);
      showToast(`KPI flow: ${(result.cycle && result.cycle.state) || "cycle complete"}`);
    }, "autopilot:run", "Running KPI...");
  }

  async function setAutopilot(enabled) {
    await runBusy(enabled ? "Starting daily autopilot..." : "Pausing daily autopilot...", async () => {
      const result = await api("/api/autopilot-control", { method: "POST", body: JSON.stringify({ action: enabled ? "start" : "pause" }) });
      setDashboard(prev => ({ ...(prev || {}), localSync: { ...((prev && prev.localSync) || {}), autopilot: result.autopilot } }));
      showToast(enabled ? "Autopilot started" : "Autopilot paused");
    }, enabled ? "autopilot:start" : "autopilot:pause", enabled ? "Starting..." : "Pausing...");
  }

  async function runEmailSafetyCheck(queueId = "") {
    await runBusy("Running email safety check...", async () => {
      if (queueId) await bridgeAction("verifyQueueAttachments", { queueId });
      else await bridgeAction("verifyConfiguredQueueAttachments", {});
      await loadDashboard(false, true);
    }, `email-safety:${queueId || "configured"}`, "Checking...");
  }

  async function approveEmail(queueId) {
    if (!queueId) return;
    await runBusy("Approving selected email row...", async () => {
      await bridgeAction("updateEmailQueueApproval", { queueId, approvalStatus: "Approved", approvedBy: "Command Center" });
      await loadDashboard(false, true);
    }, `approve-email:${queueId}`, "Approving...");
  }

  async function processQueueRow(queueId) {
    if (!queueId) return;
    await runBusy("Checking and processing selected email row...", async () => {
      await bridgeAction("processQueueRow", { queueId });
      await loadDashboard(false, true);
    }, `process-queue:${queueId || "all"}`, "Processing...");
  }

  async function snoozeTask(taskId, hours = 24) {
    await runBusy("Snoozing task...", async () => {
      await bridgeAction("snoozeAiStaffTask", { taskId, hours, reason: `Snoozed ${hours} hour(s) from Command Center.` });
      await loadDashboard(false, true);
    }, `snooze-task:${taskId}`, "Snoozing...");
  }

  async function reassignTask(taskId, assignedTo) {
    await runBusy("Reassigning task...", async () => {
      await bridgeAction("reassignAiStaffTask", { taskId, assignedTo, reason: `Reassigned to ${staffProfile(assignedTo).label} from Command Center.` });
      await loadDashboard(false, true);
    }, `reassign-task:${taskId}:${assignedTo}`, "Reassigning...");
  }

  async function snoozeFollowUp(followUpId, hours = 24) {
    await runBusy("Snoozing follow-up...", async () => {
      await bridgeAction("snoozeAiStaffFollowUp", { followUpId, hours, reason: `Snoozed ${hours} hour(s) from Command Center.` });
      await loadDashboard(false, true);
    }, `snooze-followup:${followUpId}`, "Snoozing...");
  }

  async function closeEntity(entityId) {
    const reason = window.prompt("Why should this entity be closed?", "Closed from Command Center.");
    if (!reason) return;
    await runBusy("Closing entity...", async () => {
      await bridgeAction("closeAiStaffEntity", { entityId, status: "No Further Action", reason });
      await loadDashboard(false, true);
    }, `close-entity:${entityId}`, "Closing...");
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      showToast("This browser does not support notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === "granted");
    showToast(permission === "granted" ? "Notifications enabled" : "Notifications not enabled");
  }

  function openWorkbook() {
    if (dashboard && dashboard.workbookUrl) window.open(dashboard.workbookUrl, "_blank", "noopener");
  }

  function openRef(kind, id) {
    if (kind === "applications") {
      setSelectedApplicationId(id);
      setView("application-detail");
    } else if (kind === "opportunities") {
      setSelectedOpportunityId(id);
      setView("opportunity-detail");
    }
  }

  function openUniversity(key) {
    setSelectedUniversityKey(key);
    setView("university-detail");
  }

  function openStaffProfile(staffId) {
    setSelectedExplorerStaffId(staffId || "AIstaff_Manager");
    setView("explorer");
  }

  function openTaskDialog(prefill = {}) {
    const assignedTo = prefill.assignedTo || prefill.staff || "AIstaff_Manager";
    const defaultTaskType = assignedTo === "AIstaff_Manager" ? "Manager Guidance" : "Research";
    setTaskDialog({
      assignedTo,
      taskType: prefill.taskType || defaultTaskType,
      taskCategory: prefill.taskCategory || taskCategory(prefill),
      entityId: prefill.entityId || "",
      relatedApplicationId: prefill.relatedApplicationId || prefill.applicationId || "",
      runAfter: "",
      dueAt: "",
      priority: "High",
      nextAction: prefill.nextAction || "",
    });
  }

  async function approveSkillUpdate(learningId) {
    if (!learningId) return;
    await runBusy("Approving staff learning...", async () => {
      const result = await api("/api/skill-update-approve", {
        method: "POST",
        body: JSON.stringify({ learningId, approvedBy: "Human_Iman" }),
      });
      showToast((result.learning && "Learning approved") || result.message || "Learning approved");
      await loadDashboard(false, true);
    }, `approve-learning:${learningId}`, "Approving...");
  }

  async function submitTask(event) {
    event.preventDefault();
    const data = taskDialog || {};
    const completionCriteria = "Task completed or blocked with clear result.";
    const needsCodex = taskNeedsCodex({ ...data, completionCriteria });
    const isManagerMessage = data.assignedTo === "AIstaff_Manager" && data.taskType === "Manager Guidance";
    await runBusy("Saving task...", async () => {
      if (isManagerMessage) {
        const result = await api("/api/manager-request", {
          method: "POST",
          body: JSON.stringify({
            message: data.nextAction,
            entityId: data.entityId,
            relatedApplicationId: data.relatedApplicationId,
            priority: data.priority,
            runAfter: data.runAfter || new Date().toISOString(),
            dueAt: data.dueAt || "",
          }),
          timeoutMs: 90000,
        });
        setTaskDialog(null);
        showToast((result.manager && result.manager.decision && result.manager.decision.routeStaff && result.manager.decision.routeStaff !== "AIstaff_Manager")
          ? `Alex routed this to ${staffProfile(result.manager.decision.routeStaff).label}.`
          : "Alex received your message.");
        await loadDashboard(false, true);
        return;
      }
      await bridgeAction("appendAiStaffTask", {
        taskType: data.taskType,
        taskCategory: data.taskCategory,
        assignedTo: data.assignedTo,
        createdBy: "Command Center",
        sourceStaff: "Human_Iman",
        targetStaff: data.assignedTo,
        entityId: data.entityId,
        relatedApplicationId: data.relatedApplicationId,
        priority: data.priority,
        runAfter: data.runAfter || new Date().toISOString(),
        dueAt: data.dueAt || "",
        nextAction: data.nextAction,
        completionCriteria,
        successStatus: `${data.taskType} Done`,
        failureStatus: `Blocked - ${data.taskType} Issue`,
        status: needsCodex ? "Waiting for Codex Worker" : "Queued",
        resultNotes: needsCodex ? "Created from Command Center as a Codex Worker task. Apps Script will not attempt this research/writing work automatically." : "",
      });
      setTaskDialog(null);
      await loadDashboard(false, true);
    }, "task:save", "Saving...");
  }

  async function submitDecision(event) {
    event.preventDefault();
    const data = decisionDialog || {};
    await runBusy("Saving decision...", async () => {
      await bridgeAction("appendAiStaffDecision", {
        decisionType: data.decisionType || "Task Decision",
        recommendation: data.recommendation || "",
        reason: data.reason || "",
        evidence: data.evidence || "",
        approvalNeeded: "Yes",
        approvalStatus: data.approvalStatus || "Approved",
        userResponse: "Recorded from Command Center",
      });
      setDecisionDialog(null);
      await loadDashboard(false, true);
    }, "decision:save", "Saving...");
  }

  const activeNav = ["university-detail", "application-detail", "opportunity-detail"].includes(view) ? "applications" : view;
  const autopilot = (dashboard && dashboard.localSync && dashboard.localSync.autopilot) || {};
  const autopilotEnabled = autopilot.enabled !== false;
  const pageHeader = pageHeaderForView(view, labels, {
    applicationId: selectedApplicationId,
    opportunityId: selectedOpportunityId,
    universityName: (UNIVERSITY_REFERENCES[selectedUniversityKey] && UNIVERSITY_REFERENCES[selectedUniversityKey].name) || friendlyId(selectedUniversityKey),
  });
  document.title = `${pageHeader.title} - ${APP_NAME}`;
  window.__SWISS_PLANNER_ACTION_STATE__ = { busy, actionKey: busyAction, label: busyLabel || "Running..." };

  return h("div", { className: cn("app-shell react-shell", materialReady && "material-web-enhanced", sidebarCollapsed && "sidebar-collapsed") },
    h("aside", { className: "sidebar" },
      h("div", { className: "brand-block" },
        h("div", { className: "brand-mark" }, APP_MARK),
        h("div", { className: "brand-copy" }, h("p", { className: "eyebrow" }, APP_SHORT_NAME), h("h1", null, "AI Department")),
        h(Button, { className: "sidebar-toggle", variant: "ghost", size: "icon", onClick: () => setSidebarCollapsed(!sidebarCollapsed), title: sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar", "aria-label": sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar" }, sidebarCollapsed ? icon("list") : icon("x"))
      ),
      h("nav", { className: "side-nav", "aria-label": "Dashboard navigation" }, NAV_ITEMS.map(([key, label]) =>
        h("button", { key, className: cn("nav-item", activeNav === key && "active"), onClick: () => setView(key), title: label, "aria-label": label },
          h("span", { className: "nav-icon" }, icon(NAV_ICONS[key] || "file")),
          h("span", { className: "nav-label" }, label),
          key === "work" ? h("span", { className: cn("nav-count", Number(summary.openTasks || 0) === 0 && "is-empty") }, Number(summary.openTasks || 0)) : null
        )
      )),
      h("div", { className: "sidebar-footer" }, h("span", { className: "status-dot" }), h("span", null, "Local command center"))
    ),
    h("main", { className: "workspace" },
      h("header", { className: "topbar" },
        h("div", { className: "topbar-title-block" },
          h("nav", { className: "topbar-breadcrumb", "aria-label": "Breadcrumb" },
            pageHeader.crumbs.map((crumb, index) => h(Fragment, { key: `${crumb}-${index}` },
              h("span", null, crumb),
              index < pageHeader.crumbs.length - 1 ? h("span", { className: "breadcrumb-separator", "aria-hidden": "true" }, "/") : null
            ))
          ),
          h("h2", null, pageHeader.title)
        ),
        h("div", { className: "top-actions" },
          h(Button, { onClick: () => openTaskDialog({ assignedTo: "AIstaff_Manager", taskType: "Manager Guidance", taskCategory: "Manager Guidance" }), title: "Send a natural-language instruction to Alex. Alex will route specialist work safely." }, icon("send"), "Message Alex")
        )
      ),
      h("section", { className: "status-line" }, status),
      !dashboard ? h(LoadingView) : h(Fragment, null,
        view === "overview" ? h(OverviewView, { dashboard, summary, runOne, runLocalWorkerOnce, useTestWorkerCommand, openTaskDialog, runAutopilotCycle, setAutopilot, autopilotEnabled, setView }) : null,
        view === "wikis" ? h(WikisView, { setView, openTaskDialog }) : null,
        view === "platform-admin" ? h(PlatformAdminView, { dashboard }) : null,
        view === "explorer" ? h(DepartmentExplorerView, { dashboard, runOne, openTaskDialog, setView, selectedStaffRequest: selectedExplorerStaffId }) : null,
        view === "applications" ? h(ApplicationsView, { rows: dashboard.applications || [], labels, filters: applicationFilters, setFilters: setApplicationFilters, viewMode: applicationsView, setViewMode: setApplicationsView, runOne, openTaskDialog, openRef, openUniversity }) : null,
        view === "work" ? h(WorkView, { dashboard, tasks: allTasks, labels, filters: taskFilters, setFilters: setTaskFilters, runOne, startProjectStepAction, snoozeTask, reassignTask, snoozeFollowUp, processQueueRow, approveEmail, runEmailSafetyCheck, setDecisionDialog, openTaskDialog, openRef, openUniversity, openStaffProfile }) : null,
        view === "email" ? h(EmailView, { dashboard, processQueueRow, approveEmail, runEmailSafetyCheck, openRef, openUniversity }) : null,
        view === "reports" ? h(ReportsView, { dashboard, approveSkillUpdate, runOne, snoozeFollowUp, setView, openTaskDialog, openRef }) : null,
        view === "settings" ? h(SettingsView, { dashboard }) : null,
        view === "university-detail" ? h(UniversityDetail, { dashboard, universityKey: selectedUniversityKey, setView, openRef }) : null,
        view === "application-detail" ? h(ApplicationDetail, { dashboard, labels, appId: selectedApplicationId, setView, runOne, openTaskDialog, openRef, openUniversity }) : null,
        view === "opportunity-detail" ? h(OpportunityDetail, { dashboard, labels, opportunityId: selectedOpportunityId, setView, openRef, openUniversity }) : null
      )
    ),
    taskDialog ? h(TaskDialog, { value: taskDialog, setValue: setTaskDialog, onClose: () => setTaskDialog(null), onSubmit: submitTask, staff: dashboard ? dashboard.staff || [] : [] }) : null,
    decisionDialog ? h(DecisionDialog, { value: decisionDialog, setValue: setDecisionDialog, onClose: () => setDecisionDialog(null), onSubmit: submitDecision }) : null,
    h("div", { className: cn("toast", toast && "show") }, toast)
  );
}

function LoadingView() {
  return h("section", { className: "metrics" }, [1, 2, 3, 4].map(i => h("div", { key: i, className: "metric skeleton" }, h("span", { className: "value" }, " "), h("span", { className: "label" }, "Loading"))));
}

function PlatformAdminView({ dashboard }) {
  const [tab, setTab] = useState("installedDepartments");
  const [payload, setPayload] = useState({ loading: true, error: "", catalogs: null, manifest: null });
  const fabric = fabricOrFallback(dashboard);
  const fallbackCatalogs = {
    installedDepartments: fabric.departments || [],
    departmentBlueprints: fabric.departmentTemplates || [],
    staffTemplates: fabric.staffArchetypes || [],
    laneAdapters: fabric.lanes || [],
    scopedSkills: [...(fabric.platformSafetySkills || []), ...(fabric.departmentSkills || []), ...(fabric.staffTemplateSkills || []), ...(fabric.laneAdapterSkills || [])],
    workflowTemplates: fabric.recipes || [],
    senderIdentities: [],
  };
  const catalogs = (payload.catalogs && payload.catalogs.catalogs) || fallbackCatalogs;
  const summary = (payload.catalogs && payload.catalogs.summary) || Object.fromEntries(Object.entries(catalogs).map(([key, rows]) => [key, (rows || []).length]));
  const validation = (payload.catalogs && payload.catalogs.validation) || { errors: fabric.errors || [], errorCount: (fabric.errors || []).length };
  const tabs = [
    ["installedDepartments", "Installed Departments"],
    ["staffTemplates", "Staff Templates"],
    ["laneAdapters", "Lane Adapters"],
    ["scopedSkills", "Skill Catalog"],
    ["workflowTemplates", "Workflow Templates"],
    ["departmentBlueprints", "Department Blueprints"],
    ["senderIdentities", "Sender Identities"],
    ["exportManifest", "Export Manifests"],
  ];

  async function loadPlatformAdmin() {
    setPayload(current => ({ ...current, loading: true, error: "" }));
    try {
      const [catalogResult, manifestResult] = await Promise.all([
        api("/api/platform-admin/catalogs"),
        api("/api/platform-admin/export-manifest"),
      ]);
      setPayload({ loading: false, error: "", catalogs: catalogResult, manifest: manifestResult.manifest || null });
    } catch (error) {
      setPayload(current => ({ ...current, loading: false, error: error.message || String(error) }));
    }
  }

  useEffect(() => {
    loadPlatformAdmin();
  }, []);

  return h("section", { className: "platform-admin-view chart-enter" },
    h(Card, { className: "settings-hero" },
      h(CardHeader, {
        eyebrow: "Platform Admin / Developer Control Plane",
        title: "AI Department Template Governance",
        description: "Reusable blueprints, staff templates, lane adapters, scoped skills, workflow templates, and export manifests are governed here. Workspace users configure installed runtime instances elsewhere.",
        action: h("div", { className: "panel-actions" },
          h(Badge, { tone: validation.errorCount ? "danger" : "success" }, validation.errorCount ? `${validation.errorCount} validation issue(s)` : "Zero fabric errors"),
          h(Button, { actionKey: "platform-admin:refresh", variant: "outline", onClick: loadPlatformAdmin }, icon("refresh"), "Refresh")
        )
      }),
      h(CardContent, null,
        payload.error ? h("div", { className: "form-error" }, payload.error) : null,
        h("div", { className: "designer-summary-strip" },
          h("span", null, h("strong", null, summary.installedDepartments || 0), "Installed"),
          h("span", null, h("strong", null, summary.departmentBlueprints || 0), "Blueprints"),
          h("span", null, h("strong", null, summary.staffTemplates || 0), "Staff templates"),
          h("span", null, h("strong", null, summary.laneAdapters || 0), "Lane adapters"),
          h("span", null, h("strong", null, summary.scopedSkills || 0), "Scoped skills"),
          h("span", null, h("strong", null, summary.workflowTemplates || 0), "Workflows")
        ),
        h("div", { className: "settings-tabs", role: "tablist", "aria-label": "Platform Admin catalogs" }, tabs.map(([key, label]) =>
          h("button", { key, type: "button", role: "tab", "aria-selected": tab === key, className: cn("settings-tab", tab === key && "active"), onClick: () => setTab(key) },
            h("span", null, label),
            key !== "exportManifest" ? h("small", null, summary[key] || 0) : null
          )
        ))
      )
    ),
    h(CreateDepartmentPanel, { catalogs, onCreated: loadPlatformAdmin }),
    tab === "exportManifest"
      ? h(PlatformExportManifestPanel, { manifest: payload.manifest })
      : tab === "staffTemplates"
        ? h(PlatformStaffTemplatesPanel, { rows: catalogs.staffTemplates || [], catalogs, loading: payload.loading, onRefresh: loadPlatformAdmin })
      : h(PlatformCatalogPanel, { rows: catalogs[tab] || [], catalogKey: tab, loading: payload.loading })
  );
}

function CreateDepartmentPanel({ catalogs, onCreated }) {
  const blueprints = catalogs.departmentBlueprints || [];
  const installed = catalogs.installedDepartments || [];
  const defaultBlueprint = (blueprints.find(row => row.id === "template_sales_research_department_sample") || blueprints[0] || {}).id || "";
  const [form, setForm] = useState({
    sourceTemplateId: defaultBlueprint,
    departmentLabel: "",
    departmentPurpose: "",
    projectTypes: "",
    aiManagerAlias: "Alex",
  });
  const [state, setState] = useState({ busy: false, error: "", message: "", created: null });

  useEffect(() => {
    if (!form.sourceTemplateId && defaultBlueprint) {
      setForm(current => ({ ...current, sourceTemplateId: defaultBlueprint }));
    }
  }, [defaultBlueprint]);

  function update(key, value) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setState({ busy: true, error: "", message: "", created: null });
    try {
      const result = await api("/api/platform-admin/create-department", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setState({
        busy: false,
        error: "",
        message: result.alreadyExists ? "This department already exists in the local fabric." : "Department installed locally.",
        created: result.department || null,
      });
      if (!result.alreadyExists) {
        setForm(current => ({ ...current, departmentLabel: "", departmentPurpose: "", projectTypes: "" }));
      }
      await onCreated();
    } catch (error) {
      setState({ busy: false, error: error.message || String(error), message: "", created: null });
    }
  }

  return h(Card, { className: "designer-section-card create-department-panel" },
    h(CardHeader, {
      eyebrow: "Create / Clone Department",
      title: "Install A New Local AI Department",
      description: "Clone a governed blueprint into a workspace department instance. Staff templates, lane adapters, and locked safety skills remain governed by Platform Admin.",
      action: h(Badge, { tone: "neutral" }, `${installed.length || 0} installed`)
    }),
    h(CardContent, null,
      h("form", { className: "create-department-form", onSubmit: submit },
        h(Field, { label: "Source blueprint" },
          h(Select, { value: form.sourceTemplateId, onChange: event => update("sourceTemplateId", event.target.value) },
            blueprints.map(row => h("option", { key: row.id, value: row.id }, row.label || row.id))
          )
        ),
        h(Field, { label: "Department name" },
          h(Input, {
            value: form.departmentLabel,
            onChange: event => update("departmentLabel", event.target.value),
            placeholder: "Example: Vendor Compliance AI Department",
            required: true,
          })
        ),
        h(Field, { label: "AI manager alias" },
          h(Input, {
            value: form.aiManagerAlias,
            onChange: event => update("aiManagerAlias", event.target.value),
            placeholder: "Alex",
          })
        ),
        h(Field, { label: "Project types" },
          h(Input, {
            value: form.projectTypes,
            onChange: event => update("projectTypes", event.target.value),
            placeholder: "Lead review, supplier qualification, compliance package",
          })
        ),
        h(Field, { label: "Purpose", className: "create-department-wide" },
          h(Textarea, {
            value: form.departmentPurpose,
            onChange: event => update("departmentPurpose", event.target.value),
            rows: 4,
            placeholder: "What work should this AI Department manage?",
          })
        ),
        h("div", { className: "create-department-actions create-department-wide" },
          h(Button, { type: "submit", pending: state.busy, pendingLabel: "Creating..." }, icon("plus"), "Create department"),
          state.message ? h(Badge, { tone: "success" }, state.message) : null,
          state.error ? h("span", { className: "form-error" }, state.error) : null
        )
      ),
      state.created ? h("div", { className: "designer-status" },
        `${state.created.label || state.created.id} is installed. ID: ${state.created.id}`
      ) : null,
      installed.length ? h("div", { className: "installed-department-list" }, installed.slice(0, 6).map(row =>
        h("article", { key: row.id, className: "installed-department-row" },
          h("div", null,
            h("strong", null, row.label || row.id),
            h("small", null, `${row.status || "Active"} | Blueprint: ${row.blueprintId || row.templateId || "not set"}`)
          ),
          h(AccessBadge, { value: row.accessSummary || "workspace_editable" })
        )
      )) : null
    )
  );
}

function PlatformStaffTemplatesPanel({ rows, catalogs, loading, onRefresh }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [detailTab, setDetailTab] = useState("overview");
  const [draft, setDraft] = useState(null);
  const [saveState, setSaveState] = useState({ busy: false, error: "", message: "" });
  const filteredRows = (rows || []).filter(row => {
    const blob = [row.label, row.id, row.roleType, ...(row.defaultDepartmentFamilies || []), row.status, row.riskTier].join(" ").toLowerCase();
    return !query.trim() || blob.includes(query.trim().toLowerCase());
  });
  const selected = (rows || []).find(row => row.id === selectedId) || filteredRows[0] || rows[0] || null;
  const tabs = [
    ["overview", "Overview"],
    ["capabilities", "Capabilities"],
    ["tools", "Tools & Connections"],
    ["datasets", "Datasets"],
    ["instructions", "Instructions"],
    ["input", "Input Contract"],
    ["output", "Output Contract"],
    ["qa", "QA & Guardrails"],
    ["retry", "Retry & Errors"],
    ["usage", "Workflow Usage"],
    ["versions", "Versioning"],
  ];

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected && selected.id]);

  useEffect(() => {
    setDraft(selected ? jsonCloneForUi(selected) : null);
    setSaveState({ busy: false, error: "", message: "" });
  }, [selectedId, rows.length]);

  function updateDraft(key, value) {
    setDraft(current => ({ ...(current || selected || {}), [key]: value }));
  }

  function updateDraftList(key, value) {
    updateDraft(key, String(value || "").split(/[,;\n]+/).map(item => item.trim()).filter(Boolean));
  }

  function cleanStaffTemplateForSave(value) {
    const allowed = [
      "id", "label", "purpose", "preferredModel", "allowedPluginFamilies", "requiresApprovalFor", "outputContract", "stopConditions", "adminNotes",
      "workspaceEditable", "status", "version", "roleType", "defaultDepartmentFamilies", "riskTier", "whenToUse",
      "defaultStageResponsibility", "supportedWorkflowStages", "capabilitiesAllowed", "capabilitiesNotAllowed", "supportedTaskTypes",
      "requiredLanesTools", "requiredDatasets", "optionalDatasets", "workspaceProvidedDatasets", "missingDataBehavior",
      "instructionLayers", "inputContract", "outputContractDetail", "qaGuardrails", "retryPolicy", "versionLog", "validationState"
    ];
    return Object.fromEntries(allowed.filter(key => value && value[key] !== undefined).map(key => [key, value[key]]));
  }

  async function saveDraft() {
    if (!draft || !draft.id) return;
    setSaveState({ busy: true, error: "", message: "" });
    try {
      await api("/api/fabric-object", {
        method: "POST",
        body: JSON.stringify({
          collection: "staffArchetypes",
          item: cleanStaffTemplateForSave(draft),
          reason: "Updated from Platform Admin staff template designer.",
          updatedBy: "Platform Admin",
        }),
      });
      setSaveState({ busy: false, error: "", message: "Saved as staff template draft." });
      await onRefresh();
    } catch (error) {
      setSaveState({ busy: false, error: error.message || String(error), message: "" });
    }
  }

  if (loading && !rows.length) {
    return h(Card, { className: "designer-section-card" }, h(CardContent, null, h("p", { className: "muted" }, "Loading staff templates...")));
  }
  if (!selected || !draft) {
    return h(Card, { className: "designer-section-card" }, h(CardContent, null, h(EmptyState, { title: "No staff templates", body: "Create staff archetypes in the capability fabric to manage reusable AI Staff roles." })));
  }

  const usageCount = (selected.workflowUsage || []).length;
  const validation = selected.validationState || {};
  const missingCount = ["missingTools", "missingDatasets", "missingSchemas", "missingGuardrails"].reduce((total, key) => total + ((validation[key] || []).length || 0), 0);

  return h(Card, { className: "designer-section-card staff-template-admin" },
    h(CardHeader, {
      eyebrow: "/platform-admin/ai-staff-templates",
      title: "AI Staff Templates",
      description: "Admin-governed reusable staff roles. Workspace users later inherit only the safe runtime preferences exposed by each template.",
      action: h("div", { className: "panel-actions" },
        h(Badge, { tone: missingCount ? "warn" : "success" }, missingCount ? `${missingCount} validation note(s)` : "Template valid"),
        h(Button, { variant: "secondary", onClick: saveDraft, pending: saveState.busy, pendingLabel: "Saving..." }, icon("save"), "Save admin draft")
      )
    }),
    h(CardContent, null,
      saveState.error ? h("div", { className: "form-error" }, saveState.error) : null,
      saveState.message ? h("div", { className: "designer-status" }, saveState.message) : null,
      h("div", { className: "staff-template-layout" },
        h("aside", { className: "staff-template-list" },
          h(Field, { label: "Search templates" }, h(Input, { value: query, onChange: event => setQuery(event.target.value), placeholder: "Outreach, QA, CRM, analyst..." })),
          h("div", { className: "staff-template-cards" }, filteredRows.map(row =>
            h("button", { key: row.id, type: "button", className: cn("staff-template-card", row.id === selected.id && "active"), onClick: () => { setSelectedId(row.id); setDetailTab("overview"); } },
              h("span", { className: "staff-card-topline" },
                h("strong", null, row.label || row.id),
                h(Badge, { tone: row.status === "Deprecated" ? "danger" : row.status === "Draft" ? "warn" : "success" }, row.status || "Draft")
              ),
              h("small", null, row.roleType || "Staff"),
              h("span", { className: "staff-card-meta" }, (row.defaultDepartmentFamilies || []).slice(0, 3).join(", ") || "Operations"),
              h("span", { className: "staff-card-footer" },
                h("span", null, `v${row.version || "1.0.0"}`),
                h("span", null, `${row.riskTier || "Medium"} risk`)
              )
            )
          ))
        ),
        h("section", { className: "staff-template-detail" },
          h("div", { className: "staff-detail-head" },
            h("div", null,
              h("p", { className: "eyebrow" }, selected.id),
              h("h3", null, draft.label || selected.label),
              h("p", null, draft.purpose || selected.purpose)
            ),
            h("div", { className: "staff-detail-badges" },
              h(AccessBadge, { value: selected.accessSummary || "platform_locked" }),
              h(Badge, null, selected.roleType || "Staff"),
              h(Badge, { tone: (selected.riskTier || "").toLowerCase() === "high" ? "warn" : "neutral" }, `${selected.riskTier || "Medium"} risk`),
              h(Badge, { tone: usageCount ? "ok" : "neutral" }, `Used by ${usageCount}`)
            )
          ),
          h("div", { className: "staff-detail-tabs", role: "tablist", "aria-label": "Staff template detail tabs" }, tabs.map(([key, label]) =>
            h("button", { key, type: "button", role: "tab", className: cn("staff-detail-tab", detailTab === key && "active"), "aria-selected": detailTab === key, onClick: () => setDetailTab(key) }, label)
          )),
          h("div", { className: "staff-detail-body" },
            detailTab === "overview" ? h(StaffTemplateOverviewTab, { draft, updateDraft, updateDraftList }) : null,
            detailTab === "capabilities" ? h(StaffTemplateCapabilitiesTab, { draft }) : null,
            detailTab === "tools" ? h(StaffTemplateToolsTab, { draft }) : null,
            detailTab === "datasets" ? h(StaffTemplateDatasetsTab, { draft }) : null,
            detailTab === "instructions" ? h(StaffTemplateInstructionsTab, { draft }) : null,
            detailTab === "input" ? h(StaffTemplateContractTab, { title: "Input Contract", contract: draft.inputContract }) : null,
            detailTab === "output" ? h(StaffTemplateContractTab, { title: "Output Contract", contract: draft.outputContractDetail || { requiredSections: draft.outputContract } }) : null,
            detailTab === "qa" ? h(StaffTemplateContractTab, { title: "QA & Guardrails", contract: draft.qaGuardrails }) : null,
            detailTab === "retry" ? h(StaffTemplateContractTab, { title: "Retry & Error Handling", contract: draft.retryPolicy }) : null,
            detailTab === "usage" ? h(StaffTemplateUsageTab, { draft, catalogs }) : null,
            detailTab === "versions" ? h(StaffTemplateVersionTab, { draft }) : null
          )
        )
      )
    )
  );
}

function jsonCloneForUi(value) {
  try {
    return JSON.parse(JSON.stringify(value || {}));
  } catch (error) {
    return { ...(value || {}) };
  }
}

function listForUi(value) {
  return Array.isArray(value) ? value.filter(Boolean) : String(value || "").split(/[,;\n]+/).map(item => item.trim()).filter(Boolean);
}

function StaffTemplateOverviewTab({ draft, updateDraft, updateDraftList }) {
  return h("div", { className: "staff-tab-grid" },
    h(Field, { label: "Staff name" }, h(Input, { value: draft.label || "", onChange: event => updateDraft("label", event.target.value) })),
    h(Field, { label: "Role type" }, h(Select, { value: draft.roleType || "Staff", onChange: event => updateDraft("roleType", event.target.value) },
      ["Manager", "Staff", "QA", "Tool Operator"].map(value => h("option", { key: value, value }, value))
    )),
    h(Field, { label: "Status" }, h(Select, { value: draft.status || "Draft", onChange: event => updateDraft("status", event.target.value) },
      ["Draft", "Review", "Approved", "Active", "Deprecated"].map(value => h("option", { key: value, value }, value))
    )),
    h(Field, { label: "Version" }, h(Input, { value: draft.version || "", onChange: event => updateDraft("version", event.target.value), placeholder: "1.0.0" })),
    h(Field, { label: "Risk tier" }, h(Select, { value: draft.riskTier || "Medium", onChange: event => updateDraft("riskTier", event.target.value) },
      ["Low", "Medium", "High"].map(value => h("option", { key: value, value }, value))
    )),
    h(Field, { label: "Default department families" }, h(Input, { value: listForUi(draft.defaultDepartmentFamilies).join(", "), onChange: event => updateDraftList("defaultDepartmentFamilies", event.target.value), placeholder: "Origination, Supplier Development" })),
    h(Field, { label: "Description", className: "staff-wide" }, h(Textarea, { value: draft.purpose || "", rows: 3, onChange: event => updateDraft("purpose", event.target.value) })),
    h(Field, { label: "When to use this staff", className: "staff-wide" }, h(Textarea, { value: draft.whenToUse || "", rows: 3, onChange: event => updateDraft("whenToUse", event.target.value) })),
    h(Field, { label: "Default stage responsibility", className: "staff-wide" }, h(Textarea, { value: draft.defaultStageResponsibility || "", rows: 3, onChange: event => updateDraft("defaultStageResponsibility", event.target.value) })),
    h(Field, { label: "Supported workflow stages", className: "staff-wide" }, h(Input, { value: listForUi(draft.supportedWorkflowStages).join(", "), onChange: event => updateDraftList("supportedWorkflowStages", event.target.value) })),
    h(Field, { label: "Owner/admin notes", className: "staff-wide" }, h(Textarea, { value: draft.adminNotes || "", rows: 3, onChange: event => updateDraft("adminNotes", event.target.value), placeholder: "Internal notes for platform admins." }))
  );
}

function StaffTemplateCapabilitiesTab({ draft }) {
  return h("div", { className: "staff-info-grid" },
    h(StaffInfoPanel, { title: "Allowed Capabilities", items: draft.capabilitiesAllowed || draft.outputContract }),
    h(StaffInfoPanel, { title: "Not Allowed / Stop Conditions", items: draft.capabilitiesNotAllowed || draft.stopConditions }),
    h(StaffInfoPanel, { title: "Supported Task Types", items: draft.supportedTaskTypes || draft.outputContract }),
    h(StaffInfoPanel, { title: "Approval Required For", items: draft.requiresApprovalFor })
  );
}

function StaffTemplateToolsTab({ draft }) {
  const tools = draft.requiredLanesTools || [];
  return h("div", { className: "staff-table-list" },
    tools.length ? tools.map((tool, index) => h("article", { key: `${tool.family || index}`, className: "staff-tool-row" },
      h("div", null, h("strong", null, tool.family || "Tool family"), h("small", null, tool.providerResolutionRule || "Provider resolved by active workspace connection.")),
      h(Badge, { tone: tool.requirement === "required" ? "warn" : "neutral" }, tool.requirement || "optional"),
      h(Badge, { tone: String(tool.status || "").startsWith("active") ? "success" : "neutral" }, tool.status || "inactive"),
      h("p", null, tool.fallbackBehavior || "Fallback to manager routing.")
    )) : h(EmptyState, { title: "No tools configured", body: "Add allowed tool families to define lane adapter requirements." })
  );
}

function StaffTemplateDatasetsTab({ draft }) {
  return h("div", { className: "staff-info-grid" },
    h(StaffInfoPanel, { title: "Required Datasets", items: draft.requiredDatasets }),
    h(StaffInfoPanel, { title: "Optional Datasets", items: draft.optionalDatasets }),
    h(StaffInfoPanel, { title: "Workspace-Provided Datasets", items: draft.workspaceProvidedDatasets }),
    h("article", { className: "staff-info-panel" }, h("h4", null, "Missing-Data Behavior"), h("p", null, draft.missingDataBehavior || "Ask AI Manager to request missing input."))
  );
}

function StaffTemplateInstructionsTab({ draft }) {
  return h("div", { className: "staff-table-list" }, (draft.instructionLayers || []).map(layer =>
    h("article", { key: layer.layer, className: "instruction-layer-row" },
      h("div", null, h("strong", null, layer.layer), h("p", null, layer.summary)),
      h(AccessBadge, { value: layer.access })
    )
  ));
}

function StaffTemplateContractTab({ title, contract }) {
  return h("div", { className: "staff-contract-panel" },
    h("h4", null, title),
    h("pre", { className: "manifest-preview compact" }, jsonPretty(contract || {}).slice(0, 7000))
  );
}

function StaffTemplateUsageTab({ draft }) {
  const usage = draft.workflowUsage || [];
  return h("div", { className: "staff-table-list" },
    h("article", { className: "staff-impact-panel" },
      h("h4", null, "Used By Impact"),
      h("p", null, usage.length ? "Review these dependencies before changing the template." : "No current department blueprint usage found."),
      h(Badge, { tone: usage.length ? "warn" : "neutral" }, `${usage.length} dependency row(s)`)
    ),
    usage.map(row => h("article", { key: `${row.blueprintId}-${(row.staffProfiles || []).join("-")}`, className: "staff-tool-row" },
      h("div", null, h("strong", null, row.blueprintLabel || row.blueprintId), h("small", null, row.blueprintId)),
      h("p", null, `Staff profiles: ${(row.staffProfiles || []).join(", ")}`),
      h(Badge, null, row.usage || "Assigned")
    ))
  );
}

function StaffTemplateVersionTab({ draft }) {
  return h("div", { className: "staff-table-list" },
    (draft.versionLog || []).map((row, index) => h("article", { key: `${row.version}-${index}`, className: "staff-tool-row" },
      h("div", null, h("strong", null, `Version ${row.version || draft.version || "1.0.0"}`), h("small", null, row.changedBy || "Platform Admin")),
      h(Badge, { tone: row.status === "Deprecated" ? "danger" : row.status === "Draft" ? "warn" : "success" }, row.status || draft.status || "Draft"),
      h("p", null, row.summary || "No migration notes.")
    )),
    h("article", { className: "staff-impact-panel" },
      h("h4", null, "Publish Workflow"),
      h("p", null, "Draft -> Review -> Approved -> Active. Deprecated versions remain inspectable for departments still using them.")
    )
  );
}

function StaffInfoPanel({ title, items }) {
  const values = listForUi(items);
  return h("article", { className: "staff-info-panel" },
    h("h4", null, title),
    values.length ? h("ul", null, values.map(item => h("li", { key: item }, item))) : h("p", { className: "muted" }, "None configured.")
  );
}

function PlatformCatalogPanel({ rows, catalogKey, loading }) {
  const titles = {
    installedDepartments: ["AiDepartmentInstance", "Installed Departments"],
    departmentBlueprints: ["AiDepartmentBlueprint", "Department Blueprints"],
    staffTemplates: ["AiStaffTemplate", "Staff Templates"],
    laneAdapters: ["AiLaneAdapter", "Lane / Tool Adapters"],
    scopedSkills: ["AiScopedSkillDefinition", "Scoped Skill Catalog"],
    workflowTemplates: ["AiWorkflowTemplate", "Workflow Templates"],
    senderIdentities: ["AiSenderIdentity", "Sender Identities"],
  };
  const [dtoType, title] = titles[catalogKey] || ["AiCatalogObject", catalogKey];
  return h(Card, { className: "designer-section-card" },
    h(CardHeader, { eyebrow: dtoType, title, description: "Read/export/review first. Locked catalog internals are platform-owned; safe client customization belongs in Workspace Settings or Department Explorer." }),
    h(CardContent, null,
      loading ? h("p", { className: "muted" }, "Loading catalog DTOs...") : null,
      rows.length ? h("div", { className: "designer-object-grid platform-catalog-grid" }, rows.map(row =>
        h("article", { className: cn("designer-object-card", (row.locked || row.accessSummary === "platform_locked") && "is-locked"), key: row.id || row.label },
          h("div", { className: "designer-object-head" },
            h("div", null,
              h("p", { className: "eyebrow" }, row.dtoType || dtoType),
              h("h3", null, row.label || row.name || row.id),
              row.id ? h("small", null, row.id) : null
            ),
            h(AccessBadge, { value: row.accessSummary || (row.locked ? "platform_locked" : "department_editable") })
          ),
          h("p", { className: "designer-object-summary" }, shortText(row.summary || row.purpose || row.laneRule || row.providerRulesOwnedBy || row.communicationModel || "", 240)),
          h(DetailList, { rows: [
            { label: "Owner", value: row.ownerStaff ? h(StaffChip, { staffId: row.ownerStaff }) : row.owner || row.ownerLayer || row.providerRulesOwnedBy || "Platform Admin", raw: Boolean(row.ownerStaff) },
            { label: "Editable", value: row.workspaceEditable === false ? "No" : "Yes" },
            { label: "Field access", value: Object.entries(row.fieldAccess || {}).slice(0, 5).map(([key, value]) => `${key}: ${value}`).join("; "), length: 220 },
          ] }),
          row.allowedPluginFamilies ? h("div", { className: "overview-meta-row" }, row.allowedPluginFamilies.slice(0, 5).map(item => h("span", { key: item }, item))) : null
        )
      )) : h(EmptyState, { title: "No catalog rows", body: "This catalog is empty in the current local fabric." })
    )
  );
}

function PlatformExportManifestPanel({ manifest }) {
  return h(Card, { className: "designer-section-card" },
    h(CardHeader, { eyebrow: "Export Manifest", title: "Reusable Department Package", description: "JSON package for blueprints, staff templates, lane adapters, scoped skills, workflow templates, workspace profile, and validation state." }),
    h(CardContent, null,
      manifest ? h(Fragment, null,
        h(DetailList, { rows: [
          { label: "Manifest type", value: manifest.manifestType },
          { label: "Generated", value: fmtDate(manifest.generatedAt) },
          { label: "Runtime", value: (manifest.version || {}).runtimeMode },
          { label: "External engine", value: ((manifest.orchestrationDecision || {}).externalEngine || "Deferred") },
        ] }),
        h("pre", { className: "manifest-preview" }, jsonPretty(manifest).slice(0, 9000))
      ) : h(EmptyState, { title: "Manifest not loaded", body: "Refresh Platform Admin to generate the local export manifest." })
    )
  );
}

function OverviewView({ dashboard, summary, runOne, runLocalWorkerOnce, useTestWorkerCommand, openTaskDialog, runAutopilotCycle, setAutopilot, autopilotEnabled, setView }) {
  const [activeTab, setActiveTab] = useState("home");
  const sync = dashboard.localSync || {};
  const alexOpenThreads = (((dashboard.threadsSummary || {}).byStaff || {}).AIstaff_Manager || {}).open || 0;
  const activeLeads = summary.activeEntities || (dashboard.applications || []).length || 0;
  const blockedCount = (summary.blockedEmails || 0) + (summary.overdueTasks || 0) + (summary.overdueFollowUps || 0);
  const tabs = [
    ["home", "AI Department Home"],
    ["howTo", "How to work with the department"],
    ["department", "Department operating model"],
    ["runtime", "Automation runtime"],
  ];
  return h("section", { className: "overview-landing" },
    h("div", { className: "overview-hero" },
      h("div", { className: "overview-hero-copy" },
        h("p", { className: "eyebrow" }, "Overview"),
        h("h1", null, APP_NAME),
        h("p", null, "A local AI staff department for tender lead review, supplier and partner matching, quotation outreach, tender package preparation, and follow-up control.")
      ),
      h("div", { className: "overview-hero-actions" },
        h(Button, { variant: "secondary", onClick: () => setView("explorer") }, icon("user"), "Department Explorer"),
        h(Button, { onClick: () => setView("reports") }, icon("play"), "Login to Department")
      )
    ),
    h("div", { className: "overview-tabbar", role: "tablist", "aria-label": "Overview sections" },
      tabs.map(([key, label]) => h("button", {
        key,
        type: "button",
        role: "tab",
        className: cn("overview-tab", activeTab === key && "active"),
        "aria-selected": activeTab === key,
        onClick: () => setActiveTab(key),
      }, label))
    ),
    activeTab === "home" ? h(OverviewSponsorTab, { dashboard, summary, activeLeads, alexOpenThreads, blockedCount, sync, setView }) : null,
    activeTab === "howTo" ? h(OverviewHowToTab, { setView, openTaskDialog }) : null,
    activeTab === "department" ? h(OverviewDepartmentTab, { dashboard, setView }) : null,
    activeTab === "runtime" ? h(AutomationRuntimeTab, { dashboard, sync, setView, runLocalWorkerOnce, useTestWorkerCommand }) : null
  );
}

function OverviewSponsorTab({ dashboard, summary, activeLeads, alexOpenThreads, blockedCount, sync, setView }) {
  const fabric = fabricOrFallback(dashboard);
  const model = operatingModelFromDashboard(dashboard);
  const visibility = model.visibilityModes || {};
  const mission = ((dashboard.kpis || []).find(row => normalizedText(row.Status) === "active") || {})["Owner Notes"] || "Review tender leads, read tender documents, check GCC lab fit, match suppliers or partners, request quotations, and prepare submission packages.";
  const localWorker = sync.localWorker || {};
  const workerCounts = localWorker.counts || {};
  const blockers = sync.automationBlockers || {};
  const blockerCounts = blockers.counts || {};
  const blockerRows = [
    ["Human approval", blockerCounts.humanApproval || 0],
    ["Missing files", blockerCounts.missingFiles || 0],
    ["Email approval", blockerCounts.externalEmailApproval || 0],
    ["Codex worker", blockerCounts.codexWorker || 0],
    ["Config errors", blockerCounts.fabricErrors || 0],
  ];
  const cards = [
    ["Sponsor", "Iman Najafi", "Human owner and final decision maker."],
    ["Department", APP_NAME, "Tender lead review, supplier matching, quotation outreach, tender package preparation, and follow-up control."],
    ["Manager", "Alex Fergusen", `${alexOpenThreads || 0} open thread(s) with the AI manager.`],
    ["Current workload", `${activeLeads || 0} active lead case(s)`, `${summary.dueTasks || 0} due task(s), ${blockedCount || 0} risk item(s).`],
    ["Autopilot", ((sync.autopilot || {}).enabled ? "On" : "Paused"), (((sync.autopilot || {}).progress || {}).reason || "Watching local work.")],
    ["Local worker", localWorker.commandConfigured ? "Configured" : "Needs command", `${workerCounts.open || 0} open Codex work item(s).`],
  ];
  const ownedDepartments = (fabric.departments || []).filter(row => normalizedText(row.ownershipMode || "ownedDepartment") !== "sponsoredassignment");
  const sponsoredDepartments = (fabric.departments || []).filter(row => normalizedText(row.ownershipMode) === "sponsoredassignment");
  return h("div", { className: "overview-panel" },
    h("div", { className: "overview-section-head" },
      h("div", null, h("h2", null, "AI Department Home"), h("p", null, "Owned departments show structure and controls. Sponsored work shows only assigned tasks, uploads, confirmations, approvals, and outputs.")),
      h(Badge, { tone: blockedCount ? "warn" : "ok" }, blockedCount ? "Needs attention" : "Operational")
    ),
    h("div", { className: "department-home-grid" },
      h("article", { className: "department-home-panel" },
        h("div", { className: "department-home-head" },
          h("h3", null, (visibility.ownedDepartment || {}).label || "AI Departments I Own"),
          h(Badge, null, ownedDepartments.length || 1)
        ),
        (ownedDepartments.length ? ownedDepartments : [{ id: "department_local_default", label: APP_NAME, humanManager: HUMAN_STAFF_ID, aiManager: "AIstaff_Manager", status: "Active" }]).map(row =>
          h("button", { key: row.id, type: "button", className: "department-home-row", onClick: () => setView("explorer") },
            h("span", { className: "department-home-icon" }, icon("user")),
            h("span", null,
              h("strong", null, row.label || APP_NAME),
              h("small", null, `${row.status || "Active"} | Manager: ${staffProfile(row.aiManager || "AIstaff_Manager").label}`)
            )
          )
        )
      ),
      h("article", { className: "department-home-panel" },
        h("div", { className: "department-home-head" },
          h("h3", null, (visibility.sponsoredAssignment || {}).label || "Sponsored Work Assigned To Me"),
          h(Badge, { tone: sponsoredDepartments.length ? "warn" : "ok" }, sponsoredDepartments.length)
        ),
        sponsoredDepartments.length ? sponsoredDepartments.map(row =>
          h("button", { key: row.id, type: "button", className: "department-home-row", onClick: () => setView("work") },
            h("span", { className: "department-home-icon" }, icon("file")),
            h("span", null,
              h("strong", null, row.label || "Sponsored assignment"),
              h("small", null, "Tasks, uploads, approvals, and outputs only")
            )
          )
        ) : h("div", { className: "department-home-empty" }, "No sponsored assignments are active in this local workspace.")
      )
    ),
    h("div", { className: "overview-info-grid" }, cards.map(([label, value, detail]) =>
      h("article", { className: "overview-info-card", key: label },
        h("span", null, label),
        h("strong", null, value),
        h("p", null, detail)
      )
    )),
    h("article", { className: "overview-narrative" },
      h("h3", null, "Mission"),
      h("p", null, mission),
      h("div", { className: "overview-meta-row" },
        h("span", null, sync.crmSyncEnabled ? `Last CRM sync: ${fmtDate(sync.lastSheetSync) || "not synced yet"}` : "CRM sync disabled"),
        h("span", null, `Pending local changes: ${sync.pendingActions || 0}`),
        h("span", null, `Failed actions: ${sync.failedActions || 0}`)
      )
    ),
    h("article", { className: "overview-narrative" },
      h("h3", null, "Automation blockers"),
      h("div", { className: "overview-meta-row" }, blockerRows.map(([label, value]) =>
        h("span", { key: label }, `${label}: ${value}`)
      )),
      h("p", null, localWorker.commandConfigured ? "Internal Codex worker execution is configured." : "Set AI_DEPARTMENT_WORKER_COMMAND to let queued research and writing work run automatically.")
    )
  );
}

function AutomationRuntimeTab({ dashboard, sync, setView, runLocalWorkerOnce, useTestWorkerCommand }) {
  const model = operatingModelFromDashboard(dashboard);
  const runtime = model.automationRuntimeArchitecture || {};
  const scheduler = runtime.projectSchedulerPolicy || {};
  const engine = runtime.externalWorkflowEnginePolicy || {};
  const retry = runtime.retryPolicy || {};
  const localWorker = sync.localWorker || {};
  const workerCounts = localWorker.counts || {};
  const blockers = ((sync.automationBlockers || {}).counts) || {};
  const blockerGroups = (sync.automationBlockers || {}).groups || {};
  const autopilot = sync.autopilot || {};
  const progress = autopilot.progress || {};
  const rows = [
    ["Autopilot", autopilot.enabled ? "On" : "Paused", progress.reason || progress.state || "Watching local work."],
    ["Local worker", localWorker.commandConfigured ? "Configured" : "Needs command", `${workerCounts.open || 0} open work item(s).`],
    ["Runtime mode", "DB queue + local runner", runtime.currentApproach || "Persistent queues and internal runner."],
    ["Retry policy", `${retry.maxAttempts || 3} attempts`, retry.afterExhaustion || "Failed Requires Attention"],
    ["Workflow engine", engine.triggerDevDecision || "Deferred", engine.reason || "Keep the operating model stable before adding a workflow engine."],
  ];
  return h("div", { className: "overview-panel" },
    h("div", { className: "overview-section-head" },
      h("div", null, h("h2", null, "Automation runtime"), h("p", null, "The platform runs from durable queue/state tables, cron/internal runner cycles, and supervised gates.")),
      h(Button, { variant: "secondary", onClick: () => setView("reports") }, "Open Reports")
    ),
    h("div", { className: "runtime-grid" }, rows.map(([label, value, detail]) =>
      h("article", { className: "runtime-card", key: label },
        h("span", null, label),
        h("strong", null, value),
        h("p", null, detail)
      )
    )),
    h("article", { className: "overview-narrative autonomy-readiness" },
      h("div", { className: "department-home-head" },
        h("div", null,
          h("h3", null, "Autonomy readiness"),
          h("p", null, "Why automation stops, and the next action to unblock local supervised work.")
        ),
        h(Badge, { tone: localWorker.commandConfigured ? "success" : "warn" }, localWorker.commandConfigured ? "Worker ready" : "Worker setup needed")
      ),
      h("div", { className: "runtime-grid" },
        [
          ["Worker", localWorker.commandConfigured ? "Configured" : "Missing command", localWorker.commandConfigured ? "Run one worker item when internal Codex work is ready." : "Set AI_DEPARTMENT_WORKER_COMMAND to the recommended local test command."],
          ["CRM", sync.crmSyncEnabled ? "Connected" : "Local only", sync.crmSyncEnabled ? "CRM sync can be used when needed." : "Import/transfer Leads locally until CRM sync is enabled."],
          ["Human approvals", blockers.humanApproval || 0, "Iman approval remains required for missing inputs, closures, and irreversible decisions."],
          ["Email approvals", blockers.externalEmailApproval || 0, "Supplier messages remain blocked until explicit approval."],
          ["Missing files", blockers.missingFiles || 0, "Upload tender PDFs, scope, BOQ, appendices, or approve parking the Lead."],
          ["Worker items", workerCounts.open || 0, localWorker.commandConfigured ? "Run worker once or let autopilot process internal work." : "Configure the local worker command first."],
        ].map(([label, value, detail]) =>
          h("article", { className: "runtime-card", key: label },
            h("span", null, label),
            h("strong", null, value),
            h("p", null, detail)
          )
        )
      ),
      h("div", { className: "readiness-blocker-list" },
        Object.entries(blockerGroups).flatMap(([kind, rows]) => (rows || []).slice(0, 4).map((row, index) =>
          h("div", { className: "readiness-blocker-row", key: `${kind}-${index}` },
            h(Badge, { tone: "warn" }, kind.replace(/([A-Z])/g, " $1").trim()),
            h("span", null, row.title || row.status || row.workItemId || row.taskId || row.queueId || "Blocked item"),
            h("small", null, row.nextAction || row.lastError || "Review this blocker and route through Alex.")
          )
        ))
      )
    ),
    h("article", { className: "overview-narrative worker-setup-panel" },
      h("div", { className: "department-home-head" },
        h("div", null,
          h("h3", null, "Worker status"),
          h("p", null, localWorker.setupGuidance || "The local worker processes internal research and writing work only.")
        ),
        h("div", { className: "panel-actions" },
          h(Button, { actionKey: "local-worker:use-test-command", variant: "outline", onClick: useTestWorkerCommand }, "Use test worker"),
          h(Button, { actionKey: "local-worker:run-once", variant: "secondary", onClick: runLocalWorkerOnce }, "Run once")
        )
      ),
      h("div", { className: "manifest-preview worker-command-preview" }, localWorker.commandConfigured ? localWorker.command : (localWorker.recommendedCommand || "AI_DEPARTMENT_WORKER_COMMAND is not configured.")),
      h("div", { className: "overview-meta-row" },
        h("span", null, `Enabled: ${localWorker.enabled ? "yes" : "no"}`),
        h("span", null, `Open: ${workerCounts.open || 0}`),
        h("span", null, `Queued: ${workerCounts.queued || 0}`),
        h("span", null, `Ready: ${workerCounts.ready || 0}`),
        h("span", null, `Done: ${workerCounts.done || 0}`)
      ),
      localWorker.lastRun && Object.keys(localWorker.lastRun).length ? h("p", null, `Last run: ${localWorker.lastRun.status || "unknown"} ${localWorker.lastRun.workItemId ? `- ${localWorker.lastRun.workItemId}` : ""}`) : null,
      localWorker.lastError ? h("p", { className: "form-error" }, localWorker.lastError) : null
    ),
    h("article", { className: "overview-narrative" },
      h("h3", null, "Project scheduler state"),
      h("p", null, scheduler.goal || "Every project should have durable plan and step state."),
      h("div", { className: "overview-meta-row" }, (scheduler.stepStates || ["Queued", "Ready", "In Progress", "Blocked", "Needs Approval", "Done", "Failed Requires Attention"]).map(state =>
        h("span", { key: state }, state)
      ))
    ),
    h("article", { className: "overview-narrative" },
      h("h3", null, "Runner responsibilities"),
      h("div", { className: "overview-meta-row" }, (runtime.runnerResponsibilities || []).map(item =>
        h("span", { key: item }, String(item).replace(/_/g, " "))
      ))
    ),
    h("div", { className: "operating-model-grid" },
      h("article", { className: "overview-narrative" },
        h("h3", null, "Current blocker groups"),
        h("div", { className: "overview-meta-row" }, Object.entries(blockers).map(([key, value]) =>
          h("span", { key }, `${key.replace(/([A-Z])/g, " $1").trim()}: ${value}`)
        )),
        h("p", null, progress.reason || "No automation reason recorded yet.")
      ),
      h("article", { className: "overview-narrative" },
        h("h3", null, "Orchestration criteria"),
        h("p", null, "Do not adopt Trigger.dev, Temporal, Cloud Tasks, or Google Workflows until the local DB queue/runner model fails these criteria."),
        h("div", { className: "overview-meta-row" },
          ["long pause/resume", "fan-out/fan-in pain", "step replay UI needed", "approval waiting durability", "cron reliability issues"].map(item =>
            h("span", { key: item }, item)
          )
        )
      )
    )
  );
}

function OverviewHowToTab({ setView, openTaskDialog }) {
  const steps = [
    ["1", "Transfer or name a Lead", "Give Alex the Lead ID, tender files, source, and what decision you need."],
    ["2", "Ava reads the tender", "Ava reviews tender PDFs, specs, forms, deadlines, and missing-document blockers."],
    ["3", "Leo routes the bid", "Leo checks GCC lab fit and finds existing suppliers or partners before asking Nadia to search outside."],
    ["4", "Monitor the case", "Use Reports and Leads to track supplier quotes, tender package readiness, follow-ups, blockers, and submission status."],
  ];
  return h("div", { className: "overview-panel" },
    h("div", { className: "overview-section-head" },
      h("div", null, h("h2", null, "How to work with the department"), h("p", null, "You do not need to manage every worker. Talk to Alex, and Alex manages the team."))
    ),
    h("div", { className: "overview-step-list" }, steps.map(([number, title, body]) =>
      h("article", { className: "overview-step", key: number },
        h("span", null, number),
        h("div", null, h("h3", null, title), h("p", null, body))
      )
    )),
    h("div", { className: "overview-inline-actions" },
      h(Button, { onClick: () => openTaskDialog({ assignedTo: "AIstaff_Manager", taskType: "Manager Guidance", taskCategory: "Manager Guidance" }) }, icon("send"), "Message Alex"),
      h(Button, { variant: "secondary", onClick: () => setView("wikis") }, icon("book"), "Open Wikis"),
      h(Button, { variant: "secondary", onClick: () => setView("work") }, "Open Tasks"),
      h(Button, { variant: "secondary", onClick: () => setView("reports") }, "Open Reports")
    )
  );
}

function OverviewDepartmentTab({ dashboard, setView }) {
  const model = operatingModelFromDashboard(dashboard);
  const contract = model.departmentContract || {};
  const visibility = model.visibilityModes || {};
  const staff = STAFF_ORDER
    .filter(id => id !== HUMAN_STAFF_ID && id !== "AIstaff_Manager")
    .map(id => ({ id, label: staffProfile(id).label, role: staffProfile(id).systemLabel || "AI staff" }));
  return h("div", { className: "overview-panel" },
    h("div", { className: "overview-section-head" },
      h("div", null, h("h2", null, "Department operating model"), h("p", null, "The AI Manager coordinates specialist staff; humans communicate with Alex unless policy changes."))
    ),
    h("div", { className: "operating-rule-grid" },
      [
        ["Human channel", contract.humanCommunicationRule || "The human talks to the AI Manager."],
        ["Staff channel", contract.staffCommunicationRule || "Specialist staff report to the AI Manager."],
        ["Manager role", contract.managerRole || "Alex routes, consolidates, and escalates only real decisions."],
        ["Safety boundary", contract.safetyBoundary || "External sends and irreversible actions remain supervised."],
      ].map(([title, body]) =>
        h("article", { className: "operating-rule-card", key: title }, h("strong", null, title), h("p", null, body))
      )
    ),
    h("div", { className: "overview-org-mini" },
      h("article", { className: "overview-org-node owner" }, staffAvatar("Human_Iman"), h("div", null, h("strong", null, "Iman / Human"), h("span", null, "Department owner"))),
      h("div", { className: "overview-org-line" }),
      h("article", { className: "overview-org-node manager" }, staffAvatar("AIstaff_Manager"), h("div", null, h("strong", null, "Alex Fergusen"), h("span", null, "AI Department Manager"))),
      h("div", { className: "overview-org-staff" }, staff.map(item =>
        h("article", { className: "overview-org-node", key: item.id }, staffAvatar(item.id), h("div", null, h("strong", null, item.label), h("span", null, item.role || "AI staff")))
      ))
    ),
    h("div", { className: "visibility-grid" },
      h("article", { className: "visibility-card" },
        h("h3", null, (visibility.ownedDepartment || {}).label || "AI Departments I Own"),
        h("p", null, "Owners/admins can inspect structure, support inventory, quality gates, staff, skills, outputs, and settings.")
      ),
      h("article", { className: "visibility-card" },
        h("h3", null, (visibility.sponsoredAssignment || {}).label || "Sponsored Work Assigned To Me"),
        h("p", null, "Sponsored participants see only their tasks, uploads, confirmations, approvals, and accepted outputs.")
      )
    ),
    h("article", { className: "overview-narrative" },
      h("h3", null, "Reusable template families"),
      h("div", { className: "overview-meta-row" }, (model.templateFamilies || ["Department Templates", "Staff Models", "Skill Packs", "Toolsets", "Workflow Plans"]).map(item =>
        h("span", { key: item }, item)
      ))
    ),
    h("div", { className: "overview-inline-actions" },
      h(Button, { onClick: () => setView("explorer") }, icon("user"), "Open Department Explorer"),
      h(Button, { variant: "secondary", onClick: () => setView("settings") }, "Department Settings")
    )
  );
}

function WikisView({ setView, openTaskDialog }) {
  const processSteps = [
    ["Give direction", "Use Message Alex when you want the department to do work. Write normally, for example: review this Lead and tender file, find supplier matches, and prepare quotation requests."],
    ["Alex routes the work", "Alex decides whether the request goes to Ava, Leo, Nadia, Maya, Omar, Lina, or Noah."],
    ["Specialists work internally", "AI staff work through tasks and follow-ups. They should ask Alex first, not message the human directly."],
    ["Human answers only when needed", "If there is a bid/no-bid decision, supplier risk, missing permission, unclear quote, or tender strategy issue, Alex opens a task thread for Iman."],
    ["Reports show the operating result", "Use Reports to see KPIs, blockers, Lead pipeline, staff workload, system health, and what changed in the selected period."],
  ];
  const menuGuide = [
    ["Overview", "Entry page for the department.", "Use it to understand the sponsor, mission, and main entry actions."],
    ["Wikis", "This user guide.", "Use it when you need to remember the process, menus, or safety rules."],
    ["Department Explorer", "Org-chart and profile view of the AI department.", "Use it to inspect Alex, specialist staff, roles, tools, work steps, QA rules, and learned skills."],
    ["Leads", "List or pipeline view of tender Lead entities.", "Use it to search Leads, check stage/status, open Lead detail, and see related supplier/tender work."],
    ["Tasks", "Conversation inbox for human/AI task threads.", "Use it to answer Alex, review human decisions, and follow task conversations like a chat."],
    ["Reports", "Manager cockpit for operating performance.", "Use it as the main dashboard after login: KPI progress, blockers, pipeline, staff, follow-ups, email safety, and system health."],
    ["Settings", "Configuration and local status.", "Use it to inspect bridge/sync settings, operating notes, and technical configuration where allowed."],
  ];
  const safetyRules = [
    "Replying in a task thread never sends an email by itself.",
    "Only approved outreach queue rows may send, and the system still checks content, tender scope, attachments, and duplicate recipients.",
    "Repeated supplier/contact recipients require a human decision unless the duplicate risk is already resolved.",
    "Tender portal submissions and LinkedIn messages remain manual unless the policy is explicitly changed.",
    "Private tokens, local databases, and generated tender files stay local unless intentionally exported.",
  ];
  return h("section", { className: "wiki-page" },
    h(Card, { className: "wiki-hero" },
      h(CardHeader, {
        eyebrow: "User Guide",
        title: `How to Run the ${APP_NAME}`,
        description: "A practical guide for normal users: what to click, how work moves, and what each menu means.",
        action: h("div", { className: "wiki-hero-actions" },
          h(Button, { onClick: () => openTaskDialog({ assignedTo: "AIstaff_Manager", taskType: "Manager Guidance", taskCategory: "Manager Guidance" }) }, icon("send"), "Message Alex"),
          h(Button, { variant: "secondary", onClick: () => setView("reports") }, icon("play"), "Login to Department")
        )
      })
    ),
    h("div", { className: "wiki-grid" },
      h(Card, { className: "wiki-panel wiki-process" },
        h(CardHeader, { title: "Normal Process", description: "How one request moves through the department." }),
        h(CardContent, null,
          h("ol", { className: "wiki-steps" }, processSteps.map(([title, body], index) =>
            h("li", { key: title },
              h("span", null, String(index + 1)),
              h("div", null, h("h3", null, title), h("p", null, body))
            )
          ))
        )
      ),
      h(Card, { className: "wiki-panel" },
        h(CardHeader, { title: "How To Give Work to Alex", description: "Use plain language. Alex turns it into staff tasks." }),
        h(CardContent, null,
          h("div", { className: "wiki-example" },
            h("p", null, "Example request"),
            h("blockquote", null, "Review Lead L-2026-001, read its tender PDFs, find supplier matches, request approved quotations, and prepare the tender package checklist.")
          ),
          h("div", { className: "wiki-note" }, "Good requests include Lead ID, tender type, country, deadline urgency, files to review, and whether supplier outreach is allowed or should wait.")
        )
      ),
      h(Card, { className: "wiki-panel wiki-menu-panel" },
        h(CardHeader, { title: "Menu Guide", description: "What each menu is for." }),
        h(CardContent, null,
          h("div", { className: "wiki-menu-list" }, menuGuide.map(([menu, purpose, use]) =>
            h("article", { key: menu },
              h("div", null, h("h3", null, menu), h("p", null, purpose)),
              h("span", null, use)
            )
          ))
        )
      ),
      h(Card, { className: "wiki-panel" },
        h(CardHeader, { title: "Tasks And Threads", description: "The human-facing work model." }),
        h(CardContent, null,
          h("div", { className: "wiki-callout" },
            h("strong", null, "Main rule"),
            h("p", null, "Human users should talk to Alex. Specialist AI staff report to Alex, and Alex asks Iman only when a decision or instruction is needed.")
          ),
          h("ul", { className: "wiki-bullets" },
            ["A task is the work item.", "A thread is the conversation around that work.", "Open threads are active. Closed threads can become learning candidates.", "Human closure keeps the visible conversation auditable."].map(item => h("li", { key: item }, item))
          )
        )
      ),
      h(Card, { className: "wiki-panel" },
        h(CardHeader, { title: "Safety Rules", description: "What the system will not do silently." }),
        h(CardContent, null,
          h("ul", { className: "wiki-bullets" }, safetyRules.map(item => h("li", { key: item }, item)))
        )
      ),
      h(Card, { className: "wiki-panel" },
        h(CardHeader, { title: "Recommended Daily Routine", description: "The simplest way to operate the department." }),
        h(CardContent, null,
          h("div", { className: "wiki-routine" },
            ["Open Reports and check Do First.", "Answer any Human Inbox threads from Alex.", "Check Leads for movement and deadlines.", "Use Department Explorer only when you need to inspect or improve the team structure.", "End by asking Alex what is blocked and what should happen next."].map(item => h("p", { key: item }, item))
          )
        )
      )
    )
  );
}

function DailyKpiCard({ dashboard, summary }) {
  const sync = dashboard.localSync || {};
  const documentQuality = sync.documentQuality || {};
  const crmEnabled = sync.crmSyncEnabled !== false;
  const todayRuns = (dashboard.recentRuns || []).filter(row => {
    const date = new Date(row["Run Timestamp"] || row.runAt || row.Date || "");
    return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
  }).length;
  const healthy = !sync.lastSyncError && Number(sync.pendingActions || 0) === 0 && Number(sync.failedActions || 0) === 0;
  const items = [
    ["CRM sync", crmEnabled ? (healthy ? 100 : 35) : 100, crmEnabled ? (healthy ? "Healthy" : "Disabled") : "Disabled", crmEnabled ? `Last sync ${sync.lastSheetSync ? fmtDate(sync.lastSheetSync) : "pending"}` : "Local-only mode"],
    ["Task queue", inversePercent(summary.dueTasks, 5), `${summary.dueTasks || 0} due`, `${summary.overdueTasks || 0} overdue`],
    ["Follow-up compliance", inversePercent(summary.overdueFollowUps, 3), `${summary.overdueFollowUps || 0} late`, `${summary.dueFollowUps || 0} due now`],
    ["Email safety", inversePercent(summary.blockedEmails, 4), `${summary.blockedEmails || 0} blocked`, "Safety gate remains active"],
    ["Document QA", inversePercent(documentQuality.issueCount || 0, 3), `${documentQuality.issueCount || 0} issue(s)`, "Template/style gate before send"],
    ["Open escalations", inversePercent(summary.openEscalations == null ? summary.managerReview : summary.openEscalations, 8), `${summary.openEscalations == null ? (summary.managerReview || 0) : summary.openEscalations} waiting`, "Task-thread blockers only"],
    ["Daily activity", Math.min(100, todayRuns * 100), `${todayRuns} runs`, "Recent run entries today"],
  ];
  const average = Math.round(items.reduce((sum, item) => sum + item[1], 0) / items.length);
  return h(Card, { className: "kpi-panel" },
    h(CardHeader, { title: "Daily KPI Progress", description: "Today's operating targets and current blockers.", action: h(Badge, { tone: kpiTone(average) }, `${average}%`) }),
    h(CardContent, null, h("div", { className: "kpi-grid" }, items.map(([label, score, value, detail]) =>
      h("article", { key: label, className: cn("kpi-card", kpiTone(score)) },
        h("div", { className: "kpi-card-head" }, h("div", null, h("h3", null, label), h("p", null, "Target control")), h("strong", null, value)),
        h("div", { className: "progress-track" }, h("span", { style: { width: `${score}%` } })),
        h("div", { className: "kpi-foot" }, h("span", null, `${score}%`), h("span", null, detail))
      )
    )))
  );
}

function inversePercent(value, maxBad) {
  const count = Math.max(0, Number(value || 0));
  if (count <= 0) return 100;
  return Math.max(0, Math.round(100 - (Math.min(count, maxBad) / maxBad) * 100));
}

function kpiTone(score) {
  if (score >= 85) return "ok";
  if (score >= 50) return "warn";
  return "danger";
}

function ActivityCard({ dashboard, setView }) {
  const events = (dashboard.recentEvents || []).slice(0, 5).map(item => ({ kind: "Event", time: item.DateTime, title: item.Event, body: [item.Field, item.After, item.Reason].filter(Boolean).join(" | ") }));
  const runs = (dashboard.recentRuns || []).slice(0, 4).map(item => ({ kind: "Run", time: item["Run Timestamp"], title: item["Run Type"], body: [item["Actions Completed"], item["Next Run Focus"], item.Notes].filter(Boolean).join(" | ") }));
  const reports = (dashboard.recentReports || []).slice(0, 3).map(item => ({ kind: "Report", time: item.Date, title: item.Period || item["Report ID"], body: item.Summary || item.Blockers }));
  const items = [...events, ...runs, ...reports].sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0)).slice(0, 10);
  return h(Card, { className: "activity-panel" },
    h(CardHeader, { title: "Live Activity", description: "Latest staff actions, status changes, and safety checks.", action: h(Button, { variant: "secondary", onClick: () => setView("reports") }, "Open Reports") }),
    h(CardContent, { className: "timeline" }, items.length ? items.map((item, index) =>
      h("article", { className: "timeline-item", key: `${item.kind}-${index}` },
        h("div", { className: "timeline-dot" }),
        h("div", null,
          h("div", { className: "timeline-head" }, h("span", null, item.kind), h("time", null, fmtDate(item.time) || "No time")),
          h("h3", null, shortText(item.title, 92)),
          h("p", null, shortText(item.body || "No details recorded.", 180))
        )
      )
    ) : h(EmptyState, { title: "No live activity", body: "Run a task or sync the workbook to populate the activity timeline." }))
  );
}

function AutopilotCard({ autopilot, documentQuality, runAutopilotCycle, setAutopilot, enabled }) {
  const progress = autopilot.progress || {};
  const targets = autopilot.targets || {};
  const recent = autopilot.recentRuns || [];
  const stateText = progress.state || (enabled ? "Active" : "Paused");
  const quality = documentQuality || {};
  const crmEnabled = autopilot.crmSyncEnabled === true;
  return h(Card, { className: "autopilot-panel" },
    h(CardHeader, {
      title: "Daily Autopilot",
      description: "Keeps the Windows worker moving against the KPI table until today's flow is complete, blocked, or waiting on a planning decision.",
      action: h(Fragment, null,
        h(Button, { actionKey: "autopilot:run", onClick: runAutopilotCycle }, "Run KPI Flow"),
        h(Button, { actionKey: enabled ? "autopilot:pause" : "autopilot:start", variant: "secondary", onClick: () => setAutopilot(!enabled) }, enabled ? "Pause" : "Start")
      ),
    }),
    h(CardContent, { className: "autopilot-grid" },
      h("article", { className: cn("autopilot-card", noticeTone(stateText)) },
        h("div", { className: "card-topline" }, h("div", null, h("h3", null, enabled ? "Autopilot On" : "Autopilot Paused"), h(Badge, null, stateText))),
        h(DetailList, { rows: [
          { label: "Reason", value: progress.reason || "Watching today's KPIs.", length: 220 },
          { label: crmEnabled ? "CRM sync" : "Local mode", value: crmEnabled ? `${progress.sheetSyncs || 0} / ${targets.sheetSyncs || 1}` : "On" },
          { label: "CRM health", value: `${progress.crmHealthChecks || 0} / ${targets.crmHealthChecks || 1}` },
          { label: "Document QA", value: quality.issueCount ? `${quality.issueCount} issue(s)` : "clear" },
          { label: "Runner attempts", value: `${progress.runnerAttempts || 0}` },
          { label: "Codex tasks queued", value: `${progress.codexTasksQueued || 0}` },
          { label: "Last cycle", value: fmtDate(progress.lastCycleAt) || "not yet" },
        ] })
      ),
      h("article", { className: "autopilot-card" },
        h("h3", null, "Latest Cycle"),
        recent[0] ? h(DetailList, { rows: [
          { label: "When", value: fmtDate(recent[0].runAt) },
          { label: "Action", value: recent[0].action },
          { label: "Status", value: recent[0].status },
          { label: "Notes", value: recent[0].notes || recent[0].result, length: 220 },
        ] }) : h("p", { className: "muted" }, "No autopilot cycle has run yet.")
      )
    )
  );
}

function StaffFlowCard({ dashboard, setView }) {
  const steps = [
    ["Review", "AIstaff_OpportunityHunter", "Read lead and tender docs"],
    ["Fit", "AIstaff_FitAnalyst", "Check fit and suppliers"],
    ["Map", "AIstaff_ProfessorResearchAnalyst", "Find new suppliers"],
    ["Package", "AIstaff_ApplicationPackMaker", "Prepare tender docs"],
    ["Quote", "AIstaff_ApplicationPackSender", "Request supplier pricing"],
    ["Follow up", "AIstaff_FollowUpController", "Track replies and Q&A"],
    ["Control", "AIstaff_CRMController", "Keep CRM case health"],
  ];
  const staff = dashboard.staff || [];
  const countFor = staffId => staff.find(row => row.staffId === staffId) || {};
  return h(Card, { className: "staff-flow-panel" },
    h(CardHeader, { title: "AI Team Workflow", description: "How work moves from Lead intake to tender package and supplier follow-up.", action: h(Button, { variant: "secondary", onClick: () => setView("work") }, "Open Tasks") }),
    h(CardContent, { className: "staff-flow" }, steps.map((step, index) => {
      const stats = countFor(step[1]);
      return h(Fragment, { key: step[0] },
        h("article", { className: cn("flow-node", noticeTone(stats.currentWork || "")) },
          h("div", { className: "flow-stage" }, step[0]),
          h("div", { className: "flow-person" }, staffAvatar(step[1], true), h("div", null, h("strong", null, staffProfile(step[1]).label), h("p", null, step[2]))),
          h("p", { className: "flow-work" }, shortText(stats.currentWork || "No open work", 120)),
          h("div", { className: "flow-meta" }, h(Badge, null, `${stats.openTasks || 0} tasks`), h(Badge, null, `${stats.openFollowUps || 0} follow-ups`))
        ),
        index < steps.length - 1 ? h("div", { className: "flow-arrow" }, "->") : null
      );
    }))
  );
}

function StaffCard({ item, dashboard, runOne, openTaskDialog }) {
  const waitingCodex = [...(dashboard.tasks || []), ...(((dashboard.managerReview || {}).tasks) || [])].filter(row => row.taskId && row.assignedTo === item.staffId && isCodexWorkerHandoff(row)).length;
  const hasRunnable = Number(item.openTasks || 0) + Number(item.openFollowUps || 0) - waitingCodex > 0;
  const openThreads = (((dashboard.threadsSummary || {}).byStaff || {})[item.staffId] || {}).open || 0;
  const wakeups = (((dashboard.staffWakeups || {}).byStaff || {})[item.staffId] || {}).queued || 0;
  return h("article", { className: "staff" },
    h("div", { className: "staff-heading" },
      h("span", { className: "avatar-badge-wrap" }, staffAvatar(item.staffId), openThreads ? h("span", { className: "avatar-badge" }, openThreads) : null),
      h("div", null, h("h3", null, staffProfile(item.staffId).label), h("div", { className: "role" }, item.role || item.staffId))
    ),
    h("div", { className: "staff-stats" }, [["tasks", item.openTasks], ["wake-ups", wakeups], ["threads", openThreads]].map(([label, value]) => h("div", { className: "mini", key: label }, h("strong", null, value || 0), h("span", null, label)))),
    h(DetailList, { rows: [
      { label: "Current work", value: item.currentWork || "No open work", length: 170 },
      { label: "Next run", value: fmtDate(item.nextRunAt) || "not scheduled" },
      { label: "Activation", value: wakeups ? "Wake-up queued from a task/thread." : (waitingCodex ? "Waiting for Codex Worker." : (hasRunnable ? "Runs due tasks/follow-ups only" : "No queued work. Assign a task first.")), length: 150 },
    ] }),
    h("div", { className: "notice-actions" },
      h(Button, { actionKey: `run-one:${item.staffId}`, variant: hasRunnable ? "default" : "secondary", onClick: () => runOne(item.staffId) }, hasRunnable ? "Run Now" : "Check Now"),
      h(Button, { variant: "outline", onClick: () => openTaskDialog({ assignedTo: item.staffId }) }, "Assign")
    )
  );
}

function ApplicationsView({ rows, labels, filters, setFilters, viewMode, setViewMode, runOne, openTaskDialog, openRef, openUniversity }) {
  const stageOptions = useMemo(() => {
    const counts = new Map();
    rows.forEach(row => counts.set(applicationStage(row), (counts.get(applicationStage(row)) || 0) + 1));
    return [...APPLICATION_STAGES, "Other"].filter(stage => counts.has(stage)).map(stage => [stage, `${stage} (${counts.get(stage)})`]);
  }, [rows]);
  const universityOptions = useMemo(() => {
    const counts = new Map();
    rows.forEach(row => {
      const university = inferUniversity(row);
      const current = counts.get(university.key) || { key: university.key, label: university.name, count: 0 };
      current.count += 1;
      counts.set(university.key, current);
    });
    return [...counts.values()].sort((a, b) => a.label.localeCompare(b.label)).map(item => [item.key, `${item.label} (${item.count})`]);
  }, [rows]);
  const filtered = rows.filter(row => {
    const search = normalizedText(filters.search);
    const university = inferUniversity(row);
    const text = normalizedText([row.applicationId, row.entityId, row.opportunityId, row.currentStage, row.currentStatus, row.responsibleStaff, university.name, university.city, university.country, row.notes].join(" "));
    if (filters.stage && applicationStage(row) !== filters.stage) return false;
    if (filters.university && university.key !== filters.university) return false;
    return !search || text.includes(search);
  });
  const update = (key, value) => setFilters({ ...filters, [key]: value });
  return h(Card, null,
    h(CardHeader, { title: "Leads", description: "Tender lead cases, stages, owners, supplier route, and clickable references.", action: h(Button, { variant: "secondary", onClick: () => openTaskDialog({ taskType: "Tender Package" }) }, icon("plus"), "Add Lead Task") }),
    h("div", { className: "application-toolbar" },
      h(Field, { label: "Search leads", className: "search-field" }, h(Input, { type: "search", value: filters.search, onChange: event => update("search", event.target.value), placeholder: "Search by Lead ID, tender source, supplier, stage..." })),
      h(Field, { label: "Stage" }, h(Select, { value: filters.stage, onChange: event => update("stage", event.target.value) }, h("option", { value: "" }, "All stages"), stageOptions.map(([value, label]) => h("option", { key: value, value }, label)))),
      h(Field, { label: "Tender source" }, h(Select, { value: filters.university, onChange: event => update("university", event.target.value) }, h("option", { value: "" }, "All sources"), universityOptions.map(([value, label]) => h("option", { key: value, value }, label)))),
      h("div", { className: "view-toggle", role: "group", "aria-label": "Lead view" },
        h(Button, { className: cn("icon-toggle", viewMode === "list" && "active"), variant: "ghost", size: "icon", onClick: () => setViewMode("list"), title: "List view", "aria-pressed": viewMode === "list" }, icon("list")),
        h(Button, { className: cn("icon-toggle", viewMode === "kanban" && "active"), variant: "ghost", size: "icon", onClick: () => setViewMode("kanban"), title: "Kanban view", "aria-pressed": viewMode === "kanban" }, icon("kanban"))
      ),
      h("span", { className: "toolbar-count" }, `${filtered.length} / ${rows.length}`)
    ),
    h(CardContent, { className: "applications-content" },
      !rows.length ? h(EmptyState, { title: "No active leads", body: "The dashboard did not return any Lead cases yet. A future action can transfer Lead records and files into this department." }) :
      !filtered.length ? h(EmptyState, { title: "No matching leads", body: "Adjust the search, stage, or tender-source filters to broaden this view." }) :
      viewMode === "kanban" ? h(ApplicationKanban, { rows: filtered, labels, runOne, openTaskDialog, openRef, openUniversity }) :
      h("div", { className: "entity-list no-pad" }, filtered.map(row => h(ApplicationCard, { key: row.entityId || row.applicationId, row, labels, runOne, openTaskDialog, openRef, openUniversity })))
    )
  );
}

function ApplicationCard({ row, labels, runOne, openTaskDialog, openRef, openUniversity }) {
  return h("article", { className: cn("entity-card", noticeTone(row.currentStatus)) },
    h("div", { className: "card-topline" },
      h("div", null,
        h("div", { className: "card-title" }, h(RefChip, { kind: "applications", id: row.applicationId || row.entityId, labels, openRef, length: 120, showStatus: false })),
        h("div", { className: "card-meta" }, row.applicationId || row.entityId)
      ),
      h(Badge, null, row.currentStatus)
    ),
    h(DetailList, { rows: [
      { label: "Tender source", value: h(UniversityButton, { row, openUniversity }), raw: true },
      { label: "Stage", value: `${applicationStage(row)}${row.currentStage ? ` - ${row.currentStage}` : ""}`, length: 130 },
      { label: "Owner", value: h(StaffChip, { staffId: row.responsibleStaff }), raw: true },
      { label: "Tender case", value: h(RefChip, { kind: "opportunities", id: row.opportunityId, labels, openRef, length: 180 }), raw: true },
      { label: "Latest task", value: h(RefChip, { kind: "tasks", id: row.lastTaskId, labels, openRef, length: 220 }), raw: true },
      { label: "Latest follow-up", value: h(RefChip, { kind: "followUps", id: row.lastFollowUpId, labels, openRef, length: 220 }), raw: true },
      { label: "Updated", value: fmtDate(row.lastUpdated) || "No update time" },
    ] }),
    h("div", { className: "action-strip" },
      h(Button, { actionKey: `run-one:${row.responsibleStaff || "next"}`, onClick: () => runOne(row.responsibleStaff) }, "Run Owner"),
      h(Button, { variant: "outline", onClick: () => openTaskDialog({ assignedTo: row.responsibleStaff, entityId: row.entityId, applicationId: row.applicationId, taskType: "Tender Package" }) }, "Add Task")
    )
  );
}

function ApplicationKanban({ rows, labels, runOne, openTaskDialog, openRef, openUniversity }) {
  const buckets = Object.fromEntries([...APPLICATION_STAGES, "Other"].map(stage => [stage, []]));
  rows.forEach(row => buckets[applicationStage(row)].push(row));
  return h("div", { className: "pipeline embedded-pipeline" }, [...APPLICATION_STAGES, "Other"].map(stage =>
    h("div", { className: "stage-column", key: stage },
      h("h3", null, stage, h("span", { className: "pill" }, buckets[stage].length)),
      buckets[stage].length ? buckets[stage].map(row =>
        h("article", { className: "app-card", key: row.entityId || row.applicationId },
          h("strong", null, h(RefChip, { kind: "applications", id: row.applicationId || row.entityId, labels, openRef, length: 88, showStatus: false })),
          h("p", null, h(UniversityButton, { row, openUniversity })),
          h("p", null, h(Badge, null, row.currentStatus), " ", h(StaffChip, { staffId: row.responsibleStaff })),
          h("div", { className: "notice-actions" },
            h(Button, { variant: "outline", onClick: () => openTaskDialog({ assignedTo: row.responsibleStaff, entityId: row.entityId, applicationId: row.applicationId }) }, "Task"),
            h(Button, { actionKey: `run-one:${row.responsibleStaff || "next"}`, variant: "secondary", onClick: () => runOne(row.responsibleStaff) }, "Run")
          )
        )
      ) : h("p", { className: "muted" }, "No items")
    )
  ));
}

function ManagerView(props) {
  const items = collectManagerReviewItems(props.dashboard.managerReview || {});
  return h(Card, { tone: "warn" },
    h(CardHeader, { title: "Open Escalations", description: "Items that become task threads when staff cannot safely continue alone.", action: h(Badge, null, items.length) }),
    h(CardContent, { className: "stack" }, items.length ? items.slice(0, 18).map(item => h(ReviewCard, { key: `${item.kind}-${item.taskId || item.followUpId || item.queueId || item.title}`, item, ...props })) : h(EmptyState, { title: "No escalations waiting", body: "The process has no blocked or delayed item in the current dashboard snapshot." }))
  );
}

function ReviewCard({ item, labels, runOne, snoozeTask, reassignTask, snoozeFollowUp, processQueueRow, approveEmail, runEmailSafetyCheck, closeEntity, setDecisionDialog, openRef, openUniversity }) {
  const row = item.row || {};
  return h("article", { className: cn("notice approval-card", noticeTone(item.status)) },
    h("div", { className: "card-topline" }, h("div", null, h("h3", null, `${item.kind}: ${shortText(item.title, 96)}`), h("div", { className: "card-meta" }, h(Badge, null, item.status)))),
    h(DetailList, { rows: [
      { label: "Tender source", value: h(UniversityButton, { row, openUniversity }), raw: true },
      { label: "Owner", value: item.staff ? h(StaffChip, { staffId: item.staff }) : "", raw: true },
      { label: "Lead", value: h(RefChip, { kind: "applications", id: row.applicationId || row.entityId, labels, openRef, length: 180 }), raw: true },
      { label: "Tender case", value: h(RefChip, { kind: "opportunities", id: row.opportunityId, labels, openRef, length: 180 }), raw: true },
      { label: "Due", value: fmtDate(row.dueAt) },
      { label: "Next action", value: row.nextAction || item.body, length: 240 },
      { label: "Reason", value: row.lastError || row.resultNotes || item.body, length: 240 },
      { label: "Reference", value: item.taskId || item.followUpId || item.queueId },
    ] }),
    h("div", { className: "notice-actions" },
      item.queueId ? h(Button, { actionKey: `approve-email:${item.queueId}`, onClick: () => approveEmail(item.queueId) }, "Approve Outreach") : null,
      item.queueId ? h(Button, { actionKey: `email-safety:${item.queueId}`, variant: "outline", onClick: () => runEmailSafetyCheck(item.queueId) }, "Safety Check") : null,
      item.queueId ? h(Button, { actionKey: `process-queue:${item.queueId}`, variant: "secondary", onClick: () => processQueueRow(item.queueId) }, "Check / Continue") : null,
      item.taskId ? h(Button, { actionKey: `run-one:${item.staff || "next"}`, onClick: () => runOne(item.staff) }, "Run Staff") : null,
      item.taskId ? h(Button, { actionKey: `snooze-task:${item.taskId}`, variant: "outline", onClick: () => snoozeTask(item.taskId, 24) }, "Snooze 24h") : null,
      item.taskId && reassignTask ? h(Button, { actionKey: `reassign-task:${item.taskId}:AIstaff_Manager`, variant: "outline", onClick: () => reassignTask(item.taskId, "AIstaff_Manager") }, "Ask Manager") : null,
      item.followUpId ? h(Button, { actionKey: `run-one:${item.staff || "next"}`, onClick: () => runOne(item.staff) }, "Run Staff") : null,
      item.followUpId ? h(Button, { actionKey: `snooze-followup:${item.followUpId}`, variant: "outline", onClick: () => snoozeFollowUp(item.followUpId, 24) }, "Snooze 24h") : null,
      item.entityId && closeEntity ? h(Button, { actionKey: `close-entity:${item.entityId}`, variant: "outline", onClick: () => closeEntity(item.entityId) }, "Close Lead") : null,
      h(Button, { variant: "ghost", onClick: () => setDecisionDialog({ decisionType: item.kind, recommendation: `Review ${item.title}`, reason: "", evidence: "", approvalStatus: "Approved" }) }, "Comment")
    )
  );
}

function StaffIdentityPreview({ staffId, dashboard, onClose, onViewProfile }) {
  const profile = staffProfile(staffId);
  const title = staffJobTitle(staffId);
  const fabric = fabricOrFallback(dashboard);
  const openThreads = staffOpenThreadCount(dashboard, staffId);
  const openTasks = staffOpenTasks(dashboard, staffId).length;
  const wakeups = staffWakeupCount(dashboard, staffId);
  const contactRule = staffId === "AIstaff_Manager"
    ? "Alex is the human contact point for this department."
    : "Specialist staff communicate through Alex, not directly with Iman.";
  return h("div", { className: "staff-identity-preview", role: "region", "aria-label": `${profile.label} details` },
    h("div", { className: "contact-info-head" },
      h(Button, { variant: "ghost", size: "icon", onClick: onClose, title: "Close contact info" }, icon("x")),
      h("h3", null, "Contact info")
    ),
    h("div", { className: "staff-identity-main" },
      h("span", { className: "avatar-badge-wrap contact-avatar" }, staffAvatar(staffId), openThreads ? h("span", { className: "avatar-badge" }, openThreads) : null),
      h("div", { className: "contact-title-block" },
        h("h2", null, profile.label),
        h("p", { className: "profile-title-line" }, title),
        h(Badge, null, staffId === "AIstaff_Manager" ? "AI Manager" : (isAiStaffId(staffId) ? "AI Staff" : "Human"))
      )
    ),
    h("div", { className: "contact-info-section" },
      h("p", { className: "section-label" }, "Role"),
      h("p", null, shortText(staffRolePurpose(staffId, fabric), 260))
    ),
    h("div", { className: "contact-info-section" },
      h("p", { className: "section-label" }, "How to work with this person"),
      h("p", null, contactRule)
    ),
    h("div", { className: "contact-info-stats" },
      [["Tasks", openTasks], ["Threads", openThreads], ["Wake-ups", wakeups]].map(([label, value]) =>
        h("div", { className: "mini", key: label }, h("strong", null, value || 0), h("span", null, label))
      )
    ),
    h("div", { className: "staff-identity-actions" },
      h(Button, { variant: "secondary", onClick: onViewProfile }, "View full profile")
    )
  );
}

function ProjectStepOutputDialog({ value, setValue, onClose, onSave }) {
  if (!value) return null;
  const output = value.output || {};
  const step = value.step || {};
  const plan = value.plan || {};
  const update = (patch) => setValue({ ...value, ...patch });
  return h("div", { className: "dialog-overlay" },
    h("div", { className: "dialog-card react-dialog project-output-dialog", role: "dialog", "aria-modal": "true" },
      h("div", { className: "dialog-head" },
        h("div", null,
          h("p", { className: "eyebrow" }, output.outputTemplateId || step.outputTemplateId || "Project output"),
          h("h2", null, step.title || "Project step output"),
          h("p", null, `${plan.applicationId || ""} ${step.stage ? `| ${step.stage}` : ""}`)
        ),
        h(Button, { type: "button", variant: "ghost", size: "icon", onClick: onClose }, icon("x"))
      ),
      value.notice ? h("div", { className: "thread-notice" }, value.notice) : null,
      h("div", { className: "designer-summary-strip" },
        h("span", null, h("strong", null, output.status || "Not started"), "Status"),
        h("span", null, h("strong", null, fmtDate(output.updatedAt) || "new"), "Updated"),
        h("span", null, h("strong", null, staffProfile(output.createdBy || (step.action && step.action.assignedStaff) || step.assignedStaff).label), "Owner")
      ),
      h(Field, { label: "Summary" },
        h(Textarea, { rows: 4, value: value.summary || "", onChange: event => update({ summary: event.target.value }), placeholder: "Concise output summary, blocker, or next route." })
      ),
      h(Field, { label: "Structured content JSON" },
        h(Textarea, { rows: 12, value: value.contentText || "", onChange: event => update({ contentText: event.target.value }), spellCheck: "false" })
      ),
      h("div", { className: "task-filter-grid" },
        h(Field, { label: "Evidence link" }, h(Input, { value: value.evidenceLink || "", onChange: event => update({ evidenceLink: event.target.value }), placeholder: "local path, thread id, source link, or evidence note" })),
        h(Field, { label: "Blocker type" }, h(Input, { value: value.blockerType || "", onChange: event => update({ blockerType: event.target.value }), placeholder: "Only needed when blocked" }))
      ),
      h("p", { className: "dialog-help" }, "Saving this output does not send email, submit a tender, or write to live CRM. Sending to Alex creates a manager review task/thread."),
      h("div", { className: "dialog-actions" },
        h(Button, { type: "button", variant: "ghost", onClick: onClose }, "Cancel"),
        h(Button, { type: "button", variant: "outline", onClick: () => onSave("mark_blocked") }, "Mark blocked"),
        h(Button, { type: "button", variant: "secondary", onClick: () => onSave("save") }, "Save draft"),
        h(Button, { type: "button", onClick: () => onSave("send_to_alex") }, "Send to Alex")
      )
    )
  );
}

function ProjectWorkflowPanel({ projectPlans, labels, openRef, runOne, openTaskDialog, refresh, startProjectStepAction }) {
  const plans = (projectPlans && projectPlans.plans) || [];
  const counts = (projectPlans && projectPlans.counts) || {};
  const [outputDialog, setOutputDialog] = useState(null);

  async function openOutputEditor(plan, step) {
    try {
      const result = await api(`/api/project-step/output?stepId=${encodeURIComponent(step.stepId)}`, { timeoutMs: 20000 });
      const output = result.output || {};
      setOutputDialog({
        plan: result.plan || plan,
        step: result.step || step,
        output,
        summary: output.summary || "",
        contentText: JSON.stringify(output.content || {}, null, 2),
        evidenceLink: output.evidenceLink || "",
        blockerType: output.blockerType || "",
        notice: "",
      });
    } catch (error) {
      setOutputDialog({
        plan,
        step,
        output: {},
        summary: "",
        contentText: "{}",
        evidenceLink: "",
        blockerType: "",
        notice: error.message,
      });
    }
  }

  async function saveOutput(action) {
    if (!outputDialog) return;
    let content = {};
    try {
      content = JSON.parse(outputDialog.contentText || "{}");
    } catch (error) {
      content = { notes: outputDialog.contentText || "", parseWarning: "Content was saved as notes because it was not valid JSON." };
    }
    try {
      const result = await api("/api/project-step/output", {
        method: "POST",
        body: JSON.stringify({
          action,
          stepId: outputDialog.step.stepId,
          planId: outputDialog.plan.planId,
          outputId: outputDialog.output.outputId,
          status: action === "save" ? "Draft" : undefined,
          summary: outputDialog.summary,
          content,
          evidenceLink: outputDialog.evidenceLink,
          blockerType: outputDialog.blockerType,
          createdBy: (outputDialog.step.action && outputDialog.step.action.assignedStaff) || outputDialog.step.assignedStaff,
        }),
        timeoutMs: 30000,
      });
      setOutputDialog(null);
      if (refresh) await refresh();
    } catch (error) {
      setOutputDialog({ ...outputDialog, notice: error.message });
    }
  }

  return h(Fragment, null, h(Card, { className: "project-workflow-card" },
    h(CardHeader, {
      eyebrow: "Project Workflow v2",
      title: "Lead Project Plans",
      description: "Durable local plan state for each tender Lead: AI Manager + staff-owned steps, blockers, approvals, outputs, and evidence.",
      action: h("div", { className: "panel-actions" },
        h(Badge, { tone: counts.blocked ? "warn" : "success" }, counts.blocked ? `${counts.blocked} blocked` : "Plans active"),
        h(Button, { actionKey: "project-plans:refresh", variant: "outline", onClick: refresh }, icon("refresh"), "Refresh")
      )
    }),
    h(CardContent, null,
      projectPlans && projectPlans.error ? h("div", { className: "form-error" }, projectPlans.error) : null,
      h("div", { className: "designer-summary-strip" },
        h("span", null, h("strong", null, counts.total || plans.length || 0), "Plans"),
        h("span", null, h("strong", null, counts.inProgress || 0), "In progress"),
        h("span", null, h("strong", null, counts.blocked || 0), "Blocked"),
        h("span", null, h("strong", null, counts.active || plans.length || 0), "Active")
      ),
      plans.length ? h("div", { className: "project-plan-grid" }, plans.slice(0, 12).map(plan =>
        h("article", { className: cn("project-plan-card", noticeTone(plan.status)), key: plan.planId },
          h("div", { className: "designer-object-head" },
            h("div", null,
              h("p", { className: "eyebrow" }, plan.planId),
              h("h3", null, h(RefChip, { kind: "applications", id: plan.applicationId, labels, openRef, length: 160, showStatus: false })),
              h("small", null, plan.summary || plan.title)
            ),
            h(Badge, null, plan.status)
          ),
          h(DetailList, { rows: [
            { label: "Owner", value: h(StaffChip, { staffId: plan.ownerStaff }), raw: true },
            { label: "Tender case", value: h(RefChip, { kind: "opportunities", id: plan.opportunityId, labels, openRef, length: 160, showStatus: false }), raw: true },
            { label: "Updated", value: fmtDate(plan.updatedAt) },
          ] }),
          h("div", { className: "project-step-list" }, (plan.steps || []).map(step =>
            h("div", { className: cn("project-step-row", noticeTone(`${step.status} ${step.blockerType}`)), key: step.stepId },
              h("span", { className: "project-step-index" }, step.sequence),
              h("div", { className: "project-step-main" },
                h("div", { className: "project-step-titleline" },
                  h("strong", null, step.title),
                  h(Badge, null, step.status)
                ),
                h("small", null, `${step.stage} | ${staffProfile(step.assignedStaff).label}`),
                h("div", { className: "project-step-output" },
                  h("span", null, "Output"),
                  h("p", null, shortText(step.expectedOutput || (step.action && step.action.expectedOutput) || "Step output with evidence and next route.", 170))
                ),
                step.safetyGate || (step.action && step.action.safetyGate) ? h("div", { className: "project-step-output safety" },
                  h("span", null, "Gate"),
                  h("p", null, shortText(step.safetyGate || step.action.safetyGate, 170))
                ) : null,
                step.blockerType ? h("p", { className: "project-step-blocker" }, `${step.blockerType}${step.notes ? `: ${shortText(step.notes, 140)}` : ""}`) : null,
                h("div", { className: "project-step-actions" },
                  h(Button, {
                    actionKey: `project-step:${plan.planId}:${step.stepId || step.sequence}`,
                    size: "sm",
                    variant: step.blockerType ? "secondary" : "primary",
                    onClick: () => startProjectStepAction(plan, step),
                  }, step.nextActionLabel || (step.action && step.action.actionLabel) || (step.status === "Done" ? "Rework" : "Start")),
                  h(Button, { size: "sm", variant: "outline", onClick: () => openOutputEditor(plan, step) }, step.outputStatus && step.outputStatus !== "Not started" ? "Edit output" : "Output"),
                  step.sourceThreadId ? h(Button, { size: "sm", variant: "outline", onClick: () => openTaskDialog({
                    assignedTo: "AIstaff_Manager",
                    taskType: "Manager Guidance",
                    taskCategory: "Manager Guidance",
                    relatedApplicationId: plan.applicationId,
                    applicationId: plan.applicationId,
                    nextAction: `Review thread ${step.sourceThreadId} for project step ${step.stepId} and decide the next route.`,
                  }) }, "Ask Alex") : null,
                  step.queueId ? h(Button, { size: "sm", variant: "outline", onClick: () => openTaskDialog({
                    assignedTo: "AIstaff_Manager",
                    taskType: "Manager Guidance",
                    taskCategory: "Manager Guidance",
                    relatedApplicationId: plan.applicationId,
                    applicationId: plan.applicationId,
                    nextAction: `Review supplier email queue ${step.queueId} for project step ${step.stepId}. Keep external sending approval-gated.`,
                  }) }, "Queue help") : null
                )
              ),
              h("div", { className: "project-step-owner" },
                h(StaffChip, { staffId: (step.action && step.action.assignedStaff) || step.assignedStaff }),
                step.outputTemplateId ? h("small", null, step.outputTemplateId) : null,
                h(Badge, { tone: step.outputStatus === "Approved" ? "success" : step.outputStatus === "Blocked" ? "danger" : step.outputStatus === "Ready for Alex Review" ? "warn" : "neutral" }, step.outputStatus || "Not started")
              )
            )
          )),
          h("div", { className: "notice-actions" },
            h(Button, { actionKey: `run-one:${plan.ownerStaff || "next"}`, variant: "secondary", onClick: () => runOne(plan.ownerStaff) }, "Run owner"),
            h(Button, { variant: "outline", onClick: () => openTaskDialog({ assignedTo: plan.ownerStaff, relatedApplicationId: plan.applicationId, applicationId: plan.applicationId, taskType: "Manager Guidance", taskCategory: "Manager Guidance", nextAction: `Review project plan ${plan.planId} and route the next blocked or ready step.` }) }, "Ask Alex")
          )
        )
      )) : h(EmptyState, { title: "No project plans yet", body: "Plans are generated from active Lead records. Transfer or seed Leads to create durable plan state." })
    )
  ), outputDialog ? h(ProjectStepOutputDialog, { value: outputDialog, setValue: setOutputDialog, onClose: () => setOutputDialog(null), onSave: saveOutput }) : null);
}

function WorkView({ dashboard, tasks, labels, filters, setFilters, runOne, startProjectStepAction, snoozeTask, reassignTask, snoozeFollowUp, processQueueRow, approveEmail, runEmailSafetyCheck, setDecisionDialog, openTaskDialog, openRef, openUniversity, openStaffProfile }) {
  const taskRows = tasks || [];
  const fallbackThreads = useMemo(() => buildLocalThreadsFromTasks(taskRows), [taskRows]);
  const [threadStatus, setThreadStatus] = useState("open");
  const [threadScope, setThreadScope] = useState("human");
  const [staffFilter, setStaffFilter] = useState("");
  const [staffPreviewId, setStaffPreviewId] = useState("");
  const [threadsPayload, setThreadsPayload] = useState({ threads: [], summary: null, loaded: false });
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [threadDetail, setThreadDetail] = useState(null);
  const [composer, setComposer] = useState("");
  const [threadNotice, setThreadNotice] = useState("");
  const [projectPlans, setProjectPlans] = useState(() => (dashboard.projectPlans || { plans: [], counts: {}, loaded: false }));

  const loadThreads = async () => {
    try {
      const params = new URLSearchParams({ status: threadStatus });
      const result = await api(`/api/threads?${params.toString()}`, { timeoutMs: 15000 });
      setThreadsPayload({ threads: result.threads || [], summary: result.summary || null, loaded: true });
      setThreadNotice("");
    } catch (error) {
      setThreadsPayload({ threads: [], summary: null, loaded: false });
      setThreadNotice("Thread server endpoint will be active after restarting the Command Center. Showing local task-derived threads for now.");
    }
  };

  useEffect(() => {
    loadThreads();
  }, [threadStatus, staffFilter, taskRows.length]);

  async function loadProjectPlans() {
    try {
      const result = await api("/api/project-plans?status=active&limit=80", { timeoutMs: 20000 });
      setProjectPlans({ ...result, loaded: true, error: "" });
    } catch (error) {
      setProjectPlans(current => ({ ...(current || {}), loaded: true, error: error.message || String(error) }));
    }
  }

  useEffect(() => {
    loadProjectPlans();
  }, [(dashboard.applications || []).length, taskRows.length]);

  const sourceThreads = threadsPayload.threads && threadsPayload.threads.length ? threadsPayload.threads : fallbackThreads.threads;
  const search = normalizedText(filters.search);
  const scopeThreads = sourceThreads.filter(thread => {
    if (threadScope === "all") return true;
    const humanFacing = isHumanFacingThread(thread);
    return threadScope === "human" ? humanFacing : !humanFacing;
  });
  const visibleThreads = sourceThreads.filter(thread => {
    if (!scopeThreads.includes(thread)) return false;
    const statusMatch = threadStatus === "all" || (threadStatus === "archived" ? thread.archived || thread.status === "Archived" : !thread.archived && thread.status === "Open");
    const actionStaff = threadActionStaffId(thread);
    const staffMatch = !staffFilter || actionStaff === staffFilter;
    const category = (thread.source && thread.source.taskCategory) || "";
    const appId = thread.applicationId || (thread.source && thread.source.applicationId) || "";
    const oppId = thread.opportunityId || (thread.source && thread.source.opportunityId) || "";
    const appFilter = normalizedText(filters.application);
    const searchText = normalizedText([thread.taskId, thread.threadId, thread.lastMessagePreview, appId, oppId, thread.sourceStaffLabel, threadActionStaffLabel(thread), category].join(" "));
    if (filters.category && category !== filters.category) return false;
    const unreadMatch = !filters.unread || (isHumanResponsible(filters.unread) ? isHumanResponsible(thread.unreadFor) : thread.unreadFor === filters.unread);
    if (!unreadMatch) return false;
    if (appFilter && !normalizedText(`${appId} ${oppId}`).includes(appFilter)) return false;
    return statusMatch && staffMatch && (!search || searchText.includes(search));
  });
  const staffCounts = useMemo(() => {
    const counts = {};
    scopeThreads.forEach(thread => {
      if (thread.archived || thread.status !== "Open") return;
      const staffId = threadActionStaffId(thread);
      counts[staffId] = (counts[staffId] || 0) + 1;
    });
    return counts;
  }, [scopeThreads]);
  const staffIds = STAFF_ORDER.filter(id => staffCounts[id]).concat(Object.keys(staffCounts).filter(id => !STAFF_ORDER.includes(id)));

  useEffect(() => {
    if (!visibleThreads.length) {
      setSelectedThreadId("");
      setThreadDetail(null);
      return;
    }
    if (!selectedThreadId || !visibleThreads.some(thread => thread.threadId === selectedThreadId)) {
      setSelectedThreadId(visibleThreads[0].threadId);
    }
  }, [visibleThreads.map(thread => thread.threadId).join("|")]);

  useEffect(() => {
    if (!selectedThreadId) return;
    let cancelled = false;
    async function loadDetail() {
      const fallback = fallbackThreads.details[selectedThreadId];
      try {
        const result = await api(`/api/thread?threadId=${encodeURIComponent(selectedThreadId)}`, { timeoutMs: 15000 });
        if (!cancelled) setThreadDetail(result);
      } catch (error) {
        if (!cancelled) setThreadDetail(fallback || null);
      }
    }
    loadDetail();
    return () => { cancelled = true; };
  }, [selectedThreadId, fallbackThreads]);

  const selectedThread = (threadDetail && threadDetail.thread) || visibleThreads.find(thread => thread.threadId === selectedThreadId) || null;
  const selectedMessages = (threadDetail && threadDetail.messages) || [];
  const selectedSource = (selectedThread && selectedThread.source) || {};
  const selectedQueueId = selectedSource.sourceQueueId || "";
  const updateFilter = (key, value) => setFilters({ ...filters, [key]: value });
  const clearThreadFilters = () => {
    setThreadScope("human");
    setThreadStatus("open");
    setStaffFilter("");
    setFilters({ ...filters, search: "", category: "", unread: "", application: "" });
  };
  const quickThreadFilter = (mode) => {
    if (mode === "all") {
      clearThreadFilters();
    } else if (mode === "unread") {
      setThreadScope("human");
      setThreadStatus("open");
      setFilters({ ...filters, unread: "Human", category: "", application: "" });
    } else if (mode === "human") {
      setThreadScope("human");
      setThreadStatus("open");
      setFilters({ ...filters, unread: "", category: "", application: "" });
    } else if (mode === "internal") {
      setThreadScope("internal");
      setThreadStatus("open");
      setFilters({ ...filters, unread: "", category: "", application: "" });
    } else if (mode === "archive") {
      setThreadStatus("archived");
      setFilters({ ...filters, unread: "", category: "", application: "" });
    }
  };
  const activeThreadChip = threadStatus === "archived" ? "archive" :
    filters.unread ? "unread" :
    threadScope === "internal" ? "internal" :
    threadScope === "human" ? "human" : "all";

  async function sendThreadReply(event) {
    event.preventDefault();
    const body = composer.trim();
    if (!selectedThread || !body) return;
    try {
      const result = await api("/api/thread-message", {
        method: "POST",
        body: JSON.stringify({
          threadId: selectedThread.threadId,
          senderType: "Human",
          senderId: HUMAN_STAFF_ID,
          senderLabel: "Iman Najafi",
          body,
          language: "natural",
        }),
      });
      setComposer("");
      setThreadDetail(result);
      await loadThreads();
    } catch (error) {
      setThreadNotice(`Could not save reply yet: ${error.message}`);
    }
  }

  async function closeSelectedThread() {
    if (!selectedThread) return;
    try {
      const result = await api("/api/thread-close", { method: "POST", body: JSON.stringify({ threadId: selectedThread.threadId, reason: "Resolved by Iman in Command Center." }) });
      setThreadDetail(result);
      await loadThreads();
    } catch (error) {
      setThreadNotice(`Could not close thread: ${error.message}`);
    }
  }

  async function closeSelectedThreadWithLearning() {
    if (!selectedThread) return;
    const proposedRule = window.prompt("What rule should this staff remember from this thread?");
    if (!proposedRule) return;
    try {
      const result = await api("/api/thread-close", {
        method: "POST",
        body: JSON.stringify({
          threadId: selectedThread.threadId,
          reason: "Closed with a proposed staff learning.",
          createLearning: true,
          proposedRule,
          staffId: threadActionStaffId(selectedThread),
        }),
      });
      setThreadDetail(result);
      await loadThreads();
    } catch (error) {
      setThreadNotice(`Could not close with learning: ${error.message}`);
    }
  }

  async function archiveSelectedThread() {
    if (!selectedThread) return;
    try {
      const result = await api("/api/thread-archive", { method: "POST", body: JSON.stringify({ threadId: selectedThread.threadId, archived: true }) });
      setThreadDetail(result);
      await loadThreads();
    } catch (error) {
      setThreadNotice(`Could not archive thread: ${error.message}`);
    }
  }

  return h(Fragment, null,
    h(ProjectWorkflowPanel, { projectPlans, labels, openRef, runOne, openTaskDialog, refresh: loadProjectPlans, startProjectStepAction }),
    h(Card, { className: "threads-card" },
      threadNotice ? h("div", { className: "thread-notice" }, threadNotice) : null,
      h(CardContent, { className: cn("thread-shell no-pad", staffPreviewId && "has-contact-info") },
        h("aside", { className: "thread-staff-rail", "aria-label": "Staff threads" },
          h("button", { className: cn("thread-staff-tab", !staffFilter && "active"), onClick: () => { setStaffFilter(""); setStaffPreviewId(""); } },
            h("span", { className: "all-avatar" }, "All"),
            h("span", { className: "thread-count-badge" }, scopeThreads.filter(thread => !thread.archived && thread.status === "Open").length)
          ),
          staffIds.map(staffId => h("button", { key: staffId, className: cn("thread-staff-tab", staffFilter === staffId && "active"), onClick: () => { setStaffFilter(staffId); setStaffPreviewId(""); }, title: `Show ${staffProfile(staffId).label} threads` },
            h("span", { className: "avatar-badge-wrap" }, staffAvatar(staffId), h("span", { className: "avatar-badge" }, staffCounts[staffId] || 0)),
            h("span", { className: "thread-staff-name" }, staffProfile(staffId).label)
          ))
        ),
        h("section", { className: "thread-list-pane" },
          h("div", { className: "thread-list-controls" },
            h("div", { className: "thread-list-titlebar" },
              h("div", { className: "thread-summary-title" },
                h("h3", null, threadScope === "internal" ? "Internal summaries" : threadStatus === "archived" ? "Archived summaries" : "Task summaries"),
                h("p", null, "Powered by Alex AI")
              ),
              h("div", { className: "thread-title-actions" },
                h(Button, { variant: "ghost", size: "icon", onClick: loadThreads, title: "Refresh threads" }, icon("refresh")),
                h(Button, { variant: "ghost", size: "icon", onClick: () => openTaskDialog({
                  assignedTo: "AIstaff_Manager",
                  taskType: "Manager Guidance",
                  taskCategory: "Manager Guidance",
                  nextAction: "",
                }), title: "Message Alex" }, icon("plus"))
              )
            ),
            h("div", { className: "thread-search-head" },
              h("span", { className: "thread-search-icon", "aria-hidden": "true" }, icon("search")),
              h(Input, { type: "search", value: filters.search, onChange: event => updateFilter("search", event.target.value), placeholder: "Search..." }),
              h("span", { className: "toolbar-count" }, `${visibleThreads.length}`)
            ),
            h("div", { className: "thread-filter-chips", role: "group", "aria-label": "Thread filters" },
              [
                ["human", "All"],
                ["unread", "Unread"],
                ["internal", "Internal"],
                ["archive", "Archive"],
              ].map(([mode, label]) =>
                h("button", { key: mode, type: "button", className: cn("thread-filter-chip", activeThreadChip === mode && "active"), onClick: () => quickThreadFilter(mode) }, label)
              ),
              h("button", { type: "button", className: "thread-filter-chip icon-only", onClick: () => openTaskDialog({
                assignedTo: "AIstaff_Manager",
                taskType: "Manager Guidance",
                taskCategory: "Manager Guidance",
                nextAction: "",
              }), title: "New message to Alex", "aria-label": "New message to Alex" }, "+")
            ),
            h("details", { className: "thread-more-filters" },
              h("summary", null, "More filters"),
              h("div", { className: "task-filter-grid" },
                h(Field, { label: "Scope" }, h(Select, { value: threadScope, onChange: event => setThreadScope(event.target.value) },
                  h("option", { value: "human" }, "Human Inbox"),
                  h("option", { value: "internal" }, "Internal AI Work"),
                  h("option", { value: "all" }, "All Threads")
                )),
                h(Field, { label: "Inbox" }, h(Select, { value: threadStatus, onChange: event => setThreadStatus(event.target.value) },
                  h("option", { value: "open" }, "Open"),
                  h("option", { value: "archived" }, "Archive"),
                  h("option", { value: "all" }, "All")
                )),
                h(Field, { label: "Category" }, h(Select, { value: filters.category || "", onChange: event => updateFilter("category", event.target.value) },
                  h("option", { value: "" }, "All"),
                  TASK_CATEGORIES.map(category => h("option", { key: category, value: category }, category))
                )),
                h(Field, { label: "Unread" }, h(Select, { value: filters.unread || "", onChange: event => updateFilter("unread", event.target.value) },
                  h("option", { value: "" }, "Any"),
                  h("option", { value: "Human" }, "Human"),
                  STAFF_ORDER.filter(id => id !== HUMAN_STAFF_ID).map(id => h("option", { key: id, value: id }, staffProfile(id).label))
                )),
                h(Field, { label: "Related" }, h(Input, { type: "search", value: filters.application || "", onChange: event => updateFilter("application", event.target.value), placeholder: "Lead / tender case" }))
              )
            )
          ),
          h("div", { className: "thread-list-count" }, `${visibleThreads.length} thread${visibleThreads.length === 1 ? "" : "s"}`),
          visibleThreads.length ? visibleThreads.map(thread => h(ThreadListItem, { key: thread.threadId, thread, active: thread.threadId === selectedThreadId, onClick: () => setSelectedThreadId(thread.threadId) })) :
          h(EmptyState, { title: threadScope === "human" ? "No questions for Iman" : "No open task threads", body: threadScope === "human" ? "The AI team may still have internal work, but nothing here currently needs your answer." : "There is no active conversation matching the current filters." })
        ),
        h("section", { className: "thread-conversation-pane" },
          selectedThread ? h(Fragment, null,
            h("div", { className: "thread-conversation-head" },
              h("button", { type: "button", className: "thread-person thread-person-button", onClick: () => setStaffPreviewId(isHumanFacingThread(selectedThread) ? "AIstaff_Manager" : threadActionStaffId(selectedThread)), title: `Open ${isHumanFacingThread(selectedThread) ? "Alex / AI Manager" : threadActionStaffLabel(selectedThread)} details` },
                staffAvatar(isHumanFacingThread(selectedThread) ? "AIstaff_Manager" : threadActionStaffId(selectedThread)),
                h("div", { className: "thread-person-meta" },
                  h("div", { className: "thread-person-title-row" },
                    h("h3", null, isHumanFacingThread(selectedThread) ? "Alex / AI Manager" : threadActionStaffLabel(selectedThread)),
                    h(Badge, { tone: threadReasonTone(selectedThread) }, threadReasonLabel(selectedThread))
                  ),
                  h("p", null, selectedThread.status || "Open", " | ", waitingLabel(selectedThread), isHumanFacingThread(selectedThread) && threadActionStaffId(selectedThread) !== "AIstaff_Manager" ? ` | Internal owner: ${threadActionStaffLabel(selectedThread)}` : "")
                )
              ),
              h("div", { className: "thread-head-actions thread-head-actions-minimal" },
                h(Button, { onClick: closeSelectedThread }, "Close thread")
              )
            ),
            h("details", { className: "thread-meta" },
              h("summary", null, "Task details"),
              h(DetailList, { rows: [
                { label: "Task", value: selectedThread.taskId },
                { label: "Thread", value: selectedThread.threadId },
                { label: "Reason", value: threadReasonLabel(selectedThread) },
                { label: "Human-facing layer", value: isHumanFacingThread(selectedThread) ? "Alex / AI Manager" : "Internal AI staff thread" },
                { label: "Internal owner", value: h(StaffChip, { staffId: threadActionStaffId(selectedThread) }), raw: true },
                { label: "Lead", value: h(RefChip, { kind: "applications", id: selectedThread.applicationId || selectedSource.applicationId, labels, openRef, length: 160, showStatus: false }), raw: true },
                { label: "Tender case", value: h(RefChip, { kind: "opportunities", id: selectedThread.opportunityId || selectedSource.opportunityId, labels, openRef, length: 160, showStatus: false }), raw: true },
                { label: "Tender source", value: h(UniversityButton, { row: selectedSource, openUniversity }), raw: true },
              ] }),
              h("div", { className: "thread-secondary-actions" },
                h(Button, { variant: "outline", onClick: closeSelectedThreadWithLearning }, "Close and save learning"),
                h(Button, { variant: "ghost", onClick: archiveSelectedThread }, "Archive thread")
              )
            ),
            h("div", { className: "thread-messages" },
              selectedMessages.length ? selectedMessages.map(message => h(ThreadMessage, { key: message.messageId, message })) :
              h(ThreadMessage, { message: {
                messageId: "fallback",
                senderType: "AI Staff",
                senderId: threadActionStaffId(selectedThread),
                senderLabel: threadActionStaffLabel(selectedThread),
                body: selectedThread.lastMessagePreview || "This task needs your review.",
                createdAt: selectedThread.lastMessageAt,
              } })
            ),
            selectedQueueId ? h("div", { className: "thread-context-actions" },
              h(Button, { actionKey: `approve-email:${selectedQueueId}`, onClick: () => approveEmail(selectedQueueId) }, "Approve and continue"),
              h(Button, { actionKey: `email-safety:${selectedQueueId}`, variant: "outline", onClick: () => runEmailSafetyCheck(selectedQueueId) }, "Check before sending"),
              h(Button, { actionKey: `process-queue:${selectedQueueId}`, variant: "secondary", onClick: () => processQueueRow(selectedQueueId) }, "Send / continue process")
            ) : null,
            h("form", { className: "thread-composer", onSubmit: sendThreadReply },
              h(Textarea, { value: composer, onChange: event => setComposer(event.target.value), rows: 3, placeholder: isHumanFacingThread(selectedThread) ? "Message Alex in Persian, English, or mixed language..." : "Add an internal note for Alex or the assigned staff..." }),
              h("div", { className: "composer-actions" },
                h("span", null, "Replying does not send email. Human-facing answers go to Alex first."),
                h(Button, { type: "submit", disabled: !composer.trim() }, icon("send"), "Send reply")
              )
            )
          ) : h(EmptyState, { title: "Select a thread", body: "Choose a staff conversation to review the task and reply." })
        ),
        staffPreviewId ? h("aside", { className: "thread-contact-info-pane" },
          h(StaffIdentityPreview, { staffId: staffPreviewId, dashboard, onClose: () => setStaffPreviewId(""), onViewProfile: () => openStaffProfile(staffPreviewId) })
        ) : null
      )
    )
  );
}

function cleanThreadPreview(value) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .replace(/Please reply in your own words\.?\s*/i, "")
    .replace(/I will interpret your answer and continue safely\.?/i, "")
    .replace(/\bTask\s+[a-z0-9_-]{12,}\b/gi, "Task")
    .replace(/\bthread_[a-z0-9_-]{12,}\b/gi, "thread")
    .trim();
  return text || "No message yet";
}

function threadTopic(thread = {}) {
  const source = thread.source || {};
  return source.taskCategory || source.taskType || "Task";
}

function ThreadListItem({ thread, active, onClick }) {
  const source = thread.source || {};
  const actionStaff = threadActionStaffId(thread);
  const humanFacing = isHumanFacingThread(thread);
  const party = humanFacing ? "Alex / AI Manager" : threadActionStaffLabel(thread);
  const internalOwner = humanFacing && actionStaff !== "AIstaff_Manager" ? threadActionStaffLabel(thread) : "";
  const topic = threadTopic(thread);
  const preview = cleanThreadPreview(thread.lastMessagePreview || source.nextAction || source.resultNotes || "");
  const updateCount = [thread.lastMessagePreview, source.nextAction, source.resultNotes, source.lastError].filter(Boolean).length || 1;
  return h("button", { className: cn("thread-list-item", active && "active", isHumanResponsible(thread.unreadFor) && "unread"), onClick, type: "button" },
    h("div", { className: "thread-list-avatar" }, staffAvatar(humanFacing ? "AIstaff_Manager" : actionStaff)),
    h("div", { className: "thread-list-main" },
      h("div", { className: "thread-list-top" },
        h("div", { className: "thread-list-title" }, party),
        h("time", { className: "thread-list-time" }, fmtDate(thread.lastMessageAt))
      ),
      h("div", { className: "thread-list-topic" },
        h("span", { className: cn("thread-reason-pill", threadReasonTone(thread)) }, threadReasonLabel(thread)),
        h("span", null, topic),
        internalOwner ? h("span", null, `Internal owner: ${internalOwner}`) : null
      ),
      h("div", { className: "thread-list-preview" }, `${updateCount} update${updateCount === 1 ? "" : "s"} shared. ${shortText(preview, 126)}`)
    ),
    isHumanResponsible(thread.unreadFor) ? h("span", { className: "unread-dot", title: "Unread for Iman" }) : null
  );
}

function renderMessageTextLine(line, key) {
  const trimmed = String(line || "").trim();
  const heading = trimmed.match(/^\*\*(.+?)\*\*$/);
  if (heading) return h("strong", { key, className: "message-section-title" }, heading[1]);
  if (trimmed.startsWith("- ")) return h("li", { key }, trimmed.slice(2));
  return h("p", { key }, trimmed);
}

function MessageBody({ body }) {
  const blocks = String(body || "").split(/\n{2,}/).map(block => block.trim()).filter(Boolean);
  if (!blocks.length) return h("div", { className: "message-body" }, h("p", null, ""));
  return h("div", { className: "message-body" }, blocks.map((block, index) => {
    const lines = block.split(/\n/).map(line => line.trim()).filter(Boolean);
    if (lines.every(line => line.startsWith("- "))) {
      return h("ul", { key: index }, lines.map((line, lineIndex) => renderMessageTextLine(line, `${index}-${lineIndex}`)));
    }
    return h("div", { key: index, className: "message-block" }, lines.map((line, lineIndex) => renderMessageTextLine(line, `${index}-${lineIndex}`)));
  }));
}

function ThreadMessage({ message }) {
  const isHuman = normalizedText(message.senderType).includes("human") || isHumanResponsible(message.senderId);
  const isSystem = normalizedText(message.senderType).includes("system");
  return h("div", { className: cn("message-row", isHuman ? "human" : "staff", isSystem && "system") },
    !isHuman && !isSystem ? h("span", { className: "message-avatar" }, staffAvatar(message.senderId, true)) : null,
    h("div", { className: "message-bubble" },
      h("div", { className: "message-head" },
        h("span", null, message.senderLabel || staffProfile(message.senderId).label || message.senderType),
        h("time", null, fmtDate(message.createdAt))
      ),
      h(MessageBody, { body: message.body })
    ),
    isHuman && !isSystem ? h("span", { className: "message-avatar human" }, staffAvatar(HUMAN_STAFF_ID, true)) : null
  );
}

function TaskTable({ rows, labels, runOne, snoozeTask, reassignTask, processQueueRow, approveEmail, runEmailSafetyCheck, setDecisionDialog, openRef, openUniversity }) {
  return h("div", { className: "task-table-wrap" },
    h("table", { className: "task-table" },
      h("thead", null, h("tr", null,
        ["Task", "Responsible", "Status", "Due", "Lead", "Action"].map(label => h("th", { key: label }, label))
      )),
      h("tbody", null, rows.map(row => h(TaskTableRow, { key: row.taskId, row, labels, runOne, snoozeTask, reassignTask, processQueueRow, approveEmail, runEmailSafetyCheck, setDecisionDialog, openRef, openUniversity })))
    )
  );
}

function TaskTableRow({ row, labels, runOne, snoozeTask, reassignTask, processQueueRow, approveEmail, runEmailSafetyCheck, setDecisionDialog, openRef, openUniversity }) {
  const status = displayStatus(row);
  const isHuman = isHumanResponsible(row.assignedTo);
  const canRunStaff = !isHuman && !isCodexWorkerHandoff(row);
  const sourceTaskId = row.sourceTaskId || (!row.isHumanTask ? row.taskId : "");
  return h("tr", { className: cn("task-row", row.isHumanTask && "is-human-task", noticeTone(status)) },
    h("td", { className: "task-main-cell" },
      h("div", { className: "task-title-line" }, shortText(row.nextAction || row.taskType || "Task", 150)),
      h("div", { className: "task-subline" }, [
        row.taskType || "Task",
        row.sourceKind ? `Source: ${row.sourceKind}` : "",
        row.taskId,
      ].filter(Boolean).join(" | ")),
      row.lastError || row.resultNotes ? h("p", { className: "task-note" }, shortText(row.lastError || row.resultNotes, 220)) : null
    ),
    h("td", null, h(StaffChip, { staffId: row.assignedTo })),
    h("td", null, h(Badge, null, status)),
    h("td", null, h("span", { className: cn(row.overdue && "late-text") }, fmtDate(row.dueAt) || fmtDate(row.runAfter) || "not set")),
    h("td", null,
      h("div", { className: "task-links" },
        h(UniversityButton, { row, openUniversity }),
        h(RefChip, { kind: "applications", id: row.applicationId || row.entityId, labels, openRef, length: 120, showStatus: false }),
        h(RefChip, { kind: "opportunities", id: row.opportunityId, labels, openRef, length: 120, showStatus: false })
      )
    ),
    h("td", { className: "task-actions-cell" },
      h("div", { className: "task-actions" },
        row.sourceQueueId ? h(Button, { actionKey: `approve-email:${row.sourceQueueId}`, onClick: () => approveEmail(row.sourceQueueId) }, "Approve") : null,
        row.sourceQueueId ? h(Button, { actionKey: `email-safety:${row.sourceQueueId}`, variant: "outline", onClick: () => runEmailSafetyCheck(row.sourceQueueId) }, "Safety") : null,
        row.sourceQueueId ? h(Button, { actionKey: `process-queue:${row.sourceQueueId}`, variant: "secondary", onClick: () => processQueueRow(row.sourceQueueId) }, "Process") : null,
        canRunStaff ? h(Button, { actionKey: `run-one:${row.assignedTo || "next"}`, onClick: () => runOne(row.assignedTo) }, "Run Staff") : null,
        isCodexWorkerHandoff(row) ? h(Button, { variant: "secondary", disabled: true }, "Waiting Codex") : null,
        sourceTaskId ? h(Button, { actionKey: `snooze-task:${sourceTaskId}`, variant: "outline", onClick: () => snoozeTask(sourceTaskId, 24) }, "Snooze") : null,
        sourceTaskId ? h(Button, { actionKey: `reassign-task:${sourceTaskId}:AIstaff_Manager`, variant: "outline", onClick: () => reassignTask(sourceTaskId, "AIstaff_Manager") }, "Manager") : null,
        h(Button, { variant: "ghost", onClick: () => setDecisionDialog({ decisionType: isHuman ? "Human Task Decision" : "Task Review", recommendation: row.taskId, reason: "", evidence: row.evidenceLink || "", approvalStatus: "Approved" }) }, "Comment")
      )
    )
  );
}

function EmailView({ dashboard, processQueueRow, approveEmail, runEmailSafetyCheck, openRef, openUniversity }) {
  const rows = flattenEmailQueue(dashboard.emailQueue || {});
  const labels = buildLabels(dashboard);
  const [communications, setCommunications] = useState({ events: [], outboundAttempts: [], senderIdentities: [], loaded: false, error: "" });
  const [selectedQueueId, setSelectedQueueId] = useState(rows[0] && rows[0].queueId || "");
  const [preview, setPreview] = useState({ loaded: false, error: "", data: null });
  async function loadCommunications() {
    try {
      const result = await api("/api/communications?limit=80");
      setCommunications({ ...result, loaded: true, error: "" });
    } catch (error) {
      setCommunications(current => ({ ...current, loaded: true, error: error.message || String(error) }));
    }
  }
  useEffect(() => {
    loadCommunications();
  }, []);
  useEffect(() => {
    if (!selectedQueueId && rows.length && rows[0].queueId) {
      setSelectedQueueId(rows[0].queueId);
    }
  }, [rows.map(row => row.queueId).join("|"), selectedQueueId]);
  async function loadPreview(queueId = selectedQueueId) {
    if (!queueId) {
      setPreview({ loaded: true, error: "", data: null });
      return;
    }
    try {
      const result = await api(`/api/email-preview?queueId=${encodeURIComponent(queueId)}`, { timeoutMs: 20000 });
      setPreview({ loaded: true, error: "", data: result });
    } catch (error) {
      setPreview({ loaded: true, error: error.message || String(error), data: null });
    }
  }
  useEffect(() => {
    if (selectedQueueId) loadPreview(selectedQueueId);
  }, [selectedQueueId]);
  async function approveAndRefresh(queueId) {
    await approveEmail(queueId);
    await loadPreview(queueId);
    await loadCommunications();
  }
  async function processAndRefresh(queueId) {
    await processQueueRow(queueId);
    await loadPreview(queueId);
    await loadCommunications();
  }
  async function safetyAndRefresh(queueId) {
    await runEmailSafetyCheck(queueId);
    await loadPreview(queueId);
    await loadCommunications();
  }
  const blocked = rows.filter(row => noticeTone(`${row.sendStatus || ""} ${row.approvalStatus || ""} ${row.lastError || ""}`) === "danger").length;
  const approved = rows.filter(row => normalizedText(row.approvalStatus).includes("approved")).length;
  const previewData = preview.data || {};
  const previewMessage = previewData.message || {};
  const selectedRow = rows.find(row => row.queueId === selectedQueueId) || rows[0] || {};
  return h("section", { className: "email-alpha-view" },
    h(Card, null,
      h(CardHeader, {
        eyebrow: "Supervised Email Alpha",
        title: "Supplier Outreach Queue",
        description: "Provider-neutral approval preview, duplicate and attachment checks, communications logging, and local .eml/SMTP only after explicit approval.",
        action: h(Fragment, null,
          h(Button, { actionKey: "email-safety:configured", variant: "secondary", onClick: () => runEmailSafetyCheck("") }, icon("shield"), "Safety Check"),
          h(Button, { actionKey: "communications:refresh", variant: "outline", onClick: loadCommunications }, icon("refresh"), "Refresh Log")
        ),
      }),
      h(CardContent, null,
        h("div", { className: "designer-summary-strip" },
          h("span", null, h("strong", null, rows.length), "Queue rows"),
          h("span", null, h("strong", null, approved), "Approved"),
          h("span", null, h("strong", null, blocked), "Blocked"),
          h("span", null, h("strong", null, (communications.outboundAttempts || []).length), "Attempts"),
          h("span", null, h("strong", null, (communications.senderIdentities || []).length), "Senders")
        ),
        communications.error ? h("div", { className: "form-error" }, communications.error) : null
      )
    ),
    h("div", { className: "email-alpha-grid" },
      h(Card, null,
        h(CardHeader, { title: "Outreach Rows", description: "Select a supplier outreach row to inspect approval, body, attachments, duplicate risk, and draft generation readiness." }),
        h(CardContent, { className: "stack" }, rows.length ? rows.slice(0, 30).map(row =>
          h("article", { className: cn("notice email-row-preview", selectedQueueId === row.queueId && "selected", noticeTone(`${row.sendStatus} ${row.approvalStatus} ${row.lastError}`)), key: row.queueId },
            h("div", { className: "card-topline" }, h("div", null, h("h3", null, row.recipientName || row.to || "Email row"), h("div", { className: "card-meta" }, row.queueId)), h(Badge, null, row.sendStatus || row.approvalStatus)),
            h(DetailList, { rows: [
              { label: "Tender source", value: h(UniversityButton, { row, openUniversity }), raw: true },
              { label: "Lead", value: h(RefChip, { kind: "applications", id: row.applicationId, labels, openRef }), raw: true },
              { label: "Tender case", value: h(RefChip, { kind: "opportunities", id: row.opportunityId, labels, openRef }), raw: true },
              { label: "Provider lane", value: row.provider || row.sendProvider || "local_eml_or_smtp" },
              { label: "Recipient", value: row.recipientName || row.to },
              { label: "Email", value: row.to },
              { label: "Subject", value: row.subject, length: 220 },
              { label: "Approval", value: row.approvalStatus || "Needs approval" },
              { label: "Problem", value: row.lastError, length: 240 },
            ] }),
            h("div", { className: "notice-actions" },
              h(Button, { variant: "outline", onClick: () => setSelectedQueueId(row.queueId) }, "Preview"),
              h(Button, { actionKey: `approve-email:${row.queueId}`, variant: "outline", onClick: () => approveAndRefresh(row.queueId) }, "Approve"),
              h(Button, { actionKey: `process-queue:${row.queueId}`, onClick: () => processAndRefresh(row.queueId) }, "Generate .eml / Send")
            )
          )
        ) : h(EmptyState, { title: "No outreach rows", body: "The current dashboard snapshot did not return supplier outreach queue rows." }))
      ),
      h("div", { className: "email-side-stack" },
      h(Card, { className: "email-approval-screen" },
        h(CardHeader, {
          title: "Approval Screen",
          description: "This preview must pass approval, content, document, attachment, and duplicate gates before local .eml/SMTP processing.",
          action: selectedQueueId ? h(Badge, { tone: previewData.readyToGenerate ? "success" : "warn" }, previewData.readyToGenerate ? "Ready" : "Blocked") : null,
        }),
        h(CardContent, { className: "stack" },
          preview.error ? h("div", { className: "form-error" }, preview.error) : null,
          selectedQueueId ? h(Fragment, null,
            h(DetailList, { rows: [
              { label: "Queue", value: selectedQueueId },
              { label: "Provider lane", value: previewData.providerLane || selectedRow.provider || "local_eml" },
              { label: "Send mode", value: previewData.sendMode || selectedRow.sendMode || "DRAFT" },
              { label: "Draft path", value: previewData.draftPath || "", length: 240 },
              { label: "From", value: previewMessage.from || "" },
              { label: "To", value: previewMessage.to || selectedRow.to },
              { label: "Cc", value: previewMessage.cc || "" },
              { label: "Subject", value: previewMessage.subject || selectedRow.subject, length: 240 },
            ] }),
            h("div", { className: "email-body-preview" },
              h("span", null, "Message body"),
              h("pre", null, previewMessage.body || selectedRow.body || selectedRow.emailBody || "")
            ),
            h("div", { className: "email-gate-grid" }, (previewData.gates || []).map(gate =>
              h("article", { className: cn("email-gate-card", gate.ok ? "ok" : "blocked"), key: gate.id },
                h("div", { className: "card-topline" }, h("strong", null, gate.label), h(Badge, { tone: gate.ok ? "success" : "danger" }, gate.status || (gate.ok ? "Passed" : "Blocked"))),
                h("p", null, gate.message)
              )
            )),
            h("div", { className: "email-evidence-grid" },
              h("article", null,
                h("strong", null, "Attachments"),
                h("p", null, ((previewData.checks || {}).attachments || {}).message || ""),
                (((previewData.checks || {}).attachments || {}).attachments || []).map(path => h("small", { key: path }, path)),
                (((previewData.checks || {}).attachments || {}).blocked || []).map(path => h("small", { key: path, className: "danger-text" }, path))
              ),
              h("article", null,
                h("strong", null, "Duplicate check"),
                h("p", null, ((previewData.checks || {}).duplicate || {}).message || ((previewData.checks || {}).duplicate || {}).error || ""),
                (((previewData.checks || {}).duplicate || {}).duplicates || []).map(item => h("small", { key: item.queueId }, `${item.queueId}: ${item.status}`))
              )
            ),
            h("p", { className: "dialog-help" }, previewData.nextAction || "Select a row to inspect safety gates."),
            h("div", { className: "notice-actions" },
              h(Button, { actionKey: `approve-email:${selectedQueueId}`, variant: "outline", onClick: () => approveAndRefresh(selectedQueueId) }, "Approve exact preview"),
              h(Button, { actionKey: `email-safety:${selectedQueueId}`, variant: "ghost", onClick: () => safetyAndRefresh(selectedQueueId) }, "Run attachment check"),
              h(Button, { actionKey: `process-queue:${selectedQueueId}`, onClick: () => processAndRefresh(selectedQueueId) }, "Generate .eml / Send")
            )
          ) : h(EmptyState, { title: "Select an outreach row", body: "Choose a queue row to inspect the message and safety evidence." })
        )
      ),
      h(Card, null,
        h(CardHeader, { title: "Communications Log", description: "Approval updates, send attempts, local drafts, SMTP responses, safety evidence, and event history." }),
        h(CardContent, { className: "stack" },
          (communications.senderIdentities || []).length ? h("div", { className: "runtime-section-grid" }, communications.senderIdentities.map(sender =>
            h("article", { className: "runtime-section-card", key: sender.id },
              h("strong", null, sender.label || sender.id),
              h("p", null, `${sender.provider || "local"} | ${sender.fromEmail || "sender email not configured"}`),
              h(AccessBadge, { value: sender.accessSummary || "workspace_editable" })
            )
          )) : null,
          (communications.outboundAttempts || []).slice(0, 12).map(attempt =>
            h("article", { className: "notice", key: attempt.attemptId },
              h("div", { className: "card-topline" }, h("div", null, h("h3", null, attempt.subject || attempt.queueId), h("div", { className: "card-meta" }, attempt.attemptId)), h(Badge, null, attempt.status)),
              h(DetailList, { rows: [
                { label: "Queue", value: attempt.queueId },
                { label: "Provider", value: attempt.provider },
                { label: "Recipient", value: attempt.recipient },
                { label: "Approval", value: attempt.approvalState },
                { label: "Evidence", value: attempt.evidenceLink, length: 220 },
                { label: "Created", value: fmtDate(attempt.createdAt) },
              ] })
            )
          ),
          (communications.events || []).slice(0, 12).map(event =>
            h("article", { className: "notice", key: event.eventId },
              h("div", { className: "card-topline" }, h("div", null, h("h3", null, event.eventType || event.status), h("div", { className: "card-meta" }, event.eventId)), h(Badge, null, event.status || event.approvalState)),
              h(DetailList, { rows: [
                { label: "Queue", value: event.queueId },
                { label: "Provider", value: event.provider },
                { label: "Recipient", value: event.recipient },
                { label: "Subject", value: event.subject, length: 180 },
                { label: "Preview", value: event.bodyPreview, length: 220 },
                { label: "Evidence", value: event.evidenceLink, length: 220 },
                { label: "Created", value: fmtDate(event.createdAt) },
              ] })
            )
          ),
          !(communications.outboundAttempts || []).length ? h(EmptyState, { title: "No attempts yet", body: "Process an approved queue row to create a local email attempt or draft log." }) : null
        )
      )
      )
    )
  );
}

function FollowUpsCard({ dashboard, runOne, snoozeFollowUp }) {
  const rows = dashboard.followUps || [];
  return h(Card, null,
    h(CardHeader, { title: "Follow Ups", description: "Self-owned scheduled checks. These are operational reports, not task conversations.", action: h(Badge, null, rows.length) }),
    h(CardContent, { className: "work-list no-pad" }, rows.length ? rows.slice(0, 30).map(row =>
      h("article", { className: cn("work-card", noticeTone(row.status)), key: row.followUpId },
        h("div", { className: "card-topline" }, h("div", null, h("div", { className: "card-title" }, shortText(row.reason || "Follow-up", 76)), h("div", { className: "card-meta" }, row.followUpId)), h(Badge, null, row.status)),
        h(DetailList, { rows: [
          { label: "Owner", value: h(StaffChip, { staffId: row.staff }), raw: true },
          { label: "Due", value: fmtDate(row.dueAt) },
          { label: "Next action", value: row.nextAction || row.result, length: 240 },
          { label: "Active", value: isTruthy(row.active) ? "Active" : "Inactive" },
        ] }),
        h("div", { className: "action-strip" },
          h(Button, { actionKey: `run-one:${row.staff || "next"}`, onClick: () => runOne(row.staff) }, "Run Staff"),
          h(Button, { actionKey: `snooze-followup:${row.followUpId}`, variant: "outline", onClick: () => snoozeFollowUp(row.followUpId, 24) }, "Snooze 24h")
        )
      )
    ) : h(EmptyState, { title: "No follow-ups", body: "No active follow-up rows are visible in this snapshot." }))
  );
}

function staffStageConfig(staffId) {
  return SETTINGS_STAGES.find(item => item.staff === staffId) || { staff: staffId, stages: [], purpose: "" };
}

function staffDashboardRow(dashboard, staffId) {
  return ((dashboard && dashboard.staff) || []).find(row => row.staffId === staffId) || {};
}

function fabricOrFallback(dashboard = {}) {
  const fabric = dashboard.capabilityFabric || {};
  const fallbackCapabilities = SETTINGS_STAGES.map(item => ({
    id: item.staff,
    label: staffProfile(item.staff).label,
    summary: item.purpose,
    ownerStaff: item.staff,
    lifecycleStatus: "Local",
    recipes: [],
    requiredConnections: [],
    databases: [],
    aiSupport: [],
    qualityGates: [],
    outputs: [],
  }));
  return {
    ...fabric,
    solutionModules: fabric.solutionModules && fabric.solutionModules.length ? fabric.solutionModules : SETTINGS_SOLUTIONS.map(solution => ({
      id: solution.id,
      label: solution.name,
      summary: solution.purpose,
      owner: solution.owner,
      lifecycleStatus: solution.status,
      operatingRule: solution.operatingRule,
      modulesUsing: [solution.source],
    })),
    capabilities: fabric.capabilities && fabric.capabilities.length ? fabric.capabilities : fallbackCapabilities,
    recipes: fabric.recipes && fabric.recipes.length ? fabric.recipes : SETTINGS_RECIPES.map(recipe => ({
      id: recipe.name,
      label: recipe.name,
      summary: recipe.output,
      ownerStaff: recipe.owner,
      capabilityId: recipe.owner,
      stages: [],
      outputs: [recipe.output],
      guardrail: recipe.guardrail,
    })),
    lanes: fabric.lanes && fabric.lanes.length ? fabric.lanes : SETTINGS_LANES.map(lane => ({
      id: lane.name,
      label: lane.name,
      routeType: lane.agent,
      ownerStaff: lane.owner,
      connections: [lane.connectors],
      databases: [lane.data],
      aiSupport: [lane.model],
      qualityGates: [lane.guardrail],
    })),
    connections: fabric.connections || [],
    databases: fabric.databases || [],
    aiSupport: fabric.aiSupport || [],
    qualityGates: fabric.qualityGates || [],
    workspaces: fabric.workspaces || [],
    departments: fabric.departments || [],
    departmentTemplates: fabric.departmentTemplates || [],
    workspaceOverrides: fabric.workspaceOverrides || [],
    staffProfiles: fabric.staffProfiles || [],
    outputTemplates: fabric.outputTemplates || [],
    platformSafetySkills: fabric.platformSafetySkills || [],
    departmentSkills: fabric.departmentSkills || [],
    staffTemplateSkills: fabric.staffTemplateSkills || [],
    laneAdapterSkills: fabric.laneAdapterSkills || [],
    skillBindings: fabric.skillBindings || [],
    workspaceBusinessProfile: fabric.workspaceBusinessProfile || {},
    kpis: fabric.kpis || [],
    reportDefinitions: fabric.reportDefinitions || [],
    governance: fabric.governance || {},
    permissions: fabric.permissions || {},
    operatingModel: fabric.operatingModel || {},
    automations: fabric.automations || [],
    summary: fabric.summary || {},
    errors: fabric.errors || [],
  };
}

function byId(rows = []) {
  const out = {};
  rows.forEach(row => { if (row && row.id) out[row.id] = row; });
  return out;
}

function namesFromIds(ids = [], lookup = {}, fallbackLabel = "") {
  const values = (ids || []).map(id => (lookup[id] && (lookup[id].label || lookup[id].name)) || id).filter(Boolean);
  return values.length ? values.join(", ") : fallbackLabel;
}

const STAFF_LEVELS = {
  [HUMAN_STAFF_ID]: "Human Manager",
  AIstaff_Manager: "Expert",
  AIstaff_OpportunityHunter: "Senior",
  AIstaff_FitAnalyst: "Senior",
  AIstaff_ProfessorResearchAnalyst: "Expert",
  AIstaff_ApplicationPackMaker: "Specialist",
  AIstaff_ApplicationPackSender: "Senior",
  AIstaff_FollowUpController: "Junior",
  AIstaff_CRMController: "Senior",
};

const STAFF_REPORTS_TO = {
  [HUMAN_STAFF_ID]: "",
  AIstaff_Manager: HUMAN_STAFF_ID,
  AIstaff_OpportunityHunter: "AIstaff_Manager",
  AIstaff_FitAnalyst: "AIstaff_Manager",
  AIstaff_ProfessorResearchAnalyst: "AIstaff_Manager",
  AIstaff_ApplicationPackMaker: "AIstaff_Manager",
  AIstaff_ApplicationPackSender: "AIstaff_Manager",
  AIstaff_FollowUpController: "AIstaff_Manager",
  AIstaff_CRMController: "AIstaff_Manager",
};

const STAFF_WORKS_WITH = {
  [HUMAN_STAFF_ID]: ["AIstaff_Manager"],
  AIstaff_Manager: STAFF_ORDER.filter(id => id !== HUMAN_STAFF_ID && id !== "AIstaff_Manager"),
  AIstaff_OpportunityHunter: ["AIstaff_Manager", "AIstaff_FitAnalyst", "AIstaff_ProfessorResearchAnalyst"],
  AIstaff_FitAnalyst: ["AIstaff_Manager", "AIstaff_OpportunityHunter", "AIstaff_ProfessorResearchAnalyst", "AIstaff_ApplicationPackMaker"],
  AIstaff_ProfessorResearchAnalyst: ["AIstaff_Manager", "AIstaff_OpportunityHunter", "AIstaff_FitAnalyst", "AIstaff_ApplicationPackMaker"],
  AIstaff_ApplicationPackMaker: ["AIstaff_Manager", "AIstaff_FitAnalyst", "AIstaff_ProfessorResearchAnalyst", "AIstaff_ApplicationPackSender"],
  AIstaff_ApplicationPackSender: ["AIstaff_Manager", "AIstaff_ApplicationPackMaker", "AIstaff_FollowUpController", "AIstaff_CRMController"],
  AIstaff_FollowUpController: ["AIstaff_Manager", "AIstaff_ApplicationPackSender", "AIstaff_CRMController"],
  AIstaff_CRMController: ["AIstaff_Manager", "AIstaff_FollowUpController", "AIstaff_ApplicationPackSender"],
};

function uniqueValues(values = []) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function departmentStaffIds(dashboard = {}) {
  return uniqueValues([...registryStaffIds((dashboard.capabilityFabric || activeFabric())), ...((dashboard.staff || []).map(row => row.staffId))]);
}

function staffLevel(staffId) {
  const override = staffProfileOverride(staffId);
  const registry = registryStaffProfile(staffId);
  return override.aiLevel || (registry && registry.intelligenceLevel) || STAFF_LEVELS[staffId] || (isHumanResponsible(staffId) ? "Human Manager" : "Senior");
}

function staffReportsTo(staffId) {
  if (isHumanResponsible(staffId)) return "";
  const registry = registryStaffProfile(staffId);
  return (registry && registry.managerId) || STAFF_REPORTS_TO[staffId] || "AIstaff_Manager";
}

function staffRolePurpose(staffId, fabric) {
  const override = staffProfileOverride(staffId);
  if (override.roleSummary) return override.roleSummary;
  const registry = registryStaffProfile(staffId);
  if (registry && (registry.roleSummary || registry.summary || registry.contactPolicy)) return registry.roleSummary || registry.summary || registry.contactPolicy;
  const capability = (fabric.capabilities || []).find(row => row.ownerStaff === staffId || row.owner === staffId);
  if (capability && capability.summary) return capability.summary;
  const config = staffStageConfig(staffId);
  return config.purpose || (isHumanResponsible(staffId) ? "Sets priorities, approves learning, and gives the AI Manager direction." : `Owns delegated work inside the ${APP_NAME}.`);
}

function staffJobTitle(staffId) {
  const override = staffProfileOverride(staffId);
  if (override.profileTitle) return override.profileTitle;
  const registry = registryStaffProfile(staffId);
  if (registry && registry.profileTitle) return registry.profileTitle;
  const profile = staffProfile(staffId);
  if (isHumanResponsible(staffId)) return "Department Owner";
  if (staffId === "AIstaff_Manager") return "Department Manager";
  const titles = {
    AIstaff_OpportunityHunter: "Tender Document Analyst",
    AIstaff_FitAnalyst: "Fit And Eligibility Analyst",
    AIstaff_ProfessorResearchAnalyst: "Supplier Mapper",
    AIstaff_ApplicationPackMaker: "Tender Package Maker",
    AIstaff_ApplicationPackSender: "Supplier Outreach Specialist",
    AIstaff_FollowUpController: "Follow-up Coordinator",
    AIstaff_CRMController: "CRM Operations Controller",
  };
  return titles[staffId] || `${staffLevel(staffId)} ${profile.systemLabel || profile.label}`;
}

function staffContactInfo(staffId) {
  const profile = staffProfile(staffId);
  if (isHumanResponsible(staffId)) {
    return {
      email: "iman.najafi86@gmail.com",
      chat: "Command Center thread with AI Manager",
      mobile: "+48 881-400-001",
      company: APP_NAME,
      jobTitle: "Department Owner / Human Manager",
      address: "Krakow, Poland",
    };
  }
  const alias = profile.label.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/(^\.|\.$)/g, "");
  return {
    email: `${alias || "staff"}@local.gcc-lab-ai-department.ai`,
    chat: staffId === "AIstaff_Manager" ? "Direct task thread from Iman" : "Internal task thread through AI Manager",
    mobile: "Not applicable",
    company: APP_NAME,
    jobTitle: staffJobTitle(staffId),
    address: "Local Command Center",
  };
}

function staffCapabilityRows(fabric, staffId) {
  return (fabric.capabilities || []).filter(row => row.ownerStaff === staffId || row.owner === staffId);
}

function staffRecipeRows(fabric, staffId) {
  const capabilities = staffCapabilityRows(fabric, staffId);
  const recipeIds = new Set(capabilities.flatMap(row => row.recipes || []));
  return (fabric.recipes || []).filter(row => row.ownerStaff === staffId || row.owner === staffId || recipeIds.has(row.id));
}

function staffStageRows(fabric, staffId) {
  return staffRecipeRows(fabric, staffId).flatMap(recipe => (recipe.stages || []).map(stage => ({
    ...stage,
    recipeId: recipe.id,
    recipeLabel: recipe.label || recipe.name || recipe.id,
  })));
}

function staffLaneRows(fabric, staffId) {
  const stageLaneIds = new Set(staffStageRows(fabric, staffId).flatMap(stage => stage.lanes || []));
  return (fabric.lanes || []).filter(row => row.ownerStaff === staffId || stageLaneIds.has(row.id));
}

function rowsFromIds(ids = [], lookup = {}) {
  return uniqueValues(ids).map(id => lookup[id] || { id, label: id });
}

function staffConnectionRows(fabric, staffId) {
  const lookup = byId(fabric.connections);
  const override = staffProfileOverride(staffId);
  const capabilities = staffCapabilityRows(fabric, staffId);
  const lanes = staffLaneRows(fabric, staffId);
  return rowsFromIds([
    ...capabilities.flatMap(row => [...(row.requiredConnections || []), ...(row.recommendedConnections || [])]),
    ...lanes.flatMap(row => row.connections || []),
    ...(override.tools || []),
  ], lookup);
}

function staffDatabaseRows(fabric, staffId) {
  const lookup = byId(fabric.databases);
  return rowsFromIds([
    ...staffCapabilityRows(fabric, staffId).flatMap(row => row.databases || []),
    ...staffLaneRows(fabric, staffId).flatMap(row => row.databases || []),
  ], lookup);
}

function staffAiRows(fabric, staffId) {
  const lookup = byId(fabric.aiSupport);
  return rowsFromIds([
    ...staffCapabilityRows(fabric, staffId).flatMap(row => row.aiSupport || []),
    ...staffLaneRows(fabric, staffId).flatMap(row => row.aiSupport || []),
  ], lookup);
}

function staffQualityGateRows(fabric, staffId) {
  const lookup = byId(fabric.qualityGates);
  return rowsFromIds([
    ...staffCapabilityRows(fabric, staffId).flatMap(row => row.qualityGates || []),
    ...staffStageRows(fabric, staffId).flatMap(row => row.qualityGates || []),
    ...staffLaneRows(fabric, staffId).flatMap(row => row.qualityGates || []),
  ], lookup);
}

function staffToolIds(fabric, staffId) {
  const override = staffProfileOverride(staffId);
  const disabled = new Set(override.disabledTools || []);
  const locked = new Set(STAFF_TOOL_CATALOG.filter(tool => tool.locked).map(tool => tool.id));
  return uniqueValues([
    "local_task_threads",
    "event_log",
    "manager_routing",
    ...staffConnectionRows(fabric, staffId).map(row => row.id || row.label),
    ...staffDatabaseRows(fabric, staffId).map(row => row.id || row.label),
    ...staffAiRows(fabric, staffId).map(row => row.id || row.label),
    ...(override.tools || []),
  ]).filter(id => locked.has(id) || !disabled.has(id));
}

function learnedSkillRows(dashboard = {}, staffId = "") {
  const rows = dashboard.skillUpdatesAll || dashboard.skillUpdates || [];
  return rows.filter(row => !staffId || row.staffId === staffId);
}

function staffOpenTasks(dashboard = {}, staffId = "") {
  return (dashboard.tasks || []).filter(row => (!staffId || row.assignedTo === staffId) && !isTerminal(row));
}

function staffOpenThreadCount(dashboard = {}, staffId = "") {
  return ((((dashboard.threadsSummary || {}).byStaff || {})[staffId]) || {}).open || 0;
}

function staffWakeupCount(dashboard = {}, staffId = "") {
  return ((((dashboard.staffWakeups || {}).byStaff || {})[staffId]) || {}).queued || 0;
}

function DepartmentExplorerView({ dashboard, runOne, openTaskDialog, setView, selectedStaffRequest = "" }) {
  const fabric = fabricOrFallback(dashboard);
  const staffIds = departmentStaffIds(dashboard);
  const [explorerTab, setExplorerTab] = useState("org");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  useEffect(() => {
    if (!selectedStaffRequest) return;
    setExplorerTab("org");
    setSelectedStaffId(selectedStaffRequest);
  }, [selectedStaffRequest]);
  return h(Fragment, null,
    h("section", { className: "department-explorer-shell" },
      h("div", { className: "department-main-tabs", role: "tablist", "aria-label": "Department Explorer sections" },
        h("button", { type: "button", role: "tab", "aria-selected": explorerTab === "org", className: cn("department-main-tab", explorerTab === "org" && "active"), onClick: () => setExplorerTab("org") }, icon("user"), "Organization Chart"),
        h("button", { type: "button", role: "tab", "aria-selected": explorerTab === "model", className: cn("department-main-tab", explorerTab === "model" && "active"), onClick: () => { setSelectedStaffId(""); setExplorerTab("model"); } }, icon("chart"), "Operating Model"),
        h("button", { type: "button", role: "tab", "aria-selected": explorerTab === "settings", className: cn("department-main-tab", explorerTab === "settings" && "active"), onClick: () => { setSelectedStaffId(""); setExplorerTab("settings"); } }, icon("shield"), "Department Settings")
      ),
      explorerTab === "settings" ? h(DepartmentSettingsView, { dashboard, fabric }) : null,
      explorerTab === "model" ? h(OperatingModelPanel, { dashboard, fabric }) : null,
      explorerTab === "org" && !selectedStaffId ? h(Card, { className: "department-chart-card chart-enter" },
        h(CardHeader, {
          eyebrow: "Department Explorer",
          title: "Organization Chart",
          description: "Iman owns the department. The AI Manager coordinates specialist AI staff at the same reporting level.",
          action: h(Button, { onClick: () => openTaskDialog({ assignedTo: "AIstaff_Manager", taskType: "Manager Guidance", taskCategory: "Manager Guidance" }) }, icon("send"), "Message Manager"),
        }),
        h(CardContent, null, h(DepartmentHierarchyTree, { dashboard, fabric, staffIds, selectedStaffId, onSelect: setSelectedStaffId }))
      ) : null,
      explorerTab === "org" && selectedStaffId ? h("div", { className: "profile-only-view" },
        h("div", { className: "profile-return-bar" },
          h(Button, { variant: "outline", onClick: () => setSelectedStaffId("") }, "Back to org chart"),
          h("span", null, "Profile view")
        ),
        h(StaffProfilePanel, { dashboard, fabric, staffId: selectedStaffId, runOne, openTaskDialog, setSelectedStaffId })
      ) : null
    )
  );
}

function OperatingModelPanel({ dashboard, fabric }) {
  const model = fabric.operatingModel || {};
  const contract = model.departmentContract || {};
  const threadPolicy = model.threadPolicy || {};
  const visibility = model.visibilityModes || {};
  const runtime = model.automationRuntimeArchitecture || {};
  const scheduler = runtime.projectSchedulerPolicy || {};
  const engine = runtime.externalWorkflowEnginePolicy || {};
  return h("section", { className: "operating-model-panel chart-enter" },
    h(Card, null,
      h(CardHeader, {
        eyebrow: "Owner/Admin View",
        title: model.label || "Reusable Supervised AI Department Operating Model",
        description: "This is the product contract for every reusable AI Department: manager, staff, projects, quality gates, outputs, data, templates, and supervised autonomy.",
        action: h(Badge, null, "Platform contract")
      }),
      h(CardContent, null,
        h("div", { className: "operating-rule-grid" },
          [
            ["Department goal", contract.goal],
            ["Human channel", contract.humanCommunicationRule],
            ["Staff channel", contract.staffCommunicationRule],
            ["Manager role", contract.managerRole],
            ["Safety boundary", contract.safetyBoundary],
          ].filter(([, body]) => body).map(([title, body]) =>
            h("article", { className: "operating-rule-card", key: title }, h("strong", null, title), h("p", null, body))
          )
        )
      )
    ),
    h("div", { className: "operating-model-grid" },
      h(Card, null,
        h(CardHeader, { title: "Thread Policy", description: "Threads exist for real operational reasons, not casual noise." }),
        h(CardContent, null,
          h("h3", null, "Create threads for"),
          h("div", { className: "overview-meta-row" }, (threadPolicy.createThreadsFor || []).map(item => h("span", { key: item }, String(item).replace(/_/g, " ")))),
          h("h3", null, "Do not create for"),
          h("div", { className: "overview-meta-row" }, (threadPolicy.doNotCreateThreadsFor || []).map(item => h("span", { key: item }, String(item).replace(/_/g, " "))))
        )
      ),
      h(Card, null,
        h(CardHeader, { title: "Visibility Modes", description: "Owners inspect structure; sponsored participants see assigned work only." }),
        h(CardContent, null,
          Object.entries(visibility).map(([key, row]) =>
            h("article", { className: "visibility-card compact", key },
              h("h3", null, row.label || key),
              h("p", null, `Visible: ${(row.visible || []).join(", ") || "configured work only"}`),
              h("p", null, `Hidden: ${(row.hidden || []).join(", ") || "internal details"}`)
            )
          )
        )
      ),
      h(Card, null,
        h(CardHeader, { title: "Automation Runtime", description: "Current architecture decision for background work." }),
        h(CardContent, null,
          h(DetailList, { rows: [
            { label: "Current approach", value: runtime.currentApproach },
            { label: "Retry", value: `${(runtime.retryPolicy || {}).maxAttempts || 3} attempts, then ${(runtime.retryPolicy || {}).afterExhaustion || "Failed Requires Attention"}` },
            { label: "Project scheduler", value: scheduler.goal },
            { label: "Workflow engine", value: `${engine.triggerDevDecision || "Deferred"} ${engine.reason || ""}` },
          ] })
        )
      ),
      h(Card, null,
        h(CardHeader, { title: "Template Families", description: "Exportable building blocks for reusable departments." }),
        h(CardContent, null,
          h("div", { className: "overview-meta-row" }, (model.templateFamilies || []).map(item => h("span", { key: item }, item)))
        )
      ),
      h(Card, null,
        h(CardHeader, { title: "Control Plane Split", description: "Reusable templates are governed by platform/admin; workspace users configure installed runtime instances." }),
        h(CardContent, null,
          h(ControlPlaneGrid, { model })
        )
      ),
      h(Card, null,
        h(CardHeader, { title: "Scoped Skill Catalog", description: "Skills are separated by scope and resolved in order, not stored as one giant bucket." }),
        h(CardContent, null,
          h(SkillCatalogSummary, { fabric })
        )
      )
    )
  );
}

function ControlPlaneGrid({ model }) {
  const split = ((model || {}).skillArchitecture || {}).controlSplit || {};
  const rows = [
    ["Platform Admin", split.platformAdmin || ["department blueprints", "staff templates", "lane/tool adapters", "locked safety skills"]],
    ["Workspace Settings", split.workspaceSettings || ["company identity", "active integrations", "approved databases"]],
    ["Department Explorer", split.departmentExplorer || ["installed department preferences", "aliases", "vocabulary", "escalation contacts"]],
    ["Project Workspace", split.projectWorkspace || ["plans", "tasks", "threads", "approvals", "outputs", "evidence"]],
  ];
  return h("div", { className: "control-plane-grid" }, rows.map(([title, items]) =>
    h("article", { className: "control-plane-card", key: title },
      h("strong", null, title),
      h("ul", null, (items || []).map(item => h("li", { key: item }, item)))
    )
  ));
}

function SkillCatalogSummary({ fabric }) {
  const scopes = [
    ["Platform safety", fabric.platformSafetySkills || [], "Locked universal rules"],
    ["Department", fabric.departmentSkills || [], "Inherited by all staff in this department"],
    ["Staff template", fabric.staffTemplateSkills || [], "Reusable craft skills for staff roles"],
    ["Lane / tool", fabric.laneAdapterSkills || [], "Provider and adapter execution rules"],
  ];
  return h("div", { className: "skill-scope-grid" }, scopes.map(([label, rows, description]) =>
    h("article", { className: "skill-scope-card", key: label },
      h("span", null, description),
      h("strong", null, `${label} (${rows.length})`),
      h("div", { className: "skill-chip-list" }, rows.slice(0, 6).map(row =>
        h("span", { className: cn("skill-chip", row.locked && "locked"), key: row.id }, row.label || row.id)
      ))
    )
  ));
}

function DepartmentSettingsView({ dashboard, fabric }) {
  const [settingsTab, setSettingsTab] = useState("departmentSkill");
  const counts = [
    ["Capabilities", (fabric.capabilities || []).length],
    ["Recipes", (fabric.recipes || []).length],
    ["Stages", (fabric.recipes || []).reduce((sum, recipe) => sum + ((recipe.stages || []).length), 0)],
    ["Lanes", (fabric.lanes || []).length],
    ["Scoped skills", (fabric.platformSafetySkills || []).length + (fabric.departmentSkills || []).length + (fabric.staffTemplateSkills || []).length + (fabric.laneAdapterSkills || []).length],
  ];
  const settingTabs = [["departmentSkill", "Department Skill"], ["workspaceProfile", "Workspace Profile"], ["scopedSkills", "Scoped Skills"], ...FABRIC_NOTE_SECTIONS];
  return h("section", { className: "department-settings-view chart-enter" },
    h(Card, { className: "department-settings-card" },
      h(CardHeader, {
        eyebrow: "Department Explorer -> Settings",
        title: settingsTab === "departmentSkill" ? "Department Skill" : (FABRIC_NOTE_SECTIONS.find(([key]) => key === settingsTab) || [null, "Operating Notes"])[1],
        description: "View operating rules in Markdown. Switch to edit mode only when you want to update the department instructions.",
        action: h(Badge, null, "Source of truth")
      }),
      h(CardContent, null,
        h("div", { className: "department-settings-summary" }, counts.map(([label, value]) =>
          h("span", { key: label }, h("strong", null, value), label)
        )),
        h("div", { className: "department-settings-tabs", role: "tablist", "aria-label": "Department settings sections" }, settingTabs.map(([key, label]) =>
          h("button", { key, type: "button", role: "tab", "aria-selected": settingsTab === key, className: cn("department-setting-tab", settingsTab === key && "active"), onClick: () => setSettingsTab(key) }, label)
        )),
        settingsTab === "departmentSkill"
          ? h(SkillFileEditor, {
            scope: "department",
            title: `${APP_NAME} Staff Skill`,
            description: "Department-level rules: operating model, routing, safety, learning, and completion standards."
          })
          : settingsTab === "workspaceProfile"
          ? h(WorkspaceProfilePanel, { fabric })
          : settingsTab === "scopedSkills"
          ? h(ScopedSkillsPanel, { fabric })
          : h(Fragment, null, h(DepartmentRuntimeSectionPanel, { section: settingsTab, fabric, dashboard }), h(FabricNoteEditor, { section: settingsTab }))
      )
    )
  );
}

function DepartmentRuntimeSectionPanel({ section, fabric, dashboard }) {
  if (!FABRIC_NOTE_SECTIONS.some(([key]) => key === section)) return null;
  const rowsBySection = {
    workMap: fabric.capabilities || [],
    lanesTools: fabric.lanes || [],
    qualityGates: fabric.qualityGates || [],
    dataConnectors: [...(fabric.connections || []), ...(fabric.databases || [])],
    aiBrain: fabric.aiSupport || [],
    outputTemplates: fabric.outputTemplates || [],
    learningLibrary: (dashboard.skillUpdatesAll || dashboard.skillUpdates || []),
  };
  const rows = rowsBySection[section] || [];
  const titles = {
    workMap: "Work Map Runtime",
    lanesTools: "AI Staff, Lanes & Tools",
    qualityGates: "Quality Gates",
    dataConnectors: "Connections & Databases",
    aiBrain: "AI Brain",
    outputTemplates: "Output Templates",
    learningLibrary: "Learning Library",
  };
  return h("div", { className: "runtime-section-panel" },
    h("div", { className: "profile-section-head" },
      h("h3", null, titles[section] || "Runtime Section"),
      h("p", null, "Structured local-alpha view for this department section. Edit the Markdown below for operating instructions.")
    ),
    rows.length ? h("div", { className: "runtime-section-grid" }, rows.slice(0, 12).map(row =>
      h("article", { className: "runtime-section-card", key: row.id || row.learningId || row.label },
        h("div", { className: "designer-object-head" },
          h("div", null,
            h("strong", null, row.label || row.name || row.proposedRule || row.id || row.learningId),
            h("small", null, row.id || row.learningId || row.status || "")
          ),
          h(AccessBadge, { value: row.locked ? "platform_locked" : row.workspaceEditable === false ? "platform_locked" : section === "learningLibrary" ? "runtime_context" : "department_editable" })
        ),
        h("p", null, shortText(row.summary || row.purpose || row.rule || row.usage || row.storage || row.reason || "", 190))
      )
    )) : h(EmptyState, { title: "No rows yet", body: "This section is ready for the local alpha, but no structured rows are currently available." })
  );
}

function WorkspaceProfilePanel({ fabric }) {
  const profile = fabric.workspaceBusinessProfile || {};
  return h("div", { className: "workspace-profile-panel" },
    h("div", { className: "profile-section-head" },
      h("h3", null, "Workspace Business Identity"),
      h("p", null, "Company-wide defaults live here and are inherited by AI Departments. These are runtime workspace facts, not platform templates.")
    ),
    h(DetailList, { rows: [
      { label: "Company display name", value: profile.companyDisplayName || "Not set" },
      { label: "Legal company name", value: profile.legalCompanyName || "Not set" },
      { label: "VAT / Tax ID", value: profile.vatOrTaxId || "Not set" },
      { label: "Commercial registration", value: profile.commercialRegistrationNumber || "Not set" },
      { label: "Registered address", value: profile.registeredAddress || "Not set" },
      { label: "Industry", value: profile.industrySector || "Not set" },
      { label: "Default language", value: profile.defaultLanguage || "Not set" },
      { label: "Brand tone", value: profile.approvedBrandTone || "Not set", length: 220 },
      { label: "Manager title", value: profile.defaultManagerTitle || "Not set" },
      { label: "Approved databases", value: (profile.approvedDatabases || []).join(", ") || "Not set", length: 260 },
    ] })
  );
}

function ScopedSkillsPanel({ fabric }) {
  const architecture = ((fabric.operatingModel || {}).skillArchitecture || {});
  const scopes = [
    ["Locked Platform Safety", fabric.platformSafetySkills || [], "Platform Admin", "Cannot be overridden by workspace preferences."],
    ["Department-Level Skills", fabric.departmentSkills || [], "Department Explorer", "Inherited by every staff member in this installed department."],
    ["Staff Template Skills", fabric.staffTemplateSkills || [], "Platform Admin", "Reusable staff craft, such as Outreach Agent or Report Maker."],
    ["Lane / Tool Skills", fabric.laneAdapterSkills || [], "Platform Admin", "Provider-specific execution rules for Gmail, Outlook, CRM, MCP, files, and local adapters."],
  ];
  return h("div", { className: "scoped-skills-panel" },
    h("div", { className: "profile-section-head" },
      h("h3", null, "Scoped Skill Resolution"),
      h("p", null, architecture.overrideRule || "User preferences never override locked safety, department policy, or lane/tool rules.")
    ),
    h("div", { className: "resolution-order" }, (architecture.resolutionOrder || []).map((item, index) =>
      h("span", { key: item }, h("strong", null, index + 1), item.replace(/([A-Z])/g, " $1").trim())
    )),
    h("div", { className: "skill-scope-grid detailed" }, scopes.map(([title, rows, owner, description]) =>
      h("article", { className: "skill-scope-card", key: title },
        h("span", null, owner),
        h("strong", null, `${title} (${rows.length})`),
        h("p", null, description),
        h("div", { className: "skill-list" }, rows.map(row =>
          h("div", { className: "skill-list-row", key: row.id },
            h("div", null, h("strong", null, row.label || row.id), h("p", null, shortText(row.summary || "", 150))),
            h(Badge, { tone: row.locked ? "neutral" : "ok" }, row.locked ? "Locked" : "Editable")
          )
        ))
      )
    )),
    h("article", { className: "overview-narrative" },
      h("h3", null, "Bindings"),
      h("div", { className: "skill-list" }, (fabric.skillBindings || []).map(binding =>
        h("div", { className: "skill-list-row", key: binding.id },
          h("div", null, h("strong", null, binding.id), h("p", null, `${binding.bindingType} -> ${binding.targetId} | ${binding.skillScope}`)),
          h(Badge, null, `Order ${binding.resolutionOrder || ""}`)
        )
      ))
    )
  );
}

function DepartmentOverviewSection({ dashboard, fabric, staffIds, setSection, setSelectedStaffId }) {
  const learning = learnedSkillRows(dashboard);
  const stats = [
    ["Capabilities", (fabric.capabilities || []).length],
    ["Playbooks", (fabric.recipes || []).length],
    ["Work routes", (fabric.lanes || []).length],
    ["Learned skills", learning.length],
  ];
  const capabilities = (fabric.capabilities || []).slice(0, 9);
  return h("section", { className: "department-overview" },
    h("div", { className: "department-stat-grid" }, stats.map(([label, value]) =>
      h("article", { className: "department-stat", key: label }, h("strong", null, value), h("span", null, label))
    )),
    h(Card, null,
      h(CardHeader, { title: "What This Department Can Do", description: "Capabilities are shown as plain responsibilities, while the technical registry stays in Settings." }),
      h(CardContent, { className: "department-capability-grid" }, capabilities.map(capability =>
        h("button", { key: capability.id, type: "button", className: "department-capability", onClick: () => { setSelectedStaffId(capability.ownerStaff || "AIstaff_Manager"); setSection("profiles"); } },
          h(StaffChip, { staffId: capability.ownerStaff || "AIstaff_Manager" }),
          h("strong", null, capability.label || capability.id),
          h("span", null, shortText(capability.summary, 150))
        )
      ))
    ),
    h(Card, null,
      h(CardHeader, { title: "Department Shape", description: "Iman talks to the AI Manager; the Manager coordinates the specialist staff." }),
      h(CardContent, null,
        h(DepartmentHierarchyTree, {
          dashboard,
          fabric,
          staffIds,
          onSelect: id => {
            setSelectedStaffId(id);
            setSection("profiles");
          }
        })
      )
    )
  );
}

function DepartmentOrgSection({ dashboard, fabric, staffIds, selectedStaffId, setSelectedStaffId, search, setSearch, runOne, openTaskDialog }) {
  const visibleStaff = staffIds.filter(id => {
    const text = normalizedText([staffProfile(id).label, staffLevel(id), staffRolePurpose(id, fabric)].join(" "));
    return !search || text.includes(normalizedText(search));
  });
  const selectedIsHuman = isHumanResponsible(selectedStaffId);
  const reports = selectedIsHuman
    ? ["AIstaff_Manager"]
    : staffIds.filter(id => staffReportsTo(id) === selectedStaffId);
  const managerId = staffReportsTo(selectedStaffId);
  return h(Card, { className: "org-explorer-card" },
    h(CardHeader, {
      title: "Org Explorer",
      description: "Search a staff member, inspect their profile, and see who reports to whom.",
      action: h("div", { className: "org-search" }, icon("search"), h(Input, { type: "search", value: search, onChange: event => setSearch(event.target.value), placeholder: "Search staff or responsibility..." }))
    }),
    h(CardContent, { className: "org-layout" },
      h("aside", { className: "org-roster" }, visibleStaff.map(id =>
        h(OrgPersonButton, { key: id, dashboard, fabric, staffId: id, selected: selectedStaffId === id, compact: true, onClick: () => setSelectedStaffId(id) })
      )),
      h("section", { className: "org-focus-panel" },
        managerId ? h("div", { className: "org-chain" },
          h("span", null, "Reports to"),
          h(OrgPersonButton, { dashboard, fabric, staffId: managerId, compact: true, selected: false, onClick: () => setSelectedStaffId(managerId) })
        ) : null,
        h(StaffProfileHero, { dashboard, fabric, staffId: selectedStaffId, runOne, openTaskDialog }),
        selectedIsHuman ? h(DepartmentHierarchyTree, { dashboard, fabric, staffIds, onSelect: setSelectedStaffId }) : null,
        h("div", { className: "org-subsection" },
          h("h3", null, selectedIsHuman ? "Direct report" : "Direct reports"),
          reports.length ? h("div", { className: "org-report-grid" }, reports.map(id =>
            h(OrgPersonButton, { key: id, dashboard, fabric, staffId: id, selected: false, onClick: () => setSelectedStaffId(id) })
          )) : h("p", { className: "muted" }, "No direct reports. This staff works through the AI Manager.")
        )
      )
    )
  );
}

function DepartmentHierarchyTree({ dashboard, fabric, staffIds, onSelect, selectedStaffId = "" }) {
  const aiStaff = staffIds.filter(id => id !== HUMAN_STAFF_ID && id !== "AIstaff_Manager" && staffReportsTo(id) === "AIstaff_Manager");
  return h("div", { className: "department-org-tree", "aria-label": `${APP_NAME} hierarchy` },
    h("div", { className: "org-level org-level-root" },
      h("span", { className: "org-level-label" }, "Department owner"),
      h(OrgPersonButton, { dashboard, fabric, staffId: HUMAN_STAFF_ID, selected: selectedStaffId === HUMAN_STAFF_ID, onClick: () => onSelect(HUMAN_STAFF_ID) })
    ),
    h("div", { className: "org-tree-line vertical" }),
    h("div", { className: "org-level org-level-manager" },
      h("span", { className: "org-level-label" }, "AI Manager"),
      h(OrgPersonButton, { dashboard, fabric, staffId: "AIstaff_Manager", selected: selectedStaffId === "AIstaff_Manager", onClick: () => onSelect("AIstaff_Manager") })
    ),
    h("div", { className: "org-tree-branch" },
      h("span", { className: "org-tree-line vertical short" }),
      h("span", { className: "org-tree-line horizontal" })
    ),
    h("div", { className: "org-level org-level-team" },
      h("span", { className: "org-level-label" }, "Specialist AI staff - same reporting level"),
      h("div", { className: "org-team-row" }, aiStaff.map(id =>
        h(OrgPersonButton, { key: id, dashboard, fabric, staffId: id, selected: selectedStaffId === id, compact: true, onClick: () => onSelect(id) })
      ))
    )
  );
}

function DepartmentProfilesSection({ dashboard, fabric, staffIds, selectedStaffId, setSelectedStaffId, runOne, openTaskDialog }) {
  return h("section", { className: "profile-layout" },
    h(Card, { className: "profile-roster-card" },
      h(CardHeader, { title: "Team Profiles", description: "Choose one staff member to see responsibilities, work steps, routes, checks, and learned skills." }),
      h(CardContent, { className: "profile-roster" }, staffIds.map(id =>
        h(OrgPersonButton, { key: id, dashboard, fabric, staffId: id, selected: selectedStaffId === id, compact: true, onClick: () => setSelectedStaffId(id) })
      ))
    ),
    h(StaffProfilePanel, { dashboard, fabric, staffId: selectedStaffId, runOne, openTaskDialog, setSelectedStaffId })
  );
}

function DepartmentLearningSection({ dashboard, staffIds, setSelectedStaffId, setSection }) {
  const learning = learnedSkillRows(dashboard);
  const [statusFilter, setStatusFilter] = useState("all");
  const filtered = learning.filter(row => statusFilter === "all" || normalizedText(row.status) === statusFilter);
  const counts = ["Pending", "Approved", "Rejected", "Archived"].map(status => [status, learning.filter(row => row.status === status).length]);
  return h(Card, { className: "learning-library-card" },
    h(CardHeader, {
      title: "Learned Skills",
      description: "Lessons proposed from closed Manager/Human threads. Approved learnings are attached to staff role files.",
      action: h(Badge, null, `${learning.length} total`)
    }),
    h(CardContent, null,
      h("div", { className: "learning-toolbar" },
        h("button", { type: "button", className: cn("department-tab", statusFilter === "all" && "active"), onClick: () => setStatusFilter("all") }, "All"),
        counts.map(([status, count]) => h("button", { key: status, type: "button", className: cn("department-tab", statusFilter === normalizedText(status) && "active"), onClick: () => setStatusFilter(normalizedText(status)) }, `${status} ${count}`))
      ),
      filtered.length ? h("div", { className: "learned-skill-list" }, filtered.map(row =>
        h(LearnedSkillCard, { key: row.learningId, row, onStaffClick: () => { setSelectedStaffId(row.staffId || "AIstaff_Manager"); setSection("profiles"); } })
      )) : h(EmptyState, { title: "No learned skills in this filter", body: "Close a thread with learning, then approve it from Reports to attach it to a staff role." }),
      h("div", { className: "staff-learning-index" }, staffIds.filter(id => learnedSkillRows(dashboard, id).length).map(id =>
        h("button", { key: id, type: "button", className: "staff-learning-button", onClick: () => { setSelectedStaffId(id); setSection("profiles"); } },
          h(StaffChip, { staffId: id }),
          h("span", null, `${learnedSkillRows(dashboard, id).length} learned`)
        )
      ))
    )
  );
}

function OrgPersonButton({ dashboard, fabric, staffId, selected, onClick, compact = false }) {
  const profile = staffProfile(staffId);
  const openThreads = staffOpenThreadCount(dashboard, staffId);
  return h("button", { type: "button", className: cn("org-person", compact && "compact", selected && "selected"), onClick },
    h("span", { className: "avatar-badge-wrap" }, staffAvatar(staffId), openThreads ? h("span", { className: "avatar-badge" }, openThreads) : null),
    h("span", { className: "org-person-text" },
      h("strong", null, profile.label),
      h("span", null, staffJobTitle(staffId)),
      compact ? null : h("small", null, profile.systemLabel && profile.systemLabel !== profile.label ? profile.systemLabel : shortText(staffRolePurpose(staffId, fabric), 120))
    )
  );
}

function StaffProfileHero({ dashboard, fabric, staffId, runOne, openTaskDialog }) {
  const profile = staffProfile(staffId);
  const row = staffDashboardRow(dashboard, staffId);
  const contact = staffContactInfo(staffId);
  const isManager = staffId === "AIstaff_Manager";
  const isHuman = isHumanResponsible(staffId);
  return h("article", { className: "staff-profile-hero" },
    h("div", { className: "staff-profile-main" },
      h("span", { className: "staff-profile-avatar-wrap" },
        h("span", { className: "staff-profile-avatar" }, staffAvatar(staffId)),
        h("span", { className: "profile-presence" }, isHuman ? "Owner" : "AI")
      ),
      h("div", null,
        h("h2", null, profile.label),
        h("p", { className: "profile-title-line" }, contact.jobTitle),
        h("p", { className: "muted" }, staffRolePurpose(staffId, fabric))
      )
    ),
    h("div", { className: "staff-profile-actions" },
      h(Button, { onClick: () => openTaskDialog({ assignedTo: "AIstaff_Manager", taskType: "Manager Guidance", taskCategory: "Manager Guidance", nextAction: isHuman || isManager ? "" : `Please review ${profile.systemLabel || profile.label} and route my instruction safely.` }) }, icon("mail"), isHuman || isManager ? "Message Manager" : "Ask Manager"),
      isManager ? h(Button, { actionKey: `run-one:${staffId}`, variant: "secondary", onClick: () => runOne(staffId) }, icon("play"), "Run Manager") : null,
      isHuman || isManager ? h(Button, { variant: "outline", size: "icon", title: contact.email }, icon("mail")) : null,
      isHuman || isManager ? h(Button, { variant: "outline", size: "icon", title: contact.chat }, icon("send")) : null,
      h(Button, { variant: "ghost", size: "icon", title: "More profile actions" }, "...")
    ),
    h("div", { className: "staff-profile-stats" },
      [["Tasks", row.openTasks || staffOpenTasks(dashboard, staffId).length], ["Threads", staffOpenThreadCount(dashboard, staffId)], ["Wake-ups", staffWakeupCount(dashboard, staffId)]].map(([label, value]) =>
        h("span", { key: label }, h("strong", null, value || 0), label)
      )
    )
  );
}

function StaffProfilePanel({ dashboard, fabric, staffId, runOne, openTaskDialog, setSelectedStaffId }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [profileVersion, setProfileVersion] = useState(0);
  const capabilities = staffCapabilityRows(fabric, staffId);
  const recipes = staffRecipeRows(fabric, staffId);
  const stages = staffStageRows(fabric, staffId);
  const lanes = staffLaneRows(fabric, staffId);
  const connections = staffConnectionRows(fabric, staffId);
  const databases = staffDatabaseRows(fabric, staffId);
  const aiRows = staffAiRows(fabric, staffId);
  const gates = staffQualityGateRows(fabric, staffId);
  const learning = learnedSkillRows(dashboard, staffId);
  const openTasks = staffOpenTasks(dashboard, staffId).slice(0, 5);
  const worksWith = STAFF_WORKS_WITH[staffId] || ["AIstaff_Manager"];
  const tabs = [
    ["overview", "Overview"],
    ["contact", "Contact"],
    ["organization", "Organization"],
    ["responsibilities", "Roles"],
    ["steps", "Work steps"],
    ["skill", "Skill file"],
    ["quality", "QAs"],
    ["tools", "Tools & Lanes"],
    ["data", "Data access"],
    ["outputs", "Outputs"],
    ["messages", "Messages"],
    ["learning", "Learned skills"],
    ["settings", "Settings"],
  ];
  return h(Card, { className: "staff-profile-panel" },
    h(CardContent, null,
      h(StaffProfileHero, { dashboard, fabric, staffId, runOne, openTaskDialog }),
      h("div", { className: "profile-tabs", role: "tablist", "aria-label": `${staffProfile(staffId).label} profile sections` }, tabs.map(([key, label]) =>
        h("button", { key, type: "button", role: "tab", "aria-selected": activeTab === key, className: cn("profile-tab", activeTab === key && "active"), onClick: () => setActiveTab(key) }, label)
      )),
      activeTab === "overview" ? h(ProfileOverviewTab, { dashboard, fabric, staffId, openTasks, capabilities, learning }) : null,
      activeTab === "contact" ? h(ProfileContactTab, { staffId }) : null,
      activeTab === "organization" ? h(ProfileSection, { title: "Organization", body: "Reporting line and closest collaborators." },
        h(DetailList, { rows: [
          { label: "Reports to", value: staffReportsTo(staffId) ? h(StaffChip, { staffId: staffReportsTo(staffId) }) : "No one - department root", raw: true },
          { label: "Direct reports", value: staffId === HUMAN_STAFF_ID ? h(StaffChip, { staffId: "AIstaff_Manager" }) : (staffId === "AIstaff_Manager" ? "All specialist AI staff" : "None"), raw: true },
        ] }),
        h("div", { className: "org-report-grid compact" }, worksWith.map(id =>
          h(OrgPersonButton, { key: id, dashboard, fabric, staffId: id, selected: false, compact: true, onClick: () => setSelectedStaffId(id) })
        ))
      ) : null,
      activeTab === "responsibilities" ? h(ProfileSection, { title: "Roles And Responsibilities", body: "Capabilities this person owns." },
          capabilities.length ? capabilities.map(row => h(ProfileListItem, { key: row.id, title: row.label || row.id, body: row.summary })) :
          h("p", { className: "muted" }, staffRolePurpose(staffId, fabric))
      ) : null,
      activeTab === "steps" ? h(ProfileSection, { title: "Work Steps", body: "Playbooks and stages this person follows." },
          recipes.length ? recipes.map(row => h(ProfileListItem, { key: row.id, title: row.label || row.id, body: row.summary })) : null,
          stages.length ? h("div", { className: "stage-strip profile-stage-strip" }, stages.slice(0, 12).map(stage => h("span", { className: "stage-pill", key: `${stage.recipeId}-${stage.id}` }, stage.label || stage.id))) : null
      ) : null,
      activeTab === "skill" ? h(ProfileSkillFileTab, { staffId }) : null,
      activeTab === "tools" ? h(ProfileToolsTab, { fabric, staffId, profileVersion, onChange: () => setProfileVersion(profileVersion + 1), lanes, connections, databases, aiRows }) : null,
      activeTab === "data" ? h(ProfileDataAccessTab, { staffId, connections, databases, aiRows }) : null,
      activeTab === "outputs" ? h(ProfileOutputsTab, { staffId, capabilities, recipes }) : null,
      activeTab === "quality" ? h(ProfileSection, { title: "Quality Checks / QAs", body: "Rules this staff should check before moving work forward." },
          gates.length ? gates.slice(0, 10).map(row => h(ProfileListItem, { key: row.id, title: row.label || row.id, body: row.rule || row.summary || row.id })) :
          h("p", { className: "muted" }, "No staff-specific gates mapped yet.")
      ) : null,
      activeTab === "messages" ? h(ProfileSection, { title: "Messages And Current Work", body: "Task threads are the official communication channel." },
          openTasks.length ? openTasks.map(row => h(ProfileListItem, { key: row.taskId, title: row.taskType || row.taskId, body: row.nextAction || row.resultNotes || row.taskId, meta: displayStatus(row) })) :
          h("p", { className: "muted" }, "No open task visible for this staff."),
          h("div", { className: "profile-message-note" },
            h("strong", null, "Communication rule"),
            h("p", null, isHumanResponsible(staffId) ? "Human messages go to the AI Manager. The Manager allocates work to the team." : (staffId === "AIstaff_Manager" ? "The Manager can communicate with Iman and with every specialist staff member." : "Specialist AI staff communicate with the AI Manager; the Manager decides whether Iman is needed."))
          )
      ) : null,
      activeTab === "learning" ? h(ProfileSection, { title: "Learned Skills", body: "Approved or pending rules learned from closed task threads." },
          learning.length ? learning.slice(0, 5).map(row => h(LearnedSkillCard, { key: row.learningId, row, compact: true })) :
          h("p", { className: "muted" }, "No learned skill recorded for this staff yet.")
      ) : null,
      activeTab === "settings" ? h(ProfileSettingsTab, { key: staffId, staffId, fabric, onSave: () => setProfileVersion(profileVersion + 1) }) : null
    )
  );
}

function ProfileOverviewTab({ dashboard, fabric, staffId, openTasks, capabilities, learning }) {
  const row = staffDashboardRow(dashboard, staffId);
  return h("div", { className: "profile-overview-tab" },
    h("article", { className: "profile-status-card accent" },
      h("div", { className: "profile-status-icon" }, icon("send")),
      h("div", null,
        h("strong", null, isHumanResponsible(staffId) ? "Department owner" : `${staffProfile(staffId).label} is active`),
        h("p", null, isHumanResponsible(staffId) ? "Iman sets KPIs, gives instructions to the AI Manager, and closes human-facing threads." : shortText(row.currentWork || "No open work is currently assigned.", 190))
      )
    ),
    h("article", { className: "profile-status-card" },
      h("div", { className: "profile-status-icon" }, icon("clock")),
      h("div", null,
        h("strong", null, `${row.openTasks || openTasks.length || 0} open tasks | ${staffOpenThreadCount(dashboard, staffId)} open threads`),
        h("p", null, `Next run: ${fmtDate(row.nextRunAt) || "not scheduled"}. Learned rules: ${learning.length}.`)
      )
    ),
    h(ProfileContactTab, { staffId }),
    h("section", { className: "profile-contact-section" },
      h("h3", null, "Role summary"),
      h("p", { className: "muted profile-summary-text" }, staffRolePurpose(staffId, fabric)),
      h("div", { className: "profile-chip-list" }, capabilities.slice(0, 5).map(row => h("span", { key: row.id, className: "profile-chip" }, row.label || row.id)))
    )
  );
}

function ProfileContactTab({ staffId }) {
  const contact = staffContactInfo(staffId);
  return h("section", { className: "profile-contact-section" },
    h("h3", null, "Contact information"),
    h("div", { className: "profile-contact-grid" },
      h(ProfileContactItem, { iconName: "mail", label: "Email", value: contact.email }),
      h(ProfileContactItem, { iconName: "send", label: "Chat", value: contact.chat }),
      h(ProfileContactItem, { iconName: "user", label: "Mobile", value: contact.mobile }),
      h(ProfileContactItem, { iconName: "database", label: "Company", value: contact.company }),
      h(ProfileContactItem, { iconName: "file", label: "Job title", value: contact.jobTitle }),
      h(ProfileContactItem, { iconName: "chart", label: "Business address", value: contact.address })
    )
  );
}

function ProfileSkillFileTab({ staffId }) {
  if (isHumanResponsible(staffId)) {
    return h(ProfileSection, { title: "Skill File", body: "Human_Iman is the department owner, so there is no AI role file to edit here." },
      h("p", { className: "muted" }, "Human instructions are given through Manager threads and KPI settings. AI staff role files live on the AI profiles.")
    );
  }
  return h(ProfileSection, { title: "Skill File", body: "This is the role-specific operating guide this staff should read before acting." },
    h(SkillFileEditor, {
      scope: "staff",
      staffId,
      title: `${staffProfile(staffId).label} Role Skill`,
      description: "Edit role duties, preferred decisions, work standards, and approved learnings. Keep routing and safety rules consistent with the Department Skill."
    })
  );
}

function SkillFileEditor({ scope = "staff", staffId = "", title, description }) {
  const [state, setState] = useState({ loading: true, saving: false, error: "", status: "", path: "", updatedAt: "", content: "", original: "" });
  const [mode, setMode] = useState("view");
  const query = scope === "department"
    ? "/api/skill-file?scope=department"
    : `/api/skill-file?scope=staff&staffId=${encodeURIComponent(staffId)}`;

  useEffect(() => {
    let cancelled = false;
    setState(current => ({ ...current, loading: true, error: "", status: "Loading skill file..." }));
    api(query)
      .then(data => {
        if (cancelled) return;
        setState({
          loading: false,
          saving: false,
          error: "",
          status: data.exists ? "Loaded" : "New file will be created on save",
          path: data.path || "",
          updatedAt: data.updatedAt || "",
          content: data.content || "",
          original: data.content || "",
        });
        setMode("view");
      })
      .catch(error => {
        if (cancelled) return;
        setState(current => ({ ...current, loading: false, saving: false, error: error.message || String(error), status: "Could not load skill file" }));
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  async function save(event) {
    event.preventDefault();
    setState(current => ({ ...current, saving: true, error: "", status: "Saving..." }));
    try {
      const data = await api("/api/skill-file", {
        method: "POST",
        body: JSON.stringify({ scope, staffId, content: state.content })
      });
      setState(current => ({
        ...current,
        saving: false,
        error: "",
        status: "Saved",
        path: data.path || current.path,
        updatedAt: data.updatedAt || current.updatedAt,
        content: data.content || current.content,
        original: data.content || current.content,
      }));
      setMode("view");
    } catch (error) {
      setState(current => ({ ...current, saving: false, error: error.message || String(error), status: "Save failed" }));
    }
  }

  const changed = state.content !== state.original;
  return h("form", { className: "skill-editor", onSubmit: save },
    h("div", { className: "skill-editor-head" },
      h("div", null,
        h("strong", null, title || "Skill File"),
        description ? h("p", null, description) : null
      ),
      h("div", { className: "skill-editor-mode-actions" },
        h(Badge, null, state.status || (state.loading ? "Loading" : "Ready")),
        mode === "view"
          ? h(Button, { type: "button", variant: "outline", onClick: () => setMode("edit"), disabled: state.loading }, icon("file"), "Edit")
          : h(Button, { type: "button", variant: "ghost", onClick: () => { setState(current => ({ ...current, content: current.original, status: "Loaded" })); setMode("view"); } }, "Cancel")
      )
    ),
    h("div", { className: "skill-editor-warning" },
      h("strong", null, "Editable with guardrails"),
      h("span", null, scope === "department"
        ? "Department routing, safety, and learning rules are protected. The save action will block changes that remove core operating-model markers."
        : "Role-specific sections can change, but the Scope and Approved Learnings sections are protected so the role remains usable.")
    ),
    state.error ? h("div", { className: "form-error" }, state.error) : null,
    mode === "view"
      ? h(MarkdownViewer, { content: state.loading ? "Loading..." : state.content, className: "skill-markdown-view" })
      : h("textarea", {
        value: state.content,
        disabled: state.loading || state.saving,
        spellCheck: false,
        onChange: event => setState(current => ({ ...current, content: event.target.value, status: "Editing" })),
        placeholder: state.loading ? "Loading..." : "Write the skill instructions here..."
      }),
    h("div", { className: "skill-editor-meta" },
      h("span", null, state.path || "No path loaded"),
      h("span", null, state.updatedAt ? `Updated ${fmtDate(state.updatedAt)}` : "")
    ),
    h("div", { className: "skill-editor-actions" },
      mode === "edit" ? h(Button, { type: "submit", disabled: state.loading || state.saving || !changed }, state.saving ? "Saving..." : "Save skill file") : null,
      changed ? h(Badge, null, "Unsaved changes") : h(Badge, null, "No changes")
    )
  );
}

function FabricNoteEditor({ section }) {
  const [mode, setMode] = useState("view");
  const [state, setState] = useState({ loading: true, saving: false, error: "", status: "", label: "", path: "", updatedAt: "", content: "", original: "", generated: false });
  const query = `/api/fabric-note?section=${encodeURIComponent(section)}`;

  useEffect(() => {
    let cancelled = false;
    setState(current => ({ ...current, loading: true, error: "", status: "Loading operating note..." }));
    api(query)
      .then(data => {
        if (cancelled) return;
        setState({
          loading: false,
          saving: false,
          error: "",
          status: data.generated ? "Generated default" : "Loaded",
          label: data.label || section,
          path: data.path || "",
          updatedAt: data.updatedAt || "",
          content: data.content || "",
          original: data.content || "",
          generated: Boolean(data.generated),
        });
        setMode("view");
      })
      .catch(error => {
        if (cancelled) return;
        setState(current => ({ ...current, loading: false, saving: false, error: error.message || String(error), status: "Could not load operating note" }));
      });
    return () => {
      cancelled = true;
    };
  }, [query, section]);

  async function save(event) {
    event.preventDefault();
    setState(current => ({ ...current, saving: true, error: "", status: "Saving..." }));
    try {
      const data = await api("/api/fabric-note", {
        method: "POST",
        body: JSON.stringify({ section, content: state.content })
      });
      setState(current => ({
        ...current,
        saving: false,
        error: "",
        status: "Saved",
        label: data.label || current.label,
        path: data.path || current.path,
        updatedAt: data.updatedAt || current.updatedAt,
        content: data.content || current.content,
        original: data.content || current.content,
        generated: Boolean(data.generated),
      }));
      setMode("view");
    } catch (error) {
      setState(current => ({ ...current, saving: false, error: error.message || String(error), status: "Save failed" }));
    }
  }

  const changed = state.content !== state.original;
  return h("form", { className: "skill-editor fabric-note-editor", onSubmit: save },
    h("div", { className: "skill-editor-head" },
      h("div", null,
        h("strong", null, state.label || "Operating Note"),
        h("p", null, "Markdown operating notes for this department parameter. The JSON registry keeps the machine IDs; this note explains the working practice.")
      ),
      h("div", { className: "skill-editor-mode-actions" },
        h(Badge, null, state.status || (state.loading ? "Loading" : "Ready")),
        mode === "view"
          ? h(Button, { type: "button", variant: "outline", onClick: () => setMode("edit"), disabled: state.loading }, icon("file"), "Edit")
          : h(Button, { type: "button", variant: "ghost", onClick: () => { setState(current => ({ ...current, content: current.original, status: current.generated ? "Generated default" : "Loaded" })); setMode("view"); } }, "Cancel")
      )
    ),
    state.generated ? h("div", { className: "skill-editor-warning" },
      h("strong", null, "Generated default"),
      h("span", null, "This note was generated from the registry. Edit and save it to make it an explicit department operating rule.")
    ) : null,
    state.error ? h("div", { className: "form-error" }, state.error) : null,
    mode === "view"
      ? h(MarkdownViewer, { content: state.loading ? "Loading..." : state.content, className: "skill-markdown-view" })
      : h("textarea", {
        value: state.content,
        disabled: state.loading || state.saving,
        spellCheck: true,
        onChange: event => setState(current => ({ ...current, content: event.target.value, status: "Editing" })),
        placeholder: "Write Markdown operating instructions..."
      }),
    h("div", { className: "skill-editor-meta" },
      h("span", null, state.path || "No path loaded"),
      h("span", null, state.updatedAt ? `Updated ${fmtDate(state.updatedAt)}` : "")
    ),
    h("div", { className: "skill-editor-actions" },
      mode === "edit" ? h(Button, { type: "submit", disabled: state.loading || state.saving || !changed }, state.saving ? "Saving..." : "Save operating note") : null,
      changed ? h(Badge, null, "Unsaved changes") : h(Badge, null, "No changes")
    )
  );
}

function ProfileDataAccessTab({ staffId, connections, databases, aiRows }) {
  return h(ProfileSection, { title: "Data Access", body: "Systems this staff can use through mapped lanes. This does not bypass safety gates." },
    h("div", { className: "profile-section-grid" },
      h("div", { className: "access-column" },
        h("h4", null, "Connections"),
        connections.length ? connections.map(row => h(ProfileListItem, { key: row.id, title: row.label || row.id, body: `${row.status || "Mapped"} | ${row.type || "Connection"}`, meta: row.id })) : h("p", { className: "muted" }, "No mapped connections.")
      ),
      h("div", { className: "access-column" },
        h("h4", null, "Databases"),
        databases.length ? databases.map(row => h(ProfileListItem, { key: row.id, title: row.label || row.id, body: `${row.status || "Mapped"} | ${row.type || "Database"}`, meta: row.id })) : h("p", { className: "muted" }, "No mapped databases.")
      )
    ),
    h("div", { className: "access-column" },
      h("h4", null, "AI Support"),
      aiRows.length ? aiRows.map(row => h(ProfileListItem, { key: row.id, title: row.label || row.id, body: `${row.model || ""} ${row.usage || ""}`.trim(), meta: row.reasoningEffort || row.id })) : h("p", { className: "muted" }, "No mapped AI support.")
    ),
    h("div", { className: "profile-message-note" },
      h("strong", null, "Access rule"),
      h("p", null, staffId === "AIstaff_Manager" ? "Manager may route work and escalate to Human, but still cannot send emails from chat replies." : "Specialist staff use these systems only through assigned tasks and Manager routing.")
    )
  );
}

function ProfileOutputsTab({ staffId, capabilities, recipes }) {
  const capabilityOutputs = capabilities.flatMap(capability => (capability.outputs || []).map(output => ({
    title: output,
    body: `${capability.label || capability.id} output owned by ${staffProfile(staffId).label}.`,
    meta: capability.id,
  })));
  const recipeOutputs = recipes.flatMap(recipe => (recipe.outputs || []).map(output => ({
    title: output,
    body: `${recipe.label || recipe.id} recipe output. Must include evidence or a linked task/thread when marked done.`,
    meta: recipe.id,
  })));
  const rows = [...capabilityOutputs, ...recipeOutputs].filter((row, index, all) => all.findIndex(item => item.title === row.title && item.meta === row.meta) === index);
  return h(ProfileSection, { title: "Outputs", body: "What this staff must produce before work can be considered complete." },
    rows.length ? rows.map(row => h(ProfileListItem, { key: `${row.meta}-${row.title}`, title: friendlyId(row.title), body: row.body, meta: row.meta })) :
      h("p", { className: "muted" }, "No staff-specific outputs are mapped yet."),
    h("div", { className: "profile-message-note" },
      h("strong", null, "Completion rule"),
      h("p", null, "A task is not complete unless the output exists, the status changed, and evidence is recorded in the task/thread or CRM.")
    )
  );
}

function ProfileToolsTab({ fabric, staffId, onChange, lanes, connections, databases, aiRows }) {
  const activeIds = new Set(staffToolIds(fabric, staffId));
  const override = staffProfileOverride(staffId);
  const catalogIds = new Set(STAFF_TOOL_CATALOG.map(tool => tool.id));
  const mappedRows = [
    ...lanes.map(row => ({ id: row.id, label: row.label || row.id, description: row.routeType || "Mapped work route", locked: true })),
    ...connections.map(row => ({ id: row.id, label: row.label || row.id, description: row.type || "Mapped connector", locked: false })),
    ...databases.map(row => ({ id: row.id, label: row.label || row.id, description: row.type || "Mapped database", locked: false })),
    ...aiRows.map(row => ({ id: row.id, label: row.label || row.id, description: row.usage || row.model || "Mapped AI support", locked: false })),
  ].filter(row => row.id && !catalogIds.has(row.id));
  const toolRows = [...STAFF_TOOL_CATALOG, ...mappedRows].filter((row, index, rows) => rows.findIndex(item => item.id === row.id) === index);
  function toggleTool(tool, enabled) {
    if (tool.locked) return;
    const current = new Set(override.tools || []);
    const disabled = new Set(override.disabledTools || []);
    if (enabled) {
      current.add(tool.id);
      disabled.delete(tool.id);
    } else {
      current.delete(tool.id);
      disabled.add(tool.id);
    }
    saveStaffProfileOverride(staffId, { tools: Array.from(current), disabledTools: Array.from(disabled) });
    onChange();
  }
  return h(ProfileSection, { title: "Tools & Lanes", body: "Tools can be added or removed for this staff. Lanes are locked work routes; their usage rules live in Department Settings -> Lanes & Tools." },
    h("div", { className: "tools-list" }, toolRows.map(tool => {
      const enabled = activeIds.has(tool.id) || Boolean(tool.locked);
      return h("article", { className: cn("tool-row", enabled && "enabled", tool.locked && "locked"), key: tool.id },
        h("div", null,
          h("strong", null, tool.label || tool.id),
          h("p", null, tool.description || tool.id)
        ),
        h("div", { className: "tool-row-actions" },
          tool.locked ? h(Badge, null, "Mandatory") : h(Button, { variant: enabled ? "outline" : "secondary", onClick: () => toggleTool(tool, !enabled) }, enabled ? "Remove" : "Add"),
          h(Badge, null, enabled ? "Enabled" : "Off")
        )
      );
    }))
  );
}

function ProfileSettingsTab({ staffId, fabric, onSave }) {
  const override = staffProfileOverride(staffId);
  const profile = staffProfile(staffId);
  const [draft, setDraft] = useState({
    alias: override.alias || defaultStaffAlias(staffId) || "",
    profileTitle: override.profileTitle || staffJobTitle(staffId),
    roleSummary: override.roleSummary || staffRolePurpose(staffId, fabric),
    aiLevel: override.aiLevel || staffLevel(staffId),
    avatarUrl: override.avatarUrl || defaultStaffAvatar(staffId) || "",
  });
  const lockedRows = [
    { label: "Staff ID", value: staffId },
    { label: "System role", value: profile.systemLabel || profile.label },
    { label: "Reports to", value: staffReportsTo(staffId) ? staffProfile(staffReportsTo(staffId)).label : "No one - department root" },
    { label: "Human contact rule", value: isHumanResponsible(staffId) || staffId === "AIstaff_Manager" ? "Human can contact the AI Manager." : "Human cannot contact this specialist directly. Use AI Manager." },
  ];
  const update = (key, value) => setDraft({ ...draft, [key]: value });
  function save(event) {
    event.preventDefault();
    saveStaffProfileOverride(staffId, draft);
    onSave();
  }
  return h("section", { className: "profile-section profile-settings-section" },
    h("div", { className: "profile-section-head" },
      h("h3", null, "Profile Settings"),
      h("p", null, "Some fields are locked by the operating model. Editable fields shape how this staff appears and behaves.")
    ),
    h("div", { className: "settings-lock-grid" }, lockedRows.map(row =>
      h("div", { className: "locked-field", key: row.label }, h("small", null, row.label), h("strong", null, row.value))
    )),
    h("form", { className: "profile-settings-form", onSubmit: save },
      h(Field, { label: "Alias / human name" }, h(Input, { value: draft.alias, onChange: event => update("alias", event.target.value), placeholder: profile.systemLabel || profile.label, disabled: isHumanResponsible(staffId) })),
      h(Field, { label: "Profile title" }, h(Input, { value: draft.profileTitle, onChange: event => update("profileTitle", event.target.value) })),
      h(Field, { label: "AI level" }, h(Select, { value: draft.aiLevel, onChange: event => update("aiLevel", event.target.value), disabled: isHumanResponsible(staffId) },
        ["Junior", "Senior", "Expert", "Specialist", "Human Manager"].map(level => h("option", { key: level, value: level }, level))
      )),
      h(Field, { label: "Avatar URL", className: "wide" }, h(Input, { value: draft.avatarUrl, onChange: event => update("avatarUrl", event.target.value), placeholder: staffId === "AIstaff_Manager" ? "UI Faces human avatar URL" : (isAiStaffId(staffId) ? "UI Faces abstract avatar URL" : "Optional avatar URL") })),
      isAiStaffId(staffId) ? h("div", { className: "settings-avatar-actions wide" },
        staffId === "AIstaff_Manager"
          ? h(Button, { type: "button", variant: "secondary", onClick: () => update("avatarUrl", UI_FACES_HUMAN_AVATARS[stableIndex(`${staffId}-${Date.now()}`, UI_FACES_HUMAN_AVATARS.length)]) }, "Pick another human avatar")
          : h(Button, { type: "button", variant: "secondary", onClick: () => update("avatarUrl", UI_FACES_ABSTRACT_AVATARS[stableIndex(`${staffId}-${Date.now()}`, UI_FACES_ABSTRACT_AVATARS.length)]) }, "Pick another abstract avatar"),
        h("span", { className: "muted" }, staffId === "AIstaff_Manager" ? "Default source: UI Faces Popular / Human" : "Default source: UI Faces Abstract")
      ) : null,
      h(Field, { label: "Role summary", className: "wide" }, h(Textarea, { value: draft.roleSummary, rows: 5, onChange: event => update("roleSummary", event.target.value) })),
      h("div", { className: "profile-settings-actions wide" },
        h(Button, { type: "submit" }, "Save profile settings"),
        h(Button, { type: "button", variant: "outline", onClick: () => {
          const resetDraft = {
            alias: "",
            profileTitle: "",
            roleSummary: "",
            aiLevel: "",
            avatarUrl: "",
          };
          saveStaffProfileOverride(staffId, { ...resetDraft, tools: override.tools || [], disabledTools: override.disabledTools || [] });
          setDraft({
            alias: defaultStaffAlias(staffId) || "",
            profileTitle: staffJobTitle(staffId),
            roleSummary: staffRolePurpose(staffId, fabric),
            aiLevel: staffLevel(staffId),
            avatarUrl: defaultStaffAvatar(staffId) || "",
          });
          onSave();
        } }, "Reset editable profile")
      )
    )
  );
}

function ProfileContactItem({ iconName, label, value }) {
  return h("div", { className: "profile-contact-item" },
    h("span", { className: "profile-contact-icon" }, icon(iconName)),
    h("span", null,
      h("small", null, label),
      h("strong", null, value || "Not set")
    )
  );
}

function ProfileSection({ title, body, children }) {
  return h("section", { className: "profile-section" },
    h("div", { className: "profile-section-head" }, h("h3", null, title), body ? h("p", null, body) : null),
    h("div", { className: "profile-section-body" }, children)
  );
}

function ProfileListItem({ title, body, meta }) {
  return h("article", { className: "profile-list-item" },
    h("div", null, h("strong", null, title || "Item"), body ? h("p", null, shortText(body, 220)) : null),
    meta ? h(Badge, null, meta) : null
  );
}

function LearnedSkillCard({ row, compact = false, onStaffClick }) {
  return h("article", { className: cn("learned-skill-card", compact && "compact") },
    h("div", { className: "learned-skill-head" },
      onStaffClick ? h("button", { type: "button", className: "staff-chip-button", onClick: onStaffClick }, h(StaffChip, { staffId: row.staffId || "AIstaff_Manager" })) : h(StaffChip, { staffId: row.staffId || "AIstaff_Manager" }),
      h(Badge, null, row.status || "Pending")
    ),
    h("p", { className: "learned-rule" }, row.proposedRule || "No proposed rule text."),
    compact ? null : h(DetailList, { rows: [
      { label: "Reason", value: row.reason, length: 180 },
      { label: "Evidence", value: row.evidence || row.sourceThreadId, length: 180 },
      { label: "Target", value: row.targetSkillFile, length: 180 },
      { label: "Applied", value: row.appliedAt ? `${fmtDate(row.appliedAt)} by ${row.approvedBy || "Human_Iman"}` : "" },
    ] })
  );
}

function SettingsView({ dashboard }) {
  const [section, setSection] = useState("departmentTemplates");
  const [config, setConfig] = useState({ loading: true, error: "", fabric: fabricOrFallback(dashboard), versions: [], backups: [] });
  const fabric = fabricOrFallback({ ...(dashboard || {}), capabilityFabric: config.fabric || (dashboard && dashboard.capabilityFabric) });
  const sections = [
    ["workspaceProfile", "Workspace Defaults"],
    ["departmentTemplates", "Department Templates"],
    ["staffProfiles", "Staff Profiles"],
    ["capabilities", "Capabilities"],
    ["recipes", "Playbooks"],
    ["stages", "Work Steps"],
    ["lanes", "Tools & Lanes"],
    ["connections", "Connected Apps"],
    ["databases", "Knowledge Sources"],
    ["aiSupport", "AI Brain"],
    ["qualityGates", "QA Gates"],
    ["outputTemplates", "Outputs"],
    ["kpis", "KPIs"],
    ["reportDefinitions", "Reports"],
    ["governance", "Governance"],
    ["history", "History"],
    ["backup", "Backup / Restore"],
  ];
  const totals = {
    workspaceProfile: 1,
    departmentTemplates: (fabric.departmentTemplates || []).length,
    staffProfiles: (fabric.staffProfiles || []).length,
    capabilities: (fabric.capabilities || []).length,
    recipes: (fabric.recipes || []).length,
    stages: (fabric.recipes || []).reduce((sum, recipe) => sum + ((recipe.stages || []).length), 0),
    lanes: (fabric.lanes || []).length,
    connections: (fabric.connections || []).length,
    databases: (fabric.databases || []).length,
    aiSupport: (fabric.aiSupport || []).length,
    qualityGates: (fabric.qualityGates || []).length,
    outputTemplates: (fabric.outputTemplates || []).length,
    kpis: (fabric.kpis || []).length,
    reportDefinitions: (fabric.reportDefinitions || []).length,
    history: (config.versions || []).length,
    backup: (config.backups || []).length,
  };

  async function loadConfig() {
    setConfig(current => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api("/api/department-config");
      setConfig({
        loading: false,
        error: "",
        fabric: data.capabilityFabric || fabric,
        versions: data.versions || [],
        backups: data.backups || [],
      });
      window.__SWISS_PLANNER_FABRIC__ = data.capabilityFabric || {};
    } catch (error) {
      setConfig(current => ({ ...current, loading: false, error: error.message || String(error) }));
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  const collectionSections = new Set(["departmentTemplates", "staffProfiles", "capabilities", "recipes", "lanes", "connections", "databases", "aiSupport", "qualityGates", "outputTemplates", "kpis", "reportDefinitions"]);
  return h(Fragment, null,
    h(Card, { className: "settings-hero" },
      h(CardHeader, {
        eyebrow: "Settings -> Department Designer",
        title: "Configurable AI Department Platform",
        description: `${APP_NAME} is now the first department template. Edit workspace-level profiles, playbooks, tools, QA gates, KPIs, outputs, reports, and safe overrides from one place.`,
        action: h("div", { className: "panel-actions" },
          h(Badge, { tone: fabric.errors && fabric.errors.length ? "danger" : "success" }, fabric.errors && fabric.errors.length ? `${fabric.errors.length} registry issue(s)` : "Registry active"),
          h(Button, { actionKey: "department-config:refresh", variant: "outline", onClick: loadConfig }, icon("refresh"), "Refresh")
        ),
      }),
      h(CardContent, null,
        h("p", { className: "muted" }, "Platform Core handles tasks, threads, routing, safety, reports, backups, and connectors. Department Templates define reusable teams. Workspace Overrides personalize the department for the client."),
        config.error ? h("div", { className: "form-error" }, config.error) : null,
        h("div", { className: "designer-summary-strip" },
          h("span", null, h("strong", null, totals.departmentTemplates || 0), "Templates"),
          h("span", null, h("strong", null, totals.staffProfiles || 0), "Staff profiles"),
          h("span", null, h("strong", null, totals.lanes || 0), "Tool lanes"),
          h("span", null, h("strong", null, totals.qualityGates || 0), "QA gates"),
          h("span", null, h("strong", null, totals.backup || 0), "Backups")
        ),
        h("div", { className: "settings-tabs", role: "tablist", "aria-label": "Settings sections" }, sections.map(([key, label]) =>
          h("button", { key, type: "button", className: cn("settings-tab", section === key && "active"), onClick: () => setSection(key) },
            h("span", null, label),
            totals[key] !== undefined ? h("small", null, totals[key] || 0) : null
          )
        ))
      )
    ),
    collectionSections.has(section) ? h(DesignerCollectionSection, { collection: section, fabric, refresh: loadConfig }) : null,
    section === "workspaceProfile" ? h(WorkspaceProfileEditor, { fabric, refresh: loadConfig }) : null,
    section === "stages" ? h(SettingsStagesSection, { fabric }) : null,
    section === "governance" ? h(GovernanceDesignerSection, { fabric }) : null,
    section === "history" ? h(VersionHistorySection, { versions: config.versions, refresh: loadConfig }) : null,
    section === "backup" ? h(BackupRestoreSection, { backups: config.backups, refresh: loadConfig }) : null
  );
}

function WorkspaceProfileEditor({ fabric, refresh }) {
  const [profile, setProfile] = useState(() => ({ ...((fabric && fabric.workspaceBusinessProfile) || {}) }));
  const [status, setStatus] = useState("");
  const fields = [
    ["companyDisplayName", "Company display name"],
    ["legalCompanyName", "Legal company name"],
    ["vatOrTaxId", "VAT / Tax ID"],
    ["commercialRegistrationNumber", "Commercial registration"],
    ["registeredAddress", "Registered address"],
    ["industrySector", "Industry / sector"],
    ["defaultLanguage", "Default language"],
    ["defaultManagerTitle", "Manager title/name"],
    ["approvedEmailSignature", "Approved email signature"],
  ];

  useEffect(() => {
    setProfile({ ...((fabric && fabric.workspaceBusinessProfile) || {}) });
  }, [fabric && fabric.workspaceBusinessProfile && fabric.workspaceBusinessProfile.updatedAt]);

  function setProfileValue(key, value) {
    setProfile(current => ({ ...(current || {}), [key]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setStatus("Saving workspace defaults...");
    try {
      const result = await api("/api/workspace-profile", {
        method: "POST",
        body: JSON.stringify({
          ...profile,
          approvedSenderIdentities: listText(profile.approvedSenderIdentities),
          activeConnections: listText(profile.activeConnections),
          approvedDatabases: listText(profile.approvedDatabases),
          updatedBy: "Human_Iman",
        }),
      });
      setProfile(result.workspaceProfile || profile);
      setStatus("Workspace defaults saved and versioned.");
      await refresh();
    } catch (error) {
      setStatus(error.message || String(error));
    }
  }

  return h(Card, { className: "designer-section-card" },
    h(CardHeader, {
      eyebrow: "Workspace Settings",
      title: "Workspace Defaults",
      description: "Company identity and safe defaults inherited by installed AI Departments. These are workspace facts, not platform template internals.",
      action: h(AccessBadge, { value: "workspace_editable" }),
    }),
    h(CardContent, null,
      status ? h("div", { className: "designer-status" }, status) : null,
      h("form", { className: "workspace-profile-form", onSubmit: saveProfile },
        fields.map(([key, label]) =>
          h(Field, { key, label },
            key === "registeredAddress" || key === "approvedEmailSignature"
              ? h(Textarea, { rows: 3, value: profile[key] || "", onChange: event => setProfileValue(key, event.target.value) })
              : h(Input, { value: profile[key] || "", onChange: event => setProfileValue(key, event.target.value) })
          )
        ),
        h(Field, { label: "Approved brand tone", className: "wide" },
          h(Textarea, { rows: 3, value: profile.approvedBrandTone || "", onChange: event => setProfileValue("approvedBrandTone", event.target.value) })
        ),
        h(Field, { label: "Approved sender identities", className: "wide" },
          h(Textarea, { rows: 3, value: listText(profile.approvedSenderIdentities), onChange: event => setProfileValue("approvedSenderIdentities", event.target.value), placeholder: "One sender identity per line or comma-separated" })
        ),
        h(Field, { label: "Active connections", className: "wide" },
          h(Textarea, { rows: 3, value: listText(profile.activeConnections), onChange: event => setProfileValue("activeConnections", event.target.value) })
        ),
        h(Field, { label: "Approved databases", className: "wide" },
          h(Textarea, { rows: 3, value: listText(profile.approvedDatabases), onChange: event => setProfileValue("approvedDatabases", event.target.value) })
        ),
        h("div", { className: "profile-settings-actions wide" },
          h(Button, { type: "submit" }, icon("save"), "Save workspace defaults"),
          h("span", { className: "muted" }, "Locked platform and lane rules cannot be changed here.")
        )
      )
    )
  );
}

const DESIGNER_META = {
  departmentTemplates: {
    eyebrow: "Template",
    title: "Department Templates",
    description: `Reusable blueprints. ${APP_NAME} is active; sample templates prove the platform can host another department without source-code edits.`,
    empty: { id: "template_new_department", label: "New Department Template", purpose: "Describe what this department does.", status: "Draft", capabilities: [], staffProfiles: [], workspaceEditable: true },
  },
  staffProfiles: {
    eyebrow: "Profile",
    title: "Staff Profiles",
    description: "Human-friendly aliases, titles, levels, reporting line, avatar policy, and contact rules for the org explorer.",
    empty: { id: "AIstaff_NewSpecialist", label: "New Specialist", alias: "New", profileTitle: "AI Specialist", role: "Specialist AI Staff", managerId: "AIstaff_Manager", intelligenceLevel: "Junior", workspaceEditable: true },
  },
  capabilities: {
    eyebrow: "Capability",
    title: "What The Department Can Do",
    description: "Business responsibilities owned by AI staff.",
    empty: { id: "new_capability", label: "New Capability", summary: "Describe the responsibility.", lifecycleStatus: "Draft", ownerStaff: "AIstaff_Manager", recipes: [], requiredConnections: [], databases: [], aiSupport: [], qualityGates: [], outputs: [], workspaceEditable: true },
  },
  recipes: {
    eyebrow: "Playbook",
    title: "Playbooks",
    description: "Standard operating methods with work steps and handoffs.",
    empty: { id: "recipe_new_playbook", capabilityId: "new_capability", label: "New Playbook", summary: "Describe the playbook.", ownerStaff: "AIstaff_Manager", stages: [], outputs: [], workspaceEditable: true },
  },
  lanes: {
    eyebrow: "Tool Lane",
    title: "Tools & Lanes",
    description: "How a staff member uses a tool, connector, database, model, and evidence rule.",
    empty: { id: "lane_new_tool_route", label: "New Tool Route", routeType: "tool route", ownerStaff: "AIstaff_Manager", connections: [], databases: [], aiSupport: [], qualityGates: [], workspaceEditable: true },
  },
  connections: {
    eyebrow: "Connected App",
    title: "Connected Apps",
    description: "External apps, APIs, bridges, and local tools available to the department.",
    empty: { id: "new_connection", label: "New Connected App", status: "Draft", type: "connector", requiredFor: [], workspaceEditable: true },
  },
  databases: {
    eyebrow: "Knowledge Source",
    title: "Knowledge / Data Sources",
    description: "Tables, files, memory, CRM data, and local stores used by staff.",
    empty: { id: "new_database", label: "New Knowledge Source", status: "Draft", type: "database", workspaceEditable: true },
  },
  aiSupport: {
    eyebrow: "AI Brain",
    title: "AI Brain",
    description: "Model, reasoning level, cost policy, fallback behavior, and allowed staff.",
    empty: { id: "ai_new_brain", label: "New AI Brain", model: "gpt-5-mini", reasoningEffort: "low", ownerStaff: "AIstaff_Manager", usage: "Describe when to use it.", workspaceEditable: true },
  },
  qualityGates: {
    eyebrow: "QA Gate",
    title: "QA Gates",
    description: "Blocking or advisory checks that decide whether work can continue.",
    empty: { id: "gate_new_quality_check", label: "New Quality Check", rule: "Describe the check.", severity: "Blocking", workspaceEditable: true },
  },
  outputTemplates: {
    eyebrow: "Output",
    title: "Output Templates",
    description: "Deliverable standards for documents, reports, CRM updates, emails, and evidence packages.",
    empty: { id: "output_new_deliverable", label: "New Deliverable", ownerStaff: "AIstaff_Manager", requiredSections: [], storage: "Define storage.", qualityGates: [], workspaceEditable: true },
  },
  kpis: {
    eyebrow: "KPI",
    title: "KPIs",
    description: "Targets that drive the Manager cycle and stop/continue decisions.",
    empty: { id: "kpi_new_target", label: "New KPI", periodType: "Weekly", targetUnit: "Tasks", targetCount: 1, ownerStaff: "AIstaff_Manager", workspaceEditable: true },
  },
  reportDefinitions: {
    eyebrow: "Report",
    title: "Report Definitions",
    description: "Manager-readable report sections, periods, and decision focus.",
    empty: { id: "report_new_view", label: "New Report", purpose: "Explain what the report should help decide.", sections: [], defaultPeriod: "Last 7 days", workspaceEditable: true },
  },
};

function designerMeta(collection) {
  return DESIGNER_META[collection] || { eyebrow: "Object", title: collection, description: "", empty: { id: `${collection}_new`, label: "New Object", workspaceEditable: true } };
}

function designerSummary(item = {}) {
  return item.summary || item.purpose || item.rule || item.usage || item.storage || item.contactPolicy || item.minimumEvidenceLevel || item.defaultPeriod || "";
}

function designerOwner(item = {}) {
  return item.ownerStaff || item.owner || item.aiManager || item.humanManager || item.managerId || "";
}

function DesignerCollectionSection({ collection, fabric, refresh }) {
  const meta = designerMeta(collection);
  const [editor, setEditor] = useState(null);
  const rows = Array.isArray(fabric[collection]) ? fabric[collection] : [];
  const [status, setStatus] = useState("");

  function openEditor(item) {
    setEditor({
      item: jsonPretty(item),
      originalId: item.id || "",
      error: "",
      saving: false,
      isNew: !item.id || item.__new,
    });
  }

  async function saveEditor(event) {
    event.preventDefault();
    if (!editor) return;
    setEditor(current => ({ ...current, saving: true, error: "" }));
    try {
      const item = JSON.parse(editor.item);
      const result = await api("/api/fabric-object", {
        method: "POST",
        body: JSON.stringify({ collection, item, reason: "Updated from Department Designer.", updatedBy: "Human_Iman" }),
      });
      setStatus(`Saved ${item.id}. Version: ${((result.version || {}).versionId) || "recorded"}.`);
      setEditor(null);
      await refresh();
    } catch (error) {
      setEditor(current => ({ ...current, saving: false, error: error.message || String(error) }));
    }
  }

  async function archiveItem(item) {
    if (!item || !item.id) return;
    if (!window.confirm(`Archive ${item.label || item.id}?`)) return;
    try {
      await api("/api/fabric-object/archive", {
        method: "POST",
        body: JSON.stringify({ collection, objectId: item.id, reason: "Archived from Department Designer.", updatedBy: "Human_Iman" }),
      });
      setStatus(`Archived ${item.id}.`);
      await refresh();
    } catch (error) {
      setStatus(error.message || String(error));
    }
  }

  return h(Card, { className: "designer-section-card" },
    h(CardHeader, {
      eyebrow: "Department Designer",
      title: meta.title,
      description: meta.description,
      action: h(Button, { onClick: () => openEditor({ ...meta.empty, id: `${meta.empty.id}_${Date.now()}`, __new: true }) }, icon("plus"), "Add object"),
    }),
    h(CardContent, null,
      status ? h("div", { className: "designer-status" }, status) : null,
      rows.length ? h("div", { className: "designer-object-grid" }, rows.map(item =>
        h("article", { className: cn("designer-object-card", item.locked && "is-locked"), key: item.id || JSON.stringify(item).slice(0, 30) },
          h("div", { className: "designer-object-head" },
            h("div", null,
              h("p", { className: "eyebrow" }, meta.eyebrow),
              h("h3", null, item.label || item.name || item.id || "Object"),
              item.id ? h("small", null, item.id) : null
            ),
            h(Badge, { tone: item.locked ? "warn" : undefined }, item.locked ? "Locked" : (item.status || item.lifecycleStatus || "Editable"))
          ),
          designerSummary(item) ? h("p", { className: "designer-object-summary" }, shortText(designerSummary(item), 210)) : null,
          h(DetailList, { rows: [
            { label: "Owner", value: designerOwner(item) ? h(StaffChip, { staffId: designerOwner(item) }) : "Not assigned", raw: Boolean(designerOwner(item)) },
            { label: "Workspace editable", value: item.workspaceEditable === false ? "No" : "Yes" },
            { label: "Updated", value: fmtDate(item.updatedAt) },
          ] }),
          h("div", { className: "designer-object-actions" },
            h(Button, { variant: "outline", onClick: () => openEditor(item) }, icon("file"), item.locked ? "View JSON" : "Edit JSON"),
            item.locked ? null : h(Button, { variant: "ghost", onClick: () => archiveItem(item) }, "Archive")
          )
        )
      )) : h(EmptyState, { title: `No ${meta.title.toLowerCase()} yet`, body: "Add one from the designer. It will be versioned and backed up before saving." }),
      editor ? h(DesignerObjectEditor, { editor, setEditor, collection, meta, saveEditor }) : null
    )
  );
}

function jsonPretty(value) {
  return JSON.stringify(value || {}, null, 2);
}

function DesignerObjectEditor({ editor, setEditor, collection, meta, saveEditor }) {
  return h("div", { className: "designer-editor-backdrop", role: "dialog", "aria-modal": "true" },
    h("form", { className: "designer-editor", onSubmit: saveEditor },
      h("div", { className: "designer-editor-head" },
        h("div", null,
          h("p", { className: "eyebrow" }, meta.eyebrow),
          h("h3", null, editor.isNew ? `Add ${meta.eyebrow}` : `Edit ${meta.eyebrow}`),
          h("p", null, `Collection: ${collection}`)
        ),
        h(Button, { type: "button", variant: "ghost", size: "icon", onClick: () => setEditor(null), title: "Close" }, icon("x"))
      ),
      h("div", { className: "skill-editor-warning" },
        h("strong", null, "Safe JSON editor"),
        h("span", null, "Saves are validated, backed up, and versioned. Platform-locked objects cannot be overwritten from this workspace screen.")
      ),
      editor.error ? h("div", { className: "form-error" }, editor.error) : null,
      h("textarea", {
        className: "designer-json-editor",
        value: editor.item,
        spellCheck: false,
        disabled: editor.saving,
        onChange: event => setEditor(current => ({ ...current, item: event.target.value })),
      }),
      h("div", { className: "designer-editor-actions" },
        h(Button, { type: "button", variant: "ghost", onClick: () => setEditor(null) }, "Cancel"),
        h(Button, { type: "submit", pending: editor.saving, pendingLabel: "Saving..." }, "Save version")
      )
    )
  );
}

function GovernanceDesignerSection({ fabric }) {
  const governance = fabric.governance || {};
  const permissions = fabric.permissions || {};
  return h("section", { className: "designer-split" },
    h(Card, null,
      h(CardHeader, { title: "Governance", description: "Locked platform policy and workspace-editable rules." }),
      h(CardContent, null,
        h("div", { className: "governance-list" },
          h("h3", null, "Locked Platform Rules"),
          (governance.lockedPlatformRules || []).map(rule => h("p", { key: rule }, h(Badge, { tone: "warn" }, "Locked"), " ", rule)),
          h("h3", null, "Workspace Editable Rules"),
          (governance.workspaceEditableRules || []).map(rule => h("p", { key: rule }, h(Badge, { tone: "success" }, "Editable"), " ", rule)),
          h(DetailList, { rows: [
            { label: "Versioning", value: governance.versioning },
            { label: "Backup policy", value: governance.backupPolicy },
            { label: "Learning policy", value: governance.learningPolicy },
          ] })
        )
      )
    ),
    h(Card, null,
      h(CardHeader, { title: "Workspace Permissions", description: "Client roles see the friendly department surface; platform developers keep the technical COF view." }),
      h(CardContent, { className: "settings-list" }, Object.entries(permissions).map(([role, rights]) =>
        h("article", { className: "settings-card", key: role },
          h("h3", null, role),
          h("p", null, Array.isArray(rights) ? rights.join(", ") : String(rights))
        )
      ))
    )
  );
}

function VersionHistorySection({ versions, refresh }) {
  const [status, setStatus] = useState("");
  async function rollback(versionId) {
    const confirmText = window.prompt("Type ROLLBACK to restore this object version.");
    if (confirmText !== "ROLLBACK") return;
    try {
      await api("/api/department-version/rollback", {
        method: "POST",
        body: JSON.stringify({ versionId, confirmRollback: "ROLLBACK", updatedBy: "Human_Iman" }),
      });
      setStatus(`Rolled back ${versionId}.`);
      await refresh();
    } catch (error) {
      setStatus(error.message || String(error));
    }
  }
  return h(Card, { className: "designer-section-card" },
    h(CardHeader, { title: "Version History", description: "Every designer save creates a version row. Rollback restores only the selected object." }),
    h(CardContent, null,
      status ? h("div", { className: "designer-status" }, status) : null,
      versions && versions.length ? h("div", { className: "version-list" }, versions.map(row =>
        h("article", { className: "version-row", key: row.versionId },
          h("div", null,
            h("strong", null, row.action || "Change"),
            h("p", null, `${row.objectType} / ${row.objectId}`),
            h("small", null, `${fmtDate(row.createdAt)} by ${row.createdBy || "Human_Iman"}${row.reason ? ` - ${row.reason}` : ""}`)
          ),
          h(Button, { variant: "outline", onClick: () => rollback(row.versionId) }, "Rollback")
        )
      )) : h(EmptyState, { title: "No versions yet", body: "Save a designer object or department note to create the first version row." })
    )
  );
}

function BackupRestoreSection({ backups, refresh }) {
  const [status, setStatus] = useState("");
  async function createBackup() {
    try {
      const result = await api("/api/backup/create", { method: "POST", body: JSON.stringify({ reason: "Manual backup from Department Designer." }) });
      setStatus(`Backup created: ${result.backupId}`);
      await refresh();
    } catch (error) {
      setStatus(error.message || String(error));
    }
  }
  async function restoreBackup(row) {
    const confirmText = window.prompt("Restore fabric from this backup? Type RESTORE to continue. A pre-restore backup will be created.");
    if (confirmText !== "RESTORE") return;
    try {
      await api("/api/backup/restore", { method: "POST", body: JSON.stringify({ backupId: row.backupId, confirmRestore: "RESTORE", updatedBy: "Human_Iman" }) });
      setStatus(`Restored fabric from ${row.backupId}.`);
      await refresh();
    } catch (error) {
      setStatus(error.message || String(error));
    }
  }
  return h(Card, { className: "designer-section-card" },
    h(CardHeader, {
      title: "Backup / Restore",
      description: "Backups include local SQLite files, the capability fabric, staff skills, and package manifests. Restore currently replaces the fabric only, safely.",
      action: h(Button, { actionKey: "backup:create", onClick: createBackup }, icon("database"), "Create backup"),
    }),
    h(CardContent, null,
      status ? h("div", { className: "designer-status" }, status) : null,
      backups && backups.length ? h("div", { className: "backup-list" }, backups.map(row =>
        h("article", { className: "backup-row", key: row.backupId },
          h("div", null,
            h("strong", null, row.backupId),
            h("p", null, row.path),
            h("small", null, `${fmtDate(row.createdAt)} | ${row.status} | ${(row.included || []).length} file(s)`)
          ),
          h("div", { className: "designer-object-actions" },
            h(Badge, { tone: row.status === "Done" ? "success" : "danger" }, row.status),
            row.status === "Done" ? h(Button, { variant: "outline", onClick: () => restoreBackup(row) }, "Restore fabric") : null
          )
        )
      )) : h(EmptyState, { title: "No backups yet", body: "Create a backup before large configuration changes." })
    )
  );
}

function SettingsSolutionsSection({ fabric }) {
  return h("section", { className: "settings-grid" }, fabric.solutionModules.map(solution =>
    h("article", { className: "settings-card solution-card", key: solution.id },
      h("div", { className: "settings-card-head" },
        h("div", null, h("p", { className: "eyebrow" }, "Solution Module"), h("h3", null, solution.label || solution.name), h("p", null, solution.summary || solution.purpose)),
        h(Badge, null, solution.lifecycleStatus || solution.status)
      ),
      h(DetailList, { rows: [
        { label: "Owner", value: h(StaffChip, { staffId: solution.owner || "AIstaff_Manager" }), raw: true },
        { label: "Modules", value: (solution.modulesUsing || []).join(", "), length: 220 },
        { label: "Rule", value: solution.operatingRule, length: 220 },
        { label: "Solution ID", value: solution.id, length: 220 },
      ] })
    )
  ));
}

function SettingsCapabilitiesSection({ dashboard, fabric }) {
  const recipeLookup = byId(fabric.recipes);
  const connectionLookup = byId(fabric.connections);
  const databaseLookup = byId(fabric.databases);
  const aiLookup = byId(fabric.aiSupport);
  return h("section", { className: "settings-grid capability-grid" }, fabric.capabilities.map(capability => {
    const staffId = capability.ownerStaff || "AIstaff_Manager";
    const row = staffDashboardRow(dashboard, staffId);
    const openThreads = (((dashboard.threadsSummary || {}).byStaff || {})[staffId] || {}).open || 0;
    const wakeups = (((dashboard.staffWakeups || {}).byStaff || {})[staffId] || {}).queued || 0;
    return h("article", { className: "settings-card capability-card", key: capability.id },
      h("div", { className: "capability-title" }, staffAvatar(staffId), h("div", null, h("p", { className: "eyebrow" }, capability.id), h("h3", null, capability.label), h("p", null, capability.summary))),
      h("div", { className: "settings-mini-grid" },
        h("div", null, h("strong", null, (capability.recipes || []).length), h("span", null, "Recipes")),
        h("div", null, h("strong", null, openThreads), h("span", null, "Open threads")),
        h("div", null, h("strong", null, wakeups), h("span", null, "Wake-ups"))
      ),
      h(DetailList, { rows: [
        { label: "Owner lane", value: h(StaffChip, { staffId }), raw: true },
        { label: "Status", value: capability.lifecycleStatus || "Active" },
        { label: "Recipes", value: namesFromIds(capability.recipes, recipeLookup, "No recipes"), length: 220 },
        { label: "Connections", value: namesFromIds([...(capability.requiredConnections || []), ...(capability.recommendedConnections || [])], connectionLookup, "No mapped connections"), length: 220 },
        { label: "Databases", value: namesFromIds(capability.databases, databaseLookup, "No mapped databases"), length: 220 },
        { label: "AI Support", value: namesFromIds(capability.aiSupport, aiLookup, "No AI support"), length: 220 },
        { label: "Current staff work", value: row.currentWork || "No open work", length: 180 },
      ] })
    );
  }));
}

function SettingsRecipesSection({ fabric }) {
  const capabilityLookup = byId(fabric.capabilities);
  return h("section", { className: "settings-list" }, fabric.recipes.map(recipe =>
    h("article", { className: "settings-card recipe-card", key: recipe.id },
      h("div", { className: "settings-card-head" },
        h("div", null, h("p", { className: "eyebrow" }, (capabilityLookup[recipe.capabilityId] || {}).label || recipe.capabilityId), h("h3", null, recipe.label || recipe.name), h("p", null, recipe.summary)),
        h(StaffChip, { staffId: recipe.ownerStaff || recipe.owner })
      ),
      h(DetailList, { rows: [
        { label: "Recipe ID", value: recipe.id, length: 220 },
        { label: "Stages", value: String((recipe.stages || []).length) },
        { label: "Outputs", value: (recipe.outputs || []).join(", "), length: 260 },
        { label: "Guardrail", value: recipe.guardrail || "Quality gates are defined per stage.", length: 260 },
      ] })
    )
  ));
}

function SettingsStagesSection({ fabric }) {
  const laneLookup = byId(fabric.lanes);
  return h("section", { className: "settings-list" }, fabric.recipes.map(recipe =>
    h("article", { className: "settings-card stage-card", key: recipe.id },
      h("div", { className: "settings-card-head" },
        h("div", null, h("p", { className: "eyebrow" }, recipe.id), h("h3", null, recipe.label)),
        h(StaffChip, { staffId: recipe.ownerStaff })
      ),
      h("div", { className: "stage-strip" }, (recipe.stages || []).map((stage, index) =>
        h(Fragment, { key: stage.id || stage.label },
          h("span", { className: "stage-pill", title: namesFromIds(stage.lanes, laneLookup) }, stage.label || stage.id),
          index < (recipe.stages || []).length - 1 ? h("span", { className: "stage-separator" }, "->") : null
        )
      ))
    )
  ));
}

function SettingsLanesSection({ fabric }) {
  const connectionLookup = byId(fabric.connections);
  const databaseLookup = byId(fabric.databases);
  const aiLookup = byId(fabric.aiSupport);
  const gateLookup = byId(fabric.qualityGates);
  return h("section", { className: "settings-grid lane-grid" }, fabric.lanes.map(lane =>
    h("article", { className: "settings-card lane-card", key: lane.id },
      h("div", { className: "settings-card-head" },
        h("div", null, h("p", { className: "eyebrow" }, lane.routeType), h("h3", null, lane.label)),
        h(StaffChip, { staffId: lane.ownerStaff })
      ),
      h(DetailList, { rows: [
        { label: "Lane ID", value: lane.id, length: 220 },
        { label: "Connections", value: namesFromIds(lane.connections, connectionLookup, "None"), length: 240 },
        { label: "Databases", value: namesFromIds(lane.databases, databaseLookup, "None"), length: 260 },
        { label: "AI Support", value: namesFromIds(lane.aiSupport, aiLookup, "None"), length: 220 },
        { label: "Quality gates", value: namesFromIds(lane.qualityGates, gateLookup, "None"), length: 240 },
      ] })
    )
  ));
}

function SettingsInventorySection({ rows, title, typeLabel }) {
  return h("section", { className: "settings-grid lane-grid" }, (rows || []).map(row =>
    h("article", { className: "settings-card lane-card", key: row.id },
      h("div", { className: "settings-card-head" },
        h("div", null, h("p", { className: "eyebrow" }, typeLabel), h("h3", null, row.label || row.id)),
        h(Badge, null, row.status || "Mapped")
      ),
      h(DetailList, { rows: [
        { label: "ID", value: row.id, length: 220 },
        { label: "Type", value: row.type || "" },
        { label: "Required for", value: (row.requiredFor || []).join(", "), length: 220 },
      ] })
    )
  ));
}

function SettingsAiSection({ fabric }) {
  return h("section", { className: "settings-grid lane-grid" }, (fabric.aiSupport || []).map(row =>
    h("article", { className: "settings-card lane-card", key: row.id },
      h("div", { className: "settings-card-head" },
        h("div", null, h("p", { className: "eyebrow" }, "AI Support"), h("h3", null, row.label)),
        h(StaffChip, { staffId: row.ownerStaff })
      ),
      h(DetailList, { rows: [
        { label: "Model", value: row.model, length: 200 },
        { label: "Reasoning", value: row.reasoningEffort },
        { label: "Usage", value: row.usage, length: 260 },
      ] })
    )
  ));
}

function SettingsQualitySection({ fabric }) {
  return h("section", { className: "settings-list" }, (fabric.qualityGates || []).map(row =>
    h("article", { className: "settings-card recipe-card", key: row.id },
      h("div", { className: "settings-card-head" },
        h("div", null, h("p", { className: "eyebrow" }, row.id), h("h3", null, row.label)),
        h(Badge, null, "Quality gate")
      ),
      h(DetailList, { rows: [
        { label: "Rule", value: row.rule, length: 320 },
      ] })
    )
  ));
}

function isTechnicalReportRow(row = {}) {
  const idText = normalizedText([
    row.taskId,
    row.entityId,
    row.applicationId,
    row.opportunityId,
    row.followUpId,
    row.queueId,
    row.staffId,
    row.learningId,
    row["Report ID"],
  ].filter(Boolean).join(" "));
  const text = normalizedText(Object.values(row || {}).filter(value => typeof value !== "object").join(" "));
  return (
    /\bsmoke\b|\be2e\b|process engine smoke/.test(text) ||
    /^test[_-]/.test(idText) ||
    /[_-]smoke[_-]?test/.test(idText) ||
    idText.includes("crmcontroller e2e")
  );
}

function reportRows(rows = [], showTechnicalData = false) {
  const list = Array.isArray(rows) ? rows : [];
  return showTechnicalData ? list : list.filter(row => !isTechnicalReportRow(row));
}

function reportIdentity(row = {}, fallback = "") {
  return row.taskId || row.followUpId || row.queueId || row.applicationId || row.opportunityId || row.entityId || row.learningId || fallback;
}

function dedupeReportItems(items = [], keyFn = item => reportIdentity(item.row || item, item.title || item.kind)) {
  const seen = new Set();
  return items.filter((item, index) => {
    const key = String(keyFn(item, index) || index);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function periodDayCount(period = {}) {
  if (!period.fromMs || !period.toMs) return 1;
  return Math.max(1, Math.ceil((period.toMs - period.fromMs) / 86400000));
}

function reportTime(row = {}, keys = []) {
  return keys.reduce((latest, key) => Math.max(latest, dateMs(row[key]) || 0), 0);
}

function buildReportTrendSeries(rows = [], keys = [], period = {}, bucketCount = 7) {
  const count = Math.max(2, bucketCount);
  const from = period.fromMs || (Date.now() - (count - 1) * 86400000);
  const to = Math.max(period.toMs || Date.now(), from + 1);
  const bucketMs = Math.max(1, (to - from) / count);
  const series = Array.from({ length: count }, () => 0);
  rows.forEach(row => {
    const ms = reportTime(row, keys);
    if (!ms || ms < from || ms > to) return;
    const index = Math.min(count - 1, Math.max(0, Math.floor((ms - from) / bucketMs)));
    series[index] += 1;
  });
  return series;
}

function reportTaskDue(row = {}) {
  if (isTerminal(row)) return false;
  const dueMs = dateMs(row.dueAt || row["Due At"] || row.runAfter || row["Run After"]);
  return Boolean(row.overdue || (dueMs && dueMs <= Date.now()));
}

function reportTaskDoneInPeriod(row = {}, period) {
  return isTerminal(row) && rowTimeInPeriod(row, ["completedAt", "Completed At", "sentAt", "Sent At", "lastUpdated", "updatedAt"], period);
}

function percentage(done, target) {
  const numericTarget = Math.max(1, Number(target || 1));
  return Math.min(100, Math.round((Number(done || 0) / numericTarget) * 100));
}

function buildOperatingReportModel(dashboard = {}, periodFilter = {}) {
  const showTechnicalData = Boolean(periodFilter.showTechnicalData);
  const applications = reportRows(dashboard.applications || [], showTechnicalData);
  const tasks = reportRows(dashboard.tasks || [], showTechnicalData);
  const followUps = reportRows(dashboard.followUps || [], showTechnicalData);
  const recentEvents = reportRows(dashboard.recentEvents || [], showTechnicalData);
  const recentRuns = reportRows(dashboard.recentRuns || [], showTechnicalData);
  const recentReports = reportRows(dashboard.recentReports || [], showTechnicalData);
  const skillUpdates = reportRows(dashboard.skillUpdates || [], showTechnicalData);
  const emailRows = reportRows(flattenEmailQueue(dashboard.emailQueue || {}), showTechnicalData);
  const reportDashboard = { ...dashboard, applications, tasks, followUps, recentEvents, recentRuns, recentReports, skillUpdates, emailQueue: { queue: emailRows } };
  const summary = deriveSummary(reportDashboard);
  const labels = buildLabels(reportDashboard);
  const period = resolveReportPeriod(periodFilter);
  const sync = dashboard.localSync || {};
  const autopilot = sync.autopilot || {};
  const autopilotProgress = autopilot.progress || {};
  const autopilotTargets = autopilot.targets || {};
  const humanTasks = reportRows(collectHumanTaskRows(dashboard), showTechnicalData).filter(row => !isTerminal(row));
  const blockedEmails = emailRows.filter(row => noticeTone(`${row.sendStatus || ""} ${row.approvalStatus || ""} ${row.lastError || ""}`) === "danger");
  const waitingReplies = applications.filter(row => normalizedText(`${row.currentStage} ${row.currentStatus}`).includes("waiting"));
  const packageReady = applications.filter(row => /package prepared|package verified|tender package ready|submitted/i.test(`${row.currentStage || ""} ${row.currentStatus || ""}`));
  const applicationsInPeriod = applications.filter(row => rowTimeInPeriod(row, ["lastUpdated", "createdAt", "Created At"], period));
  const packageReadyInPeriod = packageReady.filter(row => rowTimeInPeriod(row, ["lastUpdated", "createdAt", "Created At"], period));
  const emailsSentInPeriod = emailRows.filter(row => normalizedText(row.sendStatus).includes("sent") && rowTimeInPeriod(row, ["sentAt", "Sent At"], period));
  const waitingRepliesInPeriod = waitingReplies.filter(row => rowTimeInPeriod(row, ["lastUpdated", "sentAt", "Sent At"], period));
  const humanTasksInPeriod = humanTasks.filter(row => rowTimeInPeriod(row, ["createdAt", "Created At", "runAfter", "dueAt", "lastMessageAt"], period));
  const blockedEmailsInPeriod = blockedEmails.filter(row => rowTimeInPeriod(row, ["sentAt", "createdAt", "Created At", "approvedAt", "notBefore"], period));
  const emailRowsInPeriod = emailRows.filter(row => rowTimeInPeriod(row, ["sentAt", "Sent At", "createdAt", "Created At", "approvedAt", "Approved At", "notBefore", "Not Before"], period));
  const lateFollowUpsInPeriod = followUps.filter(row => row.overdue && rowTimeInPeriod(row, ["dueAt", "runAfter"], period));
  const openTasks = tasks.filter(row => !isTerminal(row));
  const dueOpenTasks = openTasks.filter(reportTaskDue);
  const tasksDoneInPeriod = tasks.filter(row => reportTaskDoneInPeriod(row, period));
  const periodDays = periodDayCount(period);
  const appByEntity = {};
  applications.forEach(row => {
    if (row.entityId) appByEntity[row.entityId] = row;
    if (row.applicationId) appByEntity[row.applicationId] = row;
  });
  const applicationRisks = applications.map(row => {
    const staleDays = daysSince(row.lastUpdated);
    const deadlineDays = daysUntil(row.deadline);
    const statusText = normalizedText(`${row.currentStage || ""} ${row.currentStatus || ""}`);
    const isClosed = /submitted|closed|cancelled|no further action/.test(statusText);
    const risk =
      !isClosed && deadlineDays !== null && deadlineDays <= 7 ? "Deadline Risk" :
      !isClosed && staleDays !== null && staleDays >= 7 ? "Stuck" :
      !isClosed && /needs|blocked|waiting|review/.test(statusText) ? "Needs Movement" :
      "On Track";
    return { row, staleDays, deadlineDays, risk, tone: noticeTone(risk) || (risk === "On Track" ? "ok" : "warn") };
  });
  const riskCount = applicationRisks.filter(item => item.risk !== "On Track").length;
  const deadlineRisk = applicationRisks
    .filter(item => item.deadlineDays !== null && item.deadlineDays <= 30 && item.deadlineDays >= -14)
    .sort((a, b) => a.deadlineDays - b.deadlineDays)
    .slice(0, 8);
  const healthScore =
    blockedEmails.length +
    followUps.filter(row => row.overdue).length +
    dueOpenTasks.filter(row => row.overdue).length +
    Number(sync.failedActions || 0) +
    humanTasks.length +
    riskCount;
  const healthStatus = healthScore >= 8 ? "Blocked" : healthScore > 0 ? "Needs Attention" : "Operational";
  const systemHealthScore = Math.max(0, Math.min(100, 100 - (
    blockedEmails.length * 12 +
    humanTasks.length * 6 +
    Number(sync.failedActions || 0) * 10 +
    followUps.filter(row => row.overdue).length * 6 +
    dueOpenTasks.filter(row => row.overdue).length * 6
  )));
  const periodEventCount = countRowsInPeriod(recentEvents, ["DateTime"], period);
  const periodRunCount = countRowsInPeriod(recentRuns, ["Run Timestamp", "runAt"], period);
  const crmRunsInPeriod = recentRuns.filter(row => rowTimeInPeriod(row, ["Run Timestamp", "runAt"], period) && /crm|health|sync|audit/i.test(`${row["Run Type"] || ""} ${row["Actions Completed"] || ""}`));
  const reportRunsInPeriod = recentReports.filter(row => rowTimeInPeriod(row, ["Date"], period));
  const targetCards = [
    ["Sheet sync", autopilotProgress.sheetSyncs || 0, Math.max(1, autopilotTargets.sheetSyncs || 1), "current-state sync target"],
    ["CRM health", crmRunsInPeriod.length || autopilotProgress.crmHealthChecks || 0, Math.max(1, Math.min(periodDays, 7)), "health checks in selected period"],
    ["Runner attempts", autopilotProgress.runnerAttempts || 0, autopilotTargets.runnerAttemptsWhenDue || 1, "process due staff work"],
    ["Tasks closed", tasksDoneInPeriod.length || autopilotProgress.tasksProcessed || 0, Math.max(1, dueOpenTasks.length || autopilotTargets.tasksProcessed || 1), "move open queue to done/blocked/approval"],
    ["Reports written", reportRunsInPeriod.length, Math.max(1, Math.min(periodDays, 7)), "manager-readable evidence trail"],
  ].map(([label, done, target, detail]) => {
    const numericTarget = Math.max(1, Number(target || 1));
    const numericDone = Number(done || 0);
    const score = percentage(numericDone, numericTarget);
    return { label, done: numericDone, target: numericTarget, gap: Math.max(0, numericTarget - numericDone), detail, score, tone: kpiTone(score) };
  });
  const mainBottleneck =
    humanTasks.length ? `${humanTasks.length} human decision${humanTasks.length === 1 ? "" : "s"} need Iman's answer before the cycle can continue.` :
    blockedEmails.length ? `${blockedEmails.length} supplier outreach row${blockedEmails.length === 1 ? "" : "s"} are blocked by safety gates.` :
    Number(sync.failedActions || 0) ? `${sync.failedActions} local sync action${Number(sync.failedActions || 0) === 1 ? "" : "s"} failed and should be repaired.` :
    dueOpenTasks.length ? `${dueOpenTasks.length} due task${dueOpenTasks.length === 1 ? "" : "s"} need staff execution.` :
    riskCount ? `${riskCount} Lead path${riskCount === 1 ? "" : "s"} need movement or deadline review.` :
    "No critical blocker is visible in the current dashboard snapshot.";
  const recommendedAction =
    humanTasks.length ? "Open Tasks and answer Alex's human-facing threads first." :
    blockedEmails.length ? "Open the blocked outreach safety item and keep it stopped until scope/content/package checks pass." :
    Number(sync.failedActions || 0) ? "Review System Health and rerun sync after fixing failed local actions." :
    dueOpenTasks.length ? "Run the next due task or the KPI cycle to keep the queue moving." :
    riskCount ? "Review the Leads section and assign the next owner for stale/deadline-risk tender cases." :
    "Let the KPI cycle continue or ask Alex for the next plan.";
  const executiveSummary = {
    currentStatus: `Alex sees the department as ${healthStatus.toLowerCase()} for ${period.label.toLowerCase()}.`,
    changed: `${applicationsInPeriod.length} Lead update${applicationsInPeriod.length === 1 ? "" : "s"}, ${emailsSentInPeriod.length} supplier message${emailsSentInPeriod.length === 1 ? "" : "s"} sent, ${tasksDoneInPeriod.length} closed task${tasksDoneInPeriod.length === 1 ? "" : "s"}, and ${periodEventCount + periodRunCount} activity item${periodEventCount + periodRunCount === 1 ? "" : "s"} in this period.`,
    bottleneck: mainBottleneck,
    nextAction: recommendedAction,
  };
  const kpiCards = [
    { label: "Active Leads", value: applications.length || (summary.activeEntities || 0), scope: "Current state", detail: `${applicationsInPeriod.length} updated in ${period.label.toLowerCase()}`, tone: "ok", trendSeries: buildReportTrendSeries(applications, ["lastUpdated", "createdAt", "Created At"], period) },
    { label: "Leads Updated", value: applicationsInPeriod.length, scope: "Selected period", detail: `${riskCount} current risk item(s)`, tone: riskCount ? "warn" : "ok", trendSeries: buildReportTrendSeries(applicationsInPeriod, ["lastUpdated", "createdAt", "Created At"], period) },
    { label: "Tender Packages Ready", value: packageReadyInPeriod.length, scope: "Selected period", detail: `${packageReady.length} ready/current total`, tone: packageReadyInPeriod.length ? "ok" : "warn", trendSeries: buildReportTrendSeries(packageReady, ["lastUpdated", "createdAt", "Created At"], period) },
    { label: "Supplier Messages Sent", value: emailsSentInPeriod.length, scope: "Selected period", detail: `${blockedEmails.length} blocked/current total`, tone: blockedEmails.length ? "warn" : "ok", trendSeries: buildReportTrendSeries(emailsSentInPeriod, ["sentAt", "Sent At"], period) },
    { label: "Waiting Quotes / Replies", value: waitingReplies.length, scope: "Current state", detail: `${waitingRepliesInPeriod.length} changed in period`, tone: waitingReplies.length ? "warn" : "ok", trendSeries: buildReportTrendSeries(waitingReplies, ["lastUpdated", "sentAt", "Sent At"], period) },
    { label: "Human Inbox", value: humanTasks.length, scope: "Current state", detail: `${humanTasksInPeriod.length} created/changed in period`, tone: humanTasks.length ? "warn" : "ok", trendSeries: buildReportTrendSeries(humanTasks, ["createdAt", "Created At", "runAfter", "dueAt", "lastMessageAt"], period) },
    { label: "Blocked Emails", value: blockedEmails.length, scope: "Current state", detail: `${blockedEmailsInPeriod.length} blocked in period`, tone: blockedEmails.length ? "danger" : "ok", trendSeries: buildReportTrendSeries(blockedEmails, ["sentAt", "createdAt", "Created At", "approvedAt", "notBefore"], period) },
    { label: "Late Follow-ups", value: followUps.filter(row => row.overdue).length, scope: "Current state", detail: `${lateFollowUpsInPeriod.length} due in period`, tone: followUps.some(row => row.overdue) ? "danger" : "ok", trendSeries: buildReportTrendSeries(followUps.filter(row => row.overdue), ["dueAt", "runAfter"], period) },
  ];
  const stages = ["Lead Received", "Tender Docs Reviewed", "Fit / Eligibility Checked", "Supplier Match Needed", "Quotation Requested", "Tender Package In Progress", "Tender Package Ready", "Submitted / Waiting", "Reply Received - Needs Review", "Other"].map(stage => ({
    stage,
    rows: applicationRisks.filter(item => pipelineStageForReport(item.row) === stage),
  })).filter(item => item.rows.length || item.stage !== "Other");
  const pipelineSegments = stages.map(item => ({
    label: item.stage,
    value: item.rows.length,
    tone: item.rows.some(row => row.risk !== "On Track") ? "warn" : "ok",
  }));
  const liveActivity = [
    ...recentEvents.filter(row => rowTimeInPeriod(row, ["DateTime"], period)).slice(0, 12).map(row => ({
      kind: "Event",
      time: row.DateTime,
      actor: row["User/Staff"] || "System",
      title: row.Event || "Event",
      body: [row.Field, row.After, row.Reason].filter(Boolean).join(" | "),
      tone: noticeTone(`${row.Event} ${row.Reason}`),
    })),
    ...recentRuns.filter(row => rowTimeInPeriod(row, ["Run Timestamp", "runAt"], period)).slice(0, 8).map(row => ({
      kind: "Run",
      time: row["Run Timestamp"],
      actor: "Command Center",
      title: row["Run Type"] || "Run",
      body: [row["Actions Completed"], row["Next Run Focus"], row.Notes].filter(Boolean).join(" | "),
      tone: noticeTone(`${row["Actions Completed"]} ${row.Notes}`),
    })),
    ...recentReports.filter(row => rowTimeInPeriod(row, ["Date"], period)).slice(0, 6).map(row => ({
      kind: "Report",
      time: row.Date,
      actor: "Alex",
      title: row.Period || row["Report ID"],
      body: row.Summary || row.Blockers || row["Recommended Next Actions"],
      tone: noticeTone(`${row.Summary} ${row.Blockers}`),
    })),
  ].sort((a, b) => dateMs(b.time) - dateMs(a.time)).slice(0, 14);
  const blockers = dedupeReportItems([
    ...humanTasks.map(row => ({
      kind: taskCategory(row),
      title: row.nextAction || row.taskType || "Human decision",
      owner: "AIstaff_Manager",
      status: displayStatus(row) || row.status || "Needs review",
      body: humanReadableTaskProblem(row),
      next: humanReadableTaskNeed(row),
      applicationId: row.applicationId,
      opportunityId: row.opportunityId,
      time: row.createdAt || row["Created At"] || row.dueAt || row.runAfter || row.sentAt || row.lastUpdated,
    })),
    ...blockedEmails.map(row => ({
      kind: "Outreach Safety",
      title: row.recipientName || row.to || row.queueId,
      owner: "AIstaff_ApplicationPackSender",
      status: row.sendStatus || row.approvalStatus || "Blocked",
      body: row.lastError || row.subject,
      next: "Keep blocked until content, duplicate-recipient, tender scope, package, and attachment checks pass.",
      applicationId: row.applicationId,
      opportunityId: row.opportunityId,
      time: row.sentAt || row.createdAt || row["Created At"] || row.approvedAt,
    })),
    ...reportRows(collectManagerReviewItems(dashboard.managerReview || {}), showTechnicalData).filter(item => !item.internalOnly).map(item => ({
      kind: item.kind,
      title: item.title,
      owner: item.staff || "AIstaff_Manager",
      status: item.status || "Review",
      body: item.body,
      next: "Review in task thread and route to the next owner.",
      applicationId: (item.row || {}).applicationId,
      opportunityId: (item.row || {}).opportunityId,
      time: (item.row || {}).dueAt || (item.row || {}).runAfter || (item.row || {}).createdAt || (item.row || {})["Created At"],
    })),
  ], item => `${item.kind}-${item.title}-${item.applicationId || item.opportunityId || item.time}`).sort((a, b) => dateMs(b.time) - dateMs(a.time)).slice(0, 10);
  const followupTimeline = followUps.filter(row => rowTimeInPeriod(row, ["dueAt", "runAfter", "completedAt"], period)).slice().sort((a, b) => dateMs(a.dueAt || a.runAfter) - dateMs(b.dueAt || b.runAfter)).slice(0, 12).map(row => ({ ...row, application: appByEntity[row.entityId] || null }));
  const staffStatus = reportRows(dashboard.staff || [], showTechnicalData)
    .filter(row => !["Human_Iman", "Unassigned"].includes(row.staffId))
    .slice().sort((a, b) => {
    if (a.staffId === "AIstaff_Manager") return -1;
    if (b.staffId === "AIstaff_Manager") return 1;
    return String(a.role || "").localeCompare(String(b.role || ""));
  });
  const staffWorkload = staffStatus.map(row => ({
    staffId: row.staffId,
    label: staffProfile(row.staffId).label,
    tasks: Number(row.openTasks || 0),
    followUps: Number(row.openFollowUps || 0),
    late: Number(row.overdueTasks || 0) + Number(row.overdueFollowUps || 0),
    total: Number(row.openTasks || 0) + Number(row.openFollowUps || 0),
  }));
  const crmEnabled = sync.crmSyncEnabled !== false;
  const systemHealth = [
    { label: "CRM sync", value: crmEnabled ? (sync.lastSheetSync ? fmtDate(sync.lastSheetSync) : "Not synced") : "Disabled", status: crmEnabled ? (sync.lastSyncError ? "Error" : "Healthy") : "Local-only mode", tone: crmEnabled && sync.lastSyncError ? "danger" : "ok" },
    { label: "Pending local changes", value: String(sync.pendingActions || 0), status: "Local-first queue", tone: Number(sync.pendingActions || 0) ? "warn" : "ok" },
    { label: "Failed local changes", value: String(sync.failedActions || 0), status: sync.failedActions ? "Needs repair" : "Clear", tone: Number(sync.failedActions || 0) ? "danger" : "ok" },
    { label: "Autopilot", value: ((sync.autopilot || {}).enabled ? "On" : "Paused"), status: (((sync.autopilot || {}).progress || {}).state || "Watching KPIs"), tone: (sync.autopilot || {}).enabled ? "ok" : "warn" },
    { label: "Open threads", value: String((dashboard.threadsSummary || {}).open || 0), status: `${(dashboard.threadsSummary || {}).humanFacingOpen || 0} human-facing`, tone: ((dashboard.threadsSummary || {}).humanFacingOpen || 0) ? "warn" : "ok" },
    { label: "Staff wake-ups", value: String((dashboard.staffWakeups || {}).queued || 0), status: "queued staff activations", tone: ((dashboard.staffWakeups || {}).queued || 0) ? "warn" : "ok" },
    { label: "Period activity", value: String(periodEventCount + periodRunCount), status: `${periodEventCount} events, ${periodRunCount} runs`, tone: (periodEventCount + periodRunCount) ? "ok" : "warn" },
  ];
  const queueCount = key => Array.isArray((dashboard.emailQueue || {})[key]) ? (dashboard.emailQueue || {})[key].length : Number((dashboard.emailQueue || {})[key] || 0);
  const emailSafety = {
    total: emailRowsInPeriod.length,
    sent: emailsSentInPeriod.length,
    blocked: blockedEmailsInPeriod.length,
    errors: emailRowsInPeriod.filter(row => normalizedText(row.sendStatus).includes("error")).length,
    queued: emailRowsInPeriod.filter(row => normalizedText(row.sendStatus).includes("queued")).length,
    currentTotal: (dashboard.emailQueue || {}).totalRows || emailRows.length,
    currentBlocked: queueCount("blocked") || blockedEmails.length,
    rows: blockedEmailsInPeriod.slice(0, 5),
  };
  const healthIssues = Number(sync.failedActions || 0) + Number(sync.pendingActions || 0) + blockedEmails.length + humanTasks.length + followUps.filter(row => row.overdue).length;
  return {
    summary,
    labels,
    period,
    showTechnicalData,
    executiveSummary,
    healthStatus,
    systemHealthScore,
    healthIssues,
    defaultPanel: humanTasks.length || blockedEmails.length || followUps.some(row => row.overdue) ? "blockers" : "targets",
    targetCards,
    kpiCards,
    pipelineStages: stages,
    pipelineSegments,
    applicationRisks,
    deadlineRisk,
    liveActivity,
    staffStatus,
    staffWorkload,
    blockers,
    followupTimeline,
    emailSafety,
    systemHealth,
    learningItems: skillUpdates.slice(0, 12),
    sync,
  };
}

function pipelineStageForReport(row = {}) {
  const text = normalizedText(`${row.currentStage || ""} ${row.currentStatus || ""}`);
  if (text.includes("reply received") || text.includes("quote received")) return "Reply Received - Needs Review";
  if (text.includes("submitted") || text.includes("waiting")) return "Submitted / Waiting";
  if (text.includes("package verified") || text.includes("tender package ready") || text.includes("package ready")) return "Tender Package Ready";
  if (text.includes("package in progress")) return "Tender Package In Progress";
  if (text.includes("quotation") || text.includes("quote requested")) return "Quotation Requested";
  if (text.includes("supplier match") || text.includes("partner match")) return "Supplier Match Needed";
  if (text.includes("fit approved") || text.includes("eligibility")) return "Fit / Eligibility Checked";
  if (text.includes("docs reviewed") || text.includes("document")) return "Tender Docs Reviewed";
  if (text.includes("lead") || text.includes("opportunity verified")) return "Lead Received";
  return applicationStage(row);
}

function reportSparkline(seed = 0) {
  const count = Math.max(1, Math.min(7, Number(seed || 0)));
  return h("span", { className: "report-sparkline", "aria-hidden": "true" }, Array.from({ length: 7 }).map((_, index) =>
    h("span", { key: index, style: { height: `${20 + ((index + count) % 5) * 14}%` } })
  ));
}

function ReportTrendChart({ series = [], tone = "" }) {
  const values = series.length ? series : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(1, ...values);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
    const y = 32 - (Number(value || 0) / max) * 26;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return h("svg", { className: cn("report-trend-chart", tone), viewBox: "0 0 100 36", role: "img", "aria-label": "period trend" },
    h("polyline", { points, fill: "none", strokeWidth: "4", strokeLinecap: "round", strokeLinejoin: "round" }),
    values.map((value, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const y = 32 - (Number(value || 0) / max) * 26;
      return h("circle", { key: index, cx: x, cy: y, r: value ? 2.8 : 1.8 });
    })
  );
}

function ReportDonut({ score = 0, tone = "", label = "" }) {
  const safeScore = Math.max(0, Math.min(100, Number(score || 0)));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dash = (safeScore / 100) * circumference;
  return h("div", { className: cn("report-donut", tone), "aria-label": `${label} ${safeScore}%` },
    h("svg", { viewBox: "0 0 48 48", "aria-hidden": "true" },
      h("circle", { className: "donut-track", cx: "24", cy: "24", r: radius }),
      h("circle", { className: "donut-value", cx: "24", cy: "24", r: radius, strokeDasharray: `${dash} ${circumference}` })
    ),
    h("strong", null, `${safeScore}%`)
  );
}

function ReportStackedBar({ segments = [] }) {
  const visible = segments.filter(item => Number(item.value || 0) > 0);
  const total = visible.reduce((sum, item) => sum + Number(item.value || 0), 0) || 1;
  return h("div", { className: "report-stacked-bar", "aria-label": "pipeline distribution" },
    visible.length ? visible.map(item =>
      h("span", {
        key: item.label,
        className: cn(item.tone),
        title: `${item.label}: ${item.value}`,
        style: { width: `${Math.max(4, (Number(item.value || 0) / total) * 100)}%` },
      })
    ) : h("span", { className: "empty", style: { width: "100%" } })
  );
}

function DeadlineRiskChart({ items = [], labels = {}, openRef }) {
  const maxDays = Math.max(1, ...items.map(item => Math.abs(Number(item.deadlineDays || 0))));
  return h("div", { className: "deadline-risk-chart" },
    h("div", { className: "mini-panel-head" }, h("strong", null, "Deadline risk"), h("span", null, `${items.length} within 30 days`)),
    items.length ? items.map(item => {
      const appId = item.row.applicationId || item.row.entityId;
      const width = `${Math.max(8, 100 - (Math.max(0, Number(item.deadlineDays || 0)) / maxDays) * 78)}%`;
      return h("div", { className: cn("deadline-risk-row", item.tone), key: appId },
        h(RefChip, { kind: "applications", id: appId, labels, openRef, length: 130, showStatus: false }),
        h("div", { className: "deadline-risk-track" }, h("span", { style: { width } })),
        h(Badge, { tone: item.tone }, item.deadlineDays < 0 ? `${Math.abs(item.deadlineDays)}d late` : `${item.deadlineDays}d`)
      );
    }) : h("p", { className: "muted" }, "No deadline risk is visible in the current period.")
  );
}

function StaffWorkloadChart({ rows = [] }) {
  const max = Math.max(1, ...rows.map(row => row.total + row.late));
  return h("div", { className: "staff-workload-chart" },
    rows.map(row => h("div", { className: "staff-workload-row", key: row.staffId },
      h("div", { className: "staff-workload-label" }, h(StaffChip, { staffId: row.staffId })),
      h("div", { className: "staff-workload-track" },
        h("span", { className: "tasks", style: { width: `${Math.max(3, (row.tasks / max) * 100)}%` } }),
        h("span", { className: "followups", style: { width: `${Math.max(0, (row.followUps / max) * 100)}%` } }),
        row.late ? h("span", { className: "late", style: { width: `${Math.max(3, (row.late / max) * 100)}%` } }) : null
      ),
      h("span", { className: "staff-workload-count" }, `${row.total} open${row.late ? `, ${row.late} late` : ""}`)
    ))
  );
}

function ReportsView({ dashboard, approveSkillUpdate, runOne, snoozeFollowUp, setView, openTaskDialog, openRef }) {
  const [periodFilter, setPeriodFilter] = useState({
    preset: "7",
    days: 7,
    from: localDateInputValue(new Date(Date.now() - 6 * 86400000)),
    to: localDateInputValue(new Date()),
    showTechnicalData: false,
  });
  const [selectedReportPanel, setSelectedReportPanel] = useState("auto");
  const model = buildOperatingReportModel(dashboard, periodFilter);
  const activeReportPanel = selectedReportPanel === "closed"
    ? ""
    : selectedReportPanel === "auto" ? model.defaultPanel : selectedReportPanel;
  return h("div", { className: "operating-report" },
    h(OperatingReportHero, { model, dashboard, openTaskDialog }),
    h(ReportPeriodControls, { filter: periodFilter, setFilter: setPeriodFilter, period: model.period }),
    h(ReportKpiStrip, { cards: model.kpiCards }),
    h(ReportCommandGrid, { model, selected: activeReportPanel, setSelected: setSelectedReportPanel }),
    activeReportPanel ? h(ReportSelectedPanel, { selected: activeReportPanel, setSelected: setSelectedReportPanel, model, setView, openRef, runOne, snoozeFollowUp, approveSkillUpdate }) : null
  );
}

function ReportCommandGrid({ model, selected, setSelected }) {
  const modules = [
    { id: "blockers", label: "Do First", value: model.blockers.length, tone: model.blockers.length ? "danger" : "ok", detail: model.blockers.length ? "Human decisions, blockers, or overdue checks" : "No visible blocker", icon: "shield" },
    { id: "targets", label: "KPI Progress", value: model.targetCards.filter(item => item.gap > 0).length, tone: model.targetCards.some(item => item.gap > 0) ? "warn" : "ok", detail: "Target vs actual, gap, and cycle state", icon: "chart" },
    { id: "pipeline", label: "Leads", value: model.applicationRisks.length, tone: model.applicationRisks.some(item => item.risk !== "On Track") ? "warn" : "ok", detail: "Pipeline, latest movement, and deadline risk", icon: "file" },
    { id: "staff", label: "AI Staff", value: model.staffStatus.length, tone: model.staffStatus.some(row => Number(row.openTasks || 0) || Number(row.openFollowUps || 0)) ? "warn" : "ok", detail: "Workload, active ownership, and wake-ups", icon: "user" },
    { id: "health", label: "System Health", value: model.healthIssues, tone: Number(model.sync.failedActions || 0) ? "danger" : model.healthIssues ? "warn" : "ok", detail: "Sync, email safety, activity, and learning", icon: "database" },
  ];
  return h("section", { className: "report-command-section" },
    h("div", { className: "report-section-head" },
      h("div", null, h("p", { className: "eyebrow" }, "Major Parts"), h("h2", null, "One View To Achieve Results"), h("p", null, "Click a major part to open its detailed table or operating panel. Only one detail opens at a time.")),
      selected ? h(Button, { variant: "secondary", onClick: () => setSelected("closed") }, "Close details") : null
    ),
    h("div", { className: "report-command-grid" }, modules.map(item =>
      h("button", { key: item.id, type: "button", className: cn("report-command-tile", item.tone, selected === item.id && "active"), onClick: () => setSelected(selected === item.id ? "closed" : item.id) },
        h("span", { className: "report-command-icon" }, icon(item.icon)),
        h("span", { className: "report-command-copy" }, h("strong", null, item.label), h("small", null, item.detail)),
        h("span", { className: "report-command-value" }, item.value),
        h("span", { className: "report-command-visual" },
          item.id === "targets" ? h(ReportDonut, { score: Math.round(model.targetCards.reduce((sum, card) => sum + card.score, 0) / Math.max(1, model.targetCards.length)), tone: item.tone, label: item.label }) :
          item.id === "pipeline" ? h(ReportStackedBar, { segments: model.pipelineSegments }) :
          item.id === "staff" ? h(ReportTrendChart, { series: model.staffWorkload.map(row => row.total).slice(0, 7), tone: item.tone }) :
          item.id === "health" ? h(ReportDonut, { score: model.systemHealthScore, tone: item.tone, label: item.label }) :
          h(ReportTrendChart, { series: model.blockers.map((_, index) => index + 1).slice(0, 7), tone: item.tone })
        )
      )
    ))
  );
}

function ReportSelectedPanel({ selected, setSelected, model, setView, openRef, runOne, snoozeFollowUp, approveSkillUpdate }) {
  const title = ({
    blockers: "Do First",
    targets: "KPI Progress",
    pipeline: "Leads",
    staff: "AI Staff",
    health: "System Health",
  })[selected] || "Details";
  const panel =
    selected === "blockers" ? h(BlockersPanel, { model, setView, openRef }) :
    selected === "targets" ? h(DailyTargetsPanel, { model }) :
    selected === "pipeline" ? h(PipelineOverviewPanel, { model, setView, openRef }) :
    selected === "staff" ? h(LiveStaffPanel, { model, runOne, setView }) :
    selected === "health" ? h(SystemHealthPanel, { model, approveSkillUpdate }) :
    null;
  return h("section", { className: "report-detail-area" },
    h("div", { className: "report-section-head" },
      h("div", null, h("p", { className: "eyebrow" }, "Opened Detail"), h("h2", null, title)),
      h(Button, { variant: "secondary", onClick: () => setSelected("closed") }, "Close")
    ),
    panel
  );
}

function ReportPeriodControls({ filter, setFilter, period }) {
  const setPreset = (preset, days) => setFilter({
    ...filter,
    preset,
    days: days || filter.days || 7,
    from: filter.from || localDateInputValue(new Date(Date.now() - 6 * 86400000)),
    to: filter.to || localDateInputValue(new Date()),
  });
  const setDays = value => {
    const days = Math.max(1, Math.min(365, Number(value || 1)));
    setFilter({ ...filter, preset: String(days), days });
  };
  return h("section", { className: "report-period-control", "aria-label": "Report time filter" },
    h("div", null,
      h("p", { className: "eyebrow" }, "Report Period"),
      h("h2", null, period.label),
      h("p", null, "KPIs, activity, emails, and follow-ups are filtered to this period where timestamp data is available.")
    ),
    h("div", { className: "period-actions" },
      [["today", "Today"], ["7", "7 days"], ["14", "14 days"], ["30", "30 days"]].map(([preset, label]) =>
        h(Button, { key: preset, variant: filter.preset === preset ? "default" : "secondary", onClick: () => setPreset(preset, preset === "today" ? 1 : Number(preset)) }, label)
      ),
      h(Field, { label: "Last x days" }, h(Input, { type: "number", min: "1", max: "365", value: filter.days || 7, onChange: event => setDays(event.target.value) })),
      h(Button, { variant: filter.preset === "custom" ? "default" : "outline", onClick: () => setPreset("custom") }, "Custom range"),
      h("label", { className: "report-toggle" },
        h("input", { type: "checkbox", checked: Boolean(filter.showTechnicalData), onChange: event => setFilter({ ...filter, showTechnicalData: event.target.checked }) }),
        h("span", null, "Show technical/test data")
      )
    ),
    filter.preset === "custom" ? h("div", { className: "period-custom-range" },
      h(Field, { label: "From" }, h(Input, { type: "date", value: filter.from || "", onChange: event => setFilter({ ...filter, preset: "custom", from: event.target.value }) })),
      h(Field, { label: "To" }, h(Input, { type: "date", value: filter.to || "", onChange: event => setFilter({ ...filter, preset: "custom", to: event.target.value }) }))
    ) : null
  );
}

function OperatingReportHero({ model, dashboard, openTaskDialog }) {
  const tone = noticeTone(model.healthStatus);
  return h("section", { className: cn("report-hero", tone) },
    h("div", null,
      h("p", { className: "eyebrow" }, "AI Department Command Report"),
      h("h1", null, "AI Operating System for Tender Leads"),
      h("p", { className: "report-hero-subtitle" }, "Alex coordinates Lead review, tender document analysis, supplier matching, quotation outreach, follow-ups, CRM sync, and package readiness."),
      h("div", { className: "report-executive-summary" },
        [
          ["Current status", model.executiveSummary.currentStatus],
          ["What changed", model.executiveSummary.changed],
          ["Main bottleneck", model.executiveSummary.bottleneck],
          ["Recommended next action", model.executiveSummary.nextAction],
        ].map(([label, value]) =>
          h("article", { key: label }, h("strong", null, label), h("span", null, value))
        )
      ),
      h("div", { className: "report-hero-meta" },
        h("span", null, `Last refreshed ${fmtDate(dashboard.refreshedAt) || "not yet"}`),
        h("span", null, `Period ${model.period.label}`),
        h("span", null, `${model.sync.mode || "local-first"} mode`),
        h("span", null, model.sync.crmSyncEnabled ? `CRM sync ${model.sync.lastSheetSync ? fmtDate(model.sync.lastSheetSync) : "pending"}` : "CRM sync disabled"),
        h("span", null, `${model.sync.pendingActions || 0} pending local changes`),
        model.showTechnicalData ? h("span", null, "Technical/test data shown") : null
      )
    ),
    h("div", { className: "report-hero-status" },
      h(Badge, { tone }, model.healthStatus),
      h(ReportDonut, { score: model.systemHealthScore, tone, label: "System health" }),
      h(Button, { onClick: () => openTaskDialog({ assignedTo: "AIstaff_Manager", taskType: "Manager Guidance", taskCategory: "Manager Guidance" }) }, icon("send"), "Message Alex")
    )
  );
}

function ReportKpiStrip({ cards }) {
  return h("section", { className: "report-kpi-strip" }, cards.map(card =>
    h("article", { className: cn("report-kpi-card", card.tone), key: card.label },
      h("div", null, h("span", { className: "report-kpi-value" }, card.value == null ? 0 : card.value), h("p", null, card.label), h("small", null, card.scope)),
      h("div", { className: "report-kpi-side" }, h(ReportTrendChart, { series: card.trendSeries, tone: card.tone }), h("span", null, card.detail))
    )
  ));
}

function DailyTargetsPanel({ model }) {
  const average = Math.round(model.targetCards.reduce((sum, item) => sum + item.score, 0) / Math.max(1, model.targetCards.length));
  return h(Card, { className: "report-panel daily-targets-panel" },
    h(CardHeader, { title: "KPI Target vs Actual", description: "Selected-period targets, actual progress, and remaining gap before the cycle should stop.", action: h(ReportDonut, { score: average, tone: kpiTone(average), label: "KPI progress" }) }),
    h(CardContent, null,
      h("div", { className: "target-summary" },
        h("article", null, h("strong", null, model.executiveSummary.bottleneck), h("span", null, "Main bottleneck")),
        h("article", null, h("strong", null, model.executiveSummary.nextAction), h("span", null, "Manager action"))
      ),
      h("div", { className: "target-list" }, model.targetCards.map(item =>
        h("article", { key: item.label, className: cn("target-card", item.tone) },
          h("div", { className: "target-head" }, h("strong", null, item.label), h(Badge, { tone: item.tone }, `${item.done} / ${item.target}`)),
          h("div", { className: "progress-track" }, h("span", { style: { width: `${item.score}%` } })),
          h("div", { className: "kpi-foot" }, h("span", null, item.gap ? `${item.gap} left` : "target met"), h("span", null, item.detail))
        )
      ))
    )
  );
}

function PipelineOverviewPanel({ model, setView, openRef }) {
  const total = model.pipelineStages.reduce((sum, item) => sum + item.rows.length, 0) || 1;
  return h(Card, { className: "report-panel pipeline-overview" },
    h(CardHeader, { title: "Lead Pipeline Overview", description: "Where tender Leads sit from intake to quotes, package readiness, and submission status.", action: h(Button, { variant: "secondary", onClick: () => setView("applications") }, "Open Leads") }),
    h(CardContent, null,
      h(ReportStackedBar, { segments: model.pipelineSegments }),
      h(DeadlineRiskChart, { items: model.deadlineRisk, labels: model.labels, openRef }),
      h("div", { className: "pipeline-bars" }, model.pipelineStages.map(item =>
        h("article", { key: item.stage, className: cn("pipeline-bar-row", noticeTone(item.stage)) },
          h("div", { className: "pipeline-bar-label" }, h("strong", null, item.stage), h("span", null, `${item.rows.length} item(s)`)),
          h("div", { className: "pipeline-bar-track" }, h("span", { style: { width: `${Math.max(8, Math.round((item.rows.length / total) * 100))}%` } })),
          h("div", { className: "pipeline-app-list" },
            item.rows.slice().sort((a, b) => dateMs(b.row.lastUpdated) - dateMs(a.row.lastUpdated)).slice(0, 3).map(itemRow => {
              const row = itemRow.row;
              const appId = row.applicationId || row.entityId;
              return h("div", { className: "pipeline-app-row", key: appId },
                h(RefChip, { kind: "applications", id: appId, labels: model.labels, openRef, length: 78, showStatus: false }),
                h("span", null, itemRow.staleDays === null ? "no update time" : `${itemRow.staleDays}d since update`),
                itemRow.deadlineDays !== null ? h("span", null, itemRow.deadlineDays < 0 ? `${Math.abs(itemRow.deadlineDays)}d past deadline` : `${itemRow.deadlineDays}d to deadline`) : null,
                h(Badge, { tone: itemRow.tone }, itemRow.risk)
              );
            })
          )
        )
      ))
    )
  );
}

function LiveActivityPanel({ model }) {
  return h(Card, { className: "report-panel live-activity-panel" },
    h(CardHeader, { title: "Live Activity Stream", description: "Recent staff actions, status changes, reports, and worker runs." }),
    h(CardContent, { className: "activity-stream" }, model.liveActivity.length ? model.liveActivity.map((item, index) =>
      h("article", { key: `${item.kind}-${index}`, className: cn("activity-stream-item", item.tone) },
        h("div", { className: "activity-time" }, h("strong", null, item.kind), h("time", null, fmtDate(item.time) || "No time")),
        h("div", null, h("h3", null, shortText(item.title, 90)), h("p", null, shortText(item.body || "No details recorded.", 190))),
        h(StaffChip, { staffId: item.actor && String(item.actor).startsWith("AIstaff_") ? item.actor : "AIstaff_Manager" })
      )
    ) : h(EmptyState, { title: "No activity yet", body: "Run a task, sync the sheet, or wait for the local worker to populate activity." }))
  );
}

function LiveStaffPanel({ model, runOne, setView }) {
  return h(Card, { className: "report-panel live-staff-panel" },
    h(CardHeader, { title: "Live AI Staff", description: "Who is active, what they own, and what is waiting.", action: h(Button, { variant: "secondary", onClick: () => setView("explorer") }, "Department Explorer") }),
    h(CardContent, null,
      h(StaffWorkloadChart, { rows: model.staffWorkload }),
      h("div", { className: "agent-status-list" }, model.staffStatus.map(row =>
        h("article", { key: row.staffId, className: cn("agent-status-card", noticeTone(`${row.currentWork} ${row.managerReview ? "review" : ""}`)) },
          h("div", { className: "agent-status-head" }, staffAvatar(row.staffId, true), h("div", null, h("h3", null, staffProfile(row.staffId).label), h("p", null, row.role || staffProfile(row.staffId).title))),
          h("p", { className: "agent-current-work" }, shortText(row.currentWork || "No open work", 150)),
          h("div", { className: "agent-status-meta" },
            h(Badge, null, `${row.openTasks || 0} tasks`),
            h(Badge, null, `${row.openFollowUps || 0} follow-ups`),
            h(Badge, null, `${(((model.sync.staffWakeups || {}).byStaff || {})[row.staffId] || {}).queued || 0} wake-ups`)
          ),
          h("div", { className: "report-panel-actions" }, h(Button, { actionKey: `run-one:${row.staffId || "next"}`, variant: "ghost", onClick: () => runOne(row.staffId) }, "Run staff"))
        )
      ))
    )
  );
}

function BlockersPanel({ model, setView, openRef }) {
  return h(Card, { className: "report-panel blockers-panel" },
    h(CardHeader, { title: "Blockers & Human Decisions", description: "Paused work with the reason, owner, and next needed action.", action: h(Button, { variant: "secondary", onClick: () => setView("work") }, "Open Tasks") }),
    h(CardContent, null,
      h("div", { className: "blocker-list" }, model.blockers.length ? model.blockers.map((item, index) =>
        h("article", { key: `${item.kind}-${index}`, className: cn("blocker-card", noticeTone(`${item.status} ${item.body}`)) },
          h("div", { className: "card-topline" }, h("div", null, h("h3", null, shortText(item.title, 90)), h("div", { className: "card-meta" }, [item.kind, fmtDate(item.time)].filter(Boolean).join(" | "))), h(Badge, null, item.status)),
          h(DetailList, { rows: [
            { label: "Owner", value: h(StaffChip, { staffId: item.owner }), raw: true },
            item.applicationId ? { label: "Lead", value: h(RefChip, { kind: "applications", id: item.applicationId, labels: model.labels, openRef, length: 140 }), raw: true } : null,
            item.opportunityId ? { label: "Tender case", value: h(RefChip, { kind: "opportunities", id: item.opportunityId, labels: model.labels, openRef, length: 140 }), raw: true } : null,
            { label: "What happened", value: item.body, length: 220 },
            { label: "What is needed", value: item.next, length: 220 },
            item.time ? { label: "Latest time", value: fmtDate(item.time) } : null,
          ] })
        )
      ) : h(EmptyState, { title: "No active blockers", body: "No human decisions or blocked outreach/package rows are visible in the current snapshot." })),
      h("section", { className: "report-nested-section" },
        h("div", { className: "mini-panel-head" }, h("strong", null, "Urgent follow-ups"), h("span", null, "Due and upcoming checks")),
        h("div", { className: "followup-timeline compact" }, model.followupTimeline.slice(0, 5).map(row =>
          h("article", { key: row.followUpId, className: cn("followup-timeline-item", row.overdue && "danger", noticeTone(row.status)) },
            h("div", { className: "timeline-dot" }),
            h("div", null,
              h("div", { className: "timeline-head" }, h(StaffChip, { staffId: row.staff }), h("time", null, fmtDate(row.dueAt || row.runAfter) || "No due time")),
              h("h3", null, shortText(row.reason || "Follow-up", 92)),
              h("p", null, shortText(row.nextAction || row.result || "No next action recorded.", 180))
            )
          )
        ))
      )
    )
  );
}

function FollowupTimelinePanel({ model, runOne, snoozeFollowUp, openRef }) {
  return h(Card, { className: "report-panel followup-report-panel" },
    h(CardHeader, { title: "Follow-up Timeline", description: "Due and upcoming self-owned checks ordered by time." }),
    h(CardContent, { className: "followup-timeline" }, model.followupTimeline.length ? model.followupTimeline.map(row =>
      h("article", { key: row.followUpId, className: cn("followup-timeline-item", row.overdue && "danger", noticeTone(row.status)) },
        h("div", { className: "timeline-dot" }),
        h("div", null,
          h("div", { className: "timeline-head" }, h(StaffChip, { staffId: row.staff }), h("time", null, fmtDate(row.dueAt || row.runAfter) || "No due time")),
          h("h3", null, shortText(row.reason || "Follow-up", 92)),
          h("p", null, shortText(row.nextAction || row.result || "No next action recorded.", 180)),
          row.application ? h("div", { className: "followup-ref" }, h(RefChip, { kind: "applications", id: row.application.applicationId || row.application.entityId, labels: model.labels, openRef, length: 150, showStatus: false })) : null,
          h("div", { className: "report-panel-actions" }, h(Button, { actionKey: `run-one:${row.staff || "next"}`, variant: "ghost", onClick: () => runOne(row.staff) }, "Run owner"), h(Button, { actionKey: `snooze-followup:${row.followUpId}`, variant: "ghost", onClick: () => snoozeFollowUp(row.followUpId, 24) }, "Snooze"))
        )
      )
    ) : h(EmptyState, { title: "No follow-ups", body: "No active follow-up rows are visible in this snapshot." }))
  );
}

function EmailSafetyPanel({ model }) {
  const stats = model.emailSafety;
  return h(Card, { className: "report-panel email-safety-panel" },
    h(CardHeader, { title: "Supplier Outreach & Safety Monitor", description: "Outbound supplier messages remain gated by content, tender scope, package, duplicate, and attachment checks." }),
    h(CardContent, null,
      h("div", { className: "system-health-grid" },
        [["Total", stats.total, ""], ["Sent", stats.sent, "ok"], ["Queued", stats.queued, "warn"], ["Blocked", stats.blocked, stats.blocked ? "danger" : "ok"], ["Errors", stats.errors, stats.errors ? "danger" : "ok"]].map(([label, value, tone]) =>
          h("article", { key: label, className: cn("system-health-card", tone) }, h("strong", null, value || 0), h("span", null, label))
        )
      ),
      h("div", { className: "mini-list" }, stats.rows.length ? stats.rows.map(row =>
        h("article", { key: row.queueId || row.to, className: "mini-row" }, h("strong", null, shortText(row.recipientName || row.to || "Recipient", 70)), h("span", null, shortText(row.lastError || row.subject, 130)))
      ) : h("p", { className: "muted" }, "No blocked email rows are visible."))
    )
  );
}

function SystemHealthPanel({ model, approveSkillUpdate }) {
  return h(Card, { className: "report-panel system-health-panel" },
    h(CardHeader, { title: "System Health", description: "Local-first store, sheet sync, staff wake-ups, and autopilot state." }),
    h(CardContent, null,
      h("div", { className: "system-health-summary" },
        h("article", null, h(ReportDonut, { score: model.systemHealthScore, tone: kpiTone(model.systemHealthScore), label: "System health" }), h("div", null, h("strong", null, "Operational score"), h("span", null, "Based on sync failures, pending local work, blockers, and late follow-ups."))),
        h("article", null, h("strong", null, model.executiveSummary.nextAction), h("span", null, "Recommended next action"))
      ),
      h("div", { className: "system-health-grid" }, model.systemHealth.map(item =>
        h("article", { key: item.label, className: cn("system-health-card", item.tone) },
          h("div", null, h("strong", null, item.value), h("span", null, item.label)),
          h(Badge, { tone: item.tone }, item.status)
        )
      )),
      h("div", { className: "system-health-detail-grid" },
        h("section", { className: "report-nested-section" },
          h("div", { className: "mini-panel-head" }, h("strong", null, "Email safety"), h("span", null, `${model.emailSafety.sent} sent, ${model.emailSafety.currentBlocked} blocked`)),
          h("div", { className: "system-health-grid compact" },
            [["Sent", model.emailSafety.sent, "ok"], ["Queued", model.emailSafety.queued, "warn"], ["Blocked", model.emailSafety.currentBlocked, model.emailSafety.currentBlocked ? "danger" : "ok"], ["Errors", model.emailSafety.errors, model.emailSafety.errors ? "danger" : "ok"]].map(([label, value, tone]) =>
              h("article", { key: label, className: cn("system-health-card", tone) }, h("strong", null, value || 0), h("span", null, label))
            )
          ),
          h("div", { className: "mini-list" }, model.emailSafety.rows.length ? model.emailSafety.rows.map(row =>
            h("article", { key: row.queueId || row.to, className: "mini-row" }, h("strong", null, shortText(row.recipientName || row.to || "Recipient", 70)), h("span", null, shortText(row.lastError || row.subject, 130)))
          ) : h("p", { className: "muted" }, "No blocked email rows are visible."))
        ),
        h("section", { className: "report-nested-section" },
          h("div", { className: "mini-panel-head" }, h("strong", null, "Live activity"), h("span", null, `${model.liveActivity.length} items`)),
          h("div", { className: "activity-stream compact" }, model.liveActivity.slice(0, 6).map((item, index) =>
            h("article", { key: `${item.kind}-${index}`, className: cn("activity-stream-item", item.tone) },
              h("div", { className: "activity-time" }, h("strong", null, item.kind), h("time", null, fmtDate(item.time) || "No time")),
              h("div", null, h("h3", null, shortText(item.title, 80)), h("p", null, shortText(item.body || "No details recorded.", 150)))
            )
          ))
        ),
        h("section", { className: "report-nested-section" },
          h("div", { className: "mini-panel-head" }, h("strong", null, "Learning"), h("span", null, `${model.learningItems.length} candidates`)),
          h("div", { className: "learning-list compact" }, model.learningItems.length ? model.learningItems.slice(0, 4).map(row =>
            h("article", { className: "learning-card", key: row.learningId },
              h("div", { className: "card-topline" }, h("div", null, h("h3", null, staffProfile(row.staffId).label), h("div", { className: "card-meta" }, row.learningId)), h(Badge, null, row.status || "Pending")),
              h("p", null, shortText(row.proposedRule || row.reason, 180)),
              row.status === "Pending" ? h("div", { className: "report-panel-actions" }, h(Button, { actionKey: `approve-learning:${row.learningId}`, onClick: () => approveSkillUpdate(row.learningId) }, "Approve learning")) : null
            )
          ) : h("p", { className: "muted" }, "No pending learnings."))
        )
      )
    )
  );
}

function LearningPanel({ model, approveSkillUpdate }) {
  return h(Card, { className: "report-panel learning-panel" },
    h(CardHeader, { title: "Learning & Improvements", description: "Human-approved lessons that can improve staff behavior.", action: h(Badge, null, model.learningItems.length) }),
    h(CardContent, { className: "learning-list" }, model.learningItems.length ? model.learningItems.map(row =>
      h("article", { className: "learning-card", key: row.learningId },
        h("div", { className: "card-topline" }, h("div", null, h("h3", null, staffProfile(row.staffId).label), h("div", { className: "card-meta" }, row.learningId)), h(Badge, null, row.status || "Pending")),
        h(DetailList, { rows: [
          { label: "Rule", value: row.proposedRule, length: 240 },
          { label: "Reason", value: row.reason, length: 180 },
        ] }),
        row.status === "Pending" ? h("div", { className: "report-panel-actions" }, h(Button, { actionKey: `approve-learning:${row.learningId}`, onClick: () => approveSkillUpdate(row.learningId) }, "Approve learning")) : null
      )
    ) : h(EmptyState, { title: "No pending learnings", body: "Useful lessons from closed threads will appear here for approval." }))
  );
}

function UniversityDetail({ dashboard, universityKey, setView, openRef }) {
  const university = UNIVERSITY_REFERENCES[universityKey] || UNIVERSITY_REFERENCES.unknown;
  const applications = (dashboard.applications || []).filter(row => inferUniversity(row).key === university.key);
  const tasks = (dashboard.tasks || []).filter(row => inferUniversity(row).key === university.key);
  const emails = flattenEmailQueue(dashboard.emailQueue || {}).filter(row => inferUniversity(row).key === university.key);
  const labels = buildLabels(dashboard);
  return h(Card, { className: "detail-page" },
    h(CardHeader, { eyebrow: "Tender Source", title: university.name, description: [university.city, university.country, university.type].filter(Boolean).join(" | "), action: h(Button, { variant: "secondary", onClick: () => setView("applications") }, "Back") }),
    h(CardContent, { className: "detail-grid" },
      h("section", { className: "detail-section" }, h("h3", null, "Source Details"), h(DetailList, { rows: [{ label: "Website", value: university.website }, { label: "Portal / docs", value: university.doctoral }, { label: "Focus", value: university.focus, length: 260 }, { label: "Fit", value: university.fit, length: 260 }] })),
      h("section", { className: "detail-section" }, h("h3", null, "Related Records"), h(DetailList, { rows: [{ label: "Leads", value: String(applications.length) }, { label: "Tasks", value: String(tasks.length) }, { label: "Messages", value: String(emails.length) }] }), h("div", { className: "entity-list no-pad" }, applications.map(row => h("article", { className: "app-card", key: row.entityId || row.applicationId }, h(RefChip, { kind: "applications", id: row.applicationId || row.entityId, labels, openRef }), h("p", null, row.currentStatus || row.currentStage)))))
    )
  );
}

function ApplicationDetail({ dashboard, labels, appId, setView, runOne, openTaskDialog, openRef, openUniversity }) {
  const app = (dashboard.applications || []).find(row => row.applicationId === appId || row.entityId === appId) || {};
  const tasks = (dashboard.tasks || []).filter(row => row.applicationId === app.applicationId || row.entityId === app.entityId);
  const emails = flattenEmailQueue(dashboard.emailQueue || {}).filter(row => row.applicationId === app.applicationId || row.opportunityId === app.opportunityId);
  const linkedWork = [
    ...tasks.map(row => {
      const timeItems = linkedWorkTimeItems(row, "task");
      const latest = latestWorkTime(timeItems);
      return { kind: "task", title: row.taskType, body: row.nextAction, status: displayStatus(row), timeItems, ...latest };
    }),
    ...emails.map(row => {
      const timeItems = linkedWorkTimeItems(row, "email");
      const latest = latestWorkTime(timeItems);
      return { kind: "email", title: row.recipientName || row.to, body: row.subject, status: row.sendStatus || row.approvalStatus, timeItems, ...latest };
    }),
  ].sort((a, b) => (b.latestMs || 0) - (a.latestMs || 0));
  return h(Card, { className: "detail-page" },
    h(CardHeader, { eyebrow: "Lead", title: (labels.applications[appId] && labels.applications[appId].label) || friendlyId(appId), description: app.currentStatus || app.currentStage || "Lead record", action: h(Button, { variant: "secondary", onClick: () => setView("applications") }, "Back") }),
    h(CardContent, { className: "detail-grid" },
      h("section", { className: "detail-section" }, h("h3", null, "Record"), h(DetailList, { rows: [
        { label: "Tender source", value: h(UniversityButton, { row: app, openUniversity }), raw: true },
        { label: "Stage", value: app.currentStage },
        { label: "Status", value: app.currentStatus },
        { label: "Owner", value: h(StaffChip, { staffId: app.responsibleStaff }), raw: true },
        { label: "Tender case", value: h(RefChip, { kind: "opportunities", id: app.opportunityId, labels, openRef }), raw: true },
        { label: "Updated", value: fmtDate(app.lastUpdated) },
      ] }), h("div", { className: "action-strip" }, h(Button, { actionKey: `run-one:${app.responsibleStaff || "next"}`, onClick: () => runOne(app.responsibleStaff) }, "Run Owner"), h(Button, { variant: "outline", onClick: () => openTaskDialog({ assignedTo: app.responsibleStaff, entityId: app.entityId, applicationId: app.applicationId }) }, "Add Task"))),
      h("section", { className: "detail-section" }, h("h3", null, "Linked Work"), h("div", { className: "stack compact" },
        linkedWork.length ? linkedWork.map((row, index) =>
          h("article", { className: cn("notice linked-work-card", noticeTone(row.status)), key: index },
            h("div", { className: "linked-work-head" },
              h("div", null, h("h3", null, row.title || "Linked row"), h("span", { className: "linked-work-kind" }, row.kind === "email" ? "Email queue" : "Task")),
              row.latest ? h("time", { className: "linked-work-latest", dateTime: row.latest }, h("span", null, "Latest"), fmtDate(row.latest)) : h("span", { className: "linked-work-latest muted" }, "No time recorded")
            ),
            h(Badge, null, row.status),
            row.timeItems.length ? h("div", { className: "linked-work-times" }, row.timeItems.map(item =>
              h("span", { key: `${item.label}-${item.value}` }, h("strong", null, item.label), fmtDate(item.value))
            )) : null,
            h("p", { className: "card-body" }, shortText(row.body, 220))
          )
        ) : h(EmptyState, { title: "No linked work", body: "No tasks or supplier outreach records are linked to this lead in the current snapshot." })
      ))
    )
  );
}

function OpportunityDetail({ dashboard, labels, opportunityId, setView, openRef, openUniversity }) {
  const applications = (dashboard.applications || []).filter(row => row.opportunityId === opportunityId);
  const seed = applications[0] || { opportunityId };
  return h(Card, { className: "detail-page" },
    h(CardHeader, { eyebrow: "Tender Case", title: (labels.opportunities[opportunityId] && labels.opportunities[opportunityId].label) || friendlyId(opportunityId), description: "Linked lead and workflow records.", action: h(Button, { variant: "secondary", onClick: () => setView("applications") }, "Back") }),
    h(CardContent, { className: "detail-grid" },
      h("section", { className: "detail-section" }, h("h3", null, "Tender Case"), h(DetailList, { rows: [{ label: "Tender source", value: h(UniversityButton, { row: seed, openUniversity }), raw: true }, { label: "Case ID", value: opportunityId }] })),
      h("section", { className: "detail-section" }, h("h3", null, "Linked Leads"), h("div", { className: "entity-list no-pad" }, applications.length ? applications.map(row => h("article", { className: "app-card", key: row.entityId || row.applicationId }, h(RefChip, { kind: "applications", id: row.applicationId || row.entityId, labels, openRef }), h("p", null, row.currentStatus || row.currentStage))) : h(EmptyState, { title: "No linked leads", body: "No active lead is linked to this tender case in the current snapshot." })))
    )
  );
}

function TaskDialog({ value, setValue, onClose, onSubmit, staff }) {
  const staffIds = Array.from(new Set([...STAFF_ORDER, ...(staff || []).map(row => row.staffId)])).filter(Boolean);
  const update = (key, val) => setValue({ ...value, [key]: val });
  const isManagerMessage = value.assignedTo === "AIstaff_Manager" && value.taskType === "Manager Guidance";
  return h("div", { className: "dialog-overlay" },
    h("form", { className: "dialog-card react-dialog", onSubmit },
      h("div", { className: "dialog-head" }, h("div", null, h("p", { className: "eyebrow" }, isManagerMessage ? "Manager" : "Task"), h("h2", null, isManagerMessage ? "Message Manager" : "Create Staff Task")), h(Button, { type: "button", variant: "ghost", size: "icon", onClick: onClose }, icon("x"))),
      h("div", { className: "form-grid" },
        h(Field, { label: "Assigned Staff" }, h(Select, { value: value.assignedTo, onChange: event => update("assignedTo", event.target.value) }, staffIds.map(id => h("option", { key: id, value: id }, staffProfile(id).label)))),
        h(Field, { label: "Task Type" }, h(Select, { value: value.taskType, onChange: event => update("taskType", event.target.value) }, ["Manager Guidance", "Lead Review", "Tender Document Review", "Fit / Eligibility", "Supplier Match", "Supplier Discovery", "Quotation Outreach", "Tender Package", "Follow-up", "CRM Health", "Report"].map(type => h("option", { key: type, value: type }, type)))),
        h(Field, { label: "Task Category" }, h(Select, { value: value.taskCategory || "", onChange: event => update("taskCategory", event.target.value) }, TASK_CATEGORIES.map(category => h("option", { key: category, value: category }, category)))),
        h(Field, { label: "Related Entity" }, h(Input, { value: value.entityId, onChange: event => update("entityId", event.target.value), placeholder: "Search/select entity in next version" })),
        h(Field, { label: "Lead" }, h(Input, { value: value.relatedApplicationId, onChange: event => update("relatedApplicationId", event.target.value), placeholder: "Lead ID" })),
        h(Field, { label: "Run After" }, h(Input, { type: "datetime-local", value: value.runAfter, onChange: event => update("runAfter", event.target.value) })),
        h(Field, { label: "Due At" }, h(Input, { type: "datetime-local", value: value.dueAt, onChange: event => update("dueAt", event.target.value) })),
        h(Field, { label: "Priority" }, h(Select, { value: value.priority, onChange: event => update("priority", event.target.value) }, ["High", "Medium", "Low", "Critical", "Test"].map(priority => h("option", { key: priority, value: priority }, priority)))),
        h(Field, { label: isManagerMessage ? "Message" : "Next Action", className: "wide" }, h(Textarea, { value: value.nextAction, onChange: event => update("nextAction", event.target.value), placeholder: isManagerMessage ? "Tell Alex the Lead ID, tender files, supplier question, or tender decision you want handled..." : "What exactly should the staff do for this lead/tender case?", rows: 5, required: true }))
      ),
      isManagerMessage ? h("p", { className: "dialog-help" }, "Alex will interpret this with the Manager Brain, reply in the thread, and allocate specialist work when needed. No email is sent from this message.") : null,
      h("div", { className: "dialog-actions" }, h(Button, { type: "button", variant: "ghost", onClick: onClose }, "Cancel"), h(Button, { actionKey: "task:save", type: "submit" }, isManagerMessage ? "Send to Manager" : "Create Task"))
    )
  );
}

function DecisionDialog({ value, setValue, onClose, onSubmit }) {
  const update = (key, val) => setValue({ ...value, [key]: val });
  return h("div", { className: "dialog-overlay" },
    h("form", { className: "dialog-card react-dialog", onSubmit },
      h("div", { className: "dialog-head" }, h("div", null, h("p", { className: "eyebrow" }, "Decision"), h("h2", null, "Record Task Decision")), h(Button, { type: "button", variant: "ghost", size: "icon", onClick: onClose }, icon("x"))),
      h("div", { className: "form-grid" },
        h(Field, { label: "Decision Type" }, h(Input, { value: value.decisionType || "", onChange: event => update("decisionType", event.target.value) })),
        h(Field, { label: "Approval Status" }, h(Select, { value: value.approvalStatus || "Approved", onChange: event => update("approvalStatus", event.target.value) }, ["Approved", "Rejected", "Needs More Info", "Paused"].map(status => h("option", { key: status, value: status }, status)))),
        h(Field, { label: "Recommendation", className: "wide" }, h(Input, { value: value.recommendation || "", onChange: event => update("recommendation", event.target.value) })),
        h(Field, { label: "Reason / Comment", className: "wide" }, h(Textarea, { value: value.reason || "", onChange: event => update("reason", event.target.value), rows: 5, required: true })),
        h(Field, { label: "Evidence Link", className: "wide" }, h(Input, { value: value.evidence || "", onChange: event => update("evidence", event.target.value) }))
      ),
      h("div", { className: "dialog-actions" }, h(Button, { type: "button", variant: "ghost", onClick: onClose }, "Cancel"), h(Button, { actionKey: "decision:save", type: "submit" }, "Save Decision"))
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(App));
