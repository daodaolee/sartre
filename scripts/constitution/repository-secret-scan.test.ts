import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepositoryIndexSecrets, scanRepositorySecrets } from "./secret-boundary.js";

function createRepository(): string {
  const root = mkdtempSync(join(tmpdir(), "sartre-secret-scan-"));
  execFileSync("git", ["init", "-q"], { cwd: root });
  writeFileSync(join(root, ".gitignore"), "/.local-secrets/\n", "utf8");
  mkdirSync(join(root, ".local-secrets"));
  mkdirSync(join(root, "src"));
  return root;
}

function fakeCodexKey(): string {
  return `uk-${"sa"}-${"b".repeat(64)}`;
}

function expectSecretViolation(root: string, path: string): void {
  expect(scanRepositorySecrets(root)).toEqual([
    {
      ruleId: "secret-pattern",
      path,
    },
  ]);
}

function commitPath(root: string, path: string): void {
  execFileSync("git", ["add", path], { cwd: root });
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Sartre Test",
      "-c",
      "user.email=sartre-test@example.invalid",
      "commit",
      "-q",
      "-m",
      "fixture",
    ],
    { cwd: root },
  );
}

describe("repository secret scan", () => {
  it("does not read ignored local development credentials", () => {
    const root = createRepository();
    writeFileSync(
      join(root, ".local-secrets", "development.env"),
      `${["SARTRE", "CODEX", "TEST", "1", "API", "KEY"].join("_")}=${fakeCodexKey()}\n`,
      "utf8",
    );
    writeFileSync(join(root, "src", "safe.ts"), 'export const value = "safe";\n', "utf8");

    expect(scanRepositorySecrets(root)).toEqual([]);
  });

  it("rejects a credential in an ordinary untracked file", () => {
    const root = createRepository();
    writeFileSync(join(root, "src", "leak.ts"), `export const key = "${fakeCodexKey()}";\n`);

    expect(scanRepositorySecrets(root)).toEqual([
      {
        ruleId: "secret-pattern",
        path: "src/leak.ts",
      },
    ]);
  });

  it("rejects a force-added local secret file from the index after its worktree copy is removed", () => {
    const root = createRepository();
    const secretPath = join(root, ".local-secrets", "development.env");
    writeFileSync(secretPath, "SAFE=value\n", "utf8");
    execFileSync("git", ["add", "-f", ".local-secrets/development.env"], { cwd: root });
    rmSync(secretPath);

    expect(scanRepositorySecrets(root)).toEqual([
      {
        ruleId: "forbidden-path",
        path: ".local-secrets/development.env",
      },
    ]);
  });

  it("scans the staged blob instead of a later safe worktree replacement", () => {
    const root = createRepository();
    const leakPath = join(root, "src", "staged-leak.ts");
    writeFileSync(leakPath, `export const key = "${fakeCodexKey()}";\n`, "utf8");
    execFileSync("git", ["add", "src/staged-leak.ts"], { cwd: root });
    writeFileSync(leakPath, 'export const key = "$CODEX_API_KEY";\n', "utf8");

    expectSecretViolation(root, "src/staged-leak.ts");
  });

  it("scans a tracked worktree modification while keeping the index scan immutable", () => {
    const root = createRepository();
    const path = "src/tracked.ts";
    writeFileSync(join(root, path), 'export const key = "$CODEX_API_KEY";\n', "utf8");
    commitPath(root, path);
    writeFileSync(join(root, path), `export const key = "${fakeCodexKey()}";\n`, "utf8");

    expect(scanRepositoryIndexSecrets(root)).toEqual([]);
    expectSecretViolation(root, path);
  });

  it("accepts a safe tracked worktree modification", () => {
    const root = createRepository();
    const path = "src/tracked.ts";
    writeFileSync(join(root, path), 'export const value = "before";\n', "utf8");
    commitPath(root, path);
    writeFileSync(join(root, path), 'export const value = "after";\n', "utf8");

    expect(scanRepositoryIndexSecrets(root)).toEqual([]);
    expect(scanRepositorySecrets(root)).toEqual([]);
  });

  it("safely skips a deleted tracked worktree file", () => {
    const root = createRepository();
    const path = "src/tracked.ts";
    writeFileSync(join(root, path), 'export const value = "safe";\n', "utf8");
    commitPath(root, path);
    rmSync(join(root, path));

    expect(scanRepositoryIndexSecrets(root)).toEqual([]);
    expect(scanRepositorySecrets(root)).toEqual([]);
  });

  it("rejects a staged symlink routed through an ignored alias into local secrets", () => {
    const root = createRepository();
    writeFileSync(join(root, ".gitignore"), "/.local-secrets/\n/src/alias\n", "utf8");
    symlinkSync("../.local-secrets", join(root, "src", "alias"), "dir");
    symlinkSync("alias/development.env", join(root, "src", "staged-link"));
    execFileSync("git", ["add", "src/staged-link"], { cwd: root });

    const expected = [{ ruleId: "forbidden-path" as const, path: "src/staged-link" }];
    expect(scanRepositoryIndexSecrets(root)).toEqual(expected);
    expect(scanRepositorySecrets(root)).toEqual(expected);
  });

  it("rejects a staged symlink that traverses a forbidden intermediate alias then back out", () => {
    const root = createRepository();
    writeFileSync(join(root, ".gitignore"), "/.local-secrets/\n/src/alias\n", "utf8");
    writeFileSync(join(root, "src", "safe.ts"), 'export const value = "safe";\n', "utf8");
    symlinkSync("../.local-secrets", join(root, "src", "alias"), "dir");
    symlinkSync("alias/../src/safe.ts", join(root, "src", "staged-link"));
    execFileSync("git", ["add", "src/staged-link"], { cwd: root });

    expect(scanRepositoryIndexSecrets(root)).toEqual([
      { ruleId: "forbidden-path", path: "src/staged-link" },
    ]);
  });

  it("rejects a staged symlink routed through an ignored alias outside the repository", () => {
    const root = createRepository();
    const externalRoot = mkdtempSync(join(tmpdir(), "sartre-external-secret-target-"));
    writeFileSync(join(root, ".gitignore"), "/.local-secrets/\n/src/alias\n", "utf8");
    symlinkSync(externalRoot, join(root, "src", "alias"), "dir");
    symlinkSync("alias/missing.env", join(root, "src", "staged-link"));
    execFileSync("git", ["add", "src/staged-link"], { cwd: root });

    expect(scanRepositoryIndexSecrets(root)).toEqual([
      { ruleId: "forbidden-path", path: "src/staged-link" },
    ]);
  });

  it("rejects an intermediate symlink loop without following target content", () => {
    const root = createRepository();
    writeFileSync(
      join(root, ".gitignore"),
      "/.local-secrets/\n/src/alias-a\n/src/alias-b\n",
      "utf8",
    );
    symlinkSync("alias-b", join(root, "src", "alias-a"));
    symlinkSync("alias-a", join(root, "src", "alias-b"));
    symlinkSync("alias-a/missing.env", join(root, "src", "staged-link"));
    execFileSync("git", ["add", "src/staged-link"], { cwd: root });

    expect(scanRepositoryIndexSecrets(root)).toEqual([
      { ruleId: "forbidden-path", path: "src/staged-link" },
    ]);
  });

  it("accepts a staged symlink with a safely broken in-repository target", () => {
    const root = createRepository();
    symlinkSync("missing-directory/child", join(root, "src", "staged-link"));
    execFileSync("git", ["add", "src/staged-link"], { cwd: root });

    expect(scanRepositoryIndexSecrets(root)).toEqual([]);
  });

  it("rejects a broken intermediate alias with an unresolved outer suffix", () => {
    const root = createRepository();
    writeFileSync(join(root, ".gitignore"), "/.local-secrets/\n/src/alias\n", "utf8");
    symlinkSync("missing-directory", join(root, "src", "alias"));
    symlinkSync("alias/child", join(root, "src", "staged-link"));
    execFileSync("git", ["add", "src/staged-link"], { cwd: root });

    expect(scanRepositoryIndexSecrets(root)).toEqual([
      { ruleId: "forbidden-path", path: "src/staged-link" },
    ]);
  });

  it("rejects an untracked symlink that points into the ignored local secret directory", () => {
    const root = createRepository();
    symlinkSync("../.local-secrets/development.env", join(root, "src", "credentials"));

    expect(scanRepositorySecrets(root)).toEqual([
      {
        ruleId: "forbidden-path",
        path: "src/credentials",
      },
    ]);
  });

  it("rejects an untracked symlink whose lexical target traverses the local secret directory", () => {
    const root = createRepository();
    writeFileSync(join(root, "src", "safe.ts"), 'export const value = "safe";\n', "utf8");
    symlinkSync("../.local-secrets/../src/safe.ts", join(root, "src", "crosses-secrets"));

    expect(scanRepositorySecrets(root)).toEqual([
      {
        ruleId: "forbidden-path",
        path: "src/crosses-secrets",
      },
    ]);
  });

  it.each([
    [
      "a credential-bearing database URL",
      `${["DATABASE", "URL"].join("_")}=${["postgre", "sql"].join("")}://sartre:${[
        "not",
        "-safe",
      ].join("")}@db.internal/sartre\n`,
    ],
    ["a private key", `${["-----BEGIN", " PRIVATE KEY-----"].join("")}\nsynthetic\n`],
    [
      "a Bearer token",
      `${["Author", "ization"].join("")}: ${["Bear", "er"].join("")} ${`eyJ${"a".repeat(
        48,
      )}.${"b".repeat(32)}`}\n`,
    ],
    ["an AWS access key", `AWS_ACCESS_KEY_ID=${["AK", "IA"].join("")}${"A".repeat(16)}\n`],
    [
      "a GitHub token",
      `${["GITHUB", "TOKEN"].join("_")}=${["gh", "p_"].join("")}${"c".repeat(36)}\n`,
    ],
  ])("rejects %s in an untracked file", (_description, content) => {
    const root = createRepository();
    writeFileSync(join(root, "src", "credential.txt"), content, "utf8");

    expectSecretViolation(root, "src/credential.txt");
  });

  it("allows quoted and unquoted shell variable references", () => {
    const root = createRepository();
    const bracedVariable = (name: string) => ["$", "{", name, "}"].join("");
    const plainVariable = (name: string) => ["$", name].join("");
    writeFileSync(
      join(root, ".env.example"),
      [
        [
          ["DATABASE", "URL"].join("_"),
          '="',
          ["postgres", "ql"].join(""),
          "://",
          bracedVariable("DATABASE_USER"),
          ":",
          bracedVariable("DATABASE_PASSWORD"),
          "@",
          bracedVariable("DATABASE_HOST"),
          '/sartre"',
        ].join(""),
        [
          "AUTHORIZATION",
          '="',
          ["Bear", "er"].join(""),
          " ",
          bracedVariable("ACCESS_TOKEN"),
          '"',
        ].join(""),
        [
          ["SARTRE", "CODEX", "TEST", "1", "API", "KEY"].join("_"),
          '="',
          plainVariable("CODEX_API_KEY"),
          '"',
        ].join(""),
        [
          ["AWS", "SECRET", "ACCESS", "KEY"].join("_"),
          "=",
          plainVariable("AWS_SECRET_ACCESS_KEY"),
        ].join(""),
        [["GITHUB", "TOKEN"].join("_"), "=", bracedVariable("GITHUB_TOKEN")].join(""),
      ].join("\n"),
      "utf8",
    );

    expect(scanRepositorySecrets(root)).toEqual([]);
  });
});
