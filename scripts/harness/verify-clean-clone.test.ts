import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  validateRequiredWorkflow,
  verifyCleanClone,
  verifyEvidenceCommit,
} from "./verify-clean-clone.js";

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function createRepositoryFixture(): { root: string; subject: string } {
  const root = mkdtempSync(join(tmpdir(), "sartre-clean-clone-source-"));
  git(root, ["init", "-b", "fixture"]);
  git(root, ["config", "user.name", "Sartre Test"]);
  git(root, ["config", "user.email", "sartre-test@example.invalid"]);
  writeFileSync(join(root, ".gitignore"), "node_modules/\ndist/\n", "utf8");
  writeFileSync(join(root, "subject.txt"), "candidate-subject\n", "utf8");
  git(root, ["add", ".gitignore", "subject.txt"]);
  git(root, ["commit", "-m", "candidate subject"]);
  const subject = git(root, ["rev-parse", "HEAD"]);

  mkdirSync(join(root, "node_modules"), { recursive: true });
  mkdirSync(join(root, "dist"), { recursive: true });
  writeFileSync(join(root, "node_modules", "caller-only.txt"), "not evidence\n", "utf8");
  writeFileSync(join(root, "dist", "caller-only.txt"), "not evidence\n", "utf8");

  return { root, subject };
}

const requiredWorkflow = `name: MS0 Required
env:
  NODE_VERSION: 24.11.0
  PNPM_VERSION: 10.33.2
  GITLEAKS_VERSION: 8.28.0
jobs:
  constitution:
    runs-on: ubuntu-24.04
    steps:
      - run: pnpm install --frozen-lockfile --strict-peer-dependencies
      - run: pnpm run toolchain:bootstrap
      - run: pnpm run toolchain:check
  postgresql-17-6:
    runs-on: ubuntu-24.04
    services:
      postgres:
        image: postgres:17.6
    steps:
      - run: pnpm install --frozen-lockfile --strict-peer-dependencies
      - run: pnpm exec vitest run tests/integration/diagnostic-timeline.integration.test.ts
  electron-macos-arm64:
    runs-on: macos-14
    steps:
      - run: pnpm install --frozen-lockfile --strict-peer-dependencies
      - run: shasum -a 256 artifact > artifact-sha256.txt
      - uses: actions/upload-artifact@v4
        with:
          path: artifact-sha256.txt
`;
const REPOSITORY_FIXTURE_TIMEOUT_MS = 30_000;

