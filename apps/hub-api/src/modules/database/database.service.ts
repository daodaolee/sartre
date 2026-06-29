import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import pg from "pg";
import { runHandoffMigrations } from "../handoff/infrastructure/postgres/migrations";

const { Pool } = pg;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? "postgresql://xy@localhost:55432/sartre_hub",
  });

  async onModuleInit() {
    await this.ensureSchema();

    if (process.env.SARTRE_TEST_RESET === "true") {
      await this.reset();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  private async ensureSchema() {
    await runHandoffMigrations({ pool: this.pool });
  }

  private async reset() {
    await this.pool.query(`
      truncate table
        provider_model_health_reports,
        provider_model_profiles,
        conversation_model_runs,
        conversation_context_projections,
        conversation_summary_checkpoints,
        conversation_tool_invocations,
        conversation_messages,
        conversation_ledgers,
        agent_endpoint_health_reports,
        delivery_events,
        artifacts,
        deliveries,
        handoffs,
        agent_endpoints
      restart identity cascade;
      alter sequence delivery_cursor_seq restart with 1;
    `);
  }
}
