const state = {
  dashboard: null,
  refreshTimer: null,
  notificationsEnabled: false,
  lastReviewCount: 0,
  actionBusy: false,
  currentView: "overview",
  selectedUniversityKey: "",
  selectedLeadId: "",
  selectedOpportunityId: "",
  applicationsView: "list",
  applicationFilters: {
    search: "",
    stage: "",
    university: "",
  },
  labels: {
    tasks: {},
    followUps: {},
    applications: {},
    opportunities: {},
  },
};

const STAFF_ORDER = [
  "AIstaff_Manager",
  "AIstaff_OpportunityHunter",
  "AIstaff_FitAnalyst",
  "AIstaff_ProfessorResearchAnalyst",
  "AIstaff_LeadPackMaker",
  "AIstaff_LeadPackSender",
  "AIstaff_FollowUpController",
  "AIstaff_CRMController",
];

function initNavigation() {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => showView(button.dataset.target || "overview"));
  });
  showView("overview");
}

function showView(view) {
  state.currentView = view;
  const activeNav = ["university-detail", "application-detail", "opportunity-detail"].includes(view) ? "applications" : view;
  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.target === activeNav);
  });
  document.querySelectorAll(".view").forEach(section => {
    const targets = String(section.dataset.view || "").split(/\s+/).filter(Boolean);
    section.classList.toggle("is-hidden", !targets.includes(view));
  });
}

function el(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return date.toLocaleString();
}

function short(value, length = 88) {
  const text = String(value ?? "").trim();
  if (text.length <= length) return escapeHtml(text);
  return `${escapeHtml(text.slice(0, length - 1))}...`;
}

function staffLabel(value) {
  return String(value || "")
    .replace(/^AIstaff_/, "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim() || "Unassigned";
}

function staffProfile(value) {
  const id = String(value || "");
  const profiles = [
    ["Manager", "Manager", "MG", "person-check", "manager"],
    ["OpportunityHunter", "Tender Document Analyst", "OH", "search-person", "hunter"],
    ["FitAnalyst", "Fit Analyst", "FA", "chart-person", "fit"],
    ["ProfessorResearchAnalyst", "Supplier Mapper", "PR", "reader-person", "research"],
    ["LeadPackMaker", "Tender Package Maker", "PM", "document-person", "maker"],
    ["LeadPackSender", "Supplier Outreach Specialist", "PS", "send-person", "sender"],
    ["FollowUpController", "Follow-up Controller", "FU", "clock-person", "follow"],
    ["CRMController", "CRM Controller", "CRM", "database-person", "crm"],
  ];
  const compact = id.replace(/^AIstaff_/, "").replace(/_/g, "");
  for (const [needle, label, initials, icon, tone] of profiles) {
    if (compact.includes(needle)) return { id, label, initials, icon, tone };
  }
  const label = staffLabel(id);
  const initials = label.split(/\s+/).map(word => word[0]).join("").slice(0, 3).toUpperCase() || "AI";
  return { id, label, initials, icon: "person", tone: "default" };
}

function staffOptionLabel(staffId) {
  const profile = staffProfile(staffId);
  return profile.label || staffLabel(staffId);
}

function iconSvg(name) {
  const paths = {
    person: `<circle cx="12" cy="8" r="3.2"></circle><path d="M5.5 19c1.1-3.5 3.3-5.2 6.5-5.2s5.4 1.7 6.5 5.2"></path>`,
    "person-check": `<circle cx="10" cy="8" r="3.2"></circle><path d="M3.8 19c1-3.5 3.1-5.2 6.2-5.2 1.4 0 2.7.3 3.7 1"></path><path d="m15 18 2 2 4-5"></path>`,
    "search-person": `<circle cx="10" cy="8" r="3"></circle><path d="M4.5 18c.9-2.9 2.7-4.3 5.5-4.3 1.6 0 2.9.5 3.9 1.4"></path><circle cx="17" cy="17" r="3"></circle><path d="m19.2 19.2 2 2"></path>`,
    "chart-person": `<circle cx="8" cy="7.5" r="2.8"></circle><path d="M3.5 17.5c.8-2.7 2.4-4 4.5-4 1.1 0 2 .2 2.7.7"></path><path d="M14 19v-5"></path><path d="M18 19v-8"></path><path d="M22 19V8"></path>`,
    "reader-person": `<circle cx="7.5" cy="8" r="2.8"></circle><path d="M3.2 18c.8-2.8 2.2-4.2 4.3-4.2 1 0 1.8.2 2.4.6"></path><path d="M13 6.5h7v11h-7z"></path><path d="M15 9h3"></path><path d="M15 12h3"></path>`,
    "document-person": `<circle cx="8" cy="8" r="2.8"></circle><path d="M3.5 18c.8-2.9 2.3-4.3 4.5-4.3 1 0 1.8.2 2.5.6"></path><path d="M14 4h4l3 3v13h-7z"></path><path d="M18 4v4h3"></path>`,
    "send-person": `<circle cx="7.5" cy="8" r="2.8"></circle><path d="M3.2 18c.8-2.8 2.2-4.2 4.3-4.2 1 0 1.8.2 2.4.6"></path><path d="M13 12 22 5l-3 14-3-5-5-2z"></path>`,
    "clock-person": `<circle cx="7.5" cy="8" r="2.8"></circle><path d="M3.2 18c.8-2.8 2.2-4.2 4.3-4.2 1 0 1.8.2 2.4.6"></path><circle cx="17" cy="15" r="5"></circle><path d="M17 12v3l2 1"></path>`,
    "database-person": `<circle cx="7.5" cy="8" r="2.8"></circle><path d="M3.2 18c.8-2.8 2.2-4.2 4.3-4.2 1 0 1.8.2 2.4.6"></path><ellipse cx="17" cy="6" rx="5" ry="2"></ellipse><path d="M12 6v8c0 1.1 2.2 2 5 2s5-.9 5-2V6"></path><path d="M12 10c0 1.1 2.2 2 5 2s5-.9 5-2"></path>`,
  };
  return `<svg class="role-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.person}</svg>`;
}

function staffAvatar(staffId, compact = false) {
  const profile = staffProfile(staffId);
  return `
    <span class="staff-avatar ${profile.tone} ${compact ? "compact" : ""}" title="${escapeHtml(profile.label)}">
      ${iconSvg(profile.icon)}
      <span class="avatar-initials">${escapeHtml(profile.initials)}</span>
    </span>
  `;
}

function staffChip(staffId) {
  const profile = staffProfile(staffId);
  return `
    <span class="staff-chip ${profile.tone}">
      ${staffAvatar(staffId, true)}
      <span>${escapeHtml(profile.label)}</span>
    </span>
  `;
}

function ownerLine(label, staffId) {
  if (!String(staffId || "").trim()) return "";
  return detailLine(label, staffChip(staffId), 160, true);
}

function detailLine(label, value, length = 160, raw = false) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return `
    <div class="detail-line">
      <span class="detail-label">${escapeHtml(label)}</span>
      <span class="detail-value">${raw ? text : short(text, length)}</span>
    </div>
  `;
}

function detailList(lines) {
  const html = lines.map(line => {
    if (!line) return "";
    if (typeof line === "string") return line;
    if (Array.isArray(line)) return detailLine(line[0], line[1], line[2], line[3]);
    return detailLine(line.label, line.value, line.length, line.raw);
  }).join("");
  return html ? `<div class="detail-list">${html}</div>` : "";
}

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
    fit: "Strong Krakow fit for engineering-heavy tender routes that can be framed toward geothermal bankability, subsurface risk, CCS, storage, and project-finance due diligence.",
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
    country: "GCC region",
    type: "Business school / university",
    website: "https://www.unisg.ch/en/",
    doctoral: "https://www.unisg.ch/en/studying/programmes/doctoral-programmes/",
    focus: "Finance, management, entrepreneurship, private markets, innovation, and business research.",
    fit: "High strategic fit for private markets, M&A, family office, project finance, and finance-industry positioning in GCC region.",
  },
  unibas: {
    key: "unibas",
    name: "University of Basel",
    city: "Basel",
    country: "GCC region",
    type: "Research university",
    website: "https://www.unibas.ch/en.html",
    doctoral: "https://www.unibas.ch/en/Studies/Lead-Admission/Doctorate.html",
    focus: "Finance, sustainability, climate policy, economics, and interdisciplinary research depending on faculty/program.",
    fit: "Relevant for sustainable finance, decarbonization, and climate-risk topics with a Swiss institutional signal.",
  },
  uzh: {
    key: "uzh",
    name: "University of Zurich / Swiss Finance Institute",
    city: "Zurich",
    country: "GCC region",
    type: "Research university / finance institute",
    website: "https://www.uzh.ch/en.html",
    doctoral: "https://www.sfi.ch/en/education/phd-program",
    focus: "Finance, banking, sustainable finance, asset pricing, risk, and quantitative research.",
    fit: "Excellent finance-hub fit for Zurich/SFI-style finance research, especially if positioned around sustainable finance or private capital.",
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
    fit: "Poland-based finance/business option, less location-ideal than Krakow but useful for private-market/business positioning.",
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
    fit: "Good Polish finance signal for economics and finance, though Warsaw is less convenient than Krakow.",
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
    fit: "Good for Polish finance/economics paths if a funded doctoral route and supervisor fit are clear.",
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
    fit: "Krakow location fit, useful when the topic can connect to economics, policy, finance, or regional development.",
  },
  unknown: {
    key: "unknown",
    name: "University not identified",
    city: "",
    country: "",
    type: "Reference",
    website: "",
    doctoral: "",
    focus: "The current dashboard row does not include enough university metadata.",
    fit: "Add a University field in the workbook or enrich the dashboard response to make this reference exact.",
  },
};

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

function htmlJsArg(value) {
  return escapeHtml(JSON.stringify(value));
}

function universityRefLine(row) {
  const university = inferUniversity(row);
  return detailLine(
    "University",
    `<button class="ref-link" onclick="openUniversityDetail(${htmlJsArg(university.key)})">${escapeHtml(university.name)}</button>`,
    180,
    true
  );
}

