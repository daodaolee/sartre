import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createFreezeManifest, type FreezeManifest } from "./create-freeze-manifest.js";
import { verifyFreezeManifest } from "./verify-freeze-manifest.js";

const generatedAt = "2026-07-17T10:00:00.000Z";

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function createLegacyFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "sartre-legacy-freeze-"));
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.name", "fixture"], { cwd: root });
  execFileSync("git", ["config", "user.email", "fixture@example.invalid"], { cwd: root });

  writeFileSync(join(root, ".gitignore"), "ignored/\n", "utf8");
  writeFileSync(join(root, "clean.txt"), "clean\n", "utf8");
  writeFileSync(join(root, "modified.txt"), "before\n", "utf8");
  writeFileSync(join(root, "deleted.txt"), "delete me\n", "utf8");
  symlinkSync("clean.txt", join(root, "tracked-link"));
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync("git", ["commit", "-qm", "fixture baseline"], { cwd: root });

  writeFileSync(join(root, "modified.txt"), "after\n", "utf8");
  rmSync(join(root, "deleted.txt"));
  writeFileSync(join(root, "untracked.txt"), "untracked\n", "utf8");
  mkdirSync(join(root, "ignored"));
  writeFileSync(join(root, "ignored", "credential.txt"), "must-not-be-read\n", "utf8");
  chmodSync(join(root, "ignored", "credential.txt"), 0o000);
  return root;
}

function entry(manifest: FreezeManifest, path: string) {
  const result = manifest.entries.find((candidate) => candidate.path === path);
  if (!result) {
    throw new Error(`missing manifest entry ${path}`);
  }
  return result;
}

describe("legacy freeze manifest", { timeout: 15_000 }, () => {
  it("enumerates tracked, modified, untracked, deleted, and symlink facts while excluding ignored files", () => {
    const root = createLegacyFixture();
    const manifest = createFreezeManifest({ source: root, generatedAt });

    expect(manifest.sourceRepository).toBe(realpathSync(root));
    expect(manifest.sourceHead).toBe(
      execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
    );
    expect(manifest.generatedAt).toBe(generatedAt);
    expect(manifest.dirtyDiffHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(manifest.entries.map((candidate) => candidate.path)).not.toContain(
      "ignored/credential.txt",
    );

    expect(entry(manifest, "clean.txt")).toMatchObject({
      gitState: "tracked",
      kind: "file",
      size: lstatSync(join(root, "clean.txt")).size,
      sha256: hashText("clean\n"),
    });
    expect(entry(manifest, "modified.txt")).toMatchObject({
      gitState: "modified",
      kind: "file",
      sha256: hashText("after\n"),
    });
    expect(entry(manifest, "untracked.txt")).toMatchObject({
      gitState: "untracked",
      kind: "file",
      sha256: hashText("untracked\n"),
    });
    expect(entry(manifest, "deleted.txt")).toEqual({
      gitState: "deleted",
      kind: "missing",
      path: "deleted.txt",
      sha256: null,
      size: null,
    });
    expect(entry(manifest, "tracked-link")).toMatchObject({
      gitState: "tracked",
      kind: "symlink",
      sha256: hashText("clean.txt"),
    });
    expect(verifyFreezeManifest(root, manifest)).toEqual([]);
  }, 15_000);

  it.each(["gitState", "kind", "size", "sha256"] as const)(
    "independent verification rejects a changed %s field",
    (field) => {
      const root = createLegacyFixture();
      const manifest = createFreezeManifest({ source: root, generatedAt });
      const target = entry(manifest, "modified.txt");
      const mutated = structuredClone(manifest);
      const mutatedTarget = entry(mutated, "modified.txt") as Record<string, unknown>;
      mutatedTarget[field] =
        field === "size"
          ? 999
          : field === "gitState"
            ? "tracked"
            : field === "kind"
              ? "symlink"
              : "0".repeat(64);

      expect(verifyFreezeManifest(root, mutated)).toContainEqual({
        code: "entry_mismatch",
        path: target.path,
      });
    },
    15_000,
  );

  it("does not accept a different fact set merely because the entry count matches", () => {
    const root = createLegacyFixture();
    const manifest = createFreezeManifest({ source: root, generatedAt });
    const mutated = structuredClone(manifest);
    mutated.entries = mutated.entries
      .filter((candidate) => candidate.path !== "clean.txt")
      .concat({
        gitState: "untracked",
        kind: "file",
        path: "invented.txt",
        sha256: hashText("invented\n"),
        size: 9,
      })
      .sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));

    expect(verifyFreezeManifest(root, mutated)).toEqual(
      expect.arrayContaining([
        { code: "entry_missing", path: "clean.txt" },
        { code: "entry_unexpected", path: "invented.txt" },
      ]),
    );
  });

  it("rejects a duplicate manifest path before collapsing facts by key", () => {
    const root = createLegacyFixture();
    const manifest = createFreezeManifest({ source: root, generatedAt });
    const mutated = structuredClone(manifest);
    const first = mutated.entries[0];
    expect(first).toBeDefined();
    mutated.entries.push(structuredClone(first));

    expect(verifyFreezeManifest(root, mutated)).toContainEqual({
      code: "manifest_entry_duplicate",
      path: first?.path,
    });
  });

  it("rejects manifest entry order drift", () => {
    const root = createLegacyFixture();
    const manifest = createFreezeManifest({ source: root, generatedAt });
    const mutated = structuredClone(manifest);
    const first = mutated.entries[0];
    const second = mutated.entries[1];
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first && second) {
      mutated.entries[0] = second;
      mutated.entries[1] = first;
    }
    const missingSource = join(tmpdir(), "sartre-freeze-order-missing-source-sentinel");

    expect(verifyFreezeManifest(missingSource, mutated)).toContainEqual({
      code: "entry_order_mismatch",
      path: first?.path,
    });
  });

  it("rejects an invalid manifest schema before accessing the requested source", () => {
    const missingSource = join(tmpdir(), "sartre-freeze-missing-source-sentinel");
    let violations: ReturnType<typeof verifyFreezeManifest> | undefined;

    expect(() => {
      violations = verifyFreezeManifest(missingSource, {});
    }).not.toThrow();
    expect(violations).toEqual([{ code: "manifest_schema_invalid", path: "manifest" }]);
  });
});
