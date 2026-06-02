# Swiss Planner Capability Orchestration Fabric

Swiss Planner follows the same operating model used in the Musahama Capability Orchestration Fabric:

`Solution module -> Capability -> Recipe -> Stage -> Lane -> Quality gate -> Output`

Supporting inputs feed stage/lane execution:

`Databases + Connections + AI Support -> Stage/Lane`

## Local Registry

The local source of truth is:

`C:\Users\sonse\Documents\Codex\2026-05-13\i-have-the-following-google-sheet\swiss_planner_command_center\capability_fabric.json`

The Command Center exposes it through:

- `/api/dashboard` as `capabilityFabric`
- `/api/capability-fabric`
- `/api/fabric-note?section=...` for editable Markdown operating notes

## Editable Operating Notes

The JSON registry keeps the machine-readable IDs and relationships. Human-friendly operating guidance is stored in `operatingNotes` inside the same registry and edited from:

`Department Explorer -> Department Settings`

Current note sections:

- `workMap`: responsibilities, recipes, stages, handoffs, and outputs.
- `lanesTools`: how each lane/tool is used, input/output expectations, failure handling, and evidence.
- `qualityGates`: pass/fail rules, blocker handling, and checklist wording.
- `dataConnectors`: connectors, databases, write permissions, and sync rules.
- `aiBrain`: model level, reasoning effort, and cost/safety policy.
- `outputTemplates`: expected deliverables and evidence/naming rules.
- `learningLibrary`: how approved learnings move from threads to role files.

## Vocabulary

- Solution module: the user-facing department or product area.
- Capability: a reusable business function, such as opportunity discovery or outreach email.
- Recipe: an operating plan for one capability.
- Stage: an ordered step inside a recipe.
- Lane: a focused execution path inside a stage. Lanes are not separate modules or capabilities.
- Connections: external providers and integrations.
- Databases: local, Google Sheet, Drive, or derived data assets.
- AI Support: model/runtime support attached to a capability or recipe.
- Quality gate: the rule that decides whether a stage can continue.
- Output: saved operational record, package, email log, report, or task/thread.

## Staff Mapping

AI staff are lanes/agents that execute capability work. They are not the business capabilities themselves.

Examples:

- `opportunity_discovery` is a capability; `AIstaff_OpportunityHunter` is the owning execution staff.
- `application_package_generation` is a capability; `AIstaff_ApplicationPackMaker` is the owning execution staff.
- `outreach_email` is a capability; `AIstaff_ApplicationPackSender` is the owning execution staff.

## Manager Rule

The Manager must route by capability first, then recipe/stage/lane, then staff assignment. When unsure, the Manager creates a task/thread rather than hardcoding a provider or directly sending an email.

## Extension Rule

Before adding a new staff member, connector, automation, or document workflow, update the COF registry:

1. Add or reuse a capability.
2. Add or reuse a recipe.
3. Define ordered stages.
4. Map lanes to connections, databases, AI support, and quality gates.
5. Define the output.
6. Assign the responsible staff/agent.
