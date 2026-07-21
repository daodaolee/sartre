import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { build } from "esbuild";

const appRoot = resolve(import.meta.dirname, "..");
const sourceRoot = resolve(appRoot, "src");
const outputRoot = resolve(appRoot, "dist");

await rm(outputRoot, { recursive: true, force: true });
await Promise.all([
  build({
    entryPoints: [resolve(sourceRoot, "main/index.ts")],
    outfile: resolve(outputRoot, "main/index.js"),
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
    external: ["electron"],
    sourcemap: false,
    legalComments: "none",
  }),
  build({
    entryPoints: [resolve(sourceRoot, "preload/index.ts")],
    outfile: resolve(outputRoot, "preload/index.cjs"),
    bundle: true,
    format: "cjs",
    platform: "node",
    target: "node22",
    external: ["electron"],
    sourcemap: false,
    legalComments: "none",
  }),
  build({
    entryPoints: [resolve(sourceRoot, "renderer/src/index.tsx")],
    outfile: resolve(outputRoot, "renderer/index.js"),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "chrome140",
    sourcemap: false,
    legalComments: "none",
  }),
]);
await mkdir(resolve(outputRoot, "renderer"), { recursive: true });
await Promise.all([
  cp(resolve(sourceRoot, "renderer/index.html"), resolve(outputRoot, "renderer/index.html")),
  cp(resolve(sourceRoot, "renderer/src/styles.css"), resolve(outputRoot, "renderer/styles.css")),
]);
