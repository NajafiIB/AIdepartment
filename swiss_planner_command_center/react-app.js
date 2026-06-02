/* global React, ReactDOM */
const h = React.createElement;
const { Children, Fragment, cloneElement, useEffect, useMemo, useState } = React;

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
  "Opportunity Verified",
  "Fit Approved",
  "Package Required",
  "Package In Progress",
  "Package Verified",
  "Sent - Waiting for Reply",
];

const NAV_ITEMS = [
  ["overview", "Overview"],
  ["explorer", "Department Explorer"],
  ["applications", "Applications"],
  ["work", "Tasks"],
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
  explorer: "user",
  applications: "file",
  work: "send",
  reports: "database",
  settings: "shield",
};

const TASK_CATEGORIES = [
  "Human Decision",
  "Manager Guidance",
  "System Audit",
  "Technical Bug",
  "Email Safety",
  "Application Work",
  "Research Work",
];

const STAFF_TOOL_CATALOG = [
  { id: "local_task_threads", label: "Local Task Threads", locked: true, description: "Local-first task and conversation memory." },
  { id: "event_log", label: "Event Log", locked: true, description: "Required audit trail for important changes." },
  { id: "manager_routing", label: "Manager Routing", locked: true, description: "Specialists route human-facing questions through AI Manager." },
  { id: "google_sheet_crm", label: "Google Sheet CRM", description: "Swiss Planner workbook records and status tables." },
  { id: "google_drive_packages", label: "Google Drive Packages", description: "Application package folders and Google Docs." },
  { id: "gmail_bridge", label: "Gmail Bridge", description: "Email queue safety, attachments, sent/inbound sync." },
  { id: "official_web_sources", label: "Official Web Sources", description: "University/funder/job pages used as evidence." },
  { id: "google_scholar_public_pages", label: "Google Scholar", description: "Publication and professor research evidence." },
  { id: "linkedin_lead_search", label: "LinkedIn Lead Search", description: "Lead source only; official evidence still required." },
  { id: "codex_worker", label: "Codex Worker", description: "Deep research, proposal writing, and document production." },
  { id: "openai_api", label: "OpenAI Brain", description: "Low-cost Manager interpretation and routing." },
];

const SETTINGS_SOLUTIONS = [
  {
    id: "solution_swiss_planner_apply_department",
    name: "Swiss Planner Apply Department",
    status: "Active",
    owner: "AIstaff_Manager",
    purpose: "Find, evaluate, prepare, send, and follow up funded PhD/MSc application opportunities for Iman Najafi.",
    source: "Local Command Center, Swiss Planner workbook, Drive package folders, Gmail bridge, and Codex skills.",
    operatingRule: "Every request, blocker, approval, audit issue, and staff question becomes a Task with a Thread.",
  },
];

const SETTINGS_RECIPES = [
  {
    name: "Opportunity Research",
    skill: "swiss-planner-research",
    owner: "AIstaff_OpportunityHunter",
    output: "Verified opportunity, evidence links, professor/student leads, and CRM rows.",
    guardrail: "LinkedIn or posts can be leads only; serious rows require official-source evidence.",
  },
  {
    name: "Fit Review",
    skill: "swiss-planner-staff",
    owner: "AIstaff_FitAnalyst",
    output: "Fit score, priority, eligibility risk, and go/no-go recommendation.",
    guardrail: "Reject or downgrade opportunities with hard eligibility, funding, or location mismatch.",
  },
  {
    name: "Professor Research Fit",
    skill: "swiss-planner-research",
    owner: "AIstaff_ProfessorResearchAnalyst",
    output: "Professor research themes, relevant papers, contact path, and evidence notes.",
    guardrail: "Use official profiles, university pages, and defensible publication evidence.",
  },
  {
    name: "Application Package",
    skill: "swiss-planner-apply",
    owner: "AIstaff_ApplicationPackMaker",
    output: "CV, professional resume where useful, SOP, proposal/concept note, publication list, and checklist.",
    guardrail: "Use Iman's verified profile, Krakow contact details, and one Drive folder per application.",
  },
  {
    name: "Outreach Send",
    skill: "swiss-planner-apply + Gmail Bridge",
    owner: "AIstaff_ApplicationPackSender",
    output: "Verified email row, sent message, draft, or clear blocked reason.",
    guardrail: "No external send without approval state, content safety, package completeness, and attachment verification.",
  },
  {
    name: "Follow-up And Reply Reconciliation",
    skill: "swiss-planner-staff + Gmail Bridge",
    owner: "AIstaff_FollowUpController",
    output: "Reply status, follow-up thread, next task, or closure.",
    guardrail: "Replies become task threads; portal submissions and LinkedIn sends remain manual.",
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
    stages: ["Search", "Official Verification", "Evidence Capture", "Opportunity Row", "Manager Handoff"],
    purpose: "Builds the verified opportunity pipeline.",
  },
  {
    staff: "AIstaff_FitAnalyst",
    stages: ["Profile Match", "Eligibility Check", "Funding Check", "Priority Score", "Application Trigger"],
    purpose: "Decides whether an opportunity deserves application work.",
  },
  {
    staff: "AIstaff_ProfessorResearchAnalyst",
    stages: ["Profile Scan", "Publication Themes", "Student Leads", "Research Fit", "Evidence Brief"],
    purpose: "Makes supervisor fit concrete before writing or sending.",
  },
  {
    staff: "AIstaff_ApplicationPackMaker",
    stages: ["Inputs Check", "Draft Package", "Deep Proposal", "Drive Package", "Ready For Verification"],
    purpose: "Creates application material with professor-specific framing.",
  },
  {
    staff: "AIstaff_ApplicationPackSender",
    stages: ["Queue Check", "Content Safety", "Package Completeness", "Attachment Verification", "Send Or Block"],
    purpose: "Handles the safe send workflow after a package is complete.",
  },
  {
    staff: "AIstaff_FollowUpController",
    stages: ["Sync Replies", "Match Thread", "Review Waiting", "Create Follow-up", "Close Or Reopen"],
    purpose: "Keeps reply and follow-up status moving.",
  },
  {
    staff: "AIstaff_CRMController",
    stages: ["Sync", "Audit", "Detect Gaps", "Create System Tasks", "Report"],
    purpose: "Keeps the workbook, local database, threads, and event trail healthy.",
  },
];

