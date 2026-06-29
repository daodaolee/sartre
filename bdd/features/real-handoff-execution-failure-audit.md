# Feature: Real handoff execution and failure audit

Sartre needs local role-Agent execution to be observable from Hub facts, both when Codex succeeds and when Codex fails.

## Scenario: Accepted handoff reaches report ready

- **Given** Dev sends a handoff to QA
- **And** QA accepts the delivery for local Agent execution
- **When** the Connector executes the delivery with the real Codex CLI executor
- **Then** Hub records the delivery as running
- **And** Hub stores conversation, context projection, succeeded model run, and report artifact facts
- **And** the delivery becomes report ready

## Scenario: Codex failure is auditable

- **Given** a delivery is accepted and Connector has started execution
- **When** the Codex executor fails
- **Then** Connector records a failed model run with classified error metadata
- **And** Connector marks the delivery failed through the public Hub API
- **And** Web Console overview can show the failed delivery event and safe failure reason

## Scenario: Secret-like failure text is redacted

- **Given** a Codex failure message includes token, secret, API key, or private key text
- **When** Connector writes failure facts to Hub
- **Then** persisted metadata and delivery failure reason contain a safe redacted message
- **And** raw secret-like text is not stored through Connector writeback
