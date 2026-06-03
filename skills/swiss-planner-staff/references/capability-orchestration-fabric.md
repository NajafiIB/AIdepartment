# GCC Lab Tender Capability Orchestration Fabric

The department follows this model:

`Solution module -> Capability -> Recipe -> Stage -> Lane -> Quality gate -> Output`

Supporting inputs feed stage/lane execution:

`Databases + Connections + AI Support -> Stage/Lane`

## Local Registry

The local source of truth is:

`swiss_planner_command_center/capability_fabric.json`

The Command Center exposes it through:

- `/api/dashboard` as `capabilityFabric`
- `/api/capability-fabric`
- `/api/fabric-note?section=...` for editable Markdown operating notes

## Vocabulary

- Solution module: the user-facing GCC lab tender Lead department.
- Capability: a reusable business function, such as Lead review, fit analysis, supplier mapping, quotation outreach, or tender package preparation.
- Recipe: an operating plan for one capability.
- Stage: an ordered step inside a recipe.
- Lane: a focused execution path inside a stage.
- Connections: external providers and integrations.
- Databases: local, CRM, files, Drive, or derived data assets.
- AI Support: model/runtime support attached to a capability or recipe.
- Quality gate: the rule that decides whether a stage can continue.
- Output: saved Lead brief, supplier shortlist, quote log, tender package, report, or task/thread.

## Staff Mapping

AI staff are lanes/agents that execute capability work. They are not the business capabilities themselves.

Examples:

- `opportunity_discovery` now represents tender Lead intake; `AIstaff_OpportunityHunter` / Ava owns the first document review.
- `fit_assessment` represents GCC lab fit, eligibility, and supplier/partner matching; Leo owns it.
- `professor_research_intelligence` now represents supplier discovery and mapping; Nadia owns it.
- `application_package_generation` now represents tender package preparation; Maya owns it.
- `outreach_email` now represents supplier quotation outreach; Omar owns it.

## Manager Rule

Alex routes by capability first, then recipe/stage/lane, then staff assignment. When unsure, Alex creates a task/thread rather than hardcoding a provider or directly contacting a supplier.

## Extension Rule

Before adding a new staff member, connector, automation, or document workflow, update the COF registry:

1. Add or reuse a capability.
2. Add or reuse a recipe.
3. Define ordered stages.
4. Map lanes to connections, databases, AI support, and quality gates.
5. Define the output.
6. Assign the responsible staff/agent.
