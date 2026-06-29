## ADDED Requirements

### Requirement: Latest regression evidence is machine-checkable

The system SHALL provide a command that validates the latest regression report for a change.

#### Scenario: Valid latest report passes evidence gate

- **WHEN** `pnpm harness:evidence -- --change lane-a-service-baseline` runs after a successful regression
- **THEN** the command passes
- **AND** the report contains executable commands, evidence levels, results, and summary failures set to zero

#### Scenario: Failed latest report is rejected

- **WHEN** a latest regression report contains `- Result: FAIL` or a non-zero failure summary
- **THEN** the evidence gate fails

#### Scenario: Skipped checks require reasons

- **WHEN** a latest regression report contains `- Result: SKIP`
- **THEN** that check section must include a `- Reason:` line

#### Scenario: Structural-only reports are not enough

- **WHEN** a latest regression report contains only `STRUCTURAL_CHECK` evidence
- **THEN** the evidence gate fails
- **AND** the caller must run a regression gate that includes at least one `REAL_TEST`
