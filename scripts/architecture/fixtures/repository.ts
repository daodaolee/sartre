import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const WORKSPACES = {
  "apps/electron-app": "@sartre/electron-app",
  "apps/hub-api": "@sartre/hub-api",
  "apps/hub-worker": "@sartre/hub-worker",
  "apps/local-runtime": "@sartre/local-runtime",
  "packages/contracts": "@sartre/contracts",
  "packages/domain": "@sartre/domain",
  "packages/runtime-core": "@sartre/runtime-core",
  "packages/sdk": "@sartre/sdk",
} as const;

const ALLOWED_DEPENDENCIES: Partial<Record<keyof typeof WORKSPACES, Record<string, string>>> = {
  "apps/electron-app": { "@sartre/sdk": "workspace:*" },
  "apps/hub-api": {
    "@sartre/contracts": "workspace:*",
    "@sartre/domain": "workspace:*",
  },
  "apps/hub-worker": {
    "@sartre/contracts": "workspace:*",
    "@sartre/domain": "workspace:*",
  },
  "apps/local-runtime": { "@sartre/runtime-core": "workspace:*" },
  "packages/contracts": { zod: "4.4.3" },
  "packages/runtime-core": {
    "@sartre/contracts": "workspace:*",
    "@sartre/domain": "workspace:*",
    "@sartre/sdk": "workspace:*",
  },
  "packages/sdk": { "@sartre/contracts": "workspace:*" },
};

export function writeFixtureFile(root: string, path: string, content: string): void {
  const absolutePath = join(root, path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, "utf8");
}

export function writeFixtureJson(root: string, path: string, value: unknown): void {
  writeFixtureFile(root, path, `${JSON.stringify(value, null, 2)}\n`);
}

export function readFixtureJson(root: string, path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(root, path), "utf8") as string) as Record<string, unknown>;
}

export function createArchitectureFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "sartre-architecture-"));
  writeFixtureJson(root, "package.json", { private: true, type: "module" });
  writeFixtureJson(root, "tsconfig.base.json", {
    compilerOptions: { module: "NodeNext", moduleResolution: "NodeNext" },
  });

  for (const [workspace, name] of Object.entries(WORKSPACES)) {
    writeFixtureJson(root, `${workspace}/package.json`, {
      name,
      private: true,
      type: "module",
      dependencies: ALLOWED_DEPENDENCIES[workspace as keyof typeof WORKSPACES] ?? {},
    });
    writeFixtureJson(root, `${workspace}/tsconfig.json`, {
      extends: "../../tsconfig.base.json",
      compilerOptions: { rootDir: "src" },
      include: ["src/**/*.ts"],
    });
    writeFixtureFile(root, `${workspace}/src/index.ts`, "export const fixture = true;\n");
  }

  return root;
}
