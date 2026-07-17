import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanArtifactPaths } from "./artifact-secret-scan.js";

function fakeCredential(): string {
  return `uk-${"sa"}-${"d".repeat(64)}`;
}

describe("artifact Secret scan", () => {
  it("rejects a generated artifact containing a Secret even when the path is normally Git-ignored", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-artifact-scan-"));
    const artifact = join(root, "dist");
    mkdirSync(artifact);
    writeFileSync(join(artifact, "bundle.js"), `const credential = "${fakeCredential()}";\n`);

    expect(scanArtifactPaths([artifact])).toEqual([
      {
        code: "secret_artifact_violation",
        path: join(artifact, "bundle.js"),
      },
    ]);
  });

  it("accepts a safe unpacked artifact tree", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-artifact-scan-"));
    const artifact = join(root, "release", "mac-arm64", "Sartre.app", "Contents");
    mkdirSync(artifact, { recursive: true });
    writeFileSync(join(artifact, "Info.plist"), "<plist><string>Sartre</string></plist>\n");

    expect(scanArtifactPaths([join(root, "release")])).toEqual([]);
  });

  it("rejects a symlink that escapes the artifact root", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-artifact-scan-"));
    const artifact = join(root, "release");
    mkdirSync(artifact);
    writeFileSync(join(root, "outside.txt"), "safe\n");
    symlinkSync("../outside.txt", join(artifact, "outside-link"));

    expect(scanArtifactPaths([artifact])).toEqual([
      {
        code: "artifact_symlink_escape",
        path: join(artifact, "outside-link"),
      },
    ]);
  });

  it("fails when an explicitly required artifact path is missing", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-artifact-scan-"));

    expect(scanArtifactPaths([join(root, "missing")])).toEqual([
      {
        code: "artifact_path_missing",
        path: join(root, "missing"),
      },
    ]);
  });

  it("runs the pinned gitleaks and supplemental scanners through the CLI", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-artifact-scan-"));
    const artifact = join(root, "dist");
    mkdirSync(artifact);
    writeFileSync(join(artifact, "bundle.js"), 'export const status = "safe";\n');

    const result = spawnSync("pnpm", ["run", "secret:artifacts", "--", artifact], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
    });

    expect(result.status).toBe(0);
  }, 15_000);
});
