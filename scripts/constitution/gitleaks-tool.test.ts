import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gitleaksInstallPaths, resolveGitleaksPin, verifyPinnedGitleaks } from "./gitleaks-tool.js";

describe("pinned gitleaks tool", () => {
  it("pins the Darwin arm64 release archive by version and official checksum", () => {
    expect(resolveGitleaksPin("darwin", "arm64")).toEqual({
      asset: "gitleaks_8.28.0_darwin_arm64.tar.gz",
      checksum: "d942f3ad147250c9edbaab3fed9e482f98d3b59ba10ae97b8d75647e3ade492c",
      version: "8.28.0",
    });
  });

  it("fails closed when the pinned binary/archive is absent", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-gitleaks-tool-"));

    expect(verifyPinnedGitleaks(root, "darwin", "arm64")).toEqual([
      { code: "gitleaks_archive_missing" },
      { code: "gitleaks_binary_missing" },
    ]);
  });

  it("fails closed when the pinned archive checksum does not match", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-gitleaks-tool-"));
    const paths = gitleaksInstallPaths(root, "darwin", "arm64");
    mkdirSync(paths.directory, { recursive: true });
    writeFileSync(paths.archive, "not the official archive", "utf8");
    writeFileSync(paths.binary, "not the official binary", "utf8");

    expect(verifyPinnedGitleaks(root, "darwin", "arm64")).toContainEqual({
      code: "gitleaks_archive_checksum_mismatch",
    });
  });
});
