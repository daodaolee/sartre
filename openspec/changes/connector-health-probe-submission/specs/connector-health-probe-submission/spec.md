## ADDED Requirements

### Requirement: Connector builds local endpoint health reports

The Connector SHALL build a generic health report for a selected local profile using workstation facts available to the Connector process.

#### Scenario: Manual profile health report is generated

- **WHEN** a local demo `dev` or `qa` profile is probed from a writeable workspace
- **THEN** Connector returns an endpoint health report request with schema version `1.0`
- **AND** the report tenant id matches the selected profile
- **AND** the report includes executor, workspace, inbox, artifact, and trial-run checks

#### Scenario: Workspace path is not writeable

- **WHEN** Connector cannot create required `.sartre` workspace paths
- **THEN** the generated health report marks the workspace-related check as `blocked`
- **AND** the detail explains the failure without leaking secrets

### Requirement: Connector submits health through SDK boundary

The Connector SHALL submit the generated report through the public Hub SDK boundary for the selected endpoint.

#### Scenario: Health report submitted for profile endpoint

- **WHEN** a Connector profile submits health
- **THEN** Connector calls `reportEndpointHealth` with the profile endpoint id
- **AND** the submitted request uses the profile tenant id
- **AND** the returned report is passed back to the caller

#### Scenario: Hub submission failure is surfaced

- **WHEN** Hub rejects or fails the report submission
- **THEN** Connector surfaces the classified error from the SDK boundary
- **AND** it does not mark the probe as acknowledged or processed

### Requirement: Connector CLI exposes health submission

The Connector CLI SHALL expose a `health <dev|qa>` command that probes local readiness and submits the report.

#### Scenario: CLI submits QA endpoint health

- **WHEN** a user runs `connector health qa`
- **THEN** the CLI probes the QA local profile from the current workspace
- **AND** submits the report to Hub
- **AND** prints the submitted report as JSON

#### Scenario: CLI keeps command usage explicit

- **WHEN** the CLI is called without a valid profile for `health`
- **THEN** usage output includes `connector health <dev|qa>`
- **AND** no Hub call is made

### Requirement: Health probing remains provider neutral

The Connector health probe SHALL NOT require a specific LLM provider, repo payload, branch, commit range, or cross-role report structure.

#### Scenario: Mock/manual execution is sufficient for MVP

- **WHEN** a local demo profile uses `manual_confirm`
- **THEN** the probe can report trial-run readiness without invoking Codex, Claude, MCP, plugin, hook, command, or subagent execution

#### Scenario: Secret-like metadata is not emitted

- **WHEN** Connector builds metadata for health checks
- **THEN** metadata contains only non-sensitive role/profile/path facts
- **AND** no token, password, secret, api key, private key, or environment value is emitted
