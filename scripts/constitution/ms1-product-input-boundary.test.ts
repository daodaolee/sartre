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

  it("records operator-provisioned MS1 auth and Markdown PRD input without expanding MS1", async () => {
    const current = await text("spec/MS1IdentityAccessSpec.md");

    expect(current).toContain("Feishu is not an MS1 Human authentication provider");
    expect(current).toContain("operator-provisioned local account");
    expect(current).toContain("Email delivery is deferred");
    expect(current).toContain("Self-service registration");
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
    expect(active).toContain("operator-provisioned local account");
    expect(active).not.toMatch(/real mail delivery|verification-mail transport/iu);
    expect(active).toContain("Markdown");
  });

  it("keeps Feishu login and outbound email outside the current Human-auth runtime and schema", async () => {
    const files = await Promise.all(
      [
        "packages/contracts/src/identity/human-auth.ts",
        "apps/hub-api/src/identity/ports.ts",
        "apps/hub-api/src/identity/human-auth.service.ts",
        "apps/hub-api/src/identity/operator-human-provisioning.service.ts",
        "apps/hub-api/src/identity/human-auth.controller.ts",
        "apps/hub-api/src/identity/postgres-human-auth.repository.ts",
      ].map(text),
    );
    const runtime = files.join("\n");
    const cleanupMigration = await text(
      "apps/hub-api/src/infrastructure/database/migrations/000006_ms1_defer_email_delivery.sql",
    );

    expect(runtime).not.toMatch(/FeishuAuthorization|FeishuOAuth/gu);
    expect(runtime).not.toMatch(/VerificationMail|requestEmailVerification|registerCompanyEmail/gu);
    expect(runtime).toContain("provisionCompanyEmail");
    expect(cleanupMigration).toContain("DROP TABLE email_verification_challenges");
    expect(cleanupMigration).not.toContain("'email_register'");
    expect(cleanupMigration).not.toContain("'email_verification'");
  });

  it("provides a non-HTTP provisioning boundary and no public registration route", async () => {
    const controller = await text("apps/hub-api/src/identity/human-auth.controller.ts");
    const packageManifest = await text("package.json");
    const provisioningCli = await text("scripts/auth/provision-human.ts");

    expect(controller).not.toMatch(/email\/register|email\/verifications/gu);
    expect(packageManifest).toContain("auth:provision-human");
    expect(provisioningCli).toContain("for await (const chunk of process.stdin)");
    expect(provisioningCli).not.toMatch(/password.*argv|console\.log\([^)]*password/giu);
  });
});
