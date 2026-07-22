import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);

const EXPECTED_NODE_BASE =
  "node:24.11.0-bookworm-slim@sha256:76d0ed0ed93bed4f4376211e9d8fddac4d8b3fbdb54cc45955696001a3c91152";
const DOCKERFILE = new URL("../../docker/migration-job/Dockerfile", import.meta.url);
const ENTRYPOINT = new URL("../../docker/migration-job/entrypoint.sh", import.meta.url);

describe("Migration Job Dockerfile policy", () => {
  test("binds the Node base tag to the verified OCI index digest", async () => {
    const source = await readFile(DOCKERFILE, "utf8");
    const externalBaseLines = source.split("\n").filter((line) => line.startsWith("FROM node:"));

    expect(externalBaseLines).toEqual([
      `FROM ${EXPECTED_NODE_BASE} AS build`,
      `FROM ${EXPECTED_NODE_BASE} AS runtime`,
    ]);
  });

  test("bundles the migration runtime without installing root production dependencies", async () => {
    const [dockerfile, entrypoint] = await Promise.all([
      readFile(DOCKERFILE, "utf8"),
      readFile(ENTRYPOINT, "utf8"),
    ]);

    expect(dockerfile).toContain(
      "pnpm exec esbuild scripts/postgres/migrate.ts --bundle --platform=node --format=cjs --target=node24 --packages=bundle --outfile=.migration-job-build/runner.cjs --define:import.meta.url=undefined --log-level=warning",
    );
    expect(dockerfile).not.toContain("--banner:js=");
    expect(dockerfile).not.toMatch(/FROM base AS runtime[\s\S]*pnpm install --prod/u);
    expect(dockerfile).toContain(
      "COPY --from=build /app/.migration-job-build/runner.cjs scripts/postgres/runner.cjs",
    );
    expect(entrypoint).toContain("exec node /app/scripts/postgres/runner.cjs");
    expect(entrypoint).not.toContain("migrate.js");
  });

  test("keeps repository manifests in the build stage and gives runtime a clean base", async () => {
    const source = await readFile(DOCKERFILE, "utf8");
    const buildStage = source.indexOf(" AS build");
    const runtimeStage = source.indexOf(`FROM ${EXPECTED_NODE_BASE} AS runtime`);
    const manifestCopies = source
      .split("\n")
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.startsWith("COPY ") && line.includes("package.json"));
    const buildLine = source.slice(0, buildStage).split("\n").length - 1;
    const runtimeLine = source.slice(0, runtimeStage).split("\n").length - 1;

    expect(source).not.toContain("FROM base AS runtime");
    expect(runtimeStage).toBeGreaterThan(buildStage);
    expect(manifestCopies.length).toBeGreaterThan(0);
    expect(manifestCopies.every(({ index }) => index > buildLine && index < runtimeLine)).toBe(
      true,
    );
  });

  test("compiles the real migration entry as a single CommonJS bundle", async () => {
    const buildDirectory = await mkdtemp(join(tmpdir(), "sartre-migration-job-"));
    const outputPath = join(buildDirectory, "runner.cjs");
    try {
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
          `--outfile=${outputPath}`,
          "--define:import.meta.url=undefined",
          "--log-level=warning",
        ],
        { cwd: new URL("../../", import.meta.url).pathname },
      );

      expect(stderr).toBe("");
      expect(await readFile(outputPath, "utf8")).not.toHaveLength(0);
    } finally {
      await rm(buildDirectory, { recursive: true, force: true });
    }
  });
});
