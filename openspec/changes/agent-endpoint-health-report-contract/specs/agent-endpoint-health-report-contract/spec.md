## ADDED Requirements

### Requirement: Hub accepts endpoint health reports

The Hub SHALL accept schema-versioned health reports for registered agent endpoints.

#### Scenario: Endpoint submits matching tenant health

- **WHEN** a registered endpoint submits a health report with matching tenant id
- **THEN** Hub stores the report
- **AND** returns the submitted checks with endpoint id and report timestamp

#### Scenario: Health report tenant mismatch is rejected

- **WHEN** a health report tenant id does not match the registered endpoint tenant
- **THEN** Hub rejects the request as `InvalidInput`
- **AND** no report is stored for that endpoint

#### Scenario: Unknown endpoint health is unavailable

- **WHEN** a health report is submitted for an unknown endpoint id
- **THEN** Hub returns a classified `Unavailable` error

### Requirement: Overview projects endpoint health

The tenant overview SHALL include the latest health report for each endpoint when one exists.

#### Scenario: Web Console reads endpoint health from overview

- **WHEN** Web Console loads tenant overview after health submission
- **THEN** the matching endpoint includes `health_report`
- **AND** the report contains structured checks and reported time

#### Scenario: Endpoint without health remains usable

- **WHEN** an endpoint has no submitted health report
- **THEN** overview still returns the endpoint
- **AND** `health_report` is absent or null

### Requirement: Health report contract remains provider neutral

The health report contract SHALL NOT require one LLM provider, repo payload, branch, commit range, or task-specific structure.

#### Scenario: Generic checks are accepted

- **WHEN** checks describe executor, workspace, inbox, artifact, or trial-run readiness
- **THEN** Hub accepts them as generic endpoint facts
- **AND** consumers can render them without knowing the provider implementation
