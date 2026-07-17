# MS0 Repository Constitution Proposal

## Outcome

MS0 establishes a clean production repository in which an internal developer can start the
Electron shell, Hub API, Hub Worker, and Local Runtime and see their four-process health state.
The repository fails closed when required tools, dependencies, evidence, or Secret boundaries are
not satisfied.

## Non-goals

MS0 does not implement identity, Workspace membership, Requirement, Session, chat, Agent
execution, Steward behavior, or legacy compatibility. A health surface is not a substitute for any
of those later product capabilities, and MS0 does not claim production readiness.

## Source of truth

The imported `spec/`, `workflow/`, approved design/ADR/schema documents, active MS0 plan, and
PLAN_LEDGER form the authority chain defined by the root `AGENTS.md`. Legacy source remains
reference-only and NO-GO.
