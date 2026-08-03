import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateOpenSpec } from "./openspec-validation.js";

function createOpenSpecFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "sartre-openspec-"));
  const change = join(root, "openspec/changes/ms0-repository-constitution");
  mkdirSync(change, { recursive: true });
  writeFileSync(
    join(change, "proposal.md"),
    "Electron Hub API Hub Worker Local Runtime\nnon-goals\nidentity Requirement Session Agent\nexecution\n",
  );
  writeFileSync(
    join(change, "design.md"),
    "repository evidence database health diagnostics Electron trust boundary\n",
  );
  writeFileSync(
    join(change, "tasks.md"),
    Array.from({ length: 9 }, (_, index) => `${index + 1}. Task ${index + 1}`).join("\n"),
  );
  writeFileSync(
    join(change, "scenarios.md"),
    [
      "positive",
      "rejection root_packaging_prohibited",
      "concurrency migration_lock_timeout",
      "dependency failure dependency_unavailable",
      "Secret secret_boundary_violation",
      "packaged app secret_artifact_violation",
      "recovery process_recovered",
    ].join("\n"),
  );
  return root;
}

function writeMs1Change(root: string, scenarios = ""): void {
  const change = join(root, "openspec/changes/ms1-identity-workspace-tenant-boundary");
  mkdirSync(change, { recursive: true });
  writeFileSync(
    join(change, "proposal.md"),
    "Identity Workspace Endpoint RLS\nnon-goals\nRequirement Session Agent Lease Steward\n",
  );
  writeFileSync(
    join(change, "design.md"),
    "actor authentication authorization RLS FORCE RLS Electron Runtime diagnostics\n",
  );
  writeFileSync(
    join(change, "tasks.md"),
    Array.from({ length: 9 }, (_, index) => `${index + 1}. Task ${index + 1}`).join("\n"),
  );
  writeFileSync(
    join(change, "scenarios.md"),
    scenarios ||
      [
        "positive-human",
        "rejection email-rejection",
        "concurrency refresh-concurrency refresh_token_reused",
        "dependency-failure dependency_unavailable",
        "Secret secret_boundary_violation",
        "recovery identity_recovered",
        "cross-tenant-IDOR RLS",
        "endpoint-rejection endpoint_credential_invalid",
        "renderer-secret",
        "ops-diagnostic ops-rejection immutable audit",
      ].join("\n"),
  );
}

describe("OpenSpec validation", () => {
  it("accepts the complete MS0 change", () => {
    expect(validateOpenSpec(createOpenSpecFixture())).toEqual([]);
  });

  it("accepts the registered MS1 planning change alongside MS0", () => {
    const root = createOpenSpecFixture();
    writeMs1Change(root);

    expect(validateOpenSpec(root)).toEqual([]);
  });

  it("rejects an incomplete registered MS1 scenario set", () => {
    const root = createOpenSpecFixture();
    writeMs1Change(root, "positive-human\n");

    expect(validateOpenSpec(root)).toContainEqual({
      code: "missing_required_content",
      path: "openspec/changes/ms1-identity-workspace-tenant-boundary/scenarios.md",
    });
  });

  it("rejects imported legacy active or archive state", () => {
    const root = createOpenSpecFixture();
    mkdirSync(join(root, "openspec/changes/archive/legacy-ms9"), { recursive: true });

    expect(validateOpenSpec(root)).toContainEqual({
      code: "legacy_openspec_state_present",
      path: "openspec/changes/archive",
    });
  });
});
