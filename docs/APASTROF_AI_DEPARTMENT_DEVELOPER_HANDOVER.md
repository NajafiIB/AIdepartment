# Apastrof AI Department Platform — Developer Handover

**Standalone architecture and development brief**  
**Last updated: 24 September 2026**

> This document is intentionally self-contained so a new developer can understand the architecture, ownership boundaries, runtime model, Brain integration, Scenario model, and development priorities without access to the private implementation repositories.
>
> It intentionally excludes credentials, secrets, private customer data, and private repository links.

---

## 1. What Apastrof is building

Apastrof is building a platform where an organization can install and operate **AI Departments**.

An AI Department is not just a chatbot. It is an operational AI unit composed of:

- one AI Manager;
- bounded AI Staff;
- business Stages;
- Skills;
- Knowledge;
- structured Tables;
- Connections, Lanes, and Actions;
- approval rules;
- durable Work Items;
- auditable Outputs;
- runtime recovery, billing, and governance.

The system is deliberately separated into two major layers:

```text
AI Department Platform
        +
Scenario definitions
```

The simplest mental model is:

```text
Scenario
= what the Department is supposed to do

Platform
= the system that safely runs it
```

The Platform remains reusable across many companies and Departments.

Scenarios contain Department-specific business behavior.

---

## 2. The two main codebase responsibilities

### A. AI Department Platform

The main application is the Apastrof AI Department Platform, historically developed in a repository named `AIdeparmtentUIonly_2`.

The repository name is now misleading: it is no longer “UI only.”

It is the main multi-tenant application and control plane.

It owns:

| Platform responsibility | Meaning |
|---|---|
| Identity | Authentication and users |
| Organizations | Tenant/company isolation |
| Permissions | Who may see and do what |
| Scenario releases | Receiving and validating signed Scenario releases |
| AI Departments | Installing a Scenario for an organization |
| Work Items | Business cases being processed |
| Manager conversations | Human ↔ AI Manager interaction |
| Runtime | Executing the AI Department |
| AI Staff | Bounded specialist execution |
| Tables | Structured organization records |
| Connections | Access to external systems |
| Lanes | Groups of provider capabilities |
| Actions | Individual executable operations |
| Knowledge grants | Knowledge available to a Department |
| Approvals | Human authorization |
| Credits / billing | Commercial control |
| Audit | Durable execution evidence |
| Recovery | Retries, leases, reconciliation, idempotency |
| Scenario Designer | Admin authoring UI |
| Deployment | Production platform/runtime |

This is the **main application**.

---

### B. Scenarios

The Scenarios codebase is the source of truth for **AI Department behavior**.

A Scenario is an immutable, versioned business contract.

A Scenario defines:

- what Work Item exists;
- what the AI Manager is responsible for;
- which Staff roles exist;
- what Stages exist;
- which routes are possible;
- what evidence is required;
- which Actions are permitted;
- which Tables are accessible;
- which Knowledge is accessible;
- which Skills apply;
- what Outputs must be produced;
- when a person must approve;
- what counts as completion;
- how failure, retry, resume, and no-result behavior work.

A Scenario is **not** an application server.

It does not own:

- provider API keys;
- provider authentication;
- database administration;
- Supabase service credentials;
- GCP IAM;
- Secret Manager;
- generic provider adapters;
- billing infrastructure;
- general runtime infrastructure.

A simple ownership rule should always be used:

> If a change describes what one AI Department does, it belongs in Scenarios.  
> If a change creates reusable infrastructure that multiple Departments can consume, it belongs in the Platform.

---

## 3. What an AI Department actually is

A Scenario by itself is only a definition.

Once an organization installs a signed Scenario release, it becomes an **AI Department** for that organization.

```text
Scenario
        ↓ installation
AI Department
```

Example:

```text
Origination Match Scenario v10.0.0
        ↓
installed for Company A
        ↓
Company A Origination Match AI Department
```

The Scenario remains immutable.

The organization installation owns runtime state, permissions, Connections, Work Items, approvals, and operational history.

---

## 4. The Work Item is the primary business object

Every operation should be centered on a **Work Item**.

Examples:

- Tender
- BizOp
- Mandate
- Research request
- Supplier case
- Due diligence case
- Application
- Opportunity

Conceptually:

```text
Organization
    ↓
AI Department
    ↓
Work Item
    ↓
Manager Conversation
    ↓
Execution
```

The Work Item should preserve:

