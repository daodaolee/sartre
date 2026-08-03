import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

async function text(path: string): Promise<string> {
  return readFile(resolve(ROOT, path), "utf8");
}

describe("MS1 Feishu OAuth protocol authority", () => {
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

  it("records the exact approved Feishu protocol as a task-specific spec", async () => {
    const current = await text("spec/MS1IdentityAccessSpec.md");

    expect(current).toContain("supersedes only");
    expect(current).toContain("Authorization Code + PKCE");
    expect(current).toContain("S256");
    expect(current).toContain("single-use state");
    expect(current).toContain("exact redirect URI");
    expect(current).toContain("single-use authorization code");
    expect(current).toContain("tenant_key");
    expect(current).toContain("must not claim provider nonce validation");
    expect(current).toContain("https://accounts.feishu.cn/open-apis/authen/v1/authorize");
    expect(current).toContain("https://open.feishu.cn/open-apis/authen/v2/oauth/token");
    expect(current).toContain("https://open.feishu.cn/open-apis/authen/v1/user_info");
  });

  it("keeps the active plan and OpenSpec aligned with the current provider contract", async () => {
    const files = await Promise.all(
      [
        "docs/superpowers/plans/2026-07-31-ms1-identity-workspace-tenant-boundary.md",
        "openspec/changes/ms1-identity-workspace-tenant-boundary/design.md",
        "openspec/changes/ms1-identity-workspace-tenant-boundary/scenarios.md",
      ].map(text),
    );
    const active = files.join("\n");

    expect(active).not.toMatch(/state\s*[+/]\s*nonce|state\/nonce/iu);
    expect(active).toContain("PKCE S256");
    expect(active).toContain("exact redirect");
    expect(active).toContain("single-use code");
    expect(active).toContain("tenant_key");
  });

  it("does not require a provider-returned nonce in the production port or service", async () => {
    const ports = await text("apps/hub-api/src/identity/ports.ts");
    const service = await text("apps/hub-api/src/identity/human-auth.service.ts");

    expect(ports).not.toMatch(/\bnonce\b/iu);
    expect(service).not.toMatch(/providerIdentity\.nonce|nonceHash/iu);
  });
});
