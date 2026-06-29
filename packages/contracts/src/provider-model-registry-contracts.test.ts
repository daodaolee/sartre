import { describe, expect, it } from "vitest";
import {
  providerModelHealthReportRequestSchema,
  providerModelHealthReportSchema,
  providerModelProfileSchema,
  providerModelRegistryListResponseSchema,
  providerModelSelectionResponseSchema,
  registerProviderModelProfileRequestSchema,
  resolveProviderModelSelectionRequestSchema,
} from "./index";

const observedAt = "2026-06-25T11:00:00.000Z";

describe("provider model registry contracts", () => {
  it("accepts endpoint-scoped provider model profiles without provider secrets", () => {
    const profile = providerModelProfileSchema.parse({
      id: "profile_dev_codex",
      schema_version: "1.0",
      tenant_id: "local-demo",
      agent_endpoint_id: "dev_codex_local",
      provider: "codex",
      model: "codex-cli",
      label: "Codex CLI",
      executor: {
        kind: "codex_cli",
        label: "Codex CLI",
        command: "codex",
      },
      capabilities: ["chat", "streaming", "tool_use", "local_command"],
      context_window: 200000,
      max_output_tokens: 8192,
      default_for_endpoint: true,
      status: "available",
      created_at: observedAt,
      updated_at: observedAt,
      metadata: { source: "local-connector" },
    });

    expect(profile).not.toHaveProperty("api_key");
    expect(profile).not.toHaveProperty("provider_session_id");
    expect(profile).not.toHaveProperty("rendered_context");
  });

  it("rejects secret-like profile and health metadata", () => {
    expect(
      registerProviderModelProfileRequestSchema.safeParse({
        schema_version: "1.0",
        tenant_id: "local-demo",
        agent_endpoint_id: "dev_codex_local",
        provider: "codex",
        model: "codex-cli",
        label: "Codex CLI",
        executor: { kind: "codex_cli", label: "Codex CLI" },
        capabilities: ["chat"],
        default_for_endpoint: true,
        metadata: { api_key: "sk-secret" },
      }).success,
    ).toBe(false);

    expect(
      providerModelHealthReportRequestSchema.safeParse({
        schema_version: "1.0",
        tenant_id: "local-demo",
        profile_id: "profile_dev_codex",
        status: "passed",
        checks: [
          {
            key: "codex",
            label: "Codex CLI",
            status: "passed",
            detail: "Codex CLI is available",
            observed_at: observedAt,
            metadata: { token_hint: "secret-value" },
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("accepts profile registration, health report, registry list, and selection commands", () => {
    const registerRequest = registerProviderModelProfileRequestSchema.parse({
      schema_version: "1.0",
      tenant_id: "local-demo",
      agent_endpoint_id: "qa_codex_local",
      provider: "anthropic",
      model: "claude-code",
      label: "Claude Code",
      executor: {
        kind: "claude_code",
        label: "Claude Code",
        command: "claude",
      },
      capabilities: ["chat", "streaming", "tool_use"],
      context_window: 200000,
      max_output_tokens: 8192,
      default_for_endpoint: true,
      status: "available",
      metadata: { source: "qa-profile" },
    });

    expect(registerRequest.capabilities).toContain("tool_use");

    const health = providerModelHealthReportSchema.parse({
      id: "health_1",
      schema_version: "1.0",
      tenant_id: "local-demo",
      profile_id: "profile_qa_claude",
      status: "passed",
      checks: [
        {
          key: "command",
          label: "Executor command",
          status: "passed",
          detail: "Claude Code is available",
          observed_at: observedAt,
        },
      ],
      reported_at: observedAt,
    });

    const profile = providerModelProfileSchema.parse({
      id: "profile_qa_claude",
      schema_version: "1.0",
      tenant_id: "local-demo",
      agent_endpoint_id: "qa_codex_local",
      provider: "anthropic",
      model: "claude-code",
      label: "Claude Code",
      executor: registerRequest.executor,
      capabilities: registerRequest.capabilities,
      context_window: 200000,
      max_output_tokens: 8192,
      default_for_endpoint: true,
      status: "available",
      latest_health: health,
      created_at: observedAt,
      updated_at: observedAt,
    });

    expect(
      providerModelRegistryListResponseSchema.safeParse({
        schema_version: "1.0",
        tenant_id: "local-demo",
        endpoint_id: "qa_codex_local",
        default_profile_id: profile.id,
        profiles: [profile],
      }).success,
    ).toBe(true);

    expect(
      resolveProviderModelSelectionRequestSchema.safeParse({
        schema_version: "1.0",
        tenant_id: "local-demo",
        endpoint_id: "qa_codex_local",
        required_capabilities: ["chat", "tool_use"],
        min_context_window: 16000,
      }).success,
    ).toBe(true);

    expect(
      providerModelSelectionResponseSchema.safeParse({
        schema_version: "1.0",
        tenant_id: "local-demo",
        endpoint_id: "qa_codex_local",
        selected_profile: profile,
        selected_profile_id: profile.id,
        required_capabilities: ["chat", "tool_use"],
        selection_reason: "default_profile_matched",
      }).success,
    ).toBe(true);
  });
});