- messages;
- files;
- accepted evidence;
- Stage progress;
- Staff Tasks;
- approvals;
- outputs;
- related Company/Contact records;
- audit history;
- final report.

---

## 5. There is one AI Manager

This is a core architectural decision.

There should not be a separate Manager for every Stage or integration.

The model is:

```text
Human
   ↓
Work Item
   ↓
AI Manager
   │
   ├── Staff A
   ├── Staff B
   ├── Tool Action
   ├── Operating Brain
   ├── Company Brain Knowledge
   └── Tables
```

The AI Manager owns:

- understanding the request;
- choosing the signed route;
- deciding which Stage is active;
- delegating bounded Staff work;
- asking the human necessary questions;
- interpreting evidence;
- accepting or rejecting Staff results;
- progressing the workflow;
- producing the final answer.

Neither an external workflow engine, a Brain, nor Make.com becomes another conversational Manager.

---

## 6. AI Staff are bounded specialists

Staff are specialist agents used by the Manager.

Examples:

- Company Research Staff;
- Contact Qualification Staff;
- Tender Analysis Staff;
- Commercial Analysis Staff;
- Compliance Staff.

A Staff agent receives only what it needs.

Typical Staff context:

- current Stage;
- assigned Task;
- accepted prerequisite Outputs;
- relevant evidence;
- specific Skill version;
- specific Tool grants;
- strict input schema;
- strict output schema;
- acceptance criteria.

A Staff agent may not:

- change the Scenario route;
- change workflow progress;
- communicate directly with the customer;
- widen its own permissions;
- invent new Tools;
- approve its own sensitive action.

The AI Manager remains responsible for the business flow.

---

## 7. Stage means business milestone, not technical job

Stages should represent human-understandable business milestones.

Good example:

```text
Intake
Company Discovery
Contact Qualification
Commercial Review
Final Recommendation
```

Bad example:

```text
Call API
Wait for queue
Run webhook
Retry HTTP
```

Technical execution mechanics belong in the Platform runtime.

The Scenario should express the business process.

---

## 8. How Tools are modeled

The Platform uses:

```text
Connection
    ↓
Lane
    ↓
Action
```

### Connection

Represents access to a system or provider.

Examples:

- Lusha
- Company CRM
- WorldBC Operating Brain
- OpenAI
- Google
- Meeting Intelligence

### Lane

Groups related capabilities.

Example:

```text
Company CRM
    ↓
CRM Lane
```

### Action

One exact executable operation.

Examples:

```text
crm.company.search
crm.contact.search
crm.lead.search

web.search

contact.enrich

knowledge.search

calendar.read

communication.send
```

A Scenario references **Action IDs**, not raw provider URLs or credentials.

---

## 9. Provider credentials stay server-side

Credentials always remain in the Platform/server boundary.

Scenario code must never contain:

- API keys;
- OAuth tokens;
- database passwords;
- GCP service credentials;
- provider bearer tokens;
- Brain credentials.

Conceptually:

```text
Scenario
   ↓
Action ID
   ↓
Platform authorization
   ↓
server-side Connection
   ↓
provider credential
   ↓
provider
```

The browser and AI model should not receive provider credentials.

---

## 10. Action authorization happens at multiple boundaries

A Scenario declaring an Action does not mean the Action automatically executes.

Runtime should behave like this:

```text
Scenario says:
"This Stage may use Action X"
        ↓
Platform checks:
organization
installed Scenario release
active Stage
Action grant
Connection state
credential
approval
Credit budget
idempotency
        ↓
Provider / Brain may apply
additional domain policy
        ↓
Action executes
```

For company-specific operations:

```text
Scenario permission
≠
Platform authorization
≠
Operating Brain authorization
```

All appropriate gates may need to pass.

---

## 11. Technical result and business result remain separate

Every Tool and Staff boundary must distinguish technical execution from business outcome.

Valid example:

```text
technicalStatus: success
businessOutcome: zero_results
```

Invalid behavior:

```text
HTTP 500
→ "No matching Companies found"
```

An HTTP failure is a technical failure, not a valid zero-result business outcome.

This distinction must remain explicit throughout the runtime.

---

## 12. What the Operating Brain is

The **Operating Brain** is a governed, company-specific operational service.

For WorldBC, it can work with systems such as:

- NJ_CRM / AppSheet;
- operational Firestore;
- Pub/Sub;
- communications;
- company-specific operational policy;
- approval state;
- execution receipts;
- idempotency controls.

