# Feature: Platform Chat Runtime

Evidence status: `SCENARIO_REGISTERED`

## Scenario: provider switch keeps canonical conversation history

Given a Sartre conversation ledger owned by `dev_codex_local`
And the ledger contains user and assistant messages created before a provider switch
When a later model run targets another provider and model
Then the conversation id remains unchanged
And the canonical messages remain readable without either provider session id
And the model run records the provider/model separately from the ledger identity

## Scenario: context projection is rebuilt from ledger facts

Given a conversation with messages, a summary checkpoint, and a handoff artifact reference
When the system creates a context projection for a provider/model pair
Then the projection records selected message ids, summary checkpoint ids, reference ids, token budget, and rendered context
And the projection can be traced back to the original ledger facts

## Scenario: endpoint identity scopes the Web Console conversation view

Given two local endpoint identities exist in the same tenant
When the Web Console selected endpoint changes
Then the conversation list refreshes for that endpoint
And conversations unrelated to that endpoint are not shown
