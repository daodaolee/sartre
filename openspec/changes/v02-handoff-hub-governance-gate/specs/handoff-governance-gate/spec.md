## ADDED Requirements

### Requirement: V0.2 goals have a complete governance chain

Every non-trivial v0.2 Handoff Hub goal MUST have an OpenSpec change, BDD feature, acceptance checklist, PLAN_LEDGER, checkpoint report, and fresh verification evidence before it is marked complete.

#### Scenario: New v0.2 goal starts

- **WHEN** a v0.2 Handoff Hub goal introduces or changes behavior across service, web console, connector, SDK, contracts, or deployment boundary
- **THEN** the repository contains matching OpenSpec, BDD, acceptance, report ledger, and goal artifacts for that change

#### Scenario: Goal completion is claimed

- **WHEN** the goal closeout claims the goal is complete
- **THEN** the closeout lists fresh verification commands and evidence levels for each relevant gate

### Requirement: BDD scenarios map to executable evidence

Every v0.2 BDD scenario MUST state its evidence level and reference executable tests, smoke scripts, structural checks, skipped reasons, or manual requirements.

#### Scenario: BDD scenario has executable coverage

- **WHEN** a BDD scenario is marked `REAL_TEST`
- **THEN** it references a command or test file that was executed and can fail

#### Scenario: BDD scenario is not automated

- **WHEN** a BDD scenario cannot be proven by an executable test in the current goal
- **THEN** it is marked `STRUCTURAL_CHECK`, `SKIPPED`, or `MANUAL_REQUIRED` with a concrete reason

### Requirement: V0.2 regression gate is executable

The system MUST provide a scoped regression gate that can run without requiring non-candidate cleanup.

#### Scenario: Governance regression runs

- **WHEN** `CHANGE_NAME=v02-handoff-hub-governance-gate pnpm harness:regression` is executed
- **THEN** it runs the v0.2 scoped checks for OpenSpec, BDD, acceptance, PostgreSQL 17 connectivity, package tests, architecture boundary, lint, builds, demo, secret scan, and scoped diff check

#### Scenario: Historical full-repo issues exist

- **WHEN** full repo lint, build, or diff checks fail because of current candidate boundary files outside the v0.2 scope
- **THEN** the gate reports those as scoped-out non-candidate blockers rather than current candidate regression failures

### Requirement: Handoff Hub service foundation remains isolated from clients

The v0.2 governance gate MUST verify that shared packages and clients do not depend on server internals.

#### Scenario: Architecture boundary check passes

- **WHEN** the v0.2 regression gate runs
- **THEN** `packages/domain` has no NestJS, PostgreSQL, HTTP, or filesystem dependency, and `apps/web-console` plus `apps/connector-cli` do not import `apps/hub-api/src/**`

### Requirement: PostgreSQL 17 is the default local database toolchain

The v0.2 governance gate MUST verify PostgreSQL 17 for local development and MUST NOT use PostgreSQL 18 as the default.

#### Scenario: PostgreSQL toolchain is checked

- **WHEN** the v0.2 regression gate runs on the local development machine
- **THEN** it confirms `/Library/PostgreSQL/17/bin/psql` is available, reports version 17.x, and verifies `postgresql://xy@localhost:55432/sartre_hub`