It may provide:

- operational reads;
- current context;
- policy checks;
- CRM operations;
- governed communication execution;
- receipt reconciliation.

The Operating Brain is **not** the AI Department Manager.

The correct relationship is:

```text
AI Department Manager
        ↓
Platform Action
        ↓
WorldBC Operating Brain
        ↓
governed WorldBC operation
```

---

## 13. What Company Brain is

Company Brain has a different purpose.

It provides reusable governed company knowledge, such as:

- company information;
- services;
- pricing rules;
- policies;
- playbooks;
- approved wording;
- stable business rules;
- reusable templates.

Conceptually:

```text
AI Manager
    ↓
Knowledge query
    ↓
Company Brain
    ↓
approved immutable Knowledge Release
    ↓
cited evidence
```

Company Brain supplies **evidence for reasoning**.

It does not by itself authorize an operational action.

---

## 14. Operating Brain and Company Brain must not be confused

They answer different classes of questions.

```text
OPERATING BRAIN
"What is happening now, and may/should this operation execute?"

COMPANY BRAIN
"What does the company know, offer, require or permit as reusable knowledge?"
```

Examples:

| Question / operation | Authority |
|---|---|
| Current Lead status | CRM / Operating data |
| Current approval state | Operating Brain / operational state |
| Send email | Operating Brain governed operation |
| Pricing policy | Company Brain |
| Approved service description | Company Brain |
| Communication policy | Company Brain evidence + Operating Brain current execution checks |

---

## 15. Company Brain product vs Company Brain runtime capability

Company Brain can appear as a human-facing Apastrof product at:

```text
brain.apastrof.com
```

That is the product UI.

AI Departments should still access Knowledge through narrow controlled runtime interfaces.

```text
Company Brain application
= human UI

Company Brain Knowledge API/MCP
= AI/runtime capability
```

These are related but different.

A product existing in the Apps menu does not automatically make its capabilities available to AI Departments.

---

## 16. Knowledge is one source among several

The AI Manager can combine governed information from multiple sources:

```text
CRM
+
Company Brain Knowledge
+
communications
+
calendar
+
web research
+
provider data
+
organization Tables
+
files attached to the Work Item
```

The Manager reasons over evidence returned by these systems.

Company Brain should not become a database containing all company operational information.

---

## 17. Tables

Tables are structured organization-scoped records inside the Platform.

Examples:

- Company;
- Contact;
- Supplier;
- Tender-related entity;
- custom organization records.

A Table record may contain provenance showing that information came from:

- CRM;
- Lusha;
- web research;
- another product;
- manual entry.

A local Table does not automatically replace the external authoritative source.

Authority must remain explicit.

---

## 18. Skills

A Skill teaches Manager or Staff how to perform a repeatable task.

Examples:

- Company qualification methodology;
- Contact verification methodology;
- Commercial assessment rubric.

A Skill may contain:

- instructions;
- examples;
- failure patterns;
- rubric;
- expected output.

But a Skill cannot grant permission.

```text
Skill
= how to perform something

Action grant
= permission to perform something
```

---

## 19. Source strategy

A Scenario can define which sources should be used for a specific task.

Example:

```text
1. Organization Table
2. Company CRM
3. Lusha
4. Web Research
```

The Scenario defines the business strategy.

The Platform executes the actual integrations.

The Scenario should also define:

- when fallback is allowed;
- what counts as sufficient evidence;
- what zero-result means;
- what technical failure means;
- how much research is enough.

---

## 20. Scenario Designer

Scenario Designer is an administrative authoring surface inside the Platform.

Conceptually:

```text
Platform Admin
    ↓
Scenario Designer
    ↓
Scenario draft
    ↓
validate required capabilities
```

If all required capabilities exist:

```text
Scenario draft
    ↓
Scenario release workflow
```

If a required reusable capability does not exist:

```text
Scenario Designer
    ↓
Capability Request
    ↓
developer implements Platform capability
```

Scenario Designer does **not** replace the immutable Scenario release system.

It is an authoring layer.

---

## 21. Scenario SDK / capability catalog

The Platform and Scenario layers communicate through an immutable capability catalog.

The Platform publishes the capabilities that actually exist.

Example:

```text
Platform implements Action
        ↓
deploys Action
        ↓
verifies Action
        ↓
publishes SDK catalog
        ↓
Scenario pins the catalog
        ↓
Scenario references exact Action
```

