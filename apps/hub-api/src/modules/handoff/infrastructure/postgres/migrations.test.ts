import pg from "pg";
import { describe, expect, it } from "vitest";

const { Pool } = pg;
const connectionString =
  process.env.DATABASE_URL ?? "postgresql://xy@localhost:55432/sartre_hub";

describe("Handoff Hub migrations", () => {
  it("runs idempotently and records applied migrations", async () => {
    const { runHandoffMigrations } = await import("./migrations");

    const first = await runHandoffMigrations({
      connectionString,
    });
    const second = await runHandoffMigrations({
      connectionString,
    });

    expect(first.existing).toContain("001_handoff_hub_foundation.sql");
    expect(first.existing).toContain("002_delivery_events_replay_index.sql");
    expect(first.existing).toContain("003_agent_endpoint_health_reports.sql");
    expect(first.existing).toContain(
      "004_agent_endpoint_capability_manifest.sql",
    );
    expect(first.existing).toContain("005_platform_chat_runtime.sql");
    expect(second.applied).toEqual([]);
    expect(second.existing).toContain("001_handoff_hub_foundation.sql");
    expect(second.existing).toContain("002_delivery_events_replay_index.sql");
    expect(second.existing).toContain("003_agent_endpoint_health_reports.sql");
    expect(second.existing).toContain(
      "004_agent_endpoint_capability_manifest.sql",
    );
    expect(second.existing).toContain("005_platform_chat_runtime.sql");

    const pool = new Pool({ connectionString });
    try {
      const structures = await pool.query<{ relname: string }>(
        `
          select relname
          from pg_class
          where relname in (
            'delivery_cursor_seq',
            'agent_endpoints',
            'handoffs',
            'deliveries',
            'artifacts',
            'delivery_events',
            'agent_endpoint_health_reports',
            'agent_endpoint_health_reports_tenant_idx',
            'handoff_schema_migrations',
            'delivery_events_endpoint_cursor_idx',
            'conversation_ledgers',
            'conversation_messages',
            'conversation_tool_invocations',
            'conversation_summary_checkpoints',
            'conversation_context_projections',
            'conversation_model_runs'
          )
        `,
      );

      expect(structures.rows.map((row) => row.relname)).toEqual(
        expect.arrayContaining([
          "delivery_cursor_seq",
          "agent_endpoints",
          "handoffs",
          "deliveries",
          "artifacts",
          "delivery_events",
          "agent_endpoint_health_reports",
          "agent_endpoint_health_reports_tenant_idx",
          "handoff_schema_migrations",
          "delivery_events_endpoint_cursor_idx",
          "conversation_ledgers",
          "conversation_messages",
          "conversation_tool_invocations",
          "conversation_summary_checkpoints",
          "conversation_context_projections",
          "conversation_model_runs",
        ]),
      );
    } finally {
      await pool.end();
    }
  });
});
