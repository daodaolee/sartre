import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runGitleaksGitScan, runGitleaksWorktreeScan } from "./gitleaks-tool.js";
import { scanTextForSecrets } from "./secret-boundary.js";

function createStagedRepository(content: string): string {
  const root = mkdtempSync(join(tmpdir(), "sartre-gitleaks-index-"));
  execFileSync("git", ["init", "-q"], { cwd: root });
  writeFileSync(join(root, "fixture.txt"), content, "utf8");
  execFileSync("git", ["add", "fixture.txt"], { cwd: root });
  return root;
}

function syntheticGenericSecret(): string {
  const value = ["aB3dE5gH7jK9mN2p", "Q4sT6vW8yZ0cF1hJ"].join("");
  return `${["api", "key"].join("_")}=${value}\n`;
}

function createCommittedRepository(): string {
  const root = mkdtempSync(join(tmpdir(), "sartre-gitleaks-worktree-"));
  execFileSync("git", ["init", "-q"], { cwd: root });
  execFileSync("git", ["config", "user.name", "Sartre Test"], { cwd: root });
  execFileSync("git", ["config", "user.email", "sartre-test@example.invalid"], {
    cwd: root,
  });
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, ".gitignore"), "/.local-secrets/\n", "utf8");
  writeFileSync(join(root, "src", "tracked.txt"), "safe\n", "utf8");
  execFileSync("git", ["add", ".gitignore", "src/tracked.txt"], { cwd: root });
  execFileSync("git", ["commit", "-q", "-m", "fixture"], { cwd: root });
  return root;
}

describe("gitleaks immutable index integration", () => {
  it("accepts a clean staged blob with the repository-pinned binary", () => {
    const root = createStagedRepository("no credential material\n");

    expect(runGitleaksGitScan(root, true, process.cwd())).toBe(true);
  });

  it("returns failure for a synthetic credential in the staged blob", () => {
    const root = createStagedRepository(syntheticGenericSecret());

    expect(runGitleaksGitScan(root, true, process.cwd())).toBe(false);
  });
});

describe("gitleaks safe worktree integration", () => {
  it("rejects a generic credential in a tracked but unstaged worktree file", () => {
    const root = createCommittedRepository();
    const content = syntheticGenericSecret();
    writeFileSync(join(root, "src", "tracked.txt"), content, "utf8");

    expect(scanTextForSecrets("src/tracked.txt", content)).toEqual([]);
    expect(runGitleaksGitScan(root, false, process.cwd())).toBe(true);
    expect(runGitleaksWorktreeScan(root, process.cwd())).toBe(false);
  }, 15_000);

  it("rejects a generic credential in a nonignored untracked file", () => {
    const root = createCommittedRepository();
    const content = syntheticGenericSecret();
    writeFileSync(join(root, "src", "untracked.txt"), content, "utf8");

    expect(scanTextForSecrets("src/untracked.txt", content)).toEqual([]);
    expect(runGitleaksGitScan(root, false, process.cwd())).toBe(true);
    expect(runGitleaksWorktreeScan(root, process.cwd())).toBe(false);
  }, 15_000);

  it("never scans an ignored worktree credential input", () => {
    const root = createCommittedRepository();
    const ignoredDirectory = join(root, ".local-secrets");
    mkdirSync(ignoredDirectory);
    writeFileSync(join(ignoredDirectory, "development.env"), syntheticGenericSecret(), "utf8");

    expect(runGitleaksWorktreeScan(root, process.cwd())).toBe(true);
  }, 15_000);

  it("scans physical tracked bytes even when a clean filter hides the worktree diff", () => {
    const root = createCommittedRepository();
    execFileSync("git", ["config", "filter.scrub.clean", "sed s/.*/safe/"], { cwd: root });
    writeFileSync(join(root, ".gitattributes"), "*.txt filter=scrub\n", "utf8");
    execFileSync("git", ["add", ".gitattributes"], { cwd: root });
    execFileSync("git", ["commit", "-q", "-m", "attributes"], { cwd: root });
    const content = syntheticGenericSecret();
    writeFileSync(join(root, "src", "tracked.txt"), content, "utf8");

    expect(
      execFileSync("git", ["diff", "--name-only", "--"], { cwd: root, encoding: "utf8" }),
    ).toBe("");
    expect(scanTextForSecrets("src/tracked.txt", content)).toEqual([]);
    expect(runGitleaksGitScan(root, false, process.cwd())).toBe(true);
    expect(runGitleaksWorktreeScan(root, process.cwd())).toBe(false);
  }, 15_000);
});
