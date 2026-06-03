# GCC Lab Tender Staff Operating Rules

## Source Systems

Primary GCClab CRM tables:

- `Lead`
- `Companies`
- `Contacts`
- `Tasks List`
- `LeadMatchedSuppliers`
- `LeadMatchedProducts`
- `Products_Registered`
- `LeadExtractedProducts_Request`
- `LeadExtractedProducts_Result`
- `Files Manager`
- `Docs`
- `LeadCosts`
- `BusinessOpportunities`
- `Orders`

Do not print or expose webhook tokens, AppSheet keys, OpenAI keys, Outlook credentials, or private CRM credentials.

## Task Categories

Task categories are:

- `Human Decision`
- `Manager Guidance`
- `System Audit`
- `Technical Bug`
- `Outreach Safety`
- `Tender Work`
- `Research Work`

Task types include:

- `Lead Review`
- `Tender Document Review`
- `Fit / Eligibility`
- `Supplier Match`
- `Supplier Discovery`
- `Quotation Outreach`
- `Tender Package`
- `Follow-up`
- `CRM Health`
- `Report`

## Decision Priority

Rank next actions in this order:

1. Tender closing dates or Q&A deadlines at risk.
2. Supplier quotes or partner replies needed for a viable Lead.
3. Leads with complete documents waiting for fit/eligibility.
4. Tender packages blocked by one missing file or quote.
5. Supplier discovery gaps.
6. CRM/data integrity issues that block the workflow.
7. Long-range monitor items.

## Approval Gates

Always require manual review for:

- supplier outreach when approval is not clear;
- repeated supplier/contact recipients;
- formal tender portal submission;
- LinkedIn outreach;
- finalizing a tender package as submitted;
- bid/no-bid choices with material commercial or compliance risk.

Never require approval for:

- evidence collection;
- tender document extraction;
- draft generation;
- supplier mapping that does not contact anyone;
- local CRM health checks.

## Lead Stage Model

Standard flow:

`Lead Received -> Tender Docs Reviewed -> Fit / Eligibility Checked -> Supplier Match Needed -> Quotation Requested -> Tender Package In Progress -> Tender Package Ready -> Submitted / Waiting`

Failure/blocker statuses:

- `Blocked - Missing Tender Evidence`
- `Blocked - Supplier Match Missing`
- `Blocked - Quote Missing`
- `Blocked - Package Incomplete`
- `Blocked - Attachment Verification Failed`
- `Needs Human Review - Duplicate Recipient`
- `Needs Human Review - Bid Decision`
- `Cancelled`
- `No Further Action`

## Follow-Up Rule

Every active Lead waiting on a supplier, partner, client, tender owner, quote, document, or manager decision must have a due follow-up unless it is terminal: `Done`, `Cancelled`, `Closed`, `Submitted`, or `No Further Action`.