function writeConstitutionFiles(root: string): void {
  mkdirSync(join(root, ".github", "workflows"), { recursive: true });
  mkdirSync(join(root, "scripts", "constitution"), { recursive: true });
  writeFileSync(join(root, ".node-version"), "24.11.0\n", "utf8");
  writeFileSync(join(root, ".github", "workflows", "ms0-required.yml"), requiredWorkflow, "utf8");
  writeFileSync(
    join(root, "package.json"),
    `${JSON.stringify(
      {
        name: "clean-clone-fixture",
        version: "1.0.0",
        private: true,
        packageManager: "pnpm@10.33.2",
        engines: { node: "24.11.x", pnpm: "10.33.x" },
        scripts: { prepack: 'node -e "process.exit(1)"' },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(
    join(root, "pnpm-lock.yaml"),
    "lockfileVersion: '9.0'\n\nsettings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\n\nimporters:\n\n  .: {}\n",
    "utf8",
  );
}

function createConstitutionFixture(): { root: string; subject: string } {
  const fixture = createRepositoryFixture();
  writeConstitutionFiles(fixture.root);
  git(fixture.root, ["add", "."]);
  git(fixture.root, ["commit", "-m", "add constitution"]);
  return { root: fixture.root, subject: git(fixture.root, ["rev-parse", "HEAD"]) };
}

function commitAll(root: string, message: string): string {
  git(root, ["add", "."]);
  git(root, ["commit", "-m", message]);
  return git(root, ["rev-parse", "HEAD"]);
}

function createMasterPlanSubjectFixture(): { root: string; subject: string } {
  const fixture = createConstitutionFixture();
  mkdirSync(join(fixture.root, "plan"), { recursive: true });
  writeFileSync(
    join(fixture.root, "plan", "00-master-plan.md"),
    [
      "# Fixture Master Plan",
      "",
      "## 5. MS0：Repository Constitution 与证据基线",
      "",
      "MS0 body remains immutable.",
      "",
      "**状态：** 未开始。",
      "",
      "## 6. MS1：Identity",
      "",
      "MS1 body remains immutable.",
      "",
      "**状态：** 未开始。",
      "",
    ].join("\n"),
    "utf8",
  );
  return { root: fixture.root, subject: commitAll(fixture.root, "add master plan subject") };
}

function writeEvidenceManifest(root: string, subject: string): void {
  mkdirSync(join(root, "reports", "ms0-repository-constitution", "evidence"), {
    recursive: true,
  });
  writeFileSync(
    join(root, "reports", "ms0-repository-constitution", "evidence", "manifest.json"),
    `${JSON.stringify({ commitSha: subject })}\n`,
  );
}

async function expectFailure(
  action: () => Promise<unknown> | unknown,
  code: string,
): Promise<void> {
  await expect(Promise.resolve().then(action)).rejects.toThrow(code);
}

describe("clean-clone verifier", { timeout: REPOSITORY_FIXTURE_TIMEOUT_MS }, () => {
  it("builds workspace declarations before running the default typecheck gate", () => {
    const verifier = readFileSync("scripts/harness/verify-clean-clone.ts", "utf8");

    const build = verifier.indexOf('"pnpm", "run", "build"');
    const typecheck = verifier.indexOf('"pnpm", "run", "typecheck"');

    expect(build).toBeGreaterThan(-1);
    expect(build).toBeLessThan(typecheck);
  });

  it("builds workspace declarations before typecheck in the required workflow", () => {
    const workflow = readFileSync(".github/workflows/ms0-required.yml", "utf8");
    const build = workflow.indexOf("      - run: pnpm run build");
    const typecheck = workflow.indexOf("      - run: pnpm run typecheck");

    expect(build).toBeGreaterThan(-1);
    expect(build).toBeLessThan(typecheck);
  });

  it("builds workspace packages before the PostgreSQL health smoke gate", () => {
    const workflow = readFileSync(".github/workflows/ms0-required.yml", "utf8");
    const jobStart = workflow.indexOf("  postgresql-17-6:\n");
    const jobEnd = workflow.indexOf("\n  electron-macos-arm64:\n", jobStart);
    const job = workflow.slice(jobStart, jobEnd);
    const build = job.indexOf("      - run: pnpm run build");
    const healthSmoke = job.indexOf("      - run: pnpm run health:smoke");

    expect(jobStart).toBeGreaterThan(-1);
    expect(jobEnd).toBeGreaterThan(jobStart);
    expect(build).toBeGreaterThan(-1);
    expect(build).toBeLessThan(healthSmoke);
  });

  it("writes the Electron artifact checksum with the uploaded basename", () => {
    const workflow = readFileSync(".github/workflows/ms0-required.yml", "utf8");

    expect(workflow).toContain(
      '(cd apps/electron-app/release && shasum -a 256 Sartre-0.1.0-arm64.dmg) > "$RUNNER_TEMP/ms0-required/artifact-sha256.txt"',
    );
  });

  it("accepts the repository required workflow policy", () => {
    expect(() => validateRequiredWorkflow(process.cwd())).not.toThrow();
  });

  it("rejects the invalid diagnostics CLI self-test as a required workflow gate", () => {
    const fixture = createConstitutionFixture();
    const workflowPath = join(fixture.root, ".github", "workflows", "ms0-required.yml");
    writeFileSync(
      workflowPath,
      readFileSync(workflowPath, "utf8").replace(
        "pnpm exec vitest run tests/integration/diagnostic-timeline.integration.test.ts",
        "pnpm run ops:trace-correlation -- --self-test",
      ),
      "utf8",
    );

    expect(() => validateRequiredWorkflow(fixture.root)).toThrow("required_ci_workflow_invalid");
  });

  it("uses the approved diagnostic integration gate in the active Task 9 plan", () => {
    const plan = readFileSync(
      "docs/superpowers/plans/2026-07-17-ms0-repository-constitution.md",
      "utf8",
    );
    const stepStart = plan.indexOf("- [ ] **Step 5: Run MS0 REAL_TEST gates against the subject**");
    const stepEnd = plan.indexOf("- [ ] **Step 6: Run required negative controls**", stepStart);
    const step = plan.slice(stepStart, stepEnd);

    expect(stepStart).toBeGreaterThan(-1);
    expect(stepEnd).toBeGreaterThan(stepStart);
    expect(step).toContain(
      "pnpm exec vitest run tests/integration/diagnostic-timeline.integration.test.ts",
    );
    expect(step).not.toContain("pnpm run ops:trace-correlation -- --self-test");
  });

  it("checks the exact subject in a fresh clone without caller dependency or build output", async () => {
    const fixture = createRepositoryFixture();

    const result = await verifyCleanClone({
      repositoryRoot: fixture.root,
      subject: fixture.subject,
      commands: [
        {
          id: "exact-subject",
          argv: [
            process.execPath,
            "-e",
            [
              "const fs=require('node:fs');",
              "if(fs.readFileSync('subject.txt','utf8')!=='candidate-subject\\n')process.exit(2);",
              "if(fs.existsSync('node_modules/caller-only.txt'))process.exit(3);",
              "if(fs.existsSync('dist/caller-only.txt'))process.exit(4);",
            ].join(""),
          ],
        },
      ],
      skipRepositoryPolicy: true,
    });

    expect(result.subject).toBe(fixture.subject);
    expect(result.cloneHead).toBe(fixture.subject);
    expect(result.cloneRoot).not.toBe(fixture.root);
  });

  it("does not inherit registry, cloud, token, config, or caller HOME sentinels", async () => {
    const fixture = createRepositoryFixture();
    const sentinelKeys = [
      "SARTRE_REGISTRY_SENTINEL",
      "SARTRE_CLOUD_SENTINEL",
      "SARTRE_TOKEN_SENTINEL",
      "SARTRE_CONFIG_SENTINEL",
    ] as const;
    const previous = Object.fromEntries(
      [...sentinelKeys, "HOME"].map((key) => [key, process.env[key]]),
    );
    for (const key of sentinelKeys) process.env[key] = "parent-only";
    process.env.HOME = "/caller-home-must-not-cross";

    try {
      await verifyCleanClone({
        repositoryRoot: fixture.root,
        subject: fixture.subject,
        commands: [
          {
            id: "isolated-environment",
            argv: [
              process.execPath,
              "-e",
              `const keys=${JSON.stringify(sentinelKeys)};if(keys.some((key)=>process.env[key]!==undefined)||process.env.HOME==='/caller-home-must-not-cross')process.exit(9)`,
            ],
          },
        ],
        skipRepositoryPolicy: true,
      });
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("forwards only the exact loopback PostgreSQL 17.6 and 17.10 inputs", async () => {
    const fixture = createRepositoryFixture();
    const postgres17_6 = "postgresql://postgres@127.0.0.1:54326/postgres";
    const postgres17_10 = "postgresql://postgres@127.0.0.1:55432/postgres";

    await verifyCleanClone({
      repositoryRoot: fixture.root,
      subject: fixture.subject,
      databaseInputs: { postgres17_6, postgres17_10 },
      commands: [
        {
          id: "database-environment",
          argv: [
            process.execPath,
            "-e",
            `if(process.env.SARTRE_DATABASE_URL!==${JSON.stringify(postgres17_6)}||process.env.SARTRE_POSTGRES_NEGATIVE_URL!==${JSON.stringify(postgres17_10)})process.exit(8)`,
          ],
        },
      ],
      skipRepositoryPolicy: true,
    });
  });

  it.each([
    [
      "password",
      ["postgresql://postgres", "credential@127.0.0.1:54326/postgres"].join(":"),
      "postgresql://postgres@127.0.0.1:55432/postgres",
    ],
    [
      "non-loopback host",
      "postgresql://postgres@localhost:54326/postgres",
      "postgresql://postgres@127.0.0.1:55432/postgres",
    ],
    [
      "wrong negative port",
      "postgresql://postgres@127.0.0.1:54326/postgres",
      "postgresql://postgres@127.0.0.1:55433/postgres",
    ],
  ])("rejects %s database input", async (_case, postgres17_6, postgres17_10) => {
    const fixture = createRepositoryFixture();

    await expect(
      verifyCleanClone({
        repositoryRoot: fixture.root,
        subject: fixture.subject,
        databaseInputs: { postgres17_6, postgres17_10 },
        commands: [],
        skipRepositoryPolicy: true,
      }),
    ).rejects.toThrow("clean_clone_database_input_invalid");
  });

  it("bounds Git commands with a stable timeout code", async () => {
    const fixture = createRepositoryFixture();
    const fakeBin = mkdtempSync(join(tmpdir(), "sartre-timeout-git-"));
    const fakeGit = join(fakeBin, "git");
    writeFileSync(fakeGit, "#!/bin/sh\nsleep 1\nexit 0\n", "utf8");
    chmodSync(fakeGit, 0o700);
    const previousPath = process.env.PATH;
    process.env.PATH = `${fakeBin}:${previousPath ?? ""}`;

    try {
      await expect(
        verifyCleanClone({
          repositoryRoot: fixture.root,
          subject: fixture.subject,
          commands: [],
          skipRepositoryPolicy: true,
          timeouts: { gitMs: 100 },
        }),
      ).rejects.toThrow("clean_clone_git_timeout");
    } finally {
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
    }
  });

  it("bounds frozen install with a stable timeout code", async () => {
    const fixture = createConstitutionFixture();
    const fakeBin = mkdtempSync(join(tmpdir(), "sartre-timeout-pnpm-"));
    const fakePnpm = join(fakeBin, "pnpm");
    writeFileSync(fakePnpm, "#!/bin/sh\nsleep 1\nexit 0\n", "utf8");
    chmodSync(fakePnpm, 0o700);
    const previousPath = process.env.PATH;
    process.env.PATH = `${fakeBin}:${previousPath ?? ""}`;

    try {
      await expect(
        verifyCleanClone({
          repositoryRoot: fixture.root,
          subject: fixture.subject,
          commands: [],
          timeouts: { installMs: 100 },
        }),
      ).rejects.toThrow("clean_clone_install_timeout");
    } finally {
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
    }
  });

  it("bounds a hung gate and removes its isolated temporary root", async () => {
    const fixture = createRepositoryFixture();
    const markerRoot = mkdtempSync(join(tmpdir(), "sartre-timeout-marker-"));
    const marker = join(markerRoot, "home.txt");
    const descendantMarker = join(markerRoot, "descendant-survived.txt");
    const descendant = `setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(
      descendantMarker,
    )},'survived'),1500)`;
    const hungParent = `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(
      descendant,
    )}],{stdio:'ignore'});require('node:fs').writeFileSync(${JSON.stringify(
      marker,
    )},process.env.HOME);setInterval(()=>{},1000)`;

    await expect(
      verifyCleanClone({
        repositoryRoot: fixture.root,
        subject: fixture.subject,
        commands: [
          {
            id: "hung-gate",
            argv: [process.execPath, "-e", hungParent],
          },
        ],
        skipRepositoryPolicy: true,
        timeouts: { gateMs: 500 },
      }),
    ).rejects.toThrow("clean_clone_gate_timeout:hung-gate:node");

    const isolatedHome = readFileSync(marker, "utf8");
    expect(existsSync(dirname(isolatedHome))).toBe(false);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1700));
    expect(existsSync(descendantMarker)).toBe(false);
  });

  it("rejects an unfrozen lockfile", async () => {
    const fixture = createConstitutionFixture();
    const manifest = JSON.parse(
      await import("node:fs").then(({ readFileSync }) =>
        readFileSync(join(fixture.root, "package.json"), "utf8"),
      ),
    ) as Record<string, unknown>;
    manifest.devDependencies = { "fixture-only-missing-lock-entry": "1.0.0" };
    writeFileSync(join(fixture.root, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    const subject = commitAll(fixture.root, "drift package from lockfile");

    await expectFailure(
      () =>
        verifyCleanClone({
          repositoryRoot: fixture.root,
          subject,
          commands: [],
        }),
      "frozen_lockfile_required",
    );
  });

  it("rejects a missing required CI job", async () => {
    const fixture = createConstitutionFixture();
    writeFileSync(
      join(fixture.root, ".github", "workflows", "ms0-required.yml"),
      requiredWorkflow.replace("  postgresql-17-6:\n", "  optional-postgres:\n"),
      "utf8",
    );
    const subject = commitAll(fixture.root, "remove required job");

    await expectFailure(
      () => verifyCleanClone({ repositoryRoot: fixture.root, subject, commands: [] }),
      "required_ci_job_missing",
    );
  });

  it.each([
    ["absent", requiredWorkflow.replace("  GITLEAKS_VERSION: 8.28.0\n", "")],
    [
      "mismatched",
      requiredWorkflow.replace("GITLEAKS_VERSION: 8.28.0", "GITLEAKS_VERSION: 8.27.0"),
    ],
  ])("rejects %s pinned gitleaks", async (_case, workflow) => {
    const fixture = createConstitutionFixture();
    writeFileSync(join(fixture.root, ".github", "workflows", "ms0-required.yml"), workflow, "utf8");
    const subject = commitAll(fixture.root, "break gitleaks pin");

    await expectFailure(
      () => verifyCleanClone({ repositoryRoot: fixture.root, subject, commands: [] }),
      "gitleaks_pin_invalid",
    );
  });

  it("rejects root-pack success", async () => {
    const fixture = createConstitutionFixture();
    const packageJson = JSON.parse(
      await import("node:fs").then(({ readFileSync }) =>
        readFileSync(join(fixture.root, "package.json"), "utf8"),
      ),
    ) as { scripts: Record<string, string> };
    packageJson.scripts.prepack = 'node -e "process.exit(0)"';
    writeFileSync(join(fixture.root, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);
    const subject = commitAll(fixture.root, "allow root package");

    await expectFailure(
      () => verifyCleanClone({ repositoryRoot: fixture.root, subject, commands: [] }),
      "root_packaging_allowed",
    );
  });

  it("rejects generated source or configuration drift", async () => {
    const fixture = createConstitutionFixture();

    await expectFailure(
      () =>
        verifyCleanClone({
          repositoryRoot: fixture.root,
          subject: fixture.subject,
          commands: [
            {
              id: "generated-drift",
              argv: [
                process.execPath,
                "-e",
                "require('node:fs').writeFileSync('subject.txt','generated drift\\n')",
              ],
            },
          ],
        }),
      "generated_source_drift",
    );
  });

  it("reports a stable gate id and safe argv token without command output", async () => {
    const fixture = createRepositoryFixture();
    const sensitiveOutput = "fixture-sensitive-command-output";

    const failure = await verifyCleanClone({
      repositoryRoot: fixture.root,
      subject: fixture.subject,
      commands: [
        {
          id: "fixture-failure",
          argv: [
            process.execPath,
            "-e",
            `process.stdout.write(${JSON.stringify(sensitiveOutput)});process.stderr.write(${JSON.stringify(sensitiveOutput)});process.exit(9)`,
          ],
        },
      ],
      skipRepositoryPolicy: true,
    }).then(
      () => undefined,
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe("clean_clone_gate_failed:fixture-failure:node");
    expect((failure as Error).message).not.toContain(sensitiveOutput);
  });

  it("rejects a dirty source checkout as evidence while allowing ignored outputs", async () => {
    const fixture = createConstitutionFixture();
    writeFileSync(join(fixture.root, "subject.txt"), "dirty source\n", "utf8");

    await expectFailure(
      () =>
        verifyCleanClone({
          repositoryRoot: fixture.root,
          subject: fixture.subject,
          commands: [],
        }),
      "source_checkout_dirty",
    );
  });
});

describe("evidence commit verifier", { timeout: REPOSITORY_FIXTURE_TIMEOUT_MS }, () => {
  it.each([
    ["another milestone status", "**状态：** 未开始。", "**状态：** 已关闭。", true],
    ["MS0 body", "MS0 body remains immutable.", "MS0 body was rewritten.", false],
  ])("rejects a master-plan change to %s", (_case, before, after, replaceLast) => {
    const fixture = createMasterPlanSubjectFixture();
    const masterPlanPath = join(fixture.root, "plan", "00-master-plan.md");
    const masterPlan = readFileSync(masterPlanPath, "utf8");
    const changed = replaceLast
      ? `${masterPlan.slice(0, masterPlan.lastIndexOf(before))}${after}${masterPlan.slice(
          masterPlan.lastIndexOf(before) + before.length,
        )}`
      : masterPlan.replace(before, after);
    writeFileSync(masterPlanPath, changed, "utf8");
    writeEvidenceManifest(fixture.root, fixture.subject);
    const evidenceCommit = commitAll(fixture.root, "invalid master plan evidence");

    expect(() =>
      verifyEvidenceCommit({
        repositoryRoot: fixture.root,
        evidenceCommit,
        declaredSubject: fixture.subject,
      }),
    ).toThrow("evidence_master_plan_scope_invalid");
  });

  it("accepts an evidence commit changing only the MS0 status line", () => {
    const fixture = createMasterPlanSubjectFixture();
    const masterPlanPath = join(fixture.root, "plan", "00-master-plan.md");
    writeFileSync(
      masterPlanPath,
      readFileSync(masterPlanPath, "utf8").replace("**状态：** 未开始。", "**状态：** 已关闭。"),
      "utf8",
    );
    writeEvidenceManifest(fixture.root, fixture.subject);
    const evidenceCommit = commitAll(fixture.root, "valid MS0 closeout evidence");

    expect(() =>
      verifyEvidenceCommit({
        repositoryRoot: fixture.root,
        evidenceCommit,
        declaredSubject: fixture.subject,
      }),
    ).not.toThrow();
  });

  it("rejects an evidence commit whose parent is not the declared subject", () => {
    const fixture = createConstitutionFixture();
    const declaredSubject = fixture.subject;
    writeFileSync(join(fixture.root, "subject.txt"), "intermediate subject\n", "utf8");
    commitAll(fixture.root, "intermediate non-evidence commit");
    mkdirSync(join(fixture.root, "reports", "ms0-repository-constitution", "evidence"), {
      recursive: true,
    });
    writeFileSync(
      join(fixture.root, "reports", "ms0-repository-constitution", "evidence", "manifest.json"),
      `${JSON.stringify({ commitSha: declaredSubject })}\n`,
    );
    const evidenceCommit = commitAll(fixture.root, "evidence");

    expect(() =>
      verifyEvidenceCommit({ repositoryRoot: fixture.root, evidenceCommit, declaredSubject }),
    ).toThrow("evidence_commit_parent_mismatch");
  });

  it("rejects non-evidence files in the evidence commit", () => {
    const fixture = createConstitutionFixture();
    mkdirSync(join(fixture.root, "reports", "ms0-repository-constitution", "evidence"), {
      recursive: true,
    });
    writeFileSync(
      join(fixture.root, "reports", "ms0-repository-constitution", "evidence", "manifest.json"),
      `${JSON.stringify({ commitSha: fixture.subject })}\n`,
    );
    writeFileSync(join(fixture.root, "package.json"), "{}\n", "utf8");
    const evidenceCommit = commitAll(fixture.root, "evidence plus source");

    expect(() =>
      verifyEvidenceCommit({
        repositoryRoot: fixture.root,
        evidenceCommit,
        declaredSubject: fixture.subject,
      }),
    ).toThrow("evidence_commit_path_forbidden");
  });

  it("rejects a manifest that identifies the evidence commit as its own subject", () => {
    const fixture = createConstitutionFixture();

    expect(() =>
      verifyEvidenceCommit({
        repositoryRoot: fixture.root,
        evidenceCommit: fixture.subject,
        declaredSubject: fixture.subject,
        manifestCommitSha: fixture.subject,
      }),
    ).toThrow("evidence_commit_self_reference");
  });
});