const SETTINGS_LANES = [
  {
    name: "Workbook CRM Lane",
    agent: "CRM Data Agent",
    owner: "AIstaff_CRMController",
    connectors: "Google Sheets, AppSheet structure, local SQLite sync queue.",
    data: "Opportunities, Applications, AI Staff Tasks, Entities, Follow Ups, Event Log, Reports.",
    model: "Low or medium reasoning for audits; high reasoning for process diagnosis.",
    guardrail: "Every important status change should leave an event-log trail.",
  },
  {
    name: "Drive Package Lane",
    agent: "Package File Agent",
    owner: "AIstaff_ApplicationPackMaker",
    connectors: "Google Drive, Docs, PDFs, local package folders.",
    data: "Application Packages, Package Files, document indexes, proposal/CV/SOP files.",
    model: "High reasoning for proposals; low reasoning for file checks and upload registration.",
    guardrail: "One package folder per application under the configured Drive parent.",
  },
  {
    name: "Gmail Bridge Lane",
    agent: "Email Safety Agent",
    owner: "AIstaff_ApplicationPackSender",
    connectors: "Apps Script Gmail Bridge and Iman's Gmail account.",
    data: "Email Send Queue, sent log, inbox log, queue attachments, content-safety results.",
    model: "Low reasoning for verification; high reasoning when reviewing content risk.",
    guardrail: "Never send unless the queue row is allowed and all safety gates pass.",
  },
  {
    name: "Research Evidence Lane",
    agent: "Official Evidence Agent",
    owner: "AIstaff_OpportunityHunter",
    connectors: "Official university sites, job boards, professor pages, Google Scholar, LinkedIn as lead source.",
    data: "Links, Professor Research Fit, Student Outreach, rejected-opportunity notes.",
    model: "High reasoning for fit; official evidence required before promotion.",
    guardrail: "No serious opportunity without a source link that Iman can inspect.",
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
  agh: {
    key: "agh",
    name: "AGH University of Krakow",
    city: "Krakow",
    country: "Poland",
    type: "Technical university / doctoral school",
    website: "https://www.agh.edu.pl/en",
    doctoral: "https://sd.agh.edu.pl/en/candidates",
    focus: "Energy engineering, geothermal systems, drilling, petroleum engineering, geoscience, mining, and applied technical research.",
    fit: "Strong Krakow fit for engineering-heavy PhD routes framed toward geothermal bankability, subsurface risk, CCS, storage, and project-finance diligence.",
  },
  uek: {
    key: "uek",
    name: "Krakow University of Economics / UEK",
    city: "Krakow",
    country: "Poland",
    type: "Economics/business university",
    website: "https://uek.krakow.pl/en",
    doctoral: "https://sd.uek.krakow.pl/",
    focus: "Economics, finance, management, data science, sustainability, and business research.",
    fit: "Very strong location fit for finance, private markets, sustainable finance, and applied business research in Krakow.",
  },
  kisd: {
    key: "kisd",
    name: "Krakow Interdisciplinary Doctoral School / PAN Institutes",
    city: "Krakow",
    country: "Poland",
    type: "Doctoral school across Polish Academy of Sciences institutes",
    website: "https://kisd.ifj.edu.pl/",
    doctoral: "https://kisd.ifj.edu.pl/recruitment/",
    focus: "Interdisciplinary science, energy transition, thermal storage, geoscience, physics, and systems research through PAN institutes.",
    fit: "Useful for Krakow-based energy-transition topics where Iman's engineering background can connect to finance and implementation.",
  },
  hsg: {
    key: "hsg",
    name: "University of St. Gallen / HSG",
    city: "St. Gallen",
    country: "Switzerland",
    type: "Business school / university",
    website: "https://www.unisg.ch/en/",
    doctoral: "https://www.unisg.ch/en/studying/programmes/doctoral-programmes/",
    focus: "Finance, management, entrepreneurship, private markets, innovation, and business research.",
    fit: "High strategic fit for private markets, M&A, family office, project finance, and finance-industry positioning in Switzerland.",
  },
  unibas: {
    key: "unibas",
    name: "University of Basel",
    city: "Basel",
    country: "Switzerland",
    type: "Research university",
    website: "https://www.unibas.ch/en.html",
    doctoral: "https://www.unibas.ch/en/Studies/Application-Admission/Doctorate.html",
    focus: "Finance, sustainability, climate policy, economics, and interdisciplinary research depending on faculty/program.",
    fit: "Relevant for sustainable finance, decarbonization, and climate-risk topics with a Swiss institutional signal.",
  },
  uzh: {
    key: "uzh",
    name: "University of Zurich / Swiss Finance Institute",
    city: "Zurich",
    country: "Switzerland",
    type: "Research university / finance institute",
    website: "https://www.uzh.ch/en.html",
    doctoral: "https://www.sfi.ch/en/education/phd-program",
    focus: "Finance, banking, sustainable finance, asset pricing, risk, and quantitative research.",
    fit: "Excellent finance-hub fit for Zurich/SFI-style finance research, especially sustainable finance or private capital.",
  },
  kozminski: {
    key: "kozminski",
    name: "Kozminski University",
    city: "Warsaw",
    country: "Poland",
    type: "Business school",
    website: "https://www.kozminski.edu.pl/en",
    doctoral: "https://www.kozminski.edu.pl/en/doctoral-school",
    focus: "Management, finance, entrepreneurship, and business research.",
    fit: "Poland-based finance/business option, less location-ideal than Krakow but useful for private-market positioning.",
  },
  sgh: {
    key: "sgh",
    name: "SGH Warsaw School of Economics",
    city: "Warsaw",
    country: "Poland",
    type: "Economics university",
    website: "https://www.sgh.waw.pl/en",
    doctoral: "https://www.sgh.waw.pl/en/doctoral-school",
    focus: "Economics, finance, management, and public policy.",
    fit: "Good Polish finance signal for economics and finance when funded doctoral route and supervisor fit are clear.",
  },
  uw: {
    key: "uw",
    name: "University of Warsaw",
    city: "Warsaw",
    country: "Poland",
    type: "Research university",
    website: "https://en.uw.edu.pl/",
    doctoral: "https://szkolydoktorskie.uw.edu.pl/en/",
    focus: "Economics, finance, data science, policy, and broad research areas.",
    fit: "Good for Polish finance/economics paths if a funded route and supervisor fit are clear.",
  },
  pk: {
    key: "pk",
    name: "Cracow University of Technology / PK",
    city: "Krakow",
    country: "Poland",
    type: "Technical university",
    website: "https://www.pk.edu.pl/index.php?lang=en",
    doctoral: "https://szkoladoktorska.pk.edu.pl/",
    focus: "Engineering, environmental systems, energy, transport, and built environment.",
    fit: "Krakow-based technical fallback for energy, environment, and applied engineering topics with a finance-facing extension.",
  },
  uken: {
    key: "uken",
    name: "University of the National Education Commission, Krakow / UKEN",
    city: "Krakow",
    country: "Poland",
    type: "Public university",
    website: "https://uken.krakow.pl/en/",
    doctoral: "https://sd.uken.krakow.pl/",
    focus: "Economics, social sciences, education, and selected applied research fields.",
    fit: "Krakow location fit when the topic connects to economics, policy, finance, or regional development.",
  },
  unknown: {
    key: "unknown",
    name: "University not identified",
    city: "",
    country: "",
    type: "Reference",
    website: "",
    doctoral: "",
    focus: "The current row does not include enough university metadata.",
    fit: "Add a University field or enrich the dashboard response to make this reference exact.",
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
  return defaultManagerAvatar(staffId) || defaultSpecialistAvatar(staffId);
}

function defaultStaffAlias(staffId) {
  return DEFAULT_STAFF_ALIASES[staffId] || "";
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
  const profiles = [
    ["Manager", "Manager", "MG", "user", "manager"],
    ["OpportunityHunter", "Opportunity Hunter", "OH", "search", "hunter"],
    ["FitAnalyst", "Fit Analyst", "FA", "chart", "fit"],
    ["ProfessorResearchAnalyst", "Professor Research Analyst", "PR", "file", "research"],
    ["ApplicationPackMaker", "Application Pack Maker", "PM", "file", "maker"],
    ["ApplicationPackSender", "Application Pack Sender", "PS", "send", "sender"],
    ["FollowUpController", "Follow-up Controller", "FU", "clock", "follow"],
    ["CRMController", "CRM Controller", "CRM", "database", "crm"],
  ];
  const match = profiles.find(([needle]) => id.includes(needle));
  if (match) {
    const override = staffProfileOverride(id);
    const baseLabel = match[1];
    const alias = String(override.alias || defaultStaffAlias(id) || "").trim();
    return {
      label: alias || baseLabel,
      systemLabel: baseLabel,
      initials: (alias || baseLabel).split(/\s+/).map(part => part[0]).join("").slice(0, 3).toUpperCase(),
      icon: match[3],
      tone: match[4],
    };
  }
  const label = id.replace(/^AIstaff_/, "").replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim() || "Staff";
  const override = staffProfileOverride(id);
  const alias = String(override.alias || defaultStaffAlias(id) || "").trim();
  return { label: alias || label, systemLabel: label, initials: (alias || label).split(/\s+/).map(part => part[0]).join("").slice(0, 3).toUpperCase(), icon: "user", tone: "neutral" };
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
    row.opportunityId,
    row.applicationId,
    row.entityId,
    row.notes,
    row.recipientName,
    row.to,
    row.subject,
  ].join(" ").toLowerCase();
  const tests = [
    ["agh", /\bagh\b|agh\.edu|godawska|knez|sowizdzal|ansow|necki/],
    ["uek", /\buek\b|uek\.krakow|kozuch|sduek/],
    ["kisd", /\bkisd\b|ifj\.edu|imgpan|igsmie|min-pan|skotniczny|kaminski/],
    ["hsg", /\bhsg\b|unisg|st\.?\s*gallen|tykvova|palmie/],
    ["unibas", /unibas|basel|kachi|gantenbein/],
    ["uzh", /\buzh\b|sfi\.ch|leippold|swiss finance institute/],
    ["kozminski", /kozminski|mielcarz/],
    ["sgh", /\bsgh\b|sgh\.waw/],
    ["uw", /\buw\b|wne\.uw|university of warsaw/],
    ["pk", /\bpk\b|pk\.edu|cracow university of technology|szkoladoktorska@pk/],
    ["uken", /uken|national education commission|kozaczka/],
  ];
  for (const [key, pattern] of tests) {
    if (pattern.test(text)) return UNIVERSITY_REFERENCES[key];
  }
  return UNIVERSITY_REFERENCES.unknown;
}

function applicationStage(row = {}) {
  const text = `${row.currentStage || ""} ${row.currentStatus || ""}`.toLowerCase();
  if (text.includes("sent") || text.includes("waiting")) return "Sent - Waiting for Reply";
  if (text.includes("verified")) return "Package Verified";
  if (text.includes("progress")) return "Package In Progress";
  if (text.includes("required")) return "Package Required";
  if (text.includes("fit")) return "Fit Approved";
  if (text.includes("opportunity")) return "Opportunity Verified";
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
    text.includes("needs human review") ||
    text.includes("human review") ||
    text.includes("supervisor reply") ||
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
  return ["research", "find ", "opportunit", "professor", "proposal", "write", "draft", "document", "cv", "resume", "sop", "package", "analy", "fit"].some(term => text.includes(term));
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
    text.includes("supervisor reply")
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
    const title = (labels.applications && labels.applications[context.applicationId] && labels.applications[context.applicationId].label) || friendlyId(context.applicationId) || "Application";
    return { crumbs: ["Swiss Planner", "Applications"], title };
  }
  if (view === "opportunity-detail") {
    const title = (labels.opportunities && labels.opportunities[context.opportunityId] && labels.opportunities[context.opportunityId].label) || friendlyId(context.opportunityId) || "Opportunity";
    return { crumbs: ["Swiss Planner", "Applications"], title };
  }
  if (view === "university-detail") {
    return { crumbs: ["Swiss Planner", "Applications"], title: context.universityName || "University" };
  }
  return {
    crumbs: ["Swiss Planner"],
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
  summary.managerReview = reviewCount;
  summary.openEscalations = summary.openEscalations == null ? reviewCount : summary.openEscalations;
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
  if (text.includes("email") || text.includes("queue") || text.includes("attachment") || text.includes("send")) return "Email Safety";
  if (text.includes("technical") || text.includes("bug") || text.includes("webhook") || text.includes("lock")) return "Technical Bug";
  if (text.includes("audit") || text.includes("follow-up") || text.includes("stale")) return "System Audit";
  if (text.includes("research") || text.includes("opportunit") || text.includes("professor")) return "Research Work";
  if (text.includes("package") || text.includes("application") || text.includes("proposal") || text.includes("cv")) return "Application Work";
  return "Manager Guidance";
}

function managerRouteForMessage(message = "", taskType = "") {
  const text = normalizedText(`${taskType} ${message}`);
  if (text.includes("full process") || text.includes("whole process") || text.includes("end point") || text.includes("until submission") || text.includes("till submission") || text.includes("to submission") || text.includes("application process") || text.includes("apply for these") || text.includes("take these through")) {
    return { staff: "AIstaff_FitAnalyst", taskType: "Fit Review", taskCategory: "Research Work" };
  }
  if (text.includes("find") || text.includes("opportunit") || text.includes("search") || text.includes("research new") || text.includes("phd") || text.includes("msc")) {
    return { staff: "AIstaff_OpportunityHunter", taskType: "Research", taskCategory: "Research Work" };
  }
  if (text.includes("fit") || text.includes("score") || text.includes("priorit")) {
    return { staff: "AIstaff_FitAnalyst", taskType: "Fit Review", taskCategory: "Research Work" };
  }
  if (text.includes("professor") || text.includes("scholar") || text.includes("publication") || text.includes("research fit")) {
    return { staff: "AIstaff_ProfessorResearchAnalyst", taskType: "Research", taskCategory: "Research Work" };
  }
  if (text.includes("cv") || text.includes("resume") || text.includes("sop") || text.includes("proposal") || text.includes("package") || text.includes("document")) {
    return { staff: "AIstaff_ApplicationPackMaker", taskType: "Package", taskCategory: "Application Work" };
  }
  if (text.includes("send") || text.includes("email") || text.includes("outreach")) {
    return { staff: "AIstaff_ApplicationPackSender", taskType: "Outreach", taskCategory: "Email Safety" };
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
  if (text.includes("duplicate recipient") || text.includes("repeated professor") || text.includes("repeated supervisor")) return "The system detected a repeated professor/supervisor recipient, so it stopped before a second outreach.";
  if (text.includes("document style qa") || text.includes("not approved for external send") || text.includes("minimal renderer")) return "The package exists, but at least one document is not approved for external sending because it does not match the agreed template/style quality.";
  if (text.includes("attachment") && (text.includes("failed") || text.includes("blocked") || text.includes("incomplete"))) return "The email/package cannot be sent yet because package completeness or attachment access has not passed.";
  if (text.includes("codex") || text.includes("outside apps script") || text.includes("waiting for codex worker")) return "The workflow reached a step that Apps Script can track, but not judge or write safely by itself.";
  if (text.includes("follow") || text.includes("reply") || text.includes("waiting")) return "A follow-up or reply-check is due, and the system needs a clear next action instead of guessing.";
  return "The workflow is paused because a decision is needed before it can continue.";
}

function humanReadableTaskNeed(row = {}) {
  const text = normalizedText([row.taskType, row.taskCategory, row.status, row.lastError, row.resultNotes, row.nextAction, row.completionCriteria].join(" "));
  if (text.includes("duplicate recipient") || text.includes("repeated professor")) return "Tell Alex whether to prepare a reviewed follow-up, wait longer, close this outreach, or use another contact.";
  if (text.includes("document style qa") || text.includes("not approved for external send") || text.includes("minimal renderer")) return "Tell Alex whether to regenerate the package from the approved template path or close it as not ready.";
  if (text.includes("attachment") && (text.includes("failed") || text.includes("blocked") || text.includes("incomplete"))) return "Tell Alex whether to fix the package/attachments, prepare missing documents, or leave the email blocked.";
  if (text.includes("codex") || text.includes("outside apps script") || text.includes("waiting for codex worker")) return "Tell Alex whether Codex should do the judgement/writing/research work, another staff member should take it, or the task should be closed.";
  if (text.includes("follow") || text.includes("reply") || text.includes("waiting")) return "Tell Alex whether to follow up now, wait until a later date, close the application path, or review the reply trail first.";
  return "Reply in normal language: approve and continue, reassign, ask for more detail, or close.";
}

function humanReadableTaskOptions(row = {}) {
  const text = normalizedText([row.taskType, row.status, row.resultNotes, row.nextAction].join(" "));
  if (text.includes("duplicate recipient") || text.includes("repeated professor")) return ["Prepare a reviewed follow-up", "Wait longer", "Close this outreach", "Use another contact"];
  if (text.includes("style") || text.includes("template") || text.includes("minimal renderer")) return ["Regenerate with approved template", "Use Google Doc links only", "Close as not ready"];
  if (text.includes("codex") || text.includes("outside apps script")) return ["Let Codex handle it", "Reassign to another AI staff", "Ask for more detail", "Close the task"];
  if (text.includes("follow")) return ["Follow up now", "Wait and remind later", "Review reply trail", "Close this application path"];
  return ["Approve and continue", "Reassign", "Ask for more detail", "Close"];
}

function humanDecisionBrief(row = {}) {
  const related = [row.applicationId ? `application ${row.applicationId}` : "", row.opportunityId ? `opportunity ${row.opportunityId}` : "", row.sourceQueueId ? `email queue ${row.sourceQueueId}` : ""].filter(Boolean).join("; ") || "this task";
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
    setStatus(runAudit ? "Running sheet audit and syncing the local dashboard..." : "Syncing the local dashboard view...");
    try {
      const result = await api(`/api/dashboard?limit=60&runAudit=${runAudit ? "true" : "false"}`);
      setDashboard(result);
      const sync = result.localSync || {};
      const lastSync = sync.lastSheetSync ? fmtDate(sync.lastSheetSync) : "pending";
      setStatus(`Last refreshed ${fmtDate(result.refreshedAt)}. Local-first mode. Sheet sync: ${lastSync}. Pending local changes: ${sync.pendingActions || 0}.`);
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
    await runBusy(runAudit ? "Syncing and auditing..." : "Syncing local changes...", async () => {
      const result = await api("/api/sync-now", { method: "POST", body: JSON.stringify({ runAudit }) });
      setDashboard(result.dashboard);
      showToast("Sheet sync completed");
      setStatus("Sheet sync completed.");
    }, runAudit ? "sync:audit" : "sync:now", runAudit ? "Auditing..." : "Syncing...");
  }

  async function runOne(staff = "") {
    await runBusy(staff ? `Asking ${staffProfile(staff).label} to handle one due item...` : "Running one due staff task...", async () => {
      const result = await api("/api/run-one", { method: "POST", body: JSON.stringify({ staff, maxItems: 1 }), timeoutMs: 140000 });
      showToast(result.message || "Runner finished");
      await loadDashboard(false, true);
    }, `run-one:${staff || "next"}`, staff ? "Running staff..." : "Running task...");
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
  document.title = `${pageHeader.title} - Swiss Planner`;
  window.__SWISS_PLANNER_ACTION_STATE__ = { busy, actionKey: busyAction, label: busyLabel || "Running..." };

  return h("div", { className: cn("app-shell react-shell", materialReady && "material-web-enhanced", sidebarCollapsed && "sidebar-collapsed") },
    h("aside", { className: "sidebar" },
      h("div", { className: "brand-block" },
        h("div", { className: "brand-mark" }, "SP"),
        h("div", { className: "brand-copy" }, h("p", { className: "eyebrow" }, "Swiss Planner"), h("h1", null, "AI Staff")),
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
        view === "overview" ? h(OverviewView, { dashboard, summary, runOne, openTaskDialog, runAutopilotCycle, setAutopilot, autopilotEnabled, setView }) : null,
        view === "explorer" ? h(DepartmentExplorerView, { dashboard, runOne, openTaskDialog, setView, selectedStaffRequest: selectedExplorerStaffId }) : null,
        view === "applications" ? h(ApplicationsView, { rows: dashboard.applications || [], labels, filters: applicationFilters, setFilters: setApplicationFilters, viewMode: applicationsView, setViewMode: setApplicationsView, runOne, openTaskDialog, openRef, openUniversity }) : null,
        view === "work" ? h(WorkView, { dashboard, tasks: allTasks, labels, filters: taskFilters, setFilters: setTaskFilters, runOne, snoozeTask, reassignTask, snoozeFollowUp, processQueueRow, approveEmail, runEmailSafetyCheck, setDecisionDialog, openTaskDialog, openRef, openUniversity, openStaffProfile }) : null,
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

function OverviewView({ dashboard, summary, runOne, openTaskDialog, runAutopilotCycle, setAutopilot, autopilotEnabled, setView }) {
  const [activeTab, setActiveTab] = useState("sponsor");
  const sync = dashboard.localSync || {};
  const alexOpenThreads = (((dashboard.threadsSummary || {}).byStaff || {}).AIstaff_Manager || {}).open || 0;
  const activeApplications = summary.activeEntities || (dashboard.applications || []).length || 0;
  const blockedCount = (summary.blockedEmails || 0) + (summary.overdueTasks || 0) + (summary.overdueFollowUps || 0);
  const tabs = [
    ["sponsor", "Sponsor organization details"],
    ["howTo", "How to work with the department"],
    ["department", "Department operating model"],
  ];
  return h("section", { className: "overview-landing" },
    h("div", { className: "overview-hero" },
      h("div", { className: "overview-hero-copy" },
        h("p", { className: "eyebrow" }, "Overview"),
        h("h1", null, "Swiss Planner AI Department"),
        h("p", null, "A local AI staff department for PhD opportunity research, application preparation, package safety, and follow-up control.")
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
    activeTab === "sponsor" ? h(OverviewSponsorTab, { dashboard, summary, activeApplications, alexOpenThreads, blockedCount, sync }) : null,
    activeTab === "howTo" ? h(OverviewHowToTab, { setView, openTaskDialog }) : null,
    activeTab === "department" ? h(OverviewDepartmentTab, { dashboard, setView }) : null
  );
}

function OverviewSponsorTab({ dashboard, summary, activeApplications, alexOpenThreads, blockedCount, sync }) {
  const mission = ((dashboard.kpis || []).find(row => normalizedText(row.Status) === "active") || {})["Owner Notes"] || "Find and execute funded PhD paths in Europe, prioritizing Switzerland, finance, energy, and Krakow/Poland feasibility.";
  const cards = [
    ["Sponsor", "Iman Najafi", "Human owner and final decision maker."],
    ["Department", "Swiss Planner AI Staff", "Research, package preparation, safety checks, and follow-up control."],
    ["Manager", "Alex Fergusen", `${alexOpenThreads || 0} open thread(s) with the AI manager.`],
    ["Current workload", `${activeApplications || 0} active items`, `${summary.dueTasks || 0} due task(s), ${blockedCount || 0} risk item(s).`],
  ];
  return h("div", { className: "overview-panel" },
    h("div", { className: "overview-section-head" },
      h("div", null, h("h2", null, "Sponsor organization details"), h("p", null, "This department is configured like an internal AI team serving one sponsor organization.")),
      h(Badge, { tone: blockedCount ? "warn" : "ok" }, blockedCount ? "Needs attention" : "Operational")
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
        h("span", null, `Last sheet sync: ${fmtDate(sync.lastSheetSync) || "not synced yet"}`),
        h("span", null, `Pending local changes: ${sync.pendingActions || 0}`),
        h("span", null, `Failed actions: ${sync.failedActions || 0}`)
      )
    )
  );
}

function OverviewHowToTab({ setView, openTaskDialog }) {
  const steps = [
    ["1", "Message Alex", "Give the department a natural-language instruction. Alex routes it to the correct AI staff."],
    ["2", "Review human threads", "When Alex needs a decision, the question appears in Tasks as a conversation thread."],
    ["3", "Monitor the department", "Use Reports as the operating cockpit for KPIs, blockers, pipeline, staff status, and system health."],
    ["4", "Explore structure", "Use Department Explorer to inspect the team, roles, tools, work steps, QA rules, and learned skills."],
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
      h(Button, { variant: "secondary", onClick: () => setView("work") }, "Open Tasks"),
      h(Button, { variant: "secondary", onClick: () => setView("reports") }, "Open Reports")
    )
  );
}

function OverviewDepartmentTab({ dashboard, setView }) {
  const staff = STAFF_ORDER
    .filter(id => id !== HUMAN_STAFF_ID && id !== "AIstaff_Manager")
    .map(id => ({ id, label: staffProfile(id).label, role: staffProfile(id).systemLabel || "AI staff" }));
  return h("div", { className: "overview-panel" },
    h("div", { className: "overview-section-head" },
      h("div", null, h("h2", null, "Department operating model"), h("p", null, "The AI Manager coordinates specialist staff; humans communicate with Alex unless policy changes."))
    ),
    h("div", { className: "overview-org-mini" },
      h("article", { className: "overview-org-node owner" }, staffAvatar("Human_Iman"), h("div", null, h("strong", null, "Iman / Human"), h("span", null, "Department owner"))),
      h("div", { className: "overview-org-line" }),
      h("article", { className: "overview-org-node manager" }, staffAvatar("AIstaff_Manager"), h("div", null, h("strong", null, "Alex Fergusen"), h("span", null, "AI Department Manager"))),
      h("div", { className: "overview-org-staff" }, staff.map(item =>
        h("article", { className: "overview-org-node", key: item.id }, staffAvatar(item.id), h("div", null, h("strong", null, item.label), h("span", null, item.role || "AI staff")))
      ))
    ),
    h("div", { className: "overview-inline-actions" },
      h(Button, { onClick: () => setView("explorer") }, icon("user"), "Open Department Explorer"),
      h(Button, { variant: "secondary", onClick: () => setView("settings") }, "Department Settings")
    )
  );
}

function DailyKpiCard({ dashboard, summary }) {
  const sync = dashboard.localSync || {};
  const documentQuality = sync.documentQuality || {};
  const todayRuns = (dashboard.recentRuns || []).filter(row => {
    const date = new Date(row["Run Timestamp"] || row.runAt || row.Date || "");
    return !Number.isNaN(date.getTime()) && date.toDateString() === new Date().toDateString();
  }).length;
  const healthy = !sync.lastSyncError && Number(sync.pendingActions || 0) === 0 && Number(sync.failedActions || 0) === 0;
  const items = [
    ["Sheet sync health", healthy ? 100 : 35, healthy ? "Healthy" : "Needs attention", `Last sync ${sync.lastSheetSync ? fmtDate(sync.lastSheetSync) : "pending"}`],
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
          { label: "Sheet sync", value: `${progress.sheetSyncs || 0} / ${targets.sheetSyncs || 1}` },
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
    ["Discover", "AIstaff_OpportunityHunter", "Find verified leads"],
    ["Score", "AIstaff_FitAnalyst", "Rank fit and risk"],
    ["Research", "AIstaff_ProfessorResearchAnalyst", "Build professor evidence"],
    ["Package", "AIstaff_ApplicationPackMaker", "Create documents"],
    ["Send", "AIstaff_ApplicationPackSender", "Verify and send"],
    ["Follow up", "AIstaff_FollowUpController", "Track replies"],
    ["Control", "AIstaff_CRMController", "Sync CRM health"],
  ];
  const staff = dashboard.staff || [];
  const countFor = staffId => staff.find(row => row.staffId === staffId) || {};
  return h(Card, { className: "staff-flow-panel" },
    h(CardHeader, { title: "AI Team Workflow", description: "How work moves from opportunity discovery to follow-up.", action: h(Button, { variant: "secondary", onClick: () => setView("work") }, "Open Tasks") }),
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
    h(CardHeader, { title: "Applications", description: "Application entities, stages, owners, and clickable references.", action: h(Button, { variant: "secondary", onClick: () => openTaskDialog({ taskType: "Package" }) }, icon("plus"), "Add Application Task") }),
    h("div", { className: "application-toolbar" },
      h(Field, { label: "Search applications", className: "search-field" }, h(Input, { type: "search", value: filters.search, onChange: event => update("search", event.target.value), placeholder: "Search by university, supervisor, stage, application..." })),
      h(Field, { label: "Stage" }, h(Select, { value: filters.stage, onChange: event => update("stage", event.target.value) }, h("option", { value: "" }, "All stages"), stageOptions.map(([value, label]) => h("option", { key: value, value }, label)))),
      h(Field, { label: "University" }, h(Select, { value: filters.university, onChange: event => update("university", event.target.value) }, h("option", { value: "" }, "All universities"), universityOptions.map(([value, label]) => h("option", { key: value, value }, label)))),
      h("div", { className: "view-toggle", role: "group", "aria-label": "Application view" },
        h(Button, { className: cn("icon-toggle", viewMode === "list" && "active"), variant: "ghost", size: "icon", onClick: () => setViewMode("list"), title: "List view", "aria-pressed": viewMode === "list" }, icon("list")),
        h(Button, { className: cn("icon-toggle", viewMode === "kanban" && "active"), variant: "ghost", size: "icon", onClick: () => setViewMode("kanban"), title: "Kanban view", "aria-pressed": viewMode === "kanban" }, icon("kanban"))
      ),
      h("span", { className: "toolbar-count" }, `${filtered.length} / ${rows.length}`)
    ),
    h(CardContent, { className: "applications-content" },
      !rows.length ? h(EmptyState, { title: "No active applications", body: "The dashboard did not return any application entities." }) :
      !filtered.length ? h(EmptyState, { title: "No matching applications", body: "Adjust the search, stage, or university filters to broaden this view." }) :
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
      { label: "University", value: h(UniversityButton, { row, openUniversity }), raw: true },
      { label: "Stage", value: `${applicationStage(row)}${row.currentStage ? ` - ${row.currentStage}` : ""}`, length: 130 },
      { label: "Owner", value: h(StaffChip, { staffId: row.responsibleStaff }), raw: true },
      { label: "Opportunity", value: h(RefChip, { kind: "opportunities", id: row.opportunityId, labels, openRef, length: 180 }), raw: true },
      { label: "Latest task", value: h(RefChip, { kind: "tasks", id: row.lastTaskId, labels, openRef, length: 220 }), raw: true },
      { label: "Latest follow-up", value: h(RefChip, { kind: "followUps", id: row.lastFollowUpId, labels, openRef, length: 220 }), raw: true },
      { label: "Updated", value: fmtDate(row.lastUpdated) || "No update time" },
    ] }),
    h("div", { className: "action-strip" },
      h(Button, { actionKey: `run-one:${row.responsibleStaff || "next"}`, onClick: () => runOne(row.responsibleStaff) }, "Run Owner"),
      h(Button, { variant: "outline", onClick: () => openTaskDialog({ assignedTo: row.responsibleStaff, entityId: row.entityId, applicationId: row.applicationId, taskType: "Package" }) }, "Add Task")
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
      { label: "University", value: h(UniversityButton, { row, openUniversity }), raw: true },
      { label: "Owner", value: item.staff ? h(StaffChip, { staffId: item.staff }) : "", raw: true },
      { label: "Application", value: h(RefChip, { kind: "applications", id: row.applicationId || row.entityId, labels, openRef, length: 180 }), raw: true },
      { label: "Opportunity", value: h(RefChip, { kind: "opportunities", id: row.opportunityId, labels, openRef, length: 180 }), raw: true },
      { label: "Due", value: fmtDate(row.dueAt) },
      { label: "Next action", value: row.nextAction || item.body, length: 240 },
      { label: "Reason", value: row.lastError || row.resultNotes || item.body, length: 240 },
      { label: "Reference", value: item.taskId || item.followUpId || item.queueId },
    ] }),
    h("div", { className: "notice-actions" },
      item.queueId ? h(Button, { actionKey: `approve-email:${item.queueId}`, onClick: () => approveEmail(item.queueId) }, "Approve Email") : null,
      item.queueId ? h(Button, { actionKey: `email-safety:${item.queueId}`, variant: "outline", onClick: () => runEmailSafetyCheck(item.queueId) }, "Safety Check") : null,
      item.queueId ? h(Button, { actionKey: `process-queue:${item.queueId}`, variant: "secondary", onClick: () => processQueueRow(item.queueId) }, "Check / Send") : null,
      item.taskId ? h(Button, { actionKey: `run-one:${item.staff || "next"}`, onClick: () => runOne(item.staff) }, "Run Staff") : null,
      item.taskId ? h(Button, { actionKey: `snooze-task:${item.taskId}`, variant: "outline", onClick: () => snoozeTask(item.taskId, 24) }, "Snooze 24h") : null,
      item.taskId && reassignTask ? h(Button, { actionKey: `reassign-task:${item.taskId}:AIstaff_Manager`, variant: "outline", onClick: () => reassignTask(item.taskId, "AIstaff_Manager") }, "Ask Manager") : null,
      item.followUpId ? h(Button, { actionKey: `run-one:${item.staff || "next"}`, onClick: () => runOne(item.staff) }, "Run Staff") : null,
      item.followUpId ? h(Button, { actionKey: `snooze-followup:${item.followUpId}`, variant: "outline", onClick: () => snoozeFollowUp(item.followUpId, 24) }, "Snooze 24h") : null,
      item.entityId && closeEntity ? h(Button, { actionKey: `close-entity:${item.entityId}`, variant: "outline", onClick: () => closeEntity(item.entityId) }, "Close Entity") : null,
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

function WorkView({ dashboard, tasks, labels, filters, setFilters, runOne, snoozeTask, reassignTask, snoozeFollowUp, processQueueRow, approveEmail, runEmailSafetyCheck, setDecisionDialog, openTaskDialog, openRef, openUniversity, openStaffProfile }) {
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
                h(Field, { label: "Related" }, h(Input, { type: "search", value: filters.application || "", onChange: event => updateFilter("application", event.target.value), placeholder: "Application / opportunity" }))
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
              h("button", { type: "button", className: "thread-person thread-person-button", onClick: () => setStaffPreviewId(threadActionStaffId(selectedThread)), title: `Open ${threadActionStaffLabel(selectedThread)} details` },
                staffAvatar(threadActionStaffId(selectedThread)),
                h("div", { className: "thread-person-meta" },
                  h("div", { className: "thread-person-title-row" },
                    h("h3", null, threadActionStaffLabel(selectedThread)),
                    h(Badge, null, selectedSource.taskCategory || "Task")
                  ),
                  h("p", null, selectedThread.status || "Open", " | ", waitingLabel(selectedThread))
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
                { label: "Application", value: h(RefChip, { kind: "applications", id: selectedThread.applicationId || selectedSource.applicationId, labels, openRef, length: 160, showStatus: false }), raw: true },
                { label: "Opportunity", value: h(RefChip, { kind: "opportunities", id: selectedThread.opportunityId || selectedSource.opportunityId, labels, openRef, length: 160, showStatus: false }), raw: true },
                { label: "University", value: h(UniversityButton, { row: selectedSource, openUniversity }), raw: true },
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
              h(Textarea, { value: composer, onChange: event => setComposer(event.target.value), rows: 3, placeholder: "Write your reply in Persian, English, or mixed language..." }),
              h("div", { className: "composer-actions" },
                h("span", null, "Replying does not send an email. Your answer goes to the Manager first."),
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
  const party = threadActionStaffLabel(thread);
  const topic = threadTopic(thread);
  const preview = cleanThreadPreview(thread.lastMessagePreview || source.nextAction || source.resultNotes || "");
  const updateCount = [thread.lastMessagePreview, source.nextAction, source.resultNotes, source.lastError].filter(Boolean).length || 1;
  return h("button", { className: cn("thread-list-item", active && "active", isHumanResponsible(thread.unreadFor) && "unread"), onClick, type: "button" },
    h("div", { className: "thread-list-avatar" }, staffAvatar(actionStaff)),
    h("div", { className: "thread-list-main" },
      h("div", { className: "thread-list-top" },
        h("div", { className: "thread-list-title" }, party),
        h("time", { className: "thread-list-time" }, fmtDate(thread.lastMessageAt))
      ),
      h("div", { className: "thread-list-topic" }, topic),
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
        ["Task", "Responsible", "Status", "Due", "Application", "Action"].map(label => h("th", { key: label }, label))
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
  return h(Card, null,
    h(CardHeader, {
      title: "Email Queue",
      description: "Only safe, complete, approved rows can be sent.",
      action: h(Fragment, null, h(Button, { actionKey: "email-safety:configured", variant: "secondary", onClick: () => runEmailSafetyCheck("") }, icon("shield"), "Safety Check"), h(Button, { onClick: () => processQueueRow("") }, icon("send"), "Run Sender")),
    }),
    h(CardContent, { className: "stack" }, rows.length ? rows.slice(0, 30).map(row =>
      h("article", { className: cn("notice", noticeTone(`${row.sendStatus} ${row.approvalStatus}`)), key: row.queueId },
        h("div", { className: "card-topline" }, h("div", null, h("h3", null, row.recipientName || row.to || "Email row"), h("div", { className: "card-meta" }, row.queueId)), h(Badge, null, row.sendStatus || row.approvalStatus)),
        h(DetailList, { rows: [
          { label: "University", value: h(UniversityButton, { row, openUniversity }), raw: true },
          { label: "Application", value: h(RefChip, { kind: "applications", id: row.applicationId, labels, openRef }), raw: true },
          { label: "Opportunity", value: h(RefChip, { kind: "opportunities", id: row.opportunityId, labels, openRef }), raw: true },
          { label: "Recipient", value: row.recipientName || row.to },
          { label: "Email", value: row.to },
          { label: "Subject", value: row.subject, length: 220 },
          { label: "Approval", value: row.approvalStatus },
          { label: "Problem", value: row.lastError, length: 240 },
        ] }),
        h("div", { className: "notice-actions" }, h(Button, { actionKey: `process-queue:${row.queueId}`, onClick: () => processQueueRow(row.queueId) }, "Process Row"), h(Button, { actionKey: `approve-email:${row.queueId}`, variant: "outline", onClick: () => approveEmail(row.queueId) }, "Approve"), h(Button, { actionKey: `email-safety:${row.queueId}`, variant: "ghost", onClick: () => runEmailSafetyCheck(row.queueId) }, "Safety"))
      )
    ) : h(EmptyState, { title: "No email rows", body: "The current dashboard snapshot did not return queue rows." }))
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
  return uniqueValues([...STAFF_ORDER, ...((dashboard.staff || []).map(row => row.staffId))]);
}

function staffLevel(staffId) {
  const override = staffProfileOverride(staffId);
  return override.aiLevel || STAFF_LEVELS[staffId] || (isHumanResponsible(staffId) ? "Human Manager" : "Senior");
}

function staffReportsTo(staffId) {
  if (isHumanResponsible(staffId)) return "";
  return STAFF_REPORTS_TO[staffId] || "AIstaff_Manager";
}

function staffRolePurpose(staffId, fabric) {
  const override = staffProfileOverride(staffId);
  if (override.roleSummary) return override.roleSummary;
  const capability = (fabric.capabilities || []).find(row => row.ownerStaff === staffId || row.owner === staffId);
  if (capability && capability.summary) return capability.summary;
  const config = staffStageConfig(staffId);
  return config.purpose || (isHumanResponsible(staffId) ? "Sets priorities, approves learning, and gives the AI Manager direction." : "Owns delegated work inside the Swiss Planner department.");
}

function staffJobTitle(staffId) {
  const override = staffProfileOverride(staffId);
  if (override.profileTitle) return override.profileTitle;
  const profile = staffProfile(staffId);
  if (isHumanResponsible(staffId)) return "Department Owner";
  if (staffId === "AIstaff_Manager") return "Department Manager";
  const titles = {
    AIstaff_OpportunityHunter: "Senior Research Specialist",
    AIstaff_FitAnalyst: "Fit And Eligibility Analyst",
    AIstaff_ProfessorResearchAnalyst: "Professor Research Specialist",
    AIstaff_ApplicationPackMaker: "Application Package Specialist",
    AIstaff_ApplicationPackSender: "Outreach Safety Specialist",
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
      company: "Swiss Planner",
      jobTitle: "Department Owner / Human Manager",
      address: "Krakow, Poland",
    };
  }
  const alias = profile.label.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/(^\.|\.$)/g, "");
  return {
    email: `${alias || "staff"}@local.swiss-planner.ai`,
    chat: staffId === "AIstaff_Manager" ? "Direct task thread from Iman" : "Internal task thread through AI Manager",
    mobile: "Not applicable",
    company: "Swiss Planner AI Staff",
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
        h("button", { type: "button", role: "tab", "aria-selected": explorerTab === "settings", className: cn("department-main-tab", explorerTab === "settings" && "active"), onClick: () => { setSelectedStaffId(""); setExplorerTab("settings"); } }, icon("shield"), "Department Settings")
      ),
      explorerTab === "settings" ? h(DepartmentSettingsView, { dashboard, fabric }) : null,
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

function DepartmentSettingsView({ dashboard, fabric }) {
  const [settingsTab, setSettingsTab] = useState("departmentSkill");
  const counts = [
    ["Capabilities", (fabric.capabilities || []).length],
    ["Recipes", (fabric.recipes || []).length],
    ["Stages", (fabric.recipes || []).reduce((sum, recipe) => sum + ((recipe.stages || []).length), 0)],
    ["Lanes", (fabric.lanes || []).length],
  ];
  const settingTabs = [["departmentSkill", "Department Skill"], ...FABRIC_NOTE_SECTIONS];
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
            title: "Swiss Planner Staff Skill",
            description: "Department-level rules: operating model, routing, safety, learning, and completion standards."
          })
          : h(FabricNoteEditor, { section: settingsTab })
      )
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
  return h("div", { className: "department-org-tree", "aria-label": "Swiss Planner AI Staff hierarchy" },
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
  const [section, setSection] = useState("solutions");
  const fabric = fabricOrFallback(dashboard);
  const sections = [
    ["solutions", "Solutions"],
    ["capabilities", "Capabilities"],
    ["recipes", "Recipes"],
    ["stages", "Stages"],
    ["lanes", "Lanes"],
    ["connections", "Connections"],
    ["databases", "Databases"],
    ["ai", "AI Support"],
    ["quality", "Quality"],
  ];
  const totals = {
    capabilities: fabric.capabilities.length,
    recipes: fabric.recipes.length,
    stages: fabric.recipes.reduce((sum, recipe) => sum + ((recipe.stages || []).length), 0),
    lanes: fabric.lanes.length,
    connections: fabric.connections.length,
    databases: fabric.databases.length,
    ai: fabric.aiSupport.length,
    quality: fabric.qualityGates.length,
  };
  return h(Fragment, null,
    h(Card, { className: "settings-hero" },
      h(CardHeader, {
        eyebrow: "Settings",
        title: "Capability Orchestration Fabric",
        description: "Registry-driven map: solution modules, business capabilities, recipes, stages, lanes, supporting connections, databases, AI support, quality gates, and outputs.",
        action: h(Badge, { tone: fabric.errors && fabric.errors.length ? "danger" : "success" }, fabric.errors && fabric.errors.length ? `${fabric.errors.length} registry issue(s)` : "Registry active"),
      }),
      h(CardContent, null,
        h("p", { className: "muted" }, "Normal relationship: Solution module -> Capability -> Recipe -> Stage -> Lane -> Quality gate -> Output. Supporting inputs feed stage/lane work: Databases + Connections + AI Support."),
        h("div", { className: "settings-tabs", role: "tablist", "aria-label": "Settings sections" }, sections.map(([key, label]) =>
          h("button", { key, type: "button", className: cn("settings-tab", section === key && "active"), onClick: () => setSection(key) },
            h("span", null, label),
            key !== "solutions" ? h("small", null, totals[key] || 0) : null
          )
        ))
      )
    ),
    section === "solutions" ? h(SettingsSolutionsSection, { fabric }) : null,
    section === "capabilities" ? h(SettingsCapabilitiesSection, { dashboard, fabric }) : null,
    section === "recipes" ? h(SettingsRecipesSection, { fabric }) : null,
    section === "stages" ? h(SettingsStagesSection, { fabric }) : null,
    section === "lanes" ? h(SettingsLanesSection, { fabric }) : null,
    section === "connections" ? h(SettingsInventorySection, { rows: fabric.connections, title: "Connections", typeLabel: "Connection" }) : null,
    section === "databases" ? h(SettingsInventorySection, { rows: fabric.databases, title: "Databases", typeLabel: "Database" }) : null,
    section === "ai" ? h(SettingsAiSection, { fabric }) : null,
    section === "quality" ? h(SettingsQualitySection, { fabric }) : null
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
  const packageReady = applications.filter(row => /package prepared|package verified|sent|submitted/i.test(`${row.currentStage || ""} ${row.currentStatus || ""}`));
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
    blockedEmails.length ? `${blockedEmails.length} outbound email row${blockedEmails.length === 1 ? "" : "s"} are blocked by safety gates.` :
    Number(sync.failedActions || 0) ? `${sync.failedActions} local sync action${Number(sync.failedActions || 0) === 1 ? "" : "s"} failed and should be repaired.` :
    dueOpenTasks.length ? `${dueOpenTasks.length} due task${dueOpenTasks.length === 1 ? "" : "s"} need staff execution.` :
    riskCount ? `${riskCount} application path${riskCount === 1 ? "" : "s"} need movement or deadline review.` :
    "No critical blocker is visible in the current dashboard snapshot.";
  const recommendedAction =
    humanTasks.length ? "Open Tasks and answer Alex's human-facing threads first." :
    blockedEmails.length ? "Open the blocked Email Safety item and keep it stopped until package/content checks pass." :
    Number(sync.failedActions || 0) ? "Review System Health and rerun sync after fixing failed local actions." :
    dueOpenTasks.length ? "Run the next due task or the KPI cycle to keep the queue moving." :
    riskCount ? "Review the Applications section and assign the next owner for stale/deadline-risk paths." :
    "Let the KPI cycle continue or ask Alex for the next plan.";
  const executiveSummary = {
    currentStatus: `Alex sees the department as ${healthStatus.toLowerCase()} for ${period.label.toLowerCase()}.`,
    changed: `${applicationsInPeriod.length} application update${applicationsInPeriod.length === 1 ? "" : "s"}, ${emailsSentInPeriod.length} sent email${emailsSentInPeriod.length === 1 ? "" : "s"}, ${tasksDoneInPeriod.length} closed task${tasksDoneInPeriod.length === 1 ? "" : "s"}, and ${periodEventCount + periodRunCount} activity item${periodEventCount + periodRunCount === 1 ? "" : "s"} in this period.`,
    bottleneck: mainBottleneck,
    nextAction: recommendedAction,
  };
  const kpiCards = [
    { label: "Active Applications", value: applications.length || (summary.activeEntities || 0), scope: "Current state", detail: `${applicationsInPeriod.length} updated in ${period.label.toLowerCase()}`, tone: "ok", trendSeries: buildReportTrendSeries(applications, ["lastUpdated", "createdAt", "Created At"], period) },
    { label: "Applications Updated", value: applicationsInPeriod.length, scope: "Selected period", detail: `${riskCount} current risk item(s)`, tone: riskCount ? "warn" : "ok", trendSeries: buildReportTrendSeries(applicationsInPeriod, ["lastUpdated", "createdAt", "Created At"], period) },
    { label: "Packages Prepared", value: packageReadyInPeriod.length, scope: "Selected period", detail: `${packageReady.length} prepared/current total`, tone: packageReadyInPeriod.length ? "ok" : "warn", trendSeries: buildReportTrendSeries(packageReady, ["lastUpdated", "createdAt", "Created At"], period) },
    { label: "Emails Sent", value: emailsSentInPeriod.length, scope: "Selected period", detail: `${blockedEmails.length} blocked/current total`, tone: blockedEmails.length ? "warn" : "ok", trendSeries: buildReportTrendSeries(emailsSentInPeriod, ["sentAt", "Sent At"], period) },
    { label: "Waiting Replies", value: waitingReplies.length, scope: "Current state", detail: `${waitingRepliesInPeriod.length} changed in period`, tone: waitingReplies.length ? "warn" : "ok", trendSeries: buildReportTrendSeries(waitingReplies, ["lastUpdated", "sentAt", "Sent At"], period) },
    { label: "Human Inbox", value: humanTasks.length, scope: "Current state", detail: `${humanTasksInPeriod.length} created/changed in period`, tone: humanTasks.length ? "warn" : "ok", trendSeries: buildReportTrendSeries(humanTasks, ["createdAt", "Created At", "runAfter", "dueAt", "lastMessageAt"], period) },
    { label: "Blocked Emails", value: blockedEmails.length, scope: "Current state", detail: `${blockedEmailsInPeriod.length} blocked in period`, tone: blockedEmails.length ? "danger" : "ok", trendSeries: buildReportTrendSeries(blockedEmails, ["sentAt", "createdAt", "Created At", "approvedAt", "notBefore"], period) },
    { label: "Late Follow-ups", value: followUps.filter(row => row.overdue).length, scope: "Current state", detail: `${lateFollowUpsInPeriod.length} due in period`, tone: followUps.some(row => row.overdue) ? "danger" : "ok", trendSeries: buildReportTrendSeries(followUps.filter(row => row.overdue), ["dueAt", "runAfter"], period) },
  ];
  const stages = ["Opportunity Verified", "Fit Approved", "Package Required", "Package In Progress", "Package Prepared", "Package Verified", "Sent - Waiting for Reply", "Reply Received - Needs Review", "Other"].map(stage => ({
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
      kind: "Email Safety",
      title: row.recipientName || row.to || row.queueId,
      owner: "AIstaff_ApplicationPackSender",
      status: row.sendStatus || row.approvalStatus || "Blocked",
      body: row.lastError || row.subject,
      next: "Keep blocked until content, duplicate-recipient, package, and attachment checks pass.",
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
  const systemHealth = [
    { label: "Sheet sync", value: sync.lastSheetSync ? fmtDate(sync.lastSheetSync) : "Not synced", status: sync.lastSyncError ? "Error" : "Healthy", tone: sync.lastSyncError ? "danger" : "ok" },
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
  if (text.includes("reply received") || text.includes("supervisor reply")) return "Reply Received - Needs Review";
  if (text.includes("sent") || text.includes("waiting")) return "Sent - Waiting for Reply";
  if (text.includes("package verified")) return "Package Verified";
  if (text.includes("package prepared") || text.includes("docs uploaded")) return "Package Prepared";
  if (text.includes("package in progress")) return "Package In Progress";
  if (text.includes("package required")) return "Package Required";
  if (text.includes("fit approved")) return "Fit Approved";
  if (text.includes("opportunity verified")) return "Opportunity Verified";
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
    { id: "pipeline", label: "Applications", value: model.applicationRisks.length, tone: model.applicationRisks.some(item => item.risk !== "On Track") ? "warn" : "ok", detail: "Pipeline, latest movement, and deadline risk", icon: "file" },
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
    pipeline: "Applications",
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
      h("h1", null, "AI Operating System for PhD Applications"),
      h("p", { className: "report-hero-subtitle" }, "Alex coordinates opportunity research, application packages, outreach safety, follow-ups, CRM sync, and daily KPI execution."),
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
        h("span", null, `Sheet sync ${model.sync.lastSheetSync ? fmtDate(model.sync.lastSheetSync) : "pending"}`),
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
    h(CardHeader, { title: "Application Pipeline Overview", description: "Where applications sit from verified lead to reply/submission.", action: h(Button, { variant: "secondary", onClick: () => setView("applications") }, "Open Applications") }),
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
            item.applicationId ? { label: "Application", value: h(RefChip, { kind: "applications", id: item.applicationId, labels: model.labels, openRef, length: 140 }), raw: true } : null,
            item.opportunityId ? { label: "Opportunity", value: h(RefChip, { kind: "opportunities", id: item.opportunityId, labels: model.labels, openRef, length: 140 }), raw: true } : null,
            { label: "What happened", value: item.body, length: 220 },
            { label: "What is needed", value: item.next, length: 220 },
            item.time ? { label: "Latest time", value: fmtDate(item.time) } : null,
          ] })
        )
      ) : h(EmptyState, { title: "No active blockers", body: "No human decisions or blocked email/package rows are visible in the current snapshot." })),
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
    h(CardHeader, { title: "Email & Safety Monitor", description: "Outbound messages remain gated by content, package, duplicate, and attachment checks." }),
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
    h(CardHeader, { eyebrow: "Reference View", title: university.name, description: [university.city, university.country, university.type].filter(Boolean).join(" | "), action: h(Button, { variant: "secondary", onClick: () => setView("applications") }, "Back") }),
    h(CardContent, { className: "detail-grid" },
      h("section", { className: "detail-section" }, h("h3", null, "University Details"), h(DetailList, { rows: [{ label: "Website", value: university.website }, { label: "Doctoral", value: university.doctoral }, { label: "Focus", value: university.focus, length: 260 }, { label: "Fit", value: university.fit, length: 260 }] })),
      h("section", { className: "detail-section" }, h("h3", null, "Related Records"), h(DetailList, { rows: [{ label: "Applications", value: String(applications.length) }, { label: "Tasks", value: String(tasks.length) }, { label: "Emails", value: String(emails.length) }] }), h("div", { className: "entity-list no-pad" }, applications.map(row => h("article", { className: "app-card", key: row.entityId || row.applicationId }, h(RefChip, { kind: "applications", id: row.applicationId || row.entityId, labels, openRef }), h("p", null, row.currentStatus || row.currentStage)))))
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
    h(CardHeader, { eyebrow: "Application", title: (labels.applications[appId] && labels.applications[appId].label) || friendlyId(appId), description: app.currentStatus || app.currentStage || "Application record", action: h(Button, { variant: "secondary", onClick: () => setView("applications") }, "Back") }),
    h(CardContent, { className: "detail-grid" },
      h("section", { className: "detail-section" }, h("h3", null, "Record"), h(DetailList, { rows: [
        { label: "University", value: h(UniversityButton, { row: app, openUniversity }), raw: true },
        { label: "Stage", value: app.currentStage },
        { label: "Status", value: app.currentStatus },
        { label: "Owner", value: h(StaffChip, { staffId: app.responsibleStaff }), raw: true },
        { label: "Opportunity", value: h(RefChip, { kind: "opportunities", id: app.opportunityId, labels, openRef }), raw: true },
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
        ) : h(EmptyState, { title: "No linked work", body: "No tasks or email queue records are linked to this application in the current snapshot." })
      ))
    )
  );
}

function OpportunityDetail({ dashboard, labels, opportunityId, setView, openRef, openUniversity }) {
  const applications = (dashboard.applications || []).filter(row => row.opportunityId === opportunityId);
  const seed = applications[0] || { opportunityId };
  return h(Card, { className: "detail-page" },
    h(CardHeader, { eyebrow: "Opportunity", title: (labels.opportunities[opportunityId] && labels.opportunities[opportunityId].label) || friendlyId(opportunityId), description: "Linked application and workflow records.", action: h(Button, { variant: "secondary", onClick: () => setView("applications") }, "Back") }),
    h(CardContent, { className: "detail-grid" },
      h("section", { className: "detail-section" }, h("h3", null, "Opportunity"), h(DetailList, { rows: [{ label: "University", value: h(UniversityButton, { row: seed, openUniversity }), raw: true }, { label: "Opportunity ID", value: opportunityId }] })),
      h("section", { className: "detail-section" }, h("h3", null, "Linked Applications"), h("div", { className: "entity-list no-pad" }, applications.length ? applications.map(row => h("article", { className: "app-card", key: row.entityId || row.applicationId }, h(RefChip, { kind: "applications", id: row.applicationId || row.entityId, labels, openRef }), h("p", null, row.currentStatus || row.currentStage))) : h(EmptyState, { title: "No linked applications", body: "No active application entity is linked to this opportunity in the current snapshot." })))
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
        h(Field, { label: "Task Type" }, h(Select, { value: value.taskType, onChange: event => update("taskType", event.target.value) }, ["Manager Guidance", "Research", "Fit Review", "Package", "Outreach", "Follow-up", "CRM Health", "Report"].map(type => h("option", { key: type, value: type }, type)))),
        h(Field, { label: "Task Category" }, h(Select, { value: value.taskCategory || "", onChange: event => update("taskCategory", event.target.value) }, TASK_CATEGORIES.map(category => h("option", { key: category, value: category }, category)))),
        h(Field, { label: "Related Entity" }, h(Input, { value: value.entityId, onChange: event => update("entityId", event.target.value), placeholder: "Search/select entity in next version" })),
        h(Field, { label: "Application" }, h(Input, { value: value.relatedApplicationId, onChange: event => update("relatedApplicationId", event.target.value), placeholder: "Application ID" })),
        h(Field, { label: "Run After" }, h(Input, { type: "datetime-local", value: value.runAfter, onChange: event => update("runAfter", event.target.value) })),
        h(Field, { label: "Due At" }, h(Input, { type: "datetime-local", value: value.dueAt, onChange: event => update("dueAt", event.target.value) })),
        h(Field, { label: "Priority" }, h(Select, { value: value.priority, onChange: event => update("priority", event.target.value) }, ["High", "Medium", "Low", "Critical", "Test"].map(priority => h("option", { key: priority, value: priority }, priority)))),
        h(Field, { label: isManagerMessage ? "Message" : "Next Action", className: "wide" }, h(Textarea, { value: value.nextAction, onChange: event => update("nextAction", event.target.value), placeholder: isManagerMessage ? "Tell the Manager what you want the AI team to do..." : "What exactly should the staff do?", rows: 5, required: true }))
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