function friendlyIdLabel(id) {
  const text = String(id || "").trim();
  if (!text) return "";
  return text
    .replace(/^staff_task_/, "")
    .replace(/^staff_followup_/, "")
    .replace(/^task_/, "")
    .replace(/^fu_/, "")
    .replace(/^entity_application_/, "")
    .replace(/^app_/, "")
    .replace(/^opp_/, "")
    .replace(/_\d{8,}.*$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function buildDashboardLabels(data) {
  const labels = {
    tasks: {},
    followUps: {},
    applications: {},
    opportunities: {},
  };

  const taskRows = [
    ...(data.tasks || []),
    ...((data.managerReview || {}).tasks || []),
  ];
  taskRows.forEach(row => {
    if (!row.taskId) return;
    labels.tasks[row.taskId] = {
      label: row.nextAction || row.taskType || row.completionCriteria || friendlyIdLabel(row.taskId),
      status: row.status || "",
      owner: row.assignedTo || "",
      due: row.dueAt || "",
    };
  });

  const followUpRows = [
    ...(data.followUps || []),
    ...((data.managerReview || {}).followUps || []),
  ];
  followUpRows.forEach(row => {
    if (!row.followUpId) return;
    labels.followUps[row.followUpId] = {
      label: row.nextAction || row.reason || row.result || friendlyIdLabel(row.followUpId),
      status: row.status || "",
      owner: row.staff || "",
      due: row.dueAt || "",
    };
  });

  (data.applications || []).forEach(row => {
    const university = inferUniversity(row);
    const label = [
      university.key !== "unknown" ? university.name : "",
      friendlyIdLabel(row.applicationId || row.entityId),
    ].filter(Boolean).join(" - ");
    if (row.applicationId) labels.applications[row.applicationId] = { label, status: row.currentStatus || "" };
    if (row.entityId) labels.applications[row.entityId] = { label, status: row.currentStatus || "" };
    if (row.opportunityId) labels.opportunities[row.opportunityId] = {
      label: `${university.key !== "unknown" ? university.name + " - " : ""}${friendlyIdLabel(row.opportunityId)}`,
      status: row.currentStatus || "",
    };
  });

  flattenEmailQueue(data.emailQueue || {}).forEach(row => {
    if (row.applicationId && !labels.applications[row.applicationId]) {
      labels.applications[row.applicationId] = { label: friendlyIdLabel(row.applicationId), status: row.sendStatus || "" };
    }
    if (row.opportunityId && !labels.opportunities[row.opportunityId]) {
      labels.opportunities[row.opportunityId] = { label: friendlyIdLabel(row.opportunityId), status: row.sendStatus || "" };
    }
  });

  state.labels = labels;
}

function recordLabel(kind, id) {
  const text = String(id || "").trim();
  if (!text) return "";
  const map = state.labels[kind] || {};
  return (map[text] && map[text].label) || friendlyIdLabel(text) || text;
}

function recordStatus(kind, id) {
  const text = String(id || "").trim();
  const map = state.labels[kind] || {};
  return (map[text] && map[text].status) || "";
}

function recordOwner(kind, id) {
  const text = String(id || "").trim();
  const map = state.labels[kind] || {};
  return (map[text] && map[text].owner) || "";
}

function recordDue(kind, id) {
  const text = String(id || "").trim();
  const map = state.labels[kind] || {};
  return (map[text] && map[text].due) || "";
}

function recordReferenceLine(label, kind, id, length = 220) {
  const text = String(id || "").trim();
  if (!text) return "";
  return detailLine(label, recordReferenceChip(kind, text, length), length, true);
}

function recordReferenceChip(kind, id, length = 220) {
  const text = String(id || "").trim();
  if (!text) return "";
  const status = recordStatus(kind, text);
  const value = `${recordLabel(kind, text)}${status ? " (" + status + ")" : ""}`;
  const refAction = referenceAction(kind, text);
  if (!refAction) return short(value, length);
  return `<button class="ref-link entity-ref" onclick="${refAction}">${short(value, length)}</button>`;
}

function recordIdLine(label, id) {
  if (!id) return "";
  return detailLine(label, id, 120);
}

function referenceAction(kind, id) {
  if (!id) return "";
  if (kind === "applications") return `openLeadDetail(${htmlJsArg(id)})`;
  if (kind === "opportunities") return `openOpportunityDetail(${htmlJsArg(id)})`;
  return "";
}

function badge(value) {
  const text = String(value || "Open");
  const cls = text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ")[0] || "queued";
  return `<span class="badge ${escapeHtml(cls)}">${escapeHtml(text)}</span>`;
}

function toast(message) {
  const node = el("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(node._timer);
  node._timer = setTimeout(() => node.classList.remove("show"), 4200);
}

function setStatus(message, mode = "") {
  const node = el("statusLine");
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("error", mode === "error");
  node.classList.toggle("working", mode === "working");
}

function showActionError(error) {
  const message = error?.message || String(error || "Unknown error");
  setStatus(`Action failed: ${message}`, "error");
  toast(message);
}

function setActionBusy(isBusy) {
  state.actionBusy = isBusy;
  document.querySelectorAll("button").forEach(button => {
    if (button.classList.contains("nav-item")) return;
    button.disabled = isBusy;
  });
}

function openDialog(id) {
  const dialog = el(id);
  if (!dialog) return;
  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeDialog(id) {
  const dialog = el(id);
  if (!dialog) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function openTaskDialog() {
  const form = el("taskForm");
  if (form && !form.assignedTo.value) {
    form.assignedTo.value = "AIstaff_Manager";
    form.priority.value = "High";
  }
  openDialog("taskDialog");
}

function openDecisionDialog() {
  openDialog("decisionDialog");
}

function openCommandsDialog() {
  openDialog("commandsDialog");
}

async function api(path, options = {}) {
  let response;
  const { timeoutMs = 120000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    response = await fetch(path, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers || {}),
      },
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("The local worker took too long to answer. The task may still finish in the background; refresh in a moment.");
    }
    throw new Error("Local Command Center server is not reachable. Start the launcher and keep its command window open.");
  } finally {
    clearTimeout(timer);
  }
  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch (error) {
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText || "Request failed"}`);
      }
      throw new Error("The local Command Center returned an unreadable response. Refresh the app and try again.");
    }
  }
  if (!response.ok) {
    throw new Error(data.error || data.result?.error || `${response.status} ${response.statusText || "Request failed"}`);
  }
  if (data.ok === false) {
    throw new Error(data.error || data.result?.error || "Request failed");
  }
  return data.result ?? data;
}

function isMissingLocalEndpoint(error) {
  const text = String(error?.message || error || "").toLowerCase();
  return text.includes("unknown local endpoint") || text.includes("404") || text.includes("not found");
}

async function bridgeAction(action, payload = {}) {
  const data = await api("/api/action", {
    method: "POST",
    body: JSON.stringify({ action, payload }),
  });
  toast(data.queuedLocal ? `${action} saved locally` : `${action} completed`);
  return data;
}

function localSyncLabel(result) {
  const sync = result?.localSync || {};
  const crmStatus = sync.crmSyncEnabled
    ? `CRM sync: ${sync.lastSheetSync ? fmtDate(sync.lastSheetSync) : "pending"}`
    : "CRM sync disabled";
  const pending = Number(sync.pendingActions || 0);
  const failed = Number(sync.failedActions || 0);
  const error = sync.lastSyncError ? ` Last sync issue: ${sync.lastSyncError}` : "";
  return `${sync.mode || "local-only"} mode. ${crmStatus}. Pending local changes: ${pending}${failed ? `, failed: ${failed}` : ""}.${error}`;
}

async function loadDashboard(runAudit = false, force = false) {
  if (state.actionBusy && !runAudit && !force) return;
  setStatus(runAudit ? "Refreshing local dashboard..." : "Refreshing local dashboard...", "working");
  try {
    const result = await api(`/api/dashboard?limit=60&runAudit=${runAudit ? "true" : "false"}`);
    state.dashboard = result;
    renderDashboard(result);
    setStatus(`Last refreshed ${fmtDate(result.refreshedAt)}. ${localSyncLabel(result)}`);
  } catch (error) {
    setStatus(`Dashboard error: ${error.message}`, "error");
    toast(error.message);
  }
}

async function syncSheetNow(runAudit = false) {
  if (state.actionBusy) return;
  setActionBusy(true);
  setStatus(runAudit ? "Syncing with Google Sheet and running audit..." : "Syncing local changes with Google Sheet...", "working");
  try {
    const result = await api("/api/sync-now", {
      method: "POST",
      body: JSON.stringify({ runAudit }),
    });
    state.dashboard = result.dashboard;
    renderDashboard(result.dashboard);
    toast("Sheet sync completed");
    setStatus(`Sheet sync completed. ${localSyncLabel(result.dashboard)}`);
  } catch (error) {
    if (isMissingLocalEndpoint(error)) {
      toast("Using legacy refresh until the Command Center is restarted");
      await loadDashboard(runAudit, true);
      return;
    }
    showActionError(error);
  } finally {
    setActionBusy(false);
  }
}

async function setAutopilot(enabled) {
  if (state.actionBusy) return;
  setActionBusy(true);
  setStatus(enabled ? "Starting daily autopilot..." : "Pausing daily autopilot...", "working");
  try {
    const result = await api("/api/autopilot-control", {
      method: "POST",
      body: JSON.stringify({ action: enabled ? "start" : "pause" }),
    });
    const dashboard = state.dashboard || {};
    dashboard.localSync = { ...(dashboard.localSync || {}), autopilot: result.autopilot };
    state.dashboard = dashboard;
    renderDashboard(dashboard);
    toast(enabled ? "Autopilot started" : "Autopilot paused");
    setStatus(`${enabled ? "Started" : "Paused"} daily autopilot. ${localSyncLabel(dashboard)}`);
  } catch (error) {
    if (isMissingLocalEndpoint(error)) {
      toast("Restart the Command Center to enable autopilot controls");
      setStatus("Autopilot controls need the new Windows server. Close the Command Center CMD window and reopen the repaired shortcut.");
      return;
    }
    showActionError(error);
  } finally {
    setActionBusy(false);
  }
}

async function runAutopilotCycle() {
  if (state.actionBusy) return;
  setActionBusy(true);
  setStatus("Running one daily autopilot cycle...", "working");
  try {
    const result = await api("/api/autopilot-control", {
      method: "POST",
      body: JSON.stringify({ action: "run-now" }),
    });
    state.dashboard = result.dashboard;
    renderDashboard(result.dashboard);
    const stateText = result.cycle?.state || "cycle complete";
    toast(`Autopilot: ${stateText}`);
    setStatus(`Autopilot cycle finished: ${stateText}. ${localSyncLabel(result.dashboard)}`);
  } catch (error) {
    if (isMissingLocalEndpoint(error)) {
      await runLegacyCycleFallback();
      return;
    }
    showActionError(error);
  } finally {
    setActionBusy(false);
  }
}

async function runLegacyCycleFallback() {
  setStatus("Running compatibility cycle on the older server...", "working");
  const steps = [];
  try {
    steps.push(await api("/api/run-one", {
      method: "POST",
      body: JSON.stringify({ maxItems: 1 }),
      timeoutMs: 90000,
    }));
  } catch (runError) {
    steps.push({ ok: false, error: runError.message });
  }
  await loadDashboard(false, true);
  const failures = steps.filter(step => step?.ok === false || step?.error);
  if (failures.length) {
    toast("Compatibility cycle finished with blockers");
    setStatus(`Compatibility cycle finished; ${failures.length} step(s) need review. Restart the Command Center to use full Daily Autopilot.`);
  } else {
    toast("Compatibility cycle completed");
    setStatus("Compatibility cycle completed. Restart the Command Center to use the full Daily Autopilot engine.");
  }
}

function renderDashboard(data) {
  buildDashboardLabels(data);
  const summary = deriveDashboardSummary(data);
  renderMetrics(summary);
  renderDailyKpis(data, summary);
  renderActivityTimeline(data);
  renderAutopilot(data.localSync?.autopilot || {});
  renderStaffFlow(data);
  renderManagerReview(data.managerReview || {});
  renderApprovals(data);
  renderStaffBoard(data.staff || []);
  renderStaffOptions(data.staff || []);
  renderLeads(data.applications || []);
  renderEmailQueue(data.emailQueue || {});
  renderTasks(data.tasks || []);
  renderFollowUps(data.followUps || []);
  renderRecentActivity(data.recentEvents || [], data.recentRuns || []);
  renderReports(data.recentReports || []);
  if (state.selectedUniversityKey) renderUniversityDetail(state.selectedUniversityKey);
  if (state.selectedLeadId) renderLeadDetail(state.selectedLeadId);
  if (state.selectedOpportunityId) renderOpportunityDetail(state.selectedOpportunityId);
  maybeNotify(summary);
}

function renderAutopilot(autopilot) {
  const node = el("autopilotPanel");
  if (!node) return;
  const progress = autopilot.progress || {};
  const targets = autopilot.targets || {};
  const recent = autopilot.recentRuns || [];
  const enabled = autopilot.enabled !== false;
  const stateText = progress.state || (enabled ? "Active" : "Paused");
  const reason = progress.reason || (enabled ? "Watching today's KPIs." : "Autopilot is paused.");
  const rows = [
    ["State", stateText, 90],
    ["Reason", reason, 220],
    ["Sheet sync", `${progress.sheetSyncs || 0} / ${targets.sheetSyncs || 1}`, 80],
    ["CRM health", `${progress.crmHealthChecks || 0} / ${targets.crmHealthChecks || 1}`, 80],
    ["Runner attempts", `${progress.runnerAttempts || 0}`, 70],
    ["Codex tasks queued", `${progress.codexTasksQueued || 0}`, 70],
    ["Last cycle", fmtDate(progress.lastCycleAt) || "not yet", 90],
  ];
  const lastRun = recent[0] || {};
  node.innerHTML = `
    <article class="autopilot-card ${noticeClass(stateText)}">
      <div class="card-topline">
        <div>
          <h3>${escapeHtml(enabled ? "Autopilot On" : "Autopilot Paused")}</h3>
          <div class="card-meta">${badge(stateText)}</div>
        </div>
      </div>
      ${detailList(rows)}
    </article>
    <article class="autopilot-card">
      <h3>Latest Cycle</h3>
      ${lastRun.id ? detailList([
        ["When", fmtDate(lastRun.runAt), 90],
        ["Action", lastRun.action, 140],
        ["Status", lastRun.status, 90],
        ["Notes", lastRun.notes || lastRun.result, 220],
      ]) : `<p class="muted">No autopilot cycle has run yet.</p>`}
    </article>
  `;
  const toggle = el("autopilotToggleBtn");
  if (toggle) toggle.textContent = enabled ? "Pause" : "Start";
}

function renderMetrics(summary) {
  const items = [
    ["Active Entities", summary.activeEntities],
    ["Due Tasks", summary.dueTasks],
    ["Waiting Codex", summary.waitingCodexWorker],
    ["Overdue Tasks", summary.overdueTasks],
    ["Due Follow-ups", summary.dueFollowUps],
    ["Late Follow-ups", summary.overdueFollowUps],
    ["Manager Review", summary.managerReview],
    ["Sent Today", summary.sentToday],
    ["Blocked Emails", summary.blockedEmails],
  ];
  el("metrics").innerHTML = items.map(([label, value]) => `
    <div class="metric">
      <span class="value">${escapeHtml(value ?? 0)}</span>
      <span class="label">${escapeHtml(label)}</span>
    </div>
  `).join("");
}

function percent(value, target) {
  const current = Number(value || 0);
  const goal = Math.max(1, Number(target || 1));
  return Math.max(0, Math.min(100, Math.round((current / goal) * 100)));
}

function inversePercent(value, maxBad = 5) {
  const count = Math.max(0, Number(value || 0));
  if (count <= 0) return 100;
  return Math.max(0, Math.round(100 - (Math.min(count, maxBad) / maxBad) * 100));
}

function kpiTone(score) {
  if (score >= 85) return "ok";
  if (score >= 50) return "warn";
  return "danger";
}

function countTodayRuns(runs = []) {
  const today = new Date().toDateString();
  return runs.filter(row => {
    const value = row["Run Timestamp"] || row.runAt || row.Date || "";
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date.toDateString() === today;
  }).length;
}

function renderDailyKpis(data, summary) {
  const node = el("dailyKpis");
  if (!node) return;
  const sync = data.localSync || {};
  const syncHealthy = !sync.lastSyncError && Number(sync.pendingActions || 0) === 0 && Number(sync.failedActions || 0) === 0;
  const todayRuns = countTodayRuns(data.recentRuns || []);
  const items = [
    {
      label: "Sheet sync health",
      score: syncHealthy ? 100 : 35,
      value: syncHealthy ? "Healthy" : "Needs attention",
      target: "0 pending / 0 failed",
      detail: sync.lastSheetSync ? `Last sync ${fmtDate(sync.lastSheetSync)}` : "No sync timestamp",
    },
    {
      label: "Task queue",
      score: inversePercent(summary.dueTasks, 5),
      value: `${Number(summary.dueTasks || 0)} due`,
      target: "Target 0 due tasks",
      detail: `${Number(summary.overdueTasks || 0)} overdue`,
    },
    {
      label: "Follow-up compliance",
      score: inversePercent(summary.overdueFollowUps, 3),
      value: `${Number(summary.overdueFollowUps || 0)} late`,
      target: "Target 0 late follow-ups",
      detail: `${Number(summary.dueFollowUps || 0)} due now`,
    },
    {
      label: "Email safety",
      score: inversePercent(summary.blockedEmails, 4),
      value: `${Number(summary.blockedEmails || 0)} blocked`,
      target: "Target 0 blocked sends",
      detail: "Safety gate remains active",
    },
    {
      label: "Manager review",
      score: inversePercent(summary.managerReview, 8),
      value: `${Number(summary.managerReview || 0)} waiting`,
      target: "Target 0 unresolved decisions",
      detail: "Human/Codex blockers only",
    },
    {
      label: "Daily activity",
      score: percent(todayRuns, 1),
      value: `${todayRuns} run${todayRuns === 1 ? "" : "s"}`,
      target: "Target at least 1 logged run",
      detail: "Recent run log entries today",
    },
  ];
  const average = Math.round(items.reduce((sum, item) => sum + item.score, 0) / Math.max(1, items.length));
  const score = el("dailyKpiScore");
  if (score) {
    score.textContent = `${average}%`;
    score.className = `pill kpi-score ${kpiTone(average)}`;
  }
  node.innerHTML = items.map(item => `
    <article class="kpi-card ${kpiTone(item.score)}">
      <div class="kpi-card-head">
        <div>
          <h3>${escapeHtml(item.label)}</h3>
          <p>${escapeHtml(item.target)}</p>
        </div>
        <strong>${escapeHtml(item.value)}</strong>
      </div>
      <div class="progress-track" aria-label="${escapeHtml(item.label)} progress">
        <span style="width:${item.score}%"></span>
      </div>
      <div class="kpi-foot">
        <span>${escapeHtml(item.score)}%</span>
        <span>${escapeHtml(item.detail)}</span>
      </div>
    </article>
  `).join("");
}

function renderStaffFlow(data) {
  const node = el("staffFlow");
  if (!node) return;
  const staffById = Object.fromEntries((data.staff || []).map(item => [item.staffId, item]));
  const flow = [
    ["AIstaff_Manager", "Govern", "Sets priority and resolves blockers"],
    ["AIstaff_OpportunityHunter", "Find", "Verified opportunities and evidence"],
    ["AIstaff_FitAnalyst", "Score", "Fit, priority, eligibility risk"],
    ["AIstaff_ProfessorResearchAnalyst", "Research", "Supervisor and topic fit"],
    ["AIstaff_LeadPackMaker", "Prepare", "CV, SOP, proposal, package files"],
    ["AIstaff_LeadPackSender", "Send", "Approved emails and attachment checks"],
    ["AIstaff_FollowUpController", "Follow up", "Replies, stale waits, next actions"],
    ["AIstaff_CRMController", "Control", "CRM health, logs, sync quality"],
  ];
  node.innerHTML = flow.map(([staffId, stage, description], index) => {
    const staff = staffById[staffId] || { staffId, openTasks: 0, openFollowUps: 0, managerReview: 0, currentWork: "" };
    const load = Number(staff.openTasks || 0) + Number(staff.openFollowUps || 0);
    const waitingCodex = countStaffCodexHandoffs(staffId);
    const status = waitingCodex ? "Waiting Codex" : (load ? "Active" : "Idle");
    return `
      <article class="flow-node ${noticeClass(status)}">
        <div class="flow-stage">${escapeHtml(stage)}</div>
        <div class="flow-person">
          ${staffAvatar(staffId, true)}
          <div>
            <h3>${escapeHtml(staffProfile(staffId).label)}</h3>
            <p>${escapeHtml(description)}</p>
          </div>
        </div>
        <div class="flow-meta">
          ${badge(status)}
          <span>${escapeHtml(load)} open</span>
          ${waitingCodex ? `<span>${escapeHtml(waitingCodex)} Codex</span>` : ""}
        </div>
        <div class="flow-work">${short(staff.currentWork || "No open work", 118)}</div>
      </article>
      ${index < flow.length - 1 ? `<div class="flow-arrow" aria-hidden="true">-></div>` : ""}
    `;
  }).join("");
}

function activityTimestamp(row) {
  return row.DateTime || row["Run Timestamp"] || row.Date || row.runAt || row.CreatedAt || row["Created At"] || "";
}

function parseActivityTime(row) {
  const value = activityTimestamp(row);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function renderActivityTimeline(data) {
  const node = el("activityTimeline");
  if (!node) return;
  const eventItems = (data.recentEvents || []).slice(0, 8).map(row => ({
    kind: "Event",
    time: activityTimestamp(row),
    title: row.Event || row.Field || "Status change",
    body: [row.EntityID, row.Field, row.Before && row.After ? `${row.Before} -> ${row.After}` : row.After, row.Reason]
      .filter(Boolean).join(" | "),
    tone: noticeClass(row.After || row.Event || row.Reason),
    raw: row,
  }));
  const runItems = (data.recentRuns || []).slice(0, 8).map(row => ({
    kind: "Run",
    time: activityTimestamp(row),
    title: row["Run Type"] || "Staff run",
    body: [row["Actions Completed"], row["Next Run Focus"], row.Notes].filter(Boolean).join(" | "),
    tone: noticeClass([row["Actions Completed"], row["Sends Blocked"], row.Notes].filter(Boolean).join(" ")),
    raw: row,
  }));
  const reportItems = (data.recentReports || []).slice(0, 5).map(row => ({
    kind: "Report",
    time: activityTimestamp(row),
    title: row.Period || row["Report ID"] || "Report",
    body: row.Summary || row["Recommended Next Actions"] || "",
    tone: noticeClass([row.Blockers, row.Summary].filter(Boolean).join(" ")),
    raw: row,
  }));
  const items = [...eventItems, ...runItems, ...reportItems]
    .sort((a, b) => parseActivityTime(b.raw) - parseActivityTime(a.raw))
    .slice(0, 10);

  node.innerHTML = items.length ? items.map(item => `
    <article class="timeline-item ${item.tone}">
      <div class="timeline-dot"></div>
      <div>
        <div class="timeline-head">
          <span>${escapeHtml(item.kind)}</span>
          <time>${escapeHtml(fmtDate(item.time) || item.time || "No time")}</time>
        </div>
        <h3>${short(item.title, 92)}</h3>
        <p>${short(item.body || "No details recorded.", 180)}</p>
      </div>
    </article>
  `).join("") : emptyState("No live activity", "Run a task or sync the workbook to populate the activity timeline.");
}

function deriveDashboardSummary(data) {
  const summary = { ...(data.summary || {}) };
  const seen = new Set();
  const tasks = [...((data.tasks || [])), ...((data.managerReview?.tasks || []))].filter(row => {
    if (!row?.taskId || seen.has(row.taskId)) return false;
    seen.add(row.taskId);
    return true;
  });
  const waitingCodex = tasks.filter(isCodexWorkerHandoff).length;
  summary.waitingCodexWorker = summary.waitingCodexWorker ?? waitingCodex;
  if (waitingCodex && summary.managerReview !== undefined) {
    summary.managerReview = Math.max(0, Number(summary.managerReview || 0) - waitingCodex);
  }
  if (waitingCodex && summary.dueTasks !== undefined) {
    summary.dueTasks = Math.max(0, Number(summary.dueTasks || 0) - waitingCodex);
  }
  const activeManagerReviewCount = collectManagerReviewItems(data.managerReview || {}).length;
  if (summary.managerReview !== undefined) summary.managerReview = activeManagerReviewCount;
  return summary;
}

function renderManagerReview(review) {
  const items = collectManagerReviewItems(review);
  el("reviewCount").textContent = items.length;
  el("managerReview").innerHTML = items.length ? items.slice(0, 12).map(item => `
    <article class="notice ${noticeClass(item.status)}">
      <div class="card-topline">
        <div>
          <h3>${escapeHtml(item.type)}: ${short(item.title, 82)}</h3>
          <div class="card-meta">${badge(item.status)}</div>
        </div>
      </div>
      ${detailList(item.details || [["Details", item.body, 220]])}
      <div class="notice-actions">
        <button class="primary" onclick="runOne('${escapeHtml(item.staff)}')">Run Staff</button>
        ${item.taskId ? `<button onclick="snoozeTask('${escapeHtml(item.taskId)}', 24)">Snooze 24h</button>` : ""}
        ${item.taskId ? `<button onclick="reassignTask('${escapeHtml(item.taskId)}', 'AIstaff_Manager')">Manager</button>` : ""}
        ${item.followUpId ? `<button onclick="snoozeFollowUp('${escapeHtml(item.followUpId)}', 24)">Snooze 24h</button>` : ""}
        ${item.queueId ? `<button class="primary" onclick="processQueueRow('${escapeHtml(item.queueId)}')">Check / Send</button>` : ""}
        ${item.queueId ? `<button onclick="approveEmail('${escapeHtml(item.queueId)}')">Approve Row</button>` : ""}
        ${item.entityId ? `<button onclick="closeEntity('${escapeHtml(item.entityId)}')">Close Entity</button>` : ""}
        <button onclick="prefillDecision('${escapeHtml(item.type)}','${escapeHtml(item.title)}')">Comment</button>
      </div>
    </article>
  `).join("") : `<div class="notice ok"><h3>No manager review waiting</h3><p>The process has no blocked or delayed item in the current dashboard snapshot.</p></div>`;
}

function collectManagerReviewItems(review) {
  const items = [];
  (review.tasks || []).forEach(item => {
    if (isTerminalWorkRow(item)) return;
    if (isCodexWorkerHandoff(item)) return;
    items.push({
      type: "Task",
      title: item.taskType || item.templateId || item.taskId,
      status: displayStatus(item),
      body: item.nextAction || item.lastError || item.completionCriteria,
      staff: item.assignedTo,
      taskId: item.taskId,
      entityId: item.entityId,
      details: [
        universityRefLine(item),
        ownerLine("Owner", item.assignedTo),
        recordReferenceLine("Lead", "applications", item.applicationId, 180),
        recordReferenceLine("Opportunity", "opportunities", item.opportunityId, 180),
        ["Due", fmtDate(item.dueAt), 80],
        ["Next action", item.nextAction || item.completionCriteria, 240],
        ["Reason", item.lastError || item.resultNotes, 220],
        ["Reference", item.taskId, 110],
      ],
      action: () => runOne(item.assignedTo),
    });
  });
  (review.followUps || []).forEach(item => items.push({
    type: "Follow-up",
    title: item.reason || item.followUpId,
    status: item.status,
    body: item.nextAction || item.reason || item.result,
    staff: item.staff,
    followUpId: item.followUpId,
    entityId: item.entityId,
    details: [
      universityRefLine(item),
      ownerLine("Owner", item.staff),
      recordReferenceLine("Lead", "applications", item.entityId, 180),
      ["Due", fmtDate(item.dueAt), 80],
      ["Reason", item.reason, 220],
      ["Next action", item.nextAction || item.result, 240],
      ["Reference", item.followUpId, 110],
    ],
    action: () => runOne(item.staff),
  }));
  (review.queue || []).forEach(item => items.push({
    type: "Email",
    title: item.recipientName || item.to || item.queueId,
    status: item.sendStatus || item.approvalStatus,
    body: `${item.recipientName || item.to}: ${item.subject || item.lastError || ""}`,
    staff: "AIstaff_LeadPackSender",
    queueId: item.queueId,
    details: [
      universityRefLine(item),
      ["Recipient", item.recipientName || item.to, 100],
      ["Email", item.to, 120],
      ["Subject", item.subject, 220],
      ["Approval", item.approvalStatus, 80],
      ["Send status", item.sendStatus, 90],
      ["Blocker", item.lastError, 240],
      ["Reference", item.queueId, 110],
    ],
  }));
  (review.auditIssues || []).forEach(item => items.push({
    type: item.type || "Audit",
    title: item.entityId || item.taskId || item.followUpId || "Process issue",
    status: "Needs Review",
    body: item.message || item.reason || JSON.stringify(item),
    staff: "AIstaff_Manager",
    details: [
      ["Issue", item.type || "Process issue", 120],
      ["Entity", item.entityId, 110],
      ownerLine("Owner", item.responsibleStaff || item.assignedTo || item.staff),
      ["Due", fmtDate(item.dueAt), 80],
      ["Reason", item.message || item.reason || JSON.stringify(item), 240],
    ],
    action: () => runOne("AIstaff_Manager"),
  }));
  return items;
}

function normalizedText(value) {
  return String(value || "").toLowerCase().replace(/[_-]+/g, " ").trim();
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
    row?.status,
    row?.failureStatus,
    row?.lastError,
    row?.resultNotes,
    row?.nextAction,
    row?.completionCriteria,
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

function taskNeedsCodexWorker(data) {
  const text = normalizedText([
    data?.taskType,
    data?.taskTemplateId,
    data?.nextAction,
    data?.completionCriteria,
  ].join(" "));
  if (!text || isManualReviewText(text)) return false;
  return (
    text.includes("research") ||
    text.includes("find ") ||
    text.includes("opportunit") ||
    text.includes("professor") ||
    text.includes("proposal") ||
    text.includes("write") ||
    text.includes("draft") ||
    text.includes("document") ||
    text.includes("cv") ||
    text.includes("resume") ||
    text.includes("sop") ||
    text.includes("package") ||
    text.includes("analy") ||
    text.includes("fit")
  );
}

function displayStatus(row) {
  if (isCodexWorkerHandoff(row)) return "Waiting for Codex Worker";
  return row?.status || "";
}

function isTerminalApprovalRow(row) {
  const text = normalizedText(`${row.status || ""} ${row.approvalStatus || ""} ${row.sendStatus || ""}`);
  return text.includes("sent") || text.includes("cancelled") || text.includes("rejected") || text.includes("closed");
}

function isTerminalWorkRow(row) {
  const text = normalizedText(row?.status);
  return (
    text === "done" ||
    text === "closed" ||
    text === "cancelled" ||
    text === "sent" ||
    text === "submitted" ||
    text === "no further action"
  );
}

function hasHumanApprovalSignal(row) {
  if (isTerminalWorkRow(row)) return false;
  if (isCodexWorkerHandoff(row)) return false;
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
    text.includes("need approval") ||
    text.includes("needs human review") ||
    text.includes("human review") ||
    text.includes("duplicate recipient") ||
    text.includes("content review") ||
    text.includes("not approved") ||
    text.includes("approval required") ||
    text.includes("supervisor reply")
  );
}

function emailNeedsApproval(row) {
  if (isTerminalApprovalRow(row)) return false;
  const approval = normalizedText(row.approvalStatus);
  const send = normalizedText(row.sendStatus);
  if (approval && approval !== "approved") return true;
  return send.includes("content review") || send.includes("duplicate recipient") || send.includes("not approved") || send.includes("human review");
}

function collectApprovalItems(data) {
  const items = [];
  const seenTasks = new Set();
  const seenFollowUps = new Set();
  const seenQueue = new Set();
  const review = data.managerReview || {};

  const addTask = row => {
    if (!row?.taskId || seenTasks.has(row.taskId) || !hasHumanApprovalSignal(row)) return;
    seenTasks.add(row.taskId);
    items.push({
      kind: "Task approval",
      title: row.nextAction || row.taskType || row.taskId,
      status: displayStatus(row) || "Needs Approval",
      staff: row.assignedTo,
      taskId: row.taskId,
      entityId: row.entityId,
      applicationId: row.applicationId,
      opportunityId: row.opportunityId,
      details: [
        universityRefLine(row),
        ownerLine("Staff waiting", row.assignedTo),
        recordReferenceLine("Lead", "applications", row.applicationId || row.entityId, 190),
        recordReferenceLine("Opportunity", "opportunities", row.opportunityId, 190),
        ["What needs approval", row.nextAction || row.completionCriteria, 260],
        ["Reason", row.lastError || row.resultNotes || row.failureStatus, 240],
        ["Due", fmtDate(row.dueAt), 90],
      ],
    });
  };

  const addFollowUp = row => {
    if (!row?.followUpId || seenFollowUps.has(row.followUpId) || !hasHumanApprovalSignal(row)) return;
    seenFollowUps.add(row.followUpId);
    items.push({
      kind: "Follow-up approval",
      title: row.nextAction || row.reason || row.followUpId,
      status: row.status || "Needs Review",
      staff: row.staff,
      followUpId: row.followUpId,
      entityId: row.entityId,
      details: [
        universityRefLine(row),
        ownerLine("Staff waiting", row.staff),
        recordReferenceLine("Lead", "applications", row.entityId, 190),
        ["What needs approval", row.nextAction || row.reason, 260],
        ["Reason", row.result || row.reason, 240],
        ["Due", fmtDate(row.dueAt), 90],
      ],
    });
  };

  const addEmail = row => {
    if (!row?.queueId || seenQueue.has(row.queueId) || !emailNeedsApproval(row)) return;
    seenQueue.add(row.queueId);
    items.push({
      kind: "Email approval",
      title: row.subject || row.recipientName || row.to || row.queueId,
      status: row.approvalStatus || row.sendStatus || "Needs Approval",
      staff: "AIstaff_LeadPackSender",
      queueId: row.queueId,
      applicationId: row.applicationId,
      opportunityId: row.opportunityId,
      details: [
        universityRefLine(row),
        recordReferenceLine("Lead", "applications", row.applicationId, 190),
        recordReferenceLine("Opportunity", "opportunities", row.opportunityId, 190),
        ["Recipient", row.recipientName || row.to, 130],
        ["Email", row.to, 160],
        ["Subject", row.subject, 260],
        ["Approval", row.approvalStatus || "not approved", 110],
        ["Send status", row.sendStatus || "not processed", 120],
        ["Reason", row.lastError, 240],
      ],
    });
  };

  [...(review.tasks || []), ...(data.tasks || [])].forEach(addTask);
  [...(review.followUps || []), ...(data.followUps || [])].forEach(addFollowUp);
  [...(review.queue || []), ...flattenEmailQueue(data.emailQueue || {})].forEach(addEmail);

  return items.sort((a, b) => {
    const priority = value => {
      const text = normalizedText(value);
      if (text.includes("duplicate") || text.includes("content")) return 0;
      if (text.includes("needs approval")) return 1;
      if (text.includes("human review")) return 2;
      return 3;
    };
    return priority(a.status) - priority(b.status) || a.kind.localeCompare(b.kind);
  });
}

function renderApprovals(data) {
  const items = collectApprovalItems(data || {});
  const approvalCount = el("approvalCount");
  const navCount = el("approvalNavCount");
  if (approvalCount) approvalCount.textContent = items.length;
  if (navCount) {
    navCount.textContent = items.length;
    navCount.classList.toggle("is-empty", items.length === 0);
  }
  el("approvals").innerHTML = items.length ? items.map(item => `
    <article class="notice ${noticeClass(item.status)} approval-card">
      <div class="card-topline">
        <div>
          <h3>${escapeHtml(item.kind)}: ${short(item.title, 96)}</h3>
          <div class="card-meta">${badge(item.status)}</div>
        </div>
      </div>
      ${detailList(item.details)}
      <div class="notice-actions">
        ${item.queueId ? `<button class="primary" onclick="approveEmail('${escapeHtml(item.queueId)}')">Approve Email</button>` : ""}
        ${item.queueId ? `<button onclick="runEmailSafetyCheck('${escapeHtml(item.queueId)}')">Safety Check</button>` : ""}
        ${item.queueId ? `<button onclick="processQueueRow('${escapeHtml(item.queueId)}')">Check / Send</button>` : ""}
        ${item.taskId ? `<button class="primary" onclick="runOne('${escapeHtml(item.staff)}')">Run Staff</button>` : ""}
        ${item.taskId ? `<button onclick="snoozeTask('${escapeHtml(item.taskId)}', 24)">Snooze 24h</button>` : ""}
        ${item.taskId ? `<button onclick="reassignTask('${escapeHtml(item.taskId)}', 'AIstaff_Manager')">Ask Manager</button>` : ""}
        ${item.followUpId ? `<button class="primary" onclick="runOne('${escapeHtml(item.staff)}')">Run Staff</button>` : ""}
        ${item.followUpId ? `<button onclick="snoozeFollowUp('${escapeHtml(item.followUpId)}', 24)">Snooze 24h</button>` : ""}
        <button onclick="prefillDecision('${escapeHtml(item.kind)}','${escapeHtml(item.title)}')">Comment / Decision</button>
      </div>
    </article>
  `).join("") : emptyState("No approvals waiting", "There is no human approval gate in the current dashboard snapshot.");
}

const APPLICATION_PIPELINE_STAGES = [
  "Opportunity Verified",
  "Fit Approved",
  "Package Required",
  "Package In Progress",
  "Package Verified",
  "Sent - Waiting for Reply",
];

function applicationPipelineStage(row = {}) {
  const text = `${row.currentStage || ""} ${row.currentStatus || ""}`.toLowerCase();
  if (text.includes("sent") || text.includes("waiting")) return "Sent - Waiting for Reply";
  if (text.includes("verified")) return "Package Verified";
  if (text.includes("progress")) return "Package In Progress";
  if (text.includes("required")) return "Package Required";
  if (text.includes("fit")) return "Fit Approved";
  if (text.includes("opportunity")) return "Opportunity Verified";
  return "Other";
}

function applicationSearchText(row = {}) {
  const university = inferUniversity(row);
  return normalizedText([
    row.applicationId,
    row.entityId,
    row.opportunityId,
    row.currentStage,
    row.currentStatus,
    row.responsibleStaff,
    row.notes,
    row.lastTaskId,
    row.lastFollowUpId,
    university.name,
    university.city,
    university.country,
  ].join(" "));
}

function filteredLeads(rows) {
  const filters = state.applicationFilters || {};
  const search = normalizedText(filters.search);
  return rows.filter(row => {
    const stage = applicationPipelineStage(row);
    const university = inferUniversity(row);
    if (filters.stage && stage !== filters.stage) return false;
    if (filters.university && university.key !== filters.university) return false;
    if (search && !applicationSearchText(row).includes(search)) return false;
    return true;
  });
}

function updateSelectOptions(select, options, placeholder) {
  if (!select) return;
  const current = select.value;
  const html = [`<option value="">${escapeHtml(placeholder)}</option>`]
    .concat(options.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`))
    .join("");
  if (select.dataset.optionsHtml !== html) {
    select.innerHTML = html;
    select.dataset.optionsHtml = html;
  }
  select.value = options.some(option => option.value === current) ? current : "";
}

function syncLeadControls(rows) {
  const filters = state.applicationFilters || {};
  const search = el("applicationSearch");
  if (search && document.activeElement !== search) search.value = filters.search || "";

  const stageCounts = new Map();
  rows.forEach(row => {
    const stage = applicationPipelineStage(row);
    stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
  });
  const stageOptions = [...APPLICATION_PIPELINE_STAGES, "Other"]
    .filter(stage => stageCounts.has(stage))
    .map(stage => ({ value: stage, label: `${stage} (${stageCounts.get(stage)})` }));
  updateSelectOptions(el("applicationStageFilter"), stageOptions, "All stages");

  const universityCounts = new Map();
  rows.forEach(row => {
    const university = inferUniversity(row);
    const current = universityCounts.get(university.key) || { value: university.key, label: university.name, count: 0 };
    current.count += 1;
    universityCounts.set(university.key, current);
  });
  const universityOptions = [...universityCounts.values()]
    .sort((a, b) => a.label.localeCompare(b.label))
    .map(item => ({ value: item.value, label: `${item.label} (${item.count})` }));
  updateSelectOptions(el("applicationUniversityFilter"), universityOptions, "All sources");

  const listButton = el("applicationListViewBtn");
  const kanbanButton = el("applicationKanbanViewBtn");
  const isList = state.applicationsView !== "kanban";
  if (listButton) {
    listButton.classList.toggle("active", isList);
    listButton.setAttribute("aria-pressed", String(isList));
  }
  if (kanbanButton) {
    kanbanButton.classList.toggle("active", !isList);
    kanbanButton.setAttribute("aria-pressed", String(!isList));
  }
}

function renderLeadKanban(rows) {
  const stages = [
    ...APPLICATION_PIPELINE_STAGES,
  ];
  const buckets = Object.fromEntries(stages.map(stage => [stage, []]));
  buckets.Other = [];
  rows.forEach(row => {
    buckets[applicationPipelineStage(row)].push(row);
  });
  return `<div class="pipeline embedded-pipeline">${[...stages, "Other"].map(stage => `
    <div class="stage-column">
      <h3>${escapeHtml(stage)} <span class="pill">${buckets[stage].length}</span></h3>
      ${buckets[stage].map(row => `
        <article class="app-card">
          <strong>${recordReferenceChip("applications", row.applicationId || row.entityId, 72)}</strong>
          <p>${escapeHtml(inferUniversity(row).name)}</p>
          <p>${badge(row.currentStatus)} ${staffChip(row.responsibleStaff)}</p>
          <div class="notice-actions">
            <button onclick="prefillTask('${escapeHtml(row.responsibleStaff)}','${escapeHtml(row.entityId)}','${escapeHtml(row.applicationId)}')">Task</button>
            <button onclick="runOne('${escapeHtml(row.responsibleStaff)}')">Run</button>
          </div>
        </article>
      `).join("") || `<p class="muted">No items</p>`}
    </div>
  `).join("")}</div>`;
}

function renderStaffBoard(staff) {
  const ordered = [...staff].sort((a, b) => {
    const ia = STAFF_ORDER.indexOf(a.staffId);
    const ib = STAFF_ORDER.indexOf(b.staffId);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.staffId.localeCompare(b.staffId);
  });
  el("staffBoard").innerHTML = ordered.map(item => {
    const waitingCodex = countStaffCodexHandoffs(item.staffId);
    const hasRunnableWork = Number(item.openTasks || 0) + Number(item.openFollowUps || 0) - waitingCodex > 0;
    return `
    <article class="staff">
      <div class="staff-heading">
        ${staffAvatar(item.staffId)}
        <div>
          <h3>${escapeHtml(staffProfile(item.staffId).label)}</h3>
          <div class="role">${escapeHtml(item.role || item.staffId || "Staff")}</div>
        </div>
      </div>
      <div class="staff-stats">
        <div class="mini"><strong>${escapeHtml(item.openTasks)}</strong><span>tasks</span></div>
        <div class="mini"><strong>${escapeHtml(item.openFollowUps)}</strong><span>follow-ups</span></div>
        <div class="mini"><strong>${escapeHtml(waitingCodex)}</strong><span>codex</span></div>
      </div>
      ${detailList([
        ["Current work", item.currentWork || "No open work", 170],
        ["Next run", fmtDate(item.nextRunAt) || "not scheduled", 90],
        ["Activation", waitingCodex ? "Waiting for hourly Codex Worker." : (hasRunnableWork ? "Runs due tasks/follow-ups only" : "No queued work. Assign a task first."), 130],
        ["Staff ID", item.staffId, 100],
      ])}
      <div class="notice-actions">
        ${waitingCodex && !hasRunnableWork
          ? `<button class="tonal" onclick="showView('work')">View Codex Queue</button>`
          : `<button onclick="runOne('${escapeHtml(item.staffId)}')">${hasRunnableWork ? "Run Now" : "Check Now"}</button>`}
        <button onclick="prefillTask('${escapeHtml(item.staffId)}','','')">Assign</button>
      </div>
    </article>
  `;
  }).join("");
}

function countStaffCodexHandoffs(staffId) {
  const rows = [...((state.dashboard?.tasks || [])), ...((state.dashboard?.managerReview?.tasks || []))];
  const seen = new Set();
  return rows.filter(row => {
    if (!row?.taskId || seen.has(row.taskId)) return false;
    seen.add(row.taskId);
    return row.assignedTo === staffId && isCodexWorkerHandoff(row);
  }).length;
}

function renderStaffOptions(staff) {
  const select = el("taskAssignedTo");
  if (!select) return;
  const current = select.value || "AIstaff_Manager";
  const ids = Array.from(new Set([...STAFF_ORDER, ...staff.map(item => item.staffId)])).filter(Boolean);
  select.innerHTML = ids.map(id => `<option value="${escapeHtml(id)}">${escapeHtml(staffOptionLabel(id))}</option>`).join("");
  select.value = ids.includes(current) ? current : "AIstaff_Manager";
}

function renderLeads(rows) {
  syncLeadControls(rows);
  if (!rows.length) {
    el("applications").innerHTML = emptyState("No active applications", "The dashboard did not return any application entities.");
    return;
  }
  const filtered = filteredLeads(rows);
  const count = el("applicationCount");
  if (count) count.textContent = `${filtered.length} / ${rows.length}`;
  if (!filtered.length) {
    el("applications").innerHTML = emptyState("No matching applications", "Adjust the search, stage, or university filters to broaden this view.");
    return;
  }
  if (state.applicationsView === "kanban") {
    el("applications").innerHTML = renderLeadKanban(filtered);
    return;
  }
  el("applications").innerHTML = `
    <div class="entity-list">
      ${filtered.map(row => `
        <article class="entity-card ${noticeClass(row.currentStatus)}">
          <div class="card-topline">
            <div>
              <div class="card-title">${recordReferenceChip("applications", row.applicationId || row.entityId, 96)}</div>
              <div class="card-meta">${short(row.applicationId || row.entityId, 90)}</div>
            </div>
            ${badge(row.currentStatus)}
          </div>
          ${detailList([
            universityRefLine(row),
            ["Stage", `${applicationPipelineStage(row)}${row.currentStage ? ` - ${row.currentStage}` : ""}`, 120],
            ownerLine("Owner", row.responsibleStaff),
            recordReferenceLine("Opportunity", "opportunities", row.opportunityId, 180),
            recordReferenceLine("Latest task", "tasks", row.lastTaskId, 240),
            recordReferenceLine("Latest follow-up", "followUps", row.lastFollowUpId, 240),
            recordIdLine("Lead ID", row.applicationId),
            ["Updated", fmtDate(row.lastUpdated) || "No update time", 90],
          ])}
          <div class="action-strip">
            <button class="primary" onclick="runOne('${escapeHtml(row.responsibleStaff)}')">Run Owner</button>
            <button onclick="prefillTask('${escapeHtml(row.responsibleStaff)}','${escapeHtml(row.entityId)}','${escapeHtml(row.applicationId)}')">Add Task</button>
            <button onclick="prefillDecision('Lead Review','${escapeHtml(row.applicationId || row.entityId)}')">Comment</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderTasks(rows) {
  if (!rows.length) {
    el("tasks").innerHTML = emptyState("No tasks waiting", "No delegated work is open in the current snapshot.");
    return;
  }
  el("tasks").innerHTML = `
    <div class="work-list">
      ${rows.slice(0, 24).map(row => `
        <article class="work-card ${noticeClass(displayStatus(row))}">
          <div class="card-topline">
            <div>
              <div class="card-title">${short(row.taskType || "Task", 72)}</div>
              <div class="card-meta">${short(row.taskId, 96)}</div>
            </div>
            ${badge(displayStatus(row))}
          </div>
          ${detailList([
            universityRefLine(row),
            ownerLine("Owner", row.assignedTo),
            recordReferenceLine("Lead", "applications", row.applicationId, 180),
            recordReferenceLine("Opportunity", "opportunities", row.opportunityId, 180),
            ["Run after", fmtDate(row.runAfter) || "now", 90],
            ["Due", `${fmtDate(row.dueAt) || "not set"}${row.overdue ? " - late" : ""}`, 100],
            ["Next action", row.nextAction, 240],
            ["Done when", row.completionCriteria, 220],
            isCodexWorkerHandoff(row) ? ["Worker", "Queued for the hourly Codex automation. No human approval is needed.", 190] : null,
            ["Blocker", row.lastError, 220],
          ].filter(Boolean))}
          <div class="action-strip">
            ${isCodexWorkerHandoff(row)
              ? `<button class="tonal" disabled>Waiting Codex</button>`
              : `<button class="primary" onclick="runOne('${escapeHtml(row.assignedTo)}')">Run Staff</button>`}
            <button onclick="snoozeTask('${escapeHtml(row.taskId)}', 24)">Snooze 24h</button>
            <button onclick="reassignTask('${escapeHtml(row.taskId)}', 'AIstaff_Manager')">Ask Manager</button>
            <button onclick="prefillDecision('Task Review','${escapeHtml(row.taskId)}')">Comment</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderFollowUps(rows) {
  if (!rows.length) {
    el("followUps").innerHTML = emptyState("No follow-ups waiting", "No active follow-up is due in the current snapshot.");
    return;
  }
  el("followUps").innerHTML = `
    <div class="work-list">
      ${rows.slice(0, 24).map(row => `
        <article class="work-card ${noticeClass(row.status)}">
          <div class="card-topline">
            <div>
              <div class="card-title">Follow-up</div>
              <div class="card-meta">${short(row.followUpId, 96)}</div>
            </div>
            ${badge(row.status)}
          </div>
          ${detailList([
            universityRefLine(row),
            ownerLine("Owner", row.staff),
            recordReferenceLine("Lead", "applications", row.entityId, 180),
            ["Reason", row.reason, 220],
            ["Run after", fmtDate(row.runAfter) || "now", 90],
            ["Due", `${fmtDate(row.dueAt) || "not set"}${row.overdue ? " - late" : ""}`, 100],
            ["Next action", row.nextAction, 240],
            ["Result", row.result, 220],
          ])}
          <div class="action-strip">
            <button class="primary" onclick="runOne('${escapeHtml(row.staff)}')">Run Staff</button>
            <button onclick="snoozeFollowUp('${escapeHtml(row.followUpId)}', 24)">Snooze 24h</button>
            <button onclick="prefillDecision('Follow-up Review','${escapeHtml(row.followUpId)}')">Comment</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderEmailQueue(queue) {
  const rows = [
    ...(queue.blocked || []).map(item => ({ ...item, group: "Blocked" })),
    ...(queue.errors || []).map(item => ({ ...item, group: "Error" })),
    ...(queue.queued || []).map(item => ({ ...item, group: "Queued" })),
    ...(queue.sent || []).slice(0, 4).map(item => ({ ...item, group: "Sent" })),
  ];
  el("emailQueue").innerHTML = rows.length ? rows.slice(0, 12).map(item => `
    <article class="notice ${noticeClass(item.sendStatus || item.group)}">
      <div class="card-topline">
        <div>
          <h3>${escapeHtml(item.group)} Email</h3>
          <div class="card-meta">${short(item.queueId, 96)}</div>
        </div>
        ${badge(item.sendStatus || item.approvalStatus)}
      </div>
      ${detailList([
        universityRefLine(item),
        recordReferenceLine("Lead", "applications", item.applicationId, 180),
        recordReferenceLine("Opportunity", "opportunities", item.opportunityId, 180),
        ["Recipient", item.recipientName || item.to, 110],
        ["Email", item.to, 120],
        ["Subject", item.subject, 220],
        ["Approval", item.approvalStatus, 80],
        ["Send mode", item.sendMode, 80],
        ["Sent at", fmtDate(item.sentAt), 90],
        ["Problem", item.lastError, 240],
      ])}
      <div class="notice-actions">
        <button onclick="processQueueRow('${escapeHtml(item.queueId)}')">Process Row</button>
        <button onclick="approveEmail('${escapeHtml(item.queueId)}')">Approve</button>
      </div>
    </article>
  `).join("") : `<div class="notice ok"><h3>No email queue items shown</h3><p>The current queue snapshot has no pending visible items.</p></div>`;
}

function flattenEmailQueue(queue = {}) {
  return [
    ...(queue.blocked || []).map(item => ({ ...item, group: "Blocked" })),
    ...(queue.errors || []).map(item => ({ ...item, group: "Error" })),
    ...(queue.queued || []).map(item => ({ ...item, group: "Queued" })),
    ...(queue.sent || []).map(item => ({ ...item, group: "Sent" })),
  ];
}

function externalLink(url, label) {
  if (!url) return "";
  return `<a class="ref-link anchor-ref" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(label || url)}</a>`;
}

function openUniversityDetail(key) {
  state.selectedUniversityKey = key || "unknown";
  state.selectedLeadId = "";
  state.selectedOpportunityId = "";
  renderUniversityDetail(state.selectedUniversityKey);
  showView("university-detail");
}

function refsMatch(left, right) {
  const a = String(left || "").trim();
  const b = String(right || "").trim();
  if (!a || !b) return false;
  return a === b || a.endsWith(b) || b.endsWith(a);
}

function rowMatchesLead(row, appOrId) {
  const appId = typeof appOrId === "string" ? appOrId : (appOrId?.applicationId || appOrId?.entityId || "");
  const entityId = typeof appOrId === "string" ? appOrId : (appOrId?.entityId || appOrId?.applicationId || "");
  return refsMatch(row.applicationId, appId) ||
    refsMatch(row.relatedLeadId, appId) ||
    refsMatch(row.entityId, entityId) ||
    refsMatch(row.entityId, appId) ||
    refsMatch(row.applicationId, entityId);
}

function rowMatchesOpportunity(row, opportunityId) {
  return refsMatch(row.opportunityId, opportunityId) || refsMatch(row.relatedOpportunityId, opportunityId);
}

function findLeadRecord(id) {
  const rows = state.dashboard?.applications || [];
  return rows.find(row => refsMatch(row.applicationId, id) || refsMatch(row.entityId, id)) || null;
}

function findOpportunityRows(id) {
  const applications = (state.dashboard?.applications || []).filter(row => rowMatchesOpportunity(row, id));
  const tasks = (state.dashboard?.tasks || []).filter(row => rowMatchesOpportunity(row, id));
  const followUps = (state.dashboard?.followUps || []).filter(row => rowMatchesOpportunity(row, id));
  const emails = flattenEmailQueue(state.dashboard?.emailQueue || {}).filter(row => rowMatchesOpportunity(row, id));
  return { applications, tasks, followUps, emails };
}

function renderWorkCards(rows, emptyTitle, emptyBody) {
  if (!rows.length) return emptyState(emptyTitle, emptyBody);
  return rows.slice(0, 12).map(row => `
    <article class="work-card ${noticeClass(row.status)}">
      <div class="card-topline">
        <div>
          <div class="card-title">${short(row.nextAction || row.reason || row.taskType || "Work item", 96)}</div>
          <div class="card-meta">${short(row.taskId || row.followUpId, 110)}</div>
        </div>
        ${badge(row.status)}
      </div>
      ${detailList([
        ownerLine("Owner", row.assignedTo || row.staff),
        recordReferenceLine("Lead", "applications", row.applicationId || row.entityId, 190),
        recordReferenceLine("Opportunity", "opportunities", row.opportunityId, 190),
        ["Due", fmtDate(row.dueAt) || "not set", 90],
        ["Next action", row.nextAction || row.completionCriteria || row.result, 240],
      ])}
    </article>
  `).join("");
}

function renderEmailCards(rows, emptyTitle, emptyBody) {
  if (!rows.length) return emptyState(emptyTitle, emptyBody);
  return rows.slice(0, 12).map(row => `
    <article class="notice ${noticeClass(row.sendStatus || row.group)}">
      <div class="card-topline">
        <div>
          <h3>${short(row.recipientName || row.to || "Email", 96)}</h3>
          <div class="card-meta">${short(row.queueId, 110)}</div>
        </div>
        ${badge(row.sendStatus || row.approvalStatus)}
      </div>
      ${detailList([
        recordReferenceLine("Lead", "applications", row.applicationId, 190),
        recordReferenceLine("Opportunity", "opportunities", row.opportunityId, 190),
        ["Subject", row.subject, 240],
        ["Approval", row.approvalStatus, 100],
        ["Send mode", row.sendMode, 90],
        ["Problem", row.lastError, 240],
      ])}
      <div class="notice-actions">
        <button onclick="processQueueRow('${escapeHtml(row.queueId)}')">Process Row</button>
        <button onclick="approveEmail('${escapeHtml(row.queueId)}')">Approve</button>
      </div>
    </article>
  `).join("");
}

function openLeadDetail(id) {
  state.selectedLeadId = id || "";
  state.selectedUniversityKey = "";
  state.selectedOpportunityId = "";
  renderLeadDetail(state.selectedLeadId);
  showView("application-detail");
}

function renderLeadDetail(id) {
  const app = findLeadRecord(id);
  const appId = app?.applicationId || id;
  const title = el("applicationDetailTitle");
  if (title) title.textContent = recordLabel("applications", appId || app?.entityId || id) || "Lead";

  if (!app) {
    el("applicationDetail").innerHTML = emptyState("Lead not in snapshot", "Refresh the dashboard or open the workbook if this reference exists only in the full sheet.");
    return;
  }

  const tasks = (state.dashboard?.tasks || []).filter(row => rowMatchesLead(row, app));
  const followUps = (state.dashboard?.followUps || []).filter(row => rowMatchesLead(row, app));
  const emails = flattenEmailQueue(state.dashboard?.emailQueue || {}).filter(row => rowMatchesLead(row, app) || rowMatchesOpportunity(row, app.opportunityId));
  const relatedWorkHtml = renderWorkCards([...tasks, ...followUps], "No related tasks", "No current task or follow-up is linked to this application.");
  const emailHtml = renderEmailCards(emails, "No related email rows", "No visible email queue row is linked to this application.");

  el("applicationDetail").innerHTML = `
    <div class="detail-grid">
      <section class="detail-section">
        <h3>Lead Details</h3>
        ${detailList([
          universityRefLine(app),
          ["Status", app.currentStatus, 120],
          ["Stage", app.currentStage, 120],
          ownerLine("Responsible", app.responsibleStaff),
          recordReferenceLine("Opportunity", "opportunities", app.opportunityId, 220),
          recordReferenceLine("Latest task", "tasks", app.lastTaskId, 240),
          recordReferenceLine("Latest follow-up", "followUps", app.lastFollowUpId, 240),
          recordIdLine("Lead ID", app.applicationId),
          recordIdLine("Entity ID", app.entityId),
          ["Deadline", app.deadline || "not set", 90],
          ["Notes", app.notes, 260],
        ])}
      </section>
      <section class="detail-section">
        <h3>Related Tasks & Follow-ups</h3>
        <div class="work-list nested">${relatedWorkHtml}</div>
      </section>
      <section class="detail-section">
        <h3>Related Email Queue</h3>
        <div class="stack compact nested">${emailHtml}</div>
      </section>
    </div>
  `;
}

function openOpportunityDetail(id) {
  state.selectedOpportunityId = id || "";
  state.selectedLeadId = "";
  state.selectedUniversityKey = "";
  renderOpportunityDetail(state.selectedOpportunityId);
  showView("opportunity-detail");
}

function renderOpportunityDetail(id) {
  const related = findOpportunityRows(id);
  const seed = related.applications[0] || related.tasks[0] || related.followUps[0] || related.emails[0] || { opportunityId: id };
  const title = el("opportunityDetailTitle");
  if (title) title.textContent = recordLabel("opportunities", id) || "Opportunity";

  const appsHtml = related.applications.length ? related.applications.map(row => `
    <article class="entity-card ${noticeClass(row.currentStatus)}">
      <div class="card-topline">
        <div>
          <div class="card-title">${recordReferenceChip("applications", row.applicationId || row.entityId, 96)}</div>
          <div class="card-meta">${short(row.applicationId || row.entityId, 110)}</div>
        </div>
        ${badge(row.currentStatus)}
      </div>
      ${detailList([
        ["Stage", row.currentStage, 100],
        ownerLine("Owner", row.responsibleStaff),
        recordReferenceLine("Lead", "applications", row.applicationId || row.entityId, 220),
        recordReferenceLine("Latest task", "tasks", row.lastTaskId, 220),
        recordReferenceLine("Latest follow-up", "followUps", row.lastFollowUpId, 220),
        ["Deadline", row.deadline || "not set", 90],
      ])}
    </article>
  `).join("") : emptyState("No linked applications", "No active application entity is linked to this opportunity in the current snapshot.");

  el("opportunityDetail").innerHTML = `
    <div class="detail-grid">
      <section class="detail-section">
        <h3>Opportunity Details</h3>
        ${detailList([
          universityRefLine(seed),
          recordIdLine("Opportunity ID", id),
          ["Current status", recordStatus("opportunities", id) || "not set", 120],
          ["Label", recordLabel("opportunities", id), 240],
          ["Linked applications", String(related.applications.length), 80],
          ["Linked email rows", String(related.emails.length), 80],
        ])}
      </section>
      <section class="detail-section">
        <h3>Linked Leads</h3>
        <div class="entity-list nested">${appsHtml}</div>
      </section>
      <section class="detail-section">
        <h3>Related Tasks & Follow-ups</h3>
        <div class="work-list nested">${renderWorkCards([...related.tasks, ...related.followUps], "No related tasks", "No current task or follow-up is linked to this opportunity.")}</div>
      </section>
      <section class="detail-section">
        <h3>Related Email Queue</h3>
        <div class="stack compact nested">${renderEmailCards(related.emails, "No related email rows", "No visible email row is linked to this opportunity.")}</div>
      </section>
    </div>
  `;
}

function renderUniversityDetail(key) {
  const university = UNIVERSITY_REFERENCES[key] || UNIVERSITY_REFERENCES.unknown;
  const title = el("universityDetailTitle");
  if (title) title.textContent = university.name;
  const applications = (state.dashboard?.applications || []).filter(row => inferUniversity(row).key === university.key);
  const tasks = (state.dashboard?.tasks || []).filter(row => inferUniversity(row).key === university.key);
  const followUps = (state.dashboard?.followUps || []).filter(row => inferUniversity(row).key === university.key);
  const emails = flattenEmailQueue(state.dashboard?.emailQueue || {}).filter(row => inferUniversity(row).key === university.key);

  const relatedApps = applications.length ? applications.map(row => `
    <article class="entity-card ${noticeClass(row.currentStatus)}">
      <div class="card-topline">
        <div>
          <div class="card-title">${recordReferenceChip("applications", row.applicationId || row.entityId, 90)}</div>
          <div class="card-meta">${short(row.applicationId || row.entityId, 100)}</div>
        </div>
        ${badge(row.currentStatus)}
      </div>
      ${detailList([
        ["Stage", row.currentStage, 90],
        ownerLine("Owner", row.responsibleStaff),
        recordReferenceLine("Opportunity", "opportunities", row.opportunityId, 180),
        recordReferenceLine("Latest task", "tasks", row.lastTaskId, 220),
        recordReferenceLine("Latest follow-up", "followUps", row.lastFollowUpId, 220),
        ["Deadline", row.deadline || "not set", 90],
        ["Notes", row.notes, 220],
      ])}
      <div class="action-strip">
        <button class="primary" onclick="runOne('${escapeHtml(row.responsibleStaff)}')">Run Owner</button>
        <button onclick="prefillTask('${escapeHtml(row.responsibleStaff)}','${escapeHtml(row.entityId)}','${escapeHtml(row.applicationId)}')">Add Task</button>
      </div>
    </article>
  `).join("") : emptyState("No related applications", "No active application entity is currently linked to this university.");

  const relatedWork = [...tasks, ...followUps].slice(0, 10);
  const relatedWorkHtml = relatedWork.length ? relatedWork.map(row => `
    <article class="work-card ${noticeClass(row.status)}">
      <div class="card-topline">
        <div>
          <div class="card-title">${short(row.nextAction || row.reason || row.taskType || "Work item", 90)}</div>
          <div class="card-meta">${short(row.taskId || row.followUpId, 100)}</div>
        </div>
        ${badge(row.status)}
      </div>
      ${detailList([
        ownerLine("Owner", row.assignedTo || row.staff),
        recordReferenceLine("Lead", "applications", row.applicationId || row.entityId, 180),
        recordReferenceLine("Opportunity", "opportunities", row.opportunityId, 180),
        ["Due", fmtDate(row.dueAt) || "not set", 90],
        ["Next action", row.nextAction || row.completionCriteria || row.result, 220],
      ])}
    </article>
  `).join("") : emptyState("No related tasks", "No current task or follow-up is linked to this university.");

  const emailHtml = emails.length ? emails.slice(0, 10).map(row => `
    <article class="notice ${noticeClass(row.sendStatus || row.group)}">
      <div class="card-topline">
        <div>
          <h3>${short(row.recipientName || row.to || "Email", 90)}</h3>
          <div class="card-meta">${short(row.queueId, 100)}</div>
        </div>
        ${badge(row.sendStatus || row.approvalStatus)}
      </div>
      ${detailList([
        recordReferenceLine("Lead", "applications", row.applicationId, 180),
        recordReferenceLine("Opportunity", "opportunities", row.opportunityId, 180),
        ["Subject", row.subject, 220],
        ["Approval", row.approvalStatus, 90],
        ["Problem", row.lastError, 220],
      ])}
    </article>
  `).join("") : emptyState("No email queue rows", "No visible email row is linked to this university in the current snapshot.");

  el("universityDetail").innerHTML = `
    <div class="detail-grid">
      <section class="detail-section">
        <h3>Tender Source Details</h3>
        ${detailList([
          ["Name", university.name, 140],
          ["City", university.city, 80],
          ["Country", university.country, 80],
          ["Type", university.type, 140],
          ["Website", externalLink(university.website, "Open website"), 160, true],
          ["Doctoral page", externalLink(university.doctoral, "Open doctoral page"), 160, true],
          ["Research focus", university.focus, 260],
          ["Fit for Iman", university.fit, 260],
        ])}
      </section>
      <section class="detail-section">
        <h3>Related Leads</h3>
        <div class="entity-list nested">${relatedApps}</div>
      </section>
      <section class="detail-section">
        <h3>Related Tasks & Follow-ups</h3>
        <div class="work-list nested">${relatedWorkHtml}</div>
      </section>
      <section class="detail-section">
        <h3>Related Email Queue</h3>
        <div class="stack compact nested">${emailHtml}</div>
      </section>
    </div>
  `;
}

function renderReports(reports) {
  const node = el("reports");
  if (!node) return;
  node.innerHTML = reports.slice(0, 4).map(item => `
    <article class="notice">
      <h3>${short(item.Period || item["Report ID"] || "Report", 70)}</h3>
      <p>${short(item.Summary || item["Recommended Next Actions"] || "", 180)}</p>
    </article>
  `).join("") || `<div class="notice"><h3>No reports yet</h3><p>Run audit or CRM health to create the next report.</p></div>`;
}

function renderRecentActivity(events, runs) {
  const eventRows = events.slice(0, 6).map(item => `
    <article class="notice">
      <h3>${short(item.Event || item["Run Type"] || "Event", 80)}</h3>
      <p>${short([item.EntityID, item.Field, item.After, item.Reason].filter(Boolean).join(" | "), 180)}</p>
    </article>
  `);
  const runRows = runs.slice(0, 5).map(item => `
    <article class="notice">
      <h3>${short(item["Run Type"] || "Run", 80)}</h3>
      <p>${short([item["Actions Completed"], item["Next Run Focus"], item.Notes].filter(Boolean).join(" | "), 180)}</p>
    </article>
  `);
  el("recentActivity").innerHTML = [...eventRows, ...runRows].join("") || `<div class="notice"><h3>No activity shown</h3><p>Refresh after the runner completes a task.</p></div>`;
}

function table(headers, rows) {
  if (!rows.length) return `<div class="stack"><div class="notice ok"><h3>Nothing open</h3><p>No rows in this view right now.</p></div></div>`;
  return `
    <table>
      <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
}

function emptyState(title, body) {
  return `<div class="stack"><div class="notice ok"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></div></div>`;
}

function noticeClass(status) {
  const text = String(status || "").toLowerCase();
  if (text.includes("blocked") || text.includes("error") || text.includes("failed")) return "danger";
  if (text.includes("waiting for codex")) return "";
  if (text.includes("need") || text.includes("late") || text.includes("queued")) return "warn";
  if (text.includes("sent") || text.includes("done") || text.includes("ok")) return "ok";
  return "";
}

async function runOne(staff = "") {
  if (state.actionBusy) return;
  setActionBusy(true);
  try {
    const label = staff ? staffProfile(staff).label : "the team";
    setStatus(staff ? `Checking due work for ${label}...` : "Running one due item...", "working");
    const result = await api("/api/run-one", {
      method: "POST",
      body: JSON.stringify({ staff, maxItems: 1 }),
    });
    const processed = Number(result?.processed ?? result?.result?.processed ?? 0);
    const message = result?.message || result?.result?.message || "";
    const first = (result?.results || result?.result?.results || [])[0] || {};
    if (processed > 0) {
      const summary = first.message || first.status || "One due item processed";
      toast(summary);
      setStatus(`${label}: ${summary}`);
    } else {
      const noWorkMessage = `${label}: no due task or active follow-up is scheduled. Use Assign to create work for this staff.`;
      toast(message || "No due work found");
      setStatus(noWorkMessage);
    }
    await loadDashboard(false, true);
  } catch (error) {
    showActionError(error);
  } finally {
    setActionBusy(false);
  }
}

async function processQueueRow(queueId) {
  if (!queueId) return;
  const ok = window.confirm(`Process email queue row ${queueId}? The bridge will still block incomplete packages, attachment failures, and non-approved rows.`);
  if (!ok) return;
  if (state.actionBusy) return;
  setActionBusy(true);
  try {
    await bridgeAction("processQueueRow", { queueId });
    await loadDashboard(false, true);
  } catch (error) {
    showActionError(error);
  } finally {
    setActionBusy(false);
  }
}

async function approveEmail(queueId) {
  if (!queueId) return;
  if (state.actionBusy) return;
  setActionBusy(true);
  try {
    await bridgeAction("updateEmailQueueApproval", {
      queueId,
      approvalStatus: "Approved",
      approvedBy: "Command Center",
      sendMode: "SEND_NOW",
      notes: "Approved from Command Center.",
    });
    await loadDashboard(false, true);
  } catch (error) {
    showActionError(error);
  } finally {
    setActionBusy(false);
  }
}

async function runEmailSafetyCheck(queueId = "") {
  if (state.actionBusy) return;
  setActionBusy(true);
  try {
    setStatus(queueId ? `Checking email content for ${queueId}...` : "Checking approved email rows for unsafe internal wording...", "working");
    const result = await bridgeAction("validateEmailContentSafety", queueId ? { queueId } : {});
    const blocked = Number(result?.blocked?.length || result?.result?.blocked?.length || 0);
    toast(blocked ? `${blocked} email row(s) need content review` : "Email content safety passed");
    await loadDashboard(false, true);
  } catch (error) {
    showActionError(error);
  } finally {
    setActionBusy(false);
  }
}

async function runCrmHealth() {
  if (state.actionBusy) return;
  setActionBusy(true);
  try {
    setStatus("Running CRM health cycle...", "working");
    await api("/api/run-health", { method: "POST", body: JSON.stringify({}) });
    toast("CRM health completed");
    await loadDashboard(false, true);
  } catch (error) {
    showActionError(error);
  } finally {
    setActionBusy(false);
  }
}

async function snoozeTask(taskId, hours = 24) {
  if (!taskId) return;
  if (state.actionBusy) return;
  setActionBusy(true);
  try {
    await bridgeAction("snoozeAiStaffTask", {
      taskId,
      hours,
      reason: `Snoozed ${hours} hour(s) from Command Center.`,
    });
    await loadDashboard(false, true);
  } catch (error) {
    showActionError(error);
  } finally {
    setActionBusy(false);
  }
}

async function snoozeFollowUp(followUpId, hours = 24) {
  if (!followUpId) return;
  if (state.actionBusy) return;
  setActionBusy(true);
  try {
    await bridgeAction("snoozeAiStaffFollowUp", {
      followUpId,
      hours,
      reason: `Snoozed ${hours} hour(s) from Command Center.`,
    });
    await loadDashboard(false, true);
  } catch (error) {
    showActionError(error);
  } finally {
    setActionBusy(false);
  }
}

async function reassignTask(taskId, assignedTo) {
  if (!taskId || !assignedTo) return;
  if (state.actionBusy) return;
  setActionBusy(true);
  try {
    await bridgeAction("reassignAiStaffTask", {
      taskId,
      assignedTo,
      reason: `Reassigned to ${assignedTo} from Command Center.`,
    });
    await loadDashboard(false, true);
  } catch (error) {
    showActionError(error);
  } finally {
    setActionBusy(false);
  }
}

async function closeEntity(entityId) {
  if (!entityId) return;
  const reason = window.prompt("Why should this entity be closed?", "Closed from Command Center.");
  if (!reason) return;
  if (state.actionBusy) return;
  setActionBusy(true);
  try {
    await bridgeAction("closeAiStaffEntity", {
      entityId,
      status: "No Further Action",
      reason,
    });
    await loadDashboard(false, true);
  } catch (error) {
    showActionError(error);
  } finally {
    setActionBusy(false);
  }
}

function prefillDecision(type, title) {
  const form = el("decisionForm");
  form.decisionType.value = type || "Manager Review";
  form.recommendation.value = title ? `Review ${title}` : "";
  openDecisionDialog();
  form.reason.focus();
}

function prefillTask(staff, entityId, applicationId) {
  const form = el("taskForm");
  if (!form) return;
  form.assignedTo.value = staff || "AIstaff_Manager";
  form.entityId.value = entityId || "";
  form.relatedLeadId.value = applicationId || "";
  openTaskDialog();
  form.nextAction.focus();
}

async function submitTask(event) {
  event.preventDefault();
  if (state.actionBusy) return;
  setActionBusy(true);
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  const completionCriteria = "Task completed or blocked with clear result.";
  const needsCodexWorker = taskNeedsCodexWorker({ ...data, completionCriteria });
  try {
    await bridgeAction("appendAiStaffTask", {
      taskType: data.taskType,
      assignedTo: data.assignedTo,
      createdBy: "Command Center",
      entityId: data.entityId,
      relatedLeadId: data.relatedLeadId,
      priority: data.priority,
      runAfter: data.runAfter || new Date().toISOString(),
      dueAt: data.dueAt || "",
      nextAction: data.nextAction,
      completionCriteria,
      successStatus: `${data.taskType} Done`,
      failureStatus: `Blocked - ${data.taskType} Issue`,
      status: needsCodexWorker ? "Waiting for Codex Worker" : "Queued",
      resultNotes: needsCodexWorker
        ? "Created from Command Center as a Codex Worker task. Apps Script will not attempt this research/writing work automatically."
        : "",
    });
    form.reset();
    form.assignedTo.value = "AIstaff_Manager";
    form.priority.value = "High";
    closeDialog("taskDialog");
    setStatus(needsCodexWorker
      ? "Task saved for Codex Worker. It will appear in the Codex work lane, not as a human approval."
      : "Task saved and queued for the AI Staff runner.");
    await loadDashboard(false, true);
  } catch (error) {
    showActionError(error);
  } finally {
    setActionBusy(false);
  }
}

async function submitDecision(event) {
  event.preventDefault();
  if (state.actionBusy) return;
  setActionBusy(true);
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    await bridgeAction("appendAiStaffDecision", {
      decisionType: data.decisionType,
      recommendation: data.recommendation,
      reason: data.reason,
      evidence: data.evidence,
      approvalNeeded: "Yes",
      approvalStatus: data.approvalStatus,
      userResponse: "Recorded from Command Center",
      finalActionTaken: "",
    });
    form.reset();
    form.decisionType.value = "Manager Review";
    form.approvalStatus.value = "Approved";
    closeDialog("decisionDialog");
    await loadDashboard(false, true);
  } catch (error) {
    showActionError(error);
  } finally {
    setActionBusy(false);
  }
}

function maybeNotify(summary) {
  const count = Number(summary.managerReview || 0);
  if (!state.notificationsEnabled || count <= 0 || count === state.lastReviewCount) {
    state.lastReviewCount = count;
    return;
  }
  state.lastReviewCount = count;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification("GCC lab AI department needs manager review", {
    body: `${count} item(s) need attention in the AI Staff Command Center.`,
  });
}

async function enableNotifications() {
  if (!("Notification" in window)) {
    toast("This browser does not support notifications.");
    return;
  }
  const permission = await Notification.requestPermission();
  state.notificationsEnabled = permission === "granted";
  toast(state.notificationsEnabled ? "Notifications enabled" : "Notifications not enabled");
}

function openWorkbook() {
  const url = state.dashboard?.workbookUrl;
  if (url) window.open(url, "_blank", "noopener");
}

function rerenderLeads() {
  renderLeads(state.dashboard?.applications || []);
}

function setLeadsView(view) {
  state.applicationsView = view === "kanban" ? "kanban" : "list";
  rerenderLeads();
}

function updateLeadFilter(key, value) {
  state.applicationFilters = {
    ...(state.applicationFilters || {}),
    [key]: value || "",
  };
  rerenderLeads();
}

el("refreshBtn").addEventListener("click", () => loadDashboard(false));
el("runOneBtn").addEventListener("click", () => runOne(""));
el("moreCommandsBtn").addEventListener("click", openCommandsDialog);
el("notifyBtn").addEventListener("click", enableNotifications);
el("autopilotRunBtn").addEventListener("click", runAutopilotCycle);
el("autopilotToggleBtn").addEventListener("click", () => {
  const enabled = state.dashboard?.localSync?.autopilot?.enabled !== false;
  setAutopilot(!enabled);
});
el("openTaskDialogBtn").addEventListener("click", openTaskDialog);
el("openDecisionDialogBtn").addEventListener("click", openDecisionDialog);
el("decisionForm").addEventListener("submit", submitDecision);
el("taskForm").addEventListener("submit", submitTask);
el("applicationSearch").addEventListener("input", event => updateLeadFilter("search", event.target.value));
el("applicationStageFilter").addEventListener("change", event => updateLeadFilter("stage", event.target.value));
el("applicationUniversityFilter").addEventListener("change", event => updateLeadFilter("university", event.target.value));
el("applicationListViewBtn").addEventListener("click", () => setLeadsView("list"));
el("applicationKanbanViewBtn").addEventListener("click", () => setLeadsView("kanban"));
document.addEventListener("click", event => {
  const commandButton = event.target.closest("[data-command]");
  if (!commandButton) return;
  const command = commandButton.dataset.command;
  if (command === "run-autopilot-cycle") {
    event.preventDefault();
    event.stopImmediatePropagation();
    runAutopilotCycle();
  }
}, true);
document.querySelectorAll(".m3-dialog").forEach(dialog => {
  dialog.addEventListener("click", event => {
    if (event.target === dialog) closeDialog(dialog.id);
  });
});

Object.assign(window, {
  approveEmail,
  closeDialog,
  closeEntity,
  loadDashboard,
  openLeadDetail,
  openDecisionDialog,
  openDialog,
  openOpportunityDetail,
  openTaskDialog,
  openUniversityDetail,
  openWorkbook,
  prefillDecision,
  prefillTask,
  processQueueRow,
  reassignTask,
  runAutopilotCycle,
  runCrmHealth,
  runEmailSafetyCheck,
  runLegacyCycleFallback,
  runOne,
  setAutopilot,
  setLeadsView,
  showView,
  snoozeFollowUp,
  snoozeTask,
  syncSheetNow,
});

initNavigation();
loadDashboard(false);
state.refreshTimer = setInterval(() => loadDashboard(false), 5 * 60 * 1000);
