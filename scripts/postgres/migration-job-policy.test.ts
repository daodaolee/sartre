import { readFile } from "node:fs/promises";

import { describe, expect, test } from "vitest";

const EXPECTED_NODE_BASE =
  "node:24.11.0-bookworm-slim@sha256:76d0ed0ed93bed4f4376211e9d8fddac4d8b3fbdb54cc45955696001a3c91152";
const DOCKERFILE = new URL("../../docker/migration-job/Dockerfile", import.meta.url);

describe("Migration Job Dockerfile policy", () => {
  test("binds the Node base tag to the verified OCI index digest", async () => {
    const source = await readFile(DOCKERFILE, "utf8");
    const externalBaseLines = source.split("\n").filter((line) => line.startsWith("FROM node:"));

    expect(externalBaseLines).toEqual([`FROM ${EXPECTED_NODE_BASE} AS base`]);
  });
});
