import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("MS0 implementation plan policy", () => {
  it("uses non-empty deterministic Task 6 and Task 9 artifact/context commands", () => {
    const plan = readFileSync(
      resolve("docs/superpowers/plans/2026-07-17-ms0-repository-constitution.md"),
      "utf8",
    );

    expect(plan).not.toMatch(/^pnpm run secret:artifacts\s*$/gmu);
    for (const path of [
      "apps/electron-app/dist",
      "apps/hub-api/dist",
      "apps/hub-worker/dist",
      "apps/local-runtime/dist",
      "packages/contracts/dist",
      "packages/domain/dist",
      "packages/runtime-core/dist",
      "packages/sdk/dist",
      "apps/electron-app/release/mac-arm64/Sartre.app",
      "apps/electron-app/release/Sartre-0.1.0-arm64.dmg",
      '"$SARTRE_EXTRACTED_PAYLOAD_DIR/Sartre.app"',
    ]) {
      expect(plan).toContain(path);
    }
    expect(plan.match(/pnpm run docker-context:check/gu)?.length).toBeGreaterThanOrEqual(3);
    expect(plan).toContain("artifact_path_missing");
    expect(plan).toContain("mktemp -d");
    expect(plan).toContain("trap 'rm -rf \"$SARTRE_EXTRACTED_PAYLOAD_DIR\"' EXIT");
    expect(plan).toContain(
      ["artifactName: Sartre-", "$", "{version}-", "$", "{arch}.", "$", "{ext}"].join(""),
    );
    expect(plan).toContain("scripts/constitution/extract-electron-payload.ts");
  });

  it("uses workflow-authoritative commitSha for the tested subject", () => {
    const plan = readFileSync(
      resolve("docs/superpowers/plans/2026-07-17-ms0-repository-constitution.md"),
      "utf8",
    );

    expect(plan).not.toContain("subjectCommitSha");
    expect(plan.match(/commitSha \(tested subject commit\)/gu)?.length).toBeGreaterThanOrEqual(2);
    expect(plan).toContain("two commits");
    expect(plan).toContain("evidence-only child commit");
  });
});
