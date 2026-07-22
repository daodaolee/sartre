import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterEach, describe, expect, test } from "vitest";

import {
  queryDatabase,
  withDisposableDatabase,
} from "../../scripts/postgres/create-test-database.js";

const execFileAsync = promisify(execFile);
const image = process.env.SARTRE_MIGRATION_JOB_IMAGE;
const databaseUrl = process.env.SARTRE_DATABASE_URL;
const actualImageTest = image ? test : test.skip;
const actualJobTest = image && databaseUrl ? test : test.skip;
const containers = new Set<string>();

const EXPECTED_OWNED_PATHS = [
  "app/apps/hub-api/src/infrastructure/database/migrations/000001_ms0_baseline.sql",
  "app/apps/hub-api/src/infrastructure/database/migrations/000002_ms0_diagnostics.sql",
  "app/scripts/postgres/runner.cjs",
  "usr/local/bin/sartre-migrate",
] as const;

const repositoryRoot = new URL("../../", import.meta.url).pathname;

function requiredImage(): string {
  if (!image) throw new Error("SARTRE_MIGRATION_JOB_IMAGE_required");
  return image;
}

function requiredDatabaseUrl(): string {
  if (!databaseUrl) throw new Error("SARTRE_DATABASE_URL_required");
  return databaseUrl;
}

async function runMigrationJob(connectionString: string): Promise<{
  stdout: string;
  stderr: string;
}> {
  const container = `sartre-ms0-job-${randomUUID()}`;
  const containerUrl = new URL(connectionString);
  containerUrl.hostname = "host.docker.internal";
  await execFileAsync("docker", [
    "create",
    "--name",
    container,
    "--add-host",
    "host.docker.internal:host-gateway",
    "-e",
    `SARTRE_DATABASE_URL=${containerUrl.toString()}`,
    requiredImage(),
  ]);
  containers.add(container);
  try {
    return await execFileAsync("docker", ["start", "--attach", container], {
      maxBuffer: 1024 * 1024,
    });
  } finally {
    await execFileAsync("docker", ["rm", "-f", container]).catch(() => undefined);
    containers.delete(container);
  }
}

afterEach(async () => {
  for (const container of [...containers]) {
    await execFileAsync("docker", ["rm", "-f", container]).catch(() => undefined);
    containers.delete(container);
  }
});

