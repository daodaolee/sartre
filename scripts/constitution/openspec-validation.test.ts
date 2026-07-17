import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateMs0OpenSpec } from "./openspec-validation.js";

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
    Array.from({ length: 9 }, (_, index) => `Task ${index + 1}`).join("\n"),
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

describe("MS0 OpenSpec validation", () => {
  it("accepts the complete MS0 change", () => {
    expect(validateMs0OpenSpec(createOpenSpecFixture())).toEqual([]);
  });

  it("rejects imported legacy active or archive state", () => {
    const root = createOpenSpecFixture();
    mkdirSync(join(root, "openspec/changes/archive/legacy-ms9"), { recursive: true });

    expect(validateMs0OpenSpec(root)).toContainEqual({
      code: "legacy_openspec_state_present",
      path: "openspec/changes/archive",
    });
  });
});