A Scenario developer must not invent an Action ID and assume the Platform supports it.

The dependency direction is:

```text
Platform implementation
→ deployment
→ verification
→ SDK publication
→ Scenario use
```

---

## 22. Release ordering is mandatory

Cross-system development must respect dependency order.

For a new capability:

```text
1. Define capability contract
2. Implement capability in Platform
3. Test it
4. Deploy it
5. Verify production behavior
6. Publish updated Scenario SDK catalog
7. Update Scenario
8. Run Scenario tests/evaluation
9. Approve/sign Scenario release
10. Install/activate Department release
```

Do not publish a Scenario first and hope the capability becomes available later.

---

## 23. Scenario releases are immutable

Each Scenario has a semantic version.

Examples:

```text
10.0.0
10.1.0
11.0.0
```

Once an exact version has been released, its behavior must not silently change.

A Work Item pins the Scenario release it started under.

Therefore:

```text
new Scenario release
≠
retroactively changing old Work Items
```

Historical execution must remain auditable.

---

## 24. Current Scenario portfolio

Current baseline:

| Scenario | Version | State |
|---|---:|---|
| Origination Match | 10.0.0 | Approved |
| WorldBC Opportunity Match | 1.1.0 | Approved |
| WorldBC CRM Operations | 1.1.0 | Draft |
| WorldBC Growth Operations | 1.0.0 | Draft |
| WorldBC BizOps Operations | 0.1.0 | Draft / waiting for capability |

Origination Match is currently the strongest reusable reference implementation for Manager-owned workflow behavior.

---

## 25. Current WorldBC BizOps development state

A WorldBC BizOps Scenario already exists in draft form.

Its intended flow is approximately:

```text
Resume a specific BizOp case
        ↓
read authoritative context
        ↓
validate Company + Contact
        ↓
check communication/history/policy
        ↓
prepare governed first contact
        ↓
execute only when authorized
        ↓
reconcile receipt
        ↓
avoid duplicate send
        ↓
complete Work Item
```

The Scenario is intentionally not publishable yet because the required reusable Platform capabilities have not been completed.

Required WorldBC Operating Brain Actions:

```text
worldbc_operating_brain:operating_capabilities

worldbc_operating_brain:operating_query

worldbc_operating_brain:email_executor_bizops_first_contact

worldbc_operating_brain:governed_dispatch_receipt
```

The Scenario must remain fail-closed instead of bypassing the Brain through a generic email API.

---

## 26. Meaning of the four required Operating Brain Actions

### operating_capabilities

Read-only.

Returns current availability of relevant WorldBC operational functions, sources, and policy readiness.

### operating_query

Read-only.

Retrieves exact governed operational context, such as:

- BizOp;
- Company;
- Contact;
- related records;
- communication history;
- freshness;
- completeness.

### email_executor_bizops_first_contact

Potential external side effect.

It should:

- perform effect-free preflight;
- validate the exact immutable message/packet;
- validate current policy;
- validate current authority;
- enforce sender policy;
- enforce idempotency;
- execute one eligible first contact.

Scenario code must never choose credentials, bypass sender policy, or invent approval.

### governed_dispatch_receipt

Read-only reconciliation.

It answers questions such as:

- Was this exact logical dispatch accepted?
- Did the provider produce a final message identity?
- Is the result final?
- Is this an idempotent replay?
- Is there uncertainty requiring reconciliation rather than resend?

This is essential to prevent duplicate sends after timeouts or worker interruptions.

---

## 27. Current Origination Match development state

Origination Match 10.0.0 is approved.

There is also work toward a 10.1.0 release, particularly around a better final completion report and final completion email.

The important architectural point is:

- completion email must only be queued after the exact final Output is durable;
- the Work Item must already be completed;
- the final human-visible report must already exist;
- email delivery is a recoverable projection of completed state;
- an intermediate Stage checkpoint must never be treated as the final report.

The remaining release work for 10.1.0 should be:

```text
reconcile with current Platform behavior
        ↓
run exact 10.1.0 full-path evaluation
        ↓
prove completion behavior
        ↓
approve/publish only if exact release passes
```

Historical evaluation of 10.0.0 must not automatically certify 10.1.0.

---

## 28. Draft CRM integration work is not production capability

There is ongoing foundation work for more general source-scoped CRM request/status contracts.

A developer must not assume that draft code is an active reusable capability.

Use this maturity model:

```text
code exists
≠
merged
≠
deployed
≠
verified
≠
SDK-published
≠
Scenario-usable
```

