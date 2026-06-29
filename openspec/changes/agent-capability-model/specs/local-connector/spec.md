## ADDED Requirements

### Requirement: Connector profiles declare capability sources
The Local Connector SHALL expose capability sources from each local profile and include them when registering an Agent endpoint.

#### Scenario: QA connector registers skill and hook sources
- **WHEN** QA runs `connector connect qa`
- **THEN** the registration request includes QA skill, hook, command or manual prompt capability sources alongside flat capabilities

#### Scenario: Dev connector registers developer sources
- **WHEN** Dev runs `connector connect dev`
- **THEN** the registration request includes developer-oriented capability sources without requiring QA-specific fields

### Requirement: Connector prepares agent-readable context from sources
The Local Connector SHALL include declared capability source context in the local inbox so Codex, Claude, command, or a human can understand what local abilities are available.

#### Scenario: Inbox describes available capability sources
- **WHEN** the Connector writes `.sartre/inbox/<handoff-id>/handoff.md`
- **THEN** the file includes an Agent capabilities section listing enabled source names, types, and capabilities

### Requirement: Connector health checks cover capability sources
The Local Connector SHALL report whether declared local capability sources are available enough for the selected approval policy.

#### Scenario: Command source can be blocked
- **WHEN** a command capability source fails its readiness check
- **THEN** the endpoint health report includes a blocked or warning check for that source without exposing secrets

#### Scenario: Manual prompt source is always readable
- **WHEN** a profile uses a manual prompt capability source
- **THEN** the endpoint health report marks the source as passed and describes it as user-confirmed execution
