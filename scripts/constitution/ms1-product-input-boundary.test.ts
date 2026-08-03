import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

async function text(path: string): Promise<string> {
  return readFile(resolve(ROOT, path), "utf8");
}

describe("MS1 authentication and future product-input authority", () => {
  it("preserves the immutable imported Hub API specification", async () => {
    const manifest = JSON.parse(await text("reference/spec-import-manifest.json")) as {
      entries: Array<{ target: string; sha256: string }>;
    };
    const imported = manifest.entries.find((entry) => entry.target === "spec/HubApiSpec.md");
    expect(imported).toBeDefined();

    const digest = createHash("sha256")
      .update(await text("spec/HubApiSpec.md"))
      .digest("hex");
    expect(digest).toBe(imported?.sha256);
  });

  it("records company-email-only MS1 auth and Markdown PRD input without expanding MS1", async () => {
    const current = await text("spec/MS1IdentityAccessSpec.md");

    expect(current).toContain("Feishu is not an MS1 Human authentication provider");
    expect(current).toContain("verified company email");
    expect(current).toContain("Markdown file");
    expect(current).toContain("Feishu document connector is deferred");
    expect(current).toContain("does not bring Requirement into MS1");
  });

  it("removes Feishu login and provider staging from the active MS1 plan and OpenSpec", async () => {
    const files = await Promise.all(
      [
        "docs/superpowers/plans/2026-07-31-ms1-identity-workspace-tenant-boundary.md",
        "openspec/changes/ms1-identity-workspace-tenant-boundary/proposal.md",
        "openspec/changes/ms1-identity-workspace-tenant-boundary/design.md",
        "openspec/changes/ms1-identity-workspace-tenant-boundary/scenarios.md",
        "openspec/changes/ms1-identity-workspace-tenant-boundary/tasks.md",
      ].map(text),
    );
    const active = files.join("\n");

    expect(active).not.toMatch(/Feishu OAuth|Feishu PKCE|provider staging|oauth-rejection/iu);
    expect(active).toContain("verified company email");
    expect(active).toContain("Markdown");
  });

  it("keeps Feishu login outside the current Human-auth runtime and schema", async () => {
    const files = await Promise.all(
      [
        "packages/contracts/src/identity/human-auth.ts",
        "apps/hub-api/src/identity/ports.ts",
        "apps/hub-api/src/identity/human-auth.service.ts",
        "apps/hub-api/src/identity/human-auth.controller.ts",
        "apps/hub-api/src/identity/postgres-human-auth.repository.ts",
      ].map(text),
    );
    const runtime = files.join("\n");
    const cleanupMigration = await text(
      "apps/hub-api/src/infrastructure/database/migrations/000005_ms1_defer_feishu_login.sql",
    );

    expect(runtime).not.toMatch(/FeishuAuthorization|FeishuOAuth/gu);
    expect(cleanupMigration).toContain("DROP TABLE oauth_login_attempts");
    expect(cleanupMigration).toContain("email_verification");
    expect(cleanupMigration).not.toContain("oauth_start");
  });
});