describe("Migration Job actual image payload", () => {
  actualImageTest(
    "contains exactly four repository-owned payload paths without inherited manifests",
    async () => {
      const directory = await mkdtemp(join(tmpdir(), "sartre-migration-image-"));
      const archive = join(directory, "filesystem.tar");
      const extracted = join(directory, "extracted");
      const localRunner = join(directory, "runner.cjs");
      const container = `sartre-ms0-image-${randomUUID()}`;
      try {
        await execFileAsync("docker", ["create", "--name", container, requiredImage()]);
        containers.add(container);
        const [{ stdout: user }, { stdout: entrypoint }] = await Promise.all([
          execFileAsync("docker", ["inspect", "--format", "{{.Config.User}}", container]),
          execFileAsync("docker", [
            "inspect",
            "--format",
            "{{json .Config.Entrypoint}}",
            container,
          ]),
        ]);
        expect(user.trim()).toBe("node");
        expect(entrypoint.trim()).toBe('["/usr/local/bin/sartre-migrate"]');
        await execFileAsync("docker", ["export", "--output", archive, container]);
        const [{ stdout }, { stdout: verbose }, { stdout: tracked }] = await Promise.all([
          execFileAsync("tar", ["-tf", archive], { maxBuffer: 8 * 1024 * 1024 }),
          execFileAsync("tar", ["-tvf", archive], { maxBuffer: 16 * 1024 * 1024 }),
          execFileAsync("git", ["ls-files", "-z"], {
            cwd: repositoryRoot,
            maxBuffer: 8 * 1024 * 1024,
          }),
        ]);
        const paths = new Set(stdout.split("\n").map((path) => path.replace(/^\.\//u, "")));
        const repositoryKnownPaths = [
          ...tracked
            .split("\0")
            .filter(Boolean)
            .map((path) => `app/${path}`),
          "usr/local/bin/sartre-migrate",
          "app/scripts/postgres/runner.cjs",
        ];
        const repositoryOwned = repositoryKnownPaths
          .filter((path) => paths.has(path))
          .sort((left, right) => left.localeCompare(right));

        expect(repositoryOwned).toEqual([...EXPECTED_OWNED_PATHS].sort());
        expect(
          [...paths].some(
            (path) => path.startsWith("app/") && path.split("/").includes("node_modules"),
          ),
        ).toBe(false);
        for (const path of repositoryOwned) {
          const metadata = verbose.split("\n").find((line) => line.split(/\s+/u).includes(path));
          expect(metadata?.startsWith("-")).toBe(true);
        }

        await mkdir(extracted);
        await execFileAsync("tar", ["-xf", archive, "-C", extracted, ...EXPECTED_OWNED_PATHS]);
        const { stderr } = await execFileAsync(
          "pnpm",
          [
            "exec",
            "esbuild",
            "scripts/postgres/migrate.ts",
            "--bundle",
            "--platform=node",
            "--format=cjs",
            "--target=node24",
            "--packages=bundle",
            `--outfile=${localRunner}`,
            "--define:import.meta.url=undefined",
            "--log-level=warning",
          ],
          { cwd: repositoryRoot },
        );
        expect(stderr).toBe("");
        const expectedContents = new Map<string, Buffer>([
          [
            EXPECTED_OWNED_PATHS[0],
            await readFile(
              join(
                repositoryRoot,
                "apps/hub-api/src/infrastructure/database/migrations/000001_ms0_baseline.sql",
              ),
            ),
          ],
          [
            EXPECTED_OWNED_PATHS[1],
            await readFile(
              join(
                repositoryRoot,
                "apps/hub-api/src/infrastructure/database/migrations/000002_ms0_diagnostics.sql",
              ),
            ),
          ],
          [EXPECTED_OWNED_PATHS[2], await readFile(localRunner)],
          [
            EXPECTED_OWNED_PATHS[3],
            await readFile(join(repositoryRoot, "docker/migration-job/entrypoint.sh")),
          ],
        ]);
        for (const [path, expected] of expectedContents) {
          expect(await readFile(join(extracted, path))).toEqual(expected);
        }
        const { stdout: secretOutput } = await execFileAsync(
          "pnpm",
          [
            "run",
            "secret:artifacts",
            "--",
            ...EXPECTED_OWNED_PATHS.map((path) => join(extracted, path)),
          ],
          { cwd: repositoryRoot, maxBuffer: 1024 * 1024 },
        );
        expect(secretOutput).toContain("Artifact Secret boundary passed for 4 explicit path(s)");
      } finally {
        await execFileAsync("docker", ["rm", "-f", container]).catch(() => undefined);
        containers.delete(container);
        await rm(directory, { recursive: true, force: true });
      }
    },
    60_000,
  );

  actualJobTest(
    "applies both approved migrations once and then performs an exact no-op",
    async () => {
      await withDisposableDatabase(requiredDatabaseUrl(), "job_image", async (database) => {
        const first = await runMigrationJob(database.connectionString);
        const second = await runMigrationJob(database.connectionString);

        expect(first.stderr).toBe("");
        expect(second.stderr).toBe("");
        expect(first.stdout.match(/migration_applied=(true|false)/gu)).toEqual([
          "migration_applied=true",
          "migration_applied=true",
        ]);
        expect(second.stdout.match(/migration_applied=(true|false)/gu)).toEqual([
          "migration_applied=false",
          "migration_applied=false",
        ]);
        expect(
          await queryDatabase<{ version: string; checksum: string }>(
            database.connectionString,
            "SELECT version, checksum FROM schema_migrations ORDER BY version",
          ),
        ).toEqual([
          {
            version: "000001_ms0_baseline",
            checksum: "ff57c5fa909fc4506e4a503c6ea2d39c4c3bb67d5bda1d9dfa1a7cf6f008b839",
          },
          {
            version: "000002_ms0_diagnostics",
            checksum: "fe75b3e93def7551a4e0b1d03419b72c0d7f39b251869d6fea32ecfbdf74d521",
          },
        ]);
      });
    },
    60_000,
  );
});