A capability becomes available only after all required delivery gates are satisfied.

---

## 29. Platform release safety remains a P0 concern

Before broad schema-dependent production promotion, there should be reproducible evidence for:

- clean database installation;
- upgrade from deployed baseline;
- migration integrity;
- RLS;
- privileged-function access;
- storage isolation;
- cross-organization denial;
- role allow/deny;
- role demotion;
- revocation;
- exact candidate binding;
- rollback evidence.

Authorization acceptance should use authenticated synthetic identities.

Service-role-only checks are not sufficient proof of tenant isolation.

---

## 30. What belongs where

Use this table before making changes.

| Change | Owner |
|---|---|
| New Stage | Scenario |
| Manager business instructions | Scenario |
| New Staff role | Scenario |
| Staff Skill | Scenario |
| Source strategy | Scenario |
| Final report contract | Scenario |
| Existing Action added to Stage | Scenario |
| New provider | Platform |
| New Connection | Platform |
| New Lane | Platform |
| New Action | Platform |
| Generic Table infrastructure | Platform |
| Runtime execution | Platform |
| Leasing/retries/recovery | Platform |
| Credits/billing | Platform |
| Generic approval infrastructure | Platform |
| WorldBC CRM mapping | Operating Brain |
| WorldBC operational policy revalidation | Operating Brain |
| WorldBC CRM mutation | Operating Brain |
| WorldBC communication execution | Operating Brain |
| WorldBC reusable pricing/policies/playbooks | Company Brain Knowledge |
| Meeting-specific logic | Meeting product |
| Data Room-specific behavior | Data Room product |

---

## 31. Important things not to do

Do not:

- put provider credentials in Scenarios;
- put Department-specific business Stages in Platform code;
- let Staff change the workflow;
- let a Brain become a second Manager;
- let Make.com become the workflow authority;
- let a Scenario call WorldBC CRM directly to bypass the Brain;
- treat Knowledge as authorization for an external action;
- treat technical failure as business zero-result;
- allow caller-supplied tenant IDs to determine authority;
- allow browser approval booleans to authorize sensitive Actions;
- publish a Scenario before required Platform Actions are deployed;
- treat a draft PR as production capability;
- change an already-released Scenario version in place;
- duplicate the same operational authority in several systems.

---

## 32. Make.com clarification

An **Apastrof Scenario** and a **Make.com scenario** are completely different concepts.

Apastrof Scenario:

```text
signed AI Department behavior contract
```

Make.com scenario:

```text
optional external automation/executor
```

If Make is used, it remains an implementation mechanism behind a governed Platform Action.

It must not become the AI Department workflow authority.

---

## 33. Production flow example

A fully working Department request should look like this:

```text
Human request
        ↓
Platform authenticates user
        ↓
Work Item created/reused
        ↓
Work Item pins Scenario release
        ↓
AI Manager receives request
        ↓
Manager selects signed route
        ↓
Stage starts
        ↓
Manager delegates bounded Staff
or calls allowed Action
        ↓
Platform validates Action permission
        ↓
Connection / provider / Brain executes
        ↓
typed result returns
        ↓
Manager evaluates result
        ↓
accepted Output persisted
        ↓
next signed Stage
        ↓
final Output
        ↓
Work Item completed
        ↓
final Manager message/report
```

For an email-linked request, final completion delivery should happen only after the exact final Output and completed Work Item are durable.

Email is a projection of completion, not the source of completion state.

---

## 34. Example with WorldBC Operating Brain

```text
Human:
"Continue this BizOp and contact the correct company if permitted."

        ↓

AI Department Manager

        ↓

operating_query

        ↓

WorldBC Operating Brain

        ↓

AppSheet / operational state / communication evidence

        ↓

typed evidence returned

        ↓

Manager reasons using:
Operational evidence
+
Company Brain policy
+
Scenario instructions

        ↓

email preflight Action

        ↓

Operating Brain checks:
policy
sender
history
duplicate risk
approval / standing authority
idempotency

        ↓

if blocked:
typed blocked result

if authorized:
one governed dispatch

        ↓

receipt Action

        ↓

exact dispatch finality

        ↓

Manager completes case
```

That is the intended architecture.

---

## 35. Development roadmap

### P0 — Finish Platform release safety

Complete authenticated migration/isolation acceptance.

Definition of done:

