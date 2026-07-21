import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, symlinkSync, truncateSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { scanArtifactPaths } from "./artifact-secret-scan.js";

function fakeCredential(): string {
  return `uk-${"sa"}-${"d".repeat(64)}`;
}

function utf16BigEndian(value: string): Buffer {
  const bytes = Buffer.from(value, "utf16le");
  for (let index = 0; index < bytes.length; index += 2) {
    const low = bytes[index];
    bytes[index] = bytes[index + 1] ?? 0;
    bytes[index + 1] = low ?? 0;
  }
  return bytes;
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

  it("does not manufacture a bearer token while decoding invalid binary bytes", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-artifact-scan-"));
    const artifact = join(root, "release");
    mkdirSync(artifact);
    writeFileSync(
      join(artifact, "safe-binary"),
      Buffer.concat([Buffer.from("Bearer "), Buffer.alloc(32, 0xff)]),
    );

    expect(scanArtifactPaths([artifact])).toEqual([]);
  });

  it("still rejects a printable Secret embedded inside a binary artifact", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-artifact-scan-"));
    const artifact = join(root, "release");
    mkdirSync(artifact);
    const binaryPath = join(artifact, "unsafe-binary");
    writeFileSync(
      binaryPath,
      Buffer.concat([Buffer.from([0, 0xff]), Buffer.from(fakeCredential()), Buffer.from([0])]),
    );

    expect(scanArtifactPaths([artifact])).toEqual([
      { code: "secret_artifact_violation", path: binaryPath },
    ]);
  });

  it.each([
    ["UTF-16LE", (value: string) => Buffer.from(value, "utf16le")],
    ["UTF-16BE", utf16BigEndian],
  ])("rejects a Secret encoded as %s", (_encoding, encode) => {
    const root = mkdtempSync(join(tmpdir(), "sartre-artifact-scan-"));
    const artifact = join(root, "release");
    mkdirSync(artifact);
    const binaryPath = join(artifact, "encoded-text");
    writeFileSync(binaryPath, encode(fakeCredential()));

    expect(scanArtifactPaths([artifact])).toEqual([
      { code: "secret_artifact_violation", path: binaryPath },
    ]);
  });

  it.each([
    ["ASCII", (value: string) => Buffer.from(value, "ascii")],
    ["UTF-16LE", (value: string) => Buffer.from(value, "utf16le")],
    ["UTF-16BE", utf16BigEndian],
  ])("rejects a %s Secret split across a scanner chunk boundary", (_encoding, encode) => {
    const root = mkdtempSync(join(tmpdir(), "sartre-artifact-scan-"));
    const artifact = join(root, "release");
    mkdirSync(artifact);
    const binaryPath = join(artifact, "boundary-text");
    const boundary = 256 * 1024;
    const credential = encode(fakeCredential());
    const start = boundary - (credential.length > fakeCredential().length ? 16 : 8);
    const content = Buffer.alloc(boundary + credential.length);
    credential.copy(content, start);
    writeFileSync(binaryPath, content);

    expect(scanArtifactPaths([artifact])).toEqual([
      { code: "secret_artifact_violation", path: binaryPath },
    ]);
  });

  it.each([
    ["literal token", () => fakeCredential()],
    ["bearer token", () => ["Bearer", " ", "t".repeat(40)].join("")],
    [
      "credential URL",
      () => ["postgresql", "://", "user", ":", "p".repeat(20), "@", "127.0.0.1/db"].join(""),
    ],
    ["secret assignment", () => ["AWS_SECRET_ACCESS_KEY", "=", "s".repeat(40)].join("")],
  ])("rejects an ASCII %s split across a scanner chunk boundary", (_shape, value) => {
    const root = mkdtempSync(join(tmpdir(), "sartre-artifact-scan-"));
    const artifact = join(root, "release");
    mkdirSync(artifact);
    const binaryPath = join(artifact, "boundary-shape");
    const boundary = 256 * 1024;
    const credential = Buffer.from(value(), "ascii");
    const content = Buffer.alloc(boundary + credential.length);
    credential.copy(content, boundary - Math.floor(credential.length / 2));
    writeFileSync(binaryPath, content);

    expect(scanArtifactPaths([artifact])).toEqual([
      { code: "secret_artifact_violation", path: binaryPath },
    ]);
  });

  it("scans a generated large sparse binary inside a bounded Node heap", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-artifact-scan-"));
    const artifact = join(root, "large-safe-binary");
    const runner = join(root, "bounded-scan.mts");
    writeFileSync(artifact, "");
    truncateSync(artifact, 64 * 1024 * 1024);
    const scannerUrl = pathToFileURL(
      join(process.cwd(), "scripts/constitution/artifact-secret-scan.ts"),
    ).href;
    writeFileSync(
      runner,
      [
        `import { scanArtifactPaths } from ${JSON.stringify(scannerUrl)};`,
        "const target = process.argv[2];",
        "if (!target) process.exit(3);",
        "const violations = scanArtifactPaths([target]);",
        "process.exit(violations.length === 0 ? 0 : 2);",
      ].join("\n"),
    );

    const result = spawnSync(
      process.execPath,
      ["--max-old-space-size=96", fileURLToPath(import.meta.resolve("tsx/cli")), runner, artifact],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: "pipe",
        timeout: 15_000,
        maxBuffer: 1024 * 1024,
      },
    );

    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
  }, 20_000);

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

  it("rejects an explicitly requested artifact root that is itself a symlink", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-artifact-scan-"));
    const target = join(root, "actual-release");
    const requested = join(root, "requested-release");
    mkdirSync(target);
    writeFileSync(join(target, "bundle.js"), fakeCredential());
    symlinkSync("actual-release", requested, "dir");

    expect(scanArtifactPaths([requested])).toEqual([
      { code: "artifact_symlink_escape", path: requested },
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
