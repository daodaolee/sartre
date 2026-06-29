# Feature: Real Codex executor adapter

Sartre needs a local role Agent to run an accepted delivery through the user's Codex CLI while Hub remains the durable fact source.

## Scenario: Explicit real executor invocation

- **Given** a role delivery has already been accepted for execution
- **When** the connector runs the delivery with real Codex executor selection
- **Then** the connector invokes the local Codex CLI adapter
- **And** the resulting execution output can be written back through the existing SDK lifecycle
- **And** no first-class computer product object is introduced

## Scenario: Fake executor remains the deterministic default

- **Given** a developer runs connector tests or a local demo without selecting real Codex
- **When** the connector executes a delivery
- **Then** the fake executor is used
- **And** no Codex process is spawned

## Scenario: Local Codex cannot run

- **Given** the local Codex CLI is missing, unauthenticated, rate-limited, or times out
- **When** the real executor attempts a run
- **Then** the result is classified with a stable error category
- **And** secret-like values are redacted from user-visible messages
- **And** smoke evidence is labeled `SKIPPED` or failed honestly instead of reported as a passing real test