- reproducible evidence;
- cross-organization isolation proven;
- role revocation proven;
- migrations verified;
- candidate bound to evidence;
- rollback proven.

### P1 — Add WorldBC Operating Brain capabilities to Platform

Implement:

```text
Connection
→ WorldBC Operating Brain

Lane
→ governed WorldBC operations

Actions
→ operating_capabilities
→ operating_query
→ email_executor_bizops_first_contact
→ governed_dispatch_receipt
```

Requirements:

- strict schemas;
- trusted tenant resolution;
- server-side credentials;
- approval enforcement;
- idempotency;
- reconcile-before-retry;
- sanitized results;
- receipts;
- usage/audit;
- cross-organization denial.

### P2 — Publish the new capability catalog

After production verification:

```text
Platform
   ↓
new immutable SDK catalog
   ↓
Scenarios
```

Do not manually edit the Scenario capability catalog.

### P3 — Finish WorldBC BizOps Scenario

Replace the current empty Action/Connection set with the exact verified Action IDs.

Test:

- eligible case;
- blocked case;
- stale data;
- missing data;
- duplicate callback;
- timeout after provider acceptance;
- receipt recovery;
- same-key replay;
- same-key changed-payload conflict;
- cross-organization denial;
- missing Connection;
- policy denial;
- approval denial.

Only then move BizOps out of draft.

### P4 — Finish Origination Match 10.1

Run current full-path evaluation and validate:

- final completion report;
- final completion email;
- Company/Contact references;
- no-outreach boundary;
- recovery behavior;
- exact release identity.

Publish only if the exact release passes.

### P5 — Rationalize WorldBC operational Scenarios

WorldBC currently has multiple operational Scenario concepts.

Before making all of them autonomous, define clean responsibility boundaries so two Departments cannot independently trigger the same external operation for the same business reason.

### P6 — Expand Platform capabilities only from real demand

Future capabilities may include:

- Company Brain Knowledge;
- Meeting Intelligence;
- Calendar;
- Data Room;
- Supplier Development;
- Finance;
- additional CRM operations;
- communications;
- additional research providers.

Do not prebuild a massive generic Tool surface.

A real Scenario requirement should drive each capability.

---

## 36. Definition of done for a Platform Action

A Platform Action is not done because it appears in the UI.

It is done when:

- contract defined;
- schemas defined;
- risk classified;
- credentials governed;
- tenant isolation implemented;
- approval policy implemented;
- billing policy implemented when necessary;
- idempotency implemented;
- retry policy implemented;
- adapter implemented;
- fixtures implemented;
- tests pass;
- deployment succeeds;
- production call verified;
- secret redaction verified;
- audit verified;
- SDK catalog published.

---

## 37. Definition of done for a Scenario

A Scenario is not done because its manifest validates.

It is done when:

- business process is defined;
- Stages make sense to a human;
- Manager responsibilities are defined;
- Staff responsibilities are bounded;
- Skills are versioned;
- required Tools exist;
- source strategy is defined;
- Outputs are typed;
- completion is defined;
- blocked/no-result behavior is defined;
- approval boundaries are defined;
- recovery is defined;
- contract tests pass;
- evaluation passes;
- release version is unique;
- release is signed;
- Platform installs it;
- a canary Work Item succeeds.

---

## 38. Core architectural principle

Keep these boundaries intact:

```text
Scenario
= business behavior

AI Manager
= business-flow reasoning and orchestration

Staff
= bounded specialist reasoning

Platform
= security, persistence and safe execution

Action
= one executable capability

Operating Brain
= company-specific operational intelligence/execution

Company Brain
= governed reusable company knowledge

CRM / external product
= its own authoritative business data
```

Do not collapse these into one system.

---

## 39. Immediate developer mission

The next developer should not redesign the architecture.

The immediate mission is:

1. Understand the Manager-owned architecture.
2. Preserve Platform vs Scenario ownership.
3. Finish the Platform release/isolation evidence gate.
4. Implement the four WorldBC Operating Brain Actions.
5. Deploy and verify those Actions.
6. Publish them in the Scenario SDK.
7. Finish and evaluate the BizOps Scenario against them.
8. Finish and evaluate Origination Match 10.1.
9. Clarify ownership boundaries among WorldBC operational Departments.
10. Add future Tools only when a real Scenario requires them.

The target is not “more AI features.”

The target is:

> **A signed AI Department that can safely combine company Knowledge, live operational systems, external research, structured records, and governed actions under one auditable Manager-controlled workflow.**
